/**
 * Relay simulator — pure model (no React).
 *
 * Coil side: DC supply (0–15 V) → input (switch / push button / NPN driver /
 * START–STOP self-holding rung) → coil A1–A2 (rated 12 V, default 400 Ω).
 * Contact side: SPDT changeover COM 11 / NC 12 / NO 14 switching two 12 V
 * lamps from a separate 12 V DC load supply. Holding contact (latch mode)
 * is the second pole's NO contact 21–24; overload contact is NC 95–96.
 *
 * Pick-up ("must operate") = 75 % of rated coil voltage, drop-out ("must
 * release") = 10 % of rated → hysteresis: once pulled in the armature stays
 * in until the coil voltage falls to ≤ drop-out.
 */

export type RelayMode = "basic" | "driver" | "latch";
export type SwitchKind = "toggle" | "push";

export const RATED_V = 12;
export const PICKUP_FRAC = 0.75;
export const DROPOUT_FRAC = 0.1;
export const VBE = 0.7;
export const VCE_SAT = 0.2;
export const BETA = 100;
export const VF_DIODE = 0.7;
/** Contact-side (load) supply — fixed safe extra-low voltage. */
export const LOAD_V = 12;
/** 12 V / 1.2 W indicator lamp, treated as a constant resistance. */
export const LAMP_R = 120;
/**
 * Illustrative only: the inductive kick without a diode is limited by stray
 * capacitance / contact arcing / transistor breakdown. We model the coil
 * current being forced through an equivalent 10 kΩ path at the instant of
 * switch-off → V ≈ V_S + I₀·10 kΩ (e.g. 12 V + 30 mA·10 kΩ ≈ 312 V).
 */
export const STRAY_R = 10_000;
/** Above this the UI shows a damage warning. */
export const SPIKE_WARN_V = 100;

export interface RelayInputs {
  mode: RelayMode;
  supplyV: number;
  coilR: number;
  flyback: boolean;
  /** basic: S1 closed (toggle) or push button held. driver: Vin = high. */
  switchOn: boolean;
  switchKind: SwitchKind;
  /** driver: logic-high level of Vin (5 V or 3.3 V). */
  vinHigh: number;
  rb: number;
  beta: number;
  /** latch: START (NO) held, STOP (NC) held, overload tripped (95–96 open). */
  startPressed: boolean;
  stopPressed: boolean;
  olTripped: boolean;
}

export interface DriverState {
  Vin: number;
  Rb: number;
  beta: number;
  Ib: number;
  /** Collector current needed for saturation = (V_S − V_CE(sat)) / R_coil. */
  IcNeeded: number;
  /** Largest collector current the base drive allows = β·I_B. */
  IcMax: number;
  saturated: boolean;
  /** Actual collector (= coil) current and V_CE. */
  Ic: number;
  Vce: number;
}

export interface RelayState {
  mode: RelayMode;
  supplyV: number;
  coilR: number;
  coilI: number;
  energized: boolean;
  inputOn: boolean;
  lampNO: boolean;
  lampNC: boolean;
  flyback: boolean;
  lastSpikeV: number;
  latched: boolean;
  driver?: DriverState;
  // --- extras (not part of the check contract) ---
  coilV: number;
  coilP: number;
  pickUpV: number;
  dropOutV: number;
  /** Second-pole holding contact 21–24 (closed when energized). */
  holdClosed: boolean;
  startPressed: boolean;
  stopPressed: boolean;
  olTripped: boolean;
  /** Current in whichever lamp is lit (A). */
  loadI: number;
}

export const DEFAULT_INPUTS: RelayInputs = {
  mode: "basic",
  supplyV: 12,
  coilR: 400,
  flyback: false,
  switchOn: false,
  switchKind: "toggle",
  vinHigh: 5,
  rb: 1000,
  beta: BETA,
  startPressed: false,
  stopPressed: false,
  olTripped: false,
};

export function thresholds(rated = RATED_V): { pickUp: number; dropOut: number } {
  return { pickUp: PICKUP_FRAC * rated, dropOut: DROPOUT_FRAC * rated };
}

/** Armature with hysteresis: pull in at ≥ pick-up, release at ≤ drop-out. */
export function nextEnergized(prev: boolean, vCoil: number, rated = RATED_V): boolean {
  const { pickUp, dropOut } = thresholds(rated);
  if (prev) return vCoil > dropOut + 1e-9;
  return vCoil >= pickUp - 1e-9;
}

