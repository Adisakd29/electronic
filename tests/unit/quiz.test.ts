import { describe, expect, it } from "vitest";
import {
  gradeAttempt,
  isCorrect,
  parseNumber,
  publicChoices,
  seededRng,
  selectChallenge,
  selectPretest,
  selectQuestions,
  shuffleChoices,
  validateQuestion,
  withinTolerance,
  type BankQuestion,
} from "@/lib/quiz";
import type { Bloom } from "@/content/types";

function q(id: string, bloom: Bloom, extra: Partial<BankQuestion> = {}): BankQuestion {
  return {
    id,
    type: "mcq",
    bloom,
    stem: `stem ${id}`,
    figure: null,
    choices: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ],
    answer: "b",
    tolerance: null,
    unit: null,
    explanation: "because",
    feedback: { a: "a is wrong", c: "c is wrong", d: "d is wrong" },
    ...extra,
  };
}

const blooms: Bloom[] = ["remember", "understand", "apply", "analyze", "evaluate"];
const bank: BankQuestion[] = Array.from({ length: 30 }, (_, i) => q(`W03-Q${String(i + 1).padStart(2, "0")}`, blooms[i % 5]));

describe("question selection", () => {
  it("draws drawCount distinct questions", () => {
    const ids = selectQuestions(bank, 15, undefined, null, seededRng(1));
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
  });

  it("honours the Bloom mix", () => {
    const mix = { remember: 4, understand: 4, apply: 4, analyze: 2, evaluate: 1 };
    const ids = selectQuestions(bank, 15, mix, null, seededRng(2));
    const byId = new Map(bank.map((b) => [b.id, b.bloom]));
    const counts: Record<string, number> = {};
    for (const id of ids) counts[byId.get(id)!] = (counts[byId.get(id)!] ?? 0) + 1;
    expect(counts).toEqual({ remember: 4, understand: 4, apply: 4, analyze: 2, evaluate: 1 });
  });

  it("fills shortfalls when a Bloom level is scarce", () => {
    const small = [...bank.filter((b) => b.bloom !== "evaluate"), q("X1", "evaluate")];
    const ids = selectQuestions(small, 15, { evaluate: 5, apply: 10 }, null, seededRng(3));
    expect(ids).toHaveLength(15);
    expect(ids).toContain("X1");
  });

  it("never repeats the previous exact set when the bank allows", () => {
    const tiny = bank.slice(0, 11);
    const prev = tiny.slice(0, 10).map((b) => b.id);
    for (let s = 0; s < 50; s++) {
      const ids = selectQuestions(tiny, 10, undefined, prev, seededRng(s));
      expect(new Set(ids)).not.toEqual(new Set(prev));
    }
  });

  it("returns the whole bank when it is smaller than drawCount", () => {
    expect(selectQuestions(bank.slice(0, 4), 10, undefined, null, seededRng(4))).toHaveLength(4);
    expect(selectQuestions([], 10, undefined, null, seededRng(4))).toEqual([]);
  });

  it("pretest uses 5 remember/understand questions", () => {
    const ids = selectPretest(bank, seededRng(5));
    const byId = new Map(bank.map((b) => [b.id, b.bloom]));
    expect(ids).toHaveLength(5);
    expect(ids.every((id) => ["remember", "understand"].includes(byId.get(id)!))).toBe(true);
  });

  it("challenge uses higher-order questions", () => {
    const ids = selectChallenge(bank, null, seededRng(6));
    const byId = new Map(bank.map((b) => [b.id, b.bloom]));
    expect(ids).toHaveLength(5);
    expect(ids.every((id) => ["apply", "analyze", "evaluate"].includes(byId.get(id)!))).toBe(true);
  });

  it("shuffles choice order per mcq question and keeps all ids", () => {
    const order = shuffleChoices(bank.slice(0, 5), seededRng(7));
    for (const ids of Object.values(order)) expect([...ids].sort()).toEqual(["a", "b", "c", "d"]);
    const pub = publicChoices(bank[0], order[bank[0].id])!;
    expect(pub.map((c) => c.id)).toEqual(order[bank[0].id]);
  });
});

describe("grading", () => {
  it("parses numbers in Thai/European formats", () => {
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber("1,000")).toBe(1000);
    expect(parseNumber("1,000.5")).toBe(1000.5);
    expect(parseNumber(" 2e-3 ")).toBe(0.002);
    expect(parseNumber("\u22123")).toBe(-3);
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });

  it("applies relative tolerance", () => {
    expect(withinTolerance(10.19, 10, 0.02)).toBe(true);
    expect(withinTolerance(10.21, 10, 0.02)).toBe(false);
    expect(withinTolerance(0, 0, 0.02)).toBe(true);
    expect(withinTolerance(0.01, 0, 0.02, 0.05)).toBe(true);
  });

  it("grades numeric with default and custom tolerance", () => {
    const n = q("N1", "apply", { type: "numeric", choices: null, answer: "12", unit: "mA" });
    expect(isCorrect(n, "12.2")).toBe(true);
    expect(isCorrect(n, "12.5")).toBe(false);
    expect(isCorrect({ ...n, tolerance: 0.05 }, "12.5")).toBe(true);
    expect(isCorrect(n, null)).toBe(false);
  });

  it("grades tf", () => {
    const t = q("T1", "remember", { type: "tf", choices: null, answer: "false" });
    expect(isCorrect(t, "false")).toBe(true);
    expect(isCorrect(t, "true")).toBe(false);
    expect(publicChoices(t, undefined)).toEqual([
      { id: "true", text: "ถูก" },
      { id: "false", text: "ผิด" },
    ]);
  });

  it("returns explanation and feedback for the chosen wrong option", () => {
    const qs = bank.slice(0, 4);
    const r = gradeAttempt(qs, { [qs[0].id]: "b", [qs[1].id]: "c", [qs[2].id]: "b" });
    expect(r.score).toBe(2);
    expect(r.maxScore).toBe(4);
    expect(r.percent).toBe(50);
    expect(r.items[1].feedback).toBe("c is wrong");
    expect(r.items[1].answerText).toBe("B");
    expect(r.items[0].feedback).toBeNull();
    expect(r.items[3].given).toBeNull();
  });

  it("validates teacher questions", () => {
    expect(validateQuestion({ type: "mcq", stem: "x", choices: bank[0].choices, answer: "b", explanation: "y" })).toBeNull();
    expect(validateQuestion({ type: "mcq", stem: "x", choices: bank[0].choices!.slice(0, 3), answer: "b", explanation: "y" })).toMatch(/4/);
    expect(validateQuestion({ type: "mcq", stem: "x", choices: bank[0].choices, answer: "e", explanation: "y" })).not.toBeNull();
    expect(validateQuestion({ type: "numeric", stem: "x", choices: null, answer: "abc", explanation: "y" })).not.toBeNull();
    expect(validateQuestion({ type: "tf", stem: "x", choices: null, answer: "true", explanation: "" })).not.toBeNull();
  });
});
