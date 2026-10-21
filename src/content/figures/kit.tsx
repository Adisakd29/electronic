/**
 * SVG primitive kit for course figures (IEC 60617 style).
 * All primitives are pure, use theme tokens (var(--fig-*)), and draw centred
 * on (x, y). `angle` rotates the symbol (degrees, clockwise) around (x, y);
 * labels are NOT rotated so text stays upright.
 *
 * Terminal positions (before rotation) for two-terminal parts of length L:
 * left terminal (x − L/2, y), right terminal (x + L/2, y).
 *   Resistor L=80 (body 60×22) · Capacitor L=60 · Inductor L=80 · Lamp L=60
 *   Battery L=60 · Diode L=60 · SwitchSym L=80 · Meter L=56 (circle r=24)
 */
import type { ReactNode } from "react";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";

type Pt = [number, number];

function rot(angle?: number, x = 0, y = 0) {
  return angle ? `rotate(${angle} ${x} ${y})` : undefined;
}

/** Offset a label away from a symbol depending on orientation. */
function labelPos(x: number, y: number, angle = 0, side: "a" | "b" = "a", dist = 34): Pt {
  const vertical = Math.abs(((angle % 180) + 180) % 180 - 90) < 1;
  if (vertical) return side === "a" ? [x + dist, y] : [x - dist, y];
  return side === "a" ? [x, y - dist] : [x, y + dist];
}

function labelAnchor(angle = 0, side: "a" | "b" = "a"): "start" | "end" | "middle" {
  const vertical = Math.abs(((angle % 180) + 180) % 180 - 90) < 1;
  if (!vertical) return "middle";
  return side === "a" ? "start" : "end";
}

export function Label({
  x,
  y,
  children,
  size = 22,
  anchor = "middle",
  muted = false,
  weight = 500,
  color,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  muted?: boolean;
  weight?: number;
  color?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontWeight={weight}
      fill={color ?? (muted ? "var(--fig-muted)" : INK)}
    >
      {children}
    </text>
  );
}

function PartLabel({
  x,
  y,
  angle,
  side = "a",
  label,
  value,
  dist,
}: {
  x: number;
  y: number;
  angle?: number;
  side?: "a" | "b";
  label?: ReactNode;
  value?: ReactNode;
  dist?: number;
}) {
  if (!label && !value) return null;
  const [lx, ly] = labelPos(x, y, angle, side, dist);
  const anchor = labelAnchor(angle, side);
  const vertical = anchor !== "middle";
  if (label && value) {
    if (vertical) {
      return (
        <g>
          <Label x={lx} y={ly - 13} anchor={anchor}>{label}</Label>
          <Label x={lx} y={ly + 14} anchor={anchor} size={20} muted>{value}</Label>
        </g>
      );
    }
    // Above the part: name on top, value just above the symbol.
    // Below the part: value first (closest), name underneath… keep name first for reading order.
    const nameY = side === "a" ? ly - 14 : ly - 2;
    const valueY = side === "a" ? ly + 12 : ly + 24;
    return (
      <g>
        <Label x={lx} y={nameY} anchor={anchor}>{label}</Label>
        <Label x={lx} y={valueY} anchor={anchor} size={20} muted>
          {value}
        </Label>
      </g>
    );
  }
  return <Label x={lx} y={ly} anchor={anchor}>{label ?? value}</Label>;
}

export function Wire({
  points,
  d,
  color = INK,
  width = 3,
  dash,
}: {
  points?: Pt[];
  d?: string;
  color?: string;
  width?: number;
  dash?: string;
}) {
  const path = d ?? (points ? "M" + points.map((p) => p.join(" ")).join(" L") : "");
  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={dash}
    />
  );
}

export function Node({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={INK} />;
}

export function Terminal({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      {label ? <Label x={x} y={y - 22} size={20}>{label}</Label> : null}
    </g>
  );
}

export function Resistor({
  x,
  y,
  angle,
  label,
  value,
  labelSide = "a",
  variable = false,
  highlight,
}: {
  x: number;
  y: number;
  angle?: number;
  label?: ReactNode;
  value?: ReactNode;
  labelSide?: "a" | "b";
  variable?: boolean;
  highlight?: string;
}) {
  return (
    <g>
      <g transform={rot(angle, x, y)}>
        <line x1={x - 40} y1={y} x2={x - 30} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + 30} y1={y} x2={x + 40} y2={y} stroke={INK} strokeWidth={3} />
        <rect
          x={x - 30}
          y={y - 11}
          width={60}
          height={22}
          fill={highlight ?? BG}
          stroke={INK}
          strokeWidth={3}
          rx={2}
        />
        {variable ? (
          <g>
            <line x1={x - 28} y1={y + 22} x2={x + 26} y2={y - 22} stroke={INK} strokeWidth={2.5} />
            <path d={`M ${x + 26} ${y - 22} l -12 2 l 6 8 z`} fill={INK} />
          </g>
        ) : null}
      </g>
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={value} />
    </g>
  );
}

