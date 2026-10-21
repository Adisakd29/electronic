import { describe, expect, it } from "vitest";
import {
  compute,
  solve,
  voltmeter,
  lampStatus,
  getPreset,
  PRESETS,
  flowSpeed,
  par,
  addMeasurement,
  diagnose,
  distinctMeasurements,
  faultActive,
  measurementKey,
  randomFault,
  seededRandom,
  symptomFor,
  FAULTS,
  type CircuitInput,
  type Measurement,
} from "./model";
import { checks } from "./checks";
import { circuitReadouts, lab } from "./index";

const inp = (o: Partial<CircuitInput>): CircuitInput => ({
  topology: "series",
  V: 12,
  R: [100, 220, 330],
  lamp: false,
  switchClosed: true,
  fault: "none",
  ...o,
});
const run = (k: string, s: ReturnType<typeof compute>, p: Record<string, number | string | boolean> = {}) => checks[k].fn(s, p);

describe("series", () => {
  it("default preset: 12 V across 100 + 220 + 330 Ω", () => {
    const s = compute(getPreset("default").input);
    expect(s.Req).toBe(650);
    expect(s.I).toBeCloseTo(12 / 650, 12); // 18.4615 mA
    expect(s.VR[0]).toBeCloseTo(1.846154, 5);
    expect(s.VR[1]).toBeCloseTo(4.061538, 5);
    expect(s.VR[2]).toBeCloseTo(6.092308, 5);
    expect(s.IR).toEqual([s.I, s.I, s.I]);
    expect(s.P).toBeCloseTo(0.2215385, 6);
    expect(s.PR[0] + s.PR[1] + s.PR[2]).toBeCloseTo(s.P, 12);
    expect(s.currentLimited).toBe(false);
  });
  it("series-basic: 600 Ω, 20 mA, 2/4/6 V", () => {
    const s = compute(getPreset("series-basic").input);
    expect(s.Req).toBe(600);
    expect(s.I).toBeCloseTo(0.02, 12);
    expect(s.VR.map((v) => +v.toFixed(9))).toEqual([2, 4, 6]);
  });
  it("kvl: 9 V, 1k/2.2k/3.3k — drops sum to the source", () => {
    const s = compute(getPreset("kvl").input);
    expect(s.Req).toBe(6500);
    expect(s.I).toBeCloseTo(1.3846154e-3, 9);
    expect(s.VR[0]).toBeCloseTo(1.384615, 5);
    expect(s.VR[1]).toBeCloseTo(3.046154, 5);
    expect(s.VR[2]).toBeCloseTo(4.569231, 5);
    expect(s.VR[0] + s.VR[1] + s.VR[2]).toBeCloseTo(9, 12);
  });
  it("node potentials fall along the loop", () => {
    const sol = solve(getPreset("series-basic").input);
    expect(sol.node).toMatchObject({ P: 12, A: 12, G: 0 });
    expect(sol.node.B).toBeCloseTo(10, 9);
    expect(sol.node.C).toBeCloseTo(6, 9);
    expect(voltmeter(sol, "B", "C").v).toBeCloseTo(4, 9);
  });
});

