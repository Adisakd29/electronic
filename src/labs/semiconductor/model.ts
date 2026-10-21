/**
 * Semiconductor lab — pure, deterministic models (no React).
 *
 *  diode : Shockley equation  I = Is·(e^(Vd/(n·Vt)) − 1), series circuit Vs–R–D,
 *          operating point solved numerically (bisection on Vd).
 *  LED   : piecewise model  I_F = (Vs − V_F)/R  (0 if Vs < V_F), latching burn-out > 30 mA.
 *  rect  : half-wave / centre-tap / bridge with 0.7 V per conducting Si diode,
 *          optional capacitor filter (ripple ≈ I/(f_r·C)).
 *  bjt   : NPN switch  I_B = (Vin − 0.7)/R_B,  I_C = min(β·I_B, I_C(sat)).
 */

export type Tab = "diode" | "led" | "rect" | "bjt";

// ---------------------------------------------------------------------------
// Diode (Shockley)
// ---------------------------------------------------------------------------

export type DiodeMaterial = "si" | "ge" | "schottky";

/** Thermal voltage kT/q at 300 K. */
export const VT = 0.02585;

export const MATERIALS: Record<DiodeMaterial, { label: string; Is: number; n: number }> = {
  si: { label: "ซิลิคอน (Si)", Is: 1e-14, n: 1.0 },
  ge: { label: "เจอร์เมเนียม (Ge)", Is: 2e-7, n: 1.1 },
  schottky: { label: "ชอตต์กี (Schottky)", Is: 1e-8, n: 1.05 },
};

export function diodeCurrent(material: DiodeMaterial, Vd: number): number {
  const { Is, n } = MATERIALS[material];
  // cap the exponent so plots never overflow
  return Is * (Math.exp(Math.min(Vd / (n * VT), 200)) - 1);
}

export interface DiodeState {
  material: DiodeMaterial;
  Vs: number;
  R: number;
  Id: number;
  Vd: number;
  bias: "forward" | "reverse";
}

/** Solve Vs = Id·R + Vd with the Shockley diode (monotonic → bisection). */
export function solveDiode(material: DiodeMaterial, Vs: number, R: number): DiodeState {
  const f = (vd: number) => diodeCurrent(material, vd) - (Vs - vd) / R;
  let lo = Math.min(0, Vs);
  let hi = Math.max(0, Vs);
  if (lo === hi) return { material, Vs, R, Id: 0, Vd: 0, bias: "forward" };
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  const Vd = (lo + hi) / 2;
  const Id = (Vs - Vd) / R;
  return { material, Vs, R, Id, Vd, bias: Vs < 0 ? "reverse" : "forward" };
}

/** I–V characteristic sampled over [v0, v1]; currents clamped to ±iClamp for plotting. */
export function diodeCurve(material: DiodeMaterial, v0: number, v1: number, iClamp: number, n = 240): [number, number][] {
  const pts: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const v = v0 + ((v1 - v0) * k) / n;
    const i = diodeCurrent(material, v);
    pts.push([v, Math.max(-iClamp, Math.min(iClamp, i))]);
    if (i > iClamp) break;
  }
  return pts;
}

// ---------------------------------------------------------------------------
// LED
// ---------------------------------------------------------------------------

export type LedColor = "ir" | "red" | "yellow" | "green" | "true-green" | "blue" | "white";

/** Typical forward voltage at 20 mA (spec §7). `hex` is the emitted colour for the drawing only. */
export const LED_COLORS: Record<LedColor, { label: string; Vf: number; hex: string }> = {
  ir: { label: "อินฟราเรด (IR) 1.3 V", Vf: 1.3, hex: "#8e3b6e" },
  red: { label: "แดง 2.0 V", Vf: 2.0, hex: "#ff3b30" },
  yellow: { label: "เหลือง 2.1 V", Vf: 2.1, hex: "#ffcc00" },
  green: { label: "เขียวมาตรฐาน 2.1 V", Vf: 2.1, hex: "#7ed321" },
  "true-green": { label: "เขียวสด (true green) 3.0 V", Vf: 3.0, hex: "#00d26a" },
  blue: { label: "น้ำเงิน 3.0 V", Vf: 3.0, hex: "#2f7bff" },
  white: { label: "ขาว 3.1 V", Vf: 3.1, hex: "#f4f7ff" },
};

export const LED_RATED = 0.02; // A — rated (full brightness)
export const LED_BURN = 0.03; // A — above this the LED is destroyed
export const LED_DIM = 0.002; // A — below this it is reported as "dim"

export type LedStatus = "off" | "ok" | "dim" | "burnt";

export interface LedState {
  color: LedColor;
  Vf: number;
  Vs: number;
  R: number;
  If: number;
  status: LedStatus;
}

