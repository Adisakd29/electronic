import { describe, expect, it } from "vitest";
import {
  bridgeMode,
  dutyCurves,
  operatingPoint,
  presetInputs,
  pwmWave,
  resetFuse,
  settle,
  signedOmega,
  simulateOverload,
  solve,
  speedTorqueCurve,
  startVoltage,
  statusText,
  stepOmega,
  TAU_M,
  toRpm,
  type MotorInputs,
  type MotorState,
  type Switches,
} from "./model";
import { lab } from "./index";

const run = (steps: Partial<MotorInputs>[], base: MotorInputs = presetInputs("default")) => {
  let inp = settle(base);
  let s: MotorState = solve(inp);
  for (const st of steps) {
    inp = settle({ ...inp, ...st });
    s = solve(inp, s);
  }
  return { s, inp };
};
const pwm = (patch: Partial<MotorInputs>) => solve({ ...presetInputs("default"), ...patch });
const bridge = (sw: Switches, patch: Partial<MotorInputs> = {}) => solve(settle({ ...presetInputs("hbridge"), ...patch, switches: sw }));
const chk = (key: string, s: MotorState, p: Record<string, number | string | boolean> = {}) => lab.checks[key].fn(s, p);

describe("PMDC steady state (Ra 2 Ω, k 0.02, T_f 0.005 N·m)", () => {
  it("12 V, 100 %, no load: I = 0.25 A, ω = 575 rad/s ≈ 5491 rpm, E = 11.5 V", () => {
    const s = solve(presetInputs("default"));
    expect(s.tab).toBe("pwm");
    expect(s.current).toBeCloseTo(0.25, 9);
    expect(s.omega).toBeCloseTo(575, 9);
    expect(s.rpm).toBeCloseTo(5490.85, 1);
    expect(Math.round(s.rpm)).toBe(5491);
    expect(s.backEmf).toBeCloseTo(11.5, 9);
    expect(s.direction).toBe("cw");
    expect(s.stalled).toBe(false);
    expect(s.pIn).toBeCloseTo(3, 9);
    expect(s.pOut).toBe(0);
    expect(s.efficiency).toBe(0);
    // power balance: P_in = I²Ra + T_f ω + T_L ω
    expect(s.pCopper + s.pFriction + s.pOut).toBeCloseTo(s.pIn, 9);
  });
  it("pwm preset 50 %: V_eff 6 V → ω = 275 rad/s ≈ 2626 rpm", () => {
    const s = solve(presetInputs("pwm"));
    expect(s.duty).toBe(0.5);
    expect(s.vEff).toBeCloseTo(6, 9);
    expect(s.omega).toBeCloseTo(275, 9);
    expect(Math.round(s.rpm)).toBe(2626);
    expect(s.current).toBeCloseTo(0.25, 9);
  });
  it("load 0.02 N·m at 12 V: I = 1.25 A, E = 9.5 V, ω = 475 rad/s ≈ 4536 rpm, η = 79.2 %", () => {
    const s = pwm({ load: 0.02 });
    expect(s.current).toBeCloseTo(1.25, 9);
    expect(s.backEmf).toBeCloseTo(9.5, 9);
    expect(s.omega).toBeCloseTo(475, 9);
    expect(Math.round(s.rpm)).toBe(4536);
    expect(s.pIn).toBeCloseTo(15, 9);
    expect(s.pOut).toBeCloseTo(9.5, 9);
    expect(s.efficiency).toBeCloseTo(9.5 / 15, 9);
    expect(s.pCopper + s.pFriction + s.pOut).toBeCloseTo(s.pIn, 9);
  });
  it("speed falls and current rises monotonically with load", () => {
    let prev = pwm({ load: 0 });
    for (const l of [0.01, 0.02, 0.03, 0.04, 0.05]) {
      const s = pwm({ load: l });
      expect(s.rpm).toBeLessThan(prev.rpm);
      expect(s.current).toBeGreaterThan(prev.current);
      prev = s;
    }
    // max load 0.05 N·m at 12 V: I = 2.75 A, ω = (12 − 5.5)/0.02 = 325 rad/s
    expect(prev.current).toBeCloseTo(2.75, 9);
    expect(prev.omega).toBeCloseTo(325, 9);
    expect(prev.overheat).toBe(false);
  });
  it("speed rises with duty (linear in V_eff above the start voltage)", () => {
    const a = pwm({ duty: 0.25 });
    const b = pwm({ duty: 0.75 });
    expect(a.omega).toBeCloseTo((3 - 0.5) / 0.02, 9);
    expect(b.omega).toBeCloseTo((9 - 0.5) / 0.02, 9);
  });
  it("load torque is clamped to 0…0.05 N·m and V to 0…12 V", () => {
    expect(pwm({ load: 1 }).load).toBe(0.05);
    expect(pwm({ V: 30 }).V).toBe(12);
    expect(pwm({ duty: 2 }).duty).toBe(1);
  });
});

