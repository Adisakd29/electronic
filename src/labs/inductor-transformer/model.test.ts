import { describe, expect, it } from "vitest";
import {
  computeInductor,
  computeTransformer,
  computeState,
  presetInputs,
  fieldLineCount,
  rlCurrent,
  rlInductorVoltage,
  stepType,
  isShortCoil,
  shortCoilFactor,
  DEFAULT_INDUCTOR,
} from "./model";
import { lab } from "./index";
import type { LabState } from "./model";

describe("solenoid inductance and field", () => {
  it("default: 200 turns, 5 cm, Ø1 cm, air → L ≈ 78.96 µH", () => {
    const s = computeInductor(DEFAULT_INDUCTOR);
    // A = π·(0.01)²/4 = 7.853 98e-5 m²
    expect(s.A).toBeCloseTo(7.85398e-5, 9);
    // L = 4π·1e-7 · 200² · 7.85398e-5 / 0.05 = 7.8957e-5 H
    expect(s.L).toBeCloseTo(7.8957e-5, 8);
    // B = 4π·1e-7 · 200 · 1 A / 0.05 = 5.0265 mT
    expect(s.B).toBeCloseTo(5.0265e-3, 6);
    // X_L = 2π·1000·7.8957e-5 = 0.4961 Ω
    expect(s.XL).toBeCloseTo(0.4961, 4);
    // τ = L/R = 7.8957 µs
    expect(s.tau).toBeCloseTo(7.8957e-6, 9);
  });

  it("iron core multiplies L by μr = 1000 → 78.96 mH, X_L(50 Hz) ≈ 24.80 Ω", () => {
    const s = computeInductor({ ...DEFAULT_INDUCTOR, core: "iron", f: 50, I: 0.2 });
    expect(s.mur).toBe(1000);
    expect(s.L).toBeCloseTo(0.078957, 5);
    expect(s.XL).toBeCloseTo(24.805, 2);
    expect(s.B).toBeCloseTo(1.00531, 4);
  });

  it("ferrite μr = 200", () => {
    expect(computeInductor({ ...DEFAULT_INDUCTOR, core: "ferrite" }).L).toBeCloseTo(0.0157914, 6);
  });

  it("L ∝ N² and ∝ 1/l", () => {
    const a = computeInductor(DEFAULT_INDUCTOR).L;
    expect(computeInductor({ ...DEFAULT_INDUCTOR, N: 400 }).L / a).toBeCloseTo(4, 10);
    expect(computeInductor({ ...DEFAULT_INDUCTOR, l: 0.1 }).L / a).toBeCloseTo(0.5, 10);
  });

  it("short-coil flag and correction factor", () => {
    expect(isShortCoil(0.01, 0.05)).toBe(true);
    expect(isShortCoil(0.01, 0.2)).toBe(false);
    // 1/(1+0.45·0.2) = 0.917 43
    expect(shortCoilFactor(0.01, 0.05)).toBeCloseTo(0.91743, 5);
  });

  it("field-line density grows with B and is 0 with no current", () => {
    expect(fieldLineCount(0)).toBe(0);
    expect(fieldLineCount(1e-3)).toBeLessThan(fieldLineCount(1e-1));
    expect(fieldLineCount(100)).toBe(9);
  });
});

describe("RL switch-on", () => {
  it("rl-time preset: L ≈ 0.987 H, R 100 Ω → τ ≈ 9.87 ms; i(τ) = 63.2 % of V/R", () => {
    const s = computeState(presetInputs("rl-time")).inductor;
    // L = 4π·1e-7·1000·500²·π·0.02²/4 / 0.1 = 0.986 96 H
    expect(s.L).toBeCloseTo(0.98696, 4);
    expect(s.tau).toBeCloseTo(9.8696e-3, 6);
    expect(rlCurrent(12, 100, s.tau, s.tau)).toBeCloseTo(0.12 * 0.632121, 6);
    expect(rlCurrent(12, 100, s.tau, 5 * s.tau)).toBeCloseTo(0.12 * 0.993262, 6);
    expect(rlCurrent(12, 100, s.tau, 0)).toBe(0);
    expect(rlInductorVoltage(12, s.tau, s.tau)).toBeCloseTo(12 * 0.3678794, 5);
  });
});

