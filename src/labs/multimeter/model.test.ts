import { describe, expect, it } from "vitest";
import {
  bandsFor,
  boardResistance,
  formatReading,
  ITEM_IDS,
  presetInputs,
  pressRange,
  replaceFuse,
  solve,
  unknownResistor,
  update,
  type MeterInputs,
} from "./model";
import { lab } from "./index";

const run = (patches: Partial<MeterInputs>[], base: MeterInputs = presetInputs("default")) => {
  let inp = base;
  for (const p of patches) inp = update(inp, p);
  return { inp, s: solve(inp) };
};
const on = (item: MeterInputs["item"], dial: MeterInputs["dial"], extra: Partial<MeterInputs> = {}) =>
  run([{ item }, { dial, probesOn: true, ...extra }]);

describe("4000-count display rule", () => {
  it("autorange picks the smallest range holding the rounded value", () => {
    expect(formatReading(9.37, "VDC").display).toBe("9.37");
    expect(formatReading(9.37, "VDC").displayUnit).toBe("V");
    expect(formatReading(1.52, "VDC").display).toBe("1.520");
    expect(formatReading(3.999, "VDC").display).toBe("3.999");
    expect(formatReading(3.9996, "VDC").display).toBe("4.00"); // rounds to 4000 counts → next range
    expect(formatReading(229.6, "VAC").display).toBe("229.6");
    expect(formatReading(4680, "ohm").display).toBe("4.68");
    expect(formatReading(4680, "ohm").displayUnit).toBe("kΩ");
    expect(formatReading(1000, "ohm").display).toBe("1.000");
    expect(formatReading(0.2, "ohm").display).toBe("0.2");
    expect(formatReading(0.012, "mA").display).toBe("12.00");
    expect(formatReading(0.012, "A").display).toBe("0.012");
  });
  it("negative sign, no '-0', OL above the top range", () => {
    expect(formatReading(-9.37, "VDC").display).toBe("-9.37");
    expect(formatReading(-0.0001, "VDC").display).toBe("0.000");
    expect(formatReading(1500, "VDC").display).toBe("OL");
    expect(formatReading(9.37, "mV").display).toBe("OL");
    expect(formatReading(50e6, "ohm").display).toBe("OL");
    expect(formatReading(50e6, "ohm").displayUnit).toBe("MΩ");
  });
  it("manual range: too small → OL, too big → fewer digits", () => {
    expect(formatReading(4680, "ohm", 1).display).toBe("OL");
    expect(formatReading(4680, "ohm", 3).display).toBe("4.7");
    expect(formatReading(4680, "ohm", 4).display).toBe("0.005");
  });
});

describe("voltage", () => {
  it("default preset: dial off → blank", () => {
    const s = solve(presetInputs("default"));
    expect(s.item).toBe("battery-9v");
    expect(s.display).toBe("");
    expect(s.value).toBeNull();
  });
  it("battery-9v on VDC → 9.37 V, reversed → -9.37", () => {
    const { s } = on("battery-9v", "VDC");
    expect(s.display).toBe("9.37");
    expect(s.value).toBeCloseTo(9.37, 9);
    expect(s.unit).toBe("V");
    expect(lab.checks.measured.fn(s, { item: "battery-9v", dial: "VDC" })).toBe(true);
    const r = on("battery-9v", "VDC", { reversed: true }).s;
    expect(r.display).toBe("-9.37");
    expect(r.polarityReversed).toBe(true);
  });
  it("aa 1.520 V, aa-flat 1.120 V", () => {
    expect(on("aa", "VDC").s.display).toBe("1.520");
    expect(on("aa-flat", "VDC").s.display).toBe("1.120");
    expect(lab.checks.measured.fn(on("aa-flat", "VDC").s, { item: "aa-flat", dial: "VDC" })).toBe(true);
  });
  it("AC range on a DC source reads ≈ 0 with a hint", () => {
    const s = on("battery-9v", "VAC").s;
    expect(s.display).toBe("0.000");
    expect(s.codes).toContain("ac-on-dc");
  });
  it("mV range on 9 V → OL (not a valid reading)", () => {
    const s = on("battery-9v", "mV").s;
    expect(s.display).toBe("OL");
    expect(s.codes).toContain("over-range-mV");
    expect(s.valid).toBe(false);
  });
  it("probes not placed → no check passes", () => {
    const s = run([{ dial: "VDC" }]).s;
    expect(s.display).toBe("0.000");
    expect(lab.checks.measured.fn(s, { item: "battery-9v", dial: "VDC" })).toBe(false);
    expect(lab.checks.readingNear.fn(s, { target: 0, tol: 0.05 })).toBe(false);
  });
});

