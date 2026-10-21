import { describe, expect, it } from "vitest";
import {
  COLOURS,
  E96,
  coloursFor,
  convertBands,
  decodeBands,
  decodeSmd,
  explainBands,
  formatOhm,
  formatOhmSig,
  gradeQuiz,
  mantissa3,
  parseResistance,
  randomResistor,
  randomTarget,
  seeded,
  seriesMembership,
  standardSeries,
  toleranceColour,
  valueBands,
  type ColourName,
} from "./model";
import { lab } from "./index";
import type { ColorCodeState } from "./model";
import { summarise } from "./model";
import { initialFor } from "./presets";

const B = (s: string) => s.split(" ") as ColourName[];

describe("colour table (IEC 60062)", () => {
  it("digits and multipliers", () => {
    expect(COLOURS.black.digit).toBe(0);
    expect(COLOURS.white.digit).toBe(9);
    expect(COLOURS.green.exponent).toBe(5);
    expect(COLOURS.gold.exponent).toBe(-1);
    expect(COLOURS.silver.exponent).toBe(-2);
    expect(COLOURS.gold.digit).toBeUndefined();
  });
  it("tolerances", () => {
    const t = (c: ColourName) => COLOURS[c].tolerance;
    expect([t("brown"), t("red"), t("green"), t("blue"), t("violet"), t("grey"), t("gold"), t("silver"), t("none")]).toEqual([
      1, 2, 0.5, 0.25, 0.1, 0.05, 5, 10, 20,
    ]);
    expect(t("black")).toBeUndefined();
    expect(t("orange")).toBeUndefined();
  });
  it("tempco", () => {
    expect(COLOURS.black.tempco).toBe(250);
    expect(COLOURS.brown.tempco).toBe(100);
    expect(COLOURS.red.tempco).toBe(50);
    expect(COLOURS.orange.tempco).toBe(15);
    expect(COLOURS.yellow.tempco).toBe(25);
    expect(COLOURS.grey.tempco).toBe(1);
  });
  it("valid colours per role", () => {
    expect(coloursFor("digit")).toHaveLength(10);
    expect(coloursFor("multiplier")).toContain("gold");
    expect(coloursFor("multiplier")).not.toContain("none");
    expect(coloursFor("tolerance", 4)).toContain("none");
    expect(coloursFor("tolerance", 5)).not.toContain("none");
    expect(coloursFor("tolerance", 4)).not.toContain("black");
  });
});

describe("decodeBands", () => {
  const cases: [string, number, number][] = [
    ["yellow violet red gold", 4700, 5],
    ["brown black orange gold", 10000, 5],
    ["orange orange brown gold", 330, 5],
    ["orange red brown gold", 320, 5],
    ["red red red silver", 2200, 10],
    ["brown black black none", 10, 20],
    ["yellow violet gold gold", 4.7, 5],
    ["yellow violet silver gold", 0.47, 5],
    ["blue grey orange gold", 68000, 5],
    ["brown black green brown", 1e6, 1],
    ["white white white red", 99e9, 2],
    ["black black black gold", 0, 5],
  ];
  it.each(cases)("4-band %s", (s, v, t) => {
    const d = decodeBands(B(s), 4);
    expect(d.ok).toBe(true);
    expect(d.value).toBe(v);
    expect(d.tolerance).toBe(t);
  });
  it("5-band", () => {
    expect(decodeBands(B("brown black black red brown"), 5).value).toBe(10000);
    expect(decodeBands(B("yellow grey violet orange brown"), 5).value).toBe(487000);
    expect(decodeBands(B("brown black black gold green"), 5)).toMatchObject({ value: 10, tolerance: 0.5 });
    expect(decodeBands(B("orange orange red silver violet"), 5)).toMatchObject({ value: 3.32, tolerance: 0.1 });
  });
  it("6-band with tempco", () => {
    const d = decodeBands(B("yellow violet black brown brown red"), 6);
    expect(d).toMatchObject({ value: 4700, tolerance: 1, tempco: 50 });
  });
  it("min/max range", () => {
    const d = decodeBands(B("yellow violet orange gold"), 4);
    expect(d.min).toBe(44650);
    expect(d.max).toBe(49350);
    const e = decodeBands(B("brown black black none"), 4);
    expect([e.min, e.max]).toEqual([8, 12]);
  });
  it("rejects invalid colours for a position", () => {
    expect(decodeBands(B("gold violet red gold"), 4).ok).toBe(false);
    expect(decodeBands(B("yellow violet none gold"), 4).ok).toBe(false);
    expect(decodeBands(B("yellow violet red black"), 4).ok).toBe(false);
    expect(decodeBands(B("yellow violet red"), 4).ok).toBe(false);
    expect(decodeBands(B("brown black black red none"), 5).ok).toBe(false);
    expect(decodeBands(B("brown black black red brown white"), 6).ok).toBe(false);
  });
});