describe("parallel", () => {
  it("parallel-basic: 300 ‖ 600 ‖ 600 = 150 Ω, 80 mA", () => {
    const s = compute(getPreset("parallel-basic").input);
    expect(s.Req).toBeCloseTo(150, 9);
    expect(s.I).toBeCloseTo(0.08, 12);
    expect(s.IR[0]).toBeCloseTo(0.04, 12);
    expect(s.IR[1]).toBeCloseTo(0.02, 12);
    expect(s.VR).toEqual([12, 12, 12]);
  });
  it("kcl: 1k ‖ 2k ‖ 4k — 12 + 6 + 3 = 21 mA", () => {
    const s = compute(getPreset("kcl").input);
    expect(s.Req).toBeCloseTo(571.428571, 5);
    expect(s.IR[0]).toBeCloseTo(0.012, 12);
    expect(s.IR[1]).toBeCloseTo(0.006, 12);
    expect(s.IR[2]).toBeCloseTo(0.003, 12);
    expect(s.I).toBeCloseTo(0.021, 12);
  });
  it("open branch carries no current but still sees the supply voltage", () => {
    const s = compute(inp({ topology: "parallel", R: [1000, 2000, 4000], fault: "open2" }));
    expect(s.Req).toBeCloseTo(800, 9); // 1k ‖ 4k
    expect(s.IR[1]).toBe(0);
    expect(s.VR[1]).toBe(12);
    expect(s.PR[1]).toBe(0);
    expect(s.I).toBeCloseTo(0.015, 12);
  });
  it("par() ignores ∞ branches", () => {
    expect(par(Infinity, Infinity)).toBe(Infinity);
    expect(par(10, Infinity)).toBe(10);
  });
});

describe("mixed", () => {
  it("mixed-basic: 100 + (200 ‖ 200) = 200 Ω, 60 mA", () => {
    const sol = solve(getPreset("mixed-basic").input);
    const s = sol.state;
    expect(s.Req).toBeCloseTo(200, 9);
    expect(s.I).toBeCloseTo(0.06, 12);
    expect(s.VR[0]).toBeCloseTo(6, 9);
    expect(s.VR[1]).toBeCloseTo(6, 9);
    expect(s.VR[2]).toBeCloseTo(6, 9);
    expect(s.IR[1]).toBeCloseTo(0.03, 12);
    expect(s.IR[2]).toBeCloseTo(0.03, 12);
    expect(sol.node.B).toBeCloseTo(6, 9);
  });
  it("open3: R2 alone in the parallel part", () => {
    const s = compute(inp({ topology: "mixed", R: [100, 200, 200], fault: "open3" }));
    expect(s.Req).toBe(300);
    expect(s.I).toBeCloseTo(0.04, 12);
    expect(s.IR[2]).toBe(0);
    expect(s.VR[1]).toBeCloseTo(8, 9);
    expect(s.VR[2]).toBeCloseTo(8, 9);
  });
  it("open1: no current, full voltage across the gap", () => {
    const s = compute(inp({ topology: "mixed", R: [100, 200, 200], fault: "open1" }));
    expect(s.Req).toBe(Infinity);
    expect(s.I).toBe(0);
    expect(s.VR).toEqual([12, 0, 0]);
  });
});

describe("switch open", () => {
  it("I = 0 everywhere, Req still the network value", () => {
    const sol = solve(inp({ switchClosed: false }));
    const s = sol.state;
    expect(s.I).toBe(0);
    expect(s.IR).toEqual([0, 0, 0]);
    expect(s.VR).toEqual([0, 0, 0]);
    expect(s.P).toBe(0);
    expect(s.Req).toBe(650);
    expect(s.currentLimited).toBe(false);
    // full source voltage appears across the open switch (P–A)
    expect(voltmeter(sol, "P", "A").v).toBe(12);
    expect(run("switchOpenNoCurrent", s)).toBe(true);
    expect(run("totalCurrent", s, { target: 0 })).toBe(false);
  });
  it("even with a dead short, an open switch gives no current", () => {
    const s = compute(inp({ topology: "single", fault: "short1", switchClosed: false }));
    expect(s.I).toBe(0);
    expect(s.currentLimited).toBe(false);
  });
  it("open switch + open fault: segment between them floats", () => {
    const sol = solve(inp({ fault: "open2", switchClosed: false }));
    expect(sol.floating).toEqual(["A", "B"]);
    expect(voltmeter(sol, "A", "G")).toEqual({ v: 0, floating: true });
    expect(voltmeter(sol, "P", "G").v).toBe(12);
    expect(sol.state.VR).toEqual([0, 0, 0]);
  });
});

