/**
 * Teacher/admin read models. Every exported function takes the acting staff
 * member and checks access itself (class taught / admin).
 */
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Tx } from "@/lib/db";
import {
  achievement,
  certificate,
  classroom,
  classroomTeacher,
  competencyAssessment,
  enrollment,
  interactionAttempt,
  labTaskResult,
  question,
  questionResponse,
  quizAttempt,
  submission,
  unlockOverride,
  unlockPolicy,
  user,
  xpEvent,
} from "@/lib/db/schema";
import { viewerCanAccessStudent, viewerCanManageClass, type Viewer } from "@/lib/access";
import { achievementByCode, levelFor } from "@/lib/gamification";
import { DEFAULT_POLICY, type UnlockPolicyLike } from "@/lib/unlock";
import { activityById, rubricMax, submitActivities, TOTAL_WEEKS, weekContent, weekTitle } from "../content";
import { bestPostPercent, currentWeekOf, lastActiveOf, loadUserStates, weekStatuses, type UserState } from "./progress";
import { competencyProfile, competencyProfiles } from "./competency";
import { classDomainSummary, DOMAINS, type DomainKey } from "@/lib/competency-domains";

export type ClassInfo = { id: string; name: string; term: string; archived: boolean; joinCode: string | null; track: string | null };

export async function staffClasses(tx: Tx, viewer: Viewer, includeArchived = false): Promise<ClassInfo[]> {
  const cols = { id: classroom.id, name: classroom.name, term: classroom.term, archived: classroom.archived, joinCode: classroom.joinCode, track: classroom.track };
  const rows =
    viewer.role === "admin"
      ? await tx.select(cols).from(classroom).orderBy(desc(classroom.term), asc(classroom.name))
      : viewer.role === "teacher"
        ? await tx
            .select(cols)
            .from(classroomTeacher)
            .innerJoin(classroom, eq(classroom.id, classroomTeacher.classroomId))
            .where(eq(classroomTeacher.userId, viewer.id))
            .orderBy(desc(classroom.term), asc(classroom.name))
        : [];
  return includeArchived ? rows : rows.filter((r) => !r.archived);
}

/** The requested class if the viewer may manage it, else their first class (or null). */
export async function resolveClass(tx: Tx, viewer: Viewer, requested?: string | null): Promise<{ classes: ClassInfo[]; current: ClassInfo | null }> {
  const classes = await staffClasses(tx, viewer, true);
  const visible = classes.filter((c) => !c.archived || c.id === requested);
  const current = (requested && visible.find((c) => c.id === requested)) || visible.find((c) => !c.archived) || null;
  return { classes: visible, current };
}

export async function assertClass(tx: Tx, viewer: Viewer, classId: string): Promise<boolean> {
  return viewerCanManageClass(tx, viewer, classId);
}

export interface StudentBasic {
  id: string;
  name: string;
  username: string | null;
  studentNo: string | null;
  disabled: boolean;
}

export async function classStudents(tx: Tx, classId: string): Promise<StudentBasic[]> {
  return tx
    .select({ id: user.id, name: user.name, username: user.username, studentNo: user.studentNo, disabled: user.disabled })
    .from(enrollment)
    .innerJoin(user, eq(user.id, enrollment.userId))
    .where(and(eq(enrollment.classroomId, classId), eq(user.role, "student")))
    .orderBy(asc(user.studentNo), asc(user.name));
}

function avgBestQuiz(s: UserState): number | null {
  const vals: number[] = [];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const b = bestPostPercent(s, w);
    if (b != null) vals.push(b);
  }
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}

export interface StudentRow extends StudentBasic {
  currentWeek: number;
  progress: number;
  weeksCompleted: number;
  avgQuiz: number | null;
  lastActive: string | null;
}

export async function classStudentRows(tx: Tx, classId: string): Promise<{ students: StudentRow[]; states: Map<string, UserState> }> {
  const students = await classStudents(tx, classId);
  const states = await loadUserStates(tx, students.map((s) => s.id));
  const rows = students.map((st) => {
    const s = states.get(st.id)!;
    const weeks = weekStatuses(s);
    return {
      ...st,
      currentWeek: currentWeekOf(weeks),
      progress: Math.round(weeks.reduce((a, w) => a + w.percent, 0) / TOTAL_WEEKS),
      weeksCompleted: weeks.filter((w) => w.completed).length,
      avgQuiz: avgBestQuiz(s),
      lastActive: lastActiveOf(s)?.toISOString() ?? null,
    };
  });
  return { students: rows, states };
}

