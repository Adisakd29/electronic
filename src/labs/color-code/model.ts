/**
 * Resistor colour code & SMD marking model (pure, no React).
 *
 * Colour table follows IEC 60062 as taught in the course (week 7 figure W07-F04):
 *   digit 0–9, multiplier 10^0…10^9 plus gold ×0.1 / silver ×0.01,
 *   tolerance brown ±1, red ±2, green ±0.5, blue ±0.25, violet ±0.1, grey ±0.05,
 *   gold ±5, silver ±10, no band ±20 (3-band reading),
 *   TCR black 250, brown 100, red 50, orange 15, yellow 25, green 20, blue 10, violet 5, grey 1 ppm/K.
 */
import { E12, E24, parseSI } from "../shared/format";

export type ColourName =
  | "black"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "violet"
  | "grey"
  | "white"
  | "gold"
  | "silver"
  | "none";

export type BandCount = 4 | 5 | 6;
export type BandRole = "digit" | "multiplier" | "tolerance" | "tempco";
export type Series = "E12" | "E24" | "E96";

export interface ColourInfo {
  name: ColourName;
  th: string;
  /** Physical paint colour for the drawing (identity colour, not a theme colour). */
  hex: string;
  /** Text colour that reads on `hex`. */
  textOn: string;
  digit?: number;
  /** Power of ten. */
  exponent?: number;
  /** Percent. */
  tolerance?: number;
  /** IEC 60062 tolerance letter (used in RKM / SMD markings). */
  letter?: string;
  /** ppm/K */
  tempco?: number;
}

export const COLOURS: Record<ColourName, ColourInfo> = {
  black: { name: "black", th: "ดำ", hex: "#1b1b1b", textOn: "#ffffff", digit: 0, exponent: 0, tempco: 250 },
  brown: { name: "brown", th: "น้ำตาล", hex: "#7a4a1e", textOn: "#ffffff", digit: 1, exponent: 1, tolerance: 1, letter: "F", tempco: 100 },
  red: { name: "red", th: "แดง", hex: "#d32020", textOn: "#ffffff", digit: 2, exponent: 2, tolerance: 2, letter: "G", tempco: 50 },
  orange: { name: "orange", th: "ส้ม", hex: "#f57c00", textOn: "#1b1b1b", digit: 3, exponent: 3, tempco: 15 },
  yellow: { name: "yellow", th: "เหลือง", hex: "#fbd335", textOn: "#1b1b1b", digit: 4, exponent: 4, tempco: 25 },
  green: { name: "green", th: "เขียว", hex: "#2e9a3e", textOn: "#ffffff", digit: 5, exponent: 5, tolerance: 0.5, letter: "D", tempco: 20 },
  blue: { name: "blue", th: "น้ำเงิน", hex: "#1f5fd1", textOn: "#ffffff", digit: 6, exponent: 6, tolerance: 0.25, letter: "C", tempco: 10 },
  violet: { name: "violet", th: "ม่วง", hex: "#8a3fc7", textOn: "#ffffff", digit: 7, exponent: 7, tolerance: 0.1, letter: "B", tempco: 5 },
  grey: { name: "grey", th: "เทา", hex: "#8c8f94", textOn: "#1b1b1b", digit: 8, exponent: 8, tolerance: 0.05, letter: "W", tempco: 1 },
  white: { name: "white", th: "ขาว", hex: "#f7f7f2", textOn: "#1b1b1b", digit: 9, exponent: 9 },
  gold: { name: "gold", th: "ทอง", hex: "#c9a13b", textOn: "#1b1b1b", exponent: -1, tolerance: 5, letter: "J" },
  silver: { name: "silver", th: "เงิน", hex: "#c4c8ce", textOn: "#1b1b1b", exponent: -2, tolerance: 10, letter: "K" },
  none: { name: "none", th: "ไม่มีแถบ", hex: "transparent", textOn: "#1b1b1b", tolerance: 20, letter: "M" },
};

export const ALL_COLOURS = Object.keys(COLOURS) as ColourName[];

