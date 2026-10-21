import { describe, expect, it } from "vitest";
import { defaultValues, drawValues, evaluate, formatVar, isDefaultDraw, substitute, variablesOf } from "./formula";

describe("formula evaluator", () => {
  it("arithmetic with precedence and parentheses", () => {
    expect(evaluate("1 + 2 * 3")).toBe(7);
    expect(evaluate("(1 + 2) * 3")).toBe(9);
    expect(evaluate("2 ^ 3 ^ 2")).toBe(512); // right-assoc
    expect(evaluate("-2 ^ 2")).toBe(-4);
    expect(evaluate("10 / 4")).toBe(2.5);
    expect(evaluate("1e3 * 2")).toBe(2000);
    expect(evaluate("4.7e3 / 1000")).toBeCloseTo(4.7);
  });
  it("variables, functions, constants", () => {
    expect(evaluate("V / R", { V: 12, R: 1000 })).toBeCloseTo(0.012);
    expect(evaluate("V / R * 1000", { V: 12, R: 1000 })).toBeCloseTo(12);
    expect(evaluate("sqrt(P * R)", { P: 2, R: 8 })).toBeCloseTo(4);
    expect(evaluate("round(V / R * 1000, 2)", { V: 5, R: 330 })).toBeCloseTo(15.15);
    expect(evaluate("1 / (2 * pi * f * C)", { f: 50, C: 10e-6 })).toBeCloseTo(318.31, 1);
    expect(evaluate("min(a, b) + max(a, b)", { a: 1, b: 2 })).toBe(3);
    expect(evaluate("(R1 * R2) / (R1 + R2)", { R1: 100, R2: 100 })).toBe(50);
  });
  it("rejects anything unsafe or malformed", () => {
    expect(() => evaluate("V / R", { V: 1 })).toThrow(/ตัวแปร/);
    expect(() => evaluate("alert(1)")).toThrow(/ฟังก์ชัน/);
    expect(() => evaluate("1 +")).toThrow();
    expect(() => evaluate("(1 + 2")).toThrow();
    expect(() => evaluate("1 $ 2")).toThrow();
    expect(() => evaluate("process")).toThrow();
    expect(() => evaluate("1 / 0")).toThrow(/จำกัด/);
  });
  it("lists variables (not functions or constants)", () => {
    expect(variablesOf("sqrt(P * R) + pi * V").sort()).toEqual(["P", "R", "V"]);
  });
  it("draws on the step grid and formats", () => {
    const vars = { V: { default: 12, min: 3, max: 24, step: 1.5 }, R: { default: 1000, min: 100, max: 1000, step: 100 } };
    expect(defaultValues(vars)).toEqual({ V: 12, R: 1000 });
    expect(isDefaultDraw({ V: 12, R: 1000 }, vars)).toBe(true);
    expect(isDefaultDraw({ V: 13.5, R: 1000 }, vars)).toBe(false);
    for (let i = 0; i < 200; i++) {
      const d = drawValues(vars);
      expect(d.V).toBeGreaterThanOrEqual(3);
      expect(d.V).toBeLessThanOrEqual(24);
      expect(Math.round(((d.V - 3) / 1.5) * 1e6) / 1e6 % 1).toBe(0);
      expect(d.R % 100).toBe(0);
    }
    expect(drawValues(vars, () => 0)).toEqual({ V: 3, R: 100 });
    expect(drawValues(vars, () => 0.999999)).toEqual({ V: 24, R: 1000 });
    expect(formatVar(13.5, vars.V)).toBe("13.5");
    expect(formatVar(12, vars.V)).toBe("12");
    expect(formatVar(0.1, { default: 0.1, min: 0.1, max: 1, step: 0.01 })).toBe("0.1");
    expect(formatVar(0.1, { default: 0.1, min: 0.1, max: 1, step: 0.01, decimals: 2 })).toBe("0.10");
  });
  it("substitutes placeholders", () => {
    const vars = { V: { default: 12, min: 3, max: 24, step: 1.5 } };
    expect(substitute("แรงดัน {{V}} V และ {{X}}", { V: 13.5 }, vars)).toBe("แรงดัน 13.5 V และ {{X}}");
  });
});