/** Current the circuit would drive through a healthy LED (piecewise model). */
export function ledRawCurrent(color: LedColor, Vs: number, R: number): number {
  const Vf = LED_COLORS[color].Vf;
  return Vs > Vf ? (Vs - Vf) / R : 0;
}

/**
 * LED operating point. `burnt` is the latched "already destroyed" flag; an LED that
 * would carry > 30 mA is reported burnt too (open circuit → If = 0).
 */
export function solveLed(color: LedColor, Vs: number, R: number, burnt = false): LedState {
  const Vf = LED_COLORS[color].Vf;
  const raw = ledRawCurrent(color, Vs, R);
  if (burnt || raw > LED_BURN) return { color, Vf, Vs, R, If: 0, status: "burnt" };
  const status: LedStatus = raw <= 0 ? "off" : raw < LED_DIM ? "dim" : "ok";
  return { color, Vf, Vs, R, If: raw, status };
}

/** Relative brightness 0…1 (∝ I_F up to the 20 mA rating). */
export function ledBrightness(s: LedState): number {
  if (s.status === "burnt" || s.If <= 0) return 0;
  return Math.min(1, s.If / LED_RATED);
}

/** Series resistor for a wanted forward current: R = (Vs − Vf)/If. */
export function ledSeriesR(Vs: number, Vf: number, If = LED_RATED): number {
  return Vs > Vf ? (Vs - Vf) / If : NaN;
}

// ---------------------------------------------------------------------------
// Rectifier + capacitor filter
// ---------------------------------------------------------------------------

export type RectType = "half" | "center-tap" | "bridge";

export const F_MAINS = 50; // Hz
export const V_DIODE = 0.7; // V per conducting Si diode

export interface RectState {
  type: RectType;
  Vrms: number;
  Rl: number;
  C: number;
  /** Peak output voltage (after diode drops). */
  Vp: number;
  Vdc: number;
  /** Peak-to-peak ripple (V). Without a filter the output swings 0…Vp. */
  ripple: number;
}

export function diodeDrops(type: RectType): number {
  return type === "bridge" ? 2 * V_DIODE : V_DIODE;
}

export function rippleFreq(type: RectType): number {
  return type === "half" ? F_MAINS : 2 * F_MAINS;
}

export function solveRect(type: RectType, Vrms: number, Rl: number, C: number): RectState {
  const VpIn = Vrms * Math.SQRT2;
  const Vp = Math.max(0, VpIn - diodeDrops(type));
  const fr = rippleFreq(type);
  const unfiltered = (type === "half" ? 0.318 : 0.636) * Vp;
  if (!(C > 0)) return { type, Vrms, Rl, C: 0, Vp, Vdc: unfiltered, ripple: Vp };
  const I = Vp / Rl;
  const ripple = Math.min(Vp, I / (fr * C));
  const Vdc = Math.max(unfiltered, Vp - ripple / 2);
  return { type, Vrms, Rl, C, Vp, Vdc, ripple };
}

/** Secondary voltage (for centre-tap: one half-winding) at time t. */
export function vIn(Vrms: number, t: number): number {
  return Vrms * Math.SQRT2 * Math.sin(2 * Math.PI * F_MAINS * t);
}

/** Rectified (unfiltered) output at time t. */
export function vRectified(type: RectType, Vrms: number, t: number): number {
  const v = vIn(Vrms, t);
  const mag = type === "half" ? v : Math.abs(v);
  return Math.max(0, mag - diodeDrops(type));
}

/**
 * Output waveform over `cycles` mains cycles. With C > 0 the capacitor follows the
 * rectified voltage while charging and decays as e^(−t/RC) into R_L otherwise.
 * The simulation starts from a charged capacitor (steady state).
 */
export function rectWaveform(type: RectType, Vrms: number, Rl: number, C: number, cycles = 2, n = 400): { t: number; vin: number; vout: number }[] {
  const T = cycles / F_MAINS;
  const out: { t: number; vin: number; vout: number }[] = [];
  const Vp = Math.max(0, Vrms * Math.SQRT2 - diodeDrops(type));
  let vc = Vp;
  // pre-run one cycle so the capacitor is in steady state at t = 0
  const dt = T / n;
  if (C > 0) {
    const pre = Math.round(n / cycles);
    for (let k = 0; k <= pre; k++) {
      const t = k * dt;
      vc = Math.max(vRectified(type, Vrms, t), vc * Math.exp(-dt / (Rl * C)));
    }
  }
  for (let k = 0; k <= n; k++) {
    const t = k * dt;
    const vr = vRectified(type, Vrms, t);
    if (C > 0) {
      vc = k === 0 ? vc : Math.max(vr, vc * Math.exp(-dt / (Rl * C)));
      out.push({ t, vin: vIn(Vrms, t), vout: Math.max(vr, vc) });
    } else out.push({ t, vin: vIn(Vrms, t), vout: vr });
  }
  return out;
}