export function Battery({
  x,
  y,
  angle,
  label,
  value,
  labelSide = "a",
  cells = 1,
}: {
  x: number;
  y: number;
  angle?: number;
  label?: ReactNode;
  value?: ReactNode;
  labelSide?: "a" | "b";
  cells?: 1 | 2;
}) {
  // + terminal on the LEFT before rotation (long plate on the left).
  const plates =
    cells === 1
      ? [
          { dx: -5, long: true },
          { dx: 5, long: false },
        ]
      : [
          { dx: -15, long: true },
          { dx: -5, long: false },
          { dx: 5, long: true },
          { dx: 15, long: false },
        ];
  const left = plates[0].dx;
  const right = plates[plates.length - 1].dx;
  return (
    <g>
      <g transform={rot(angle, x, y)}>
        <line x1={x - 30} y1={y} x2={x + left} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + right} y1={y} x2={x + 30} y2={y} stroke={INK} strokeWidth={3} />
        {plates.map((p, i) => (
          <line
            key={i}
            x1={x + p.dx}
            y1={y - (p.long ? 22 : 11)}
            x2={x + p.dx}
            y2={y + (p.long ? 22 : 11)}
            stroke={p.long ? "var(--fig-plus)" : INK}
            strokeWidth={p.long ? 3 : 5}
          />
        ))}
      </g>
      <g transform={rot(angle, x, y)}>
        <text
          x={x + left - 12}
          y={y - 24}
          fontSize={20}
          textAnchor="middle"
          fontWeight={700}
          fill="var(--fig-plus)"
          transform={angle ? `rotate(${-angle} ${x + left - 12} ${y - 24})` : undefined}
        >
          +
        </text>
      </g>
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={value} dist={42} />
    </g>
  );
}

export function ACSource({
  x,
  y,
  angle,
  label,
  value,
  labelSide = "a",
}: {
  x: number;
  y: number;
  angle?: number;
  label?: ReactNode;
  value?: ReactNode;
  labelSide?: "a" | "b";
}) {
  return (
    <g>
      <g transform={rot(angle, x, y)}>
        <line x1={x - 40} y1={y} x2={x - 24} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + 24} y1={y} x2={x + 40} y2={y} stroke={INK} strokeWidth={3} />
      </g>
      <circle cx={x} cy={y} r={24} fill={BG} stroke={INK} strokeWidth={3} />
      <path
        d={`M ${x - 13} ${y} q 6.5 -12 13 0 t 13 0`}
        fill="none"
        stroke={INK}
        strokeWidth={2.5}
      />
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={value} dist={44} />
    </g>
  );
}

export function DCSource({
  x,
  y,
  angle,
  label,
  value,
  labelSide = "a",
}: {
  x: number;
  y: number;
  angle?: number;
  label?: ReactNode;
  value?: ReactNode;
  labelSide?: "a" | "b";
}) {
  // circle source with + on the left terminal side (before rotation)
  return (
    <g>
      <g transform={rot(angle, x, y)}>
        <line x1={x - 40} y1={y} x2={x - 24} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + 24} y1={y} x2={x + 40} y2={y} stroke={INK} strokeWidth={3} />
        <circle cx={x} cy={y} r={24} fill={BG} stroke={INK} strokeWidth={3} />
        <line x1={x - 14} y1={y} x2={x - 4} y2={y} stroke="var(--fig-plus)" strokeWidth={2.5} />
        <line x1={x - 9} y1={y - 5} x2={x - 9} y2={y + 5} stroke="var(--fig-plus)" strokeWidth={2.5} />
        <line x1={x + 4} y1={y} x2={x + 14} y2={y} stroke={INK} strokeWidth={2.5} />
      </g>
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={value} dist={44} />
    </g>
  );
}