describe("open faults", () => {
  it("fault-open (open2, series): I = 0, 12 V across R2 only", () => {
    const sol = solve(getPreset("fault-open").input);
    const s = sol.state;
    expect(s.fault).toBe("open2");
    expect(s.Req).toBe(Infinity);
    expect(s.I).toBe(0);
    expect(s.VR).toEqual([0, 12, 0]);
    expect(s.PR).toEqual([0, 0, 0]);
    expect(voltmeter(sol, "A", "B").v).toBe(0);
    expect(voltmeter(sol, "B", "C").v).toBe(12);
    expect(run("faultCleared", s)).toBe(false);
    expect(run("req", s, { target: 650 })).toBe(false);
  });
  it("open1 / open3 put the gap voltage on the right element", () => {
    expect(compute(inp({ fault: "open1" })).VR).toEqual([12, 0, 0]);
    expect(compute(inp({ fault: "open3" })).VR).toEqual([0, 0, 12]);
    expect(compute(inp({ topology: "single", fault: "open1" })).VR).toEqual([12, 0, 0]);
  });
  it("a fault on a position not in the circuit has no effect", () => {
    const s = compute(inp({ topology: "single", fault: "open2" }));
    expect(s.I).toBeCloseTo(0.12, 12);
    expect(s.VR[1]).toBe(0);
  });
});

describe("shorts and the 3 A current limit", () => {
  it("fault-short (short3, series): not a supply short, R3 drop ≈ 0", () => {
    const s = compute(getPreset("fault-short").input);
    expect(s.Req).toBeCloseTo(320.01, 9);
    expect(s.I).toBeCloseTo(12 / 320.01, 12); // 37.4988 mA
    expect(s.VR[2]).toBeCloseTo(3.74988e-4, 8);
    expect(s.currentLimited).toBe(false);
  });
  it("single short1: battery shorted → clamp to 3 A, terminal 0.03 V", () => {
    const sol = solve(inp({ topology: "single", fault: "short1" }));
    expect(sol.state.Req).toBe(0.01);
    expect(sol.state.I).toBe(3);
    expect(sol.Vt).toBeCloseTo(0.03, 12);
    expect(sol.state.P).toBeCloseTo(0.09, 12);
    expect(sol.state.currentLimited).toBe(true);
    expect(sol.shorted).toBe(true);
  });
  it("parallel short2: the short takes almost all of the 3 A", () => {
    const sol = solve(inp({ topology: "parallel", R: [1000, 2000, 4000], fault: "short2" }));
    const s = sol.state;
    expect(s.currentLimited).toBe(true);
    expect(sol.shorted).toBe(true);
    expect(s.I).toBeCloseTo(3, 9);
    expect(s.IR[1]).toBeCloseTo(2.99996, 4);
    expect(s.IR[0]).toBeCloseTo(3e-5, 7);
    expect(s.IR[0] + s.IR[1] + s.IR[2]).toBeCloseTo(s.I, 12);
  });
  it("low resistance without a fault also hits the limit (CC mode) but is not a short", () => {
    const sol = solve(inp({ topology: "single", R: [1, 1, 1] }));
    expect(sol.state.I).toBe(3);
    expect(sol.Vt).toBe(3);
    expect(sol.state.VR[0]).toBe(3);
    expect(sol.state.currentLimited).toBe(true);
    expect(sol.shorted).toBe(false);
  });
  it("exactly 3 A is not limited", () => {
    const s = compute(inp({ topology: "single", V: 9, R: [3, 1, 1] }));
    expect(s.I).toBe(3);
    expect(s.currentLimited).toBe(false);
  });
});