// ---------------------------------------------------------------------------
// BJT switch (NPN, common emitter)
// ---------------------------------------------------------------------------

export type BjtLoad = "resistor" | "led" | "relay";
export type BjtRegion = "cutoff" | "active" | "saturation";

export const VBE_ON = 0.7;
export const VCE_SAT = 0.2;
/** Red indicator LED used as the "LED load". */
export const BJT_LED_VF = 2.0;
/** Relay pulls in when the coil gets ≥ 70 % of Vcc (coil rated at Vcc). */
export const RELAY_PULL_IN = 0.7;

export interface BjtState {
  Vcc: number;
  Vin: number;
  Rb: number;
  Rc: number;
  beta: number;
  load: BjtLoad;
  Ib: number;
  Ic: number;
  Vce: number;
  region: BjtRegion;
  /** Ic needed for saturation: (Vcc − Vce(sat) − V_load)/Rc. */
  IcSat: number;
}

export function solveBjt(Vcc: number, Vin: number, Rb: number, Rc: number, beta: number, load: BjtLoad = "resistor"): BjtState {
  const vLoad = load === "led" ? BJT_LED_VF : 0;
  const IcSat = Math.max(0, (Vcc - VCE_SAT - vLoad) / Rc);
  const Ib = Vin > VBE_ON ? (Vin - VBE_ON) / Rb : 0;
  const base = { Vcc, Vin, Rb, Rc, beta, load, Ib, IcSat };
  if (Ib <= 0) return { ...base, Ic: 0, Vce: Vcc, region: "cutoff" };
  const IcActive = beta * Ib;
  if (IcActive >= IcSat) return { ...base, Ic: IcSat, Vce: VCE_SAT, region: "saturation" };
  return { ...base, Ic: IcActive, Vce: Vcc - vLoad - IcActive * Rc, region: "active" };
}

/** Is the load "on"? (LED lit / relay energised / any current for a resistor). */
export function bjtLoadOn(s: BjtState): boolean {
  if (s.load === "relay") return s.Ic * s.Rc >= RELAY_PULL_IN * s.Vcc;
  return s.Ic > 0;
}

// ---------------------------------------------------------------------------
// Whole-lab state
// ---------------------------------------------------------------------------

export interface SemiState {
  tab: Tab;
  diode: DiodeState;
  led: LedState;
  rect: RectState;
  bjt: BjtState;
}

export interface SemiInputs {
  tab: Tab;
  diode: { material: DiodeMaterial; Vs: number; R: number };
  led: { color: LedColor; Vs: number; R: number; burnt: boolean };
  rect: { type: RectType; Vrms: number; Rl: number; C: number };
  bjt: { Vcc: number; Vin: number; Rb: number; Rc: number; beta: number; load: BjtLoad };
}

export function solveAll(i: SemiInputs): SemiState {
  return {
    tab: i.tab,
    diode: solveDiode(i.diode.material, i.diode.Vs, i.diode.R),
    led: solveLed(i.led.color, i.led.Vs, i.led.R, i.led.burnt),
    rect: solveRect(i.rect.type, i.rect.Vrms, i.rect.Rl, i.rect.C),
    bjt: solveBjt(i.bjt.Vcc, i.bjt.Vin, i.bjt.Rb, i.bjt.Rc, i.bjt.beta, i.bjt.load),
  };
}

const BASE: SemiInputs = {
  tab: "diode",
  diode: { material: "si", Vs: 5, R: 1000 },
  led: { color: "red", Vs: 5, R: 330, burnt: false },
  rect: { type: "bridge", Vrms: 12, Rl: 1000, C: 0 },
  bjt: { Vcc: 12, Vin: 5, Rb: 10000, Rc: 1000, beta: 100, load: "resistor" },
};

export const PRESET_KEYS = ["default", "led", "rectifier", "filter", "bjt"] as const;

export function presetInputs(preset?: string): SemiInputs {
  const p: SemiInputs = structuredCloneLite(BASE);
  switch (preset) {
    case "led":
      p.tab = "led";
      p.led = { color: "red", Vs: 5, R: 150, burnt: false };
      break;
    case "rectifier":
      p.tab = "rect";
      p.rect = { type: "bridge", Vrms: 12, Rl: 1000, C: 0 };
      break;
    case "filter":
      p.tab = "rect";
      p.rect = { type: "bridge", Vrms: 12, Rl: 1000, C: 1000e-6 };
      break;
    case "bjt":
      p.tab = "bjt";
      p.bjt = { Vcc: 12, Vin: 5, Rb: 10000, Rc: 1000, beta: 100, load: "resistor" };
      break;
    default:
      break;
  }
  return p;
}

function structuredCloneLite<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
