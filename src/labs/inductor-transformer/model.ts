/**
 * Inductor & transformer — pure model (no React).
 * All quantities in SI base units (m, m², H, T, A, V, Ω, Hz, s, W).
 */

export const MU0 = 4 * Math.PI * 1e-7; // H/m

export type CoreKind = "air" | "ferrite" | "iron";
export const CORES: Record<CoreKind, { mur: number; label: string }> = {
  air: { mur: 1, label: "อากาศ (μr = 1)" },
  ferrite: { mur: 200, label: "เฟอร์ไรต์ (μr ≈ 200)" },
  iron: { mur: 1000, label: "เหล็ก (μr ≈ 1000)" },
};

/** Field strength above which a real ferromagnetic core would saturate (T). */
export const SATURATION_B = { ferrite: 0.4, iron: 1.6 } as const;

export const LIMITS = {
  N: [10, 1000],
  lCm: [1, 20],
  dCm: [0.5, 5],
  I: [0, 2],
  f: [50, 100_000],
  R: [1, 1000],
  V: [1, 24],
  turns: [10, 2000],
  Vp: [6, 240],
  Rload: [1, 10_000],
  eta: [0.8, 0.99],
} as const;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Inductor
// ---------------------------------------------------------------------------

export interface InductorInput {
  N: number;
  /** coil length (m) */
  l: number;
  /** coil diameter (m) */
  d: number;
  core: CoreKind;
  /** DC current for the field display (A) */
  I: number;
  f: number;
  /** series resistance in the RL circuit (Ω) */
  R: number;
  /** step source voltage in the RL circuit (V) */
  V: number;
  /** time since the switch closed (s) */
  t: number;
}

export interface InductorState extends InductorInput {
  A: number;
  mur: number;
  L: number;
  B: number;
  XL: number;
  tau: number;
  i: number;
}

export const area = (d: number) => (Math.PI * d * d) / 4;
/** L = μ0·μr·N²·A / l */
export const solenoidL = (N: number, A: number, l: number, mur: number) => (MU0 * mur * N * N * A) / l;
/** Long-solenoid approximation B = μ0·μr·N·I / l */
export const solenoidB = (N: number, I: number, l: number, mur: number) => (MU0 * mur * N * I) / l;
/** X_L = 2πfL */
export const inductiveReactance = (f: number, L: number) => 2 * Math.PI * f * L;
/** τ = L/R */
export const rlTau = (L: number, R: number) => L / R;
/** RL step response i(t) = V/R·(1 − e^(−t/τ)), 0 for t < 0. */
export const rlCurrent = (V: number, R: number, tau: number, t: number) =>
  t <= 0 ? 0 : (V / R) * (1 - Math.exp(-t / tau));
/** Inductor voltage (equals the opposing back-EMF magnitude) v_L(t) = V·e^(−t/τ). */
export const rlInductorVoltage = (V: number, tau: number, t: number) => (t < 0 ? 0 : V * Math.exp(-t / tau));

/**
 * Wheeler/Nagaoka-style correction factor for a short coil (≈ 1/(1+0.45·d/l)).
 * Used only to warn that the ideal formula overestimates L for short coils.
 */
export const shortCoilFactor = (d: number, l: number) => 1 / (1 + 0.45 * (d / l));
/** Coil is "short" (long-solenoid formula notably inaccurate) when l < 10·d. */
export const isShortCoil = (d: number, l: number) => l < 10 * d;

export function computeInductor(inp: InductorInput): InductorState {
  const mur = CORES[inp.core].mur;
  const A = area(inp.d);
  const L = solenoidL(inp.N, A, inp.l, mur);
  const B = solenoidB(inp.N, inp.I, inp.l, mur);
  const XL = inductiveReactance(inp.f, L);
  const tau = rlTau(L, inp.R);
  const i = rlCurrent(inp.V, inp.R, tau, inp.t);
  return { ...inp, A, mur, L, B, XL, tau, i };
}

/** Number of field lines to draw (pairs, top+bottom), relative log scale of B. 0 when B = 0. */
export function fieldLineCount(B: number): number {
  if (!(B > 0)) return 0;
  return clamp(Math.round(2 + 2.2 * Math.log10(B / 1e-4)), 1, 9);
}

// ---------------------------------------------------------------------------
// Transformer (ideal, optional lumped efficiency)
// ---------------------------------------------------------------------------