export function isColour(c: string): c is ColourName {
  return Object.prototype.hasOwnProperty.call(COLOURS, c);
}

/** Role of each band position for a given band count. */
export function bandRoles(bandCount: BandCount): BandRole[] {
  if (bandCount === 4) return ["digit", "digit", "multiplier", "tolerance"];
  if (bandCount === 5) return ["digit", "digit", "digit", "multiplier", "tolerance"];
  return ["digit", "digit", "digit", "multiplier", "tolerance", "tempco"];
}

/** Valid colours for a band position. `none` (3-band reading, ±20 %) only on 4-band tolerance. */
export function coloursFor(role: BandRole, bandCount: BandCount = 4): ColourName[] {
  return ALL_COLOURS.filter((c) => {
    const k = COLOURS[c];
    switch (role) {
      case "digit":
        return k.digit !== undefined;
      case "multiplier":
        return k.exponent !== undefined;
      case "tolerance":
        return k.tolerance !== undefined && (c !== "none" || bandCount === 4);
      case "tempco":
        return k.tempco !== undefined;
    }
  });
}

export function roleLabelTh(role: BandRole, digitIndex = 0): string {
  switch (role) {
    case "digit":
      return `หลักที่ ${digitIndex + 1}`;
    case "multiplier":
      return "ตัวคูณ";
    case "tolerance":
      return "ค่าผิดพลาด";
    case "tempco":
      return "สัมประสิทธิ์อุณหภูมิ";
  }
}

/** Short tag drawn under each band: 1, 2, 3, ×, ±, ppm. */
export function roleTag(role: BandRole, digitIndex = 0): string {
  return role === "digit" ? String(digitIndex + 1) : role === "multiplier" ? "×" : role === "tolerance" ? "±" : "ppm";
}

export function formatMultiplier(exp: number): string {
  const map: Record<number, string> = {
    [-2]: "×0.01",
    [-1]: "×0.1",
    0: "×1",
    1: "×10",
    2: "×100",
    3: "×1k",
    4: "×10k",
    5: "×100k",
    6: "×1M",
    7: "×10M",
    8: "×100M",
    9: "×1G",
  };
  return map[exp] ?? `×10^${exp}`;
}

export function formatPercent(p: number): string {
  return `±${Number(p.toPrecision(3))}%`;
}

/** Meaning of a colour in a role, e.g. "2", "×100", "±5%", "50 ppm/K". */
export function colourMeaning(c: ColourName, role: BandRole): string {
  const k = COLOURS[c];
  switch (role) {
    case "digit":
      return k.digit === undefined ? "—" : String(k.digit);
    case "multiplier":
      return k.exponent === undefined ? "—" : formatMultiplier(k.exponent);
    case "tolerance":
      return k.tolerance === undefined ? "—" : formatPercent(k.tolerance);
    case "tempco":
      return k.tempco === undefined ? "—" : `${k.tempco} ppm/K`;
  }
}

/** Round to 12 significant digits to clean binary noise (4.7 * 1000 etc.). */
export function clean(v: number): number {
  return v === 0 ? 0 : Number(v.toPrecision(12));
}

// ---------------------------------------------------------------------------
// Decode bands → value
// ---------------------------------------------------------------------------

export interface Decoded {
  ok: boolean;
  /** Ω (NaN when invalid). */
  value: number;
  /** Significant-digit integer (e.g. 47 or 487). */
  significand: number;
  exponent: number;
  /** Percent. */
  tolerance: number;
  tempco?: number;
  min: number;
  max: number;
  errors: string[];
}

