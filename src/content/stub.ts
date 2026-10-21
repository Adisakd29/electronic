// TEMPORARY: used only until a week's real content file replaces its stub.
// Delete this file once all 18 weeks are authored (validator fails on stubs).
import type { Week } from "./types";
import { weekMeta } from "./course";

export function stubWeek(n: number): Week {
  const m = weekMeta[n - 1];
  return {
    week: n, title: m.title, titleEn: m.titleEn, category: m.category,
    unit: { no: m.unit, title: m.title }, hours: { theory: 1, practice: 3 },
    competency: "", courseCompetencies: [],
    objectives: { knowledge: [], skill: [], attitude: [] },
    intro: { hook: "", scenario: "", whyItMatters: [] },
    steps: [], interactions: [], practice: [], examples: [],
    lab: { lab: m.lab ?? "ohms", title: "", objective: "", assumptions: [], instructions: [], tasks: [] },
    activities: [], quiz: { questions: [], drawCount: 10, passPercent: 60 },
    challenge: { title: "", md: "", interaction: "" }, safety: [],
    summary: { keyPoints: [], mindmap: { center: "", branches: [] }, formulas: [], vocab: [] },
    resources: [], teacherNotes: [], sourceNotes: { lessons: [], corrections: [] },
  };
}