export function Lamp({
  x,
  y,
  angle,
  on = false,
  label,
  value,
  labelSide = "a",
}: {
  x: number;
  y: number;
  angle?: number;
  on?: boolean;
  label?: ReactNode;
  value?: ReactNode;
  labelSide?: "a" | "b";
}) {
  const r = 18;
  const k = r * Math.SQRT1_2;
  return (
    <g>
      {on ? <circle cx={x} cy={y} r={r + 12} fill="var(--fig-glow)" opacity={0.45} /> : null}
      <g transform={rot(angle, x, y)}>
        <line x1={x - 30} y1={y} x2={x - r} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + r} y1={y} x2={x + 30} y2={y} stroke={INK} strokeWidth={3} />
      </g>
      <circle cx={x} cy={y} r={r} fill={on ? "var(--fig-glow)" : BG} stroke={INK} strokeWidth={3} />
      <line x1={x - k} y1={y - k} x2={x + k} y2={y + k} stroke={INK} strokeWidth={2.5} />
      <line x1={x - k} y1={y + k} x2={x + k} y2={y - k} stroke={INK} strokeWidth={2.5} />
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={value} dist={40} />
    </g>
  );
}

export function SwitchSym({
  x,
  y,
  angle,
  closed = false,
  label,
  labelSide = "a",
}: {
  x: number;
  y: number;
  angle?: number;
  closed?: boolean;
  label?: ReactNode;
  labelSide?: "a" | "b";
}) {
  return (
    <g>
      <g transform={rot(angle, x, y)}>
        <line x1={x - 40} y1={y} x2={x - 22} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + 22} y1={y} x2={x + 40} y2={y} stroke={INK} strokeWidth={3} />
        <circle cx={x - 22} cy={y} r={4.5} fill={BG} stroke={INK} strokeWidth={2.5} />
        <circle cx={x + 22} cy={y} r={4.5} fill={BG} stroke={INK} strokeWidth={2.5} />
        {closed ? (
          <line x1={x - 19} y1={y - 2} x2={x + 20} y2={y - 3} stroke={INK} strokeWidth={3} />
        ) : (
          <line x1={x - 19} y1={y - 2} x2={x + 16} y2={y - 22} stroke={INK} strokeWidth={3} />
        )}
      </g>
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} dist={38} />
    </g>
  );
}

export function Meter({
  x,
  y,
  kind,
  angle,
  label,
  labelSide = "a",
  reading,
}: {
  x: number;
  y: number;
  kind: "A" | "V" | "Ω" | "W";
  angle?: number;
  label?: ReactNode;
  labelSide?: "a" | "b";
  reading?: ReactNode;
}) {
  return (
    <g>
      <g transform={rot(angle, x, y)}>
        <line x1={x - 28} y1={y} x2={x - 24} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + 24} y1={y} x2={x + 28} y2={y} stroke={INK} strokeWidth={3} />
      </g>
      <circle cx={x} cy={y} r={24} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={x} y={y + 1} size={24} weight={700}>
        {kind}
      </Label>
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={reading} dist={42} />
    </g>
  );
}

export function Ground({
  x,
  y,
  kind = "earth",
  label,
}: {
  x: number;
  y: number;
  kind?: "earth" | "chassis" | "pe";
  label?: ReactNode;
}) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 14} stroke={INK} strokeWidth={3} />
      {kind === "chassis" ? (
        <g stroke={INK} strokeWidth={3}>
          <line x1={x - 16} y1={y + 14} x2={x + 16} y2={y + 14} />
          <line x1={x - 16} y1={y + 14} x2={x - 24} y2={y + 26} />
          <line x1={x} y1={y + 14} x2={x - 8} y2={y + 26} />
          <line x1={x + 16} y1={y + 14} x2={x + 8} y2={y + 26} />
        </g>
      ) : (
        <g stroke={INK} strokeWidth={3}>
          <line x1={x - 18} y1={y + 14} x2={x + 18} y2={y + 14} />
          <line x1={x - 11} y1={y + 21} x2={x + 11} y2={y + 21} />
          <line x1={x - 4} y1={y + 28} x2={x + 4} y2={y + 28} />
        </g>
      )}
      {kind === "pe" ? (
        <circle cx={x} cy={y + 18} r={18} fill="none" stroke={INK} strokeWidth={2.5} />
      ) : null}
      {label ? <Label x={x + 30} y={y + 18} anchor="start" size={20}>{label}</Label> : null}
    </g>
  );
}

