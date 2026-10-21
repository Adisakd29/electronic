import { describe, expect, it } from "vitest";
import {
  belowThreshold,
  classDomainSummary,
  computeCompetencyProfile,
  domainsFedBy,
  emptyEvidence,
  interactionDomains,
  weekEvidenceSpec,
  type StudentEvidence,
  type WeekEvidenceSpec,
} from "@/lib/competency-domains";
import { buildSlice } from "@/components/learn/slice";
import { getWeek } from "@/content";

/** Hand-built week: 3 safety-ish interactions, 2 lab tasks, a 10-question quiz with one numeric item. */
const spec: WeekEvidenceSpec = {
  week: 1,
  category: "safety",
  courseCompetencies: [1],
  quiz: { drawCount: 10, passPercent: 60, numericIds: ["W01-Q05"] },
  interactions: [
    { id: "W01-I01", kind: "mcq", objective: "W01-K1", domains: ["d1"] },
    { id: "W01-I02", kind: "fill", objective: "W01-K2", domains: ["d2"] },
    { id: "W01-I03", kind: "scenario", objective: "W01-K3", domains: ["d3", "d4"] }, // safety week → d4
    { id: "W01-I04", kind: "order", objective: "W01-A1", domains: ["d1", "d4"] }, // attitude objective → d4
    { id: "W01-I05", kind: "hotspot", objective: "W01-K1", domains: ["d3"] },
  ],
  labTasks: [
    { id: "W01-L01", kind: "state" },
    { id: "W01-L02", kind: "numeric" },
  ],
  challengeInteraction: "W01-I05",
  activities: [{ id: "W01-A01", safetyCriteria: [0, 2] }],
  objectives: [
    { id: "W01-K1", text: "จำแนกอันตราย" },
    { id: "W01-K2", text: "คำนวณกระแส" },
    { id: "W01-K3", text: "ระบุหน้าที่ RCD" },
    { id: "W01-A1", text: "ปฏิบัติตามกฎ" },
  ],
};

const week2: WeekEvidenceSpec = {
  week: 2,
  category: "circuits",
  courseCompetencies: [2],
  quiz: { drawCount: 10, passPercent: 60, numericIds: [] },
  interactions: [{ id: "W02-I01", kind: "scenario", objective: "W02-K1", domains: ["d3"] }],
  labTasks: [],
  challengeInteraction: null,
  activities: [],
  objectives: [{ id: "W02-K1", text: "x" }],
};

describe("interactionDomains", () => {
  it("maps kinds and safety signals", () => {
    expect(interactionDomains({ kind: "mcq", prompt: "ข้อใด", objective: "W03-K1" }, "circuits")).toEqual(["d1"]);
    expect(interactionDomains({ kind: "fill", prompt: "คำนวณ", objective: undefined }, "circuits")).toEqual(["d2"]);
    expect(interactionDomains({ kind: "scenario", prompt: "x", objective: "W03-K1" }, "circuits")).toEqual(["d3"]);
    expect(interactionDomains({ kind: "scenario", prompt: "x", objective: "W06-K1" }, "protection")).toEqual(["d3", "d4"]);
    expect(interactionDomains({ kind: "mcq", prompt: "ข้อใดอันตราย", objective: "W07-K1" }, "passive")).toEqual(["d1", "d4"]);
    expect(interactionDomains({ kind: "classify", prompt: "x", objective: "W07-A2" }, "passive")).toEqual(["d1", "d4"]);
    expect(interactionDomains({ kind: "classify", prompt: "x", objective: "W07-S2" }, "passive")).toEqual(["d1"]);
  });
});

