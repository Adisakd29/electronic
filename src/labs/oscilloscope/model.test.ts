import { describe, expect, it } from "vitest";
import {
  BAND_CYCLES,
  FREQ_STEPS,
  TIME_DIV_STEPS,
  VOLTS_DIV_STEPS,
  bridgeCapV,
  bridgeV,
  computeTraces,
  halfwaveV,
  measure,
  mysteryGen,
  MYSTERY_FREQS,
  MYSTERY_VPP,
  presetInputs,
  solve,
  stepValue,
  transformerV,
  type OscInputs,
} from "./model";
import { lab } from "./index";

const S2 = Math.SQRT2;
const S3 = Math.sqrt(3);
const with_ = (patch: (i: OscInputs) => OscInputs, preset = "default") => solve(patch(presetInputs(preset)));
const check = (key: string, s: ReturnType<typeof solve>, params: Record<string, number | string | boolean> = {}) => lab.checks[key].fn(s, params);

describe("1-2-5 ranges", () => {
  it("VOLTS/DIV 5 mV … 10 V, TIME/DIV 1 µs … 500 ms, FREQ 1 Hz … 100 kHz", () => {
    expect(VOLTS_DIV_STEPS[0]).toBe(0.005);
    expect(VOLTS_DIV_STEPS.at(-1)).toBe(10);
    expect(VOLTS_DIV_STEPS).toHaveLength(11);
    expect(TIME_DIV_STEPS[0]).toBe(1e-6);
    expect(TIME_DIV_STEPS.at(-1)).toBe(0.5);
    expect(TIME_DIV_STEPS).toHaveLength(18);
    expect(FREQ_STEPS[0]).toBe(1);
    expect(FREQ_STEPS.at(-1)).toBe(100000);
    expect(stepValue(FREQ_STEPS, 1000, 1)).toBe(2000);
    expect(stepValue(FREQ_STEPS, 1000, -1)).toBe(500);
    expect(stepValue(FREQ_STEPS, 1300, -1)).toBe(1000);
  });
});

describe("default preset: sine 1 kHz 4 Vpp, 1 V/div, 0.2 ms/div", () => {
  const s = solve(presetInputs("default"));
  it("4 divisions tall, 2 cycles on 10 × 0.2 ms = 2 ms", () => {
    expect(s.divsVertical).toBeCloseTo(4, 6);
    expect(s.cyclesOnScreen).toBeCloseTo(2, 9);
    expect(s.fullyOnScreen).toBe(true);
    expect(s.triggered).toBe(true);
  });
  it("MEASURE: Vpp 4 V, Vrms = Vpp/(2√2) = 1.414 V, f = 1 kHz", () => {
    expect(s.meas1.vpp).toBeCloseTo(4, 6);
    expect(s.meas1.vrms).toBeCloseTo(4 / (2 * S2), 4);
    expect(s.meas1.vrms).toBeCloseTo(1.414, 3);
    expect(s.meas1.freq).toBeCloseTo(1000, 6);
  });
  it("trace is computed: trigger point (centre, 0 V rising) and peak a quarter period later", () => {
    const [t1] = computeTraces(s);
    expect(t1.stable).toBe(true);
    const pts = t1.lines[0].pts;
    const at = (x: number) => pts.find((p) => Math.abs(p[0] - x) < 1e-9)![1];
    expect(at(5)).toBeCloseTo(0, 2);
    // T = 1 ms = 5 div → quarter period = 1.25 div → +2 V = +2 div
    expect(at(6.25)).toBeCloseTo(2, 2);
    expect(at(3.75)).toBeCloseTo(-2, 2);
    expect(at(10)).toBeCloseTo(0, 2);
    expect(pts).toHaveLength(1001);
  });
  it("all checks used by content pass on default", () => {
    expect(check("triggered", s)).toBe(true);
    expect(check("cyclesOnScreen", s, { min: 2, max: 3 })).toBe(true);
    expect(check("cyclesOnScreen", s)).toBe(true);
    expect(check("fitsVertically", s, { minDiv: 4, maxDiv: 8 })).toBe(true);
    expect(check("probeMatched", s)).toBe(true);
    expect(check("genSet", s, { wave: "sine", freq: 1000, vpp: 4, tol: 0.02 })).toBe(true);
    expect(check("genSet", s, { wave: "sine", freq: 100 })).toBe(false);
    expect(check("couplingIs", s, { ch: 1, coupling: "DC" })).toBe(true);
    expect(check("couplingIs", s, { ch: 1, coupling: "AC" })).toBe(false);
  });
});