export type StepType = "step-up" | "step-down" | "isolation";
export type Polarity = "additive" | "subtractive";

export interface TransformerInput {
  Np: number;
  Ns: number;
  /** primary rms voltage (V) */
  Vp: number;
  /** load resistance (Ω); Infinity = open secondary */
  Rload: number;
  /** efficiency 0.8…1 (1 = ideal) */
  eta: number;
  polarity: Polarity;
}

export interface TransformerState extends TransformerInput {
  Vs: number;
  Is: number;
  Ip: number;
  Ps: number;
  Pp: number;
  /** Np/Ns */
  ratio: number;
  type: StepType;
  /** apparent power at the primary Vp·Ip (VA) */
  Sp: number;
  /** power lost as heat Pp − Ps (W) */
  Ploss: number;
  /** H1–X1 jumpered polarity test: voltage measured H2–X2 */
  Vtest: number;
}

export function stepType(Np: number, Ns: number): StepType {
  if (Np === Ns) return "isolation";
  return Ns > Np ? "step-up" : "step-down";
}

export function computeTransformer(inp: TransformerInput): TransformerState {
  const ratio = inp.Np / inp.Ns;
  const Vs = (inp.Vp * inp.Ns) / inp.Np;
  const open = !Number.isFinite(inp.Rload);
  const Is = open ? 0 : Vs / inp.Rload;
  const Ps = Vs * Is;
  const Pp = Ps / inp.eta;
  const Ip = Pp / inp.Vp; // = Vs·Is / (η·Vp)
  const Vtest = inp.polarity === "additive" ? inp.Vp + Vs : Math.abs(inp.Vp - Vs);
  return {
    ...inp,
    ratio,
    Vs,
    Is,
    Ps,
    Pp,
    Ip,
    type: stepType(inp.Np, inp.Ns),
    Sp: inp.Vp * Ip,
    Ploss: Pp - Ps,
    Vtest,
  };
}

/** Hazardous-voltage threshold (AC rms) — above this the S3 note is shown. */
export const ELV_AC = 50;

// ---------------------------------------------------------------------------
// Lab state + presets
// ---------------------------------------------------------------------------

export type Tab = "inductor" | "transformer";

export interface LabInputs {
  tab: Tab;
  inductor: InductorInput;
  transformer: TransformerInput;
}

export interface LabState {
  tab: Tab;
  inductor: InductorState;
  transformer: TransformerState;
}

export const DEFAULT_INDUCTOR: InductorInput = { N: 200, l: 0.05, d: 0.01, core: "air", I: 1, f: 1000, R: 10, V: 5, t: 0 };
export const DEFAULT_TRANSFORMER: TransformerInput = { Np: 1000, Ns: 52, Vp: 230, Rload: 12, eta: 1, polarity: "subtractive" };

export const PRESET_INPUTS: Record<string, LabInputs> = {
  default: { tab: "inductor", inductor: { ...DEFAULT_INDUCTOR }, transformer: { ...DEFAULT_TRANSFORMER } },
  "iron-core": {
    tab: "inductor",
    inductor: { ...DEFAULT_INDUCTOR, core: "iron", I: 0.2, f: 50 },
    transformer: { ...DEFAULT_TRANSFORMER },
  },
  "rl-time": {
    tab: "inductor",
    inductor: { N: 500, l: 0.1, d: 0.02, core: "iron", I: 0.1, f: 50, R: 100, V: 12, t: 0.00987 },
    transformer: { ...DEFAULT_TRANSFORMER },
  },
  transformer: { tab: "transformer", inductor: { ...DEFAULT_INDUCTOR }, transformer: { ...DEFAULT_TRANSFORMER } },
  "step-up": {
    tab: "transformer",
    inductor: { ...DEFAULT_INDUCTOR },
    transformer: { Np: 100, Ns: 400, Vp: 12, Rload: 1000, eta: 1, polarity: "subtractive" },
  },
};

export function presetInputs(preset?: string): LabInputs {
  const p = PRESET_INPUTS[preset ?? "default"] ?? PRESET_INPUTS.default;
  return { tab: p.tab, inductor: { ...p.inductor }, transformer: { ...p.transformer } };
}

export function computeState(inp: LabInputs): LabState {
  return { tab: inp.tab, inductor: computeInductor(inp.inductor), transformer: computeTransformer(inp.transformer) };
}