describe("stall", () => {
  it("start voltage = (T_L + T_f)·Ra/k: 0.5 V no load, 2.5 V at 0.02 N·m", () => {
    expect(startVoltage(0)).toBeCloseTo(0.5, 9);
    expect(startVoltage(0.02)).toBeCloseTo(2.5, 9);
  });
  it("V_eff below start voltage: ω = 0, I = V_eff/Ra, stalled, no back-EMF", () => {
    const s = pwm({ duty: 0.03 }); // 0.36 V < 0.5 V
    expect(s.stalled).toBe(true);
    expect(s.omega).toBe(0);
    expect(s.rpm).toBe(0);
    expect(s.current).toBeCloseTo(0.18, 9);
    expect(s.backEmf).toBe(0);
    expect(s.direction).toBe("stop");
    expect(statusText(s)).toContain("stall");
    expect(chk("speedAbove", s, { rpm: 0 })).toBe(false);
  });
  it("2 V with 0.02 N·m load stalls; 3 V turns", () => {
    const st = pwm({ V: 2, load: 0.02 });
    expect(st.stalled).toBe(true);
    expect(st.current).toBeCloseTo(1, 9);
    const ok = pwm({ V: 3, load: 0.02 });
    expect(ok.stalled).toBe(false);
    expect(ok.omega).toBeCloseTo((3 - 2.5) / 0.02, 9);
  });
  it("exactly at start voltage: boundary is stall and current is continuous", () => {
    const s = operatingPoint(0.5, 0);
    expect(s.stalled).toBe(true);
    expect(s.current).toBeCloseTo(0.25, 9);
  });
  it("locked rotor at 12 V: 6 A > 3 A → overheat warning", () => {
    const s = pwm({ locked: true });
    expect(s.stalled).toBe(true);
    expect(s.current).toBeCloseTo(6, 9);
    expect(s.overheat).toBe(true);
    expect(s.pIn).toBeCloseTo(72, 9);
    expect(s.pCopper).toBeCloseTo(72, 9);
  });
  it("0 V: no current, not stalled, stopped", () => {
    const s = pwm({ duty: 0 });
    expect(s.current).toBe(0);
    expect(s.stalled).toBe(false);
    expect(s.direction).toBe("stop");
    expect(statusText(s)).toBe("หยุด");
  });
});

