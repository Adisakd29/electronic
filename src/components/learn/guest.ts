"use client";
/**
 * Guest mode: learning without an account.
 *
 * Progress lives only in this browser (localStorage, one key). Nothing is sent
 * to the server, so teachers never see guest work, there is no XP, no unlock
 * rules (every week is open) and no quiz (the bank and its answers stay
 * server-side). Steps, practice interactions and lab tasks are graded on the
 * client exactly as for signed-in learners; this API only records the results.
 *
 * Every storage access is wrapped: in a private window or with storage
 * blocked, guest mode still works for the current page view, it just forgets.
 */
import type { StageKey } from "@/content/course";
import type { ActionResult, LabNote, QuizStart, StageCompletion, WeekProgress } from "@/server/contracts";
import { openStages, stageGate } from "@/lib/stage-order";
import type { LearnApi } from "./api";
import type { WeekSlice } from "./slice";

const KEY = "eelearn.guest.v1";

export const GUEST_QUIZ_MESSAGE = "แบบทดสอบเปิดให้เฉพาะนักเรียนที่เข้าสู่ระบบ เพื่อให้ครูเก็บคะแนนได้และไม่ให้คลังข้อสอบรั่วไหล";
const GUEST_UPLOAD_MESSAGE = "การส่งใบงานต้องเข้าสู่ระบบก่อน เพื่อให้ครูตรวจและให้คะแนนได้";

export interface GuestWeek {
  stagesDone: StageKey[];
  stepsDone: string[];
  interactionsCorrect: string[];
  labTasksDone: string[];
  labReflection: string[] | null;
  labNotes: LabNote[];
  challengeDone: boolean;
  position: { stage: StageKey; stepIndex: number } | null;
}

interface GuestStore {
  weeks: Record<string, GuestWeek>;
  last: { week: number; stage: StageKey; stepIndex: number } | null;
}

const emptyWeek = (): GuestWeek => ({
  stagesDone: [],
  stepsDone: [],
  interactionsCorrect: [],
  labTasksDone: [],
  labReflection: null,
  labNotes: [],
  challengeDone: false,
  position: null,
});

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function readStore(): GuestStore {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { weeks: {}, last: null };
    const p = JSON.parse(raw) as Partial<GuestStore>;
    const weeks: Record<string, GuestWeek> = {};
    for (const [k, w] of Object.entries(p.weeks ?? {})) {
      if (!/^\d{1,2}$/.test(k) || !w || typeof w !== "object") continue;
      weeks[k] = {
        stagesDone: arr(w.stagesDone) as StageKey[],
        stepsDone: arr(w.stepsDone),
        interactionsCorrect: arr(w.interactionsCorrect),
        labTasksDone: arr(w.labTasksDone),
        labReflection: Array.isArray(w.labReflection) ? arr(w.labReflection) : null,
        labNotes: Array.isArray(w.labNotes) ? (w.labNotes as LabNote[]).filter((n) => n && typeof n === "object" && Array.isArray(n.values)).slice(0, 60) : [],
        challengeDone: w.challengeDone === true,
        position: w.position && typeof w.position === "object" ? w.position : null,
      };
    }
    return { weeks, last: p.last && typeof p.last === "object" ? p.last : null };
  } catch {
    return { weeks: {}, last: null };
  }
}

function writeStore(s: GuestStore): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable (private window / blocked): keep working without saving */
  }
}

function update(week: number, fn: (w: GuestWeek) => GuestWeek, last?: GuestStore["last"]): GuestWeek {
  const s = readStore();
  const next = fn(s.weeks[String(week)] ?? emptyWeek());
  s.weeks[String(week)] = next;
  if (last !== undefined) s.last = last;
  writeStore(s);
  return next;
}

const add = <T,>(list: T[], v: T) => (list.includes(v) ? list : [...list, v]);

/** Where the guest stopped last (any week), for /learn. */
export function guestResume(): GuestStore["last"] {
  return readStore().last;
}

/** Last position inside one week, for /learn/[week]. */
export function guestWeekPosition(week: number): GuestWeek["position"] {
  return readStore().weeks[String(week)]?.position ?? null;
}

/** WeekProgress-shaped view of the stored guest progress for one week. */
export function guestProgress(slice: WeekSlice): WeekProgress {
  const w = readStore().weeks[String(slice.week)] ?? emptyWeek();
  return {
    week: slice.week,
    unlocked: true,
    lockReason: null,
    stagesDone: w.stagesDone,
    // Guests follow the same order; the quiz stage stays reachable so it can show the sign-in notice.
    stagesOpen: [...openStages(w.stagesDone, { required: true, skipQuiz: true }), "quiz"],
    stepsDone: w.stepsDone,
    interactionsCorrect: w.interactionsCorrect,
    labTasksDone: w.labTasksDone,
    labReflection: w.labReflection,
    labNotes: w.labNotes,
    position: w.position,
    pretest: null,
    quiz: { attempts: 0, bestPercent: null, passed: false, passPercent: slice.quizMeta.passPercent, openAttemptId: null },
    challengeDone: w.challengeDone,
    submissions: {},
  };
}

/** Stages a guest must finish before "complete" (the quiz needs an account). */
export const GUEST_REQUIRED: StageKey[] = ["intro", "learn", "practice", "lab"];

