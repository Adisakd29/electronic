/**
 * Ohm's Law Laboratory — pure, deterministic model (no React).
 *
 * Ideal linear resistor fed by an ideal DC source; ideal ammeter (0 Ω, in
 * series) and voltmeter (∞ Ω, in parallel with R), so I = V/R and P = V·I
 * exactly. The `body` preset maps the current to the approximate effect zones
 * of IEC 60479-1 (AC 15–100 Hz, hand-to-feet, long duration).
 */
import { near } from "../types";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface OhmsPoint {
  V: number;
  I: number;
  R: number;
}

/** Observable state (LAB_SPEC §2 — fixed shape). */
export interface OhmsState {
  V: number; // V
  R: number; // Ω
  I: number; // A
  P: number; // W
  points: OhmsPoint[];
  preset: string;
}

export type PresetKey = "default" | "body" | "power" | "led-resistor";

export interface PresetConfig {
  key: PresetKey;
  V: number;
  R: number;
  Vmin: number;
  Vmax: number;
  Vstep: number;
  Rmin: number;
  Rmax: number;
  /** IEC 60479-1 effect band under the current readout. */
  body: boolean;
  /** Extra P–V plot and power-rating selector. */
  power: boolean;
  /** Show I in mA with LED sizing hints. */
  led: boolean;
}

export const PRESETS: Record<PresetKey, PresetConfig> = {
  default: { key: "default", V: 12, R: 1000, Vmin: 0, Vmax: 30, Vstep: 0.1, Rmin: 10, Rmax: 10_000, body: false, power: false, led: false },
  // Starts at a low, non-mains value so no task is satisfied before the learner acts.
  body: { key: "body", V: 50, R: 10_000, Vmin: 0, Vmax: 400, Vstep: 1, Rmin: 500, Rmax: 1_000_000, body: true, power: false, led: false },
  power: { key: "power", V: 5, R: 470, Vmin: 0, Vmax: 24, Vstep: 0.1, Rmin: 10, Rmax: 1000, body: false, power: true, led: false },
  "led-resistor": { key: "led-resistor", V: 5, R: 220, Vmin: 0, Vmax: 12, Vstep: 0.1, Rmin: 100, Rmax: 1000, body: false, power: false, led: true },
};

export function presetConfig(preset?: string): PresetConfig {
  return preset && preset in PRESETS ? PRESETS[preset as PresetKey] : PRESETS.default;
}

/** Maximum number of recorded points kept (oldest dropped first). */
export const MAX_POINTS = 60;

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

