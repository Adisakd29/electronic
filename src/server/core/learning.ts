/**
 * Learner mutations (core logic behind src/server/actions/learning.ts).
 * `actor` is always derived from the session by the caller. Staff (teacher/admin)
 * may preview: every function returns ok with no DB write for them.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { StageKey } from "@/content/course";
import type { Week } from "@/content/types";
import type { Tx } from "@/lib/db";
import {
  interactionAttempt,
  labReflection,
  labTaskResult,
  learningPosition,
  question,
  questionResponse,
  quizAttempt,
  stageProgress,
  stepProgress,
  submission,
} from "@/lib/db/schema";
import { awardXp, grantAchievements, XP, xpRef } from "@/lib/gamification";
import {
  gradeAttempt,
  isPassed,
  LAB_TOLERANCE,
  parseNumber,
  publicChoices,
  selectChallenge,
  selectPretest,
  selectQuestions,
  shuffleChoices,
  withinTolerance,
  type BankQuestion,
  type Rng,
} from "@/lib/quiz";
import { checkUpload, randomKey, safeFileName, storage } from "@/lib/storage";
import type { ActionResult, QuizResult, QuizStart, Role, StageCompletion } from "../contracts";
import { activityById, TOTAL_WEEKS, weekContent } from "../content";
import {
  earnedCodes,
  interactionsCorrect,
  labTasksDone,
  loadUserState,
  stagesDoneFor,
  stagesOpenFor,
  stepsDone,
  unlockStates,
  STAGE_KEYS,
} from "./progress";
import { stageGate } from "@/lib/stage-order";

export interface Actor {
  id: string;
  role: Role;
}

const fail = (error: string) => ({ ok: false as const, error });
const ok = <T>(data: T) => ({ ok: true as const, data });

export const weekSchema = z.number().int().min(1).max(TOTAL_WEEKS);
const stageSchema = z.enum(["intro", "learn", "practice", "lab", "quiz", "complete"]);
const idSchema = z.string().min(1).max(64);

const isStaff = (a: Actor) => a.role !== "student";

type WeekGate = { ok: true; week: Week } | { ok: false; error: string };

/**
 * Validate week number, load content and (for students) check the week unlock
 * and — when `stage` is given — that this stage is open in the learner's path
 * (intro → learn → practice → lab → quiz → complete; src/lib/stage-order.ts).
 * Every learner action passes the stage it writes to, so the order is enforced
 * on the server even if the client is bypassed.
 */
export async function gateWeek(tx: Tx, actor: Actor, weekInput: unknown, stage?: StageKey): Promise<WeekGate> {
  const p = weekSchema.safeParse(weekInput);
  if (!p.success) return fail("ไม่พบสัปดาห์ที่ระบุ (ต้องเป็นสัปดาห์ที่ 1–18)");
  const week = weekContent(p.data);
  if (!week) return fail("เนื้อหาสัปดาห์นี้ยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง");
  if (!isStaff(actor)) {
    const s = await loadUserState(tx, actor.id);
    const u = unlockStates(s)[p.data - 1];
    if (!u.unlocked) return fail(`สัปดาห์นี้ยังล็อกอยู่ — ${u.lockReason ?? "ทำสัปดาห์ก่อนหน้าให้ครบก่อน"}`);
    if (stage) {
      const open = stagesOpenFor(s, p.data);
      if (!open.includes(stage)) {
        const gte = stageGate(stage, stagesDoneFor(s, p.data), { required: true });
        return fail(gte.reason ?? "ขั้นนี้ยังไม่เปิด ทำขั้นก่อนหน้าให้เสร็จก่อน");
      }
    }
  }
  return { ok: true, week };
}

/** Which stage an interaction belongs to (warm-ups → intro, practice ids → practice, challenge → complete, else learn). */
function interactionStage(week: Week, id: string): StageKey {
  if (week.intro.warmup?.includes(id)) return "intro";
  if (week.practice.includes(id)) return "practice";
  if (week.challenge?.interaction === id) return "complete";
  return "learn";
}

