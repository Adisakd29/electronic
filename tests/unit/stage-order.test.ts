import { describe, expect, it } from "vitest";
import { nextStage, openStages, stageGate } from "@/lib/stage-order";

describe("stage order inside a week", () => {
  it("a fresh week opens only the intro", () => {
    expect(openStages([], { required: true })).toEqual(["intro"]);
    expect(stageGate("learn", [], { required: true })).toMatchObject({ open: false, missing: ["intro"] });
    expect(stageGate("quiz", [], { required: true }).missing).toEqual(["intro", "learn", "practice", "lab"]);
    expect(stageGate("quiz", [], { required: true }).reason).toMatch(/บทนำ → เรียนรู้ → ฝึกปฏิบัติเชิงโต้ตอบ → ห้องทดลองเสมือน/);
  });

  it("each finished stage opens exactly the next one", () => {
    expect(openStages(["intro"], { required: true })).toEqual(["intro", "learn"]);
    expect(openStages(["intro", "learn"], { required: true })).toEqual(["intro", "learn", "practice"]);
    expect(openStages(["intro", "learn", "practice", "lab"], { required: true })).toEqual(["intro", "learn", "practice", "lab", "quiz"]);
    expect(stageGate("complete", ["intro", "learn", "practice", "lab"], { required: true })).toMatchObject({ open: false, missing: ["quiz"] });
  });

  it("a gap in the middle closes everything after it (order of completion matters, not count)", () => {
    expect(openStages(["intro", "practice", "lab"], { required: true })).toEqual(["intro", "learn"]);
  });

  it("a finished week is fully open for review", () => {
    expect(openStages(["intro", "learn", "practice", "lab", "quiz", "complete"], { required: true })).toHaveLength(6);
    expect(openStages(["complete"], { required: true })).toHaveLength(6);
  });

  it("the rule can be switched off", () => {
    expect(openStages([], { required: false })).toHaveLength(6);
    expect(stageGate("quiz", [], { required: false }).open).toBe(true);
  });

  it("guests skip the quiz: complete opens after the lab", () => {
    expect(openStages(["intro", "learn", "practice", "lab"], { required: true, skipQuiz: true })).toEqual(["intro", "learn", "practice", "lab", "complete"]);
    expect(stageGate("complete", ["intro", "learn", "practice"], { required: true, skipQuiz: true }).missing).toEqual(["lab"]);
  });

  it("nextStage points at the first unfinished stage", () => {
    expect(nextStage([])).toBe("intro");
    expect(nextStage(["intro", "learn"])).toBe("practice");
    expect(nextStage(["intro", "learn", "practice", "lab"], true)).toBe("complete");
    expect(nextStage(["intro", "learn", "practice", "lab", "quiz", "complete"])).toBe("complete");
  });
});