export interface AttentionItem {
  studentId: string;
  name: string;
  reasons: string[];
}

export async function classOverview(tx: Tx, classId: string, now: Date) {
  const { students, states } = await classStudentRows(tx, classId);
  const perWeek = Array.from({ length: TOTAL_WEEKS }, (_, i) => ({ week: i + 1, started: 0, completed: 0 }));
  for (const st of students) {
    for (const w of weekStatuses(states.get(st.id)!)) {
      if (w.started) perWeek[w.week - 1].started++;
      if (w.completed) perWeek[w.week - 1].completed++;
    }
  }
  const avgProgress = students.length ? Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length) : 0;
  const quizVals = students.map((s) => s.avgQuiz).filter((v): v is number => v != null);
  const avgQuiz = quizVals.length ? Math.round((quizVals.reduce((a, b) => a + b, 0) / quizVals.length) * 10) / 10 : null;

  // Overdue: submit activities of weeks the student already passed (week complete or later week started) not submitted.
  const attention: AttentionItem[] = [];
  const weekMs = 7 * 24 * 3600 * 1000;
  for (const st of students) {
    const s = states.get(st.id)!;
    const reasons: string[] = [];
    const la = st.lastActive ? new Date(st.lastActive) : null;
    if (!la) reasons.push("ยังไม่เริ่มเรียน");
    else if (now.getTime() - la.getTime() > weekMs) reasons.push(`ไม่ได้เข้าเรียนมา ${Math.floor((now.getTime() - la.getTime()) / (24 * 3600 * 1000))} วัน`);
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      const fails = s.attempts.filter((a) => a.week === w && a.kind === "post" && a.submittedAt && a.passed === false).length;
      const passed = s.attempts.some((a) => a.week === w && a.kind === "post" && a.passed);
      if (fails >= 2 && !passed) reasons.push(`สอบสัปดาห์ที่ ${w} ไม่ผ่าน ${fails} ครั้ง`);
    }
    const ws = weekStatuses(s);
    const overdue: string[] = [];
    for (const w of ws) {
      const moved = w.completed || ws.some((x) => x.week > w.week && x.started);
      if (!moved) continue;
      for (const a of submitActivities(weekContent(w.week))) {
        if (!s.submissions.some((x) => x.activityId === a.id)) overdue.push(a.id);
      }
    }
    if (overdue.length) reasons.push(`ค้างส่งใบงาน ${overdue.length} ชิ้น`);
    if (reasons.length) attention.push({ studentId: st.id, name: st.name, reasons });
  }
  // 4-domain view (simulation evidence only): class mean and students below the threshold.
  const profiles = await competencyProfiles(tx, students.map((s) => s.id), states);
  const summary = classDomainSummary([...profiles.values()]);
  const domains = DOMAINS.map((d) => ({ key: d.key as DomainKey, no: d.no, title: d.title, ...summary[d.key] }));
  return { students, perWeek, avgProgress, avgQuiz, attention, domains };
}

// ---------------------------------------------------------------------------
// Student detail
// ---------------------------------------------------------------------------