describe("E-series", () => {
  it("mantissa", () => {
    expect(mantissa3(4700)).toBe(470);
    expect(mantissa3(0.47)).toBe(470);
    expect(mantissa3(10)).toBe(100);
    expect(mantissa3(487000)).toBe(487);
    expect(mantissa3(1234)).toBeNaN();
    expect(mantissa3(0)).toBeNaN();
  });
  it("membership", () => {
    expect(seriesMembership(4700)).toEqual({ E12: true, E24: true, E96: false });
    expect(seriesMembership(5100)).toEqual({ E12: false, E24: true, E96: false });
    expect(seriesMembership(487000)).toEqual({ E12: false, E24: false, E96: true });
    expect(seriesMembership(10000)).toEqual({ E12: true, E24: true, E96: true });
    expect(standardSeries(320)).toBeUndefined();
    expect(standardSeries(330)).toBe("E12");
    expect(standardSeries(9.1)).toBe("E24");
    expect(standardSeries(49.9)).toBe("E96");
    expect(standardSeries(0)).toBeUndefined();
    expect(standardSeries(50000)).toBeUndefined();
  });
  it("E96 table", () => {
    expect(E96).toHaveLength(96);
    expect(E96[0]).toBe(100);
    expect(E96[67]).toBe(499);
    expect(E96[95]).toBe(976);
    for (let i = 1; i < 96; i++) expect(E96[i]).toBeGreaterThan(E96[i - 1]);
  });
});

describe("valueBands / convertBands", () => {
  it("encodes", () => {
    expect(valueBands(4700, 4)).toEqual(B("yellow violet red"));
    expect(valueBands(4700, 5)).toEqual(B("yellow violet black brown"));
    expect(valueBands(10, 5)).toEqual(B("brown black black gold"));
    expect(valueBands(0.47, 4)).toEqual(B("yellow violet silver"));
    expect(valueBands(2.2, 4)).toEqual(B("red red gold"));
    expect(valueBands(1e6, 4)).toEqual(B("brown black green"));
    expect(valueBands(487000, 5)).toEqual(B("yellow grey violet orange"));
    expect(valueBands(0, 4)).toEqual(B("black black black"));
    expect(valueBands(0.01, 4)).toEqual(B("black brown silver"));
    expect(valueBands(487000, 4)).toBeNull();
    expect(valueBands(1234, 5)).toBeNull();
  });
  it("round-trips all E24 × decades", () => {
    for (const e of [-1, 0, 1, 2, 3, 4, 5, 6]) {
      for (const m of [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91]) {
        const v = Number((m * 10 ** e).toPrecision(12));
        const b = valueBands(v, 4)!;
        expect(decodeBands([...b, "gold"], 4).value).toBe(v);
      }
    }
  });
  it("converts between band counts", () => {
    expect(convertBands(B("yellow violet red gold"), 4, 5)).toEqual(B("yellow violet black brown gold"));
    expect(convertBands(B("yellow violet red gold"), 4, 6)).toEqual(B("yellow violet black brown gold brown"));
    expect(convertBands(B("brown black black none"), 4, 5)).toEqual(B("brown black black gold brown"));
    // 487 kΩ cannot be 2 digits → rounds to 490 kΩ
    expect(decodeBands(convertBands(B("yellow grey violet orange brown"), 5, 4), 4).value).toBe(490000);
  });
  it("tolerance colour", () => {
    expect(toleranceColour(5)).toBe("gold");
    expect(toleranceColour(0.05)).toBe("grey");
    expect(toleranceColour(20, 5)).toBeNull();
  });
});

describe("explain & format", () => {
  it("formatOhm", () => {
    expect(formatOhm(4700)).toBe("4.7 kΩ");
    expect(formatOhm(487000)).toBe("487 kΩ");
    expect(formatOhm(0.47)).toBe("0.47 Ω");
    expect(formatOhm(10)).toBe("10 Ω");
    expect(formatOhm(44650)).toBe("44.65 kΩ");
    expect(formatOhm(1e6)).toBe("1 MΩ");
  });
  it("formatOhmSig", () => {
    expect(formatOhmSig(10000, 3)).toBe("10.0 kΩ");
    expect(formatOhmSig(4700, 3)).toBe("4.70 kΩ");
    expect(formatOhmSig(487000, 3)).toBe("487 kΩ");
    expect(formatOhmSig(3.32, 3)).toBe("3.32 Ω");
    expect(formatOhmSig(1e6, 3)).toBe("1.00 MΩ");
    expect(formatOhmSig(0.47, 3)).toBe("0.470 Ω");
  });
  it("explainBands", () => {
    expect(explainBands(B("yellow violet red gold"), 4)).toBe("เหลือง (4) – ม่วง (7) – แดง (×100) – ทอง (±5%) → 47 × 100 = 4.7 kΩ ±5%");
  });
});

