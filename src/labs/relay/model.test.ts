import { describe, expect, it } from "vitest";
import { nextEnergized, presetInputs, solve, solveDriver, spikeVoltage, thresholds, type RelayInputs, type RelayState } from "./model";
import { lab } from "./index";

const run = (steps: Partial<RelayInputs>[], base: RelayInputs = presetInputs("default")) => {
  let inp = base;
  let s: RelayState = solve(inp);
  for (const st of steps) {
    inp = { ...inp, ...st };
    s = solve(inp, s);
  }
  return s;
};

describe("thresholds & hysteresis", () => {
  it("12 V rated: pick-up 9 V, drop-out 1.2 V", () => {
    const t = thresholds(12);
    expect(t.pickUp).toBeCloseTo(9, 9);
    expect(t.dropOut).toBeCloseTo(1.2, 9);
  });
  it("pulls in only at ≥ 9 V, releases only at ≤ 1.2 V", () => {
    expect(nextEnergized(false, 8.9)).toBe(false);
    expect(nextEnergized(false, 9)).toBe(true);
    expect(nextEnergized(true, 5)).toBe(true);
    expect(nextEnergized(true, 1.3)).toBe(true);
    expect(nextEnergized(true, 1.2)).toBe(false);
  });
  it("undervoltage sweep 0 → 15 → 0 V shows the hysteresis loop", () => {
    const base = presetInputs("undervoltage");
    expect(solve(base).energized).toBe(false);
    expect(run([{ supplyV: 8.5 }], base).energized).toBe(false);
    expect(run([{ supplyV: 8.5 }, { supplyV: 9 }], base).energized).toBe(true);
    expect(run([{ supplyV: 12 }, { supplyV: 3 }], base).energized).toBe(true);
    const off = run([{ supplyV: 12 }, { supplyV: 3 }, { supplyV: 1 }], base);
    expect(off.energized).toBe(false);
    expect(off.lampNC).toBe(true);
  });
});

describe("basic mode", () => {
  it("12 V / 400 Ω → 30 mA, NO lamp on, NC lamp off", () => {
    const s = run([{ switchOn: true }]);
    expect(s.coilI).toBeCloseTo(0.03, 9);
    expect(s.coilP).toBeCloseTo(0.36, 9);
    expect(s.energized).toBe(true);
    expect(s.lampNO).toBe(true);
    expect(s.lampNC).toBe(false);
  });
  it("switch open → no coil current, NC lamp on", () => {
    const s = solve(presetInputs("default"));
    expect(s.coilI).toBe(0);
    expect(s.lampNC).toBe(true);
    expect(s.lampNO).toBe(false);
  });
  it("switch-off spike: 12 + 0.03·10k = 312 V without diode, 12.7 V with diode", () => {
    expect(run([{ switchOn: true }, { switchOn: false }]).lastSpikeV).toBeCloseTo(312, 6);
    expect(run([{ flyback: true }, { switchOn: true }, { switchOn: false }]).lastSpikeV).toBeCloseTo(12.7, 6);
    expect(spikeVoltage(0, 12, false)).toBe(0);
  });
  it("lowering the supply slider is not a switch-off spike", () => {
    expect(run([{ switchOn: true }, { supplyV: 0 }]).lastSpikeV).toBe(0);
  });
});

describe("NPN driver", () => {
  it("Vin 5 V, R_B 1 kΩ: I_B 4.3 mA, βI_B 430 mA ≥ 29.5 mA → saturated", () => {
    const d = solveDriver(12, 400, 5, 1000);
    expect(d.Ib).toBeCloseTo(0.0043, 9);
    expect(d.IcMax).toBeCloseTo(0.43, 9);
    expect(d.IcNeeded).toBeCloseTo(0.0295, 9);
    expect(d.saturated).toBe(true);
    expect(d.Vce).toBeCloseTo(0.2, 9);
    const s = solve(presetInputs("driver"));
    expect(s.energized).toBe(true);
    expect(s.coilI).toBeCloseTo(0.0295, 9);
  });
  it("R_B 47 kΩ: I_B 91.5 µA → Ic 9.15 mA, coil 3.66 V < 9 V → does not pull in", () => {
    const d = solveDriver(12, 400, 5, 47000);
    expect(d.Ib).toBeCloseTo(4.3 / 47000, 12);
    expect(d.saturated).toBe(false);
    expect(d.Ic).toBeCloseTo(0.0091489, 6);
    const s = solve({ ...presetInputs("driver"), rb: 47000 });
    expect(s.energized).toBe(false);
    expect(s.lampNC).toBe(true);
  });
  it("Vin 0 V → transistor off, no current", () => {
    const s = solve({ ...presetInputs("driver"), switchOn: false });
    expect(s.driver?.Ib).toBe(0);
    expect(s.coilI).toBe(0);
    expect(s.energized).toBe(false);
  });
  it("transistor turning off gives a collector spike 12 + 29.5 mA·10k = 307 V", () => {
    const s = run([{ switchOn: false }], presetInputs("driver"));
    expect(s.lastSpikeV).toBeCloseTo(307, 6);
  });
});