describe("lamp mode", () => {
  it("12 V lamp: 24 Ω, 0.5 A, 6 W, full brightness", () => {
    const s = compute(getPreset("lamp").input);
    expect(s.topology).toBe("single");
    expect(s.Req).toBe(24);
    expect(s.I).toBe(0.5);
    expect(s.PR[0]).toBe(6);
    expect(lampStatus(s)).toEqual({ brightness: 1, overload: false, P: 6 });
    expect(run("totalCurrent", s, { target: 0.5, tol: 0.03 })).toBe(true);
  });
  it("6 V: quarter power", () => {
    const s = compute(inp({ topology: "single", lamp: true, V: 6 }));
    expect(s.PR[0]).toBe(1.5);
    expect(lampStatus(s).brightness).toBe(0.25);
  });
  it("overload above 1.2 × 6 W = 7.2 W", () => {
    expect(lampStatus(compute(inp({ topology: "single", lamp: true, V: 13 }))).overload).toBe(false); // 7.04 W
    expect(lampStatus(compute(inp({ topology: "single", lamp: true, V: 13.5 }))).overload).toBe(true); // 7.59 W
    const s = compute(inp({ topology: "single", lamp: true, V: 24 }));
    expect(s.I).toBe(1);
    expect(s.PR[0]).toBe(24);
  });
  it("lamp ‖ 24 Ω ‖ 100 kΩ ≈ 12 Ω, ≈ 1 A (W05 task)", () => {
    const s = compute(inp({ topology: "parallel", lamp: true, R: [100, 24, 100000] }));
    expect(s.Req).toBeCloseTo(11.99856, 4);
    expect(s.I).toBeCloseTo(1.00012, 5);
    expect(run("req", s, { target: 12, tol: 0.03 })).toBe(true);
    expect(run("totalCurrent", s, { target: 1.0, tol: 0.03 })).toBe(true);
  });
  it("shorted lamp: filament dark even though the bypass carries 3 A", () => {
    const s = compute(inp({ topology: "single", lamp: true, fault: "short1" }));
    expect(s.I).toBe(3);
    expect(lampStatus(s)).toEqual({ brightness: 0, overload: false, P: 0 });
    expect(lampStatus(compute(inp({ topology: "single", lamp: true, fault: "open1" }))).brightness).toBe(0);
  });
  it("switch open: lamp dark", () => {
    const s = compute(inp({ topology: "single", lamp: true, switchClosed: false }));
    expect(lampStatus(s).brightness).toBe(0);
  });
});

describe("edge cases & input sanitising", () => {
  it("V = 0 gives zero current", () => {
    const s = compute(inp({ V: 0 }));
    expect(s.I).toBe(0);
    expect(s.P).toBe(0);
  });
  it("clamps V to 0–24 V and R to 1 Ω–100 kΩ; unknown fault → none", () => {
    const s = compute(inp({ V: 99, R: [0, 1e9, 100], fault: "bogus" }));
    expect(s.V).toBe(24);
    expect(s.R).toEqual([1, 100000, 100]);
    expect(s.fault).toBe("none");
  });
  it("unknown preset falls back to default", () => {
    expect(getPreset("nope")).toBe(PRESETS.default);
    expect(Object.keys(PRESETS)).toEqual([
      "default", "series-basic", "parallel-basic", "mixed-basic", "lamp", "fault-open", "fault-short", "kvl", "kcl",
    ]);
  });
  it("flow speed: zero for no current, proportional between branches", () => {
    expect(flowSpeed(0, 0)).toBe(0);
    expect(flowSpeed(0.006, 0.021) / flowSpeed(0.012, 0.021)).toBeCloseTo(0.5, 12);
    expect(flowSpeed(3, 3)).toBeGreaterThan(flowSpeed(0.02, 0.02));
  });
});