describe("parseResistance", () => {
  it.each([
    ["4.7k", 4700],
    ["4k7", 4700],
    ["4700", 4700],
    ["4.7 kΩ", 4700],
    ["4.7K", 4700],
    ["47R", 47],
    ["4R7", 4.7],
    ["4r7", 4.7],
    ["R47", 0.47],
    ["0.47", 0.47],
    ["1M", 1e6],
    ["2M2", 2.2e6],
    ["2.2 โอห์ม", 2.2],
    ["10 ohm", 10],
    ["1,000", 1000],
  ])("%s", (s, v) => expect(parseResistance(s)).toBe(v));
  it("rejects junk", () => {
    expect(parseResistance("")).toBeNaN();
    expect(parseResistance("abc")).toBeNaN();
    expect(parseResistance("-5")).toBeNaN();
  });
});

describe("decodeSmd", () => {
  const v = (c: string) => {
    const r = decodeSmd(c);
    return r.ok ? r.value : NaN;
  };
  it("3-digit", () => {
    expect(v("472")).toBe(4700);
    expect(v("103")).toBe(10000);
    expect(v("100")).toBe(10);
    expect(v("101")).toBe(100);
    expect(v("220")).toBe(22);
    expect(v("105")).toBe(1e6);
    expect(decodeSmd("472")).toMatchObject({ kind: "3digit", tolerance: 5 });
  });
  it("4-digit", () => {
    expect(v("1002")).toBe(10000);
    expect(v("4701")).toBe(4700);
    expect(v("2200")).toBe(220);
    expect(v("1000")).toBe(100);
    expect(v("4992")).toBe(49900);
    expect(decodeSmd("1002")).toMatchObject({ kind: "4digit", tolerance: 1 });
  });
  it("zero-ohm", () => {
    expect(decodeSmd("0")).toMatchObject({ kind: "zero", value: 0 });
    expect(decodeSmd("000")).toMatchObject({ kind: "zero", value: 0 });
    expect(decodeSmd("0000")).toMatchObject({ kind: "zero", value: 0 });
  });
  it("R notation & RKM", () => {
    expect(v("4R7")).toBe(4.7);
    expect(v("R10")).toBe(0.1);
    expect(v("0R22")).toBe(0.22);
    expect(v("10R0")).toBe(10);
    expect(v("r47")).toBe(0.47);
    expect(v("4K7")).toBe(4700);
    expect(v("2M2")).toBe(2.2e6);
    expect(v("100R")).toBe(100);
    expect(decodeSmd("4R7")).toMatchObject({ kind: "R" });
    expect(decodeSmd("4K7")).toMatchObject({ kind: "RKM" });
  });
  it("EIA-96", () => {
    expect(v("01C")).toBe(10000);
    expect(v("68X")).toBe(49.9);
    expect(v("01A")).toBe(100);
    expect(v("96F")).toBe(97.6e6);
    expect(v("01Y")).toBe(1);
    expect(v("01R")).toBe(1);
    expect(v("51D")).toBe(332000);
    expect(v("44H")).toBe(2800);
    expect(v("30Z")).toBe(0.2);
    expect(v(" 68x ")).toBe(49.9);
    expect(decodeSmd("68X")).toMatchObject({ kind: "EIA96", tolerance: 1 });
    expect(decodeSmd("47R")).toMatchObject({ kind: "EIA96" });
    expect((decodeSmd("47R") as { note?: string }).note).toContain("47 Ω");
  });
  it("errors", () => {
    expect(decodeSmd("").ok).toBe(false);
    expect(decodeSmd("97C").ok).toBe(false);
    expect(decodeSmd("00C").ok).toBe(false);
    expect(decodeSmd("12345").ok).toBe(false);
    expect(decodeSmd("4R7R").ok).toBe(false);
    expect(decodeSmd("R").ok).toBe(false);
    expect(decodeSmd("XYZ").ok).toBe(false);
  });
});

describe("quiz", () => {
  it("random resistors are valid and deterministic with a seed", () => {
    const rng = seeded(42);
    for (let i = 0; i < 300; i++) {
      const q = randomResistor(rng);
      const d = decodeBands(q.bands, q.bandCount);
      expect(d.ok).toBe(true);
      expect(d.value).toBe(q.value);
      expect(standardSeries(q.value)).toBeDefined();
    }
    expect(randomResistor(seeded(7))).toEqual(randomResistor(seeded(7)));
  });
  it("random targets are representable", () => {
    const rng = seeded(3);
    for (let i = 0; i < 100; i++) {
      expect(valueBands(randomTarget(4, rng), 4)).not.toBeNull();
      expect(valueBands(randomTarget(5, rng), 5)).not.toBeNull();
    }
  });
  it("grading", () => {
    const item = { bandCount: 4 as const, bands: B("yellow violet red gold"), value: 4700, tolerance: 5 };
    expect(gradeQuiz(item, 4700, 5).correct).toBe(true);
    expect(gradeQuiz(item, parseResistance("4k7"), 5).correct).toBe(true);
    expect(gradeQuiz(item, 470, 5)).toMatchObject({ valueOk: false, tolOk: true, correct: false });
    expect(gradeQuiz(item, 4700, 10)).toMatchObject({ valueOk: true, tolOk: false });
    expect(gradeQuiz(item, NaN, 5).correct).toBe(false);
  });
});

