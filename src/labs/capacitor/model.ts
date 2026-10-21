/**
 * RC charge/discharge model (pure, deterministic, SI units).
 *
 *   τ = R·C
 *   charging   (switch → source):  v_C(t) = V + (v0 − V)·e^(−t/τ),  i(t) = (V − v0)/R · e^(−t/τ)
 *   discharging (switch → 0 V):    v_C(t) = v0·e^(−t/τ),           i(t) = −v0/R · e^(−t/τ)
 *
 * i > 0 means conventional current flowing INTO the + plate (charging);
 * i < 0 means current flowing OUT of the + plate (discharging).
 * Starting from v0 = 0 the capacitor reaches 63.2 % of V at 1τ and ≈ 99.3 % at 5τ.
 */

export type RcMode = "charge" | "discharge";
export type ComboType = "series" | "parallel";

export const LIMITS = {
  V: [1, 24] as const,
  R: [100, 1e6] as const,
  C: [1e-6, 4700e-6] as const,
};

/** Plot / run window: the simulation stops at this many time constants. */
export const T_END_TAU = 6;

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const finiteOr = (x: number, d: number) => (Number.isFinite(x) ? x : d);

export function clampV(V: number) {
  return clamp(finiteOr(V, 9), LIMITS.V[0], LIMITS.V[1]);
}
export function clampR(R: number) {
  return clamp(finiteOr(R, 10e3), LIMITS.R[0], LIMITS.R[1]);
}
export function clampC(C: number) {
  return clamp(finiteOr(C, 100e-6), LIMITS.C[0], LIMITS.C[1]);
}

export function timeConstant(R: number, C: number): number {
  return R * C;
}

/** Capacitor voltage `t` seconds after the switch was moved (t < 0 treated as 0). */
export function vcAt(mode: RcMode, V: number, v0: number, t: number, tau: number): number {
  const e = Math.exp(-Math.max(0, t) / tau);
  return mode === "charge" ? V + (v0 - V) * e : v0 * e;
}

/** Capacitor current (A, + = charging). */
export function icAt(mode: RcMode, V: number, v0: number, t: number, R: number, tau: number): number {
  const e = Math.exp(-Math.max(0, t) / tau);
  return mode === "charge" ? ((V - v0) / R) * e : (-v0 / R) * e;
}

/**
 * Charging: v_C as % of the source V. Discharging: remaining % of the voltage
 * the capacitor had when the switch moved (v0); 0 when there was nothing to discharge.
 */
export function percentOf(mode: RcMode, V: number, v0: number, vc: number): number {
  if (mode === "charge") return V > 0 ? (vc / V) * 100 : 0;
  return v0 > 0 ? (vc / v0) * 100 : 0;
}

/** Charging from 0 V: % of V reached after n time constants (n=1 → 63.2 %). */
export function percentAfterTau(n: number): number {
  return (1 - Math.exp(-n)) * 100;
}

/** Charging from 0 V: time needed to reach `percent` % of V (t = −τ·ln(1 − p/100)). */
export function timeToPercent(percent: number, tau: number): number {
  if (percent <= 0) return 0;
  if (percent >= 100) return Infinity;
  return -tau * Math.log(1 - percent / 100);
}

/** Stored energy ½·C·v². */
export function energy(C: number, v: number): number {
  return 0.5 * C * v * v;
}

// ---------------------------------------------------------------------------
// Several capacitors
// ---------------------------------------------------------------------------

export function seriesC(Cs: number[]): number {
  if (!Cs.length || Cs.some((c) => !(c > 0))) return 0;
  return 1 / Cs.reduce((s, c) => s + 1 / c, 0);
}

export function parallelC(Cs: number[]): number {
  return Cs.reduce((s, c) => s + (c > 0 ? c : 0), 0);
}

export interface ComboResult {
  type: ComboType;
  C: number[];
  Ceq: number;
  /** Charge on each capacitor (C) when the combination is fully charged to V. */
  Q: number[];
  /** Voltage across each capacitor (V). */
  Vk: number[];
  /** Total charge drawn from the source. */
  Qtotal: number;
}

