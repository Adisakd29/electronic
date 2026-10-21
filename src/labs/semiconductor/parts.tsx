/**
 * Schematic primitives for the semiconductor lab (pure SVG, no hooks — also used
 * by the static `previewStage`). Every component is drawn between two terminal
 * points `a` → `b`; the symbol sits at the midpoint, leads fill the rest.
 */
import type { ReactNode } from "react";

export type Pt = [number, number];

export const INK = "var(--fig-ink)";
export const MUTED = "var(--fig-muted)";
export const SW = 2.5;

export function Wire({ d, color = INK }: { d: string; color?: string }) {
  return <path d={d} fill="none" stroke={color} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round" />;
}

export function Dot({ p }: { p: Pt }) {
  return <circle cx={p[0]} cy={p[1]} r={4} fill={INK} />;
}

export function Terminal({ p }: { p: Pt }) {
  return <circle cx={p[0]} cy={p[1]} r={5} fill="var(--fig-bg)" stroke={INK} strokeWidth={2} />;
}

/** Text with an optional subscript: <Lbl x y main="V" sub="D" rest=" = 0.69 V" />. */
export function Lbl({
  x,
  y,
  main,
  sub,
  rest = "",
  anchor = "start",
  size = 17,
  weight,
  color = INK,
}: {
  x: number;
  y: number;
  main: string;
  sub?: string;
  rest?: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
  weight?: number;
  color?: string;
}) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={color} fontWeight={weight}>
      {main}
      {sub ? (
        <tspan fontSize={size * 0.72} dy={4}>
          {sub}
        </tspan>
      ) : null}
      {rest ? <tspan dy={sub ? -4 : 0}>{rest.replace(/^ /, "\u00a0")}</tspan> : null}
    </text>
  );
}

/** Two-terminal part between a and b; children drawn in local coords on the x axis, centred. */
export function Seg({ a, b, len, children }: { a: Pt; b: Pt; len: number; children: ReactNode }) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const p1: Pt = [m[0] - (ux * len) / 2, m[1] - (uy * len) / 2];
  const p2: Pt = [m[0] + (ux * len) / 2, m[1] + (uy * len) / 2];
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <g>
      <Wire d={`M${a[0]} ${a[1]} L${p1[0]} ${p1[1]} M${p2[0]} ${p2[1]} L${b[0]} ${b[1]}`} />
      <g transform={`translate(${m[0]} ${m[1]}) rotate(${ang})`}>{children}</g>
    </g>
  );
}

/** Resistor — IEC 60617 rectangle (matches the other labs). */
export function Resistor({ a, b, len = 56 }: { a: Pt; b: Pt; len?: number }) {
  const h = len / 2;
  return (
    <Seg a={a} b={b} len={len}>
      <rect x={-h} y={-9} width={len} height={18} fill="var(--fig-bg)" stroke={INK} strokeWidth={SW} />
    </Seg>
  );
}

/** Diode, anode at a, cathode at b. `on` highlights a conducting diode. */
export function Diode({ a, b, on = false, schottky = false }: { a: Pt; b: Pt; on?: boolean; schottky?: boolean }) {
  return (
    <Seg a={a} b={b} len={30}>
      <DiodeBody on={on} schottky={schottky} />
    </Seg>
  );
}

function DiodeBody({ on, schottky = false, fill }: { on: boolean; schottky?: boolean; fill?: string }) {
  return (
    <g>
      <path d="M-13 -13 L-13 13 L12 0 Z" fill={fill ?? (on ? "var(--fig-accent)" : "var(--fig-bg)")} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <path
        d={schottky ? "M8 -9 L8 -13 L12 -13 L12 13 L16 13 L16 9" : "M12 -13 L12 13"}
        fill="none"
        stroke={INK}
        strokeWidth={2.6}
      />
    </g>
  );
}

