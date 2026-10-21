"use client";
import { createContext, use } from "react";
import type { StageKey } from "@/content/course";
import type { ActionResult, StageCompletion, WeekProgress } from "@/server/contracts";
import type { WeekSlice } from "../slice";
import type { LearnApi } from "../api";

export interface NextWeekInfo {
  week: number;
  title: string;
  href: string;
}

export interface PlayerCtx {
  slice: WeekSlice;
  stage: StageKey;
  progress: WeekProgress;
  setProgress: (fn: (p: WeekProgress) => WeekProgress) => void;
  api: LearnApi;
  basePath: string;
  isStaff: boolean;
  /** Visitor without an account: no quiz, no uploads, progress in this browser. */
  isGuest: boolean;
  stageHref: (s: StageKey) => string;
  /** Calls completeStage, merges stagesDone, toasts rewards, refreshes the shell. */
  completeStage: (s: StageKey) => Promise<ActionResult<StageCompletion>>;
  nextWeek: NextWeekInfo | null;
  /** Worksheet URL for an activity. */
  worksheetHref: (activityId: string) => string;
}

export const PlayerContext = createContext<PlayerCtx | null>(null);

export function usePlayer(): PlayerCtx {
  const c = use(PlayerContext);
  if (!c) throw new Error("usePlayer outside LessonPlayer");
  return c;
}

export const union = <T,>(a: readonly T[], b: readonly T[]) => Array.from(new Set([...a, ...b]));