export function Capacitor({
  x,
  y,
  angle,
  polarized = false,
  label,
  value,
  labelSide = "a",
}: {
  x: number;
  y: number;
  angle?: number;
  polarized?: boolean;
  label?: ReactNode;
  value?: ReactNode;
  labelSide?: "a" | "b";
}) {
  return (
    <g>
      <g transform={rot(angle, x, y)}>
        <line x1={x - 30} y1={y} x2={x - 6} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + 6} y1={y} x2={x + 30} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x - 6} y1={y - 20} x2={x - 6} y2={y + 20} stroke={INK} strokeWidth={3.5} />
        {polarized ? (
          <path d={`M ${x + 10} ${y - 20} Q ${x + 3} ${y} ${x + 10} ${y + 20}`} fill="none" stroke={INK} strokeWidth={3.5} />
        ) : (
          <line x1={x + 6} y1={y - 20} x2={x + 6} y2={y + 20} stroke={INK} strokeWidth={3.5} />
        )}
        {polarized ? (
          <g stroke="var(--fig-plus)" strokeWidth={2.5}>
            <line x1={x - 22} y1={y - 16} x2={x - 12} y2={y - 16} />
            <line x1={x - 17} y1={y - 21} x2={x - 17} y2={y - 11} />
          </g>
        ) : null}
      </g>
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={value} dist={40} />
    </g>
  );
}

export function Inductor({
  x,
  y,
  angle,
  turns = 4,
  core = "none",
  label,
  value,
  labelSide = "a",
}: {
  x: number;
  y: number;
  angle?: number;
  turns?: number;
  core?: "none" | "iron" | "ferrite";
  label?: ReactNode;
  value?: ReactNode;
  labelSide?: "a" | "b";
}) {
  const w = 60;
  const step = w / turns;
  let d = `M ${x - 40} ${y} L ${x - w / 2} ${y}`;
  for (let i = 0; i < turns; i++) {
    const sx = x - w / 2 + i * step;
    d += ` A ${step / 2} ${step / 2} 0 0 1 ${sx + step} ${y}`;
  }
  d += ` L ${x + 40} ${y}`;
  return (
    <g>
      <g transform={rot(angle, x, y)}>
        <path d={d} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        {core !== "none" ? (
          <g stroke={INK} strokeWidth={2.5} strokeDasharray={core === "ferrite" ? "6 4" : undefined}>
            <line x1={x - w / 2} y1={y - step / 2 - 6} x2={x + w / 2} y2={y - step / 2 - 6} />
            <line x1={x - w / 2} y1={y - step / 2 - 12} x2={x + w / 2} y2={y - step / 2 - 12} />
          </g>
        ) : null}
      </g>
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={value} dist={core !== "none" ? 46 : 36} />
    </g>
  );
}

export function Diode({
  x,
  y,
  angle,
  kind = "diode",
  label,
  value,
  labelSide = "a",
  lit = false,
}: {
  x: number;
  y: number;
  angle?: number;
  kind?: "diode" | "led" | "zener" | "photodiode";
  label?: ReactNode;
  value?: ReactNode;
  labelSide?: "a" | "b";
  lit?: boolean;
}) {
  // Anode on the LEFT, cathode on the RIGHT (before rotation). Arrow points A→K.
  return (
    <g>
      {kind === "led" && lit ? <circle cx={x} cy={y} r={28} fill="var(--fig-glow)" opacity={0.4} /> : null}
      <g transform={rot(angle, x, y)}>
        <line x1={x - 30} y1={y} x2={x - 12} y2={y} stroke={INK} strokeWidth={3} />
        <line x1={x + 12} y1={y} x2={x + 30} y2={y} stroke={INK} strokeWidth={3} />
        <path d={`M ${x - 12} ${y - 16} L ${x - 12} ${y + 16} L ${x + 12} ${y} Z`} fill={kind === "led" && lit ? "var(--fig-glow)" : BG} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        {kind === "zener" ? (
          <path d={`M ${x + 6} ${y - 20} L ${x + 12} ${y - 16} L ${x + 12} ${y + 16} L ${x + 18} ${y + 20}`} fill="none" stroke={INK} strokeWidth={3} />
        ) : (
          <line x1={x + 12} y1={y - 16} x2={x + 12} y2={y + 16} stroke={INK} strokeWidth={3} />
        )}
        {kind === "led" ? (
          <g stroke={INK} strokeWidth={2} fill={INK}>
            <line x1={x} y1={y - 20} x2={x + 10} y2={y - 32} />
            <path d={`M ${x + 10} ${y - 32} l -7 1 l 4 5 z`} />
            <line x1={x + 8} y1={y - 16} x2={x + 18} y2={y - 28} />
            <path d={`M ${x + 18} ${y - 28} l -7 1 l 4 5 z`} />
          </g>
        ) : null}
        {kind === "photodiode" ? (
          <g stroke={INK} strokeWidth={2} fill={INK}>
            <line x1={x + 10} y1={y - 32} x2={x} y2={y - 20} />
            <path d={`M ${x} ${y - 20} l 1 -7 l 5 4 z`} />
            <line x1={x + 18} y1={y - 28} x2={x + 8} y2={y - 16} />
            <path d={`M ${x + 8} ${y - 16} l 1 -7 l 5 4 z`} />
          </g>
        ) : null}
      </g>
      <PartLabel x={x} y={y} angle={angle} side={labelSide} label={label} value={value} dist={kind === "led" ? 46 : 38} />
    </g>
  );
}