/** Ohm's law with an ideal source: I = V/R, P = V·I = V²/R. R must be > 0. */
export function solve(V: number, R: number): { I: number; P: number } {
  if (!(R > 0) || !Number.isFinite(V)) return { I: NaN, P: NaN };
  const I = V / R;
  return { I, P: V * I };
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Remove float noise from slider arithmetic (e.g. 10.800000000000001 → 10.8). */
export function tidy(x: number): number {
  return Number(x.toPrecision(10));
}

export function makeState(V: number, R: number, points: OhmsPoint[], preset: string): OhmsState {
  const { I, P } = solve(V, R);
  return { V, R, I, P, points, preset };
}

export function initialState(preset?: string): OhmsState {
  const c = presetConfig(preset);
  return makeState(c.V, c.R, [], c.key);
}

/**
 * "ล็อกตัวแปร": hold one quantity and solve for the other from a wanted current.
 *   lock R → V = I·R      lock V → R = V/I
 * The result is clamped to the preset range; `clamped` tells the UI so it can
 * explain that the wanted current cannot be reached.
 */
export function solveForCurrent(
  lock: "R" | "V",
  Iwanted: number,
  V: number,
  R: number,
  cfg: PresetConfig,
): { V: number; R: number; clamped: boolean; ok: boolean } {
  if (!Number.isFinite(Iwanted) || Iwanted < 0) return { V, R, clamped: false, ok: false };
  if (lock === "R") {
    const raw = Iwanted * R;
    const v = tidy(clamp(raw, cfg.Vmin, cfg.Vmax));
    return { V: v, R, clamped: !near(v, raw, 1e-9, 1e-12), ok: true };
  }
  if (Iwanted === 0 || V <= 0) return { V, R, clamped: false, ok: false };
  const raw = V / Iwanted;
  const r = tidy(clamp(raw, cfg.Rmin, cfg.Rmax));
  return { V, R: r, clamped: !near(r, raw, 1e-9), ok: true };
}

// ---------------------------------------------------------------------------
// Recorded points
// ---------------------------------------------------------------------------

/** Two R values are "the same resistor" when within 0.5 %. */
export function sameR(a: number, b: number): boolean {
  return near(a, b, 0.005);
}

/** Record (V, I, R). An identical (V, R) point replaces the old one, so
 *  pressing "บันทึกจุด" twice does not inflate the count. */
export function addPoint(points: OhmsPoint[], V: number, R: number): OhmsPoint[] {
  const { I } = solve(V, R);
  if (!Number.isFinite(I)) return points;
  const p: OhmsPoint = { V, I, R };
  const rest = points.filter((q) => !(sameR(q.R, R) && near(q.V, V, 1e-6, 1e-9)));
  const out = [...rest, p];
  return out.length > MAX_POINTS ? out.slice(out.length - MAX_POINTS) : out;
}

/** Distinct R values (in first-recorded order) among points. */
export function distinctRValues(points: OhmsPoint[]): number[] {
  const out: number[] = [];
  for (const p of points) if (!out.some((r) => sameR(r, p.R))) out.push(p.R);
  return out;
}

/** Size of the largest group of points sharing one R. */
export function largestSameRGroup(points: OhmsPoint[]): number {
  let best = 0;
  for (const r of distinctRValues(points)) {
    const n = points.filter((p) => sameR(p.R, r)).length;
    if (n > best) best = n;
  }
  return best;
}

// ---------------------------------------------------------------------------
// IEC 60479-1 approximate effect zones (AC 15–100 Hz, hand-to-feet)
// ---------------------------------------------------------------------------

export interface BodyBand {
  id: "none" | "perception" | "let-go" | "rcd" | "vf";
  /** Lower bound, A (inclusive). */
  from: number;
  label: string; // Thai + English term
  effect: string;
  tone: "ok" | "warn" | "danger";
}

/** Thresholds (A): 0.5 mA perception · 10 mA let-go · 30 mA RCD IΔn · ~50 mA onset of VF risk (~50–80 mA). */
export const BODY_THRESHOLDS = { perception: 0.0005, letGo: 0.01, rcd: 0.03, vf: 0.05 } as const;

export const BODY_BANDS: BodyBand[] = [
  { id: "none", from: 0, label: "ต่ำกว่าเกณฑ์รู้สึก (below perception)", effect: "โดยทั่วไปไม่รู้สึก", tone: "ok" },
  { id: "perception", from: BODY_THRESHOLDS.perception, label: "รู้สึกได้ (perception)", effect: "รู้สึกเสียวซ่า–เจ็บ ส่วนใหญ่ยังปล่อยมือได้", tone: "warn" },
  { id: "let-go", from: BODY_THRESHOLDS.letGo, label: "เกินเกณฑ์ปล่อยมือ (let-go)", effect: "กล้ามเนื้อเกร็ง อาจปล่อยมือไม่ได้ หายใจลำบาก", tone: "danger" },
  { id: "rcd", from: BODY_THRESHOLDS.rcd, label: "ถึง/เกินพิกัด RCD 30 mA", effect: "RCD 30 mA ต้องตัดวงจร หากไม่มี RCD อันตรายรุนแรง", tone: "danger" },
  { id: "vf", from: BODY_THRESHOLDS.vf, label: "เสี่ยงหัวใจเต้นพลิ้ว (VF risk)", effect: "ช่วง ~50–80 mA ขึ้นไปเสี่ยง ventricular fibrillation ขึ้นกับเวลาที่ไหล", tone: "danger" },
];

export function bodyBand(I: number): BodyBand {
  const a = Math.abs(I);
  let band = BODY_BANDS[0];
  for (const b of BODY_BANDS) if (a >= b.from * (1 - 1e-9)) band = b;
  return band;
}

// ---------------------------------------------------------------------------
// LED sizing & power rating hints
// ---------------------------------------------------------------------------

/** Typical 5 mm indicator LED: ~20 mA max continuous, visible from a few mA. */
export const LED_I_MAX = 0.02;
export const LED_I_MIN = 0.002;

export function ledHint(I: number): "low" | "ok" | "high" {
  if (I > LED_I_MAX * (1 + 1e-9)) return "high";
  if (I < LED_I_MIN) return "low";
  return "ok";
}

export const POWER_RATINGS = [0.125, 0.25, 0.5, 1, 2];

/** V at which a resistor R reaches power P: V = √(P·R). */
export function voltageForPower(P: number, R: number): number {
  return Math.sqrt(P * R);
}

// ---------------------------------------------------------------------------
// Plot helpers
// ---------------------------------------------------------------------------

/** Smallest "nice" value (1, 2, 2.5, 5 × 10ⁿ) ≥ x. */
export function niceCeil(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) return 1;
  const mag = 10 ** Math.floor(Math.log10(x));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * mag >= x * (1 - 1e-9)) return Number((k * mag).toPrecision(6));
  return 10 * mag;
}

