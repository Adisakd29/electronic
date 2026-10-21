/**
 * 4-domain competency view (สมรรถนะ 4 ด้าน) — pure, unit-tested.
 *
 * The course keeps its OFFICIAL model: course competencies C1–C4 (src/content/course.ts,
 * Week.courseCompetencies) and the final assessment (competency 0), both recorded by
 * teachers at /teacher/competency. This module adds a second, COMPUTED view that groups
 * learner evidence into four domains. Simulation evidence (interactions, virtual lab,
 * quizzes) is always kept separate from teacher-recorded real-practice results.
 *
 * Domain mapping (simulation evidence — "จากกิจกรรมและห้องทดลองเสมือน")
 *   D1 ความรู้และความเข้าใจ
 *      · best post-quiz % of each week (weighted by the quiz draw count, i.e. one item
 *        per question drawn)
 *      · mcq / predict / match / order / classify interactions: 1 if first try correct, else 0
 *   D2 ทักษะการคำนวณและวิเคราะห์
 *      · fill interactions: 1 if answered correctly (eventually), else 0
 *      · numeric lab tasks: 1 if solved, else 0
 *      · numeric quiz questions (from post-quiz responses): 1 per correct response, 0 per wrong
 *   D3 ทักษะการทดลองและแก้ปัญหา
 *      · state lab tasks (checked inside the lab module): 1 if done, else 0
 *      · hotspot / findFault / scenario interactions: 1 if correct, else 0
 *      · weekly challenge: 1 if completed, 0 if the challenge interaction was tried but not completed
 *   D4 ความปลอดภัยและกระบวนการปฏิบัติงาน
 *      · scenario interactions in safety weeks (category "safety" or "protection")
 *      · any interaction whose objective is an attitude objective (id ends with -A<n>) or whose
 *        prompt mentions "ปลอดภัย" / "อันตราย"
 *      each 1 if correct, else 0
 *
 * Practical evidence (teacher-recorded — "ผลปฏิบัติจริงที่ครูบันทึก"), shown separately:
 *   · rubric criteria containing "ปลอดภัย" of graded worksheets: level/4 each → rubricPercent
 *   · course competencies C1–C4 and the final assessment (levels 1–4, passed) as recorded
 *
 * Only ATTEMPTED items count as evidence; `evidence` is the number of items (weight) behind
 * a percentage, so a high % with little evidence is visible as such. Items may feed more than
 * one domain (e.g. a safety scenario feeds D3 and D4). Threshold: < 60 % = "ยังไม่ผ่านเกณฑ์".
 */
import type { Interaction, LabTask, Objective, PracticeActivity, QuizQuestion, Week } from "@/content/types";

export type DomainKey = "d1" | "d2" | "d3" | "d4";

export const DOMAIN_KEYS: DomainKey[] = ["d1", "d2", "d3", "d4"];

export const DOMAINS: { key: DomainKey; no: 1 | 2 | 3 | 4; title: string; short: string; sources: string }[] = [
  { key: "d1", no: 1, title: "ความรู้และความเข้าใจ", short: "ความรู้", sources: "แบบทดสอบหลังเรียน และกิจกรรมเลือกตอบ/ทำนาย/จับคู่/เรียงลำดับ/จำแนก (ตอบถูกครั้งแรก)" },
  { key: "d2", no: 2, title: "ทักษะการคำนวณและวิเคราะห์", short: "คำนวณ", sources: "โจทย์เติมตัวเลข ภารกิจห้องทดลองแบบตัวเลข และข้อสอบคำนวณ" },
  { key: "d3", no: 3, title: "ทักษะการทดลองและแก้ปัญหา", short: "ทดลอง", sources: "ภารกิจปฏิบัติในห้องทดลองเสมือน กิจกรรมชี้จุด/หาจุดบกพร่อง/สถานการณ์ และภารกิจท้าทาย" },
  { key: "d4", no: 4, title: "ความปลอดภัยและกระบวนการปฏิบัติงาน", short: "ความปลอดภัย", sources: "สถานการณ์ความปลอดภัย กิจกรรมด้านคุณลักษณะ และกิจกรรมที่กล่าวถึงความปลอดภัย/อันตราย" },
];

export const PASS_PERCENT = 60;
export const BELOW_LABEL = "ยังไม่ผ่านเกณฑ์";