export function decodeBands(bands: readonly string[], bandCount: BandCount = bands.length as BandCount): Decoded {
  const roles = bandRoles(bandCount);
  const errors: string[] = [];
  if (bands.length !== roles.length) errors.push(`ต้องมี ${roles.length} แถบ`);
  let significand = 0;
  let exponent = 0;
  let tolerance = NaN;
  let tempco: number | undefined;
  roles.forEach((role, i) => {
    const c = bands[i];
    if (!c || !isColour(c) || !coloursFor(role, bandCount).includes(c)) {
      errors.push(`แถบที่ ${i + 1}: สี "${c ?? "?"}" ใช้เป็น${roleLabelTh(role, i)}ไม่ได้`);
      return;
    }
    const k = COLOURS[c];
    if (role === "digit") significand = significand * 10 + (k.digit as number);
    else if (role === "multiplier") exponent = k.exponent as number;
    else if (role === "tolerance") tolerance = k.tolerance as number;
    else tempco = k.tempco;
  });
  const ok = errors.length === 0;
  const value = ok ? clean(significand * 10 ** exponent) : NaN;
  return {
    ok,
    value,
    significand,
    exponent,
    tolerance,
    tempco,
    min: ok ? clean(value * (1 - tolerance / 100)) : NaN,
    max: ok ? clean(value * (1 + tolerance / 100)) : NaN,
    errors,
  };
}

// ---------------------------------------------------------------------------
// E-series membership (IEC 60063)
// ---------------------------------------------------------------------------

export const E96 = [
  100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174,
  178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309,
  316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549,
  562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976,
];

const E12_3 = E12.map((v) => Math.round(v * 100));
const E24_3 = E24.map((v) => Math.round(v * 100));

/** Normalise a positive value to a 3-digit mantissa 100…999 (NaN if it needs > 3 significant digits). */
export function mantissa3(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) return NaN;
  const e = Math.floor(Math.log10(value)) - 2;
  const m = clean(value / 10 ** e);
  const r = Math.round(m);
  if (Math.abs(m - r) > 1e-6 * r) return NaN;
  return r >= 1000 ? r / 10 : r < 100 ? r * 10 : r;
}

export function seriesMembership(value: number): { E12: boolean; E24: boolean; E96: boolean } {
  const m = mantissa3(value);
  return { E12: E12_3.includes(m), E24: E24_3.includes(m), E96: E96.includes(m) };
}

/** Coarsest standard series containing the value (E12 ⊂ E24; E96 is separate). */
export function standardSeries(value: number): Series | undefined {
  const s = seriesMembership(value);
  return s.E12 ? "E12" : s.E24 ? "E24" : s.E96 ? "E96" : undefined;
}

// ---------------------------------------------------------------------------
// Encode value → bands (make mode answer, band-count conversion)
// ---------------------------------------------------------------------------

/** Digit + multiplier colours representing `value` with `bandCount`'s digits, or null if impossible. */
export function valueBands(value: number, bandCount: BandCount): ColourName[] | null {
  const d = bandCount === 4 ? 2 : 3;
  const digitColours = coloursFor("digit");
  const expColour = (e: number) => ALL_COLOURS.find((c) => COLOURS[c].exponent === e && c !== "none");
  const toColours = (sig: number, e: number): ColourName[] | null => {
    const mc = expColour(e);
    if (!mc) return null;
    const s = String(sig).padStart(d, "0");
    return [...s].map((ch) => digitColours[Number(ch)]).concat(mc);
  };
  if (value === 0) return toColours(0, 0);
  if (!(value > 0) || !Number.isFinite(value)) return null;
  // pass 1: leading digit non-zero; pass 2: allow leading zeros (e.g. 0.01 Ω = black-brown-silver)
  for (const lo of [10 ** (d - 1), 1]) {
    for (let e = -2; e <= 9; e++) {
      const sig = clean(value / 10 ** e);
      const r = Math.round(sig);
      if (Math.abs(sig - r) <= 1e-9 * Math.max(1, r) && r >= lo && r < 10 ** d) return toColours(r, e);
    }
  }
  return null;
}

/** Tolerance colour for a percent value (null if no colour has it). */
export function toleranceColour(percent: number, bandCount: BandCount = 4): ColourName | null {
  return coloursFor("tolerance", bandCount).find((c) => COLOURS[c].tolerance === percent) ?? null;
}

/**
 * Convert a band set to another band count, keeping the value when representable
 * (otherwise rounding to the closest representable value) and a valid tolerance.
 */
