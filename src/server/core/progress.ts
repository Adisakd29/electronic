/**
 * Learner progress: loading state and computing unlocks/summaries.
 * Plain functions over a db/transaction handle so they can be used by
 * Server Components, Server Actions, route handlers and tsx scripts alike.
 * Callers are responsible for authorisation (userId comes from the session).
 */
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { stages, type StageKey } from "@/content/course";
import type { Tx } from "@/lib/db";
import {
  achievement,
  certificate,
  classroom,
  enrollment,
  interactionAttempt,
  labTaskResult,
  learningPosition,
  quizAttempt,
  stageProgress,
  stepProgress,
  submission,
  unlockOverride,
  unlockPolicy,
  xpEvent,
} from "@/lib/db/schema";
import { computeUnlocks, DEFAULT_POLICY, stageOrderRequired, type UnlockPolicyLike, type UnlockState, type WeekFacts } from "@/lib/unlock";
import { openStages } from "@/lib/stage-order";
import { evaluateAchievements, type AchievementFacts } from "@/lib/gamification";
import type { WeekStatus } from "../contracts";
import { labByWeek, submitActivities, TOTAL_WEEKS, weekContent } from "../content";

export const STAGE_KEYS: StageKey[] = stages.map((s) => s.key);

export interface UserState {
  userId: string;
  stageRows: { week: number; stage: StageKey; completedAt: Date }[];
  stepRows: { week: number; stepId: string; completedAt: Date }[];
  attempts: {
    id: string;
    week: number;
    kind: "pre" | "post" | "challenge" | "final";
    percent: number | null;
    passed: boolean | null;
    startedAt: Date;
    submittedAt: Date | null;
  }[];
  submissions: { week: number; activityId: string; status: "submitted" | "returned" | "graded" }[];
  policies: UnlockPolicyLike[];
  overrides: number[];
  positions: { week: number; stage: StageKey; stepIndex: number; updatedAt: Date }[];
  classrooms: { id: string; name: string; term: string }[];
}

export async function loadUserState(tx: Tx, userId: string): Promise<UserState> {
  return (await loadUserStates(tx, [userId])).get(userId)!;
}

/** Bulk variant for class reports (7 queries regardless of class size). */
export async function loadUserStates(tx: Tx, userIds: string[]): Promise<Map<string, UserState>> {
  const out = new Map<string, UserState>();
  const ids = [...new Set(userIds)];
  if (!ids.length) return out;
  const [stageRows, stepRows, attempts, subs, classes, overrides, positions] = await Promise.all([
    tx
      .select({ userId: stageProgress.userId, week: stageProgress.week, stage: stageProgress.stage, completedAt: stageProgress.completedAt })
      .from(stageProgress)
      .where(inArray(stageProgress.userId, ids)),
    tx
      .select({ userId: stepProgress.userId, week: stepProgress.week, stepId: stepProgress.stepId, completedAt: stepProgress.completedAt })
      .from(stepProgress)
      .where(inArray(stepProgress.userId, ids)),
    tx
      .select({
        userId: quizAttempt.userId,
        id: quizAttempt.id,
        week: quizAttempt.week,
        kind: quizAttempt.kind,
        percent: quizAttempt.percent,
        passed: quizAttempt.passed,
        startedAt: quizAttempt.startedAt,
        submittedAt: quizAttempt.submittedAt,
      })
      .from(quizAttempt)
      .where(inArray(quizAttempt.userId, ids)),
    tx
      .select({ userId: submission.userId, week: submission.week, activityId: submission.activityId, status: submission.status })
      .from(submission)
      .where(inArray(submission.userId, ids)),
    tx
      .select({
        userId: enrollment.userId,
        id: classroom.id,
        name: classroom.name,
        term: classroom.term,
        archived: classroom.archived,
        enabled: unlockPolicy.enabled,
        defaultRule: unlockPolicy.defaultRule,
        weekRules: unlockPolicy.weekRules,
        openedWeeks: unlockPolicy.openedWeeks,
      })
      .from(enrollment)
      .innerJoin(classroom, eq(classroom.id, enrollment.classroomId))
      .leftJoin(unlockPolicy, eq(unlockPolicy.classroomId, classroom.id))
      .where(inArray(enrollment.userId, ids)),
    tx.select({ userId: unlockOverride.userId, week: unlockOverride.week }).from(unlockOverride).where(inArray(unlockOverride.userId, ids)),
    tx
      .select({
        userId: learningPosition.userId,
        week: learningPosition.week,
        stage: learningPosition.stage,
        stepIndex: learningPosition.stepIndex,
        updatedAt: learningPosition.updatedAt,
      })
      .from(learningPosition)
      .where(inArray(learningPosition.userId, ids))
      .orderBy(desc(learningPosition.updatedAt)),
  ]);
  const by = <T extends { userId: string }>(rows: T[], id: string) => rows.filter((r) => r.userId === id);
  for (const id of ids) {
    const active = by(classes, id).filter((c) => !c.archived);
    out.set(id, {
      userId: id,
      stageRows: by(stageRows, id),
      stepRows: by(stepRows, id),
      attempts: by(attempts, id),
      submissions: by(subs, id),
      policies: active.map((c) =>
        c.defaultRule
          ? { enabled: c.enabled ?? true, defaultRule: c.defaultRule, weekRules: c.weekRules ?? {}, openedWeeks: c.openedWeeks ?? [] }
          : DEFAULT_POLICY,
      ),
      overrides: by(overrides, id).map((o) => o.week),
      positions: by(positions, id),
      classrooms: active.map((c) => ({ id: c.id, name: c.name, term: c.term })),
    });
  }
  return out;
}

