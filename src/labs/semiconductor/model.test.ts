import { describe, expect, it } from "vitest";
import {
  bjtLoadOn,
  diodeCurrent,
  ledBrightness,
  ledSeriesR,
  presetInputs,
  rectWaveform,
  solveAll,
  solveBjt,
  solveDiode,
  solveLed,
  solveRect,
} from "./model";
import { checks } from "./checks";
import { lab } from "./index";

describe("diode (Shockley)", () => {
  it("Si, 5 V, 1 kΩ → Vd ≈ 0.6925 V, Id ≈ 4.3075 mA", () => {
    // Vd = Vt·ln(Id/Is) = 0.02585·ln(4.3075e-3 / 1e-14) = 0.69249 V
    const s = solveDiode("si", 5, 1000);
    expect(s.Vd).toBeCloseTo(0.6925, 3);
    expect(s.Id).toBeCloseTo(4.3075e-3, 6);
    expect(s.bias).toBe("forward");
    // KVL closes
    expect(s.Id * 1000 + s.Vd).toBeCloseTo(5, 9);
  });
  it("Si knee is 0.6–0.75 V over 1–20 mA", () => {
    expect(solveDiode("si", 1.7, 1000).Vd).toBeGreaterThan(0.6);
    expect(solveDiode("si", 10, 470).Vd).toBeLessThan(0.75);
  });
  it("Ge and Schottky drop less than Si", () => {
    const si = solveDiode("si", 5, 1000).Vd;
    const ge = solveDiode("ge", 5, 1000).Vd;
    const sc = solveDiode("schottky", 5, 1000).Vd;
    expect(ge).toBeLessThan(sc);
    expect(sc).toBeLessThan(si);
    expect(ge).toBeGreaterThan(0.15);
  });
  it("reverse bias → leakage ≈ 0, full Vs across the diode", () => {
    const s = solveDiode("si", -5, 1000);
    expect(s.bias).toBe("reverse");
    expect(Math.abs(s.Id)).toBeLessThan(1e-12);
    expect(s.Vd).toBeCloseTo(-5, 6);
    expect(diodeCurrent("si", -1)).toBeCloseTo(-1e-14, 20);
  });
});

describe("LED (piecewise)", () => {
  it("red, 5 V, 150 Ω → 20 mA, ok, full brightness", () => {
    const s = solveLed("red", 5, 150);
    expect(s.Vf).toBe(2.0);
    expect(s.If).toBeCloseTo(0.02, 9);
    expect(s.status).toBe("ok");
    expect(ledBrightness(s)).toBeCloseTo(1, 9);
  });
  it("R = (Vs − Vf)/If", () => {
    expect(ledSeriesR(5, 2.0, 0.02)).toBeCloseTo(150, 9);
    expect(ledSeriesR(12, 3.1, 0.02)).toBeCloseTo(445, 9);
  });
  it("> 30 mA burns, 30 mA does not", () => {
    expect(solveLed("red", 5, 100).status).toBe("ok"); // exactly 30 mA
    const b = solveLed("red", 5, 68); // 44 mA
    expect(b.status).toBe("burnt");
    expect(b.If).toBe(0);
    // stays burnt (latched) even after R is raised
    expect(solveLed("red", 5, 1000, true).status).toBe("burnt");
  });
  it("reverse or below Vf → off, no current", () => {
    expect(solveLed("red", -5, 150)).toMatchObject({ If: 0, status: "off" });
    expect(solveLed("blue", 2.5, 150)).toMatchObject({ If: 0, status: "off" });
    expect(ledBrightness(solveLed("red", -5, 150))).toBe(0);
  });
  it("small current is dim", () => {
    expect(solveLed("red", 5, 3000).status).toBe("dim"); // 1 mA
  });
});

describe("rectifier", () => {
  const VP = 12 * Math.SQRT2; // 16.9706 V
  it("bridge 12 V, no C: Vp = 15.57 V, Vdc = 0.636·Vp = 9.903 V", () => {
    const s = solveRect("bridge", 12, 1000, 0);
    expect(s.Vp).toBeCloseTo(VP - 1.4, 6);
    expect(s.Vdc).toBeCloseTo(9.903, 3);
  });
  it("half-wave 12 V: Vp = 16.27 V, Vdc = 0.318·Vp = 5.174 V", () => {
    const s = solveRect("half", 12, 1000, 0);
    expect(s.Vp).toBeCloseTo(16.2706, 4);
    expect(s.Vdc).toBeCloseTo(5.174, 3);
  });
  it("centre-tap: one diode drop", () => {
    expect(solveRect("center-tap", 12, 1000, 0).Vp).toBeCloseTo(16.2706, 4);
  });
  it("bridge + 1000 µF, 1 kΩ: ripple = I/(100·C) = 0.1557 V", () => {
    const s = solveRect("bridge", 12, 1000, 1000e-6);
    expect(s.ripple).toBeCloseTo(0.155706, 5);
    expect(s.Vdc).toBeCloseTo(15.4927, 3);
  });
  it("half-wave ripple uses 50 Hz (twice the full-wave ripple)", () => {
    const h = solveRect("half", 12, 1000, 1000e-6);
    expect(h.ripple).toBeCloseTo(16.2706 / 1000 / (50 * 1e-3), 4);
  });
  it("waveform: never negative, peak = Vp; filtered ripple ≈ formula", () => {
    const w = rectWaveform("bridge", 12, 1000, 0);
    expect(Math.min(...w.map((p) => p.vout))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...w.map((p) => p.vout))).toBeCloseTo(VP - 1.4, 1);
    const f = rectWaveform("bridge", 12, 1000, 1000e-6, 2, 4000);
    const vs = f.map((p) => p.vout);
    const pp = Math.max(...vs) - Math.min(...vs);
    expect(pp).toBeGreaterThan(0.1);
    expect(pp).toBeLessThan(0.16);
  });
  it("half-wave output is zero in the negative half-cycle", () => {
    const w = rectWaveform("half", 12, 1000, 0, 2, 400);
    expect(w[150].vout).toBe(0); // t = 7.5 ms
  });
});