describe("waveform RMS", () => {
  it("square Vrms = Vpp/2", () => {
    const s = solve(presetInputs("square"));
    expect(s.gen.wave).toBe("square");
    expect(s.meas1.vpp).toBeCloseTo(4, 9);
    expect(s.meas1.vrms).toBeCloseTo(2, 6);
    expect(check("genSet", s, { wave: "square", vpp: 4, tol: 0.02 })).toBe(true);
    expect(s.triggered).toBe(true);
  });
  it("triangle Vrms = Vpp/(2√3)", () => {
    const s = with_((i) => ({ ...i, gen: { ...i.gen, wave: "triangle", vpp: 6 } }));
    expect(s.meas1.vrms).toBeCloseTo(6 / (2 * S3), 4);
    expect(s.meas1.vpp).toBeCloseTo(6, 6);
  });
  it("DC coupling true RMS includes the offset; AC coupling removes it", () => {
    const dc = with_((i) => ({ ...i, gen: { ...i.gen, offset: 2 } }));
    expect(dc.meas1.vmax).toBeCloseTo(4, 6);
    expect(dc.meas1.vmean).toBeCloseTo(2, 6);
    expect(dc.meas1.vrms).toBeCloseTo(Math.sqrt(4 + 2), 3); // √(Vdc² + Vac,rms²)
    const ac = with_((i) => ({ ...i, gen: { ...i.gen, offset: 2 }, ch1: { ...i.ch1, coupling: "AC" } }));
    expect(ac.meas1.vmean).toBeCloseTo(0, 6);
    expect(ac.meas1.vmax).toBeCloseTo(2, 6);
    expect(ac.meas1.vpp).toBeCloseTo(4, 6); // same peak-to-peak
    expect(ac.meas1.vrms).toBeCloseTo(1.414, 3);
    expect(check("couplingIs", ac, { ch: 1, coupling: "AC" })).toBe(true);
    // the trace moved down by 2 div (level 0 V is below a 0…4 V signal → DC-coupled view is untriggered)
    expect(dc.triggered).toBe(false);
    expect(ac.triggered).toBe(true);
    const top = (st: typeof dc) => Math.max(...computeTraces(st)[0].lines[0].pts.map((p) => p[1]));
    expect(top(dc) - top(ac)).toBeCloseTo(2, 2);
  });
  it("DC waveform: flat line at OFFSET, AC coupling → 0 V, no cycles", () => {
    const s = with_((i) => ({ ...i, gen: { ...i.gen, wave: "dc", offset: 3 } }));
    expect(s.meas1.vmean).toBeCloseTo(3, 9);
    expect(s.meas1.vpp).toBe(0);
    expect(Number.isNaN(s.meas1.freq)).toBe(true);
    expect(s.cyclesOnScreen).toBe(0);
    expect(s.triggered).toBe(false);
    const ac = with_((i) => ({ ...i, gen: { ...i.gen, wave: "dc", offset: 3 }, ch1: { ...i.ch1, coupling: "AC" } }));
    expect(ac.meas1.vmax).toBeCloseTo(0, 9);
  });
});