describe("computeCompetencyProfile", () => {
  it("returns nulls with no evidence", () => {
    const p = computeCompetencyProfile([spec], emptyEvidence());
    for (const k of ["d1", "d2", "d3", "d4"] as const) expect(p.simulation[k]).toEqual({ percent: null, evidence: 0 });
    expect(p.practical.rubricPercent).toBeNull();
    expect(p.practical.competencies.map((c) => c.level)).toEqual([null, null, null, null]);
    expect(p.practical.final).toBeNull();
    expect(p.gaps).toEqual({ domains: [], objectives: [] });
    expect(p.perWeek).toHaveLength(1);
  });

  it("computes each domain by hand", () => {
    const ev: StudentEvidence = {
      ...emptyEvidence(),
      quizBest: { 1: 80 },
      interactions: [
        { week: 1, interactionId: "W01-I01", attempts: 1, wrongAttempts: 0, correct: true, firstTryCorrect: true }, // d1: 1
        { week: 1, interactionId: "W01-I02", attempts: 3, wrongAttempts: 2, correct: true, firstTryCorrect: false }, // d2: 1 (eventually correct)
        { week: 1, interactionId: "W01-I03", attempts: 2, wrongAttempts: 2, correct: false, firstTryCorrect: false }, // d3: 0, d4: 0
        { week: 1, interactionId: "W01-I04", attempts: 2, wrongAttempts: 1, correct: true, firstTryCorrect: false }, // d1: 0 (not first try), d4: 1
        { week: 1, interactionId: "W01-I05", attempts: 1, wrongAttempts: 1, correct: false, firstTryCorrect: false }, // d3: 0, challenge tried → d3: 0
        { week: 1, interactionId: "W01-I99", attempts: 1, wrongAttempts: 0, correct: true, firstTryCorrect: true }, // unknown → ignored
      ],
      labTasks: [
        { week: 1, taskId: "W01-L01", correct: true, attempts: 2 }, // d3: 1
        { week: 1, taskId: "W01-L02", correct: false, attempts: 4 }, // d2: 0
      ],
      questionResponses: [
        { week: 1, questionId: "W01-Q05", correct: true }, // d2: 1
        { week: 1, questionId: "W01-Q05", correct: false }, // d2: 0 (second attempt)
        { week: 1, questionId: "W01-Q01", correct: false }, // not numeric → ignored
      ],
    };
    const p = computeCompetencyProfile([spec], ev);
    // d1: quiz 0.8 × 10 + I01 (1) + I04 (0) → 9 / 12 = 75 %
    expect(p.simulation.d1).toEqual({ percent: 75, evidence: 12 });
    // d2: I02 (1) + L02 (0) + Q05 (1, 0) → 2 / 4 = 50 %
    expect(p.simulation.d2).toEqual({ percent: 50, evidence: 4 });
    // d3: I03 (0) + I05 (0) + L01 (1) + challenge tried-not-done (0) → 1 / 4 = 25 %
    expect(p.simulation.d3).toEqual({ percent: 25, evidence: 4 });
    // d4: I03 (0) + I04 (1) → 50 %
    expect(p.simulation.d4).toEqual({ percent: 50, evidence: 2 });
    expect(p.gaps.domains).toEqual(["d2", "d3", "d4"]);
    // I03 wrong twice, never correct → objective W01-K3 flagged; I05 only one wrong → not flagged; I02 correct → not flagged
    expect(p.gaps.objectives).toEqual([{ week: 1, objectiveId: "W01-K3", text: "ระบุหน้าที่ RCD", interactionIds: ["W01-I03"] }]);
    expect(p.perWeek[0].d1.percent).toBe(75);
  });

  it("counts a completed challenge and aggregates across weeks", () => {
    const ev: StudentEvidence = {
      ...emptyEvidence(),
      challengeWeeks: [1],
      interactions: [{ week: 2, interactionId: "W02-I01", attempts: 1, wrongAttempts: 0, correct: true, firstTryCorrect: true }],
    };
    const p = computeCompetencyProfile([week2, spec], ev);
    // d3: W1 challenge done (1) + W2 scenario correct (1) → 100 %, evidence 2
    expect(p.simulation.d3).toEqual({ percent: 100, evidence: 2 });
    expect(p.perWeek.map((w) => w.week)).toEqual([1, 2]);
    expect(p.perWeek[0].d3).toEqual({ percent: 100, evidence: 1 });
    expect(p.perWeek[1].d3).toEqual({ percent: 100, evidence: 1 });
    expect(p.simulation.d1.percent).toBeNull();
  });

  it("keeps teacher-recorded practice separate", () => {
    const ev: StudentEvidence = {
      ...emptyEvidence(),
      submissions: [
        { week: 1, activityId: "W01-A01", status: "graded", rubricScores: [4, 1, 2] }, // safety criteria 0 and 2 → 4/4, 2/4
        { week: 1, activityId: "W01-A01", status: "submitted", rubricScores: [1, 1, 1] }, // not graded → ignored
      ],
      competencies: [
        { competency: 1, level: 3, passed: true, score: null, maxScore: null },
        { competency: 0, level: 4, passed: true, score: 90, maxScore: 100 },
      ],
    };
    const p = computeCompetencyProfile([spec], ev);
    expect(p.practical.rubricPercent).toBe(75);
    expect(p.practical.rubricEvidence).toBe(2);
    expect(p.practical.competencies[0]).toEqual({ competency: 1, level: 3, passed: true });
    expect(p.practical.competencies[1]).toEqual({ competency: 2, level: null, passed: null });
    expect(p.practical.final).toEqual({ level: 4, passed: true, score: 90, maxScore: 100 });
    // Practice results never change simulation domains.
    expect(p.simulation.d4).toEqual({ percent: null, evidence: 0 });
  });

  it("thresholds and class summary", () => {
    expect(belowThreshold(null)).toBe(false);
    expect(belowThreshold(59.9)).toBe(true);
    expect(belowThreshold(60)).toBe(false);
    const a = computeCompetencyProfile([spec], { ...emptyEvidence(), quizBest: { 1: 40 } });
    const b = computeCompetencyProfile([spec], { ...emptyEvidence(), quizBest: { 1: 90 } });
    const c = computeCompetencyProfile([spec], emptyEvidence());
    const s = classDomainSummary([a, b, c]);
    expect(s.d1).toEqual({ mean: 65, below: 1, withEvidence: 2 });
    expect(s.d2).toEqual({ mean: null, below: 0, withEvidence: 0 });
  });
});

describe("content integration", () => {
  it("week 1 spec and slice criteria are consistent", () => {
    const w = getWeek(1)!;
    const sp = weekEvidenceSpec(w);
    expect(sp.interactions.length).toBe(w.interactions.length);
    expect(sp.quiz.passPercent).toBe(w.quiz.passPercent);
    const fed = domainsFedBy(sp);
    expect(fed).toContain("d1");
    expect(fed).toContain("d4"); // safety week with scenarios / attitude objectives
    const slice = buildSlice(w, "intro");
    expect(slice.criteria.domains).toEqual(fed);
    expect(slice.criteria.stepCount).toBe(w.steps.length);
    expect(slice.criteria.labTasks.total).toBe(w.lab.tasks.length);
    expect(slice.criteria.activities.length).toBe(w.activities.length);
    expect(slice.criteria.courseCompetencies).toEqual(w.courseCompetencies);
    // The slice must not leak answers.
    expect(JSON.stringify(slice.criteria)).not.toContain('"answer"');
  });
});