/** Low-side NPN driver: coil between +V_S and collector, emitter to 0 V. */
export function solveDriver(vs: number, coilR: number, vin: number, rb: number, beta = BETA): DriverState {
  const Ib = vin > VBE ? (vin - VBE) / rb : 0;
  const IcNeeded = Math.max(0, (vs - VCE_SAT) / coilR);
  const IcMax = beta * Ib;
  const saturated = Ib > 0 && IcMax >= IcNeeded;
  const Ic = Ib > 0 ? (saturated ? IcNeeded : IcMax) : 0;
  const Vce = Math.max(0, vs - Ic * coilR);
  return { Vin: vin, Rb: rb, beta, Ib, IcNeeded, IcMax, saturated, Ic, Vce };
}

/** Peak voltage across the opening switch / transistor at coil switch-off. */
export function spikeVoltage(i0: number, supplyV: number, flyback: boolean): number {
  if (!(i0 > 0)) return 0;
  return flyback ? supplyV + VF_DIODE : supplyV + i0 * STRAY_R;
}

/**
 * Solve the board for the given inputs. `prev` carries the armature position
 * (hysteresis, self-holding) and the coil current before this change (for the
 * switch-off spike). Pass `undefined` for a fresh board.
 */
export function solve(inp: RelayInputs, prev?: RelayState): RelayState {
  const p = prev && prev.mode === inp.mode ? prev : undefined;
  const vs = Math.max(0, inp.supplyV);
  const R = Math.max(1, inp.coilR);
  let energized = p?.energized ?? false;
  let coilV = 0;
  let coilI = 0;
  let open = false; // coil circuit interrupted by the switching element
  let driver: DriverState | undefined;
  let inputOn = false;

  if (inp.mode === "basic") {
    inputOn = inp.switchOn;
    open = !inp.switchOn;
    coilV = inp.switchOn ? vs : 0;
    coilI = coilV / R;
    energized = nextEnergized(energized, coilV);
  } else if (inp.mode === "driver") {
    inputOn = inp.switchOn;
    const vin = inp.switchOn ? inp.vinHigh : 0;
    driver = solveDriver(vs, R, vin, inp.rb, inp.beta);
    open = driver.Ib === 0;
    coilI = driver.Ic;
    coilV = coilI * R;
    energized = nextEnergized(energized, coilV);
  } else {
    inputOn = inp.startPressed;
    // STOP(NC) — OL(NC 95-96) — [START(NO) ∥ K1 21-24] — coil
    for (let k = 0; k < 4; k++) {
      const path = !inp.stopPressed && !inp.olTripped && (inp.startPressed || energized);
      const v = path ? vs : 0;
      const e2 = nextEnergized(energized, v);
      if (e2 === energized) break;
      energized = e2;
    }
    const path = !inp.stopPressed && !inp.olTripped && (inp.startPressed || energized);
    open = !path;
    coilV = path ? vs : 0;
    coilI = coilV / R;
  }

  let lastSpikeV = p?.lastSpikeV ?? 0;
  if (p && p.coilI > 1e-9 && coilI <= 1e-12 && open) {
    lastSpikeV = spikeVoltage(p.coilI, p.supplyV, inp.flyback);
  }

  const lampNO = energized;
  const lampNC = !energized;
  return {
    mode: inp.mode,
    supplyV: vs,
    coilR: R,
    coilI,
    energized,
    inputOn,
    lampNO,
    lampNC,
    flyback: inp.flyback,
    lastSpikeV,
    latched: inp.mode === "latch" && energized && !inp.startPressed,
    driver,
    coilV,
    coilP: coilV * coilI,
    pickUpV: thresholds().pickUp,
    dropOutV: thresholds().dropOut,
    holdClosed: energized,
    startPressed: inp.mode === "latch" && inp.startPressed,
    stopPressed: inp.mode === "latch" && inp.stopPressed,
    olTripped: inp.mode === "latch" && inp.olTripped,
    loadI: LOAD_V / LAMP_R,
  };
}

/** Initial inputs per preset (unknown → default). */
export function presetInputs(preset: string | undefined): RelayInputs {
  switch (preset) {
    case "driver":
      return { ...DEFAULT_INPUTS, mode: "driver", switchOn: true, vinHigh: 5, rb: 1000 };
    case "latch":
      return { ...DEFAULT_INPUTS, mode: "latch" };
    case "undervoltage":
      return { ...DEFAULT_INPUTS, mode: "basic", supplyV: 0, switchOn: true };
    default:
      return { ...DEFAULT_INPUTS };
  }
}