describe("latch (self-holding) mode", () => {
  const L = presetInputs("latch");
  it("START → energised; release START → stays latched via 21–24", () => {
    expect(solve(L).energized).toBe(false);
    const a = run([{ startPressed: true }], L);
    expect(a.energized).toBe(true);
    expect(a.latched).toBe(false);
    const b = run([{ startPressed: true }, { startPressed: false }], L);
    expect(b.energized).toBe(true);
    expect(b.latched).toBe(true);
    expect(b.coilI).toBeCloseTo(0.03, 9);
  });
  it("STOP releases and the relay stays off after STOP is released", () => {
    const s = run([{ startPressed: true }, { startPressed: false }, { stopPressed: true }, { stopPressed: false }], L);
    expect(s.energized).toBe(false);
    expect(s.latched).toBe(false);
    expect(s.lastSpikeV).toBeCloseTo(312, 6);
  });
  it("overload trip (95–96 opens) drops the relay; START does nothing while tripped", () => {
    expect(run([{ startPressed: true }, { startPressed: false }, { olTripped: true }], L).energized).toBe(false);
    expect(run([{ olTripped: true }, { startPressed: true }], L).energized).toBe(false);
  });
  it("START at 8 V (below pick-up) does not latch", () => {
    expect(run([{ supplyV: 8 }, { startPressed: true }, { startPressed: false }], L).energized).toBe(false);
  });
});

describe("module checks", () => {
  const c = lab.checks;
  it("evaluate the contract", () => {
    const on = run([{ switchOn: true }]);
    expect(c.lampOn.fn(on, { which: "NO" })).toBe(true);
    expect(c.lampOn.fn(on, { which: "NC" })).toBe(false);
    expect(c.energized.fn(on, { value: true })).toBe(true);
    expect(c.energized.fn(on, { value: false })).toBe(false);
    expect(c.coilCurrentEquals.fn(on, { target: 0.03 })).toBe(true);
    expect(c.coilCurrentEquals.fn(on, { target: 0.02 })).toBe(false);
    expect(c.flybackEnabled.fn(on, {})).toBe(false);
    expect(c.transistorSaturated.fn(on, {})).toBe(false);
    expect(c.transistorSaturated.fn(solve(presetInputs("driver")), {})).toBe(true);
    const L = presetInputs("latch");
    expect(c.latched.fn(run([{ startPressed: true }, { startPressed: false }], L), {})).toBe(true);
    expect(c.latched.fn(run([{ startPressed: true }], L), {})).toBe(false);
  });
  it("has all presets; unknown preset → default", () => {
    expect(Object.keys(lab.presets).sort()).toEqual(["default", "driver", "latch", "undervoltage"]);
    expect(presetInputs("nope")).toEqual(presetInputs("default"));
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
    for (const key of Object.keys(lab.presets)) check(lab.readouts!(solve(presetInputs(key))));
    const rows = lab.readouts!(solve({ ...presetInputs("default"), switchOn: true }));
    expect(rows.find((r) => r.label === "I คอยล์")?.value).toBe("30 mA");
    expect(rows.find((r) => r.label === "คอยล์")?.value).toContain("ทำงาน");
    expect(lab.readouts!(solve(presetInputs("driver"))).some((r) => r.label === "ทรานซิสเตอร์")).toBe(true);
  });
});
