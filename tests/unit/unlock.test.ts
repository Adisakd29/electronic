import { describe, expect, it } from "vitest";
import { computeUnlocks, DEFAULT_POLICY, DEFAULT_RULE, evaluateUnlock, EMPTY_FACTS, normaliseRule, type WeekFacts } from "@/lib/unlock";

const full: WeekFacts = { learnDone: true, practiceDone: true, labDone: true, assignmentsDone: true, quizBestPercent: 80 };

describe("unlock rules", () => {
  it("week 1 is always unlocked", () => {
    expect(evaluateUnlock({ week: 1, policies: [], overrides: [], previous: EMPTY_FACTS }).unlocked).toBe(true);
  });

  it("uses the built-in default without a class", () => {
    const r = evaluateUnlock({ week: 2, policies: [], overrides: [], previous: EMPTY_FACTS });
    expect(r.unlocked).toBe(false);
    expect(r.lockReason).toContain("สัปดาห์ที่ 1");
    expect(r.lockReason).toContain("60 %");
    expect(evaluateUnlock({ week: 2, policies: [], overrides: [], previous: full }).unlocked).toBe(true);
  });

  it("default rule does not require assignments", () => {
    expect(DEFAULT_RULE.requireAssignments).toBe(false);
    expect(evaluateUnlock({ week: 3, policies: [], overrides: [], previous: { ...full, assignmentsDone: false } }).unlocked).toBe(true);
  });

  it("explains exactly what is missing", () => {
    const r = evaluateUnlock({ week: 4, policies: [], overrides: [], previous: { ...full, labDone: false, quizBestPercent: 45 } });
    expect(r.unlocked).toBe(false);
    expect(r.lockReason).toContain("ห้องทดลอง");
    expect(r.lockReason).toContain("45 %");
    expect(r.lockReason).not.toContain("เรียนเนื้อหา");
  });

  it("quiz threshold is inclusive", () => {
    expect(evaluateUnlock({ week: 2, policies: [], overrides: [], previous: { ...full, quizBestPercent: 60 } }).unlocked).toBe(true);
    expect(evaluateUnlock({ week: 2, policies: [], overrides: [], previous: { ...full, quizBestPercent: 59.9 } }).unlocked).toBe(false);
  });

  it("disabled policy unlocks everything", () => {
    const p = { ...DEFAULT_POLICY, enabled: false };
    expect(computeUnlocks([p], [], {}).every((u) => u.unlocked)).toBe(true);
  });

  it("opened weeks and individual overrides unlock", () => {
    const p = { ...DEFAULT_POLICY, openedWeeks: [5] };
    const u = computeUnlocks([p], [9], {});
    expect(u[4].unlocked).toBe(true);
    expect(u[8].unlocked).toBe(true);
    expect(u[5].unlocked).toBe(false);
  });

  it("per-week rule overrides the default rule", () => {
    const p = { ...DEFAULT_POLICY, weekRules: { "3": { ...DEFAULT_RULE, requireLab: false, minQuizPercent: 0 } } };
    const prev = { ...full, labDone: false, quizBestPercent: null };
    expect(evaluateUnlock({ week: 3, policies: [p], overrides: [], previous: prev }).unlocked).toBe(true);
    expect(evaluateUnlock({ week: 4, policies: [p], overrides: [], previous: prev }).unlocked).toBe(false);
  });

  it("requireAssignments rule", () => {
    const p = { ...DEFAULT_POLICY, defaultRule: { ...DEFAULT_RULE, requireAssignments: true } };
    const r = evaluateUnlock({ week: 2, policies: [p], overrides: [], previous: { ...full, assignmentsDone: false } });
    expect(r.unlocked).toBe(false);
    expect(r.lockReason).toContain("ใบงาน");
  });

  it("several classes: unlocked if any policy unlocks", () => {
    const strict = { ...DEFAULT_POLICY, defaultRule: { ...DEFAULT_RULE, minQuizPercent: 90 } };
    const lenient = { ...DEFAULT_POLICY, defaultRule: { ...DEFAULT_RULE, minQuizPercent: 50 } };
    expect(evaluateUnlock({ week: 2, policies: [strict, lenient], overrides: [], previous: { ...full, quizBestPercent: 70 } }).unlocked).toBe(true);
    expect(evaluateUnlock({ week: 2, policies: [strict], overrides: [], previous: { ...full, quizBestPercent: 70 } }).unlocked).toBe(false);
  });

  it("computeUnlocks uses the previous week's facts", () => {
    const u = computeUnlocks([], [], { 1: full, 2: full });
    expect(u.slice(0, 4).map((x) => x.unlocked)).toEqual([true, true, true, false]);
  });

  it("normaliseRule clamps values", () => {
    expect(normaliseRule({ minQuizPercent: 150, requireLearn: true }).minQuizPercent).toBe(100);
    expect(normaliseRule({ minQuizPercent: -3 }).minQuizPercent).toBe(0);
  });
});

describe("stage order requirement from class policies", () => {
  it("defaults on (no class, old rows without the field)", async () => {
    const { stageOrderRequired, normaliseRule } = await import("@/lib/unlock");
    expect(stageOrderRequired([], 3)).toBe(true);
    expect(normaliseRule({ requireLearn: true, minQuizPercent: 60 }).requireStageOrder).toBe(true);
    expect(normaliseRule({ requireStageOrder: false }).requireStageOrder).toBe(false);
  });
  it("any relaxing policy (disabled, or rule off for that week) switches it off", async () => {
    const { stageOrderRequired, DEFAULT_POLICY, DEFAULT_RULE } = await import("@/lib/unlock");
    expect(stageOrderRequired([DEFAULT_POLICY], 5)).toBe(true);
    expect(stageOrderRequired([{ ...DEFAULT_POLICY, enabled: false }], 5)).toBe(false);
    const off = { ...DEFAULT_POLICY, defaultRule: { ...DEFAULT_RULE, requireStageOrder: false } };
    expect(stageOrderRequired([DEFAULT_POLICY, off], 5)).toBe(false);
    const w7 = { ...DEFAULT_POLICY, weekRules: { "7": { ...DEFAULT_RULE, requireStageOrder: false } } };
    expect(stageOrderRequired([w7], 7)).toBe(false);
    expect(stageOrderRequired([w7], 8)).toBe(true);
  });
});