export function belowThreshold(percent: number | null): boolean {
  return percent != null && percent < PASS_PERCENT;
}

// ---------------------------------------------------------------------------
// Content side: what evidence a week can produce
// ---------------------------------------------------------------------------

const D1_KINDS = new Set<Interaction["kind"]>(["mcq", "predict", "match", "order", "classify"]);
const D3_KINDS = new Set<Interaction["kind"]>(["hotspot", "findFault", "scenario"]);
const SAFETY_CATEGORIES = new Set<string>(["safety", "protection"]);
const SAFETY_WORDS = /ปลอดภัย|อันตราย/;
const ATTITUDE_OBJECTIVE = /-A\d+$/;
const SAFETY_CRITERION = /ปลอดภัย/;

export interface InteractionSpec {
  id: string;
  kind: Interaction["kind"];
  objective: string | null;
  /** Domains this interaction feeds. */
  domains: DomainKey[];
}

export interface WeekEvidenceSpec {
  week: number;
  category: string;
  courseCompetencies: number[];
  quiz: { drawCount: number; passPercent: number; numericIds: string[] };
  interactions: InteractionSpec[];
  labTasks: { id: string; kind: LabTask["kind"] }[];
  challengeInteraction: string | null;
  /** Graded worksheets: index of rubric criteria about safety. */
  activities: { id: string; safetyCriteria: number[] }[];
  objectives: Objective[];
}

export function interactionDomains(it: Pick<Interaction, "kind" | "objective" | "prompt">, category: string): DomainKey[] {
  const out: DomainKey[] = [];
  if (D1_KINDS.has(it.kind)) out.push("d1");
  if (it.kind === "fill") out.push("d2");
  if (D3_KINDS.has(it.kind)) out.push("d3");
  const safety =
    (it.kind === "scenario" && SAFETY_CATEGORIES.has(category)) ||
    (it.objective != null && ATTITUDE_OBJECTIVE.test(it.objective)) ||
    SAFETY_WORDS.test(it.prompt ?? "");
  if (safety) out.push("d4");
  return out;
}

type WeekLike = Pick<Week, "week" | "category" | "courseCompetencies" | "objectives"> & {
  quiz: { drawCount: number; passPercent: number; questions: Pick<QuizQuestion, "id" | "type">[] };
  interactions: Pick<Interaction, "id" | "kind" | "objective" | "prompt">[];
  lab: { tasks: Pick<LabTask, "id" | "kind">[] };
  challenge: { interaction: string };
  activities: Pick<PracticeActivity, "id" | "rubric" | "submit">[];
};

/** Derive the evidence spec from week content (serialisable; no answers included). */
export function weekEvidenceSpec(w: WeekLike): WeekEvidenceSpec {
  return {
    week: w.week,
    category: w.category,
    courseCompetencies: [...(w.courseCompetencies ?? [])],
    quiz: {
      drawCount: w.quiz.drawCount,
      passPercent: w.quiz.passPercent,
      numericIds: w.quiz.questions.filter((q) => q.type === "numeric").map((q) => q.id),
    },
    interactions: w.interactions.map((it) => ({ id: it.id, kind: it.kind, objective: it.objective ?? null, domains: interactionDomains(it, w.category) })),
    labTasks: w.lab.tasks.map((t) => ({ id: t.id, kind: t.kind })),
    challengeInteraction: w.challenge?.interaction || null,
    activities: w.activities
      .filter((a) => a.submit)
      .map((a) => ({ id: a.id, safetyCriteria: a.rubric.map((r, i) => (SAFETY_CRITERION.test(r.criterion) ? i : -1)).filter((i) => i >= 0) })),
    objectives: [...w.objectives.knowledge, ...w.objectives.skill, ...w.objectives.attitude].map((o) => ({ id: o.id, text: o.text })),
  };
}

/** Which of the 4 domains a week's evidence can feed (for the criteria box). */
export function domainsFedBy(spec: WeekEvidenceSpec): DomainKey[] {
  const set = new Set<DomainKey>();
  if (spec.quiz.drawCount > 0) set.add("d1");
  if (spec.quiz.numericIds.length) set.add("d2");
  for (const it of spec.interactions) for (const d of it.domains) set.add(d);
  for (const t of spec.labTasks) {
    if (t.kind === "numeric") set.add("d2");
    if (t.kind === "state") set.add("d3");
  }
  if (spec.challengeInteraction) set.add("d3");
  return DOMAIN_KEYS.filter((k) => set.has(k));
}

