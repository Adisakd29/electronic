/**
 * Content access for server code. Content modules are authored in parallel;
 * a week whose content is still a stub has no steps.
 */
import { getWeek } from "@/content";
import { weekMeta } from "@/content/course";
import type { LabId, PracticeActivity, Week } from "@/content/types";

export const TOTAL_WEEKS = 18;

const cache = new Map<number, Week | null>();

/** Week content with missing top-level parts defaulted (content may be mid-authoring). */
export function weekContent(n: number): Week | null {
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_WEEKS) return null;
  if (cache.has(n)) return cache.get(n)!;
  let w: Week | null = null;
  try {
    const raw = getWeek(n) as Partial<Week> | undefined;
    if (raw && typeof raw === "object") w = normalise(n, raw);
  } catch {
    w = null;
  }
  cache.set(n, w);
  return w;
}

function normalise(n: number, raw: Partial<Week>): Week {
  const m = weekMeta[n - 1];
  const lab = raw.lab ?? { lab: m.lab ?? "ohms", title: "", objective: "", assumptions: [], instructions: [], tasks: [] };
  const quiz = raw.quiz ?? { questions: [], drawCount: 10, passPercent: 60 };
  return {
    week: n,
    title: raw.title ?? m.title,
    titleEn: raw.titleEn ?? m.titleEn,
    category: raw.category ?? m.category,
    unit: raw.unit ?? { no: m.unit, title: m.title },
    hours: raw.hours ?? { theory: 1, practice: 3 },
    competency: raw.competency ?? "",
    courseCompetencies: raw.courseCompetencies ?? [],
    objectives: raw.objectives ?? { knowledge: [], skill: [], attitude: [] },
    intro: raw.intro ?? { hook: "", scenario: "", whyItMatters: [] },
    steps: raw.steps ?? [],
    interactions: raw.interactions ?? [],
    practice: raw.practice ?? [],
    examples: raw.examples ?? [],
    lab: { ...lab, tasks: lab.tasks ?? [] },
    activities: raw.activities ?? [],
    quiz: { ...quiz, questions: quiz.questions ?? [], drawCount: quiz.drawCount ?? 10, passPercent: quiz.passPercent ?? 60 },
    challenge: raw.challenge ?? { title: "", md: "", interaction: "" },
    safety: raw.safety ?? [],
    summary: raw.summary ?? { keyPoints: [], mindmap: { center: "", branches: [] }, formulas: [], vocab: [] },
    resources: raw.resources ?? [],
    teacherNotes: raw.teacherNotes ?? [],
    sourceNotes: raw.sourceNotes ?? { lessons: [], corrections: [] },
  };
}

export function isStubWeek(w: Week | null): boolean {
  return !w || w.steps.length === 0;
}

export function submitActivities(w: Week | null): PracticeActivity[] {
  return (w?.activities ?? []).filter((a) => a.submit);
}

export function activityById(w: Week | null, id: string): PracticeActivity | undefined {
  return w?.activities.find((a) => a.id === id);
}

export function labByWeek(): Record<number, LabId | null> {
  const out: Record<number, LabId | null> = {};
  for (let n = 1; n <= TOTAL_WEEKS; n++) {
    const w = weekContent(n);
    out[n] = w && !isStubWeek(w) && w.lab?.lab ? w.lab.lab : weekMeta[n - 1]?.lab ?? null;
  }
  return out;
}

export function weekTitle(n: number): string {
  return weekContent(n)?.title ?? weekMeta[n - 1]?.title ?? `สัปดาห์ที่ ${n}`;
}

/** Max rubric score of an activity (Σ weight; levels 1–4 scale each criterion by level/4). */
export function rubricMax(a: PracticeActivity): number {
  return a.rubric.reduce((s, r) => s + r.weight, 0);
}

/** Score from rubric levels (1–4 per criterion): Σ weight × level / 4, rounded to 0.1. */
export function rubricScore(a: PracticeActivity, levels: number[]): number {
  const s = a.rubric.reduce((sum, r, i) => sum + (r.weight * Math.max(1, Math.min(4, levels[i] ?? 1))) / 4, 0);
  return Math.round(s * 10) / 10;
}