describe("ideal transformer", () => {
  it("transformer preset: 230 V, 1000:52, 12 Ω", () => {
    const t = computeState(presetInputs("transformer")).transformer;
    expect(t.Vs).toBeCloseTo(11.96, 6); // 230·52/1000
    expect(t.Is).toBeCloseTo(0.996667, 5); // 11.96/12
    expect(t.Ps).toBeCloseTo(11.920133, 5);
    expect(t.Pp).toBeCloseTo(11.920133, 5);
    expect(t.Ip).toBeCloseTo(0.0518267, 6); // = Is·Ns/Np
    expect(t.Ip).toBeCloseTo((t.Is * 52) / 1000, 10);
    expect(t.ratio).toBeCloseTo(19.2308, 4);
    expect(t.type).toBe("step-down");
    expect(t.Vtest).toBeCloseTo(218.04, 6); // subtractive: 230 − 11.96
  });

  it("step-up preset: 12 V, 100:400, 1 kΩ", () => {
    const t = computeState(presetInputs("step-up")).transformer;
    expect(t.Vs).toBeCloseTo(48, 9);
    expect(t.Is).toBeCloseTo(0.048, 9);
    expect(t.Ps).toBeCloseTo(2.304, 9);
    expect(t.Ip).toBeCloseTo(0.192, 9);
    expect(t.ratio).toBeCloseTo(0.25, 9);
    expect(t.type).toBe("step-up");
  });

  it("efficiency 90 % raises primary power/current", () => {
    const t = computeTransformer({ Np: 1000, Ns: 52, Vp: 230, Rload: 12, eta: 0.9, polarity: "additive" });
    expect(t.Pp).toBeCloseTo(13.24459, 4); // 11.920133/0.9
    expect(t.Ip).toBeCloseTo(0.0575852, 6);
    expect(t.Ploss).toBeCloseTo(1.324459, 5);
    expect(t.Vtest).toBeCloseTo(241.96, 6); // additive
  });

  it("open secondary → no current, no power", () => {
    const t = computeTransformer({ Np: 200, Ns: 200, Vp: 24, Rload: Infinity, eta: 1, polarity: "subtractive" });
    expect(t.Vs).toBe(24);
    expect(t.Is).toBe(0);
    expect(t.Ip).toBe(0);
    expect(t.type).toBe("isolation");
    expect(stepType(100, 50)).toBe("step-down");
  });
});

describe("checks", () => {
  const st = (p: string) => computeState(presetInputs(p)) as LabState;
  const c = lab.checks;
  it("evaluate against presets", () => {
    expect(c.inductanceEquals.fn(st("default"), { target: 79e-6 })).toBe(true);
    expect(c.inductanceEquals.fn(st("default"), { target: 100e-6 })).toBe(false);
    expect(c.xlEquals.fn(st("iron-core"), { target: 24.8 })).toBe(true);
    expect(c.tauEquals.fn(st("rl-time"), { target: 0.00987 })).toBe(true);
    expect(c.turnsRatio.fn(st("transformer"), { ratio: 19.23 })).toBe(true);
    expect(c.secondaryVoltage.fn(st("transformer"), { target: 12 })).toBe(true);
    expect(c.secondaryCurrent.fn(st("transformer"), { target: 1 })).toBe(true);
    expect(c.stepType.fn(st("step-up"), { type: "step-up" })).toBe(true);
    expect(c.stepType.fn(st("transformer"), { type: "step-up" })).toBe(false);
  });
  it("unknown preset falls back to default", () => {
    expect(presetInputs("nope")).toEqual(presetInputs("default"));
  });
  it("garbage state does not throw", () => {
    expect(c.inductanceEquals.fn(undefined as unknown as LabState, { target: 1 })).toBe(false);
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
  it("non-empty for every preset (both tabs), never throws", () => {
    for (const key of Object.keys(lab.presets)) {
      const st = computeState(presetInputs(key));
      const rows = lab.readouts!(st);
      check(rows);
      if (st.tab === "inductor") expect(rows.find((r) => r.label === "L")).toBeTruthy();
      else expect(rows.find((r) => r.label === "Vs")).toBeTruthy();
    }
    expect(lab.readouts!(computeState(presetInputs("transformer"))).find((r) => r.label === "Vs")?.value).toBe("12 V");
    const open = computeState({ ...presetInputs("transformer"), transformer: { ...presetInputs("transformer").transformer, Rload: Infinity } });
    expect(lab.readouts!(open).find((r) => r.label === "โหลด")?.value).toBe("เปิดวงจร");
  });
});