describe("resistance, continuity, diode", () => {
  it("resistor-unknown default ≈ 4.7 kΩ (actual 4.68 kΩ)", () => {
    const { s } = run([{ dial: "ohm", probesOn: true }], presetInputs("resistance"));
    expect(s.display).toBe("4.68");
    expect(s.displayUnit).toBe("kΩ");
    expect(s.value).toBe(4680);
    expect(lab.checks.readingNear.fn(s, { target: 4700, tol: 0.05 })).toBe(true);
    expect(lab.checks.measured.fn(s, { item: "resistor-unknown", dial: "ohm" })).toBe(true);
  });
  it("RANGE button locks the range, cycles, OL on too-small range", () => {
    let inp = update(presetInputs("resistance"), { dial: "ohm", probesOn: true });
    inp = pressRange(inp); // lock 40 kΩ
    expect(solve(inp).rangeLabel).toBe("40 kΩ");
    expect(solve(inp).autoRange).toBe(false);
    inp = pressRange(inp); // 400 kΩ
    expect(solve(inp).display).toBe("4.7");
    inp = pressRange(pressRange(pressRange(inp))); // 4 MΩ, 40 MΩ, wrap → 400 Ω
    const s = solve(inp);
    expect(s.display).toBe("OL");
    expect(s.codes).toContain("over-range-manual");
    expect(s.valid).toBe(false);
    expect(solve(update(inp, { rangeIndex: null })).display).toBe("4.68");
  });
  it("unknown resistor is seeded and deterministic", () => {
    expect(unknownResistor(0)).toEqual({ nominal: 4700, actual: 4680 });
    expect(unknownResistor(7)).toEqual(unknownResistor(7));
    for (let k = 1; k < 40; k++) {
      const u = unknownResistor(k);
      expect(Math.abs(u.actual / u.nominal - 1)).toBeLessThanOrEqual(0.0401);
      expect(u.nominal).toBeGreaterThanOrEqual(100);
    }
    expect(bandsFor(4700)).toEqual([4, 7, 2]);
  });
  it("wire-good beeps (0.2 Ω < 30 Ω), wire-broken OL no beep — both valid", () => {
    const g = on("wire-good", "continuity").s;
    expect(g.display).toBe("0.2");
    expect(g.beep).toBe(true);
    expect(lab.checks.measured.fn(g, { item: "wire-good", dial: "continuity" })).toBe(true);
    const b = on("wire-broken", "continuity").s;
    expect(b.display).toBe("OL");
    expect(b.beep).toBe(false);
    expect(lab.checks.measured.fn(b, { item: "wire-broken", dial: "continuity" })).toBe(true);
  });
  it("continuity on 4.68 kΩ → OL, no beep", () => {
    const s = on("resistor-unknown", "continuity").s;
    expect(s.display).toBe("OL");
    expect(s.beep).toBe(false);
  });
  it("fuse-good ≈ 0 Ω, fuse-blown OL", () => {
    expect(on("fuse-good", "ohm").s.display).toBe("0.1");
    expect(on("fuse-good", "continuity").s.beep).toBe(true);
    expect(on("fuse-blown", "ohm").s.display).toBe("OL");
  });
  it("1N4007 forward 0.572 V, reverse OL", () => {
    const f = on("diode-1n4007", "diode").s;
    expect(f.display).toBe("0.572");
    expect(f.value!).toBeGreaterThanOrEqual(0.55);
    expect(f.value!).toBeLessThanOrEqual(0.6);
    expect(lab.checks.measured.fn(f, { item: "diode-1n4007", dial: "diode" })).toBe(true);
    expect(on("diode-1n4007", "diode", { reversed: true }).s.display).toBe("OL");
  });
  it("red LED forward ≈ 1.8 V and glows dimly, reverse OL dark", () => {
    const f = on("led-red", "diode").s;
    expect(f.display).toBe("1.812");
    expect(f.ledGlow).toBe(true);
    const r = on("led-red", "diode", { reversed: true }).s;
    expect(r.display).toBe("OL");
    expect(r.ledGlow).toBe(false);
  });
  it("Ω on a live item → warning, no reading", () => {
    for (const item of ["battery-9v", "outlet-230", "series-circuit-current"] as const) {
      for (const dial of ["ohm", "continuity", "diode"] as const) {
        const s = on(item, dial).s;
        expect(s.display).toBe("----");
        expect(s.value).toBeNull();
        expect(s.codes).toContain("live-ohm");
        expect(lab.checks.measured.fn(s, { item, dial })).toBe(false);
      }
    }
  });
  it("charged capacitor: discharge warning; after discharge 0 V and Ω → OL", () => {
    const c = on("capacitor-charged", "ohm").s;
    expect(c.display).toBe("----");
    expect(c.codes).toContain("cap-charged");
    expect(on("capacitor-charged", "VDC").s.display).toBe("12.00");
    const d = on("capacitor-charged", "ohm", { capDischarged: true }).s;
    expect(d.display).toBe("OL");
    expect(d.codes).toContain("cap-charging");
    expect(on("capacitor-charged", "VDC", { capDischarged: true }).s.display).toBe("0.000");
  });
});