describe("GND coupling", () => {
  it("flat line at the channel position, untriggered, 0 div tall", () => {
    const s = with_((i) => ({ ...i, ch1: { ...i.ch1, coupling: "GND", pos: 1.5 } }));
    expect(s.divsVertical).toBe(0);
    expect(s.triggered).toBe(false);
    const t = computeTraces(s)[0];
    expect(t.lines).toHaveLength(1);
    for (const [, y] of t.lines[0].pts) expect(y).toBe(1.5);
    expect(t.ground).toBe(1.5);
  });
});

describe("probe ×1 / ×10", () => {
  it("probe-trap: switch ×10, menu ×1 → displayed 10× too small", () => {
    const s = solve(presetInputs("probe-trap"));
    expect(s.ch1.probeSwitch).toBe(10);
    expect(s.ch1.probeMenu).toBe(1);
    expect(s.meas1.vpp).toBeCloseTo(0.4, 6);
    expect(s.divsVertical).toBeCloseTo(0.4, 6);
    expect(check("probeMatched", s)).toBe(false);
    expect(check("fitsVertically", s, { minDiv: 4, maxDiv: 8 })).toBe(false);
  });
  it("switch ×1, menu ×10 → 10× too large (and clipped off screen)", () => {
    const s = with_((i) => ({ ...i, ch1: { ...i.ch1, probeMenu: 10 } }));
    expect(s.meas1.vpp).toBeCloseTo(40, 6);
    expect(s.fullyOnScreen).toBe(false);
    expect(s.meas1.clipped).toBe(true);
  });
  it("matched ×10/×10 → true volts again", () => {
    const s = with_((i) => ({ ...i, ch1: { ...i.ch1, probeMenu: 10, probeSwitch: 10 } }));
    expect(s.meas1.vpp).toBeCloseTo(4, 6);
    expect(check("probeMatched", s)).toBe(true);
  });
});

describe("trigger", () => {
  it("level inside (−2, +2) V triggers; outside → untriggered rolling trace", () => {
    expect(with_((i) => ({ ...i, trigger: { ...i.trigger, level: 1.9 } })).triggered).toBe(true);
    expect(with_((i) => ({ ...i, trigger: { ...i.trigger, level: -1.9, edge: "falling" } })).triggered).toBe(true);
    const out = with_((i) => ({ ...i, trigger: { ...i.trigger, level: 2.5 } }));
    expect(out.triggered).toBe(false);
    expect(check("triggered", out)).toBe(false);
    expect(with_((i) => ({ ...i, trigger: { ...i.trigger, level: 2 } })).triggered).toBe(false); // exactly at the peak
    const t = computeTraces(out, 0.1)[0];
    expect(t.stable).toBe(false);
    expect(t.lines.length).toBeGreaterThan(1);
    // rolling: a different rollPhase gives a different picture
    expect(computeTraces(out, 0.1)[0].lines[0].pts[500][1]).not.toBeCloseTo(computeTraces(out, 0.6)[0].lines[0].pts[500][1], 2);
  });
  it("rising vs falling edge at level +1 V: the trace crosses the centre at +1 div", () => {
    const r = with_((i) => ({ ...i, trigger: { ...i.trigger, level: 1 } }));
    const f = with_((i) => ({ ...i, trigger: { ...i.trigger, level: 1, edge: "falling" } }));
    const pr = computeTraces(r)[0].lines[0].pts;
    const pf = computeTraces(f)[0].lines[0].pts;
    expect(pr[500][1]).toBeCloseTo(1, 2);
    expect(pf[500][1]).toBeCloseTo(1, 2);
    expect(pr[510][1]).toBeGreaterThan(pr[500][1]);
    expect(pf[510][1]).toBeLessThan(pf[500][1]);
  });
  it("probe trap shrinks the range: level 1 V is now outside ±0.2 V", () => {
    const s = with_((i) => ({ ...i, trigger: { ...i.trigger, level: 1 } }), "probe-trap");
    expect(s.triggered).toBe(false);
  });
  it("trigger on CH2 while CH2 is off → untriggered", () => {
    expect(with_((i) => ({ ...i, trigger: { ...i.trigger, source: 2 } })).triggered).toBe(false);
  });
});