describe("H-bridge — all 16 switch combinations", () => {
  const combos: Switches[] = [];
  for (let m = 0; m < 16; m++) combos.push([!!(m & 1), !!(m & 2), !!(m & 4), !!(m & 8)]);
  it("classifies every combination", () => {
    for (const sw of combos) {
      const [s1, s2, s3, s4] = sw;
      const m = bridgeMode(sw);
      if ((s1 && s2) || (s3 && s4)) expect(m).toBe("shoot-through");
      else if (s1 && s4) expect(m).toBe("forward");
      else if (s3 && s2) expect(m).toBe("reverse");
      else if (s2 && s4) expect(m).toBe("brake-low");
      else if (s1 && s3) expect(m).toBe("brake-high");
      else expect(m).toBe("coast");
      const s = bridge(sw);
      if (m === "shoot-through") {
        expect(s.shortCircuit).toBe(true);
        expect(s.fuseBlown).toBe(true);
        expect(s.direction).toBe("stop");
        expect(s.current).toBe(0);
      } else {
        expect(s.shortCircuit).toBe(false);
      }
      if (m !== "forward" && m !== "reverse") expect(s.omega).toBe(0);
    }
  });
  it("S1 + S4 → forward cw at full model speed", () => {
    const s = bridge([true, false, false, true]);
    expect(s.direction).toBe("cw");
    expect(s.omega).toBeCloseTo(575, 9);
    expect(signedOmega(s)).toBeCloseTo(575, 9);
    expect(chk("direction", s, { dir: "cw" })).toBe(true);
    expect(chk("noShortCircuit", s)).toBe(true);
  });
  it("S3 + S2 → reverse ccw, same magnitude", () => {
    const s = bridge([false, true, true, false]);
    expect(s.direction).toBe("ccw");
    expect(s.rpm).toBeCloseTo(toRpm(575), 6);
    expect(signedOmega(s)).toBeCloseTo(-575, 9);
    expect(statusText(s)).toBe("หมุนทวนเข็ม (CCW)");
    expect(chk("direction", s, { dir: "ccw" })).toBe(true);
  });
  it("S2 + S4 → brake (low side), S1 + S3 → brake (high side)", () => {
    const lo = bridge([false, true, false, true]);
    expect(lo.braking).toBe(true);
    expect(lo.direction).toBe("stop");
    expect(lo.motion).toBe("brake");
    expect(statusText(lo)).toBe("เบรก");
    expect(chk("braking", lo)).toBe(true);
    expect(chk("noShortCircuit", lo)).toBe(true);
    const hi = bridge([true, false, true, false]);
    expect(hi.braking).toBe(true);
  });
  it("all off → coast (no braking, no drive)", () => {
    const s = bridge([false, false, false, false]);
    expect(s.bridgeMode).toBe("coast");
    expect(s.braking).toBe(false);
    expect(s.motion).toBe("coast");
    expect(statusText(s)).toContain("coast");
    expect(chk("braking", s)).toBe(false);
  });
  it("S1 + S2 shoot-through blows the fuse; it stays blown after switches change, until reset", () => {
    let { s, inp } = run([{ switches: [true, true, false, false] }], presetInputs("hbridge"));
    expect(s.shortCircuit).toBe(true);
    expect(chk("noShortCircuit", s)).toBe(false);
    ({ s, inp } = run([{ switches: [true, false, false, true] }], inp));
    expect(inp.fuseBlown).toBe(true);
    expect(s.shortCircuit).toBe(true);
    expect(s.direction).toBe("stop");
    const r = resetFuse(inp);
    expect(r.switches).toEqual([false, false, false, false]);
    ({ s } = run([{ switches: [true, false, false, true] }], r));
    expect(s.shortCircuit).toBe(false);
    expect(s.direction).toBe("cw");
    expect(chk("noShortCircuit", s)).toBe(true);
  });
  it("S3 + S4 shoot-through on the right leg too", () => {
    const s = bridge([false, false, true, true]);
    expect(s.bridgeMode).toBe("shoot-through");
    expect(s.shortCircuit).toBe(true);
    expect(statusText(s)).toContain("ฟิวส์ขาด");
  });
  it("duty applies through the bridge", () => {
    const s = bridge([true, false, false, true], { duty: 0.5 });
    expect(Math.round(s.rpm)).toBe(2626);
  });
});