describe("resistor-board / troubleshoot", () => {
  it("chain A–R1(1k)–B–R2(2.2k)–C–R3(3.3k)–D", () => {
    expect(boardResistance("A", "D", null)).toBe(6500);
    expect(boardResistance("D", "B", null)).toBe(5500);
    const s = on("resistor-board", "ohm", { redPoint: "A", blackPoint: "D" }).s;
    expect(s.display).toBe("6.50");
  });
  it("troubleshoot preset: R2 open → A–B 1.000 kΩ, B–C OL, C–D 3.300 kΩ, A–D OL", () => {
    const base = presetInputs("troubleshoot");
    expect(base.item).toBe("resistor-board");
    const at = (redPoint: "A" | "B" | "C" | "D", blackPoint: "A" | "B" | "C" | "D") => run([{ probesOn: true, redPoint, blackPoint }], base).s.display;
    expect(at("A", "B")).toBe("1.000");
    expect(at("B", "C")).toBe("OL");
    expect(at("C", "D")).toBe("3.300");
    expect(at("A", "D")).toBe("OL");
  });
});

describe("current & fuse", () => {
  const cur = presetInputs("current");
  it("series insertion, mA jack, mA dial → 12.00 mA, currentInSeries", () => {
    const { s } = run([{ jack: "mA", dial: "mA" }, { probesOn: true }], cur);
    expect(s.display).toBe("12.00");
    expect(s.displayUnit).toBe("mA");
    expect(s.value).toBeCloseTo(0.012, 12);
    expect(s.unit).toBe("A");
    expect(lab.checks.currentInSeries.fn(s, {})).toBe(true);
    expect(lab.checks.measured.fn(s, { item: "series-circuit-current", dial: "mA" })).toBe(true);
    expect(lab.checks.readingNear.fn(s, { target: 0.012 })).toBe(true);
    expect(lab.checks.fuseIntact.fn(s, {})).toBe(true);
  });
  it("reversed insertion → -12.00 mA, not counted as correct insertion", () => {
    const { s } = run([{ jack: "mA", dial: "mA", probesOn: true, reversed: true }], cur);
    expect(s.display).toBe("-12.00");
    expect(lab.checks.currentInSeries.fn(s, {})).toBe(false);
  });
  it("10A jack + A dial in series → 0.012 A", () => {
    const { s } = run([{ jack: "10A", dial: "A", probesOn: true }], cur);
    expect(s.display).toBe("0.012");
    expect(lab.checks.currentInSeries.fn(s, {})).toBe(false);
  });
  it("mA dial with red still in VΩ → 0.00 + jack warning", () => {
    const { s } = run([{ dial: "mA", probesOn: true }], cur);
    expect(s.display).toBe("0.00");
    expect(s.codes).toContain("jack-current-needed");
    expect(s.valid).toBe(false);
  });
  it("VDC in series with voltmeter (10 MΩ) reads ≈ supply 12.00 V", () => {
    expect(run([{ dial: "VDC", probesOn: true }], cur).s.display).toBe("12.00");
    expect(run([{ dial: "VDC", probesOn: true, placement: "across-resistor" }], cur).s.display).toBe("12.00");
  });
  it("ammeter across the supply blows the mA fuse", () => {
    const { s } = run([{ jack: "mA", dial: "mA", placement: "across-supply", probesOn: true }], cur);
    expect(s.fuseBlown).toBe(true);
    expect(s.display).toBe("0.00");
    expect(lab.checks.fuseIntact.fn(s, {})).toBe(false);
  });
  it("voltage with red lead in mA jack blows the fuse; current reads 0 until replaced", () => {
    let inp = update(presetInputs("default"), { jack: "mA", dial: "VDC" });
    inp = update(inp, { probesOn: true });
    let s = solve(inp);
    expect(s.fuseBlown).toBe(true);
    expect(s.blownMA).toBe(true);
    expect(s.display).toBe("0.000");
    expect(s.codes).toContain("jack-current-on-v");
    expect(s.codes).toContain("fuse-mA");
    // go measure current in series: still 0 with blown fuse
    inp = update(inp, { item: "series-circuit-current", placement: "series" });
    inp = update(inp, { dial: "mA", probesOn: true });
    s = solve(inp);
    expect(s.display).toBe("0.00");
    expect(s.circuitI).toBe(0);
    expect(lab.checks.currentInSeries.fn(s, {})).toBe(false);
    expect(lab.checks.measured.fn(s, { item: "series-circuit-current", dial: "mA" })).toBe(false);
    // replace fuse
    inp = replaceFuse(inp);
    s = solve(inp);
    expect(s.fuseBlown).toBe(false);
    expect(s.display).toBe("12.00");
    expect(lab.checks.currentInSeries.fn(s, {})).toBe(true);
  });
  it("blows even with dial off (shunt is wired between mA and COM)", () => {
    expect(run([{ jack: "10A", probesOn: true }]).s.blown10A).toBe(true);
  });
  it("mA jack on a passive resistor does not blow the fuse", () => {
    expect(run([{ item: "resistor-unknown" }, { jack: "mA", dial: "ohm", probesOn: true }]).s.fuseBlown).toBe(false);
  });
});

