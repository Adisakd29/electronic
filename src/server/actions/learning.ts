"use server";
import type { StageKey } from "@/content/course";
import { db } from "@/lib/db";
import type { ActionResult, LabNote, QuizResult, QuizStart, StageCompletion } from "../contracts";
import * as core from "../core/learning";
import { getActor, unexpected } from "../session";

/**
 * Learner Server Actions. Each action re-reads the session and only affects the
 * signed-in user. Teachers/admins may preview: actions succeed without writing.
 */

async function run<T>(where: string, fn: (actor: core.Actor) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const a = await getActor();
    if (!a.ok) return a;
    return await fn(a.actor);
  } catch (e) {
    return unexpected(e, where);
  }
}

export async function markStepComplete(week: number, stepId: string): Promise<ActionResult<{ stepsDone: string[] }>> {
  return run("markStepComplete", (actor) => db.transaction((tx) => core.markStepComplete(tx, actor, week, stepId)));
}

export async function savePosition(week: number, stage: StageKey, stepIndex: number): Promise<ActionResult<null>> {
  return run("savePosition", (actor) => core.savePosition(db, actor, week, stage, stepIndex));
}

/** answerKey: option id(s) joined by "," or the numeric value entered — stored for item analysis when wrong. */
export async function recordInteraction(
  week: number,
  interactionId: string,
  correct: boolean,
  answerKey?: string,
): Promise<ActionResult<{ xpAwarded: number }>> {
  return run("recordInteraction", (actor) => db.transaction((tx) => core.recordInteraction(tx, actor, week, interactionId, correct, answerKey)));
}

export async function completeStage(week: number, stage: StageKey): Promise<ActionResult<StageCompletion>> {
  return run("completeStage", (actor) => db.transaction((tx) => core.completeStage(tx, actor, week, stage)));
}

/** value: the numeric answer / option id the learner submitted (numeric & mcq tasks are re-checked on the server). */
export async function recordLabTask(
  week: number,
  taskId: string,
  correct: boolean,
  value?: string,
): Promise<ActionResult<{ correct: boolean; xpAwarded: number }>> {
  return run("recordLabTask", (actor) => db.transaction((tx) => core.recordLabTask(tx, actor, week, taskId, correct, value)));
}

export async function saveLabReflection(week: number, answers: string[]): Promise<ActionResult<null>> {
  return run("saveLabReflection", (actor) => core.saveLabReflection(db, actor, week, answers));
}

/** Replaces the lab notebook rows (readout snapshots) for the week. */
export async function saveLabNotes(week: number, notes: LabNote[]): Promise<ActionResult<null>> {
  return run("saveLabNotes", (actor) => core.saveLabNotes(db, actor, week, notes));
}

/** Start (or resume an open) quiz attempt. kind "challenge" = weekly challenge set. */
export async function startQuiz(week: number, kind: "pre" | "post" | "challenge"): Promise<ActionResult<QuizStart>> {
  // Randomness happens here, at request time.
  return run("startQuiz", (actor) => db.transaction((tx) => core.startQuiz(tx, actor, week, kind, Math.random)));
}

/** Autosave answers during an attempt. */
export async function saveQuizAnswers(attemptId: string, answers: Record<string, string>): Promise<ActionResult<null>> {
  return run("saveQuizAnswers", (actor) => core.saveQuizAnswers(db, actor, attemptId, answers));
}

export async function submitQuiz(attemptId: string, answers: Record<string, string>): Promise<ActionResult<QuizResult>> {
  return run("submitQuiz", (actor) => db.transaction((tx) => core.submitQuiz(tx, actor, attemptId, answers)));
}

/** FormData fields: week, activityId, file (≤ 10 MB; pdf/jpg/png/webp/heic/docx), note. */
export async function submitAssignment(formData: FormData): Promise<ActionResult<{ status: "submitted" }>> {
  return run("submitAssignment", (actor) => db.transaction((tx) => core.submitAssignment(tx, actor, formData)));
}

/** Marks the weekly challenge done (challenge interaction answered correctly). */
export async function completeChallenge(week: number): Promise<ActionResult<{ xpAwarded: number; newAchievements: string[] }>> {
  return run("completeChallenge", (actor) => db.transaction((tx) => core.completeChallenge(tx, actor, week)));
}

/** The learner chooses the trade (แผนก) whose examples lessons show; null = follow the class / general. */
export async function setMyTrack(track: string | null): Promise<ActionResult<import("../core/track").TrackInfo>> {
  return run("setMyTrack", async (actor) => {
    const { setOwnTrack } = await import("../core/track");
    return setOwnTrack(db, actor.id, track);
  });
}
