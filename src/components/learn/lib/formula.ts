/**
 * Tiny, safe arithmetic evaluator for randomised exercises (no `eval`).
 *
 * Syntax: numbers (12, 4.7, 1e3), variables (letters, digits, _), + - * /,
 * ^ (power, right-assoc), unary minus, parentheses, and the functions
 * sqrt, abs, round, floor, ceil, min, max, pow, log10, ln, exp, sin, cos, tan,
 * atan, plus the constant pi. Anything else is a syntax error.
 *
 * Also: {{name}} substitution for prompts, and deterministic drawing of
 * variable values from a FillVar spec.
 */
import type { FillVar } from "@/content/types";

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: (x, d = 0) => {
    const m = 10 ** d;
    return Math.round(x * m) / m;
  },
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  log10: Math.log10,
  ln: Math.log,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  atan: Math.atan,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new Error(`เลขไม่ถูกต้องที่ตำแหน่ง ${i}`);
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ t: "id", v: m[0] });
      i += m[0].length;
      continue;
    }
    if ("+-*/^(),".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new Error(`อักขระที่ไม่รองรับ "${c}"`);
  }
  return out;
}

/** Evaluate `expr` with the given variable values. Throws on syntax errors or unknown names. */
export function evaluate(expr: string, vars: Record<string, number> = {}): number {
  const toks = tokenize(expr);
  let p = 0;
  const peek = () => toks[p];
  const take = () => toks[p++];
  const expect = (v: string) => {
    const t = take();
    if (!t || t.t !== "op" || t.v !== v) throw new Error(`คาดว่าจะพบ "${v}"`);
  };

  function primary(): number {
    const t = take();
    if (!t) throw new Error("นิพจน์ไม่สมบูรณ์");
    if (t.t === "num") return t.v;
    if (t.t === "op" && t.v === "(") {
      const v = sum();
      expect(")");
      return v;
    }
    if (t.t === "op" && t.v === "-") return -unary();
    if (t.t === "op" && t.v === "+") return unary();
    if (t.t === "id") {
      const nx = peek();
      if (nx && nx.t === "op" && nx.v === "(") {
        const fn = FUNCS[t.v];
        if (!fn) throw new Error(`ไม่รู้จักฟังก์ชัน ${t.v}`);
        take();
        const args: number[] = [];
        if (!(peek() && peek().t === "op" && peek().v === ")")) {
          args.push(sum());
          while (peek() && peek().t === "op" && peek().v === ",") {
            take();
            args.push(sum());
          }
        }
        expect(")");
        return fn(...args);
      }
      if (t.v in vars) return vars[t.v];
      if (t.v in CONSTS) return CONSTS[t.v];
      throw new Error(`ไม่รู้จักตัวแปร ${t.v}`);
    }
    throw new Error(`ไม่คาดว่าจะพบ "${t.v}"`);
  }
  function unary(): number {
    return power();
  }
  function power(): number {
    const base = primary();
    const t = peek();
    if (t && t.t === "op" && t.v === "^") {
      take();
      return base ** unary(); // right-associative, binds tighter than unary minus on the left
    }
    return base;
  }
  function product(): number {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t && t.t === "op" && (t.v === "*" || t.v === "/")) {
        take();
        const r = unary();
        v = t.v === "*" ? v * r : v / r;
      } else return v;
    }
  }
  function sum(): number {
    let v = product();
    for (;;) {
      const t = peek();
      if (t && t.t === "op" && (t.v === "+" || t.v === "-")) {
        take();
        const r = product();
        v = t.v === "+" ? v + r : v - r;
      } else return v;
    }
  }
  const v = sum();
  if (p !== toks.length) throw new Error(`มีส่วนเกินหลังนิพจน์ ("${toks[p].v}")`);
  if (!Number.isFinite(v)) throw new Error("ผลลัพธ์ไม่ใช่จำนวนจำกัด");
  return v;
}

/** Names referenced by an expression (for validation). */
export function variablesOf(expr: string): string[] {
  const names = new Set<string>();
  const toks = tokenize(expr);
  toks.forEach((t, i) => {
    const next = toks[i + 1];
    if (t.t === "id" && !(next && next.t === "op" && next.v === "(") && !(t.v in CONSTS)) names.add(t.v);
  });
  return [...names];
}

function decimalsOf(step: number): number {
  const s = String(step);
  const e = s.indexOf("e-");
  if (e >= 0) return Number(s.slice(e + 2));
  const d = s.indexOf(".");
  return d >= 0 ? s.length - d - 1 : 0;
}

/** Format a variable value for the prompt (fixed decimals per spec, trimmed). */
export function formatVar(value: number, spec: FillVar): string {
  if (spec.decimals !== undefined) return value.toFixed(spec.decimals);
  const s = value.toFixed(decimalsOf(spec.step));
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** The `default` values of every variable. */
export function defaultValues(vars: Record<string, FillVar>): Record<string, number> {
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v.default]));
}

/** Draw one value per variable from min..max on the step grid; `rnd` in [0,1). */
export function drawValues(vars: Record<string, FillVar>, rnd: () => number = Math.random): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(vars)) {
    const n = Math.max(0, Math.floor((v.max - v.min) / v.step + 1e-9));
    const i = Math.min(n, Math.floor(rnd() * (n + 1)));
    const d = decimalsOf(v.step);
    out[k] = Number((v.min + i * v.step).toFixed(d));
  }
  return out;
}

/** Replace {{name}} placeholders (unknown names are left as-is). */
export function substitute(md: string, values: Record<string, number>, vars: Record<string, FillVar>): string {
  return md.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (m, name: string) =>
    name in values && name in vars ? formatVar(values[name], vars[name]) : m,
  );
}

/** Same values as the defaults? (then the fixed answers apply) */
export function isDefaultDraw(values: Record<string, number>, vars: Record<string, FillVar>): boolean {
  return Object.entries(vars).every(([k, v]) => values[k] === v.default);
}