async function evaluateAndGrant(tx: Tx, userId: string): Promise<string[]> {
  const s = await loadUserState(tx, userId);
  return grantAchievements(tx, userId, earnedCodes(s));
}

async function nextWeekUnlocked(tx: Tx, userId: string, week: number): Promise<boolean> {
  if (week >= TOTAL_WEEKS) return false;
  const s = await loadUserState(tx, userId);
  return unlockStates(s)[week]?.unlocked ?? false;
}

// ---------------------------------------------------------------------------
// Steps, positions, interactions
// ---------------------------------------------------------------------------

export async function markStepComplete(tx: Tx, actor: Actor, weekN: number, stepId: string): Promise<ActionResult<{ stepsDone: string[] }>> {
  const g = await gateWeek(tx, actor, weekN, "learn");
  if (!g.ok) return g;
  if (!idSchema.safeParse(stepId).success || !g.week.steps.some((s) => s.id === stepId)) return fail("ไม่พบหัวข้อนี้ในบทเรียนสัปดาห์นี้ กรุณาโหลดหน้าใหม่");
  if (isStaff(actor)) return ok({ stepsDone: [] });
  await tx.insert(stepProgress).values({ userId: actor.id, week: g.week.week, stepId }).onConflictDoNothing();
  return ok({ stepsDone: await stepsDone(tx, actor.id, g.week.week) });
}

export async function savePosition(tx: Tx, actor: Actor, weekN: number, stage: StageKey, stepIndex: number): Promise<ActionResult<null>> {
  const g = await gateWeek(tx, actor, weekN);
  if (!g.ok) return g;
  if (!stageSchema.safeParse(stage).success) return fail("ขั้นตอนการเรียนไม่ถูกต้อง");
  const idx = z.number().int().min(0).max(500).safeParse(stepIndex);
  if (!idx.success) return fail("ตำแหน่งการเรียนไม่ถูกต้อง");
  if (isStaff(actor)) return ok(null);
  await tx
    .insert(learningPosition)
    .values({ userId: actor.id, week: g.week.week, stage, stepIndex: idx.data })
    .onConflictDoUpdate({
      target: [learningPosition.userId, learningPosition.week],
      set: { stage, stepIndex: idx.data, updatedAt: new Date() },
    });
  return ok(null);
}