describe("contactor start–stop (24 V control)", () => {
  const base = presetInputs("contactor");
  it("starts stopped", () => {
    const s = solve(base);
    expect(s.contactor.coil).toBe(false);
    expect(s.contactor.running).toBe(false);
    expect(s.direction).toBe("stop");
  });
  it("START pressed → coil, running; released → held by K1 13–14", () => {
    const pressed = run([{ startPressed: true }], base).s;
    expect(pressed.contactor.coil).toBe(true);
    expect(pressed.contactor.running).toBe(true);
    expect(pressed.direction).toBe("cw");
    expect(pressed.omega).toBeCloseTo(575, 9);
    expect(chk("motorRunningLatched", pressed)).toBe(false); // START still held
    const held = run([{ startPressed: true }, { startPressed: false }], base).s;
    expect(held.contactor.holding).toBe(true);
    expect(held.contactor.running).toBe(true);
    expect(chk("motorRunningLatched", held)).toBe(true);
  });
  it("STOP drops out and it stays off after releasing STOP", () => {
    const s = run([{ startPressed: true }, { startPressed: false }, { stopPressed: true }, { stopPressed: false }], base).s;
    expect(s.contactor.coil).toBe(false);
    expect(s.contactor.holding).toBe(false);
    expect(s.contactor.running).toBe(false);
    expect(s.direction).toBe("stop");
  });
  it("STOP wins over START held together", () => {
    const s = run([{ startPressed: true, stopPressed: true }], base).s;
    expect(s.contactor.coil).toBe(false);
  });
  it("overload trips only while running; motor stays stopped after OL reset until START", () => {
    let { s, inp } = run([{ startPressed: true }, { startPressed: false }], base);
    inp = simulateOverload(inp, s);
    s = solve(inp, s);
    expect(s.contactor.overloadTripped).toBe(true);
    expect(s.contactor.coil).toBe(false);
    expect(s.contactor.running).toBe(false);
    expect(chk("overloadTripped", s)).toBe(true);
    // START while tripped: 95–96 open → nothing
    ({ s, inp } = run([{ startPressed: true }, { startPressed: false }], inp));
    expect(s.contactor.coil).toBe(false);
    // OL reset: still stopped (no-volt release)
    ({ s, inp } = run([{ olTripped: false }], inp));
    expect(s.contactor.overloadTripped).toBe(false);
    expect(s.contactor.running).toBe(false);
    ({ s } = run([{ startPressed: true }, { startPressed: false }], inp));
    expect(chk("motorRunningLatched", s)).toBe(true);
    // simulateOverload ignored when stopped
    const idle = solve(base);
    expect(simulateOverload(base, idle).olTripped).toBe(false);
  });
  it("running-latched check is false outside the contactor tab", () => {
    expect(chk("motorRunningLatched", solve(presetInputs("default")))).toBe(false);
  });
  it("leaving the contactor tab drops the coil", () => {
    const s = run([{ startPressed: true }, { startPressed: false }, { tab: "pwm" }, { tab: "contactor" }], base).s;
    expect(s.contactor.coil).toBe(false);
  });
});

describe("animation & helpers", () => {
  it("τ_m = J·Ra/k² = 0.15 s; drive reaches 63 % after τ", () => {
    expect(TAU_M).toBeCloseTo(0.15, 9);
    expect(stepOmega(0, 575, "drive", TAU_M, 0)).toBeCloseTo(575 * (1 - Math.exp(-1)), 6);
  });
  it("brake stops faster than coast", () => {
    let wb = 575;
    let wc = 575;
    for (let i = 0; i < 20; i++) {
      wb = stepOmega(wb, 0, "brake", 0.05, 0);
      wc = stepOmega(wc, 0, "coast", 0.05, 0);
    }
    expect(wb).toBe(0);
    expect(wc).toBeGreaterThan(0);
    // coast: decel = T_f / J = 166.7 rad/s² → 575 − 166.7 × 1 s
    expect(wc).toBeCloseTo(575 - 0.005 / 3e-5, 6);
  });
  it("PWM waveform: 3 periods, average = D·V", () => {
    const w = pwmWave(12, 0.25, 1000);
    expect(w.unit).toBe("ms");
    expect(w.points[2]).toEqual([0.25, 12]);
    const w2 = pwmWave(12, 0.5, 20000);
    expect(w2.unit).toBe("µs");
  });
  it("speed–torque curve is a falling line", () => {
    const c = speedTorqueCurve(12);
    expect(c[0][1]).toBeCloseTo(toRpm(575), 6);
    expect(c[c.length - 1][1]).toBeCloseTo(toRpm(325), 6);
  });
});

