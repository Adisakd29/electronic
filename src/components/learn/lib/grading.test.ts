import { describe, expect, it } from "vitest";
import type { FillField } from "@/content/types";
import {
  checkFillField,
  checkNumeric,
  gradeClassify,
  gradeFaults,
  gradeMatch,
  gradeMcq,
  gradeOrder,
  parseNumber,
  seededPermutation,
  splitValueUnit,
  withinTolerance,
} from "./grading";

describe("parseNumber", () => {
  it("accepts period and comma decimals", () => {
    expect(parseNumber("0.5")).toBe(0.5);
    expect(parseNumber("0,5")).toBe(0.5);
    expect(parseNumber(" 12 ")).toBe(12);
    expect(parseNumber(".25")).toBe(0.25);
  });
  it("treats grouped commas as thousands separators", () => {
    expect(parseNumber("1,500")).toBe(1500);
    expect(parseNumber("12,000.5")).toBe(12000.5);
    expect(parseNumber("1 000")).toBe(1000);
    expect(parseNumber("0,500")).toBe(0.5);
  });
  it("handles signs, unicode minus and powers of ten", () => {
    expect(parseNumber("−3.3")).toBe(-3.3);
    expect(parseNumber("4.7e3")).toBe(4700);
    expect(parseNumber("4.7×10^3")).toBeCloseTo(4700);
    expect(parseNumber("2x10^-3")).toBeCloseTo(0.002);
    expect(parseNumber("1.5×10⁻³")).toBeCloseTo(0.0015);
  });
  it("rejects garbage", () => {
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
    expect(parseNumber("1.2.3")).toBeNaN();
  });
});

describe("splitValueUnit", () => {
  it("separates trailing units", () => {
    expect(splitValueUnit("12 mA")).toEqual({ num: "12", unit: "mA" });
    expect(splitValueUnit("4,7kΩ")).toEqual({ num: "4,7", unit: "kΩ" });
    expect(splitValueUnit("12")).toEqual({ num: "12", unit: "" });
  });
});

describe("withinTolerance", () => {
  it("uses relative and absolute tolerance", () => {
    expect(withinTolerance(10.19, 10, 0.02)).toBe(true);
    expect(withinTolerance(10.21, 10, 0.02)).toBe(false);
    expect(withinTolerance(0.004, 0, 0.02, 0.005)).toBe(true);
    expect(withinTolerance(0.1 + 0.2, 0.3, 0)).toBe(true);
    expect(withinTolerance(NaN, 1)).toBe(false);
  });
});

describe("checkFillField", () => {
  const field: FillField = {
    id: "i",
    label: "$I$ =",
    answer: 12,
    unit: "mA",
    altUnits: [{ unit: "A", factor: 1000 }],
    commonErrors: [{ value: 12000, feedback: "ลืมแปลง kΩ เป็น Ω" }],
  };
  it("accepts the canonical unit within 2 %", () => {
    expect(checkFillField(field, "12").status).toBe("correct");
    expect(checkFillField(field, "12,1").status).toBe("correct");
    expect(checkFillField(field, "12.5").status).toBe("wrong");
  });
  it("converts alternative units from the dropdown or typed text", () => {
    expect(checkFillField(field, "0.012", "A")).toMatchObject({ status: "correct", value: 12 });
    expect(checkFillField(field, "0,012 A").status).toBe("correct");
    expect(checkFillField(field, "12 uA").status).toBe("unit");
  });
  it("matches common errors with targeted feedback", () => {
    const r = checkFillField(field, "12000");
    expect(r.status).toBe("wrong");
    expect(r.feedback).toBe("ลืมแปลง kΩ เป็น Ω");
  });
  it("reports empty and invalid input", () => {
    expect(checkFillField(field, "  ").status).toBe("empty");
    expect(checkFillField(field, "สิบสอง").status).toBe("invalid");
  });
  it("honours absTolerance near zero", () => {
    const z: FillField = { id: "z", label: "", answer: 0, absTolerance: 0.01, unit: "V" };
    expect(checkFillField(z, "0.008").status).toBe("correct");
    expect(checkFillField(z, "0.02").status).toBe("wrong");
  });
  it("works without units", () => {
    const n: FillField = { id: "n", label: "", answer: 3, tolerance: 0 };
    expect(checkFillField(n, "3").status).toBe("correct");
    expect(checkFillField(n, "3.01").status).toBe("wrong");
  });
});

describe("checkNumeric", () => {
  it("defaults to 3 % and ignores a typed unit", () => {
    expect(checkNumeric("5.8 V", 5.69)).toBe(true);
    expect(checkNumeric("6", 5.69)).toBe(false);
  });
});

describe("gradeMcq", () => {
  const opts = [
    { id: "a", text: "", feedback: "", correct: true },
    { id: "b", text: "", feedback: "" },
    { id: "c", text: "", feedback: "", correct: true },
  ];
  it("requires all correct and no wrong options", () => {
    expect(gradeMcq(opts, ["a", "c"]).correct).toBe(true);
    expect(gradeMcq(opts, ["a"])).toEqual({ correct: false, missed: ["c"], wrong: [] });
    expect(gradeMcq(opts, ["a", "b", "c"])).toEqual({ correct: false, missed: [], wrong: ["b"] });
    expect(gradeMcq(opts, []).correct).toBe(false);
  });
});

describe("gradeMatch", () => {
  const pairs = [{ right: "Ω" }, { right: "V" }, { right: "A" }];
  const pool = ["A", "W", "Ω", "V"]; // shuffled + distractor W
  it("grades by text, null is wrong", () => {
    expect(gradeMatch(pairs, pool, [2, 3, 0])).toEqual([true, true, true]);
    expect(gradeMatch(pairs, pool, [2, 1, null])).toEqual([true, false, false]);
  });
  it("treats identical texts as interchangeable", () => {
    const p = [{ right: "x" }, { right: "x" }];
    expect(gradeMatch(p, ["x", "x"], [1, 0])).toEqual([true, true]);
  });
});

describe("gradeOrder", () => {
  it("checks each position", () => {
    expect(gradeOrder(["a", "b", "c"], [0, 1, 2])).toEqual([true, true, true]);
    expect(gradeOrder(["a", "b", "c"], [1, 0, 2])).toEqual([false, false, true]);
  });
  it("accepts swapped identical items", () => {
    expect(gradeOrder(["a", "a", "b"], [1, 0, 2])).toEqual([true, true, true]);
  });
});

describe("gradeClassify", () => {
  it("compares bins", () => {
    expect(gradeClassify([{ category: 0 }, { category: 1 }], [0, 0])).toEqual([true, false]);
    expect(gradeClassify([{ category: 0 }], [null])).toEqual([false]);
  });
});

describe("gradeFaults", () => {
  it("is right when selection equals the fault flag", () => {
    const spots = [
      { id: "a", fault: true },
      { id: "b", fault: false },
      { id: "c", fault: true },
    ];
    expect(gradeFaults(spots, ["a", "b"])).toEqual({ a: true, b: false, c: false });
  });
});

describe("seededPermutation", () => {
  it("is deterministic and a permutation", () => {
    const p = seededPermutation(6, "W07-I05");
    expect(seededPermutation(6, "W07-I05")).toEqual(p);
    expect([...p].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("never returns the identity when deranging", () => {
    for (let s = 0; s < 200; s++) {
      const p = seededPermutation(2, s, true);
      expect(p).toEqual([1, 0]);
    }
    for (let s = 0; s < 200; s++) {
      const p = seededPermutation(4, s, true);
      expect(p.every((v, i) => v === i)).toBe(false);
    }
  });
});