export async function recordInteraction(
  tx: Tx,
  actor: Actor,
  weekN: number,
  interactionId: string,
  correct: boolean,
  answerKey?: string,
): Promise<ActionResult<{ xpAwarded: number }>> {
  const g0 = await gateWeek(tx, actor, weekN);
  if (!g0.ok) return g0;
  if (!g0.week.interactions.some((i) => i.id === interactionId)) return fail("ไม่พบกิจกรรมนี้ในสัปดาห์นี้ กรุณาโหลดหน้าใหม่");
  const g = await gateWeek(tx, actor, weekN, interactionStage(g0.week, interactionId));
  if (!g.ok) return g;
  if (typeof correct !== "boolean") return fail("ข้อมูลคำตอบไม่ถูกต้อง");
  if (isStaff(actor)) return ok({ xpAwarded: 0 });
  const key = answerKey == null ? null : String(answerKey).slice(0, 200);
  const [prev] = await tx
    .select()
    .from(interactionAttempt)
    .where(and(eq(interactionAttempt.userId, actor.id), eq(interactionAttempt.interactionId, interactionId)));
  const firstTry = prev ? prev.firstTryCorrect : correct;
  await tx
    .insert(interactionAttempt)
    .values({
      userId: actor.id,
      week: g.week.week,
      interactionId,
      attempts: 1,
      wrongAttempts: correct ? 0 : 1,
      correct,
      firstTryCorrect: correct,
      lastWrong: correct ? null : key,
    })
    .onConflictDoUpdate({
      target: [interactionAttempt.userId, interactionAttempt.interactionId],
      set: {
        attempts: sql`${interactionAttempt.attempts} + 1`,
        wrongAttempts: sql`${interactionAttempt.wrongAttempts} + ${correct ? 0 : 1}`,
        correct: sql`${interactionAttempt.correct} or ${correct}`,
        firstTryCorrect: sql`coalesce(${interactionAttempt.firstTryCorrect}, ${correct})`,
        lastWrong: correct ? sql`${interactionAttempt.lastWrong}` : key,
        updatedAt: new Date(),
      },
    });
  let xpAwarded = 0;
  if (correct && firstTry && !prev) {
    xpAwarded = await awardXp(tx, actor.id, xpRef.interaction(interactionId), XP.interactionFirstTry, "ตอบถูกตั้งแต่ครั้งแรก");
  }
  return ok({ xpAwarded });
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export async function stageMissing(tx: Tx, userId: string, week: Week, stage: StageKey): Promise<string[]> {
  const missing: string[] = [];
  if (stage === "learn") {
    const done = new Set(await stepsDone(tx, userId, week.week));
    const left = week.steps.filter((s) => !done.has(s.id));
    if (left.length) missing.push(`เรียนหัวข้อที่ยังไม่ครบอีก ${left.length} หัวข้อ: ${left.slice(0, 3).map((s) => `“${s.title}”`).join(", ")}${left.length > 3 ? " …" : ""}`);
  } else if (stage === "practice") {
    const done = new Set(await interactionsCorrect(tx, userId, week.week));
    const left = week.practice.filter((id) => !done.has(id));
    if (left.length) missing.push(`ทำแบบฝึกเชิงโต้ตอบให้ถูกอีก ${left.length} ข้อ`);
  } else if (stage === "lab") {
    const done = new Set(await labTasksDone(tx, userId, week.week));
    const left = week.lab.tasks.filter((t) => !done.has(t.id));
    if (left.length) missing.push(`ทำภารกิจห้องทดลองเสมือนให้ถูกอีก ${left.length} ภารกิจ`);
  } else if (stage === "quiz") {
    const rows = await tx
      .select({ id: quizAttempt.id })
      .from(quizAttempt)
      .where(and(eq(quizAttempt.userId, userId), eq(quizAttempt.week, week.week), eq(quizAttempt.kind, "post"), eq(quizAttempt.passed, true)));
    if (!rows.length) missing.push(`ผ่านแบบทดสอบหลังเรียนอย่างน้อย ${week.quiz.passPercent} %`);
  } else if (stage === "complete") {
    const s = await loadUserState(tx, userId);
    const done = new Set(stagesDoneFor(s, week.week));
    const labels: Record<string, string> = { intro: "บทนำ", learn: "เรียนรู้", practice: "ฝึกปฏิบัติเชิงโต้ตอบ", lab: "ห้องทดลองเสมือน", quiz: "แบบทดสอบ" };
    const left = (["intro", "learn", "practice", "lab", "quiz"] as const).filter((k) => !done.has(k));
    if (left.length) missing.push(`ทำขั้นตอนให้ครบก่อน: ${left.map((k) => labels[k]).join(", ")}`);
  }
  return missing;
}

export async function completeStage(tx: Tx, actor: Actor, weekN: number, stage: StageKey): Promise<ActionResult<StageCompletion>> {
  if (!stageSchema.safeParse(stage).success) return fail("ขั้นตอนการเรียนไม่ถูกต้อง");
  const g = await gateWeek(tx, actor, weekN, stage);
  if (!g.ok) return g;
  const week = g.week;
  if (isStaff(actor)) return ok({ stagesDone: [], xpAwarded: 0, newAchievements: [], weekCompleted: false, nextWeekUnlocked: false });
  const missing = await stageMissing(tx, actor.id, week, stage);
  if (missing.length) return fail(`ยังทำขั้นตอนนี้ไม่ครบ — ${missing.join("; ")}`);
  await tx.insert(stageProgress).values({ userId: actor.id, week: week.week, stage }).onConflictDoNothing();
  let xp = 0;
  if (stage === "practice") xp += await awardXp(tx, actor.id, xpRef.stage(week.week, "practice"), XP.practiceStage, "ผ่านแบบฝึกเชิงโต้ตอบ");
  if (stage === "lab") xp += await awardXp(tx, actor.id, xpRef.stage(week.week, "lab"), XP.labStage, "ทำห้องทดลองเสมือนครบ");
  if (stage === "complete") xp += await awardXp(tx, actor.id, xpRef.week(week.week), XP.weekComplete, "เรียนจบสัปดาห์");
  const newAchievements = await evaluateAndGrant(tx, actor.id);
  const s = await loadUserState(tx, actor.id);
  const done = stagesDoneFor(s, week.week);
  return ok({
    stagesDone: done,
    xpAwarded: xp,
    newAchievements,
    weekCompleted: done.includes("complete"),
    nextWeekUnlocked: week.week < TOTAL_WEEKS ? unlockStates(s)[week.week].unlocked : false,
  });
}

// ---------------------------------------------------------------------------
// Virtual lab
// ---------------------------------------------------------------------------

export async function recordLabTask(
  tx: Tx,
  actor: Actor,
  weekN: number,
  taskId: string,
  clientCorrect: boolean,
  value?: string,
): Promise<ActionResult<{ correct: boolean; xpAwarded: number }>> {
  const g = await gateWeek(tx, actor, weekN, "lab");
  if (!g.ok) return g;
  const task = g.week.lab.tasks.find((t) => t.id === taskId);
  if (!task) return fail("ไม่พบภารกิจนี้ในห้องทดลองสัปดาห์นี้ กรุณาโหลดหน้าใหม่");
  const v = value == null ? null : String(value).slice(0, 120);
  let correct: boolean;
  if (task.kind === "numeric") {
    const n = parseNumber(v);
    correct = n != null && withinTolerance(n, task.answer, task.tolerance ?? LAB_TOLERANCE, task.absTolerance);
  } else if (task.kind === "mcq") {
    correct = Boolean(v && task.options.find((o) => o.id === v)?.correct);
  } else {
    correct = clientCorrect === true; // state checks run in the lab module
  }
  if (isStaff(actor)) return ok({ correct, xpAwarded: 0 });
  const [prev] = await tx
    .select({ correct: labTaskResult.correct })
    .from(labTaskResult)
    .where(and(eq(labTaskResult.userId, actor.id), eq(labTaskResult.taskId, taskId)));
  await tx
    .insert(labTaskResult)
    .values({ userId: actor.id, week: g.week.week, taskId, attempts: 1, correct, value: v })
    .onConflictDoUpdate({
      target: [labTaskResult.userId, labTaskResult.taskId],
      set: {
        attempts: sql`${labTaskResult.attempts} + 1`,
        correct: sql`${labTaskResult.correct} or ${correct}`,
        value: v,
        updatedAt: new Date(),
      },
    });
  let xpAwarded = 0;
  if (correct && !prev?.correct) xpAwarded = await awardXp(tx, actor.id, xpRef.labTask(taskId), XP.labTask, "ทำภารกิจห้องทดลองถูกต้อง");
  return ok({ correct, xpAwarded });
}

export async function saveLabReflection(tx: Tx, actor: Actor, weekN: number, answers: string[]): Promise<ActionResult<null>> {
  const g = await gateWeek(tx, actor, weekN, "lab");
  if (!g.ok) return g;
  const max = Math.max(g.week.lab.reflection?.length ?? 0, 1);
  const p = z.array(z.string().max(4000)).max(max).safeParse(answers);
  if (!p.success) return fail("คำตอบสะท้อนคิดยาวเกินไปหรือมีจำนวนข้อไม่ถูกต้อง (ไม่เกิน 4,000 ตัวอักษรต่อข้อ)");
  if (isStaff(actor)) return ok(null);
  await tx
    .insert(labReflection)
    .values({ userId: actor.id, week: g.week.week, answers: p.data })
    .onConflictDoUpdate({ target: [labReflection.userId, labReflection.week], set: { answers: p.data, updatedAt: new Date() } });
  return ok(null);
}

const noteSchema = z.object({
  at: z.string().max(40),
  label: z.string().max(120),
  values: z.array(z.object({ k: z.string().max(60), v: z.string().max(60) })).max(16),
});

/** Replaces the learner's lab notebook for the week (≤ 60 rows). */
export async function saveLabNotes(tx: Tx, actor: Actor, weekN: number, notes: unknown): Promise<ActionResult<null>> {
  const g = await gateWeek(tx, actor, weekN, "lab");
  if (!g.ok) return g;
  const p = z.array(noteSchema).max(60).safeParse(notes);
  if (!p.success) return fail("สมุดบันทึกผลมีรายการมากเกินไป (ไม่เกิน 60 แถว) หรือข้อมูลไม่ถูกต้อง");
  if (isStaff(actor)) return ok(null);
  await tx
    .insert(labReflection)
    .values({ userId: actor.id, week: g.week.week, answers: [], notes: p.data })
    .onConflictDoUpdate({ target: [labReflection.userId, labReflection.week], set: { notes: p.data, updatedAt: new Date() } });
  return ok(null);
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export async function loadBank(tx: Tx, weekN: number, ids?: string[]): Promise<BankQuestion[]> {
  const where = ids ? and(eq(question.week, weekN), inArray(question.id, ids.length ? ids : ["-"])) : and(eq(question.week, weekN), eq(question.active, true));
  const rows = await tx.select().from(question).where(where);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    bloom: r.bloom,
    stem: r.stem,
    figure: r.figure ?? null,
    choices: r.choices ?? null,
    answer: r.answer,
    tolerance: r.tolerance,
    unit: r.unit,
    explanation: r.explanation,
    feedback: r.feedback ?? null,
  }));
}