describe("BJT switch", () => {
  it("preset: Ib = 0.43 mA, Ic = 11.8 mA (saturation), Vce = 0.2 V", () => {
    const s = solveBjt(12, 5, 10000, 1000, 100);
    expect(s.Ib).toBeCloseTo(0.43e-3, 9);
    expect(s.Ic).toBeCloseTo(11.8e-3, 9);
    expect(s.Vce).toBeCloseTo(0.2, 9);
    expect(s.region).toBe("saturation");
  });
  it("Vin < 0.7 V → cutoff, Vce = Vcc", () => {
    expect(solveBjt(12, 0.5, 10000, 1000, 100)).toMatchObject({ Ib: 0, Ic: 0, Vce: 12, region: "cutoff" });
  });
  it("active: Vin 1.7 V, Rb 100 kΩ → Ib 10 µA, Ic 1 mA, Vce 11 V", () => {
    const s = solveBjt(12, 1.7, 100000, 1000, 100);
    expect(s.region).toBe("active");
    expect(s.Ic).toBeCloseTo(1e-3, 9);
    expect(s.Vce).toBeCloseTo(11, 9);
  });
  it("LED load: Ic(sat) = (12 − 0.2 − 2.0)/1 kΩ = 9.8 mA; relay pull-in", () => {
    expect(solveBjt(12, 5, 10000, 1000, 100, "led").Ic).toBeCloseTo(9.8e-3, 9);
    expect(bjtLoadOn(solveBjt(12, 5, 10000, 400, 100, "relay"))).toBe(true);
    expect(bjtLoadOn(solveBjt(12, 1.2, 100000, 400, 100, "relay"))).toBe(false);
  });
});

describe("presets & checks", () => {
  const st = (p: string) => solveAll(presetInputs(p));
  const c = checks;
  it("default diode forward", () => {
    expect(st("default").tab).toBe("diode");
    expect(c.diodeForward.fn(st("default"), {})).toBe(true);
    expect(c.diodeReverse.fn(st("default"), {})).toBe(false);
  });
  it("led preset in range", () => {
    expect(c.ledCurrentInRange.fn(st("led"), { min: 0.015, max: 0.025 })).toBe(true);
    expect(c.ledBurnt.fn(st("led"), {})).toBe(false);
  });
  it("rectifier / filter", () => {
    expect(c.rectifierType.fn(st("rectifier"), { type: "bridge" })).toBe(true);
    expect(c.rippleBelow.fn(st("rectifier"), { max: 1 })).toBe(false);
    expect(c.rippleBelow.fn(st("filter"), { max: 0.5 })).toBe(true);
  });
  it("bjt saturation", () => {
    expect(c.bjtRegion.fn(st("bjt"), { region: "saturation" })).toBe(true);
  });
  it("unknown preset → default", () => {
    expect(presetInputs("nope")).toEqual(presetInputs("default"));
  });
  it("bad state never throws", () => {
    for (const k of Object.keys(c)) expect(c[k].fn(null as never, {})).toBe(false);
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
  it("non-empty for every preset (all tabs), never throws", () => {
    for (const key of Object.keys(lab.presets)) check(lab.readouts!(solveAll(presetInputs(key))));
    const d = lab.readouts!(solveAll(presetInputs("default")));
    expect(d.find((r) => r.label === "I_D")?.value).toBe("4.31 mA");
    expect(lab.readouts!(solveAll(presetInputs("led"))).find((r) => r.label === "I_F")?.value).toBe("20 mA");
    expect(lab.readouts!(solveAll(presetInputs("bjt"))).find((r) => r.label === "ย่านทำงาน")?.value).toBe("อิ่มตัว");
    expect(lab.readouts!(solveAll(presetInputs("filter"))).find((r) => r.label === "C กรอง")?.value).toBe("1 mF");
  });
});
