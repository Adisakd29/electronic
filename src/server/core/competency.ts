/**
 * 4-domain competency profile (see src/lib/competency-domains.ts for the mapping).
 * Loads a learner's evidence and computes the profile; bulk variant for class reports.
 * Callers are responsible for authorisation.
 */
import { and, eq, inArray, isNotNull, like } from "drizzle-orm";
import type { Tx } from "@/lib/db";
import { competencyAssessment, interactionAttempt, labTaskResult, questionResponse, quizAttempt, submission, xpEvent } from "@/lib/db/schema";
import {
  computeCompetencyProfile,
  emptyEvidence,
  weekEvidenceSpec,
  type CompetencyProfile,
  type StudentEvidence,
  type WeekEvidenceSpec,
} from "@/lib/competency-domains";
import { TOTAL_WEEKS, weekContent } from "../content";
import { bestPostPercent, loadUserStates, type UserState } from "./progress";

let specCache: WeekEvidenceSpec[] | null = null;

/** Evidence specs of every week with content (cached; content is static at runtime). */
export function weekSpecs(): WeekEvidenceSpec[] {
  if (specCache) return specCache;
  const out: WeekEvidenceSpec[] = [];
  for (let n = 1; n <= TOTAL_WEEKS; n++) {
    const w = weekContent(n);
    if (w) out.push(weekEvidenceSpec(w));
  }
  specCache = out;
  return out;
}

/** Evidence of several learners (6 queries regardless of count). `states` may be passed to avoid reloading. */
export async function loadEvidence(tx: Tx, userIds: string[], states?: Map<string, UserState>): Promise<Map<string, StudentEvidence>> {
  const out = new Map<string, StudentEvidence>();
  const ids = [...new Set(userIds)];
  if (!ids.length) return out;
  const st = states ?? (await loadUserStates(tx, ids));
  const [inter, labs, resp, chall, subs, comps] = await Promise.all([
    tx
      .select({
        userId: interactionAttempt.userId,
        week: interactionAttempt.week,
        interactionId: interactionAttempt.interactionId,
        attempts: interactionAttempt.attempts,
        wrongAttempts: interactionAttempt.wrongAttempts,
        correct: interactionAttempt.correct,
        firstTryCorrect: interactionAttempt.firstTryCorrect,
      })
      .from(interactionAttempt)
      .where(inArray(interactionAttempt.userId, ids)),
    tx
      .select({ userId: labTaskResult.userId, week: labTaskResult.week, taskId: labTaskResult.taskId, correct: labTaskResult.correct, attempts: labTaskResult.attempts })
      .from(labTaskResult)
      .where(inArray(labTaskResult.userId, ids)),
    tx
      .select({ userId: quizAttempt.userId, week: questionResponse.week, questionId: questionResponse.questionId, correct: questionResponse.correct })
      .from(questionResponse)
      .innerJoin(quizAttempt, eq(quizAttempt.id, questionResponse.attemptId))
      .where(and(inArray(quizAttempt.userId, ids), eq(quizAttempt.kind, "post"), isNotNull(quizAttempt.submittedAt))),
    tx
      .select({ userId: xpEvent.userId, ref: xpEvent.ref })
      .from(xpEvent)
      .where(and(inArray(xpEvent.userId, ids), like(xpEvent.ref, "challenge:W%"))),
    tx
      .select({ userId: submission.userId, week: submission.week, activityId: submission.activityId, rubricScores: submission.rubricScores, status: submission.status })
      .from(submission)
      .where(inArray(submission.userId, ids)),
    tx
      .select({
        userId: competencyAssessment.userId,
        competency: competencyAssessment.competency,
        level: competencyAssessment.level,
        passed: competencyAssessment.passed,
        score: competencyAssessment.score,
        maxScore: competencyAssessment.maxScore,
        assessedAt: competencyAssessment.assessedAt,
      })
      .from(competencyAssessment)
      .where(inArray(competencyAssessment.userId, ids)),
  ]);
  for (const id of ids) {
    const ev = emptyEvidence();
    const s = st.get(id);
    for (let w = 1; w <= TOTAL_WEEKS; w++) ev.quizBest[w] = s ? bestPostPercent(s, w) : null;
    ev.interactions = inter.filter((r) => r.userId === id);
    ev.labTasks = labs.filter((r) => r.userId === id);
    ev.questionResponses = resp.filter((r) => r.userId === id);
    ev.challengeWeeks = chall.filter((r) => r.userId === id).map((r) => Number(r.ref.slice("challenge:W".length))).filter((n) => Number.isInteger(n) && n > 0);
    ev.submissions = subs.filter((r) => r.userId === id).map((r) => ({ week: r.week, activityId: r.activityId, rubricScores: r.rubricScores ?? null, status: r.status }));
    // Latest assessment per competency wins.
    const mine = comps.filter((r) => r.userId === id).sort((a, b) => b.assessedAt.getTime() - a.assessedAt.getTime());
    const seen = new Set<number>();
    for (const c of mine) {
      if (seen.has(c.competency)) continue;
      seen.add(c.competency);
      ev.competencies.push({ competency: c.competency, level: c.level, passed: c.passed, score: c.score, maxScore: c.maxScore });
    }
    out.set(id, ev);
  }
  return out;
}

export async function competencyProfiles(tx: Tx, userIds: string[], states?: Map<string, UserState>): Promise<Map<string, CompetencyProfile>> {
  const ev = await loadEvidence(tx, userIds, states);
  const specs = weekSpecs();
  const out = new Map<string, CompetencyProfile>();
  for (const [id, e] of ev) out.set(id, computeCompetencyProfile(specs, e));
  return out;
}

/** 4-domain profile of one learner (reuses loadUserState via loadUserStates). */
export async function competencyProfile(tx: Tx, userId: string): Promise<CompetencyProfile> {
  const p = (await competencyProfiles(tx, [userId])).get(userId);
  return p ?? computeCompetencyProfile(weekSpecs(), emptyEvidence());
}