function toQuizStart(
  attemptId: string,
  week: Week,
  kind: QuizStart["kind"],
  qs: BankQuestion[],
  order: Record<string, string[]>,
  saved: Record<string, string>,
  ids: string[],
): QuizStart {
  const byId = new Map(qs.map((q) => [q.id, q]));
  return {
    attemptId,
    week: week.week,
    kind,
    passPercent: week.quiz.passPercent,
    saved,
    questions: ids
      .map((id) => byId.get(id))
      .filter((q): q is BankQuestion => Boolean(q))
      .map((q) => ({
        id: q.id,
        type: q.type,
        stem: q.stem,
        figure: q.figure ? { figure: q.figure.figure, caption: q.figure.caption, alt: q.figure.alt } : null,
        choices: publicChoices(q, order[q.id]),
        unit: q.unit,
      })),
  };
}

export async function startQuiz(tx: Tx, actor: Actor, weekN: number, kind: "pre" | "post" | "challenge", rng: Rng): Promise<ActionResult<QuizStart>> {
  if (!["pre", "post", "challenge"].includes(kind)) return fail("ชนิดแบบทดสอบไม่ถูกต้อง");
  const g = await gateWeek(tx, actor, weekN, kind === "pre" ? "intro" : kind === "post" ? "quiz" : "complete");
  if (!g.ok) return g;
  const week = g.week;
  const bank = await loadBank(tx, week.week);
  if (!bank.length) return fail("สัปดาห์นี้ยังไม่มีข้อสอบในคลัง กรุณาแจ้งครูผู้สอน");

  const draw = (previous: string[] | null) =>
    kind === "pre"
      ? selectPretest(bank, rng)
      : kind === "challenge"
        ? selectChallenge(bank, previous, rng)
        : selectQuestions(bank, week.quiz.drawCount, week.quiz.mix, previous, rng);

  if (isStaff(actor)) {
    const ids = draw(null);
    return ok(toQuizStart("preview", week, kind, bank, shuffleChoices(bank.filter((q) => ids.includes(q.id)), rng), {}, ids));
  }

  const mine = and(eq(quizAttempt.userId, actor.id), eq(quizAttempt.week, week.week), eq(quizAttempt.kind, kind));
  const [open] = await tx.select().from(quizAttempt).where(and(mine, isNull(quizAttempt.submittedAt)));
  if (open) {
    const qs = await loadBank(tx, week.week, open.questionIds);
    return ok(toQuizStart(open.id, week, kind, qs, open.choiceOrder, open.answers ?? {}, open.questionIds));
  }
  const submitted = await tx
    .select({ ids: quizAttempt.questionIds, submittedAt: quizAttempt.submittedAt })
    .from(quizAttempt)
    .where(mine)
    .orderBy(sql`${quizAttempt.submittedAt} desc nulls last`)
    .limit(1);
  if (kind === "pre" && submitted.length) return fail("ทำแบบทดสอบก่อนเรียนของสัปดาห์นี้แล้ว (ทำได้ครั้งเดียว) — ไปเรียนต่อได้เลย");
  const ids = draw(submitted[0]?.ids ?? null);
  const order = shuffleChoices(bank.filter((q) => ids.includes(q.id)), rng);
  const id = randomUUID();
  const inserted = await tx
    .insert(quizAttempt)
    .values({ id, userId: actor.id, week: week.week, kind, questionIds: ids, choiceOrder: order, answers: {}, maxScore: ids.length })
    .onConflictDoNothing()
    .returning({ id: quizAttempt.id });
  if (!inserted.length) {
    // Concurrent start: resume the attempt that won.
    const [o] = await tx.select().from(quizAttempt).where(and(mine, isNull(quizAttempt.submittedAt)));
    if (!o) return fail("เริ่มแบบทดสอบไม่สำเร็จ กรุณาลองใหม่");
    const qs = await loadBank(tx, week.week, o.questionIds);
    return ok(toQuizStart(o.id, week, kind, qs, o.choiceOrder, o.answers ?? {}, o.questionIds));
  }
  return ok(toQuizStart(id, week, kind, bank, order, {}, ids));
}

