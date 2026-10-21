/**
 * Pure answer-checking helpers for the lesson interactions (no React).
 * Unit-tested in grading.test.ts.
 */
import type { ChoiceOption, FillField } from "@/content/types";

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** Normalise a typed number: Thai/EU decimal comma, thousands separators,
 *  unicode minus, spaces, "×10^n" and e-notation. Returns NaN when not a number. */
export function parseNumber(raw: string): number {
  let s = raw.trim().replace(/[−‒–—]/g, "-").replace(/[\s  ']/g, "");
  if (!s) return NaN;
  // 4.7×10^3, 4.7x10^-3, 4.7*10^3, 4.7×10³ (superscripts handled below)
  const sup: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => sup[c]);
  const tenPow = s.match(/^(.+?)[×x*]10\^?(-?\d+)$/i);
  if (tenPow) {
    const m = parseNumber(tenPow[1]);
    return Number.isFinite(m) ? m * Math.pow(10, Number(tenPow[2])) : NaN;
  }
  if (/^[+-]?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, ""); // 1,500 / 12,000.5 → thousands separators
  } else if (s.includes(",") && s.includes(".")) {
    s = s.replace(/,/g, "");
  } else {
    s = s.replace(",", "."); // 0,5 → 0.5
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}

/** Split "12 mA" / "12mA" into number text and trailing unit text. */
export function splitValueUnit(raw: string): { num: string; unit: string } {
  const m = raw.trim().match(/^(.*?[\d.,⁰¹²³⁴⁵⁶⁷⁸⁹])\s*([A-Za-zµμΩ°%/²³·]+[A-Za-zµμΩ°%/²³·0-9]*)$/);
  if (!m) return { num: raw.trim(), unit: "" };
  return { num: m[1], unit: m[2] };
}

const normUnit = (u: string) => u.replace(/μ/g, "µ").replace(/\s/g, "").replace(/^u(?=[A-Za-zΩ])/, "µ").replace(/ohm(s)?$/i, "Ω");

export function withinTolerance(value: number, target: number, rel = 0.02, abs = 0): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(target)) return false;
  const diff = Math.abs(value - target);
  // tiny epsilon absorbs float noise such as 0.1 + 0.2
  return diff <= Math.max(abs, Math.abs(target) * rel) + 1e-12 * Math.max(1, Math.abs(target));
}

export type FillStatus = "empty" | "invalid" | "unit" | "correct" | "wrong";

export interface FillFieldResult {
  status: FillStatus;
  /** Entered value converted to the canonical unit. */
  value?: number;
  /** Targeted feedback from `commonErrors` when the value matches one. */
  feedback?: string;
}

/** Units the learner may choose for a field (canonical first). */
export function fieldUnits(field: FillField): string[] {
  if (!field.unit) return [];
  return [field.unit, ...(field.altUnits ?? []).map((a) => a.unit)];
}

/**
 * Check one fill field.
 * @param raw   text typed by the learner (may include a unit, e.g. "0.012 A")
 * @param unit  unit chosen in the dropdown (defaults to the canonical unit)
 */
export function checkFillField(field: FillField, raw: string, unit?: string): FillFieldResult {
  if (!raw.trim()) return { status: "empty" };
  const { num, unit: typedUnit } = splitValueUnit(raw);
  const v = parseNumber(num);
  if (!Number.isFinite(v)) return { status: "invalid" };

  const chosen = typedUnit ? normUnit(typedUnit) : unit ? normUnit(unit) : field.unit ? normUnit(field.unit) : "";
  let factor = 1;
  if (field.unit) {
    const canonical = normUnit(field.unit);
    if (chosen && chosen !== canonical) {
      const alt = (field.altUnits ?? []).find((a) => normUnit(a.unit) === chosen);
      if (!alt) return { status: "unit", value: v };
      factor = alt.factor;
    }
  }
  const value = v * factor;
  const rel = field.tolerance ?? 0.02;
  const abs = field.absTolerance ?? 0;
  if (withinTolerance(value, field.answer, rel, abs)) return { status: "correct", value };
  const ce = (field.commonErrors ?? []).find((e) => withinTolerance(value, e.value, rel, abs));
  return { status: "wrong", value, feedback: ce?.feedback };
}

/** Lab numeric task / quiz numeric: number (optionally with canonical unit). */
export function checkNumeric(raw: string, answer: number, rel = 0.03, abs = 0): boolean {
  const { num } = splitValueUnit(raw);
  return withinTolerance(parseNumber(num), answer, rel, abs);
}

// ---------------------------------------------------------------------------
// Choice
// ---------------------------------------------------------------------------

export interface McqResult {
  correct: boolean;
  /** Correct options the learner did not select (multiple mode). */
  missed: string[];
  /** Selected options that are wrong. */
  wrong: string[];
}

export function gradeMcq(options: ChoiceOption[], selected: string[]): McqResult {
  const correctIds = options.filter((o) => o.correct).map((o) => o.id);
  const wrong = selected.filter((id) => !correctIds.includes(id));
  const missed = correctIds.filter((id) => !selected.includes(id));
  return { correct: selected.length > 0 && wrong.length === 0 && missed.length === 0, missed, wrong };
}

// ---------------------------------------------------------------------------
// Match / order / classify
// ---------------------------------------------------------------------------

/**
 * @param pairs       the interaction pairs (left i ↔ right i)
 * @param pool        texts of the right-hand items shown (pairs' rights + distractors, any order)
 * @param assignment  for each left item, the index into `pool` (or null)
 * Two pool items with identical text are interchangeable.
 */
export function gradeMatch(pairs: { right: string }[], pool: string[], assignment: (number | null)[]): boolean[] {
  return pairs.map((p, i) => {
    const a = assignment[i];
    return a !== null && a !== undefined && pool[a] === p.right;
  });
}

/** `order` holds indices into the correct sequence; returns per-position correctness. */
export function gradeOrder(items: string[], order: number[]): boolean[] {
  return order.map((idx, pos) => items[idx] === items[pos]);
}

export function gradeClassify(items: { category: number }[], assignment: (number | null)[]): boolean[] {
  return items.map((it, i) => assignment[i] === it.category);
}

export const allTrue = (xs: boolean[]) => xs.length > 0 && xs.every(Boolean);

/** For findFault: a spot is judged right when selection equals its fault flag. */
export function gradeFaults(spots: { id: string; fault: boolean }[], selected: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const s of spots) out[s.id] = selected.includes(s.id) === s.fault;
  return out;
}

// ---------------------------------------------------------------------------
// Deterministic shuffling (no Math.random during render → SSR-safe)
// ---------------------------------------------------------------------------

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded permutation of 0..n-1. When `derange` is set and n > 1 the result is
 *  never the identity (so an "order" task never starts solved). */
export function seededPermutation(n: number, seed: number | string, derange = false): number[] {
  const rnd = mulberry32(typeof seed === "string" ? hashString(seed) : seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (derange && n > 1 && idx.every((v, i) => v === i)) {
    idx.push(idx.shift()!);
  }
  return idx;
}