/** Display unit for a current axis whose maximum is `max` A. */
export function currentScale(max: number): { factor: number; unit: string } {
  if (max < 1e-3) return { factor: 1e6, unit: "µA" };
  if (max < 1) return { factor: 1e3, unit: "mA" };
  return { factor: 1, unit: "A" };
}

export function powerScale(max: number): { factor: number; unit: string } {
  if (max < 1) return { factor: 1e3, unit: "mW" };
  return { factor: 1, unit: "W" };
}

/** Speed (loops per second) of the current-flow dots; ∝ log of current, 0 when no current. */
export function dotSpeed(I: number): number {
  if (!(I > 1e-7)) return 0;
  return clamp(0.15 + 0.12 * (Math.log10(I) + 6), 0.1, 1.2);
}

// ---------------------------------------------------------------------------
// Checks (LAB_SPEC §2 — keys and params are fixed)
// ---------------------------------------------------------------------------

type Params = Record<string, number | string | boolean>;

const num = (v: unknown, d = NaN) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : d);

function asState(s: unknown): OhmsState | null {
  if (!s || typeof s !== "object") return null;
  const o = s as Partial<OhmsState>;
  if (typeof o.V !== "number" || typeof o.R !== "number") return null;
  return {
    V: o.V,
    R: o.R,
    I: typeof o.I === "number" ? o.I : o.V / o.R,
    P: typeof o.P === "number" ? o.P : (o.V * o.V) / o.R,
    points: Array.isArray(o.points) ? o.points : [],
    preset: typeof o.preset === "string" ? o.preset : "default",
  };
}

/** Default relative tolerances where the spec gives none. */
export const DEFAULT_TOL = { current: 0.03, setVR: 0.02, power: 0.03 } as const;

export function checkCurrentEquals(state: unknown, p: Params): boolean {
  const s = asState(state);
  return !!s && near(s.I, num(p.target), num(p.tol, DEFAULT_TOL.current));
}

export function checkSetVR(state: unknown, p: Params): boolean {
  const s = asState(state);
  const tol = num(p.tol, DEFAULT_TOL.setVR);
  return !!s && near(s.V, num(p.V), tol) && near(s.R, num(p.R), tol);
}

export function checkPointsRecorded(state: unknown, p: Params): boolean {
  const s = asState(state);
  if (!s) return false;
  const min = num(p.min, 1);
  const n = p.sameR === true || p.sameR === "true" ? largestSameRGroup(s.points) : s.points.length;
  return n >= min;
}

export function checkDistinctR(state: unknown, p: Params): boolean {
  const s = asState(state);
  return !!s && distinctRValues(s.points).length >= num(p.min, 1);
}

export function checkBodyCurrentBelow(state: unknown, p: Params): boolean {
  const s = asState(state);
  const max = num(p.max);
  return !!s && Number.isFinite(s.I) && Number.isFinite(max) && s.I <= max * (1 + 1e-9);
}

export function checkPowerEquals(state: unknown, p: Params): boolean {
  const s = asState(state);
  return !!s && near(s.P, num(p.target), num(p.tol, DEFAULT_TOL.power));
}