export function convertBands(bands: readonly ColourName[], from: BandCount, to: BandCount): ColourName[] {
  const d = decodeBands(bands, from);
  const value = d.ok ? d.value : 1000;
  let vb = valueBands(value, to);
  if (!vb) {
    // 3 → 2 significant digits: round
    const e = Math.floor(Math.log10(value)) - 1;
    vb = valueBands(clean(Math.round(value / 10 ** e) * 10 ** e), to) ?? valueBands(1000, to)!;
  }
  let tol: ColourName = toleranceColour(d.ok ? d.tolerance : 5, to) ?? "brown";
  if (to !== 4 && tol === "none") tol = "brown";
  const out = [...vb, tol];
  if (to === 6) out.push(bands.length === 6 && from === 6 ? bands[5] : "brown");
  return out;
}

// ---------------------------------------------------------------------------
// Explanations (Thai)
// ---------------------------------------------------------------------------

export function explainBands(bands: readonly ColourName[], bandCount: BandCount): string {
  const d = decodeBands(bands, bandCount);
  if (!d.ok) return d.errors.join(" · ");
  const roles = bandRoles(bandCount);
  const parts = roles.map((r, i) => `${COLOURS[bands[i]].th} (${colourMeaning(bands[i], r)})`);
  const mult = formatMultiplier(d.exponent).slice(1);
  return `${parts.join(" – ")} → ${String(d.significand).padStart(bandCount === 4 ? 2 : 3, "0")} × ${mult} = ${formatOhm(d.value)} ${formatPercent(d.tolerance)}`;
}

/** Ω with SI prefix and a fixed number of significant digits, keeping trailing zeros (10.0 kΩ, 4.70 kΩ). */
export function formatOhmSig(v: number, sig: number): string {
  if (!(v > 0) || !Number.isFinite(v)) return formatOhm(v);
  const [f, p] = ([[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""]] as [number, string][]).find(([f]) => v >= f * 0.99995) ?? [1, ""];
  const x = v / f;
  const decimals = Math.max(0, sig - 1 - Math.floor(Math.log10(x) + 1e-9));
  return `${x.toFixed(decimals)} ${p}Ω`;
}

/** Ω with SI prefix, keeping up to 4 significant digits (4.87 kΩ, 0.47 Ω, 10 Ω). */
export function formatOhm(v: number, digits = 4): string {
  if (Number.isNaN(v)) return "—";
  if (v === 0) return "0 Ω";
  const PFX: [number, string][] = [
    [1e9, "G"],
    [1e6, "M"],
    [1e3, "k"],
    [1, ""],
  ];
  const [f, p] = PFX.find(([f]) => Math.abs(v) >= f * 0.99995) ?? PFX[PFX.length - 1];
  const s = Number((v / f).toPrecision(digits)).toString();
  return `${s} ${p}Ω`;
}

// ---------------------------------------------------------------------------
// Learner input parsing
// ---------------------------------------------------------------------------

/** Parse a typed resistance: "4.7k", "4k7", "4700", "4.7 kΩ", "47R", "0R47", "1M", "2.2 โอห์ม". */
export function parseResistance(input: string): number {
  let s = input.trim().replace(/โอห์ม|ohms?|Ω/gi, "").replace(/\s+/g, "");
  if (!s) return NaN;
  if (/^\d+(\.\d+)?R$/i.test(s)) s = s.slice(0, -1);
  s = s.replace(/^(\d*)r(\d+)$/, "$1R$2");
  if (/^R\d+$/.test(s)) s = "0" + s;
  const v = parseSI(s);
  return Number.isFinite(v) && v >= 0 ? clean(v) : NaN;
}

// ---------------------------------------------------------------------------
// SMD decoder
// ---------------------------------------------------------------------------

export type SmdKind = "zero" | "3digit" | "4digit" | "R" | "RKM" | "EIA96";

export type SmdResult =
  | { ok: true; kind: SmdKind; code: string; value: number; tolerance?: number; steps: string; note?: string }
  | { ok: false; code: string; error: string };

