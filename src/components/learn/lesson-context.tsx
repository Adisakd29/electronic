"use client";
import { createContext, use, type ReactNode } from "react";

export interface LessonEnv {
  week: number;
  isStaff: boolean;
  /** "/learn/7" in the app, "/dev/lesson" in the harness. Stage hrefs are `${basePath}/${stage}`. */
  basePath: string;
  /** Interactions answered correctly at least once. */
  correct: ReadonlySet<string>;
  /** Record an interaction result (server + local progress). */
  onInteraction: (interactionId: string, correct: boolean, answerKey?: string) => void;
}

const EnvCtx = createContext<LessonEnv>({
  week: 0,
  isStaff: false,
  basePath: "",
  correct: new Set(),
  onInteraction: () => {},
});

export function LessonEnvProvider({ value, children }: { value: LessonEnv; children: ReactNode }) {
  return <EnvCtx value={value}>{children}</EnvCtx>;
}

export function useLessonEnv(): LessonEnv {
  return use(EnvCtx);
}

const NumbersCtx = createContext<Record<string, number>>({});

export function FigureNumbersProvider({ value, children }: { value: Record<string, number>; children: ReactNode }) {
  return <NumbersCtx value={value}>{children}</NumbersCtx>;
}

export function useFigureNumber(key: string): number | undefined {
  return use(NumbersCtx)[key];
}