export async function studentDetail(tx: Tx, viewer: Viewer, studentId: string) {
  if (viewer.role === "student" || !(await viewerCanAccessStudent(tx, viewer, studentId))) return null;
  const [u] = await tx
    .select({ id: user.id, name: user.name, username: user.username, studentNo: user.studentNo, disabled: user.disabled, role: user.role, email: user.email })
    .from(user)
    .where(eq(user.id, studentId));
  if (!u) return null;
  const s = (await loadUserStates(tx, [studentId])).get(studentId)!;
  const [attempts, labs, inter, subs, comps, xpRows, ach, cert, overrides, profile] = await Promise.all([
    tx.select().from(quizAttempt).where(and(eq(quizAttempt.userId, studentId), isNotNull(quizAttempt.submittedAt))).orderBy(asc(quizAttempt.week), asc(quizAttempt.submittedAt)),
    tx.select().from(labTaskResult).where(eq(labTaskResult.userId, studentId)).orderBy(asc(labTaskResult.week), asc(labTaskResult.taskId)),
    tx
      .select()
      .from(interactionAttempt)
      .where(and(eq(interactionAttempt.userId, studentId), sql`${interactionAttempt.wrongAttempts} > 0`))
      .orderBy(desc(interactionAttempt.wrongAttempts)),
    tx.select().from(submission).where(eq(submission.userId, studentId)).orderBy(asc(submission.week)),
    tx.select().from(competencyAssessment).where(eq(competencyAssessment.userId, studentId)).orderBy(asc(competencyAssessment.competency)),
    tx.select({ amount: xpEvent.amount }).from(xpEvent).where(eq(xpEvent.userId, studentId)),
    tx.select().from(achievement).where(eq(achievement.userId, studentId)),
    tx.select().from(certificate).where(eq(certificate.userId, studentId)),
    tx.select().from(unlockOverride).where(eq(unlockOverride.userId, studentId)).orderBy(asc(unlockOverride.week)),
    competencyProfile(tx, studentId),
  ]);
  const xp = xpRows.reduce((a, r) => a + r.amount, 0);
  const weeks = weekStatuses(s);
  const allComplete = weeks.every((w) => w.completed);
  const finalPassed = comps.some((c) => c.competency === 0 && c.passed);
  return {
    user: { ...u, email: u.email.endsWith("@accounts.local") ? null : u.email },
    classrooms: s.classrooms,
    weeks,
    attempts: attempts.map((a) => ({ id: a.id, week: a.week, kind: a.kind, percent: a.percent, passed: a.passed, score: a.score, maxScore: a.maxScore, submittedAt: a.submittedAt })),
    labs,
    interactionErrors: inter,
    submissions: subs.map((x) => ({ ...x, title: activityById(weekContent(x.week), x.activityId)?.title ?? x.activityId })),
    competencies: comps,
    /** Computed 4-domain view (simulation evidence separate from teacher-recorded practice). */
    competencyProfile: profile,
    xp,
    level: levelFor(xp),
    achievements: ach.map((a) => ({ code: a.code, title: achievementByCode.get(a.code)?.title ?? a.code, earnedAt: a.earnedAt })),
    certificate: cert[0] ?? null,
    eligibleForCertificate: allComplete && finalPassed,
    eligibility: { allComplete, finalPassed, weeksCompleted: weeks.filter((w) => w.completed).length },
    overrides,
  };
}

// ---------------------------------------------------------------------------
// Item analysis
// ---------------------------------------------------------------------------

export async function itemAnalysis(tx: Tx, classId: string, week: number) {
  const students = await classStudents(tx, classId);
  const ids = students.map((s) => s.id);
  const qs = await tx.select().from(question).where(eq(question.week, week));
  const responses = ids.length
    ? await tx
        .select({ questionId: questionResponse.questionId, answer: questionResponse.answer, correct: questionResponse.correct, kind: quizAttempt.kind })
        .from(questionResponse)
        .innerJoin(quizAttempt, eq(quizAttempt.id, questionResponse.attemptId))
        .where(and(eq(questionResponse.week, week), inArray(quizAttempt.userId, ids)))
    : [];
  const questions = qs
    .map((q) => {
      const rs = responses.filter((r) => r.questionId === q.id);
      const wrong = rs.filter((r) => !r.correct);
      const counts = new Map<string, number>();
      for (const r of wrong) counts.set(r.answer ?? "(ไม่ตอบ)", (counts.get(r.answer ?? "(ไม่ตอบ)") ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const topText = top
        ? q.type === "mcq"
          ? `${top[0]}) ${q.choices?.find((c) => c.id === top[0])?.text ?? ""}`.trim()
          : q.type === "tf"
            ? top[0] === "true" ? "ถูก" : top[0] === "false" ? "ผิด" : top[0]
            : top[0]
        : null;
      return {
        id: q.id,
        stem: q.stem,
        bloom: q.bloom,
        active: q.active,
        attempts: rs.length,
        percentCorrect: rs.length ? Math.round(((rs.length - wrong.length) / rs.length) * 1000) / 10 : null,
        commonWrong: topText,
        commonWrongCount: top?.[1] ?? 0,
      };
    })
    .sort((a, b) => (a.percentCorrect ?? 101) - (b.percentCorrect ?? 101));
  const content = weekContent(week);
  const inter = ids.length
    ? await tx.select().from(interactionAttempt).where(and(eq(interactionAttempt.week, week), inArray(interactionAttempt.userId, ids)))
    : [];
  const interactions = (content?.interactions ?? [])
    .map((i) => {
      const rows = inter.filter((r) => r.interactionId === i.id);
      const att = rows.reduce((a, r) => a + r.attempts, 0);
      const wrong = rows.reduce((a, r) => a + r.wrongAttempts, 0);
      return {
        id: i.id,
        kind: i.kind,
        prompt: i.prompt,
        learners: rows.length,
        attempts: att,
        percentWrong: att ? Math.round((wrong / att) * 1000) / 10 : null,
        firstTryRate: rows.length ? Math.round((rows.filter((r) => r.firstTryCorrect).length / rows.length) * 1000) / 10 : null,
        lastWrong: rows.map((r) => r.lastWrong).filter((x): x is string => Boolean(x)).slice(0, 5),
      };
    })
    .sort((a, b) => (b.percentWrong ?? -1) - (a.percentWrong ?? -1));
  return { questions, interactions };
}

// ---------------------------------------------------------------------------
// Pre vs post
// ---------------------------------------------------------------------------

export async function prePost(tx: Tx, classId: string) {
  const students = await classStudents(tx, classId);
  const states = await loadUserStates(tx, students.map((s) => s.id));
  const weeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const w = i + 1;
    const pres: number[] = [];
    const posts: number[] = [];
    const perStudent = students.map((st) => {
      const s = states.get(st.id)!;
      const pre = s.attempts.filter((a) => a.week === w && a.kind === "pre" && a.submittedAt && a.percent != null)[0]?.percent ?? null;
      const post = bestPostPercent(s, w);
      if (pre != null) pres.push(pre);
      if (post != null) posts.push(post);
      return { studentId: st.id, name: st.name, studentNo: st.studentNo, pre, post, gain: pre != null && post != null ? Math.round((post - pre) * 10) / 10 : null };
    });
    const mean = (v: number[]) => (v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null);
    return { week: w, preMean: mean(pres), postMean: mean(posts), preN: pres.length, postN: posts.length, perStudent };
  });
  return { students, weeks };
}

// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------

export async function labReport(tx: Tx, classId: string, week: number) {
  const students = await classStudents(tx, classId);
  const ids = students.map((s) => s.id);
  const tasks = weekContent(week)?.lab.tasks ?? [];
  const rows = ids.length ? await tx.select().from(labTaskResult).where(and(eq(labTaskResult.week, week), inArray(labTaskResult.userId, ids))) : [];
  return {
    tasks: tasks.map((t) => {
      const rs = rows.filter((r) => r.taskId === t.id);
      return {
        id: t.id,
        kind: t.kind,
        prompt: t.prompt,
        tried: rs.length,
        done: rs.filter((r) => r.correct).length,
        rate: students.length ? Math.round((rs.filter((r) => r.correct).length / students.length) * 1000) / 10 : 0,
        avgAttempts: rs.length ? Math.round((rs.reduce((a, r) => a + r.attempts, 0) / rs.length) * 10) / 10 : null,
      };
    }),
    students: students.map((st) => {
      const rs = rows.filter((r) => r.userId === st.id);
      return {
        ...st,
        done: rs.filter((r) => r.correct).length,
        total: tasks.length,
        /** Total check attempts across the week's tasks. */
        attempts: rs.reduce((a, r) => a + r.attempts, 0),
        status: Object.fromEntries(rs.map((r) => [r.taskId, r.correct])) as Record<string, boolean>,
        attemptsByTask: Object.fromEntries(rs.map((r) => [r.taskId, r.attempts])) as Record<string, number>,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export async function submissionQueue(tx: Tx, classId: string, week: number | null, status: "submitted" | "returned" | "graded" | "missing" | null) {
  const students = await classStudents(tx, classId);
  const ids = students.map((s) => s.id);
  const subs = ids.length ? await tx.select().from(submission).where(inArray(submission.userId, ids)).orderBy(asc(submission.submittedAt)) : [];
  const byStudent = new Map(students.map((s) => [s.id, s]));
  const items = subs
    .filter((x) => (week ? x.week === week : true))
    .map((x) => ({
      id: x.id,
      week: x.week,
      activityId: x.activityId,
      title: activityById(weekContent(x.week), x.activityId)?.title ?? x.activityId,
      student: byStudent.get(x.userId)!,
      status: x.status as "submitted" | "returned" | "graded",
      fileName: x.fileName,
      fileKey: x.fileKey,
      submittedAt: x.submittedAt,
      score: x.score,
      maxScore: x.maxScore,
    }));
  const missing: { week: number; activityId: string; title: string; student: StudentBasic }[] = [];
  const weeks = week ? [week] : Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);
  for (const w of weeks) {
    for (const a of submitActivities(weekContent(w))) {
      for (const st of students) if (!subs.some((x) => x.userId === st.id && x.activityId === a.id)) missing.push({ week: w, activityId: a.id, title: a.title, student: st });
    }
  }
  return {
    items: status && status !== "missing" ? items.filter((i) => i.status === status) : status === "missing" ? [] : items,
    missing: status === "missing" || status == null ? missing : [],
    counts: {
      submitted: items.filter((i) => i.status === "submitted").length,
      returned: items.filter((i) => i.status === "returned").length,
      graded: items.filter((i) => i.status === "graded").length,
      missing: missing.length,
    },
  };
}

export async function submissionDetail(tx: Tx, viewer: Viewer, id: string) {
  const [x] = await tx.select().from(submission).where(eq(submission.id, id));
  if (!x || viewer.role === "student" || !(await viewerCanAccessStudent(tx, viewer, x.userId))) return null;
  const [u] = await tx.select({ id: user.id, name: user.name, studentNo: user.studentNo }).from(user).where(eq(user.id, x.userId));
  const act = activityById(weekContent(x.week), x.activityId) ?? null;
  return { submission: x, student: u, activity: act, maxScore: act ? rubricMax(act) : null };
}

// ---------------------------------------------------------------------------
// Competency matrix
// ---------------------------------------------------------------------------

export async function competencyMatrix(tx: Tx, classId: string) {
  const students = await classStudents(tx, classId);
  const ids = students.map((s) => s.id);
  const rows = ids.length ? await tx.select().from(competencyAssessment).where(inArray(competencyAssessment.userId, ids)) : [];
  return {
    students: students.map((st) => ({
      ...st,
      cells: Object.fromEntries(rows.filter((r) => r.userId === st.id).map((r) => [r.competency, r])) as Record<number, (typeof rows)[number]>,
    })),
  };
}

// ---------------------------------------------------------------------------
// Unlock settings
// ---------------------------------------------------------------------------

export async function unlockSettings(tx: Tx, classId: string) {
  const [p] = await tx.select().from(unlockPolicy).where(eq(unlockPolicy.classroomId, classId));
  const policy: UnlockPolicyLike = p ? { enabled: p.enabled, defaultRule: p.defaultRule, weekRules: p.weekRules, openedWeeks: p.openedWeeks } : DEFAULT_POLICY;
  const students = await classStudents(tx, classId);
  const ids = students.map((s) => s.id);
  const overrides = ids.length
    ? await tx
        .select({ userId: unlockOverride.userId, week: unlockOverride.week, note: unlockOverride.note, createdAt: unlockOverride.createdAt, name: user.name })
        .from(unlockOverride)
        .innerJoin(user, eq(user.id, unlockOverride.userId))
        .where(inArray(unlockOverride.userId, ids))
        .orderBy(asc(unlockOverride.week))
    : [];
  return { policy, saved: Boolean(p), overrides, students };
}

// ---------------------------------------------------------------------------
// Gradebook (exports)
// ---------------------------------------------------------------------------

export async function gradebook(tx: Tx, classId: string) {
  const { students, states } = await classStudentRows(tx, classId);
  const ids = students.map((s) => s.id);
  const [subs, comps, xps, labs] = await Promise.all([
    ids.length ? tx.select().from(submission).where(inArray(submission.userId, ids)) : [],
    ids.length ? tx.select().from(competencyAssessment).where(inArray(competencyAssessment.userId, ids)) : [],
    ids.length ? tx.select({ userId: xpEvent.userId, amount: xpEvent.amount }).from(xpEvent).where(inArray(xpEvent.userId, ids)) : [],
    ids.length ? tx.select().from(labTaskResult).where(and(inArray(labTaskResult.userId, ids), eq(labTaskResult.correct, true))) : [],
  ]);
  const profiles = await competencyProfiles(tx, ids, states);
  const activities = Array.from({ length: TOTAL_WEEKS }, (_, i) => submitActivities(weekContent(i + 1)).map((a) => ({ week: i + 1, id: a.id, title: a.title, max: rubricMax(a) }))).flat();
  const header: string[] = ["เลขประจำตัว", "ชื่อ-นามสกุล", "ชื่อผู้ใช้", "ความก้าวหน้า (%)", "สัปดาห์ที่เรียนจบ"];
  for (let w = 1; w <= TOTAL_WEEKS; w++) header.push(`W${w} จบ`, `W${w} ก่อนเรียน %`, `W${w} หลังเรียน %`, `W${w} Lab %`);
  for (const a of activities) header.push(`${a.id} (${a.max})`);
  // Computed 4-domain view from simulation evidence — clearly separated from teacher-recorded practice results.
  for (const d of DOMAINS) header.push(`จำลอง: ด้าน ${d.no} ${d.title} %`);
  header.push("ปฏิบัติจริง: ใบงานเกณฑ์ความปลอดภัย %", "ปฏิบัติจริง: สมรรถนะ 1", "ปฏิบัติจริง: สมรรถนะ 2", "ปฏิบัติจริง: สมรรถนะ 3", "ปฏิบัติจริง: สมรรถนะ 4", "ปฏิบัติจริง: ประเมินปลายภาค", "XP");
  const rows: (string | number | null)[][] = [header];
  for (const st of students) {
    const s = states.get(st.id)!;
    const ws = weekStatuses(s);
    const r: (string | number | null)[] = [st.studentNo, st.name, st.username, st.progress, st.weeksCompleted];
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      const pre = s.attempts.find((a) => a.week === w && a.kind === "pre" && a.submittedAt)?.percent ?? null;
      const tasks = weekContent(w)?.lab.tasks.length ?? 0;
      const done = labs.filter((l) => l.userId === st.id && l.week === w).length;
      r.push(ws[w - 1].completed ? "✓" : "", pre, bestPostPercent(s, w), tasks ? Math.round((done / tasks) * 100) : null);
    }
    for (const a of activities) {
      const x = subs.find((y) => y.userId === st.id && y.activityId === a.id);
      r.push(x ? (x.status === "graded" ? x.score : x.status === "returned" ? "ส่งกลับแก้ไข" : "รอตรวจ") : "");
    }
    const prof = profiles.get(st.id);
    for (const d of DOMAINS) r.push(prof?.simulation[d.key].percent ?? null);
    r.push(prof?.practical.rubricPercent ?? null);
    for (const c of [1, 2, 3, 4, 0]) {
      const cs = comps.filter((y) => y.userId === st.id && y.competency === c);
      const latest = cs.sort((a, b) => b.assessedAt.getTime() - a.assessedAt.getTime())[0];
      r.push(latest ? `${latest.level}${latest.passed ? " (ผ่าน)" : " (ไม่ผ่าน)"}` : "");
    }
    r.push(xps.filter((x) => x.userId === st.id).reduce((a, x) => a + x.amount, 0));
    rows.push(r);
  }
  return rows;
}

export async function itemAnalysisRows(tx: Tx, classId: string) {
  const header = ["สัปดาห์", "ชนิด", "รหัส", "Bloom", "จำนวนครั้งที่ตอบ", "% ถูก / % ผิด", "คำตอบผิดที่พบบ่อย", "โจทย์"];
  const rows: (string | number | null)[][] = [header];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const a = await itemAnalysis(tx, classId, w);
    for (const q of a.questions) if (q.attempts) rows.push([w, "ข้อสอบ", q.id, q.bloom, q.attempts, q.percentCorrect, q.commonWrong, q.stem.slice(0, 300)]);
    for (const i of a.interactions) if (i.attempts) rows.push([w, "กิจกรรมในบทเรียน", i.id, i.kind, i.attempts, i.percentWrong, i.lastWrong.join(" | "), i.prompt.slice(0, 300)]);
  }
  return rows;
}

export { weekTitle };

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

export async function questionList(tx: Tx, f: { week: number | null; q: string | null; bloom: string | null; status: "active" | "inactive" | "all" }) {
  const conds = [];
  if (f.week) conds.push(eq(question.week, f.week));
  if (f.bloom && ["remember", "understand", "apply", "analyze", "evaluate"].includes(f.bloom)) conds.push(eq(question.bloom, f.bloom as "remember"));
  if (f.status === "active") conds.push(eq(question.active, true));
  if (f.status === "inactive") conds.push(eq(question.active, false));
  if (f.q) conds.push(sql`(${question.stem} ilike ${"%" + f.q + "%"} or ${question.id} ilike ${"%" + f.q + "%"})`);
  const rows = await tx
    .select({ id: question.id, week: question.week, type: question.type, bloom: question.bloom, stem: question.stem, active: question.active, source: question.source, editedAt: question.editedAt })
    .from(question)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(question.week), asc(question.id))
    .limit(500);
  const counts = await tx
    .select({ week: question.week, n: sql<number>`count(*) filter (where ${question.active})::int` })
    .from(question)
    .groupBy(question.week);
  return { rows, activeByWeek: Object.fromEntries(counts.map((c) => [c.week, c.n])) as Record<number, number> };
}

export async function questionById(tx: Tx, id: string) {
  const [q] = await tx.select().from(question).where(eq(question.id, id));
  return q ?? null;
}