/** LED (anode a → cathode b) with emitted-light arrows and a glow of 0…1. */
export function Led({
  a,
  b,
  color,
  glow,
  burnt,
  arrowsUp = true,
}: {
  a: Pt;
  b: Pt;
  color: string;
  glow: number;
  burnt: boolean;
  /** Draw arrows on the local −y side (true) or +y side. */
  arrowsUp?: boolean;
}) {
  const s = arrowsUp ? -1 : 1;
  const arrow = (x: number, y: number) => (
    <g>
      <path d={`M${x} ${y * s} L${x + 10} ${(y + 12) * s}`} stroke={burnt ? MUTED : INK} strokeWidth={2} />
      <path d={`M${x + 10} ${(y + 12) * s} l-7 ${-1 * s} l4 ${-5 * s} Z`} fill={burnt ? MUTED : INK} />
    </g>
  );
  return (
    <Seg a={a} b={b} len={30}>
      {glow > 0 && !burnt ? <circle r={15 + 9 * glow} fill={color} opacity={0.15 + 0.3 * glow} /> : null}
      <DiodeBody on={false} fill={burnt ? "var(--fig-muted)" : glow > 0 ? color : "var(--fig-bg)"} />
      {burnt ? <path d="M-14 -14 L14 14 M-14 14 L14 -14" stroke="var(--fig-danger)" strokeWidth={3} /> : null}
      {arrow(-4, 16)}
      {arrow(5, 12)}
    </Seg>
  );
}

/** Polarised capacitor, + plate toward a. */
export function Capacitor({ a, b }: { a: Pt; b: Pt }) {
  return (
    <Seg a={a} b={b} len={14}>
      <path d="M-7 -18 L-7 18" stroke={INK} strokeWidth={3} />
      <path d="M8 -18 Q2 0 8 18" fill="none" stroke={INK} strokeWidth={3} />
    </Seg>
  );
}

/** DC cell, − terminal at a, + terminal at b (long plate toward b). */
export function Battery({ a, b }: { a: Pt; b: Pt }) {
  return (
    <Seg a={a} b={b} len={14}>
      <path d="M-7 -10 L-7 10" stroke={INK} strokeWidth={4} />
      <path d="M7 -20 L7 20" stroke={INK} strokeWidth={2.5} />
    </Seg>
  );
}

export function Ground({ p }: { p: Pt }) {
  const [x, y] = p;
  return (
    <g stroke={INK} strokeWidth={2.5}>
      <path d={`M${x} ${y} L${x} ${y + 10}`} />
      <path d={`M${x - 14} ${y + 10} L${x + 14} ${y + 10} M${x - 9} ${y + 16} L${x + 9} ${y + 16} M${x - 4} ${y + 22} L${x + 4} ${y + 22}`} />
    </g>
  );
}

/** Vertical transformer coil (bumps bulging toward `side`). */
export function Coil({ x, y0, y1, bumps = 4, side = 1 }: { x: number; y0: number; y1: number; bumps?: number; side?: 1 | -1 }) {
  const h = (y1 - y0) / bumps;
  let d = `M${x} ${y0}`;
  for (let i = 0; i < bumps; i++) d += ` a${h / 2} ${h / 2} 0 0 ${side > 0 ? 1 : 0} 0 ${h}`;
  return <path d={d} fill="none" stroke={INK} strokeWidth={SW} />;
}

/** Conventional-current flow overlay (animated by the `.semi-flow` CSS class in Lab.tsx). */
export function Flow({ d, on, speed = 1 }: { d: string; on: boolean; speed?: number }) {
  if (!on) return null;
  return (
    <path
      d={d}
      className="semi-flow"
      fill="none"
      stroke="var(--fig-current)"
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeDasharray="0.1 18"
      style={{ animationDuration: `${(1.4 / Math.max(0.15, speed)).toFixed(2)}s` }}
    />
  );
}

/** Small filled arrowhead at p pointing at angle (deg). */
export function ArrowHead({ p, angle, color = "var(--fig-current)" }: { p: Pt; angle: number; color?: string }) {
  return <path d="M6 0 L-6 -6 L-6 6 Z" fill={color} transform={`translate(${p[0]} ${p[1]}) rotate(${angle})`} />;
}

/** Status badge: text + border (colour is never the only signal). */
export function Badge({ x, y, text, tone }: { x: number; y: number; text: string; tone: "ok" | "warn" | "danger" | "muted" }) {
  const c = { ok: "var(--fig-ok)", warn: "var(--fig-warn)", danger: "var(--fig-danger)", muted: "var(--fig-muted)" }[tone];
  const w = Math.max(60, text.length * 9.2 + 20);
  return (
    <g>
      <rect x={x - w / 2} y={y - 15} width={w} height={28} rx={6} fill="var(--fig-panel)" stroke={c} strokeWidth={2} />
      <text x={x} y={y + 5} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK}>
        {text}
      </text>
    </g>
  );
}
