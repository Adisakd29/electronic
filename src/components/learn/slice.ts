/**
 * Builds the serialisable subset of a Week that one stage needs on the client.
 * Keeps the quiz bank (answers!) and teacher notes off the client and keeps
 * the RSC payload small. Pure — used by the server page and the dev harness.
 */
import type { StageKey } from "@/content/course";
import { domainsFedBy, weekEvidenceSpec, type DomainKey } from "@/lib/competency-domains";
import type {
  Block,
  Category,
  Interaction,
  Objective,
  PracticeActivity,
  SafetyLevel,
  Resource,
  Step,
  VocabEntry,
  Week,
  WeekLab,
  WorkedExample,
} from "@/content/types";

export interface WeekSlice {
  week: number;
  title: string;
  titleEn: string;
  category: Category;
  unit: Week["unit"];
  hours: Week["hours"];
  competency: string;
  stepMeta: { id: string; title: string; minutes: number }[];
  practiceIds: string[];
  labTaskIds: string[];
  quizMeta: { drawCount: number; passPercent: number; bankSize: number };
  /** What the learner must do this week and which competencies the evidence feeds (criteria box). */
  criteria: WeekCriteria;
  /** Interactions referenced by this stage (inline, practice, warm-up, tryIt, challenge). */
  interactions: Record<string, Interaction>;
  examples: Record<string, WorkedExample>;
  objectives?: { knowledge: Objective[]; skill: Objective[]; attitude: Objective[] };
  intro?: Week["intro"];
  steps?: Step[];
  exampleOrder?: string[];
  lab?: WeekLab;
  activities?: PracticeActivity[];
  challenge?: Week["challenge"];
  safety?: string[];
  summary?: Week["summary"];
  resources?: Resource[];
  vocab?: VocabEntry[];
}

export interface WeekCriteria {
  stepCount: number;
  practiceCount: number;
  labTasks: { total: number; numeric: number; mcq: number; state: number };
  quiz: { drawCount: number; passPercent: number };
  hasChallenge: boolean;
  activities: { id: string; title: string; type: PracticeActivity["type"]; safety: SafetyLevel; submit: boolean; rubric: { criterion: string; weight: number }[] }[];
  /** Official course competencies (C1–C4) this week supports. */
  courseCompetencies: number[];
  /** Which of the 4 computed domains the week's evidence feeds. */
  domains: DomainKey[];
}

export function weekCriteria(w: Week): WeekCriteria {
  const tasks = w.lab.tasks;
  return {
    stepCount: w.steps.length,
    practiceCount: w.practice.length,
    labTasks: {
      total: tasks.length,
      numeric: tasks.filter((t) => t.kind === "numeric").length,
      mcq: tasks.filter((t) => t.kind === "mcq").length,
      state: tasks.filter((t) => t.kind === "state").length,
    },
    quiz: { drawCount: w.quiz.drawCount, passPercent: w.quiz.passPercent },
    hasChallenge: Boolean(w.challenge?.interaction),
    activities: w.activities.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      safety: a.safety,
      submit: a.submit,
      rubric: a.rubric.map((r) => ({ criterion: r.criterion, weight: r.weight })),
    })),
    courseCompetencies: [...(w.courseCompetencies ?? [])],
    domains: domainsFedBy(weekEvidenceSpec(w)),
  };
}

function collectRefs(blocks: Block[], ints: Set<string>, exs: Set<string>) {
  for (const b of blocks) {
    if (b.type === "interaction") ints.add(b.ref);
    if (b.type === "example") exs.add(b.ref);
  }
}

export function buildSlice(w: Week, stage: StageKey): WeekSlice {
  const ints = new Set<string>();
  const exs = new Set<string>();
  const base: WeekSlice = {
    week: w.week,
    title: w.title,
    titleEn: w.titleEn,
    category: w.category,
    unit: w.unit,
    hours: w.hours,
    competency: w.competency,
    stepMeta: w.steps.map((s) => ({ id: s.id, title: s.title, minutes: s.minutes })),
    practiceIds: w.practice,
    labTaskIds: w.lab.tasks.map((t) => t.id),
    quizMeta: { drawCount: w.quiz.drawCount, passPercent: w.quiz.passPercent, bankSize: w.quiz.questions.length },
    criteria: weekCriteria(w),
    interactions: {},
    examples: {},
  };

  switch (stage) {
    case "intro":
      base.objectives = w.objectives;
      base.intro = w.intro;
      for (const id of w.intro.warmup ?? []) ints.add(id);
      break;
    case "learn":
      base.steps = w.steps;
      for (const s of w.steps) collectRefs(s.blocks, ints, exs);
      break;
    case "practice":
      for (const id of w.practice) ints.add(id);
      for (const e of w.examples) exs.add(e.id);
      base.exampleOrder = w.examples.map((e) => e.id);
      break;
    case "lab":
      base.lab = w.lab;
      base.activities = w.activities;
      break;
    case "quiz":
      break;
    case "complete":
      base.challenge = w.challenge;
      base.safety = w.safety;
      base.summary = w.summary;
      base.resources = w.resources;
      if (w.challenge.interaction) ints.add(w.challenge.interaction);
      break;
  }

  for (const e of w.examples) {
    if (exs.has(e.id)) {
      base.examples[e.id] = e;
      if (e.tryIt) ints.add(e.tryIt);
    }
  }
  for (const it of w.interactions) if (ints.has(it.id)) base.interactions[it.id] = it;
  return base;
}