export const EIA96_MULT: Record<string, number> = {
  Z: -3,
  Y: -2,
  R: -2,
  X: -1,
  S: -1,
  A: 0,
  B: 1,
  H: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
};

const MULT_TXT = (e: number) => `10${superscript(e)}`;
function superscript(n: number): string {
  const sup: Record<string, string> = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  return [...String(n)].map((c) => sup[c] ?? c).join("");
}

export function decodeSmd(raw: string): SmdResult {
  const code = raw.trim().replace(/\s+/g, "").replace(/Ω$/, "").toUpperCase();
  if (!code) return { ok: false, code, error: "พิมพ์รหัสบนชิป เช่น 472, 1002, 4R7 หรือ 01C" };
  if (/^0{1,4}$/.test(code))
    return { ok: true, kind: "zero", code, value: 0, steps: `"${code}" = ตัวต้านทาน 0 Ω (ใช้แทนสายจัมเปอร์)` };

  let m = code.match(/^(\d{2})([ZYRXSABHCDEF])$/);
  if (m) {
    const idx = Number(m[1]);
    if (idx < 1 || idx > 96) return { ok: false, code, error: `EIA-96: ลำดับ ${m[1]} อยู่นอกช่วง 01–96` };
    const base = E96[idx - 1];
    const e = EIA96_MULT[m[2]];
    const value = clean(base * 10 ** e);
    const alt = m[2] === "R" ? `ถ้าเป็นรหัส R แทนจุดทศนิยม "${code}" จะหมายถึง ${formatOhm(idx)} แต่บนชิป SMD รูปแบบ 2 หลัก + อักษร คือ EIA-96` : undefined;
    return {
      ok: true,
      kind: "EIA96",
      code,
      value,
      tolerance: 1,
      steps: `EIA-96: ลำดับ ${m[1]} ในตาราง E96 = ${base} · อักษร ${m[2]} = ×${clean(10 ** e)} → ${base} × ${clean(10 ** e)} = ${formatOhm(value)} (±1%)`,
      note: alt,
    };
  }
  m = code.match(/^(\d{2})(\d)$/);
  if (m) {
    const value = clean(Number(m[1]) * 10 ** Number(m[2]));
    return {
      ok: true,
      kind: "3digit",
      code,
      value,
      tolerance: 5,
      steps: `3 หลัก: ${m[1]} ตามด้วยศูนย์ ${m[2]} ตัว = ${m[1]} × ${MULT_TXT(Number(m[2]))} = ${formatOhm(value)} (โดยทั่วไป ±5%)`,
    };
  }
  m = code.match(/^(\d{3})(\d)$/);
  if (m) {
    const value = clean(Number(m[1]) * 10 ** Number(m[2]));
    return {
      ok: true,
      kind: "4digit",
      code,
      value,
      tolerance: 1,
      steps: `4 หลัก: ${m[1]} ตามด้วยศูนย์ ${m[2]} ตัว = ${m[1]} × ${MULT_TXT(Number(m[2]))} = ${formatOhm(value)} (โดยทั่วไป ±1%)`,
    };
  }
  m = code.match(/^(\d*)([RKM])(\d*)$/);
  if (m && (m[1] || m[3])) {
    const mult = { R: 1, K: 1e3, M: 1e6 }[m[2] as "R" | "K" | "M"];
    const value = clean(Number(`${m[1] || "0"}.${m[3] || "0"}`) * mult);
    const isR = m[2] === "R";
    return {
      ok: true,
      kind: isR ? "R" : "RKM",
      code,
      value,
      steps: isR
        ? `R แทนจุดทศนิยม: ${m[1] || "0"}.${m[3] || "0"} Ω = ${formatOhm(value)}`
        : `รหัส RKM: ${m[2]} แทนจุดทศนิยมและตัวคูณ ${m[2] === "K" ? "×1k" : "×1M"} → ${m[1] || "0"}.${m[3] || "0"} ${m[2] === "K" ? "k" : "M"}Ω = ${formatOhm(value)}`,
    };
  }
  return { ok: false, code, error: `อ่านรหัส "${code}" ไม่ได้ — รูปแบบที่รองรับ: 3 หลัก (472), 4 หลัก (4701), R แทนจุด (4R7, R10), EIA-96 (01C, 68X)` };
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export interface QuizItem {
  bandCount: BandCount;
  bands: ColourName[];
  value: number;
  tolerance: number;
}

/** Random resistor for the quiz. `rng` returns [0,1). Draw only in event handlers/effects. */
export function randomResistor(rng: () => number = Math.random): QuizItem {
  const pick = <T,>(a: readonly T[]) => a[Math.min(a.length - 1, Math.floor(rng() * a.length))];
  const r = rng();
  const bandCount: BandCount = r < 0.6 ? 4 : r < 0.9 ? 5 : 6;
  let bands: ColourName[];
  if (bandCount === 4) {
    const sig = pick(rng() < 0.5 ? E12_3 : E24_3) / 10; // 10…91
    const e = pick([-1, 0, 1, 2, 3, 4, 5]);
    bands = [...valueBands(sig * 10 ** e, 4)!, pick<ColourName>(["gold", "gold", "gold", "silver", "brown", "red", "none"])];
  } else {
    const sig = pick(E96);
    const e = pick([-1, 0, 1, 2, 3, 4]);
    bands = [...valueBands(sig * 10 ** e, bandCount)!, pick<ColourName>(["brown", "brown", "red", "green", "blue", "violet"])];
    if (bandCount === 6) bands.push(pick<ColourName>(["black", "brown", "red", "orange", "yellow", "blue"]));
  }
  const d = decodeBands(bands, bandCount);
  return { bandCount, bands, value: d.value, tolerance: d.tolerance };
}

/** Value within 0.2 % (typing rounding) and tolerance exact. */
export function gradeQuiz(item: QuizItem, typedValue: number, typedTol: number): { valueOk: boolean; tolOk: boolean; correct: boolean } {
  const valueOk =
    Number.isFinite(typedValue) && (item.value === 0 ? typedValue === 0 : Math.abs(typedValue - item.value) <= item.value * 0.002);
  const tolOk = Math.abs(typedTol - item.tolerance) < 1e-9;
  return { valueOk, tolOk, correct: valueOk && tolOk };
}

/** Seeded PRNG (mulberry32) for deterministic previews/tests. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Lab state
// ---------------------------------------------------------------------------

export type Mode = "read" | "make" | "quiz" | "smd";

export interface ColorCodeState {
  mode: Mode;
  bandCount: BandCount;
  bands: string[];
  value: number;
  tolerance: number;
  tempco?: number;
  isStandard: boolean;
  series?: Series;
  quiz: { correct: number; attempts: number; streak: number };
  smd?: { code: string; value: number };
  /** make mode only: target value (Ω) and whether bands match it. */
  target?: number;
  matched?: boolean;
}

export function summarise(bands: readonly ColourName[], bandCount: BandCount) {
  const d = decodeBands(bands, bandCount);
  const series = d.ok ? standardSeries(d.value) : undefined;
  return { decoded: d, series, isStandard: series !== undefined };
}

/** Targets offered in make mode (Ω). */
export const MAKE_TARGETS = [2200, 68000, 1e6, 330, 4.7, 0.47, 10000, 150, 39000, 1200, 487000, 10.2, 3320];

/** Random make-mode target representable with `bandCount` bands. */
export function randomTarget(bandCount: BandCount, rng: () => number = Math.random): number {
  const pick = <T,>(a: readonly T[]) => a[Math.min(a.length - 1, Math.floor(rng() * a.length))];
  if (bandCount === 4) return clean((pick(rng() < 0.5 ? E12_3 : E24_3) / 10) * 10 ** pick([-1, 0, 1, 2, 3, 4, 5]));
  return clean(pick(E96) * 10 ** pick([-1, 0, 1, 2, 3, 4]));
}