const answersSchema = z.record(z.string().max(64), z.string().max(64));

function cleanAnswers(raw: unknown, allowed: string[]): Record<string, string> | null {
  const p = answersSchema.safeParse(raw ?? {});
  if (!p.success) return null;
  const allow = new Set(allowed);
  return Object.fromEntries(Object.entries(p.data).filter(([k]) => allow.has(k)));
}

export async function saveQuizAnswers(tx: Tx, actor: Actor, attemptId: string, answers: Record<string, string>): Promise<ActionResult<null>> {
  if (attemptId === "preview" && isStaff(actor)) return ok(null);
  if (!z.uuid().safeParse(attemptId).success) return fail("ไม่พบแบบทดสอบนี้ กรุณาเริ่มใหม่");
  const [a] = await tx.select().from(quizAttempt).where(and(eq(quizAttempt.id, attemptId), eq(quizAttempt.userId, actor.id)));
  if (!a) return fail("ไม่พบแบบทดสอบนี้ กรุณาเริ่มใหม่");
  if (a.submittedAt) return fail("ส่งแบบทดสอบนี้แล้ว ไม่สามารถแก้ไขคำตอบได้");
  const clean = cleanAnswers(answers, a.questionIds);
  if (!clean) return fail("รูปแบบคำตอบไม่ถูกต้อง");
  await tx
    .update(quizAttempt)
    .set({ answers: { ...(a.answers ?? {}), ...clean } })
    .where(and(eq(quizAttempt.id, attemptId), isNull(quizAttempt.submittedAt)));
  return ok(null);
}