function missingFor(slice: WeekSlice, w: GuestWeek, stage: StageKey): string[] {
  switch (stage) {
    case "learn":
      return slice.stepMeta.filter((s) => !w.stepsDone.includes(s.id)).map((s) => `ขั้น “${s.title}”`);
    case "practice": {
      const n = slice.practiceIds.filter((id) => !w.interactionsCorrect.includes(id)).length;
      return n ? [`กิจกรรมฝึกปฏิบัติอีก ${n} ข้อ`] : [];
    }
    case "lab": {
      const n = slice.labTaskIds.filter((id) => !w.labTasksDone.includes(id)).length;
      return n ? [`ภารกิจห้องทดลองอีก ${n} ข้อ`] : [];
    }
    case "complete":
      return GUEST_REQUIRED.filter((k) => !w.stagesDone.includes(k)).map((k) => `ขั้น${stageName[k]}`);
    default:
      return [];
  }
}

const stageName: Record<StageKey, string> = {
  intro: "บทนำ",
  learn: "เรียนรู้",
  practice: "ฝึกปฏิบัติ",
  lab: "ห้องทดลองเสมือน",
  quiz: "แบบทดสอบ",
  complete: "สรุปและจบบท",
};

const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = <T,>(error: string): ActionResult<T> => ({ ok: false, error });

/** Learner API that records into this browser only. Same signatures as the server actions. */
export function createGuestApi(slice: WeekSlice): LearnApi {
  const week = slice.week;
  const known = (list: string[], id: string) => list.includes(id);
  const allInteractionIds = Object.keys(slice.interactions);
  /** Same order rule as the server: a write to a closed stage is refused. */
  const closed = (stage: StageKey): string | null => {
    const cur = readStore().weeks[String(week)] ?? emptyWeek();
    const g = stageGate(stage, cur.stagesDone, { required: true, skipQuiz: true });
    return g.open ? null : (g.reason ?? "ทำขั้นก่อนหน้าให้เสร็จก่อน");
  };

  return {
    async markStepComplete(w, stepId) {
      if (w !== week || !known(slice.stepMeta.map((s) => s.id), stepId)) return fail("ไม่พบขั้นเรียนนี้");
      const c = closed("learn");
      if (c) return fail(c);
      const g = update(week, (g) => ({ ...g, stepsDone: add(g.stepsDone, stepId) }));
      return ok({ stepsDone: g.stepsDone });
    },
    async savePosition(w, stage, stepIndex) {
      if (w !== week) return ok(null);
      const pos = { stage, stepIndex: Math.max(0, Math.trunc(stepIndex)) };
      update(week, (g) => ({ ...g, position: pos }), { week, ...pos });
      return ok(null);
    },
    async recordInteraction(w, id, correct) {
      if (w === week && slice.practiceIds.includes(id)) {
        const c = closed("practice");
        if (c) return fail(c);
      }
      if (w === week && correct && known(allInteractionIds, id)) update(week, (g) => ({ ...g, interactionsCorrect: add(g.interactionsCorrect, id) }));
      return ok({ xpAwarded: 0 });
    },
    async completeStage(w, stage) {
      if (w !== week) return fail("ไม่พบสัปดาห์นี้");
      if (stage === "quiz") return fail(GUEST_QUIZ_MESSAGE);
      const cur = readStore().weeks[String(week)] ?? emptyWeek();
      const gate = stageGate(stage, cur.stagesDone, { required: true, skipQuiz: true });
      if (!gate.open) return fail(gate.reason ?? "ทำขั้นก่อนหน้าให้เสร็จก่อน");
      const missing = missingFor(slice, cur, stage);
      if (missing.length) return fail(`ยังทำไม่ครบ: ${missing.join(", ")}`);
      const g = update(week, (g) => ({ ...g, stagesDone: add(g.stagesDone, stage) }));
      const res: StageCompletion = { stagesDone: g.stagesDone, xpAwarded: 0, newAchievements: [], weekCompleted: stage === "complete", nextWeekUnlocked: false };
      return ok(res);
    },
    async recordLabTask(w, taskId, correct) {
      if (w !== week || !known(slice.labTaskIds, taskId)) return fail("ไม่พบภารกิจนี้");
      const c = closed("lab");
      if (c) return fail(c);
      if (correct) update(week, (g) => ({ ...g, labTasksDone: add(g.labTasksDone, taskId) }));
      return ok({ correct, xpAwarded: 0 });
    },
    async saveLabReflection(w, answers) {
      if (w === week) update(week, (g) => ({ ...g, labReflection: answers.map((a) => String(a).slice(0, 4000)) }));
      return ok(null);
    },
    async saveLabNotes(w, notes) {
      if (w === week) update(week, (g) => ({ ...g, labNotes: notes.slice(0, 60) }));
      return ok(null);
    },
    async startQuiz(): Promise<ActionResult<QuizStart>> {
      return fail(GUEST_QUIZ_MESSAGE);
    },
    async saveQuizAnswers() {
      return fail(GUEST_QUIZ_MESSAGE);
    },
    async submitQuiz() {
      return fail(GUEST_QUIZ_MESSAGE);
    },
    async submitAssignment() {
      return fail(GUEST_UPLOAD_MESSAGE);
    },
    async completeChallenge(w) {
      if (w === week) {
        const c = closed("complete");
        if (c) return fail(c);
      }
      if (w === week) update(week, (g) => ({ ...g, challengeDone: true }));
      return ok({ xpAwarded: 0, newAchievements: [] });
    },
  };
}

/** Clears all guest progress in this browser. */
export function clearGuestProgress(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