// ---------------------------------------------------------------------------
// Learner side
// ---------------------------------------------------------------------------

export interface StudentEvidence {
  interactions: { week: number; interactionId: string; attempts: number; wrongAttempts: number; correct: boolean; firstTryCorrect: boolean | null }[];
  labTasks: { week: number; taskId: string; correct: boolean; attempts: number }[];
  /** Best submitted post-quiz percent per week. */
  quizBest: Record<number, number | null>;
  /** Responses of submitted post-quiz attempts. */
  questionResponses: { week: number; questionId: string; correct: boolean }[];
  /** Weeks whose challenge was completed. */
  challengeWeeks: number[];
  /** Graded worksheets with rubric levels (1–4 per criterion). */
  submissions: { week: number; activityId: string; rubricScores: number[] | null; status: "submitted" | "returned" | "graded" }[];
  competencies: { competency: number; level: number; passed: boolean; score: number | null; maxScore: number | null }[];
}

export interface DomainResult {
  /** 0–100 rounded to 0.1, or null when there is no evidence. */
  percent: number | null;
  /** Weight of the evidence behind `percent` (items / questions). */
  evidence: number;
}

export type DomainResults = Record<DomainKey, DomainResult>;

export interface ObjectiveGap {
  week: number;
  objectiveId: string;
  text: string;
  interactionIds: string[];
}

export interface CompetencyProfile {
  simulation: DomainResults;
  perWeek: ({ week: number } & DomainResults)[];
  practical: {
    rubricPercent: number | null;
    rubricEvidence: number;
    competencies: { competency: 1 | 2 | 3 | 4; level: number | null; passed: boolean | null }[];
    final: { level: number; passed: boolean; score: number | null; maxScore: number | null } | null;
  };
  gaps: { domains: DomainKey[]; objectives: ObjectiveGap[] };
}

interface Acc {
  sum: number;
  weight: number;
}

const emptyAcc = (): Record<DomainKey, Acc> => ({ d1: { sum: 0, weight: 0 }, d2: { sum: 0, weight: 0 }, d3: { sum: 0, weight: 0 }, d4: { sum: 0, weight: 0 } });

function add(acc: Record<DomainKey, Acc>, d: DomainKey, score: number, weight = 1) {
  acc[d].sum += score * weight;
  acc[d].weight += weight;
}

export function toResult(a: Acc): DomainResult {
  return { percent: a.weight > 0 ? Math.round((a.sum / a.weight) * 1000) / 10 : null, evidence: Math.round(a.weight * 100) / 100 };
}

function weekAcc(spec: WeekEvidenceSpec, ev: StudentEvidence): Record<DomainKey, Acc> {
  const acc = emptyAcc();
  const w = spec.week;
  const quiz = ev.quizBest[w];
  if (quiz != null && spec.quiz.drawCount > 0) add(acc, "d1", Math.max(0, Math.min(100, quiz)) / 100, spec.quiz.drawCount);

  const byId = new Map(spec.interactions.map((i) => [i.id, i]));
  for (const r of ev.interactions) {
    if (r.week !== w || r.attempts <= 0) continue;
    const it = byId.get(r.interactionId);
    if (!it) continue;
    for (const d of it.domains) {
      if (d === "d1") add(acc, "d1", r.firstTryCorrect ? 1 : 0);
      else add(acc, d, r.correct ? 1 : 0);
    }
  }

  const tasks = new Map(spec.labTasks.map((t) => [t.id, t]));
  for (const r of ev.labTasks) {
    if (r.week !== w) continue;
    const t = tasks.get(r.taskId);
    if (!t) continue;
    if (t.kind === "numeric") add(acc, "d2", r.correct ? 1 : 0);
    if (t.kind === "state") add(acc, "d3", r.correct ? 1 : 0);
  }

  const numeric = new Set(spec.quiz.numericIds);
  for (const q of ev.questionResponses) if (q.week === w && numeric.has(q.questionId)) add(acc, "d2", q.correct ? 1 : 0);

  if (spec.challengeInteraction) {
    if (ev.challengeWeeks.includes(w)) add(acc, "d3", 1);
    else if (ev.interactions.some((r) => r.week === w && r.interactionId === spec.challengeInteraction && r.attempts > 0)) add(acc, "d3", 0);
  }
  return acc;
}