describe("checks", () => {
  const s = compute(getPreset("kcl").input);
  it("topology / req / branchCurrent / voltageAcross / powerBelow", () => {
    expect(run("topology", s, { is: "parallel" })).toBe(true);
    expect(run("topology", s, { is: "series" })).toBe(false);
    expect(run("req", s, { target: 571.4 })).toBe(true);
    expect(run("branchCurrent", s, { index: 2, target: 0.006 })).toBe(true);
    expect(run("branchCurrent", s, { index: "3", target: "0.003" })).toBe(true);
    expect(run("branchCurrent", s, { index: 4, target: 0.003 })).toBe(false);
    expect(run("voltageAcross", s, { index: 1, target: 12 })).toBe(true);
    expect(run("powerBelow", s, { index: 1, max: 0.25 })).toBe(true); // 144 mW
    expect(run("powerBelow", s, { index: 1, max: 0.1 })).toBe(false);
    expect(run("totalCurrent", s, { target: 0.021 })).toBe(true);
    expect(run("totalCurrent", s, { target: 0.025 })).toBe(false);
    expect(run("faultCleared", s)).toBe(true);
    expect(run("switchOpenNoCurrent", s)).toBe(false);
  });
  it("target 0 uses a small absolute band (shorted R drop)", () => {
    const f = compute(getPreset("fault-short").input);
    expect(run("voltageAcross", f, { index: 3, target: 0 })).toBe(true);
    expect(run("voltageAcross", f, { index: 2, target: 0 })).toBe(false);
  });
});

describe("troubleshooting mission", () => {
  it("symptom is derived from the model and never names the component", () => {
    const open = symptomFor(getPreset("fault-open").input);
    expect(open).toContain("กระแสรวมเป็นศูนย์");
    expect(open).not.toMatch(/R[123]/);
    const short = symptomFor(getPreset("fault-short").input);
    expect(short).toContain("สูงกว่า");
    expect(short).not.toMatch(/R[123]|ลัด|ขาด/);
    expect(symptomFor(inp({ lamp: true, topology: "single", fault: "open1" }))).toContain("หลอดไม่ติด");
    expect(symptomFor(inp({ lamp: true, topology: "single", fault: "short1" }))).toContain("จำกัดกระแส");
    expect(symptomFor(inp({ topology: "parallel", fault: "open2" }))).toContain("ต่ำกว่า");
    expect(symptomFor(inp({ fault: "none" }))).toBeNull();
    expect(symptomFor(inp({ topology: "single", fault: "open2" }))).toBeNull(); // not active in single
    expect(symptomFor(inp({ fault: "open2", switchClosed: false }))).toContain("สวิตช์");
  });
  it("faultActive respects the topology", () => {
    expect(faultActive("single", "open2")).toBe(false);
    expect(faultActive("single", "short1")).toBe(true);
    expect(faultActive("series", "none")).toBe(false);
    expect(faultActive("mixed", "open3")).toBe(true);
  });
  it("measurement log dedupes node pairs (either way round) and the ammeter", () => {
    let log: Measurement[] = [];
    log = addMeasurement(log, { kind: "V", where: "A–B", value: 12 });
    log = addMeasurement(log, { kind: "V", where: "B–A", value: -12 });
    log = addMeasurement(log, { kind: "V", where: "B–C", value: 0 });
    log = addMeasurement(log, { kind: "I", where: "ammeter", value: 0 });
    const same = addMeasurement(log, { kind: "I", where: "ammeter", value: 0 });
    expect(same).toBe(log);
    expect(log).toHaveLength(3);
    expect(distinctMeasurements(log)).toBe(3);
    expect(measurementKey({ kind: "V", where: "C–A" })).toBe(measurementKey({ kind: "V", where: "A–C" }));
  });
  it("diagnosis records correctness and the measurement count at that time", () => {
    const log: Measurement[] = [
      { kind: "V", where: "A–B", value: 0 },
      { kind: "V", where: "B–C", value: 12 },
    ];
    expect(diagnose("open2", "open2", log)).toEqual({ guess: "open2", correct: true, measurementsBefore: 2 });
    expect(diagnose("open2", "short2", log).correct).toBe(false);
    expect(diagnose("open2", "none", [])).toEqual({ guess: "none", correct: false, measurementsBefore: 0 });
  });
  it("random fault is deterministic, never 'none', never repeats, and fits the topology", () => {
    expect(seededRandom(7)()).toBe(seededRandom(7)());
    expect(randomFault(1, "series")).toBe(randomFault(1, "series"));
    for (let seed = 0; seed < 50; seed++) {
      const f = randomFault(seed, "series", "open2");
      expect(FAULTS).toContain(f);
      expect(f).not.toBe("none");
      expect(f).not.toBe("open2");
      const g = randomFault(seed, "single");
      expect(["open1", "short1"]).toContain(g);
    }
    const seen = new Set(Array.from({ length: 60 }, (_, k) => randomFault(k, "series")));
    expect(seen.size).toBeGreaterThanOrEqual(4);
    expect(randomFault(3, "single", "open1")).toBe("short1");
  });
  it("checks: faultDiagnosed and measured", () => {
    const s = compute(getPreset("fault-open").input);
    expect(run("measured", s, { min: 1 })).toBe(false);
    const log: Measurement[] = [
      { kind: "V", where: "A–B", value: 0 },
      { kind: "I", where: "ammeter", value: 0 },
    ];
    const withLog = { ...s, measurements: log, faultHidden: true };
    expect(run("measured", withLog, { min: 2 })).toBe(true);
    expect(run("measured", withLog, { min: 3 })).toBe(false);
    expect(run("faultDiagnosed", withLog)).toBe(false);
    const good = { ...withLog, diagnosis: diagnose("open2", "open2", log) };
    expect(run("faultDiagnosed", good)).toBe(true);
    expect(run("faultDiagnosed", good, { minMeasurements: 3 })).toBe(false);
    expect(run("faultDiagnosed", { ...withLog, diagnosis: diagnose("open2", "open2", []) })).toBe(false);
    expect(run("faultDiagnosed", { ...withLog, diagnosis: diagnose("open2", "open2", []) }, { minMeasurements: 0 })).toBe(true);
    expect(run("faultDiagnosed", { ...withLog, diagnosis: diagnose("open2", "short2", log) })).toBe(false);
    // existing checks keep working with the extended state
    expect(run("faultCleared", { ...good, fault: "none" })).toBe(true);
  });
});

