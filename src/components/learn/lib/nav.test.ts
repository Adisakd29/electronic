import { describe, expect, it } from "vitest";
import type { Block, Interaction, WorkedExample } from "@/content/types";
import { blockFigureKeys, figureLabel, numberFigures } from "./figures";
import { allStepsDone, clampStep, firstIncompleteStep, parseStepParam, stepNavReducer } from "./stepNav";

const fig = (k: string) => ({ figure: k, caption: k, alt: k });

describe("figure numbering", () => {
  const interactions: Record<string, Interaction> = {
    I1: { id: "I1", kind: "mcq", prompt: "", explanation: "", options: [], figure: fig("F3") },
    I2: {
      id: "I2",
      kind: "predict",
      prompt: "",
      explanation: "",
      options: [],
      reveal: "",
      figure: fig("F4"),
      revealFigure: fig("F5"),
    },
    TRY: { id: "TRY", kind: "fill", prompt: "", explanation: "", fields: [], figure: fig("F7") },
  };
  const examples: Record<string, WorkedExample> = {
    E1: { id: "E1", title: "", level: "basic", problem: "", steps: [], answer: "", figure: fig("F6"), tryIt: "TRY" },
  };
  const r = { interaction: (id: string) => interactions[id], example: (id: string) => examples[id] };

  it("numbers figures in order of first appearance, including interactions and examples", () => {
    const blocks: Block[] = [
      { type: "md", md: "x" },
      { type: "figure", ...fig("F1") },
      { type: "interaction", ref: "I1" },
      { type: "figure", ...fig("F1") },
      { type: "interaction", ref: "I2" },
      { type: "example", ref: "E1" },
      { type: "interaction", ref: "missing" },
    ];
    const keys = blockFigureKeys(blocks, r);
    expect(keys).toEqual(["F1", "F3", "F1", "F4", "F5", "F6", "F7"]);
    expect(numberFigures(keys)).toEqual({ F1: 1, F3: 2, F4: 3, F5: 4, F6: 5, F7: 6 });
  });
  it("supports a start offset and labels", () => {
    expect(numberFigures(["A", "B"], 4)).toEqual({ A: 4, B: 5 });
    expect(figureLabel(7, 3)).toBe("รูปที่ 7.3");
    expect(figureLabel(7, undefined)).toBeNull();
  });
});

describe("step navigation", () => {
  it("clamps", () => {
    expect(clampStep(-1, 5)).toBe(0);
    expect(clampStep(9, 5)).toBe(4);
    expect(clampStep(2.7, 5)).toBe(2);
    expect(clampStep(3, 0)).toBe(0);
  });
  it("reduces next/prev/goto/total", () => {
    let s = { index: 0, total: 3 };
    s = stepNavReducer(s, { type: "prev" });
    expect(s.index).toBe(0);
    s = stepNavReducer(s, { type: "next" });
    s = stepNavReducer(s, { type: "next" });
    s = stepNavReducer(s, { type: "next" });
    expect(s.index).toBe(2);
    s = stepNavReducer(s, { type: "goto", index: 1 });
    expect(s.index).toBe(1);
    s = stepNavReducer(s, { type: "total", total: 1 });
    expect(s).toEqual({ index: 0, total: 1 });
  });
  it("parses the 1-based ?step param", () => {
    expect(parseStepParam("3", 8)).toBe(2);
    expect(parseStepParam("99", 8)).toBe(7);
    expect(parseStepParam("0", 8, 4)).toBe(4);
    expect(parseStepParam("abc", 8, 1)).toBe(1);
    expect(parseStepParam(null, 8, 2)).toBe(2);
  });
  it("finds the resume step", () => {
    expect(firstIncompleteStep(["a", "b", "c"], ["a"])).toBe(1);
    expect(firstIncompleteStep(["a", "b"], ["a", "b"])).toBe(1);
    expect(allStepsDone(["a", "b"], ["b", "a"])).toBe(true);
    expect(allStepsDone([], [])).toBe(false);
  });
});
