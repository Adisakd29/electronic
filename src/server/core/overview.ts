/**
 * Read models for the learner (sidebar, dashboard, week progress).
 * Used by src/server/queries.ts (own data) and staff pages (after an access check).
 */
import { and, desc, eq } from "drizzle-orm";
import { stages } from "@/content/course";
import type { Tx } from "@/lib/db";
import { labReflection, quizAttempt, submission } from "@/lib/db/schema";
import { achievementByCode, levelFor } from "@/lib/gamification";
import type {
  GamificationSummary,
  PendingAssignment,
  SessionUser,
  SidebarData,
  StudentOverview,
  SubmissionInfo,
  WeekProgress,
} from "../contracts";
import { activityById, rubricMax, submitActivities, TOTAL_WEEKS, weekContent, weekTitle } from "../content";
import {
  challengeDone,
  currentWeekOf,
  interactionsCorrect,
  labTasksDone,
  loadUserState,
  stagesDoneFor,
  stagesOpenFor,
  stepsDone,
  totalXp,
  unlockStates,
  userAchievements,
  userCertificate,
  weekStatuses,
  type UserState,
} from "./progress";

export function sidebarFrom(user: SessionUser, s: UserState): SidebarData {
  const weeks = weekStatuses(s);
  const pos = s.positions[0];
  const currentWeek = currentWeekOf(weeks);
  // A finished week is not a place to "continue": send the learner on to the current week instead.
  const stale = pos && pos.week !== currentWeek && weeks[pos.week - 1]?.completed;
  return {
    user,
    weeks,
    currentWeek,
    resume: pos && !stale ? { week: pos.week, stage: pos.stage, stepIndex: pos.stepIndex } : null,
    overallPercent: Math.round(weeks.reduce((a, w) => a + w.percent, 0) / TOTAL_WEEKS),
  };
}

export async function sidebarData(tx: Tx, user: SessionUser): Promise<SidebarData> {
  return sidebarFrom(user, await loadUserState(tx, user.id));
}

export async function gamificationSummary(tx: Tx, userId: string): Promise<GamificationSummary> {
  const [xp, ach] = await Promise.all([totalXp(tx, userId), userAchievements(tx, userId)]);
  return {
    xp,
    ...levelFor(xp),
    achievements: ach
      .sort((a, b) => a.earnedAt.getTime() - b.earnedAt.getTime())
      .map((a) => {
        const def = achievementByCode.get(a.code);
        return { code: a.code, title: def?.title ?? a.code, description: def?.description ?? "", earnedAt: a.earnedAt.toISOString() };
      }),
  };
}

const stageLabel = Object.fromEntries(stages.map((s) => [s.key, s.label])) as Record<string, string>;