export function lastActiveOf(s: UserState): Date | null {
  let t = 0;
  for (const r of s.stepRows) t = Math.max(t, r.completedAt.getTime());
  for (const r of s.stageRows) t = Math.max(t, r.completedAt.getTime());
  for (const r of s.positions) t = Math.max(t, r.updatedAt.getTime());
  for (const r of s.attempts) t = Math.max(t, (r.submittedAt ?? r.startedAt).getTime());
  return t ? new Date(t) : null;
}

export function stagesDoneFor(s: UserState, week: number): StageKey[] {
  const set = new Set(s.stageRows.filter((r) => r.week === week).map((r) => r.stage));
  return STAGE_KEYS.filter((k) => set.has(k));
}

export function bestPostPercent(s: UserState, week: number): number | null {
  const ps = s.attempts.filter((a) => a.week === week && a.kind === "post" && a.submittedAt && a.percent != null).map((a) => a.percent!);
  return ps.length ? Math.max(...ps) : null;
}

export function weekFacts(s: UserState, week: number): WeekFacts {
  const done = new Set(stagesDoneFor(s, week));
  const required = submitActivities(weekContent(week)).map((a) => a.id);
  const submitted = new Set(s.submissions.filter((x) => x.week === week).map((x) => x.activityId));
  return {
    learnDone: done.has("learn"),
    practiceDone: done.has("practice"),
    labDone: done.has("lab"),
    assignmentsDone: required.every((id) => submitted.has(id)),
    quizBestPercent: bestPostPercent(s, week),
  };
}

export function unlockStates(s: UserState): UnlockState[] {
  const facts: Record<number, WeekFacts> = {};
  for (let w = 1; w <= TOTAL_WEEKS; w++) facts[w] = weekFacts(s, w);
  return computeUnlocks(s.policies, s.overrides, facts, TOTAL_WEEKS);
}

export function weekStatuses(s: UserState): WeekStatus[] {
  const unlocks = unlockStates(s);
  return unlocks.map((u, i) => {
    const week = i + 1;
    const done = stagesDoneFor(s, week);
    const started =
      done.length > 0 || s.stepRows.some((r) => r.week === week) || s.positions.some((p) => p.week === week) || s.attempts.some((a) => a.week === week);
    return {
      week,
      unlocked: u.unlocked,
      lockReason: u.lockReason,
      started,
      completed: done.includes("complete"),
      stagesOpen: openStages(done, { required: stageOrderRequired(s.policies, week) }),
      percent: Math.round((done.length / STAGE_KEYS.length) * 100),
      stagesDone: done,
      quizBestPercent: bestPostPercent(s, week),
    };
  });
}

export function currentWeekOf(weeks: WeekStatus[]): number {
  const first = weeks.find((w) => w.unlocked && !w.completed);
  if (first) return first.week;
  const unlocked = weeks.filter((w) => w.unlocked);
  return unlocked.length ? unlocked[unlocked.length - 1].week : 1;
}

/** Stages of `week` the learner may open now (order rule from the learner's class policies). */
export function stagesOpenFor(s: UserState, week: number): StageKey[] {
  return openStages(stagesDoneFor(s, week), { required: stageOrderRequired(s.policies, week) });
}