export async function submitQuiz(tx: Tx, actor: Actor, attemptId: string, answers: Record<string, string>): Promise<ActionResult<QuizResult>> {
  if (attemptId === "preview" && isStaff(actor)) {
    // Staff preview: grade given question ids without storing anything.
    const ids = Object.keys(answers ?? {}).slice(0, 50);
    const weekGuess = Number(ids[0]?.match(/^W(\d{2})/)?.[1] ?? 0);
    const qs = weekGuess ? await loadBank(tx, weekGuess, ids) : [];
    const gr = gradeAttempt(qs, cleanAnswers(answers, ids) ?? {});
    const pass = weekContent(weekGuess)?.quiz.passPercent ?? 60;
    return ok({ attemptId, score: gr.score, maxScore: gr.maxScore, percent: gr.percent, passed: isPassed(gr.percent, pass), items: gr.items, xpAwarded: 0, newAchievements: [], nextWeekUnlocked: false });
  }
  if (!z.uuid().safeParse(attemptId).success) return fail("ไม่พบแบบทดสอบนี้ กรุณาเริ่มใหม่");
  const [a] = await tx.select().from(quizAttempt).where(and(eq(quizAttempt.id, attemptId), eq(quizAttempt.userId, actor.id)));
  if (!a) return fail("ไม่พบแบบทดสอบนี้ กรุณาเริ่มใหม่");
  if (a.submittedAt) return fail("ส่งแบบทดสอบนี้ไปแล้ว ดูผลได้ที่หน้าแบบทดสอบ หรือเริ่มทำชุดใหม่");
  const week = weekContent(a.week);
  if (!week) return fail("เนื้อหาสัปดาห์นี้ยังไม่พร้อมใช้งาน");
  if (a.kind !== "pre") {
    const g = await gateWeek(tx, actor, a.week);
    if (!g.ok) return g;
  }
  const clean = cleanAnswers(answers, a.questionIds);
  if (!clean) return fail("รูปแบบคำตอบไม่ถูกต้อง");
  const merged = { ...(a.answers ?? {}), ...clean };
  const qs = await loadBank(tx, a.week, a.questionIds);
  const byId = new Map(qs.map((q) => [q.id, q]));
  const ordered = a.questionIds.map((id) => byId.get(id)).filter((q): q is BankQuestion => Boolean(q));
  const gr = gradeAttempt(ordered, merged);
  const passed = a.kind === "pre" ? false : isPassed(gr.percent, week.quiz.passPercent);
  const upd = await tx
    .update(quizAttempt)
    .set({ answers: merged, score: gr.score, maxScore: gr.maxScore, percent: gr.percent, passed: a.kind === "pre" ? null : passed, submittedAt: new Date() })
    .where(and(eq(quizAttempt.id, a.id), isNull(quizAttempt.submittedAt)))
    .returning({ id: quizAttempt.id });
  if (!upd.length) return fail("ส่งแบบทดสอบนี้ไปแล้ว");
  if (gr.items.length) {
    await tx
      .insert(questionResponse)
      .values(gr.items.map((i) => ({ attemptId: a.id, questionId: i.questionId, week: a.week, answer: i.given, correct: i.correct })))
      .onConflictDoNothing();
  }
  let xp = 0;
  if (a.kind === "post" && passed) {
    await tx.insert(stageProgress).values({ userId: actor.id, week: a.week, stage: "quiz" }).onConflictDoNothing();
    xp += await awardXp(tx, actor.id, xpRef.quizPass(a.week), XP.quizPass, "ผ่านแบบทดสอบหลังเรียน");
    if (gr.percent >= 90) xp += await awardXp(tx, actor.id, xpRef.quizHigh(a.week), XP.quizHighBonus, "คะแนนแบบทดสอบ ≥ 90 %");
  }
  if (a.kind === "challenge" && passed) {
    xp += await awardXp(tx, actor.id, xpRef.challenge(a.week), XP.challenge, "ผ่านภารกิจท้าทายประจำสัปดาห์");
  }
  const newAchievements = a.kind === "pre" ? [] : await evaluateAndGrant(tx, actor.id);
  return ok({
    attemptId: a.id,
    score: gr.score,
    maxScore: gr.maxScore,
    percent: gr.percent,
    passed,
    items: gr.items,
    xpAwarded: xp,
    newAchievements,
    nextWeekUnlocked: await nextWeekUnlocked(tx, actor.id, a.week),
  });
}

