import { describe, expect, it } from "vitest";
import {
  BODY_BANDS,
  addPoint,
  bodyBand,
  checkBodyCurrentBelow,
  checkCurrentEquals,
  checkDistinctR,
  checkPointsRecorded,
  checkPowerEquals,
  checkSetVR,
  currentScale,
  distinctRValues,
  initialState,
  ledHint,
  makeState,
  niceCeil,
  presetConfig,
  solve,
  solveForCurrent,
  voltageForPower,
  type OhmsPoint,
} from "./model";
import { lab } from "./index";

describe("Ohm's law", () => {
  it("default preset: 12 V across 1 kΩ → 12 mA, 144 mW", () => {
    const s = initialState("default");
    expect(s.V).toBe(12);
    expect(s.R).toBe(1000);
    expect(s.I).toBeCloseTo(0.012, 12);
    expect(s.P).toBeCloseTo(0.144, 12);
  });
  it("hand-computed values", () => {
    expect(solve(10, 1000).I).toBeCloseTo(0.01, 12);
    expect(solve(30, 10).I).toBeCloseTo(3, 12); // 3 A, 90 W
    expect(solve(30, 10).P).toBeCloseTo(90, 9);
    expect(solve(12, 1200).I).toBeCloseTo(0.01, 12);
    expect(solve(5, 220).I).toBeCloseTo(0.022727, 6); // LED sizing: 22.7 mA
    expect(solve(10.8, 470).P).toBeCloseTo(0.24817, 5);
    expect(voltageForPower(0.25, 470)).toBeCloseTo(10.840, 3);
  });
  it("no voltage → no current; invalid R → NaN", () => {
    expect(solve(0, 1000)).toEqual({ I: 0, P: 0 });
    expect(Number.isNaN(solve(5, 0).I)).toBe(true);
  });
  it("unknown preset falls back to default", () => {
    expect(presetConfig("nope").key).toBe("default");
    expect(initialState("nope").preset).toBe("default");
  });
  it("preset ranges follow the spec", () => {
    const b = presetConfig("body");
    expect([b.Vmin, b.Vmax, b.Rmin, b.Rmax]).toEqual([0, 400, 500, 1e6]);
    const p = presetConfig("power");
    expect([p.Vmax, p.Rmin, p.Rmax]).toEqual([24, 10, 1000]);
    const l = presetConfig("led-resistor");
    expect([l.V, l.Rmin, l.Rmax]).toEqual([5, 100, 1000]);
  });
});

describe("body preset — IEC 60479-1 bands (approx.)", () => {
  // Week 1 worked values: 230 V across 1 kΩ, 4 kΩ, 100 kΩ, 1 MΩ.
  it("230 V / 1 kΩ = 230 mA → VF risk", () => {
    const { I } = solve(230, 1000);
    expect(I).toBeCloseTo(0.23, 12);
    expect(bodyBand(I).id).toBe("vf");
  });
  it("230 V / 4 kΩ = 57.5 mA → VF risk", () => {
    const { I } = solve(230, 4000);
    expect(I).toBeCloseTo(0.0575, 12);
    expect(bodyBand(I).id).toBe("vf");
  });
  it("230 V / 100 kΩ = 2.3 mA → perception", () => {
    expect(bodyBand(solve(230, 1e5).I).id).toBe("perception");
  });
  it("230 V / 1 MΩ = 0.23 mA → below perception", () => {
    const { I } = solve(230, 1e6);
    expect(I).toBeCloseTo(0.00023, 12);
    expect(bodyBand(I).id).toBe("none");
  });
  it("band edges: 0.5 mA, 10 mA, 30 mA, 50 mA are inclusive lower bounds", () => {
    expect(bodyBand(0.000499).id).toBe("none");
    expect(bodyBand(0.0005).id).toBe("perception");
    expect(bodyBand(0.0099).id).toBe("perception");
    expect(bodyBand(0.01).id).toBe("let-go");
    expect(bodyBand(0.0299).id).toBe("let-go");
    expect(bodyBand(solve(30, 1000).I).id).toBe("rcd"); // 30 V / 1 kΩ = 30 mA exactly
    expect(bodyBand(0.0499).id).toBe("rcd");
    expect(bodyBand(0.05).id).toBe("vf");
    expect(BODY_BANDS.map((b) => b.from)).toEqual([0, 0.0005, 0.01, 0.03, 0.05]);
  });
  it("minimum R to stay below 0.5 mA at 230 V is 460 kΩ", () => {
    expect(checkBodyCurrentBelow(makeState(230, 460_000, [], "body"), { max: 0.0005 })).toBe(true);
    expect(checkBodyCurrentBelow(makeState(230, 450_000, [], "body"), { max: 0.0005 })).toBe(false);
  });
  it("initial body state does not already satisfy week-1 tasks", () => {
    const s = initialState("body");
    expect(checkSetVR(s, { V: 230, R: 1000, tol: 0.02 })).toBe(false);
    expect(checkCurrentEquals(s, { target: 0.03, tol: 0.03 })).toBe(false);
    expect(checkBodyCurrentBelow(s, { max: 0.0005 })).toBe(false);
  });
});