export async function isWeekUnlocked(tx: Tx, userId: string, week: number): Promise<UnlockState> {
  const s = await loadUserState(tx, userId);
  return unlockStates(s)[week - 1] ?? { unlocked: false, lockReason: "ไม่พบสัปดาห์นี้" };
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export function achievementFacts(s: UserState): AchievementFacts {
  const completedWeeks = new Set(s.stageRows.filter((r) => r.stage === "complete").map((r) => r.week));
  const labStageWeeks = new Set(s.stageRows.filter((r) => r.stage === "lab").map((r) => r.week));
  const bestPostQuiz: Record<number, number> = {};
  let anyPerfect = false;
  let growth = false;
  const posts = s.attempts.filter((a) => a.kind === "post" && a.submittedAt && a.percent != null);
  for (const a of posts) {
    bestPostQuiz[a.week] = Math.max(bestPostQuiz[a.week] ?? 0, a.percent!);
    if (a.percent! >= 100) anyPerfect = true;
  }
  for (const a of posts) {
    if (!a.passed) continue;
    if (posts.some((b) => b.week === a.week && b.passed === false && b.submittedAt! < a.submittedAt!)) growth = true;
  }
  return { completedWeeks, labStageWeeks, bestPostQuiz, anyPerfect, growth, labByWeek: labByWeek() };
}

/** Earned achievement codes according to current data (not yet persisted). */
export function earnedCodes(s: UserState): string[] {
  return evaluateAchievements(achievementFacts(s));
}

// ---------------------------------------------------------------------------
// Misc readers
// ---------------------------------------------------------------------------

export async function totalXp(tx: Tx, userId: string): Promise<number> {
  const rows = await tx.select({ amount: xpEvent.amount }).from(xpEvent).where(eq(xpEvent.userId, userId));
  return rows.reduce((a, r) => a + r.amount, 0);
}

export async function userAchievements(tx: Tx, userId: string) {
  return tx.select({ code: achievement.code, earnedAt: achievement.earnedAt }).from(achievement).where(eq(achievement.userId, userId));
}

export async function userCertificate(tx: Tx, userId: string) {
  const [c] = await tx
    .select({ code: certificate.code, issuedAt: certificate.issuedAt, revoked: certificate.revoked })
    .from(certificate)
    .where(eq(certificate.userId, userId));
  return c && !c.revoked ? c : null;
}

export async function interactionsCorrect(tx: Tx, userId: string, week: number): Promise<string[]> {
  const rows = await tx
    .select({ id: interactionAttempt.interactionId })
    .from(interactionAttempt)
    .where(and(eq(interactionAttempt.userId, userId), eq(interactionAttempt.week, week), eq(interactionAttempt.correct, true)));
  return rows.map((r) => r.id);
}

export async function labTasksDone(tx: Tx, userId: string, week: number): Promise<string[]> {
  const rows = await tx
    .select({ id: labTaskResult.taskId })
    .from(labTaskResult)
    .where(and(eq(labTaskResult.userId, userId), eq(labTaskResult.week, week), eq(labTaskResult.correct, true)));
  return rows.map((r) => r.id);
}

export async function stepsDone(tx: Tx, userId: string, week: number): Promise<string[]> {
  const rows = await tx
    .select({ id: stepProgress.stepId })
    .from(stepProgress)
    .where(and(eq(stepProgress.userId, userId), eq(stepProgress.week, week)));
  return rows.map((r) => r.id);
}

export async function challengeDone(tx: Tx, userId: string, week: number): Promise<boolean> {
  const rows = await tx
    .select({ ref: xpEvent.ref })
    .from(xpEvent)
    .where(and(eq(xpEvent.userId, userId), eq(xpEvent.ref, `challenge:W${String(week).padStart(2, "0")}`)));
  return rows.length > 0;
}

export async function submittedAttempts(tx: Tx, userIds: string[]) {
  if (!userIds.length) return [];
  return tx
    .select({
      userId: quizAttempt.userId,
      week: quizAttempt.week,
      kind: quizAttempt.kind,
      percent: quizAttempt.percent,
      passed: quizAttempt.passed,
      submittedAt: quizAttempt.submittedAt,
    })
    .from(quizAttempt)
    .where(and(inArray(quizAttempt.userId, userIds), isNotNull(quizAttempt.submittedAt)));
}
