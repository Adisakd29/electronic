/**
 * Week 9 — ตัวเหนี่ยวนำ (Inductor). Original drawings (no scanned images).
 */
import type { ReactElement } from "react";
import type { FigureMap } from "@/content/types";
import { Arrow, Battery, Diode, Inductor, Label, Meter, Node, SwitchSym, Terminal, Wire } from "./kit";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const PANEL = "var(--fig-panel)";
const BG = "var(--fig-bg)";
const COPPER = "var(--fig-copper)";
const FIELD = "var(--fig-field)";
const GRID = "var(--fig-grid)";
const CURRENT = "var(--fig-current)";

// ---------------------------------------------------------------------------
// shared helpers (plain functions, not components)
// ---------------------------------------------------------------------------

/** Larger IEC inductor symbol (semicircle bumps) for symbol tables. */
function coilPath(x: number, y: number, w: number, turns: number, lead = 22) {
  const step = w / turns;
  let d = `M ${x - w / 2 - lead} ${y} L ${x - w / 2} ${y}`;
  for (let i = 0; i < turns; i++) {
    const sx = x - w / 2 + i * step;
    d += ` A ${step / 2} ${step / 2} 0 0 1 ${sx + step} ${y}`;
  }
  d += ` L ${x + w / 2 + lead} ${y}`;
  return d;
}