/** NPN BJT: base terminal at (x−40, y), collector at (x+20, y−40), emitter at (x+20, y+40). */
export function NPN({ x, y, label, pnp = false }: { x: number; y: number; label?: ReactNode; pnp?: boolean }) {
  return (
    <g>
      <circle cx={x + 6} cy={y} r={30} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={x - 40} y1={y} x2={x - 6} y2={y} stroke={INK} strokeWidth={3} />
      <line x1={x - 6} y1={y - 18} x2={x - 6} y2={y + 18} stroke={INK} strokeWidth={4} />
      <line x1={x - 6} y1={y - 8} x2={x + 20} y2={y - 26} stroke={INK} strokeWidth={3} />
      <line x1={x + 20} y1={y - 26} x2={x + 20} y2={y - 40} stroke={INK} strokeWidth={3} />
      <line x1={x - 6} y1={y + 8} x2={x + 20} y2={y + 26} stroke={INK} strokeWidth={3} />
      <line x1={x + 20} y1={y + 26} x2={x + 20} y2={y + 40} stroke={INK} strokeWidth={3} />
      {pnp ? (
        <path d={`M ${x - 4} ${y + 9} l 12 1 l -5 8 z`} fill={INK} />
      ) : (
        <path d={`M ${x + 20} ${y + 26} l -12 -1 l 5 -8 z`} fill={INK} />
      )}
      <Label x={x - 30} y={y + 22} size={18} muted>B</Label>
      <Label x={x + 36} y={y - 36} size={18} muted>C</Label>
      <Label x={x + 36} y={y + 36} size={18} muted>E</Label>
      {label ? <Label x={x + 48} y={y} anchor="start">{label}</Label> : null}
    </g>
  );
}

export function PNP(props: { x: number; y: number; label?: ReactNode }) {
  return <NPN {...props} pnp />;
}

export function Arrow({
  from,
  to,
  color = "var(--fig-current)",
  width = 3,
  label,
  labelOffset = [0, -18],
  head = 12,
}: {
  from: Pt;
  to: Pt;
  color?: string;
  width?: number;
  label?: ReactNode;
  labelOffset?: Pt;
  head?: number;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - head * Math.cos(a);
  const hy = y2 - head * Math.sin(a);
  const p1: Pt = [hx + (head / 2) * Math.sin(a), hy - (head / 2) * Math.cos(a)];
  const p2: Pt = [hx - (head / 2) * Math.sin(a), hy + (head / 2) * Math.cos(a)];
  return (
    <g>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={`M ${x2} ${y2} L ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} Z`} fill={color} />
      {label ? (
        <Label x={(x1 + x2) / 2 + labelOffset[0]} y={(y1 + y2) / 2 + labelOffset[1]} size={20} color={color}>
          {label}
        </Label>
      ) : null}
    </g>
  );
}

export function Callout({
  x,
  y,
  w,
  h,
  tone = "info",
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: "info" | "ok" | "danger" | "warn";
  children?: ReactNode;
}) {
  const stroke =
    tone === "ok" ? "var(--fig-ok)" : tone === "danger" ? "var(--fig-danger)" : tone === "warn" ? "var(--fig-warn)" : "var(--fig-accent)";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill="var(--fig-panel)" stroke={stroke} strokeWidth={2.5} />
      {children}
    </g>
  );
}

/** Striped protective-earth conductor (green with yellow stripes). */
export function PEWire({ points, width = 6 }: { points: Pt[]; width?: number }) {
  return (
    <g>
      <Wire points={points} color="var(--fig-wire-pe-g)" width={width} />
      <Wire points={points} color="var(--fig-wire-pe-y)" width={width} dash="8 8" />
    </g>
  );
}