function objectiveGaps(spec: WeekEvidenceSpec, ev: StudentEvidence): ObjectiveGap[] {
  const byId = new Map(spec.interactions.map((i) => [i.id, i]));
  const objText = new Map(spec.objectives.map((o) => [o.id, o.text]));
  const perObjective = new Map<string, string[]>();
  for (const r of ev.interactions) {
    if (r.week !== spec.week || r.correct || r.wrongAttempts < 2) continue;
    const it = byId.get(r.interactionId);
    if (!it?.objective) continue;
    const list = perObjective.get(it.objective) ?? [];
    list.push(r.interactionId);
    perObjective.set(it.objective, list);
  }
  return [...perObjective.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([objectiveId, interactionIds]) => ({ week: spec.week, objectiveId, text: objText.get(objectiveId) ?? objectiveId, interactionIds: interactionIds.sort() }));
}

export function computeCompetencyProfile(specs: WeekEvidenceSpec[], ev: StudentEvidence): CompetencyProfile {
  const total = emptyAcc();
  const perWeek: CompetencyProfile["perWeek"] = [];
  const objectives: ObjectiveGap[] = [];
  for (const spec of [...specs].sort((a, b) => a.week - b.week)) {
    const acc = weekAcc(spec, ev);
    for (const k of DOMAIN_KEYS) {
      total[k].sum += acc[k].sum;
      total[k].weight += acc[k].weight;
    }
    perWeek.push({ week: spec.week, d1: toResult(acc.d1), d2: toResult(acc.d2), d3: toResult(acc.d3), d4: toResult(acc.d4) });
    objectives.push(...objectiveGaps(spec, ev));
  }
  const simulation: DomainResults = { d1: toResult(total.d1), d2: toResult(total.d2), d3: toResult(total.d3), d4: toResult(total.d4) };

  // Practical: safety rubric criteria of graded worksheets.
  const safetyIdx = new Map(specs.flatMap((s) => s.activities.map((a) => [a.id, a.safetyCriteria] as const)));
  const rub: Acc = { sum: 0, weight: 0 };
  for (const s of ev.submissions) {
    if (s.status !== "graded" || !s.rubricScores) continue;
    for (const i of safetyIdx.get(s.activityId) ?? []) {
      const lvl = s.rubricScores[i];
      if (lvl == null) continue;
      rub.sum += Math.max(1, Math.min(4, lvl)) / 4;
      rub.weight += 1;
    }
  }
  const rubric = toResult(rub);
  const competencies = ([1, 2, 3, 4] as const).map((c) => {
    const row = ev.competencies.find((x) => x.competency === c);
    return { competency: c, level: row?.level ?? null, passed: row?.passed ?? null };
  });
  const fin = ev.competencies.find((x) => x.competency === 0);

  return {
    simulation,
    perWeek,
    practical: {
      rubricPercent: rubric.percent,
      rubricEvidence: rubric.evidence,
      competencies,
      final: fin ? { level: fin.level, passed: fin.passed, score: fin.score, maxScore: fin.maxScore } : null,
    },
    gaps: { domains: DOMAIN_KEYS.filter((k) => belowThreshold(simulation[k].percent)), objectives },
  };
}

/** Class-level roll-up: mean of student percentages (students with evidence) and how many are below the threshold. */
export function classDomainSummary(profiles: CompetencyProfile[]): Record<DomainKey, { mean: number | null; below: number; withEvidence: number }> {
  const out = {} as Record<DomainKey, { mean: number | null; below: number; withEvidence: number }>;
  for (const k of DOMAIN_KEYS) {
    const vals = profiles.map((p) => p.simulation[k].percent).filter((v): v is number => v != null);
    out[k] = {
      mean: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null,
      below: vals.filter((v) => v < PASS_PERCENT).length,
      withEvidence: vals.length,
    };
  }
  return out;
}

export const emptyEvidence = (): StudentEvidence => ({
  interactions: [],
  labTasks: [],
  quizBest: {},
  questionResponses: [],
  challengeWeeks: [],
  submissions: [],
  competencies: [],
});