// ---------------------------------------------------------------------------
// Challenge & assignments
// ---------------------------------------------------------------------------

export async function completeChallenge(tx: Tx, actor: Actor, weekN: number): Promise<ActionResult<{ xpAwarded: number; newAchievements: string[] }>> {
  const g = await gateWeek(tx, actor, weekN, "complete");
  if (!g.ok) return g;
  const iid = g.week.challenge.interaction;
  if (!iid) return fail("สัปดาห์นี้ยังไม่มีภารกิจท้าทาย");
  if (isStaff(actor)) return ok({ xpAwarded: 0, newAchievements: [] });
  const done = await interactionsCorrect(tx, actor.id, g.week.week);
  if (!done.includes(iid)) return fail("ยังไม่ได้ตอบภารกิจท้าทายถูกต้อง ลองทำอีกครั้งแล้วกดตรวจคำตอบ");
  const xpAwarded = await awardXp(tx, actor.id, xpRef.challenge(g.week.week), XP.challenge, "ผ่านภารกิจท้าทายประจำสัปดาห์");
  const newAchievements = await evaluateAndGrant(tx, actor.id);
  return ok({ xpAwarded, newAchievements });
}

export async function submitAssignment(tx: Tx, actor: Actor, formData: FormData): Promise<ActionResult<{ status: "submitted" }>> {
  const weekN = Number(formData.get("week"));
  const activityId = String(formData.get("activityId") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 2000) || null;
  const g = await gateWeek(tx, actor, weekN, "lab");
  if (!g.ok) return g;
  const act = activityById(g.week, activityId);
  if (!act) return fail("ไม่พบใบงานนี้ในสัปดาห์นี้ กรุณาโหลดหน้าใหม่");
  if (!act.submit) return fail("ใบงานนี้ไม่ต้องส่งไฟล์ — ทำตามขั้นตอนและให้ครูตรวจในชั้นเรียน");
  if (isStaff(actor)) return ok({ status: "submitted" as const });
  const file = formData.get("file");
  const check = await checkUpload(file instanceof File ? file : null);
  if (!check.ok) return check;
  const key = randomKey(check.kind);
  await storage().put(key, check.bytes, check.mime);
  const [prev] = await tx
    .select({ id: submission.id, fileKey: submission.fileKey, status: submission.status })
    .from(submission)
    .where(and(eq(submission.userId, actor.id), eq(submission.activityId, act.id)));
  if (prev?.status === "graded") {
    await storage().delete(key);
    return fail("ใบงานนี้ครูให้คะแนนแล้ว หากต้องการส่งใหม่กรุณาติดต่อครูผู้สอน");
  }
  const values = {
    fileKey: key,
    fileName: safeFileName((file as File).name, check.kind),
    fileSize: check.bytes.byteLength,
    mimeType: check.mime,
    note,
    status: "submitted" as const,
    submittedAt: new Date(),
  };
  if (prev) {
    await tx.update(submission).set(values).where(eq(submission.id, prev.id));
    if (prev.fileKey) await storage().delete(prev.fileKey);
  } else {
    await tx.insert(submission).values({ id: randomUUID(), userId: actor.id, week: g.week.week, activityId: act.id, ...values });
  }
  return ok({ status: "submitted" as const });
}

export { STAGE_KEYS };