describe("checks & presets", () => {
  it("has all presets and unknown → default", () => {
    expect(Object.keys(lab.presets).sort()).toEqual(["contactor", "default", "hbridge", "pwm"]);
    expect(presetInputs("nope")).toEqual(presetInputs("default"));
  });
  it("speedAbove / speedBetween / dutyEquals", () => {
    const s = solve(presetInputs("pwm"));
    expect(chk("speedAbove", s, { rpm: 2600 })).toBe(true);
    expect(chk("speedAbove", s, { rpm: 3000 })).toBe(false);
    expect(chk("speedBetween", s, { min: 2500, max: 2700 })).toBe(true);
    expect(chk("speedBetween", s, { min: 2700, max: 3000 })).toBe(false);
    expect(chk("dutyEquals", s, { percent: 50, absTol: 1 })).toBe(true);
    expect(chk("dutyEquals", s, { percent: 50 })).toBe(true);
    expect(chk("dutyEquals", pwm({ duty: 0.52 }), { percent: 50 })).toBe(false);
    expect(chk("dutyEquals", pwm({ duty: 0.51 }), { percent: 50 })).toBe(true);
  });
  it("direction stop when stopped", () => {
    expect(chk("direction", solve(presetInputs("hbridge")), { dir: "stop" })).toBe(true);
  });
  it("every preset renders a preview stage", () => {
    for (const p of Object.keys(lab.presets)) expect(lab.previewStage?.(p)).toBeTruthy();
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
    for (const key of Object.keys(lab.presets)) check(lab.readouts!(solve(presetInputs(key))));
    const rows = lab.readouts!(solve(presetInputs("default")));
    expect(rows.find((r) => r.label === "ความเร็ว")?.value).toMatch(/^549\d rpm$/);
    expect(rows.find((r) => r.label === "I")?.value).toBe("250 mA");
    expect(lab.readouts!(solve(presetInputs("hbridge"))).some((r) => r.label === "S1–S4")).toBe(true);
    expect(lab.readouts!(solve(presetInputs("contactor"))).some((r) => r.label === "K1 / OL")).toBe(true);
  });
});

describe("dutyCurves (rpm / current vs duty)", () => {
  it("stall region then linear rise; running current set by the load", () => {
    const c = dutyCurves(12, 0, false, 101);
    expect(c.rpm).toHaveLength(101);
    expect(c.rpm[0]).toEqual([0, 0]);
    expect(c.current[0]).toEqual([0, 0]);
    // start voltage with no load = 0.005/0.02·2 = 0.5 V → duty 4.17 %: below it rpm 0 and I = V_eff/Ra
    expect(c.rpm[4][1]).toBe(0);
    expect(c.current[4][1]).toBeCloseTo((0.04 * 12) / 2, 12);
    // running: I = T_f/k = 0.25 A everywhere, rpm linear in duty
    expect(c.current[100][1]).toBeCloseTo(0.25, 12);
    expect(c.current[50][1]).toBeCloseTo(0.25, 12);
    expect(c.rpm[100][1]).toBeCloseTo(toRpm((12 - 0.5) / 0.02), 6);
    const slope1 = c.rpm[100][1] - c.rpm[90][1];
    const slope2 = c.rpm[60][1] - c.rpm[50][1];
    expect(slope1).toBeCloseTo(slope2, 6);
    // locked rotor: never turns, current rises with duty
    const l = dutyCurves(12, 0, true, 11);
    expect(l.rpm.every((p) => p[1] === 0)).toBe(true);
    expect(l.current[10][1]).toBeCloseTo(6, 12);
  });
});