/** Loop-style (older ANSI) coil drawn as a prolate cycloid. */
function loopPath(x: number, y: number, w: number, turns: number, lead = 22) {
  const r = w / (2 * Math.PI * turns);
  const dd = 2.3 * r;
  const x0 = x - w / 2;
  const pts: string[] = [];
  const n = turns * 48;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI * turns;
    const px = x0 + r * t - dd * Math.sin(t);
    const py = y - dd * (1 - Math.cos(t));
    pts.push(`${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  return `M ${x0 - lead} ${y} L ${pts.join(" L ")} L ${x + w / 2 + lead} ${y}`;
}

function arrowHead(x: number, y: number, angleDeg: number, size = 12, color = INK) {
  const a = (angleDeg * Math.PI) / 180;
  const bx = x - size * Math.cos(a);
  const by = y - size * Math.sin(a);
  const p1 = [bx + (size / 2) * Math.sin(a), by - (size / 2) * Math.cos(a)];
  const p2 = [bx - (size / 2) * Math.sin(a), by + (size / 2) * Math.cos(a)];
  return <path d={`M ${x} ${y} L ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} Z`} fill={color} />;
}

/** Bar magnet: N half labelled, S half labelled (never colour alone). */
function BarMagnet({ x, y, w = 100, h = 30, nRight = true }: { x: number; y: number; w?: number; h?: number; nRight?: boolean }) {
  const left = nRight ? "S" : "N";
  const right = nRight ? "N" : "S";
  const fillOf = (p: string) => (p === "N" ? "var(--fig-danger)" : "var(--fig-accent)");
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w / 2} height={h} fill={fillOf(left)} stroke={INK} strokeWidth={2.5} />
      <rect x={x} y={y - h / 2} width={w / 2} height={h} fill={fillOf(right)} stroke={INK} strokeWidth={2.5} />
      <Label x={x - w / 4} y={y + 1} size={22} weight={700} color={BG}>
        {left}
      </Label>
      <Label x={x + w / 4} y={y + 1} size={22} weight={700} color={BG}>
        {right}
      </Label>
    </g>
  );
}

/** Text with a subscript, e.g. X with sub L → X_L (drawn with tspans). */
function SubText({
  x,
  y,
  main,
  sub,
  rest = "",
  size = 22,
  anchor = "middle",
  color = INK,
  weight = 600,
}: {
  x: number;
  y: number;
  main: string;
  sub: string;
  rest?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  color?: string;
  weight?: number;
}) {
  const sh = Math.round(size * 0.28);
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} dominantBaseline="middle" fontWeight={weight} fill={color}>
      {main}
      <tspan fontSize={Math.round(size * 0.72)} dy={sh}>
        {sub}
      </tspan>
      <tspan dy={-sh}>{rest}</tspan>
    </text>
  );
}

// ---------------------------------------------------------------------------
// F01 Faraday experiment — magnet in / stationary / out
// ---------------------------------------------------------------------------
function FaradayRow({ y0, mode }: { y0: number; mode: "in" | "stop" | "out" }) {
  const cy = y0 + 92;
  const title = mode === "in" ? "① ดันแม่เหล็กเข้าขดลวด" : mode === "stop" ? "② แม่เหล็กหยุดนิ่งในขด" : "③ ดึงแม่เหล็กออก";
  const result = mode === "in" ? "เข็มเบนขวาชั่วขณะ" : mode === "stop" ? "เข็มอยู่ที่ 0" : "เข็มเบนซ้ายชั่วขณะ";
  const needle = mode === "in" ? 38 : mode === "stop" ? 0 : -38;
  const gx = 505;
  const pivotY = cy + 22;
  const nl = 40;
  const a = (needle * Math.PI) / 180;
  const coilXs = [244, 266, 288, 310, 332, 354];
  return (
    <g>
      <Label x={16} y={y0 + 24} anchor="start" weight={600}>
        {title}
      </Label>
      <Label x={588} y={y0 + 24} anchor="end" size={21} color={mode === "stop" ? MUTED : CURRENT} weight={600}>
        {result}
      </Label>
      {/* magnet */}
      {mode === "stop" ? <BarMagnet x={300} y={cy} /> : <BarMagnet x={122} y={cy} />}
      {mode === "in" ? <Arrow from={[78, y0 + 56]} to={[172, y0 + 56]} color={INK} /> : null}
      {mode === "out" ? <Arrow from={[172, y0 + 56]} to={[78, y0 + 56]} color={INK} /> : null}
      {/* coil turns */}
      {coilXs.map((x) => (
        <ellipse key={x} cx={x} cy={cy} rx={9} ry={32} fill="none" stroke={COPPER} strokeWidth={3.5} />
      ))}
      {/* leads to galvanometer */}
      <Wire points={[[236, cy + 22], [236, y0 + 144], [520, y0 + 144], [520, cy + 38]]} width={2.5} />
      <Wire points={[[362, cy + 22], [362, y0 + 136], [490, y0 + 136], [490, cy + 37]]} width={2.5} />
      {/* galvanometer (centre-zero) */}
      <circle cx={gx} cy={cy} r={42} fill={PANEL} stroke={INK} strokeWidth={3} />
      <path
        d={`M ${gx - 34 * Math.sin(0.95)} ${pivotY - 34 * Math.cos(0.95)} A 34 34 0 0 1 ${gx + 34 * Math.sin(0.95)} ${pivotY - 34 * Math.cos(0.95)}`}
        fill="none"
        stroke={MUTED}
        strokeWidth={2}
      />
      <line x1={gx} y1={pivotY - 30} x2={gx} y2={pivotY - 38} stroke={MUTED} strokeWidth={2} />
      <line x1={gx} y1={pivotY} x2={gx + nl * Math.sin(a)} y2={pivotY - nl * Math.cos(a)} stroke="var(--fig-danger)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={gx} cy={pivotY} r={4} fill={INK} />
      <Label x={gx + 54} y={cy} anchor="start" weight={700}>
        G
      </Label>
    </g>
  );
}

function F01() {
  return (
    <svg viewBox="0 0 600 446" aria-hidden="true">
      <FaradayRow y0={0} mode="in" />
      <line x1={8} y1={149} x2={592} y2={149} stroke={GRID} strokeWidth={2} />
      <FaradayRow y0={150} mode="stop" />
      <line x1={8} y1={299} x2={592} y2={299} stroke={GRID} strokeWidth={2} />
      <FaradayRow y0={300} mode="out" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 Field around a current-carrying solenoid
// ---------------------------------------------------------------------------
function F02() {
  const x0 = 190;
  const x1 = 410;
  const top = 118;
  const bot = 222;
  const turns = 7;
  const p = (x1 - x0) / turns;
  const fronts: ReactElement[] = [];
  const backs: ReactElement[] = [];
  for (let i = 0; i < turns; i++) {
    const xa = x0 + i * p;
    backs.push(<line key={`b${i}`} x1={xa + p / 2} y1={top} x2={xa + p} y2={bot} stroke={COPPER} strokeWidth={2} strokeDasharray="5 5" opacity={0.7} />);
    fronts.push(<line key={`f${i}`} x1={xa} y1={bot} x2={xa + p / 2} y2={top} stroke={COPPER} strokeWidth={4.5} strokeLinecap="round" />);
  }
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <style>{`.w09f02-flow{stroke-dasharray:10 12;animation:w09f02 3s linear infinite}@keyframes w09f02{to{stroke-dashoffset:-44}}`}</style>
      {/* outside field lines: N (left) -> S (right) */}
      {[
        "M 178 158 C 120 30, 480 30, 422 158",
        "M 166 164 C 70 -40, 530 -40, 434 164",
        "M 178 182 C 120 310, 480 310, 422 182",
        "M 166 176 C 70 380, 530 380, 434 176",
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={FIELD} strokeWidth={2.2} className="w09f02-flow" />
      ))}
      {arrowHead(306, 62, 0, 13, FIELD)}
      {arrowHead(306, 23, 0, 13, FIELD)}
      {arrowHead(306, 278, 0, 13, FIELD)}
      {arrowHead(306, 317, 0, 13, FIELD)}
      {/* inside field line: S -> N (right to left) */}
      <line x1={432} y1={170} x2={168} y2={170} stroke={FIELD} strokeWidth={2.5} />
      {arrowHead(168, 170, 180, 14, FIELD)}
      {arrowHead(300, 170, 180, 14, FIELD)}
      {backs}
      {fronts}
      {/* current arrows on two front segments (upward) */}
      {arrowHead(x0 + 1 * p + p / 4 + 2, (top + bot) / 2 - 8, -73, 13, CURRENT)}
      {arrowHead(x0 + 5 * p + p / 4 + 2, (top + bot) / 2 - 8, -73, 13, CURRENT)}
      {/* poles */}
      <Label x={118} y={170} size={30} weight={800}>
        N
      </Label>
      <Label x={482} y={170} size={30} weight={800}>
        S
      </Label>
      {/* leads + battery (+ on the left) */}
      <Wire points={[[x0, bot], [x0, 372], [270, 372]]} />
      <Wire points={[[330, 372], [x1, 372], [x1, bot]]} />
      <Battery x={300} y={372} label="E" labelSide="b" />
      <Arrow from={[x0 - 16, 350]} to={[x0 - 16, 286]} label="I" labelOffset={[-18, 0]} />
      <Label x={590} y={400} anchor="end" size={20} color={FIELD} weight={600}>
        เส้นแรงแม่เหล็ก (ม่วง)
      </Label>
      <Label x={10} y={400} anchor="start" size={20} color={CURRENT} weight={600}>
        กระแส I (ส้ม)
      </Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 Inductor symbols
// ---------------------------------------------------------------------------
function SymCell({ x, y, kind, label, label2 }: { x: number; y: number; kind: "air" | "iron" | "ferrite" | "var" | "ferrite-var" | "loop"; label: string; label2?: string }) {
  const w = 104;
  const turns = 4;
  const r = w / turns / 2;
  const core = kind === "iron" || kind === "ferrite" || kind === "ferrite-var";
  const dash = kind === "ferrite" || kind === "ferrite-var" ? "8 6" : undefined;
  return (
    <g>
      <path d={kind === "loop" ? loopPath(x, y + 6, w, turns) : coilPath(x, y + 6, w, turns)} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      {core ? (
        <g stroke={INK} strokeWidth={3} strokeDasharray={dash}>
          <line x1={x - w / 2} y1={y + 6 - r - 9} x2={x + w / 2} y2={y + 6 - r - 9} />
          <line x1={x - w / 2} y1={y + 6 - r - 18} x2={x + w / 2} y2={y + 6 - r - 18} />
        </g>
      ) : null}
      {kind === "var" || kind === "ferrite-var" ? (
        <g>
          <line x1={x - 46} y1={y + 30} x2={x + 40} y2={y - 46} stroke={INK} strokeWidth={2.5} />
          {arrowHead(x + 46, y - 51, -41.5, 14)}
        </g>
      ) : null}
      <Label x={x} y={y + 58}>{label}</Label>
      {label2 ? (
        <Label x={x} y={y + 86} size={20} muted>
          {label2}
        </Label>
      ) : null}
    </g>
  );
}

function F03() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <SymCell x={100} y={86} kind="air" label="แกนอากาศ" />
      <SymCell x={300} y={86} kind="iron" label="แกนเหล็ก" />
      <SymCell x={500} y={86} kind="ferrite" label="แกนเฟอร์ไรต์" />
      <line x1={10} y1={175} x2={590} y2={175} stroke={GRID} strokeWidth={2} />
      <SymCell x={100} y={252} kind="var" label="ปรับค่าได้" />
      <SymCell x={300} y={252} kind="ferrite-var" label="ปรับค่าได้" label2="(แกนเฟอร์ไรต์)" />
      <SymCell x={500} y={252} kind="loop" label="แบบวงขด" label2="(ANSI รุ่นเก่า)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 Factors: L = N²μA/l
// ---------------------------------------------------------------------------
function F04() {
  const cx0 = 90;
  const cx1 = 450;
  const top = 130;
  const bot = 210;
  const w0 = 170;
  const w1 = 436;
  const turns = 10;
  const p = (w1 - w0) / turns;
  return (
    <svg viewBox="0 0 600 370" aria-hidden="true">
      <Label x={300} y={34} size={28} weight={700}>
        L = N² μ A / ℓ
      </Label>
      {/* core */}
      <rect x={cx0} y={top} width={cx1 - cx0} height={bot - top} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <ellipse cx={cx1} cy={(top + bot) / 2} rx={16} ry={40} fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={3} />
      <Label x={128} y={170} size={30} weight={700} color="var(--fig-accent-2)">
        μ
      </Label>
      {/* winding */}
      {Array.from({ length: turns }, (_, i) => {
        const xa = w0 + i * p;
        return <line key={i} x1={xa} y1={bot + 6} x2={xa + p * 0.6} y2={top - 6} stroke={COPPER} strokeWidth={5} strokeLinecap="round" />;
      })}
      {/* length l */}
      <line x1={w0} y1={100} x2={w1 + 10} y2={100} stroke={INK} strokeWidth={2} />
      {arrowHead(w0, 100, 180, 12)}
      {arrowHead(w1 + 10, 100, 0, 12)}
      <line x1={w0} y1={92} x2={w0} y2={124} stroke={MUTED} strokeWidth={1.5} />
      <line x1={w1 + 10} y1={92} x2={w1 + 10} y2={124} stroke={MUTED} strokeWidth={1.5} />
      <Label x={(w0 + w1) / 2} y={80} size={24} weight={700}>
        ℓ (ความยาวขด)
      </Label>
      {/* N */}
      <Label x={300} y={240} size={24} weight={700} color={COPPER}>
        N รอบ
      </Label>
      {/* A */}
      <Arrow from={[530, 250]} to={[462, 196]} color="var(--fig-accent)" />
      <Label x={548} y={262} size={24} weight={700} color="var(--fig-accent)">
        A
      </Label>
      {/* legend */}
      <Label x={300} y={302} size={20}>
        N = จำนวนรอบ · A = พื้นที่หน้าตัด (m²)
      </Label>
      <Label x={300} y={338} size={20}>
        ℓ = ความยาวขด (m) · μ = μ₀μᵣ (H/m)
      </Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 Gallery of real inductor shapes (line drawings)
// ---------------------------------------------------------------------------
function F05() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* 1 rod choke */}
      <g>
        <line x1={20} y1={100} x2={40} y2={100} stroke={INK} strokeWidth={3} />
        <line x1={160} y1={100} x2={180} y2={100} stroke={INK} strokeWidth={3} />
        <rect x={30} y={86} width={140} height={28} rx={6} fill={MUTED} stroke={INK} strokeWidth={2.5} />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={58 + i * 7.5} y1={118} x2={62 + i * 7.5} y2={82} stroke={COPPER} strokeWidth={4} />
        ))}
        <Label x={100} y={160} size={20}>โช้กแท่งเฟอร์ไรต์</Label>
      </g>
      {/* 2 axial colour band 47 µH ±5% */}
      <g>
        <line x1={212} y1={90} x2={240} y2={90} stroke={INK} strokeWidth={3} />
        <line x1={360} y1={90} x2={388} y2={90} stroke={INK} strokeWidth={3} />
        <rect x={236} y={68} width={128} height={44} rx={20} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
        <rect x={256} y={68} width={14} height={44} fill="var(--fig-glow)" stroke={INK} strokeWidth={1} />
        <rect x={280} y={68} width={14} height={44} fill="var(--fig-accent-2)" stroke={INK} strokeWidth={1} />
        <rect x={304} y={68} width={14} height={44} fill="var(--fig-wire-l2)" stroke={INK} strokeWidth={1} />
        <rect x={336} y={68} width={12} height={44} fill="var(--fig-warn)" stroke={INK} strokeWidth={1} />
        <Label x={300} y={140} size={20}>เหลือง–ม่วง–ดำ–ทอง</Label>
        <Label x={300} y={166} size={20} weight={700}>= 47 µH ±5%</Label>
      </g>
      {/* 3 toroid */}
      <g>
        <circle cx={505} cy={92} r={46} fill={MUTED} stroke={INK} strokeWidth={2.5} />
        <circle cx={505} cy={92} r={20} fill={BG} stroke={INK} strokeWidth={2.5} />
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * 2 * Math.PI + 0.2;
          if (a > 1.2 && a < 1.95) return null;
          return (
            <line key={i} x1={505 + 16 * Math.cos(a)} y1={92 + 16 * Math.sin(a)} x2={505 + 50 * Math.cos(a)} y2={92 + 50 * Math.sin(a)} stroke={COPPER} strokeWidth={4} strokeLinecap="round" />
          );
        })}
        <line x1={492} y1={140} x2={486} y2={156} stroke={COPPER} strokeWidth={3} />
        <line x1={518} y1={140} x2={524} y2={156} stroke={COPPER} strokeWidth={3} />
        <Label x={505} y={172} size={20}>ทอรอยด์</Label>
      </g>
      <line x1={10} y1={200} x2={590} y2={200} stroke={GRID} strokeWidth={2} />
      {/* 4 SMD drum printed 101 */}
      <g>
        <rect x={98} y={248} width={104} height={80} rx={8} fill={MUTED} stroke={INK} strokeWidth={2.5} />
        <rect x={90} y={308} width={22} height={24} fill={BG} stroke={INK} strokeWidth={2} />
        <rect x={188} y={308} width={22} height={24} fill={BG} stroke={INK} strokeWidth={2} />
        <Label x={150} y={282} size={30} weight={700} color={BG}>101</Label>
        <Label x={150} y={366} size={20}>SMD พิมพ์ 101</Label>
        <Label x={150} y={394} size={20} weight={700}>= 100 µH</Label>
      </g>
      {/* 5 adjustable with slug */}
      <g>
        <rect x={340} y={262} width={150} height={50} rx={4} fill={PANEL} stroke={INK} strokeWidth={2.5} />
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1={354 + i * 9} y1={316} x2={358 + i * 9} y2={258} stroke={COPPER} strokeWidth={4} />
        ))}
        {/* slug sticking out to the right */}
        <rect x={470} y={274} width={74} height={26} rx={3} fill="var(--fig-wire-l2)" stroke={INK} strokeWidth={2} />
        <line x1={544} y1={278} x2={544} y2={296} stroke={BG} strokeWidth={4} />
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1={492 + i * 9} y1={274} x2={496 + i * 9} y2={300} stroke={BG} strokeWidth={1.5} />
        ))}
        <line x1={350} y1={312} x2={350} y2={336} stroke={INK} strokeWidth={3} />
        <line x1={480} y1={312} x2={480} y2={336} stroke={INK} strokeWidth={3} />
        <Arrow from={[580, 287]} to={[556, 287]} color={INK} head={10} />
        <Label x={440} y={366} size={20}>ปรับค่าได้: หมุนแกน (slug)</Label>
        <Label x={440} y={394} size={20} muted>ใช้ไขควงพลาสติก</Label>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 Series / parallel / mixed connections
// ---------------------------------------------------------------------------
function VertL({ x, yc, name, value }: { x: number; yc: number; name: string; value: string }) {
  return (
    <g>
      <Inductor x={x} y={yc} angle={90} />
      <Label x={x + 18} y={yc - 14} anchor="start" size={20}>{name}</Label>
      <Label x={x + 18} y={yc + 14} anchor="start" size={20} muted>{value}</Label>
    </g>
  );
}

function F06() {
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      {/* ก. series */}
      <Label x={16} y={24} anchor="start" weight={600}>ก. อนุกรม</Label>
      <Wire points={[[40, 70], [100, 70]]} />
      <Inductor x={140} y={70} label="L₁" value="5 mH" labelSide="b" />
      <Wire points={[[180, 70], [210, 70]]} />
      <Inductor x={250} y={70} label="L₂" value="2 mH" labelSide="b" />
      <Wire points={[[290, 70], [320, 70]]} />
      <Inductor x={360} y={70} label="L₃" value="10 mH" labelSide="b" />
      <Wire points={[[400, 70], [430, 70]]} />
      <Inductor x={470} y={70} label="L₄" value="1 mH" labelSide="b" />
      <Wire points={[[510, 70], [560, 70]]} />
      <Terminal x={40} y={70} />
      <Terminal x={560} y={70} />
      <line x1={10} y1={150} x2={590} y2={150} stroke={GRID} strokeWidth={2} />
      <line x1={336} y1={160} x2={336} y2={430} stroke={GRID} strokeWidth={2} />
      {/* ข. parallel */}
      <Label x={16} y={176} anchor="start" weight={600}>ข. ขนาน</Label>
      <Wire points={[[30, 225], [240, 225]]} />
      <Wire points={[[30, 405], [240, 405]]} />
      {[60, 150, 240].map((x) => (
        <g key={x}>
          <Wire points={[[x, 225], [x, 275]]} />
          <Wire points={[[x, 355], [x, 405]]} />
        </g>
      ))}
      <VertL x={60} yc={315} name="L₁" value="10 mH" />
      <VertL x={150} yc={315} name="L₂" value="5 mH" />
      <VertL x={240} yc={315} name="L₃" value="2 mH" />
      <Node x={60} y={225} />
      <Node x={150} y={225} />
      <Node x={60} y={405} />
      <Node x={150} y={405} />
      <Terminal x={30} y={225} />
      <Terminal x={30} y={405} />
      {/* ค. mixed: L1 + (L2 ∥ L3) */}
      <Label x={352} y={176} anchor="start" weight={600}>ค. ผสม</Label>
      <Wire points={[[356, 285], [366, 285]]} />
      <Inductor x={406} y={285} label="L₁" value="4 mH" />
      <Wire points={[[446, 285], [462, 285]]} />
      <Wire points={[[462, 245], [462, 325]]} />
      <Wire points={[[462, 245], [482, 245]]} />
      <Wire points={[[462, 325], [482, 325]]} />
      <Inductor x={522} y={245} label="L₂" value="6 mH" />
      <Inductor x={522} y={325} label="L₃" value="3 mH" labelSide="b" />
      <Wire points={[[562, 245], [582, 245], [582, 420], [356, 420]]} />
      <Wire points={[[562, 325], [582, 325]]} />
      <Node x={462} y={285} />
      <Node x={582} y={325} />
      <Terminal x={356} y={285} />
      <Terminal x={356} y={420} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 X_L vs f (straight line) compared with X_C vs f (curve)
// ---------------------------------------------------------------------------
function F07() {
  const ox = 80;
  const oy = 330;
  const xc: string[] = [];
  for (let x = 112; x <= 560; x += 4) {
    const y = oy - 9000 / (x - 60);
    xc.push(`${x} ${y.toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 600 390" aria-hidden="true">
      <line x1={ox} y1={oy} x2={572} y2={oy} stroke={INK} strokeWidth={2.5} />
      <line x1={ox} y1={oy} x2={ox} y2={36} stroke={INK} strokeWidth={2.5} />
      {arrowHead(580, oy, 0, 13)}
      {arrowHead(ox, 28, -90, 13)}
      <Label x={ox + 12} y={30} anchor="start" size={20}>รีแอกแตนซ์ X (Ω)</Label>
      <Label x={576} y={360} anchor="end" size={20}>ความถี่ f (Hz)</Label>
      <Label x={ox} y={360} size={20}>0 (DC)</Label>
      {/* X_L line */}
      <line x1={ox} y1={oy} x2={540} y2={70} stroke="var(--fig-accent)" strokeWidth={4} />
      <SubText x={440} y={100} anchor="end" main="X" sub="L" rest=" = 2πfL" weight={700} color="var(--fig-accent)" />
      {/* X_C curve */}
      <path d={`M ${xc.join(" L ")}`} fill="none" stroke="var(--fig-accent-2)" strokeWidth={4} strokeDasharray="12 7" />
      <SubText x={560} y={282} anchor="end" main="X" sub="C" rest=" = 1/(2πfC)" weight={700} color="var(--fig-accent-2)" />
      {/* annotations */}
      <Label x={110} y={70} anchor="start" size={20} muted>(เส้นประ = ตัวเก็บประจุ)</Label>
      <Label x={330} y={222} anchor="start" size={20} muted>(เส้นทึบ = ตัวเหนี่ยวนำ)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 RL step response: i(t) and v_L(t)
// ---------------------------------------------------------------------------
function F08() {
  const ox = 90;
  const oy = 330;
  const tau = 92;
  const H = 260;
  const ip: string[] = [];
  const vp: string[] = [];
  for (let k = 0; k <= 100; k++) {
    const t = (k / 100) * 5;
    const x = ox + t * tau;
    ip.push(`${x.toFixed(1)} ${(oy - H * (1 - Math.exp(-t))).toFixed(1)}`);
    vp.push(`${x.toFixed(1)} ${(oy - H * Math.exp(-t)).toFixed(1)}`);
  }
  const y632 = oy - H * 0.632;
  const y368 = oy - H * 0.368;
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* grid */}
      {[1, 2, 3, 4, 5].map((k) => (
        <line key={k} x1={ox + k * tau} y1={oy} x2={ox + k * tau} y2={oy - H} stroke={GRID} strokeWidth={1.5} />
      ))}
      <line x1={ox} y1={oy - H} x2={ox + 5 * tau} y2={oy - H} stroke={GRID} strokeWidth={1.5} />
      <line x1={ox} y1={oy} x2={ox + 5 * tau + 20} y2={oy} stroke={INK} strokeWidth={2.5} />
      <line x1={ox} y1={oy} x2={ox} y2={oy - H - 20} stroke={INK} strokeWidth={2.5} />
      {["τ", "2τ", "3τ", "4τ", "5τ"].map((s, k) => (
        <Label key={s} x={ox + (k + 1) * tau} y={oy + 22} size={20}>{s}</Label>
      ))}
      <Label x={ox + 5 * tau + 22} y={oy + 22} size={20} anchor="start">t</Label>
      <Label x={ox - 8} y={oy - H} anchor="end" size={20}>100%</Label>
      <Label x={ox - 8} y={oy} anchor="end" size={20}>0</Label>
      <Label x={ox - 8} y={y632} anchor="end" size={20}>63.2%</Label>
      <Label x={ox - 8} y={y368} anchor="end" size={20}>36.8%</Label>
      {/* guides at 1τ */}
      <line x1={ox} y1={y632} x2={ox + tau} y2={y632} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" />
      <line x1={ox} y1={y368} x2={ox + tau} y2={y368} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" />
      <line x1={ox + tau} y1={oy} x2={ox + tau} y2={y632} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" />
      {/* curves */}
      <path d={`M ${ip.join(" L ")}`} fill="none" stroke="var(--fig-accent)" strokeWidth={4} />
      <path d={`M ${vp.join(" L ")}`} fill="none" stroke="var(--fig-accent-2)" strokeWidth={4} strokeDasharray="12 7" />
      <circle cx={ox + tau} cy={y632} r={6} fill="var(--fig-accent)" />
      <circle cx={ox + tau} cy={y368} r={6} fill="var(--fig-accent-2)" />
      {/* legend */}
      <line x1={300} y1={130} x2={340} y2={130} stroke="var(--fig-accent)" strokeWidth={4} />
      <Label x={350} y={130} anchor="start" size={20}>กระแส i (เพิ่มขึ้น)</Label>
      <line x1={300} y1={164} x2={340} y2={164} stroke="var(--fig-accent-2)" strokeWidth={4} strokeDasharray="12 7" />
      <SubText x={350} y={164} anchor="start" size={20} weight={500} main="แรงดัน v" sub="L" rest=" (ลดลง)" />
      <Label x={ox + 5 * tau} y={oy - H - 16} anchor="end" size={20} muted>5τ ≈ 99.3% (ถือว่าคงตัว)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 / F12 relay-coil circuits (switch on the low side)
// ---------------------------------------------------------------------------
function CoilCircuit({ ox, diode, closed, title }: { ox: number; diode: "none" | "ok" | "wrong"; closed: boolean; title: string }) {
  const bx = ox + 100;
  const cx = ox + 165;
  const dx = ox + 235;
  return (
    <g>
      <Label x={ox + 14} y={26} anchor="start" weight={600} size={21}>{title}</Label>
      {/* supply */}
      <Battery x={bx} y={190} angle={90} label="12 V" labelSide="b" />
      <Wire points={[[bx, 160], [bx, 70], [cx, 70], [cx, 90]]} />
      <Wire points={[[bx, 220], [bx, 300], [cx, 300], [cx, 272]]} />
      {/* relay coil K */}
      <Inductor x={cx} y={130} angle={90} />
      <Label x={cx - 22} y={130} anchor="end" size={22} weight={700}>K</Label>
      <Wire points={[[cx, 170], [cx, 192]]} />
      {/* switch S */}
      <SwitchSym x={cx} y={232} angle={90} closed={closed} />
      <Label x={cx - 24} y={236} anchor="end" size={22} weight={700}>S</Label>
      {diode !== "none" ? (
        <g>
          <Wire points={[[cx, 70], [dx, 70], [dx, 100]]} />
          <Wire points={[[dx, 160], [dx, 181], [cx, 181]]} />
          <Diode x={dx} y={130} angle={diode === "ok" ? -90 : 90} />
          <Label x={dx + 24} y={130} anchor="start" size={22} weight={700}>D</Label>
          <Node x={cx} y={70} />
          <Node x={cx} y={181} />
        </g>
      ) : null}
      {diode === "ok" ? <Arrow from={[dx - 30, 158]} to={[dx - 30, 102]} /> : null}
      {diode === "none" && !closed ? (
        <g>
          <path d={`M ${cx + 20} 222 l 10 6 l -6 4 l 12 8`} fill="none" stroke="var(--fig-danger)" strokeWidth={3} strokeLinejoin="round" />
          <Label x={cx + 16} y={284} anchor="start" size={20} color="var(--fig-danger)" weight={600}>ประกายไฟ ✗</Label>
        </g>
      ) : null}
    </g>
  );
}

function F09() {
  return (
    <svg viewBox="0 0 600 320" aria-hidden="true">
      <CoilCircuit ox={0} diode="none" closed={false} title="ก. ไม่มีไดโอด" />
      <line x1={300} y1={10} x2={300} y2={310} stroke={GRID} strokeWidth={2} />
      <CoilCircuit ox={300} diode="ok" closed={false} title="ข. มีไดโอดฟลายแบ็ก" />
    </svg>
  );
}

function F12() {
  return (
    <svg viewBox="0 0 600 320" aria-hidden="true">
      <CoilCircuit ox={130} diode="wrong" closed title="วงจรขับรีเลย์ 12 V ที่นักเรียนต่อ" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 Switch-voltage waveforms (not to scale)
// ---------------------------------------------------------------------------
function Wave({ y0, clamp, title }: { y0: number; clamp: boolean; title: string }) {
  const ox = 70;
  const oy = y0 + 170;
  const y12 = oy - 60;
  const tOpen = 220;
  const d = clamp
    ? `M ${ox} ${oy} L ${tOpen} ${oy} L ${tOpen} ${y12 - 9} L ${tOpen + 150} ${y12 - 9} L ${tOpen + 156} ${y12} L 560 ${y12}`
    : `M ${ox} ${oy} L ${tOpen} ${oy} L ${tOpen + 3} ${y0 + 44} L ${tOpen + 14} ${y12 - 10} L ${tOpen + 30} ${y12 + 6} L ${tOpen + 46} ${y12 - 3} L ${tOpen + 62} ${y12} L 560 ${y12}`;
  return (
    <g>
      <Label x={16} y={y0 + 22} anchor="start" weight={600} size={21}>{title}</Label>
      <line x1={ox} y1={oy} x2={572} y2={oy} stroke={INK} strokeWidth={2.5} />
      <line x1={ox} y1={oy} x2={ox} y2={y0 + 40} stroke={INK} strokeWidth={2.5} />
      {arrowHead(580, oy, 0, 12)}
      {arrowHead(ox, y0 + 34, -90, 12)}
      <SubText x={ox - 10} y={y0 + 52} anchor="end" size={20} weight={500} main="v" sub="S" />
      <Label x={576} y={oy + 22} anchor="end" size={20}>t</Label>
      <line x1={ox} y1={y12} x2={560} y2={y12} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 5" />
      <Label x={ox - 10} y={y12} anchor="end" size={20}>12 V</Label>
      <path d={d} fill="none" stroke={clamp ? "var(--fig-ok)" : "var(--fig-danger)"} strokeWidth={4} strokeLinejoin="round" />
      <line x1={tOpen} y1={oy + 6} x2={tOpen} y2={oy + 14} stroke={INK} strokeWidth={2} />
      <Label x={tOpen} y={oy + 26} size={20}>เปิด S</Label>
      {clamp ? (
        <Label x={tOpen + 70} y={y12 - 34} size={20} color="var(--fig-ok)" weight={700}>≈ 12.7 V (12 V + 0.7 V) ✓</Label>
      ) : (
        <Label x={tOpen + 24} y={y0 + 52} anchor="start" size={20} color="var(--fig-danger)" weight={700}>ยอดพุ่งหลายร้อยโวลต์ ✗</Label>
      )}
    </g>
  );
}

function F13() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <Wave y0={0} clamp={false} title="ก. ไม่มีไดโอด (แรงดันคร่อมสวิตช์)" />
      <line x1={8} y1={209} x2={592} y2={209} stroke={GRID} strokeWidth={2} />
      <Wave y0={210} clamp title="ข. มีไดโอดฟลายแบ็ก" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 Three-step inspection
// ---------------------------------------------------------------------------
function SmallCoil({ x, y, core = false }: { x: number; y: number; core?: boolean }) {
  return (
    <g>
      {core ? <rect x={x - 40} y={y - 34} width={80} height={14} fill={MUTED} stroke={INK} strokeWidth={2} /> : null}
      <path d={coilPath(x, y, 64, 4, 14)} fill="none" stroke={COPPER} strokeWidth={3.5} />
    </g>
  );
}

function InspectRow({ y0, n, lines, meter, core }: { y0: number; n: string; lines: [string, string, string]; meter: "Ω" | "LCR" | "MΩ"; core?: boolean }) {
  const my = y0 + 66;
  return (
    <g>
      {meter === "LCR" ? (
        <g>
          <rect x={46} y={my - 26} width={72} height={52} rx={6} fill={PANEL} stroke={INK} strokeWidth={3} />
          <Label x={82} y={my + 1} size={20} weight={700}>LCR</Label>
        </g>
      ) : meter === "Ω" ? (
        <Meter x={82} y={my} kind="Ω" />
      ) : (
        <g>
          <circle cx={82} cy={my} r={26} fill={PANEL} stroke={INK} strokeWidth={3} />
          <Label x={82} y={my + 1} size={20} weight={700}>MΩ</Label>
        </g>
      )}
      <SmallCoil x={196} y={my + 10} core={core} />
      {/* probe leads */}
      <Wire points={[[82, my + 26], [82, my + 46], [150, my + 46], [150, my + 10]]} width={2.5} color="var(--fig-danger)" />
      {core ? (
        <Wire points={[[100, my - 18], [100, my - 40], [196, my - 40], [196, my - 24]]} width={2.5} />
      ) : (
        <Wire points={[[104, my + 14], [104, my + 56], [242, my + 56], [242, my + 10]]} width={2.5} />
      )}
      <Label x={272} y={y0 + 30} anchor="start" weight={700} size={21}>{`${n} ${lines[0]}`}</Label>
      <Label x={272} y={y0 + 64} anchor="start" size={20}>{lines[1]}</Label>
      <Label x={272} y={y0 + 96} anchor="start" size={20} muted>{lines[2]}</Label>
    </g>
  );
}

function F10() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <InspectRow y0={0} n="①" meter="Ω" lines={["วัด DCR ด้วยย่าน Ω", "ค่าต่ำใกล้ datasheet = ขดต่อเนื่อง", "อ่านได้ OL (∞) = ขดลวดขาด"]} />
      <line x1={8} y1={139} x2={592} y2={139} stroke={GRID} strokeWidth={2} />
      <InspectRow y0={140} n="②" meter="LCR" lines={["วัด L ด้วย LCR meter", "เทียบค่าระบุ ± tolerance", "L ต่ำผิดปกติ = รอบลัดวงจร"]} />
      <line x1={8} y1={279} x2={592} y2={279} stroke={GRID} strokeWidth={2} />
      <InspectRow y0={280} n="③" meter="MΩ" core lines={["ตรวจรั่วลงแกน/โครง", "วัดระหว่างขดลวดกับแกนโลหะ", "ต้องได้ OL หรือสูงมาก (MΩ)"]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 Student test record (find the wrong conclusion)
// ---------------------------------------------------------------------------
function F11() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* radial drum inductor */}
      <rect x={90} y={44} width={84} height={70} rx={10} fill={MUTED} stroke={INK} strokeWidth={2.5} />
      <Label x={132} y={80} size={28} weight={700} color={BG}>101</Label>
      <line x1={112} y1={114} x2={112} y2={150} stroke={INK} strokeWidth={3} />
      <line x1={152} y1={114} x2={152} y2={150} stroke={INK} strokeWidth={3} />
      {/* DMM */}
      <rect x={350} y={20} width={180} height={150} rx={14} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={366} y={34} width={148} height={50} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={440} y={60} size={28} weight={700}>0.4 Ω</Label>
      <circle cx={440} cy={128} r={26} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={440} y1={128} x2={458} y2={110} stroke={INK} strokeWidth={3} />
      <Label x={500} y={128} anchor="start" size={20}>Ω</Label>
      {/* leads */}
      <Wire points={[[112, 150], [112, 176], [400, 176], [400, 170]]} width={2.5} color="var(--fig-danger)" />
      <Wire points={[[152, 150], [152, 166], [480, 166], [480, 170]]} width={2.5} />
      {/* record card */}
      <rect x={16} y={196} width={568} height={212} rx={10} fill={PANEL} stroke={INK} strokeWidth={2} />
      <Label x={32} y={226} anchor="start" size={21}>ชิ้นงาน: รหัส 101 (100 µH)</Label>
      <Label x={32} y={272} anchor="start" size={21}>สภาพ: ถอดออกจากวงจร ไม่มีไฟ</Label>
      <Label x={32} y={318} anchor="start" size={21}>ย่าน 200 Ω · อ่านได้ 0.4 Ω</Label>
      <Label x={32} y={366} anchor="start" size={21} weight={700}>สรุป: ใกล้ 0 Ω แสดงว่าลัดวงจร ใช้ไม่ได้</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W09-F01": F01,
  "W09-F02": F02,
  "W09-F03": F03,
  "W09-F04": F04,
  "W09-F05": F05,
  "W09-F06": F06,
  "W09-F07": F07,
  "W09-F08": F08,
  "W09-F09": F09,
  "W09-F10": F10,
  "W09-F11": F11,
  "W09-F12": F12,
  "W09-F13": F13,
};
export default figures;