/**
 * Fully charged combination across V.
 * Series: every capacitor carries the same Q = C_eq·V; V_k = Q / C_k (smallest C gets the largest share).
 * Parallel: every capacitor sees V; Q_k = C_k·V; Q_total = C_eq·V.
 */
export function analyzeCombo(type: ComboType, Cs: number[], V: number): ComboResult {
  const C = Cs.map(clampC);
  if (type === "series") {
    const Ceq = seriesC(C);
    const Q = Ceq * V;
    return { type, C, Ceq, Q: C.map(() => Q), Vk: C.map((c) => Q / c), Qtotal: Q };
  }
  const Ceq = parallelC(C);
  return { type, C, Ceq, Q: C.map((c) => c * V), Vk: C.map(() => V), Qtotal: Ceq * V };
}

// ---------------------------------------------------------------------------
// Observable state (contract: LAB_SPEC §4)
// ---------------------------------------------------------------------------

export interface CapacitorState {
  V: number;
  R: number;
  C: number;
  tau: number;
  mode: RcMode;
  /** s since the switch was moved */
  t: number;
  vc: number;
  ic: number;
  percent: number;
  combo: { type: ComboType; C: number[]; Ceq: number };
  // extras (not part of the check contract)
  /** v_C at the moment the switch was moved */
  v0: number;
  tab: "rc" | "combo";
}

export interface RcInputs {
  V: number;
  R: number;
  C: number;
  mode: RcMode;
  v0: number;
  t: number;
}

export function rcSnapshot(inp: RcInputs) {
  const V = clampV(inp.V);
  const R = clampR(inp.R);
  const C = clampC(inp.C);
  const tau = timeConstant(R, C);
  // v_C can never exceed the source or go below 0 in this circuit.
  const v0 = clamp(finiteOr(inp.v0, 0), 0, LIMITS.V[1]);
  const t = Math.max(0, finiteOr(inp.t, 0));
  const vc = vcAt(inp.mode, V, v0, t, tau);
  const ic = icAt(inp.mode, V, v0, t, R, tau);
  return { V, R, C, tau, mode: inp.mode, v0, t, vc, ic, percent: percentOf(inp.mode, V, v0, vc) };
}

export function buildState(
  inp: RcInputs,
  combo: { type: ComboType; C: number[] },
  tab: "rc" | "combo",
): CapacitorState {
  const s = rcSnapshot(inp);
  const c = analyzeCombo(combo.type, combo.C, s.V);
  return { ...s, combo: { type: c.type, C: c.C, Ceq: c.Ceq }, tab };
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface PresetConfig {
  tab: "rc" | "combo";
  V: number;
  R: number;
  C: number;
  mode: RcMode;
  comboType: ComboType;
  comboC: number[];
  rating: number;
}

export const PRESETS: Record<string, PresetConfig> = {
  default: { tab: "rc", V: 9, R: 10e3, C: 100e-6, mode: "charge", comboType: "series", comboC: [100e-6, 220e-6], rating: 16 },
  slow: { tab: "rc", V: 9, R: 1e6, C: 10e-6, mode: "charge", comboType: "series", comboC: [100e-6, 220e-6], rating: 16 },
  "combo-series": { tab: "combo", V: 9, R: 10e3, C: 100e-6, mode: "charge", comboType: "series", comboC: [100e-6, 220e-6], rating: 16 },
  "combo-parallel": {
    tab: "combo",
    V: 9,
    R: 10e3,
    C: 100e-6,
    mode: "charge",
    comboType: "parallel",
    comboC: [100e-6, 220e-6, 470e-6],
    rating: 16,
  },
};

export function presetConfig(key?: string): PresetConfig {
  return PRESETS[key ?? "default"] ?? PRESETS.default;
}

/** Electrolytic voltage ratings offered (V). */
export const RATINGS = [6.3, 10, 16, 25, 35, 50];
