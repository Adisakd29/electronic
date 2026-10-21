"use client";
/**
 * The learner actions the player calls, behind a context so the dev harness
 * (/dev/lesson) can swap in an in-memory mock. Every call is wrapped so a
 * thrown error (network, server crash) becomes `{ ok:false, error }` with a
 * Thai message instead of an unhandled rejection.
 */
import { createContext, use, type ReactNode } from "react";
import * as actions from "@/server/actions/learning";
import type { ActionResult } from "@/server/contracts";

export type LearnApi = {
  markStepComplete: typeof actions.markStepComplete;
  savePosition: typeof actions.savePosition;
  recordInteraction: typeof actions.recordInteraction;
  completeStage: typeof actions.completeStage;
  recordLabTask: typeof actions.recordLabTask;
  saveLabReflection: typeof actions.saveLabReflection;
  saveLabNotes: typeof actions.saveLabNotes;
  startQuiz: typeof actions.startQuiz;
  saveQuizAnswers: typeof actions.saveQuizAnswers;
  submitQuiz: typeof actions.submitQuiz;
  submitAssignment: typeof actions.submitAssignment;
  completeChallenge: typeof actions.completeChallenge;
};

export const NETWORK_ERROR = "ติดต่อเซิร์ฟเวอร์ไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง";

function safe<A extends unknown[], T>(fn: (...a: A) => Promise<ActionResult<T>>): (...a: A) => Promise<ActionResult<T>> {
  return async (...a: A) => {
    try {
      const r = await fn(...a);
      return r ?? { ok: false, error: NETWORK_ERROR };
    } catch (e) {
      // redirects/notFound thrown by actions must propagate to the router
      if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string" && /^NEXT_/.test((e as { digest: string }).digest)) throw e;
      console.error(e);
      return { ok: false, error: NETWORK_ERROR };
    }
  };
}

export function wrapApi(api: LearnApi): LearnApi {
  return {
    markStepComplete: safe(api.markStepComplete),
    savePosition: safe(api.savePosition),
    recordInteraction: safe(api.recordInteraction),
    completeStage: safe(api.completeStage),
    recordLabTask: safe(api.recordLabTask),
    saveLabReflection: safe(api.saveLabReflection),
    saveLabNotes: safe(api.saveLabNotes),
    startQuiz: safe(api.startQuiz),
    saveQuizAnswers: safe(api.saveQuizAnswers),
    submitQuiz: safe(api.submitQuiz),
    submitAssignment: safe(api.submitAssignment),
    completeChallenge: safe(api.completeChallenge),
  };
}

const realApi: LearnApi = wrapApi({
  markStepComplete: actions.markStepComplete,
  savePosition: actions.savePosition,
  recordInteraction: actions.recordInteraction,
  completeStage: actions.completeStage,
  recordLabTask: actions.recordLabTask,
  saveLabReflection: actions.saveLabReflection,
  saveLabNotes: actions.saveLabNotes,
  startQuiz: actions.startQuiz,
  saveQuizAnswers: actions.saveQuizAnswers,
  submitQuiz: actions.submitQuiz,
  submitAssignment: actions.submitAssignment,
  completeChallenge: actions.completeChallenge,
});

const ApiContext = createContext<LearnApi>(realApi);

export function LearnApiProvider({ api, children }: { api: LearnApi; children: ReactNode }) {
  return <ApiContext value={api}>{children}</ApiContext>;
}

export function useLearnApi(): LearnApi {
  return use(ApiContext);
}