describe("timebase & vertical fit", () => {
  it("100 Hz at 2 ms/div → 2 cycles; at 0.2 ms/div → 0.2 cycles", () => {
    const a = with_((i) => ({ ...i, gen: { ...i.gen, freq: 100 }, timeDiv: 2e-3 }));
    expect(a.cyclesOnScreen).toBeCloseTo(2, 9);
    expect(check("cyclesOnScreen", a, { min: 1, max: 5 })).toBe(true);
    const b = with_((i) => ({ ...i, gen: { ...i.gen, freq: 100 } }));
    expect(b.cyclesOnScreen).toBeCloseTo(0.2, 9);
    expect(check("cyclesOnScreen", b, { min: 1, max: 5 })).toBe(false);
    expect(check("genSet", b, { wave: "sine", freq: 100 })).toBe(true);
  });
  it("10 kHz at 20 µs/div → 2 cycles", () => {
    expect(with_((i) => ({ ...i, gen: { ...i.gen, freq: 10000 }, timeDiv: 2e-5 })).cyclesOnScreen).toBeCloseTo(2, 9);
  });
  it("4 Vpp at 0.5 V/div → 8 div (fits exactly); at 0.2 V/div → 20 div, clipped", () => {
    const a = with_((i) => ({ ...i, ch1: { ...i.ch1, voltsDiv: 0.5 } }));
    expect(a.divsVertical).toBeCloseTo(8, 6);
    expect(check("fitsVertically", a, { minDiv: 4, maxDiv: 8 })).toBe(true);
    const b = with_((i) => ({ ...i, ch1: { ...i.ch1, voltsDiv: 0.2 } }));
    expect(b.divsVertical).toBeCloseTo(20, 6);
    expect(check("fitsVertically", b)).toBe(false);
  });
  it("position moves the waveform off screen → does not fit", () => {
    const s = with_((i) => ({ ...i, ch1: { ...i.ch1, pos: 3 } }));
    expect(s.divsVertical).toBeCloseTo(4, 6);
    expect(s.fullyOnScreen).toBe(false);
    expect(check("fitsVertically", s)).toBe(false);
  });
  it("very fast signal for TIME/DIV is drawn as a band, not aliased", () => {
    const s = with_((i) => ({ ...i, gen: { ...i.gen, freq: 100000 }, timeDiv: 0.01 }));
    expect(s.cyclesOnScreen).toBeGreaterThan(BAND_CYCLES);
    const t = computeTraces(s)[0];
    expect(t.band).not.toBeNull();
    expect(t.band!.top).toBeCloseTo(2, 4);
    expect(t.band!.bottom).toBeCloseTo(-2, 4);
  });
  it("generator output limited to ±10 V", () => {
    const s = with_((i) => ({ ...i, gen: { ...i.gen, vpp: 20, offset: 5 }, ch1: { ...i.ch1, voltsDiv: 5 } }));
    expect(s.genClipped).toBe(true);
    expect(s.meas1.vmax).toBeCloseTo(10, 6);
    expect(s.meas1.vmin).toBeCloseTo(-5, 6);
  });
});

describe("cursors", () => {
  it("Δt, 1/Δt and ΔV from cursor positions", () => {
    const s = with_((i) => ({ ...i, cursors: { on: true, ch: 1, x1: 5, x2: 10, y1: -2, y2: 2 } }));
    expect(s.cursor.dt).toBeCloseTo(1e-3, 12);
    expect(s.cursor.invDt).toBeCloseTo(1000, 6);
    expect(s.cursor.dV).toBeCloseTo(4, 9);
  });
  it("ΔV uses the selected channel's VOLTS/DIV and position", () => {
    const s = with_((i) => ({ ...i, ch1: { ...i.ch1, voltsDiv: 2, pos: 1 }, cursors: { on: true, ch: 1, x1: 0, x2: 0, y1: 1, y2: 3 } }));
    expect(s.cursor.v1).toBeCloseTo(0, 9);
    expect(s.cursor.v2).toBeCloseTo(4, 9);
    expect(s.cursor.invDt).toBe(Infinity);
  });
});

