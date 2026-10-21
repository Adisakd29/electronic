/**
 * Order of the six stages inside a week (pure — no I/O; tests in tests/unit/stage-order.test.ts).
 *
 *   intro → learn → practice → lab → quiz → complete
 *
 * When `requireStageOrder` is on (the default of every unlock rule), a stage is
 * OPEN only when every stage before it is done. A finished week is always fully
 * open for review. Teachers/admins are never gated (they preview everything);
 * the page, the sidebar, the stepper AND every learner Server Action use this
 * same function, so the order holds on the server, not only in the UI.
 *
 * Guests skip the quiz (it needs an account), so for them `complete` opens after `lab`.
 */
import type { StageKey } from "@/content/course";

export const STAGE_ORDER: readonly StageKey[] = ["intro", "learn", "practice", "lab", "quiz", "complete"];

export const STAGE_LABEL: Record<StageKey, string> = {
  intro: "บทนำ",
  learn: "เรียนรู้",
  practice: "ฝึกปฏิบัติเชิงโต้ตอบ",
  lab: "ห้องทดลองเสมือน",
  quiz: "แบบทดสอบ",
  complete: "สรุปและจบบท",
};

export interface StageOrderOptions {
  /** false = every stage open (rule switched off by the teacher, or policy disabled). */
  required: boolean;
  /** Guest mode: the quiz is not part of the path. */
  skipQuiz?: boolean;
}

/** Stages the learner may open now. */
export function openStages(stagesDone: readonly StageKey[], opts: StageOrderOptions): StageKey[] {
  const order = opts.skipQuiz ? STAGE_ORDER.filter((s) => s !== "quiz") : STAGE_ORDER;
  if (!opts.required || stagesDone.includes("complete")) return [...order];
  const done = new Set(stagesDone);
  const open: StageKey[] = [];
  for (const s of order) {
    open.push(s);
    if (!done.has(s)) break; // everything after the first unfinished stage stays closed
  }
  return open;
}

export interface StageGate {
  open: boolean;
  /** Stages still to finish before `stage` opens, in order. */
  missing: StageKey[];
  /** Thai sentence for the learner (null when open). */
  reason: string | null;
}

export function stageGate(stage: StageKey, stagesDone: readonly StageKey[], opts: StageOrderOptions): StageGate {
  const open = openStages(stagesDone, opts);
  if (open.includes(stage)) return { open: true, missing: [], reason: null };
  const order = opts.skipQuiz ? STAGE_ORDER.filter((s) => s !== "quiz") : STAGE_ORDER;
  const i = order.indexOf(stage);
  const done = new Set(stagesDone);
  const missing = order.slice(0, i).filter((s) => !done.has(s));
  return {
    open: false,
    missing,
    reason: `ขั้น${STAGE_LABEL[stage]}จะเปิดเมื่อทำขั้นก่อนหน้าเสร็จ: ${missing.map((m) => STAGE_LABEL[m]).join(" → ")}`,
  };
}

/** The next stage the learner should work on (first stage not done, in order). */
export function nextStage(stagesDone: readonly StageKey[], skipQuiz = false): StageKey {
  const order = skipQuiz ? STAGE_ORDER.filter((s) => s !== "quiz") : STAGE_ORDER;
  return order.find((s) => !stagesDone.includes(s)) ?? "complete";
}