describe("mains demo", () => {
  it("outlet-230 on VAC → 229.6 V, demo-only flag; DC range ≈ 0", () => {
    const s = solve(presetInputs("mains-demo"));
    expect(s.display).toBe("229.6");
    expect(s.demoOnly).toBe(true);
    expect(s.valid).toBe(true);
    const dc = solve(update(presetInputs("mains-demo"), { dial: "VDC" }));
    expect(dc.display).toBe("0.000");
    expect(dc.codes).toContain("dc-on-ac");
  });
  it("current jack on the outlet blows the fuse with a mains danger note", () => {
    const s = solve(update(presetInputs("mains-demo"), { jack: "mA" }));
    expect(s.fuseBlown).toBe(true);
    expect(s.codes).toContain("fuse-blew-mains");
  });
});

describe("module contract", () => {
  it("has spec presets; unknown preset → default", () => {
    for (const k of ["default", "resistance", "diode", "continuity", "current", "mains-demo", "troubleshoot"]) expect(lab.presets[k]).toBeDefined();
    expect(presetInputs("nope")).toEqual(presetInputs("default"));
    expect(Object.keys(lab.checks).sort()).toEqual(["currentInSeries", "fuseIntact", "measured", "readingNear"]);
  });
  it("every item solves on every dial without throwing", () => {
    for (const item of ITEM_IDS)
      for (const dial of ["off", "VDC", "VAC", "mV", "ohm", "continuity", "diode", "mA", "A"] as const)
        for (const jack of ["VΩ", "mA", "10A"] as const) expect(() => solve(update(update(presetInputs(), { item }), { dial, jack, probesOn: true }))).not.toThrow();
  });
  it("changing item lifts the probes; changing dial returns to AUTO", () => {
    let inp = update(presetInputs("resistance"), { dial: "ohm", probesOn: true });
    inp = pressRange(inp);
    expect(update(inp, { dial: "VDC" }).rangeIndex).toBeNull();
    expect(update(inp, { item: "wire-good" }).probesOn).toBe(false);
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
      check(lab.readouts!(solve(presetInputs(key))));
      check(lab.readouts!(solve({ ...presetInputs(key), probesOn: true, dial: "VDC" })));
    }
    const rows = lab.readouts!(solve({ ...presetInputs("default"), probesOn: true, dial: "VDC" }));
    expect(rows.find((r) => r.label === "จอแสดง")?.value).toBe("9.37 V");
    expect(lab.readouts!(solve(presetInputs("default"))).find((r) => r.label === "จอแสดง")?.value).toContain("OFF");
  });
});