describe("transformer & rectifier (CH2)", () => {
  const VP = 12 * S2; // 16.97 V
  it("12 V rms 50 Hz secondary: peak 16.97 V", () => {
    expect(transformerV(0.005)).toBeCloseTo(VP, 9);
    expect(VP).toBeCloseTo(16.97, 2);
  });
  it("half-wave: one 0.7 V drop, zero on the negative half", () => {
    expect(halfwaveV(0.005)).toBeCloseTo(VP - 0.7, 9); // 16.27 V
    expect(halfwaveV(0.015)).toBe(0);
    expect(halfwaveV(0.0001)).toBe(0); // v = 0.53 V < 0.7 V: diode not yet conducting
  });
  it("bridge: two 0.7 V drops, both halves positive", () => {
    expect(bridgeV(0.005)).toBeCloseTo(VP - 1.4, 9); // 15.57 V
    expect(bridgeV(0.015)).toBeCloseTo(VP - 1.4, 9);
    expect(bridgeV(0)).toBe(0);
  });
  it("rectifier preset: CH1 transformer 50 Hz, CH2 bridge 100 Hz, 2.5 cycles at 5 ms/div", () => {
    const s = solve(presetInputs("rectifier"));
    expect(s.ch2.source).toBe("bridge");
    expect(s.cyclesOnScreen).toBeCloseTo(2.5, 9);
    expect(s.meas1.vpp).toBeCloseTo(2 * VP, 3);
    expect(s.meas2!.vmax).toBeCloseTo(VP - 1.4, 3);
    expect(s.meas2!.vmin).toBeCloseTo(0, 9);
    expect(s.meas2!.freq).toBeCloseTo(100, 6);
    expect(s.triggered).toBe(true);
    expect(s.fullyOnScreen).toBe(true);
    expect(s.meas2!.clipped).toBe(false);
    const tr = computeTraces(s);
    expect(tr).toHaveLength(2);
    expect(tr[1].stable).toBe(true);
    // CH2 never below its ground marker
    for (const [, y] of tr[1].lines[0].pts) expect(y).toBeGreaterThanOrEqual(s.ch2.pos - 1e-9);
  });
  it("half-wave average ≈ (Vp − 0.7)/π, bridge average ≈ 2(Vp − 1.4)/π (within conduction-angle error)", () => {
    const hw = measure({ voltsDiv: 5, pos: 0, coupling: "DC", probeMenu: 1, probeSwitch: 1, source: "halfwave" }, presetInputs().gen);
    expect(hw.vmean).toBeGreaterThan(5.0);
    expect(hw.vmean).toBeLessThan((VP - 0.7) / Math.PI + 0.01);
    expect(hw.freq).toBeCloseTo(50, 6);
    const br = measure({ voltsDiv: 5, pos: 0, coupling: "DC", probeMenu: 1, probeSwitch: 1, source: "bridge" }, presetInputs().gen);
    expect(br.vmean).toBeGreaterThan(9.3);
    expect(br.vmean).toBeLessThan((2 * (VP - 1.4)) / Math.PI + 0.01);
  });
  it("bridge + 470 µF ‖ 1 kΩ: ripple ≈ 0.3 V p-p at 100 Hz (approx. Vm/(2fRC) = 0.33 V upper bound)", () => {
    const vm = VP - 1.4;
    expect(bridgeCapV(0.005)).toBeCloseTo(vm, 9);
    expect(bridgeCapV(0.012)).toBeCloseTo(vm * Math.exp(-0.007 / 0.47), 9); // still discharging
    const m = measure({ voltsDiv: 0.1, pos: 0, coupling: "AC", probeMenu: 1, probeSwitch: 1, source: "bridge-cap" }, presetInputs().gen);
    expect(m.vpp).toBeGreaterThan(0.29);
    expect(m.vpp).toBeLessThan(vm / (2 * 50 * 1000 * 470e-6));
    expect(m.freq).toBeCloseTo(100, 6);
    expect(m.clipped).toBe(false); // ≈ 3 div tall at 0.1 V/div AC
  });
});