describe("ล็อกตัวแปร (lock & solve)", () => {
  const body = presetConfig("body");
  it("lock R = 1 kΩ, want 30 mA → V = 30 V", () => {
    const r = solveForCurrent("R", 0.03, 50, 1000, body);
    expect(r.V).toBe(30);
    expect(r.R).toBe(1000);
    expect(r.clamped).toBe(false);
  });
  it("lock V = 12 V, want 10 mA → R = 1.2 kΩ", () => {
    const r = solveForCurrent("V", 0.01, 12, 500, presetConfig("default"));
    expect(r.R).toBe(1200);
    expect(r.clamped).toBe(false);
  });
  it("clamps to the preset range and reports it", () => {
    const r = solveForCurrent("R", 1, 0, 1000, body); // would need 1000 V
    expect(r.V).toBe(400);
    expect(r.clamped).toBe(true);
    const q = solveForCurrent("V", 0, 12, 1000, body);
    expect(q.ok).toBe(false);
  });
});

describe("recorded points", () => {
  it("dedupes identical (V, R) and counts distinct R", () => {
    let pts: OhmsPoint[] = [];
    for (const v of [0, 2, 4, 6, 8, 10]) pts = addPoint(pts, v, 1000);
    pts = addPoint(pts, 10, 1000);
    expect(pts).toHaveLength(6);
    expect(pts[5]).toEqual({ V: 10, I: 0.01, R: 1000 });
    pts = addPoint(pts, 10, 2200);
    pts = addPoint(pts, 10, 470);
    expect(distinctRValues(pts)).toEqual([1000, 2200, 470]);
  });
});

describe("checks", () => {
  const pts: OhmsPoint[] = [0, 2, 4, 6, 8, 10].map((V) => ({ V, R: 1000, I: V / 1000 }));
  it("currentEquals", () => {
    expect(checkCurrentEquals(makeState(12, 1200, [], "default"), { target: 0.01, tol: 0.02 })).toBe(true);
    expect(checkCurrentEquals(makeState(12, 1000, [], "default"), { target: 0.01, tol: 0.02 })).toBe(false);
    expect(checkCurrentEquals(makeState(30.6, 1000, [], "body"), { target: 0.03 })).toBe(true); // default tol 3 %
  });
  it("setVR (default tol 2 %)", () => {
    expect(checkSetVR(makeState(230, 1000, [], "body"), { V: 230, R: 1000 })).toBe(true);
    expect(checkSetVR(makeState(230, 1100, [], "body"), { V: 230, R: 1000 })).toBe(false);
    expect(checkSetVR(makeState(230, 1015, [], "body"), { V: 230, R: 1000 })).toBe(true);
  });
  it("pointsRecorded with and without sameR", () => {
    const s = makeState(10, 1000, pts, "default");
    expect(checkPointsRecorded(s, { min: 6, sameR: true })).toBe(true);
    expect(checkPointsRecorded(s, { min: 7 })).toBe(false);
    const mixed = makeState(10, 1000, [...pts.slice(0, 5), { V: 10, R: 2200, I: 10 / 2200 }], "default");
    expect(checkPointsRecorded(mixed, { min: 6 })).toBe(true);
    expect(checkPointsRecorded(mixed, { min: 6, sameR: true })).toBe(false);
  });
  it("distinctR", () => {
    const s = makeState(10, 1000, [...pts, { V: 10, R: 470, I: 10 / 470 }, { V: 10, R: 2200, I: 10 / 2200 }], "default");
    expect(checkDistinctR(s, { min: 3 })).toBe(true);
    expect(checkDistinctR(s, { min: 4 })).toBe(false);
  });
  it("powerEquals: 470 Ω at 10.8 V ≈ 0.25 W within 3 %", () => {
    expect(checkPowerEquals(makeState(10.8, 470, [], "power"), { target: 0.25, tol: 0.03 })).toBe(true);
    expect(checkPowerEquals(makeState(10, 470, [], "power"), { target: 0.25, tol: 0.03 })).toBe(false);
  });
  it("garbage state never passes", () => {
    expect(checkCurrentEquals(null, { target: 0 })).toBe(false);
    expect(checkDistinctR({}, { min: 0 })).toBe(false);
  });
});

describe("helpers", () => {
  it("niceCeil / currentScale / ledHint", () => {
    expect(niceCeil(0.23)).toBe(0.25);
    expect(niceCeil(0.012)).toBe(0.02);
    expect(niceCeil(3)).toBe(5);
    expect(currentScale(0.0004).unit).toBe("µA");
    expect(currentScale(0.03).unit).toBe("mA");
    expect(ledHint(solve(5, 220).I)).toBe("high");
    expect(ledHint(solve(5, 330).I)).toBe("ok");
  });
});

describe("lab module", () => {
  it("exposes every preset and check from the spec", () => {
    expect(lab.id).toBe("ohms");
    expect(Object.keys(lab.presets).sort()).toEqual(["body", "default", "led-resistor", "power"]);
    expect(Object.keys(lab.checks).sort()).toEqual(
      ["bodyCurrentBelow", "currentEquals", "distinctR", "pointsRecorded", "powerEquals", "setVR"].sort(),
    );
    expect(lab.assumptions.length).toBeGreaterThan(3);
    expect(typeof lab.previewStage).toBe("function");
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
    for (const key of Object.keys(lab.presets)) check(lab.readouts!(initialState(key)));
    const body = lab.readouts!(initialState("body"));
    expect(body.some((r) => r.label.includes("IEC 60479-1"))).toBe(true);
    expect(lab.readouts!(initialState("default")).find((r) => r.label === "I")?.value).toBe("12 mA");
  });
});