describe("lab module checks", () => {
  const base = {
    mode: "read",
    bandCount: 4,
    bands: ["yellow", "violet", "red", "gold"],
    value: 4700,
    tolerance: 5,
    isStandard: true,
    series: "E12",
    quiz: { correct: 3, attempts: 4, streak: 2 },
    smd: { code: "68X", value: 49.9 },
  } as ColorCodeState;
  const c = lab.checks;
  it("valueEquals", () => {
    expect(c.valueEquals.fn(base, { target: 4700 })).toBe(true);
    expect(c.valueEquals.fn(base, { target: 4700, bandCount: 4 })).toBe(true);
    expect(c.valueEquals.fn(base, { target: 4700, bandCount: 5 })).toBe(false);
    expect(c.valueEquals.fn(base, { target: 4704 })).toBe(true);
    expect(c.valueEquals.fn(base, { target: 4710 })).toBe(false);
    expect(c.valueEquals.fn({ ...base, value: 0 }, { target: 0 })).toBe(true);
  });
  it("toleranceEquals / quiz / smd", () => {
    expect(c.toleranceEquals.fn(base, { percent: 5 })).toBe(true);
    expect(c.toleranceEquals.fn(base, { percent: 1 })).toBe(false);
    expect(c.quizStreak.fn(base, { min: 2 })).toBe(true);
    expect(c.quizStreak.fn(base, { min: 5 })).toBe(false);
    expect(c.quizCorrect.fn(base, { min: 3 })).toBe(true);
    expect(c.smdValue.fn(base, { target: 49.9, tol: 0.01 })).toBe(true);
    expect(c.smdValue.fn({ ...base, smd: undefined }, { target: 49.9 })).toBe(false);
    expect(c.valueEquals.fn(null as unknown as ColorCodeState, { target: 1 })).toBe(false);
  });
  it("presets", () => {
    expect(Object.keys(lab.presets)).toEqual(["default", "make", "quiz", "five-band", "smd"]);
  });
});

describe("readouts (lab notebook)", () => {
  const check = (rows: { label: string; value: string }[]) => {
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.length).toBeLessThanOrEqual(10);
    for (const r of rows) {
      expect(typeof r.label).toBe("string");
      expect(r.label.trim().length).toBeGreaterThan(0);
      expect(typeof r.value).toBe("string");
      expect(r.value.trim().length).toBeGreaterThan(0);
    }
  };
  it("non-empty for every preset, never throws", () => {
    for (const key of Object.keys(lab.presets)) {
      const init = initialFor(key);
      const { decoded, series, isStandard } = summarise(init.bands, init.bandCount);
      const smd = decodeSmd(init.smdCode);
      const st: ColorCodeState = {
        mode: init.mode,
        bandCount: init.bandCount,
        bands: [...init.bands],
        value: decoded.ok ? decoded.value : NaN,
        tolerance: decoded.ok ? decoded.tolerance : NaN,
        tempco: decoded.tempco,
        isStandard,
        series,
        quiz: { correct: 0, attempts: 0, streak: 0 },
        smd: smd.ok ? { code: smd.code, value: smd.value } : undefined,
        ...(init.mode === "make" ? { target: init.target, matched: false } : {}),
      };
      const rows = lab.readouts!(st);
      check(rows);
      if (key === "default") {
        expect(rows.find((r) => r.label === "ค่า")?.value).toBe("4.7 kΩ");
        expect(rows.find((r) => r.label === "ค่าผิดพลาด")?.value).toContain("5");
        expect(rows.find((r) => r.label.startsWith("แถบสี"))?.value).toBe("เหลือง–ม่วง–แดง–ทอง");
      }
      if (key === "smd") expect(rows.find((r) => r.label === "ค่า")?.value).toBe("4.7 kΩ");
    }
    // invalid bands never throw
    const bad = lab.readouts!({ mode: "read", bandCount: 4, bands: ["gold", "gold", "gold", "black"], value: NaN, tolerance: NaN, isStandard: false, quiz: { correct: 0, attempts: 0, streak: 0 } });
    expect(bad.find((r) => r.label === "ค่า")?.value).toBe("อ่านไม่ได้");
  });
});
