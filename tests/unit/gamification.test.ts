import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, assignmentEarnsXp, evaluateAchievements, LEVELS, levelFor, type AchievementFacts } from "@/lib/gamification";
import type { LabId } from "@/content/types";

const labByWeek: Record<number, LabId> = {
  1: "ohms", 2: "ohms", 3: "ohms", 4: "circuit", 5: "circuit", 6: "circuit", 7: "color-code", 8: "capacitor", 9: "inductor-transformer",
  10: "inductor-transformer", 11: "relay", 12: "oscilloscope", 13: "semiconductor", 14: "multimeter", 15: "circuit", 16: "motor", 17: "multimeter", 18: "oscilloscope",
};
const all = Array.from({ length: 18 }, (_, i) => i + 1);
const base = (p: Partial<AchievementFacts> = {}): AchievementFacts => ({
  completedWeeks: new Set(),
  labStageWeeks: new Set(),
  bestPostQuiz: {},
  anyPerfect: false,
  growth: false,
  labByWeek,
  ...p,
});

describe("levels", () => {
  it("starts at level 1 with Thai name", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, levelName: "ช่างฝึกหัด", xpIntoLevel: 0 });
  });
  it("crosses thresholds", () => {
    const l2 = LEVELS[1];
    expect(levelFor(l2.minXp - 1).level).toBe(1);
    expect(levelFor(l2.minXp)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNextLevel: LEVELS[2].minXp - l2.minXp });
    expect(levelFor(99999)).toMatchObject({ level: 5, levelName: "ผู้เชี่ยวชาญ" });
  });
  it("has 5 increasing levels", () => {
    expect(LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].minXp).toBeGreaterThan(LEVELS[i - 1].minXp);
  });
  it("assignment XP needs rubric average ≥ 3", () => {
    expect(assignmentEarnsXp([3, 3, 4])).toBe(true);
    expect(assignmentEarnsXp([2, 3, 3])).toBe(false);
    expect(assignmentEarnsXp([])).toBe(false);
  });
});

describe("achievements", () => {
  it("defines the 10 required codes", () => {
    expect(ACHIEVEMENTS.map((a) => a.code).sort()).toEqual(
      ["circuit-analyst", "component-expert", "course-graduate", "electronics-explorer", "first-week", "growth-mindset", "measurement-specialist", "perfect-score", "safety-champion", "troubleshooter"].sort(),
    );
    for (const a of ACHIEVEMENTS) expect(a.title && a.description && a.how).toBeTruthy();
  });
  it("nothing earned with no progress", () => {
    expect(evaluateAchievements(base())).toEqual([]);
  });
  it("first-week & safety-champion", () => {
    expect(evaluateAchievements(base({ completedWeeks: new Set([1]) }))).toEqual(["first-week"]);
    expect(evaluateAchievements(base({ bestPostQuiz: { 1: 90, 2: 95 } }))).toContain("safety-champion");
    expect(evaluateAchievements(base({ bestPostQuiz: { 1: 90, 2: 85 } }))).not.toContain("safety-champion");
  });
  it("circuit-analyst needs completion and 80 %", () => {
    const f = base({ completedWeeks: new Set([3, 4, 5]), bestPostQuiz: { 3: 80, 4: 90, 5: 85 } });
    expect(evaluateAchievements(f)).toContain("circuit-analyst");
    expect(evaluateAchievements({ ...f, bestPostQuiz: { 3: 79, 4: 90, 5: 85 } })).not.toContain("circuit-analyst");
  });
  it("component-expert", () => {
    expect(evaluateAchievements(base({ bestPostQuiz: { 7: 80, 8: 80, 9: 80, 10: 80, 13: 80 } }))).toContain("component-expert");
  });
  it("measurement-specialist needs W17/W18 and both instrument labs", () => {
    const f = base({ completedWeeks: new Set([17, 18]), labStageWeeks: new Set([17]) });
    expect(evaluateAchievements(f)).not.toContain("measurement-specialist");
    expect(evaluateAchievements({ ...f, labStageWeeks: new Set([17, 18]) })).toContain("measurement-specialist");
  });
  it("electronics-explorer needs every distinct lab", () => {
    const most = new Set(all.filter((w) => w !== 16));
    expect(evaluateAchievements(base({ labStageWeeks: most }))).not.toContain("electronics-explorer");
    expect(evaluateAchievements(base({ labStageWeeks: new Set([1, 4, 7, 8, 9, 11, 12, 13, 14, 16]) }))).toContain("electronics-explorer");
  });
  it("troubleshooter, perfect-score, growth-mindset, course-graduate", () => {
    expect(evaluateAchievements(base({ labStageWeeks: new Set([15]) }))).toContain("troubleshooter");
    expect(evaluateAchievements(base({ anyPerfect: true }))).toContain("perfect-score");
    expect(evaluateAchievements(base({ growth: true }))).toContain("growth-mindset");
    expect(evaluateAchievements(base({ completedWeeks: new Set(all) }))).toContain("course-graduate");
    expect(evaluateAchievements(base({ completedWeeks: new Set(all.slice(0, 17)) }))).not.toContain("course-graduate");
  });
});