describe("readouts", () => {
  it("non-empty labels/values for every preset and never throws", () => {
    for (const key of Object.keys(PRESETS)) {
      const s = compute(getPreset(key).input);
      const rows = lab.readouts!({ ...s, faultHidden: !!getPreset(key).hidden });
      expect(rows.length).toBeGreaterThanOrEqual(4);
      expect(rows.length).toBeLessThanOrEqual(10);
      for (const r of rows) {
        expect(r.label.length).toBeGreaterThan(0);
        expect(r.value.length).toBeGreaterThan(0);
      }
    }
  });
  it("hidden fault stays hidden in the notebook, repaired state shows per-resistor values", () => {
    const s = compute(getPreset("fault-open").input);
    const hidden = circuitReadouts({ ...s, faultHidden: true, measurements: [{ kind: "I", where: "ammeter", value: 0 }] });
    expect(hidden.find((r) => r.label === "จุดบกพร่อง")?.value).toBe("ซ่อนอยู่");
    expect(hidden.find((r) => r.label === "วัดแล้ว")?.value).toBe("1 จุด");
    expect(hidden.some((r) => r.label.startsWith("V_R"))).toBe(false);
    const fixed = circuitReadouts(compute(getPreset("series-basic").input));
    expect(fixed.find((r) => r.label === "V_R2")?.value).toBe("4 V");
    expect(fixed.find((r) => r.label === "I")?.value).toBe("20 mA");
    const mixed = circuitReadouts(compute(getPreset("mixed-basic").input));
    expect(mixed.find((r) => r.label === "I_R2")?.value).toBe("30 mA");
    expect(circuitReadouts(compute(getPreset("lamp").input)).find((r) => r.label === "V_หลอด")?.value).toBe("12 V");
  });
});