export async function studentOverview(tx: Tx, user: SessionUser): Promise<StudentOverview> {
  const s = await loadUserState(tx, user.id);
  const side = sidebarFrom(user, s);
  const [gam, subs, cert, attempts] = await Promise.all([
    gamificationSummary(tx, user.id),
    tx.select().from(submission).where(eq(submission.userId, user.id)),
    userCertificate(tx, user.id),
    tx
      .select({ week: quizAttempt.week, kind: quizAttempt.kind, percent: quizAttempt.percent, submittedAt: quizAttempt.submittedAt })
      .from(quizAttempt)
      .where(and(eq(quizAttempt.userId, user.id)))
      .orderBy(desc(quizAttempt.submittedAt)),
  ]);

  const assignments: PendingAssignment[] = [];
  for (const w of side.weeks) {
    if (!w.unlocked) continue;
    const content = weekContent(w.week);
    for (const a of submitActivities(content)) {
      const sub = subs.find((x) => x.activityId === a.id);
      assignments.push({
        week: w.week,
        activityId: a.id,
        title: a.title,
        status: sub ? sub.status : "not-submitted",
        score: sub?.score ?? null,
        maxScore: sub?.maxScore ?? rubricMax(a),
      });
    }
  }

  const quizHistory = attempts
    .filter((a) => a.submittedAt && a.percent != null && (a.kind === "pre" || a.kind === "post"))
    .map((a) => ({ week: a.week, kind: a.kind as "pre" | "post", percent: a.percent!, at: a.submittedAt!.toISOString() }));

  const recent: { at: Date; text: string }[] = [];
  for (const r of s.stepRows) {
    const step = weekContent(r.week)?.steps.find((x) => x.id === r.stepId);
    recent.push({ at: r.completedAt, text: `เรียนหัวข้อ “${step?.title ?? r.stepId}” (สัปดาห์ที่ ${r.week})` });
  }
  for (const r of s.stageRows) {
    recent.push({
      at: r.completedAt,
      text: r.stage === "complete" ? `เรียนจบสัปดาห์ที่ ${r.week}: ${weekTitle(r.week)}` : `ผ่านขั้น “${stageLabel[r.stage]}” สัปดาห์ที่ ${r.week}`,
    });
  }
  for (const a of attempts) {
    if (!a.submittedAt || a.percent == null) continue;
    const label = a.kind === "pre" ? "แบบทดสอบก่อนเรียน" : a.kind === "post" ? "แบบทดสอบหลังเรียน" : a.kind === "challenge" ? "ภารกิจท้าทาย" : "การประเมินปลายภาค";
    recent.push({ at: a.submittedAt, text: `ทำ${label}สัปดาห์ที่ ${a.week} ได้ ${Math.round(a.percent)} %` });
  }
  for (const x of subs) {
    const t = activityById(weekContent(x.week), x.activityId)?.title ?? x.activityId;
    recent.push({ at: x.submittedAt, text: `ส่งใบงาน “${t}”` });
    if (x.gradedAt && x.status !== "submitted") {
      recent.push({ at: x.gradedAt, text: x.status === "graded" ? `ครูให้คะแนนใบงาน “${t}” แล้ว` : `ครูส่งใบงาน “${t}” กลับให้แก้ไข` });
    }
  }
  for (const a of gam.achievements) recent.push({ at: new Date(a.earnedAt), text: `ได้รับเหรียญ “${a.title}”` });
  recent.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    ...side,
    classrooms: s.classrooms,
    gamification: gam,
    assignments,
    recent: recent.slice(0, 20).map((r) => ({ at: r.at.toISOString(), text: r.text })),
    quizHistory,
    certificate: cert ? { code: cert.code, issuedAt: cert.issuedAt.toISOString() } : null,
  };
}

export async function weekProgress(tx: Tx, userId: string, week: number): Promise<WeekProgress> {
  const content = weekContent(week);
  const s = await loadUserState(tx, userId);
  const u = unlockStates(s)[week - 1] ?? { unlocked: false, lockReason: "ไม่พบสัปดาห์นี้" };
  const [steps, inter, labs, refl, subs, chall] = await Promise.all([
    stepsDone(tx, userId, week),
    interactionsCorrect(tx, userId, week),
    labTasksDone(tx, userId, week),
    tx.select({ answers: labReflection.answers, notes: labReflection.notes }).from(labReflection).where(and(eq(labReflection.userId, userId), eq(labReflection.week, week))),
    tx.select().from(submission).where(and(eq(submission.userId, userId), eq(submission.week, week))),
    challengeDone(tx, userId, week),
  ]);
  const pos = s.positions.find((p) => p.week === week);
  const atts = s.attempts.filter((a) => a.week === week);
  const pre = atts.filter((a) => a.kind === "pre" && a.submittedAt).sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime())[0];
  const posts = atts.filter((a) => a.kind === "post");
  const submittedPosts = posts.filter((a) => a.submittedAt && a.percent != null);
  const open = posts.find((a) => !a.submittedAt);
  const submissions: Record<string, SubmissionInfo> = {};
  for (const x of subs) {
    submissions[x.activityId] = {
      activityId: x.activityId,
      status: x.status,
      fileName: x.fileName,
      submittedAt: x.submittedAt.toISOString(),
      score: x.score,
      maxScore: x.maxScore,
      rubricScores: x.rubricScores ?? null,
      feedback: x.feedback,
    };
  }
  return {
    week,
    unlocked: u.unlocked,
    lockReason: u.lockReason,
    stagesDone: stagesDoneFor(s, week),
    stagesOpen: stagesOpenFor(s, week),
    stepsDone: steps,
    interactionsCorrect: inter,
    labTasksDone: labs,
    labReflection: refl[0]?.answers ?? null,
    labNotes: refl[0]?.notes ?? [],
    position: pos ? { stage: pos.stage, stepIndex: pos.stepIndex } : null,
    pretest: pre ? { percent: pre.percent ?? 0, at: pre.submittedAt!.toISOString() } : null,
    quiz: {
      attempts: submittedPosts.length,
      bestPercent: submittedPosts.length ? Math.max(...submittedPosts.map((a) => a.percent!)) : null,
      passed: submittedPosts.some((a) => a.passed),
      passPercent: content?.quiz.passPercent ?? 60,
      openAttemptId: open?.id ?? null,
    },
    challengeDone: chall,
    submissions,
  };
}
