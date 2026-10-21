import { describe, expect, it } from "vitest";
import {
  analyzeCombo,
  buildState,
  energy,
  icAt,
  parallelC,
  percentAfterTau,
  percentOf,
  rcSnapshot,
  seriesC,
  timeConstant,
  timeToPercent,
  vcAt,
} from "./model";
import { lab } from "./index";
import { presetConfig } from "./model";
import { formatSI } from "../shared/format";

describe("time constant", () => {
  it("τ = RC", () => {
    expect(timeConstant(10e3, 100e-6)).toBeCloseTo(1, 12); // default preset
    expect(timeConstant(1e6, 10e-6)).toBeCloseTo(10, 12); // slow preset
    expect(timeConstant(100, 1e-6)).toBeCloseTo(1e-4, 15);
  });
});

describe("charging from 0 V (V = 9 V, R = 10 kΩ, C = 100 µF, τ = 1 s)", () => {
  it("v_C(t) = V(1 − e^(−t/τ))", () => {
    expect(vcAt("charge", 9, 0, 0, 1)).toBe(0);
    expect(vcAt("charge", 9, 0, 1, 1)).toBeCloseTo(5.689085, 5); // 9 × 0.632121
    expect(vcAt("charge", 9, 0, 2, 1)).toBeCloseTo(7.781982, 5); // 9 × 0.864665
    expect(vcAt("charge", 9, 0, 5, 1)).toBeCloseTo(8.939358, 5); // 9 × 0.993262
  });
  it("i(t) = (V/R)·e^(−t/τ)", () => {
    expect(icAt("charge", 9, 0, 0, 10e3, 1)).toBeCloseTo(0.9e-3, 12);
    expect(icAt("charge", 9, 0, 1, 10e3, 1)).toBeCloseTo(3.310915e-4, 9);
  });
  it("63.2 % at 1τ and 99.3 % at 5τ", () => {
    expect(percentAfterTau(1)).toBeCloseTo(63.212, 3);
    expect(percentAfterTau(5)).toBeCloseTo(99.326, 3);
    expect(percentOf("charge", 9, 0, vcAt("charge", 9, 0, 1, 1))).toBeCloseTo(63.212, 3);
  });
  it("time to reach a percentage", () => {
    expect(timeToPercent(50, 1)).toBeCloseTo(0.693147, 6); // ln 2
    expect(timeToPercent(63.212056, 2)).toBeCloseTo(2, 5);
    expect(timeToPercent(100, 1)).toBe(Infinity);
  });
  it("never exceeds V and current never reverses", () => {
    for (const t of [0, 0.1, 1, 3, 10, 100]) {
      const v = vcAt("charge", 9, 0, t, 1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(9);
      expect(icAt("charge", 9, 0, t, 10e3, 1)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("discharging (v0 = 9 V through 10 kΩ, τ = 1 s)", () => {
  it("v_C(t) = V0·e^(−t/τ), i negative", () => {
    expect(vcAt("discharge", 9, 9, 1, 1)).toBeCloseTo(3.310915, 5);
    expect(vcAt("discharge", 9, 9, 5, 1)).toBeCloseTo(0.060642, 5);
    expect(icAt("discharge", 9, 9, 0, 10e3, 1)).toBeCloseTo(-0.9e-3, 12);
    expect(icAt("discharge", 9, 9, 1, 10e3, 1)).toBeCloseTo(-3.310915e-4, 9);
  });
  it("remaining percent relative to v0", () => {
    expect(percentOf("discharge", 9, 9, 3.310915)).toBeCloseTo(36.788, 2);
    expect(percentOf("discharge", 9, 0, 0)).toBe(0);
  });
  it("partial charge then charge again continues from v0", () => {
    // 4 V on the capacitor, charge to 9 V: v(1τ) = 9 − 5·e^-1 = 7.160603
    expect(vcAt("charge", 9, 4, 1, 1)).toBeCloseTo(7.160603, 5);
    expect(icAt("charge", 9, 4, 0, 10e3, 1)).toBeCloseTo(0.5e-3, 12);
  });
});

describe("combinations", () => {
  it("series: 1/Ceq = Σ 1/Ck, equal Q, V shared inversely to C", () => {
    expect(seriesC([100e-6, 220e-6])).toBeCloseTo(68.75e-6, 12);
    expect(seriesC([10e-6, 10e-6, 10e-6])).toBeCloseTo(3.333333e-6, 11);
    const r = analyzeCombo("series", [100e-6, 220e-6], 9);
    expect(r.Ceq).toBeCloseTo(68.75e-6, 12);
    expect(r.Q[0]).toBeCloseTo(618.75e-6, 12);
    expect(r.Q[1]).toBeCloseTo(618.75e-6, 12);
    expect(r.Vk[0]).toBeCloseTo(6.1875, 9);
    expect(r.Vk[1]).toBeCloseTo(2.8125, 9);
    expect(r.Vk[0] + r.Vk[1]).toBeCloseTo(9, 9);
  });
  it("parallel: Ceq = Σ Ck, same V", () => {
    expect(parallelC([100e-6, 220e-6, 470e-6])).toBeCloseTo(790e-6, 12);
    const r = analyzeCombo("parallel", [100e-6, 220e-6, 470e-6], 9);
    expect(r.Vk).toEqual([9, 9, 9]);
    expect(r.Q[2]).toBeCloseTo(4.23e-3, 12);
    expect(r.Qtotal).toBeCloseTo(7.11e-3, 12);
  });
});

describe("energy & snapshot", () => {
  it("½CV²", () => {
    expect(energy(100e-6, 9)).toBeCloseTo(4.05e-3, 12);
  });
  it("clamps inputs to the lab ranges and keeps values physical", () => {
    const s = rcSnapshot({ V: 99, R: 1, C: 1, mode: "charge", v0: 0, t: -5 });
    expect(s.V).toBe(24);
    expect(s.R).toBe(100);
    expect(s.C).toBeCloseTo(4700e-6, 12);
    expect(s.t).toBe(0);
    expect(s.vc).toBe(0);
  });
});

describe("checks", () => {
  const base = buildState({ V: 9, R: 10e3, C: 100e-6, mode: "charge", v0: 0, t: 1 }, { type: "series", C: [100e-6, 220e-6] }, "rc");
  it("tauEquals", () => {
    expect(lab.checks.tauEquals.fn(base, { target: 1 })).toBe(true);
    expect(lab.checks.tauEquals.fn(base, { target: 10 })).toBe(false);
  });
  it("reachedPercent", () => {
    expect(lab.checks.reachedPercent.fn(base, { percent: 63 })).toBe(true);
    expect(lab.checks.reachedPercent.fn(base, { percent: 90 })).toBe(false);
    expect(lab.checks.reachedPercent.fn(base, { percent: 63, mode: "discharge" })).toBe(false);
    const d = buildState({ V: 9, R: 10e3, C: 100e-6, mode: "discharge", v0: 9, t: 1 }, { type: "series", C: [100e-6] }, "rc");
    expect(lab.checks.reachedPercent.fn(d, { percent: 37, mode: "discharge" })).toBe(true);
    expect(lab.checks.reachedPercent.fn(d, { percent: 30, mode: "discharge" })).toBe(false);
  });
  it("setRC", () => {
    expect(lab.checks.setRC.fn(base, { R: 10e3, C: 100e-6 })).toBe(true);
    expect(lab.checks.setRC.fn(base, { R: 1e6, C: 10e-6 })).toBe(false);
  });
  it("comboEquals", () => {
    expect(lab.checks.comboEquals.fn(base, { target: 68.75e-6 })).toBe(true);
    expect(lab.checks.comboEquals.fn(base, { target: 68.75e-6, type: "parallel" })).toBe(false);
    expect(lab.checks.comboEquals.fn(base, { target: 320e-6 })).toBe(false);
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
  it("non-empty for every preset (rc and combo tabs), never throws", () => {
    for (const key of Object.keys(lab.presets)) {
      const c = presetConfig(key);
      const st = buildState({ V: c.V, R: c.R, C: c.C, mode: c.mode, v0: 0, t: c.R * c.C }, { type: c.comboType, C: c.comboC }, c.tab);
      const rows = lab.readouts!(st);
      check(rows);
      if (c.tab === "rc") expect(rows.find((r) => r.label === "τ = RC")?.value).toBe(formatSI(c.R * c.C, "s"));
      else expect(rows.find((r) => r.label === "C_eq")).toBeTruthy();
    }
    const d = presetConfig("default");
    const rows = lab.readouts!(buildState({ V: 9, R: d.R, C: d.C, mode: "charge", v0: 0, t: 1 }, { type: "series", C: d.comboC }, "rc"));
    expect(rows.find((r) => r.label === "% ของ V")?.value).toBe("63.2 %");
  });
});
