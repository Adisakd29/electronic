/** Engineering formatting helpers shared by all labs (pure). */

const PREFIXES: [number, string][] = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
];

/**
 * formatSI(0.0123, "A") → "12.3 mA"; formatSI(4700, "Ω") → "4.7 kΩ".
 * `digits` = significant digits (default 3). Infinity → "∞", NaN → "—".
 */
export function formatSI(value: number, unit = "", digits = 3): string {
  if (Number.isNaN(value)) return "—";
  if (!Number.isFinite(value)) return `∞${unit ? " " + unit : ""}`;
  if (value === 0) return `0${unit ? " " + unit : ""}`;
  const abs = Math.abs(value);
  let [factor, prefix] = PREFIXES[PREFIXES.length - 1];
  for (const [f, p] of PREFIXES) {
    if (abs >= f * 0.9995) {
      factor = f;
      prefix = p;
      break;
    }
  }
  const scaled = value / factor;
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(scaled) || 1)));
  let s = scaled.toFixed(Math.min(decimals, 6));
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return `${s}${unit || prefix ? " " : ""}${prefix}${unit}`;
}

/** Fixed decimals without prefix (for meter displays): formatFixed(12.345, 2) → "12.35". */
export function formatFixed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

const PREFIX_VALUE: Record<string, number> = { G: 1e9, M: 1e6, k: 1e3, K: 1e3, m: 1e-3, u: 1e-6, µ: 1e-6, μ: 1e-6, n: 1e-9, p: 1e-12 };

/**
 * parseSI("4.7k") → 4700, parseSI("4k7") → 4700, parseSI("100 µF", "F") → 1e-4,
 * parseSI("2,200") → 2200. Returns NaN when not parseable.
 */
export function parseSI(input: string, unit = ""): number {
  let s = input.trim().replace(/,/g, "").replace(/\s+/g, "");
  if (unit && s.endsWith(unit)) s = s.slice(0, -unit.length);
  s = s.replace(/Ω|ohm/i, "");
  const rk = s.match(/^(\d+)([GMkKmuµμnpR])(\d+)$/); // 4k7, 4R7
  if (rk) {
    const mult = rk[2] === "R" ? 1 : PREFIX_VALUE[rk[2]];
    return Number(`${rk[1]}.${rk[3]}`) * mult;
  }
  const m = s.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)([GMkKmuµμnp])?$/i);
  if (!m) return NaN;
  return Number(m[1]) * (m[2] ? PREFIX_VALUE[m[2]] : 1);
}

export const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
export const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];

/** All E-series values between min and max (inclusive). */
export function eSeriesValues(series: number[], min: number, max: number): number[] {
  const out: number[] = [];
  for (let dec = Math.floor(Math.log10(min)); dec <= Math.ceil(Math.log10(max)); dec++) {
    for (const b of series) {
      const v = Number((b * 10 ** dec).toPrecision(3));
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
  }
  return out;
}

/** 1-2-5 sequence between min and max (oscilloscope ranges). */
export function oneTwoFive(min: number, max: number): number[] {
  const out: number[] = [];
  for (let dec = Math.floor(Math.log10(min)); dec <= Math.ceil(Math.log10(max)); dec++) {
    for (const b of [1, 2, 5]) {
      const v = Number((b * 10 ** dec).toPrecision(3));
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
  }
  return out;
}