describe("mystery mode (seeded PRNG)", () => {
  it("same seed → same settings; settings come from the allowed lists", () => {
    expect(mysteryGen(42)).toEqual(mysteryGen(42));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = mysteryGen(seed);
      expect(["sine", "square", "triangle"]).toContain(g.wave);
      expect(MYSTERY_FREQS).toContain(g.freq);
      expect(MYSTERY_VPP).toContain(g.vpp);
      expect(g.offset).toBe(0);
      seen.add(`${g.wave}-${g.freq}-${g.vpp}`);
    }
    expect(seen.size).toBeGreaterThan(20);
  });
  it("mystery preset is reproducible, hides MEASURE, and triggers at 0 V", () => {
    const a = solve(presetInputs("mystery"));
    const b = solve(presetInputs("mystery"));
    expect(a.gen).toEqual(b.gen);
    expect(a.mystery).toBe(true);
    expect(a.measureVisible).toBe(false);
    expect(a.triggered).toBe(true);
  });
});

describe("module contract", () => {
  it("setup preset starts with every W18 setup task unmet", () => {
    const st = solve(presetInputs("setup"));
    const c = lab.checks;
    expect(c.genSet.fn(st, { wave: "sine", freq: 1000, vpp: 4, tol: 0.02 })).toBe(false);
    expect(c.probeMatched.fn(st, {})).toBe(false);
    expect(c.fitsVertically.fn(st, { minDiv: 4, maxDiv: 8 })).toBe(false);
    expect(c.cyclesOnScreen.fn(st, { min: 2, max: 3 })).toBe(false);
    expect(c.triggered.fn(st, {})).toBe(false);
  });
  it("has all spec presets; unknown preset → default", () => {
    for (const p of ["default", "mystery", "probe-trap", "square", "rectifier"]) expect(lab.presets[p]).toBeDefined();
    expect(presetInputs("nope")).toEqual(presetInputs("default"));
  });
  it("has all spec checks", () => {
    for (const k of ["triggered", "cyclesOnScreen", "fitsVertically", "probeMatched", "genSet", "couplingIs"]) expect(lab.checks[k]).toBeDefined();
  });
  it("sanitizes out-of-range inputs onto the 1-2-5 steps and limits", () => {
    const s = solve({ ...presetInputs(), timeDiv: 3e-4, gen: { wave: "sine", freq: 1e7, vpp: 100, offset: -9 }, ch1: { ...presetInputs().ch1, voltsDiv: 0.3 } });
    expect(s.timeDiv).toBe(2e-4);
    expect(s.ch1.voltsDiv).toBe(0.2);
    expect(s.gen.freq).toBe(1e5);
    expect(s.gen.vpp).toBe(20);
    expect(s.gen.offset).toBe(-5);
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
  it("non-empty for every preset, never throws, mystery hides the generator", () => {
    for (const key of Object.keys(lab.presets)) check(lab.readouts!(solve(presetInputs(key))));
    const rows = lab.readouts!(solve(presetInputs("default")));
    expect(rows.find((r) => r.label === "Vpp (วัด)")?.value).toBe("4 V");
    expect(rows.find((r) => r.label === "f / T (วัด)")?.value).toContain("1 kHz");
    const my = lab.readouts!(solve(presetInputs("mystery")));
    expect(my.find((r) => r.label === "เครื่องกำเนิด")?.value).toContain("ซ่อน");
  });
});
