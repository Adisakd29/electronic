/** Route helpers shared by the /learn pages (pure; server-safe). */
import { stages, weekMeta, type StageKey } from "@/content/course";
import type { SidebarData } from "@/server/contracts";

export const WEEK_NUMBERS = weekMeta.map((m) => m.week);
const STAGE_KEYS = stages.map((s) => s.key) as readonly StageKey[];

/** "3" → 3; anything that is not exactly an integer 1–18 → null. */
export function parseWeek(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= WEEK_NUMBERS.length ? n : null;
}

export function isStage(raw: string): raw is StageKey {
  return (STAGE_KEYS as readonly string[]).includes(raw);
}

export function stageLabel(stage: StageKey): string {
  return stages.find((s) => s.key === stage)?.label ?? stage;
}

/** URL of a stage; the learn stage carries the 1-based `?step=N`. */
export function stageHref(week: number, stage: StageKey, stepIndex = 0): string {
  return `/learn/${week}/${stage}${stage === "learn" ? `?step=${Math.max(0, Math.trunc(stepIndex)) + 1}` : ""}`;
}

export function resumeHref(d: SidebarData): string {
  const r = d.resume;
  return r ? stageHref(r.week, r.stage, r.stepIndex) : `/learn/${d.currentWeek}`;
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** First value of a search param, digits only (for ?step). */
export function stepParam(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{1,3}$/.test(s) ? s : null;
}
