import type { ReactNode } from "react";
import type { FigureMap } from "@/content/types";
import { Label, Wire, Resistor, Battery, Meter, Node, Lamp, Arrow, Callout } from "./kit";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const PLUS = "var(--fig-plus)";
const OK = "var(--fig-ok)";
const DANGER = "var(--fig-danger)";
const ACCENT = "var(--fig-accent)";
const WIRE_L = "var(--fig-wire-l)";

type Pt = [number, number];

/** Polar point: deg measured from vertical (0 = up), clockwise positive. */
function pol(cx: number, cy: number, r: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = pol(cx, cy, r, a0);
  const [x1, y1] = pol(cx, cy, r, a1);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** DC symbol ⎓ (solid line over dashed line). */
function DCSym({ x, y, w = 26, color = INK }: { x: number; y: number; w?: number; color?: string }) {
  const s = w / 3;
  return (
    <g stroke={color} strokeWidth={2.5}>
      <line x1={x - w / 2} y1={y - 4} x2={x + w / 2} y2={y - 4} />
      {[0, 1, 2].map((i) => (
        <line key={i} x1={x - w / 2 + i * s + 1} y1={y + 4} x2={x - w / 2 + i * s + s - 3} y2={y + 4} />
      ))}
    </g>
  );
}

function CircNum({ x, y, n, r = 16, size = 22 }: { x: number; y: number; n: number; r?: number; size?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={x} y={y + 1} size={size} weight={700}>
        {n}
      </Label>
    </g>
  );
}

function Jack({ x, y, red = false, r = 13 }: { x: number; y: number; red?: boolean; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={BG} stroke={red ? PLUS : INK} strokeWidth={4} />
      <circle cx={x} cy={y} r={r / 2.6} fill={INK} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Analog scale face (F03 full face; F04–F06 reading drills)
//   Ω scale: centre value 20 (illustrative, typical pocket meter), f = 20/(20+R)
//   V·A rows: linear, share one tick arc (50 divisions)
//   AC10V: illustrative non-linear (compressed at the low end)
// ---------------------------------------------------------------------------
const SA = 50; // half sweep angle (deg)
const RC = 20; // ohm-scale centre value
const CX = 450;
const CY = 600;
const fOhm = (R: number) => (R === Infinity ? 0 : RC / (RC + R));
const fAc = (v: number) => Math.pow(v / 10, 1.12);
const angOf = (f: number) => -SA + 2 * SA * f;

const R_OHM = 470;
const R_MIRROR = 452;
const R_VA = 425;
const ROWS: { r: number; max: number; step: number }[] = [
  { r: 400, max: 250, step: 50 }, // ② B-250
  { r: 365, max: 50, step: 10 }, // ③ B-50
  { r: 330, max: 10, step: 2 }, // ④ B-10
];
const R_AC = 290;

function ScaleFace({ needle, full = false, tag }: { needle?: number; full?: boolean; tag?: string }) {
  const H = full ? 712 : 616;
  const ohmLabels: [number, string][] = [
    [Infinity, "∞"], [200, "200"], [100, "100"], [50, "50"], [30, "30"], [20, "20"], [10, "10"], [5, "5"], [2, "2"], [1, "1"], [0, "0"],
  ];
  const ohmMinor = [2000, 1000, 500, 300, 150, 70, 40, 25, 15, 8, 6, 4, 3, 1.5, 0.5];
  const specials = [226, 200, 174, 148, 122]; // ⑥–⑩
  const circ = (r: number, a: number, n: number) => {
    const [x, y] = pol(CX, CY, r, a);
    return <CircNum key={n} x={x} y={y} n={n} r={17} size={26} />;
  };
  return (
    <svg viewBox={`0 0 900 ${H}`} aria-hidden="true">
      <rect x={6} y={6} width={888} height={H - 12} rx={18} fill={BG} stroke={INK} strokeWidth={2} />
      {tag ? (
        <Label x={36} y={44} size={28} anchor="start" weight={700}>
          {tag}
        </Label>
      ) : null}
      {/* ① ohm scale (reads right → left) */}
      <path d={arc(CX, CY, R_OHM, -SA, SA)} fill="none" stroke={INK} strokeWidth={3} />
      {ohmMinor.map((R) => {
        const a = angOf(fOhm(R));
        const [x0, y0] = pol(CX, CY, R_OHM, a);
        const [x1, y1] = pol(CX, CY, R_OHM + 10, a);
        return <line key={R} x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={1.5} />;
      })}
      {ohmLabels.map(([R, t]) => {
        const a = angOf(fOhm(R));
        const [x0, y0] = pol(CX, CY, R_OHM, a);
        const [x1, y1] = pol(CX, CY, R_OHM + 16, a);
        const [lx, ly] = pol(CX, CY, R_OHM + 34, a);
        return (
          <g key={t}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={2.5} />
            <Label x={lx} y={ly} size={26} weight={600}>
              {t}
            </Label>
          </g>
        );
      })}
      <Label x={pol(CX, CY, R_OHM, SA + 7)[0]} y={pol(CX, CY, R_OHM, SA + 7)[1]} size={30} weight={700}>
        Ω
      </Label>
      {/* mirror band (anti-parallax) */}
      <path d={arc(CX, CY, R_MIRROR, -SA + 1, SA - 1)} fill="none" stroke={MUTED} strokeWidth={12} opacity={0.3} />
      {/* ②③④ shared V·A tick arc */}
      <path d={arc(CX, CY, R_VA, -SA, SA)} fill="none" stroke={INK} strokeWidth={3} />
      {Array.from({ length: 51 }, (_, i) => {
        const a = angOf(i / 50);
        const len = i % 10 === 0 ? 16 : i % 2 === 0 ? 10 : 6;
        const [x0, y0] = pol(CX, CY, R_VA, a);
        const [x1, y1] = pol(CX, CY, R_VA + len, a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={i % 10 === 0 ? 2.5 : 1.5} />;
      })}
      {ROWS.map((row) => (
        <g key={row.max}>
          {Array.from({ length: row.max / row.step + 1 }, (_, i) => {
            const v = i * row.step;
            const [lx, ly] = pol(CX, CY, row.r, angOf(v / row.max));
            return (
              <Label key={v} x={lx} y={ly} size={26}>
                {v}
              </Label>
            );
          })}
        </g>
      ))}
      {/* ⑤ AC 10 V only */}
      <path d={arc(CX, CY, R_AC, -SA, SA)} fill="none" stroke={DANGER} strokeWidth={3} />
      {[0, 2, 4, 6, 8, 10].map((v) => {
        const a = angOf(fAc(v));
        const [x0, y0] = pol(CX, CY, R_AC, a);
        const [x1, y1] = pol(CX, CY, R_AC - 14, a);
        const [lx, ly] = pol(CX, CY, R_AC - 32, a);
        return (
          <g key={v}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={DANGER} strokeWidth={2.5} />
            <Label x={lx} y={ly} size={26} color={DANGER}>
              {v}
            </Label>
          </g>
        );
      })}
      {[1, 3, 5, 7, 9].map((v) => {
        const a = angOf(fAc(v));
        const [x0, y0] = pol(CX, CY, R_AC, a);
        const [x1, y1] = pol(CX, CY, R_AC - 8, a);
        return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke={DANGER} strokeWidth={1.5} />;
      })}
      <Label x={pol(CX, CY, R_AC, SA + 9)[0] - 4} y={pol(CX, CY, R_AC, SA + 9)[1]} size={26} anchor="start" color={DANGER} weight={700}>
        AC10V
      </Label>
      {/* ⑥–⑩ special-function scales (full face only) */}
      {full
        ? specials.map((r) => (
            <path key={r} d={arc(CX, CY, r, -SA + 4, SA - 4)} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="10 6" />
          ))
        : null}
      {full ? (
        <g>
          {circ(R_OHM, -SA - 7, 1)}
          {circ(ROWS[0].r, -SA - 7, 2)}
          {circ(ROWS[1].r, SA + 7, 3)}
          {circ(ROWS[2].r, -SA - 7, 4)}
          {circ(R_AC, -SA - 7, 5)}
          {circ(specials[0], -SA - 3, 6)}
          {circ(specials[1], SA + 3, 7)}
          {circ(specials[2], -SA - 3, 8)}
          {circ(specials[3], SA + 3, 9)}
          {circ(specials[4], -SA - 3, 10)}
        </g>
      ) : null}
      {/* needle (drawn under the pivot cover) */}
      {needle !== undefined ? (
        <line
          x1={CX}
          y1={CY}
          x2={pol(CX, CY, R_OHM + 14, angOf(needle))[0]}
          y2={pol(CX, CY, R_OHM + 14, angOf(needle))[1]}
          stroke={DANGER}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      ) : null}
      <path d={`M ${CX - 72} ${CY} A 72 72 0 0 1 ${CX + 72} ${CY} Z`} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      {full ? (
        <g>
          <line x1={20} y1={CY + 12} x2={880} y2={CY + 12} stroke={MUTED} strokeWidth={1.5} />
          <Label x={450} y={CY + 44} size={26}>
            ① Ω · ② B-250 · ③ B-50 · ④ B-10 · ⑤ AC10V
          </Label>
          <Label x={450} y={CY + 82} size={26} muted>
            ⑥ C(µF) · ⑦ LI · ⑧ LV · ⑨ hFE · ⑩ dB (ฟังก์ชันเฉพาะรุ่น)
          </Label>
        </g>
      ) : null}
    </svg>
  );
}

function ScaleFull() {
  return <ScaleFace full />;
}
/** Needle A: 0.72 of full scale → B-250 = 180, B-50 = 36, B-10 = 7.2 */
function DrillA() {
  return <ScaleFace needle={0.72} tag="เข็ม A" />;
}
/** Needle B: 0.48 of full scale → B-250 = 120, B-50 = 24, B-10 = 4.8 */
function DrillB() {
  return <ScaleFace needle={0.48} tag="เข็ม B" />;
}
/** Needle C: on "20" of the Ω scale (centre of scale) */
function DrillC() {
  return <ScaleFace needle={fOhm(20)} tag="เข็ม C" />;
}

// ---------------------------------------------------------------------------
// F01 Analog multimeter (hotspot)
// ---------------------------------------------------------------------------
function AnalogMeter() {
  const cx = 300;
  const cy = 262;
  const sel: Pt = [320, 400];
  const selLabels: [number, string][] = [
    [0, "OFF"], [-55, "DCV"], [55, "ACV"], [-130, "DCmA"], [130, "Ω"],
  ];
  return (
    <svg viewBox="0 0 600 600" aria-hidden="true">
      <rect x={110} y={14} width={380} height={572} rx={30} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* dial window */}
      <rect x={138} y={40} width={324} height={210} rx={10} fill={BG} stroke={INK} strokeWidth={2.5} />
      <path d={arc(cx, cy, 185, -40, 40)} fill="none" stroke={INK} strokeWidth={2.5} />
      <path d={arc(cx, cy, 170, -40, 40)} fill="none" stroke={MUTED} strokeWidth={7} opacity={0.35} />
      <path d={arc(cx, cy, 152, -40, 40)} fill="none" stroke={INK} strokeWidth={2.5} />
      <path d={arc(cx, cy, 122, -40, 40)} fill="none" stroke={DANGER} strokeWidth={2} />
      {Array.from({ length: 11 }, (_, i) => {
        const a = -40 + i * 8;
        const [x0, y0] = pol(cx, cy, 152, a);
        const [x1, y1] = pol(cx, cy, 162, a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={1.5} />;
      })}
      <Label x={168} y={130} size={20} weight={700}>Ω</Label>
      <Label x={432} y={130} size={20} weight={700}>Ω</Label>
      <Label x={190} y={178} size={20} weight={700}>V·A</Label>
      <line x1={cx} y1={cy} x2={pol(cx, cy, 195, -22)[0]} y2={pol(cx, cy, 195, -22)[1]} stroke={DANGER} strokeWidth={2.5} />
      {/* pivot cover + mechanical zero screw (drawn over the needle base) */}
      <path d="M 252 250 A 48 48 0 0 1 348 250 Z" fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={139} y={250} width={322} height={14} fill={PANEL} />
      <circle cx={300} cy={236} r={11} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={293} y1={243} x2={307} y2={229} stroke={INK} strokeWidth={2.5} />
      {/* 0 Ω ADJ */}
      <circle cx={162} cy={300} r={24} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={162} y1={300} x2={162} y2={280} stroke={INK} strokeWidth={3} />
      <Label x={162} y={342} size={20} weight={600}>0Ω ADJ</Label>
      {/* range selector */}
      <circle cx={sel[0]} cy={sel[1]} r={64} fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={sel[0] - 9} y={sel[1] - 58} width={18} height={116} rx={8} fill={INK} transform={`rotate(-55 ${sel[0]} ${sel[1]})`} />
      <circle cx={pol(sel[0], sel[1], 46, -55)[0]} cy={pol(sel[0], sel[1], 46, -55)[1]} r={5} fill={BG} />
      {selLabels.map(([a, t]) => {
        const [x, y] = pol(sel[0], sel[1], 96, a);
        return <Label key={t} x={x} y={y} size={20} weight={700}>{t}</Label>;
      })}
      {/* jacks */}
      <Jack x={200} y={548} red />
      <Jack x={400} y={548} />
      <Label x={176} y={548} size={24} anchor="end" weight={700} color={PLUS}>+</Label>
      <Label x={424} y={548} size={20} anchor="start" weight={700}>−COM</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 Digital multimeter (hotspot)
// ---------------------------------------------------------------------------
function DigitalMeter() {
  const c: Pt = [300, 330];
  const diode = (
    <g stroke={INK} strokeWidth={2.5} fill={INK}>
      <line x1={-20} y1={0} x2={-8} y2={0} />
      <path d="M -8 -9 L -8 9 L 6 0 Z" />
      <line x1={6} y1={-9} x2={6} y2={9} />
      <line x1={6} y1={0} x2={18} y2={0} />
    </g>
  );
  const cap = (
    <g stroke={INK} strokeWidth={2.5}>
      <line x1={-18} y1={0} x2={-4} y2={0} />
      <line x1={-4} y1={-10} x2={-4} y2={10} />
      <line x1={4} y1={-10} x2={4} y2={10} />
      <line x1={4} y1={0} x2={18} y2={0} />
    </g>
  );
  const pos: { a: number; node: ReactNode }[] = [
    { a: 0, node: <Label x={0} y={0} size={20} weight={700}>OFF</Label> },
    { a: 36, node: <Label x={0} y={0} size={22} weight={700}>V~</Label> },
    {
      a: 72,
      node: (
        <g>
          <Label x={-8} y={0} size={22} weight={700}>V</Label>
          <DCSym x={16} y={0} w={18} />
        </g>
      ),
    },
    {
      a: 108,
      node: (
        <g>
          <Label x={-10} y={0} size={20} weight={700}>mV</Label>
          <DCSym x={22} y={0} w={14} />
        </g>
      ),
    },
    { a: 144, node: <Label x={0} y={0} size={20} weight={700}>Ω •)))</Label> },
    { a: 180, node: diode },
    { a: 216, node: cap },
    { a: 252, node: <Label x={0} y={0} size={20} weight={700}>Hz</Label> },
    { a: 288, node: <Label x={0} y={0} size={20} weight={700}>mA</Label> },
    { a: 324, node: <Label x={0} y={0} size={22} weight={700}>A</Label> },
  ];
  const jacks: { x: number; t: string; red: boolean }[] = [
    { x: 168, t: "10A", red: true },
    { x: 256, t: "mA", red: true },
    { x: 344, t: "COM", red: false },
    { x: 432, t: "VΩ", red: true },
  ];
  return (
    <svg viewBox="0 0 600 600" aria-hidden="true">
      <rect x={118} y={14} width={364} height={572} rx={30} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* display */}
      <rect x={148} y={38} width={304} height={104} rx={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <text x={392} y={98} fontSize={64} fontWeight={700} textAnchor="end" dominantBaseline="middle" fill={INK}>
        9.37
      </text>
      <Label x={422} y={84} size={24} weight={700}>V</Label>
      <DCSym x={422} y={110} w={22} />
      <Label x={190} y={58} size={20} muted weight={700}>AUTO</Label>
      {/* buttons */}
      <rect x={160} y={158} width={120} height={40} rx={10} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={220} y={179} size={20} weight={700}>RANGE</Label>
      <rect x={320} y={158} width={120} height={40} rx={10} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={380} y={179} size={20} weight={700}>HOLD</Label>
      {/* dial: pointer on V⎓ */}
      <circle cx={c[0]} cy={c[1]} r={64} fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={c[0] - 9} y={c[1] - 58} width={18} height={116} rx={8} fill={INK} transform={`rotate(72 ${c[0]} ${c[1]})`} />
      <circle cx={pol(c[0], c[1], 46, 72)[0]} cy={pol(c[0], c[1], 46, 72)[1]} r={5} fill={BG} />
      {pos.map(({ a, node }) => {
        const [x, y] = pol(c[0], c[1], 102, a);
        return (
          <g key={a} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            {node}
          </g>
        );
      })}
      {/* CAT marking */}
      <rect x={196} y={460} width={208} height={34} rx={6} fill={BG} stroke={DANGER} strokeWidth={2} />
      <Label x={300} y={478} size={20} weight={700} color={DANGER}>CAT III 600 V</Label>
      {/* jacks */}
      {jacks.map((j) => (
        <g key={j.t}>
          <Label x={j.x} y={520} size={20} weight={700} color={j.red ? PLUS : INK}>{j.t}</Label>
          <Jack x={j.x} y={555} red={j.red} />
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 Three ways to connect a DMM (wide)
// ---------------------------------------------------------------------------
function ConnectPanels() {
  const P = (ox: number, title: string, body: ReactNode, read: string) => (
    <g>
      <rect x={ox + 8} y={8} width={284} height={404} rx={14} fill="none" stroke={MUTED} strokeWidth={1.5} />
      <Label x={ox + 150} y={44} size={28} weight={700}>{title}</Label>
      {body}
      <rect x={ox + 46} y={346} width={208} height={48} rx={8} fill={PANEL} stroke={INK} strokeWidth={2} />
      <Label x={ox + 150} y={371} size={28} weight={700}>{read}</Label>
    </g>
  );
  const vPanel = (
    <g>
      <Battery x={60} y={200} angle={90} />
      <Wire points={[[60, 170], [60, 100], [170, 100], [170, 160]]} />
      <Resistor x={170} y={200} angle={90} />
      <Wire points={[[170, 240], [170, 300], [60, 300], [60, 230]]} />
      <Wire points={[[170, 120], [250, 120], [250, 172]]} color={PLUS} />
      <Wire points={[[170, 280], [250, 280], [250, 228]]} />
      <Node x={170} y={120} />
      <Node x={170} y={280} />
      <Meter x={250} y={200} kind="V" angle={90} />
      <Label x={96} y={200} size={26} anchor="start">9 V</Label>
      <Label x={128} y={252} size={26} anchor="end" muted>1 kΩ</Label>
    </g>
  );
  const iPanel = (
    <g>
      <Battery x={360} y={200} angle={90} />
      <Wire points={[[360, 170], [360, 100], [422, 100]]} color={PLUS} />
      <Meter x={450} y={100} kind="A" />
      <Wire points={[[478, 100], [540, 100], [540, 160]]} />
      <Resistor x={540} y={200} angle={90} />
      <Wire points={[[540, 240], [540, 300], [360, 300], [360, 230]]} />
      <Label x={396} y={200} size={26} anchor="start">9 V</Label>
      <Label x={500} y={252} size={26} anchor="end" muted>1 kΩ</Label>
    </g>
  );
  const rPanel = (
    <g>
      <Resistor x={700} y={200} angle={90} />
      <Wire points={[[700, 160], [700, 120], [800, 120], [800, 172]]} color={PLUS} />
      <Wire points={[[700, 240], [700, 280], [800, 280], [800, 228]]} />
      <Meter x={800} y={200} kind="Ω" angle={90} />
      <Label x={660} y={200} size={26} anchor="end" muted>1 kΩ</Label>
      <Label x={750} y={318} size={26} muted>ไม่มีแหล่งจ่าย</Label>
    </g>
  );
  return (
    <svg viewBox="0 0 900 420" aria-hidden="true">
      {P(0, "วัด V: ต่อขนาน", vPanel, "9.00 V")}
      {P(300, "วัด I: ต่ออนุกรม", iPanel, "9.00 mA")}
      {P(600, "วัด R: ปลดไฟก่อน", rPanel, "1.000 kΩ")}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 Ohmmeter internal circuit of an analog meter
// ---------------------------------------------------------------------------
function OhmmeterInside() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <rect x={20} y={20} width={420} height={330} rx={16} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="10 6" />
      <Label x={40} y={46} size={20} muted anchor="start">ภายในมิเตอร์ (ย่าน Ω)</Label>
      {/* top path: + jack ← fuse ← PMMC */}
      <Wire points={[[80, 110], [150, 110]]} />
      <circle cx={180} cy={110} r={30} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={180} y={111} size={22} weight={700}>µA</Label>
      <Wire points={[[210, 110], [262, 110]]} />
      <rect x={262} y={98} width={56} height={24} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={262} y1={110} x2={318} y2={110} stroke={INK} strokeWidth={2} />
      <Label x={290} y={80} size={20}>ฟิวส์</Label>
      <Wire points={[[318, 110], [487, 110]]} />
      {/* left vertical: 0 Ω ADJ */}
      <Wire points={[[80, 110], [80, 150]]} />
      <Resistor x={80} y={190} angle={90} variable />
      <Label x={118} y={190} size={20} anchor="start">0Ω ADJ</Label>
      <Wire points={[[80, 230], [80, 290], [180, 290]]} />
      {/* battery: + toward COM */}
      <Battery x={210} y={290} angle={180} />
      <Label x={210} y={330} size={20}>1.5 V (×1–×1k) / 9 V (×10k)</Label>
      <Wire points={[[240, 290], [487, 290]]} />
      {/* jacks */}
      <Jack x={500} y={110} red />
      <Jack x={500} y={290} />
      <Label x={530} y={78} size={20} weight={700} color={PLUS}>+ (แดง)</Label>
      <Label x={530} y={258} size={20} weight={700}>COM (ดำ)</Label>
      {/* Rx */}
      <Wire points={[[513, 110], [560, 110], [560, 160]]} color={PLUS} />
      <Wire points={[[513, 290], [560, 290], [560, 240]]} />
      <Resistor x={560} y={200} angle={90} />
      <Label x={560} y={392} size={22} weight={700}>Rx</Label>
      <Arrow from={[560, 372]} to={[560, 300]} color={MUTED} width={1.5} head={9} />
      <Label x={230} y={392} size={20} color={DANGER} weight={700}>ขั้ว + ของถ่านต่อกับช่อง COM</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 Measurement categories (wide)
// ---------------------------------------------------------------------------
function CatZones() {
  const zones: { x: number; w: number; t: string; s1: string; s2: string; dash?: string }[] = [
    { x: 10, w: 230, t: "CAT IV", s1: "ต้นทางระบบ", s2: "มิเตอร์การไฟฟ้า" },
    { x: 240, w: 230, t: "CAT III", s1: "ตู้ไฟ บัสบาร์", s2: "มอเตอร์ติดตั้ง", dash: "12 6" },
    { x: 470, w: 230, t: "CAT II", s1: "เต้ารับ", s2: "โหลดเสียบปลั๊ก", dash: "4 6" },
    { x: 700, w: 190, t: "O (CAT I)", s1: "ไม่ต่อเมน", s2: "บอร์ด, ถ่าน" },
  ];
  return (
    <svg viewBox="0 0 900 480" aria-hidden="true">
      {zones.map((z) => (
        <g key={z.t}>
          <rect x={z.x} y={10} width={z.w - 6} height={370} rx={12} fill={PANEL} stroke={INK} strokeWidth={2} strokeDasharray={z.dash} />
          <Label x={z.x + z.w / 2 - 3} y={46} size={30} weight={700}>{z.t}</Label>
          <Label x={z.x + z.w / 2 - 3} y={300} size={26}>{z.s1}</Label>
          <Label x={z.x + z.w / 2 - 3} y={338} size={26}>{z.s2}</Label>
        </g>
      ))}
      {/* pole + service line */}
      <rect x={34} y={90} width={14} height={170} fill={MUTED} />
      <line x1={18} y1={104} x2={66} y2={104} stroke={INK} strokeWidth={3} />
      <Wire points={[[41, 104], [41, 170], [100, 170]]} color={WIRE_L} width={4} />
      {/* kWh meter */}
      <rect x={100} y={128} width={96} height={84} rx={8} fill={BG} stroke={INK} strokeWidth={3} />
      <Label x={148} y={158} size={26} weight={700}>kWh</Label>
      <rect x={118} y={180} width={60} height={18} fill={PANEL} stroke={INK} strokeWidth={1.5} />
      <Wire points={[[196, 170], [262, 170]]} color={WIRE_L} width={4} />
      {/* consumer unit / distribution board */}
      <rect x={262} y={110} width={120} height={130} rx={6} fill={BG} stroke={INK} strokeWidth={3} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={274 + i * 26} y={140} width={20} height={56} rx={3} fill={PANEL} stroke={INK} strokeWidth={2} />
          <rect x={278 + i * 26} y={150} width={12} height={18} fill={INK} />
        </g>
      ))}
      {/* fixed motor */}
      <Wire points={[[382, 170], [406, 170]]} color={WIRE_L} width={4} />
      <circle cx={430} cy={170} r={24} fill={BG} stroke={INK} strokeWidth={3} />
      <Label x={430} y={171} size={26} weight={700}>M</Label>
      {/* branch circuit to outlet */}
      <Wire points={[[322, 240], [322, 262], [530, 262], [530, 200]]} color={WIRE_L} width={4} />
      <rect x={494} y={114} width={76} height={86} rx={12} fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={512} y={136} width={8} height={20} rx={2} fill={INK} />
      <rect x={544} y={136} width={8} height={20} rx={2} fill={INK} />
      <circle cx={532} cy={176} r={6} fill={INK} />
      {/* plug-in appliance */}
      <Wire points={[[570, 156], [610, 156]]} color={WIRE_L} width={4} />
      <Lamp x={640} y={156} on />
      {/* electronics board, battery powered */}
      <rect x={730} y={120} width={124} height={84} rx={6} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2.5} />
      <rect x={752} y={140} width={30} height={22} fill={INK} />
      <rect x={800} y={140} width={30} height={22} fill={INK} />
      <Battery x={792} y={236} />
      <Wire points={[[762, 236], [748, 236], [748, 204]]} />
      <Wire points={[[822, 236], [836, 236], [836, 204]]} />
      {/* transient energy arrow */}
      <Arrow from={[40, 418]} to={[860, 418]} color={DANGER} width={4} />
      <Label x={450} y={452} size={26} color={DANGER} weight={700}>พลังงานแรงดันกระชากที่อาจเกิด: สูง → ต่ำ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 Loading effect
// ---------------------------------------------------------------------------
function Loading() {
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      <Battery x={110} y={215} angle={90} />
      <Label x={72} y={215} size={22} anchor="end">10 V</Label>
      <Wire points={[[110, 185], [110, 50], [250, 50], [250, 90]]} />
      <Resistor x={250} y={130} angle={90} />
      <Label x={230} y={130} size={18} anchor="end">R₁ 100 kΩ</Label>
      <Wire points={[[250, 170], [250, 250]]} />
      <Node x={250} y={210} />
      <Label x={222} y={210} size={22} anchor="end" weight={700}>X</Label>
      <Resistor x={250} y={290} angle={90} />
      <Label x={230} y={290} size={18} anchor="end">R₂ 100 kΩ</Label>
      <Wire points={[[250, 330], [250, 380], [110, 380], [110, 245]]} />
      <Node x={250} y={380} />
      {/* meter input resistance */}
      <rect x={330} y={170} width={240} height={250} rx={14} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeDasharray="10 6" />
      <Label x={450} y={196} size={20} color={ACCENT} weight={700}>โวลต์มิเตอร์</Label>
      <Wire points={[[250, 210], [390, 210], [390, 250]]} color={PLUS} />
      <Resistor x={390} y={290} angle={90} />
      <Wire points={[[390, 330], [390, 380], [250, 380]]} />
      <Label x={420} y={262} size={22} anchor="start" weight={700}>Rin</Label>
      <Label x={420} y={292} size={20} anchor="start" muted>เข็ม: 200 kΩ</Label>
      <Label x={420} y={320} size={20} anchor="start" muted>DMM: 10 MΩ</Label>
      <Callout x={300} y={30} w={280} h={110} tone="warn">
        <Label x={440} y={60} size={20}>ไม่มีมิเตอร์: Vx = 5.00 V</Label>
        <Label x={440} y={88} size={20}>มิเตอร์เข็ม: 4.00 V</Label>
        <Label x={440} y={116} size={20}>DMM 10 MΩ: 4.98 V</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 DC bench power supply (hotspot)
// ---------------------------------------------------------------------------
function PowerSupply() {
  const knob = (x: number, y: number, r: number, t: string) => (
    <g>
      <circle cx={x} cy={y} r={r} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y} x2={x + r * 0.55} y2={y - r * 0.75} stroke={INK} strokeWidth={3} />
      <Label x={x} y={y + r + 20} size={20} weight={700}>{t}</Label>
    </g>
  );
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <rect x={14} y={14} width={572} height={412} rx={20} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* displays */}
      <rect x={40} y={40} width={240} height={80} rx={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <text x={230} y={82} fontSize={46} fontWeight={700} textAnchor="end" dominantBaseline="middle" fill={INK}>12.00</text>
      <Label x={256} y={82} size={24} weight={700}>V</Label>
      <rect x={320} y={40} width={240} height={80} rx={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <text x={510} y={82} fontSize={46} fontWeight={700} textAnchor="end" dominantBaseline="middle" fill={INK}>0.120</text>
      <Label x={536} y={82} size={24} weight={700}>A</Label>
      {/* CV / CC lamps */}
      <circle cx={70} cy={150} r={10} fill={OK} stroke={INK} strokeWidth={2} />
      <Label x={88} y={150} size={20} anchor="start" weight={700}>CV (ติด)</Label>
      <circle cx={350} cy={150} r={10} fill="none" stroke={INK} strokeWidth={2} />
      <Label x={368} y={150} size={20} anchor="start" weight={700}>CC (ดับ)</Label>
      {/* knobs */}
      {knob(100, 230, 34, "VOLTAGE")}
      <Label x={100} y={306} size={20} muted>COARSE</Label>
      {knob(220, 230, 24, "FINE")}
      {knob(380, 230, 34, "CURRENT")}
      {/* output button */}
      <rect x={462} y={202} width={104} height={50} rx={10} fill={BG} stroke={INK} strokeWidth={3} />
      <Label x={514} y={227} size={20} weight={700}>OUTPUT</Label>
      <Label x={514} y={274} size={20} muted>ON/OFF</Label>
      {/* power switch */}
      <rect x={36} y={352} width={104} height={46} rx={8} fill={BG} stroke={INK} strokeWidth={3} />
      <Label x={88} y={376} size={20} weight={700}>POWER</Label>
      {/* terminals */}
      <Jack x={330} y={375} red r={16} />
      <Jack x={420} y={375} r={16} />
      <circle cx={510} cy={375} r={16} fill={BG} stroke="var(--fig-wire-pe-g)" strokeWidth={4} />
      <circle cx={510} cy={375} r={6} fill={INK} />
      <Label x={330} y={336} size={24} weight={700} color={PLUS}>+</Label>
      <Label x={420} y={336} size={24} weight={700}>−</Label>
      <g stroke={INK} strokeWidth={2.5}>
        <line x1={510} y1={322} x2={510} y2={334} />
        <line x1={498} y1={334} x2={522} y2={334} />
        <line x1={502} y1={340} x2={518} y2={340} />
        <line x1={506} y1={346} x2={514} y2={346} />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 CV/CC operating graph (set 12 V, limit 0.5 A)
// ---------------------------------------------------------------------------
function CvCcGraph() {
  const x0 = 90;
  const y0 = 360;
  const sx = 800; // px per A
  const sy = 22; // px per V
  const X = (i: number) => x0 + i * sx;
  const Y = (v: number) => y0 - v * sy;
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      {[0, 2, 4, 6, 8, 10, 12, 14].map((v) => (
        <g key={v}>
          <line x1={x0} y1={Y(v)} x2={X(0.6)} y2={Y(v)} stroke="var(--fig-grid)" strokeWidth={1.5} />
          <Label x={x0 - 12} y={Y(v)} size={20} anchor="end" muted>{v}</Label>
        </g>
      ))}
      {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((i) => (
        <g key={i}>
          <line x1={X(i)} y1={y0} x2={X(i)} y2={Y(14)} stroke="var(--fig-grid)" strokeWidth={1.5} />
          <Label x={X(i)} y={y0 + 22} size={20} muted>{i}</Label>
        </g>
      ))}
      <line x1={x0} y1={y0} x2={X(0.6) + 10} y2={y0} stroke={INK} strokeWidth={2.5} />
      <line x1={x0} y1={y0} x2={x0} y2={Y(14) - 10} stroke={INK} strokeWidth={2.5} />
      <Label x={X(0.3)} y={y0 + 56} size={22}>กระแสโหลด I (A)</Label>
      <Label x={x0} y={Y(14) - 30} size={22}>V (V)</Label>
      {/* load lines */}
      <line x1={X(0)} y1={Y(0)} x2={X(0.14)} y2={Y(14)} stroke={MUTED} strokeWidth={2} strokeDasharray="8 6" />
      <Label x={X(0.14) + 8} y={Y(13.6)} size={20} anchor="start" muted>100 Ω</Label>
      <line x1={X(0)} y1={Y(0)} x2={X(0.5)} y2={Y(12)} stroke={ACCENT} strokeWidth={2} strokeDasharray="4 5" />
      <Label x={X(0.36)} y={Y(9.9)} size={20} color={ACCENT}>24 Ω</Label>
      <line x1={X(0)} y1={Y(0)} x2={X(0.6)} y2={Y(6)} stroke={MUTED} strokeWidth={2} strokeDasharray="8 6" />
      <Label x={X(0.58)} y={Y(7.1)} size={20} muted>10 Ω</Label>
      {/* CV and CC limits */}
      <line x1={X(0)} y1={Y(12)} x2={X(0.5)} y2={Y(12)} stroke={OK} strokeWidth={5} />
      <line x1={X(0.5)} y1={Y(12)} x2={X(0.5)} y2={Y(0)} stroke={DANGER} strokeWidth={5} strokeDasharray="14 6" />
      <Label x={X(0.34)} y={Y(12) - 20} size={22} color={OK} weight={700}>CV: คงที่ 12 V</Label>
      <Label x={X(0.5) + 10} y={Y(3)} size={20} color={DANGER} weight={700} anchor="start">CC</Label>
      <Label x={X(0.5) + 10} y={Y(2)} size={20} color={DANGER} anchor="start">0.5 A</Label>
      {/* operating points */}
      <circle cx={X(0.12)} cy={Y(12)} r={8} fill={OK} stroke={INK} strokeWidth={2} />
      <Label x={X(0.12) + 14} y={Y(10.9)} size={20} anchor="start">0.12 A</Label>
      <circle cx={X(0.5)} cy={Y(5)} r={8} fill={DANGER} stroke={INK} strokeWidth={2} />
      <Label x={X(0.5) - 14} y={Y(5)} size={20} anchor="end">5 V</Label>
      <circle cx={X(0.5)} cy={Y(12)} r={6} fill={BG} stroke={INK} strokeWidth={2.5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 Find the faulty measurement (6 panels)
// ---------------------------------------------------------------------------
type JackKey = "A" | "COM" | "VΩ";
function MiniDMM({ x, y, mode, red, aLabel = "A" }: { x: number; y: number; mode: ReactNode; red: JackKey; aLabel?: string }) {
  // body 140×136, jacks at x offsets 24 / 70 / 116, y offset 116
  const jx: Record<JackKey, number> = { A: 24, COM: 70, "VΩ": 116 };
  return (
    <g>
      <rect x={x} y={y} width={140} height={136} rx={12} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={x + 14} y={y + 10} width={112} height={38} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      <g transform={`translate(${x + 70} ${y + 29})`}>{mode}</g>
      <circle cx={x + 70} cy={y + 70} r={14} fill={BG} stroke={INK} strokeWidth={2.5} />
      {(["A", "COM", "VΩ"] as const).map((k) => (
        <g key={k}>
          <circle cx={x + jx[k]} cy={y + 116} r={8} fill={BG} stroke={k === "COM" ? INK : PLUS} strokeWidth={3} />
          <Label x={x + jx[k]} y={y + 96} size={20} weight={700}>{k === "A" ? aLabel : k}</Label>
        </g>
      ))}
      <circle cx={x + jx[red]} cy={y + 116} r={5} fill={PLUS} />
      <circle cx={x + jx.COM} cy={y + 116} r={5} fill={INK} />
    </g>
  );
}

function BattBox({ x, y }: { x: number; y: number }) {
  // 9 V battery block 60×84 drawn terminals-down: + left, − right (bottom edge)
  return (
    <g>
      <rect x={x} y={y} width={60} height={84} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      <rect x={x + 8} y={y + 84} width={14} height={8} fill={PLUS} />
      <rect x={x + 38} y={y + 84} width={14} height={8} fill={INK} />
      <Label x={x + 30} y={y + 32} size={20} weight={700}>9 V</Label>
      <Label x={x + 15} y={y + 66} size={20} weight={700} color={PLUS}>+</Label>
      <Label x={x + 45} y={y + 66} size={20} weight={700}>−</Label>
    </g>
  );
}

function FindFault() {
  const cells: Pt[] = [
    [0, 0], [300, 0],
    [0, 220], [300, 220],
    [0, 440], [300, 440],
  ];
  const frame = (i: number) => (
    <g key={`f${i}`}>
      <rect x={cells[i][0] + 6} y={cells[i][1] + 6} width={288} height={208} rx={12} fill="none" stroke={MUTED} strokeWidth={1.5} />
      <CircNum x={cells[i][0] + 28} y={cells[i][1] + 30} n={i + 1} r={15} size={20} />
    </g>
  );
  const vMode = (
    <g>
      <Label x={-8} y={0} size={22} weight={700}>V</Label>
      <DCSym x={16} y={0} w={16} />
    </g>
  );
  const ohm = <Label x={0} y={0} size={24} weight={700}>Ω</Label>;
  return (
    <svg viewBox="0 0 600 660" aria-hidden="true">
      {cells.map((_, i) => frame(i))}
      {/* 1: measuring voltage with the red lead still in the A jack */}
      <MiniDMM x={20} y={50} mode={vMode} red="A" />
      <BattBox x={204} y={58} />
      <Wire d="M 44 166 C 44 205, 219 205, 219 150" color={PLUS} width={3} />
      <Wire d="M 90 166 C 90 192, 249 192, 249 150" width={3} />
      {/* 2: resistance range on a live lamp circuit */}
      <MiniDMM x={320} y={50} mode={ohm} red="VΩ" />
      <Battery x={530} y={74} />
      <Wire points={[[500, 74], [482, 74], [482, 130], [500, 130]]} />
      <Wire points={[[560, 74], [578, 74], [578, 130], [560, 130]]} />
      <Lamp x={530} y={130} on />
      <Node x={482} y={130} />
      <Node x={578} y={130} />
      <Wire d="M 436 166 C 436 196, 482 190, 482 130" color={PLUS} width={2.5} />
      <Wire d="M 390 166 C 390 206, 578 206, 578 130" width={2.5} />
      {/* 3: fingers holding both probe tips on a 100 kΩ resistor */}
      <MiniDMM x={20} y={270} mode={ohm} red="VΩ" />
      <Resistor x={232} y={300} value="100 kΩ" />
      <Wire d="M 136 386 C 150 340, 170 300, 192 300" color={PLUS} width={3} />
      <Wire d="M 90 386 C 90 410, 272 410, 272 300" width={3} />
      <ellipse cx={192} cy={312} rx={18} ry={12} fill="var(--fig-skin)" stroke={INK} strokeWidth={2} />
      <ellipse cx={272} cy={312} rx={18} ry={12} fill="var(--fig-skin)" stroke={INK} strokeWidth={2} />
      {/* 4: cracked lead insulation */}
      <rect x={340} y={290} width={220} height={22} rx={11} fill={PLUS} />
      <rect x={440} y={290} width={34} height={22} fill="var(--fig-copper)" />
      <path d="M 440 290 l 6 8 l -4 6 l 6 8" fill="none" stroke={INK} strokeWidth={2} />
      <path d="M 474 290 l -5 8 l 4 6 l -5 8" fill="none" stroke={INK} strokeWidth={2} />
      <path d="M 560 301 L 590 301" stroke={INK} strokeWidth={3} />
      <Label x={450} y={350} size={20}>สายวัดสีแดง</Label>
      <Label x={450} y={380} size={20} muted>(ตรวจก่อนเริ่มงาน)</Label>
      {/* 5: voltage measured correctly (red in VΩ) */}
      <MiniDMM x={20} y={490} mode={vMode} red="VΩ" />
      <BattBox x={204} y={498} />
      <Wire d="M 136 606 C 136 630, 219 630, 219 590" color={PLUS} width={3} />
      <Wire d="M 90 606 C 90 648, 249 648, 249 590" width={3} />
      {/* 6: current measured in series (red in mA, + of battery → mA, COM → R → −) */}
      <MiniDMM x={320} y={490} mode={<Label x={0} y={0} size={22} weight={700}>mA</Label>} red="A" aLabel="mA" />
      <Battery x={520} y={514} />
      <Wire points={[[550, 514], [578, 514], [578, 540]]} />
      <Resistor x={578} y={580} angle={90} />
      <Wire points={[[578, 620], [578, 636], [500, 636]]} />
      <Wire points={[[490, 514], [470, 514], [470, 560]]} color={PLUS} />
      <Wire d="M 344 606 C 344 650, 470 640, 470 560" color={PLUS} width={2.5} />
      <Wire d="M 390 606 C 390 632, 460 640, 500 636" width={2.5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F14 Live–dead–live + lead inspection
// ---------------------------------------------------------------------------
function LiveDeadLive() {
  const box = (x: number, n: number, t1: string, t2: string, tone: string) => (
    <g>
      <rect x={x} y={30} width={170} height={150} rx={14} fill={PANEL} stroke={tone} strokeWidth={3} />
      <CircNum x={x + 85} y={62} n={n} />
      <Label x={x + 85} y={110} size={22} weight={700}>{t1}</Label>
      <Label x={x + 85} y={146} size={20}>{t2}</Label>
    </g>
  );
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      {box(14, 1, "LIVE", "ทดสอบแหล่งที่รู้ค่า", OK)}
      {box(215, 2, "DEAD", "วัดจุดงาน = 0 V", ACCENT)}
      {box(416, 3, "LIVE", "ทดสอบซ้ำอีกครั้ง", OK)}
      <Arrow from={[186, 105]} to={[213, 105]} color={INK} head={10} />
      <Arrow from={[387, 105]} to={[414, 105]} color={INK} head={10} />
      <Label x={300} y={212} size={20} muted>ถ้าข้อ ③ ไม่ผ่าน: ผลข้อ ② เชื่อไม่ได้ (มิเตอร์อาจเสีย)</Label>
      <rect x={14} y={240} width={572} height={176} rx={14} fill="none" stroke={INK} strokeWidth={2} />
      <Label x={34} y={268} size={22} anchor="start" weight={700}>ตรวจสายวัดก่อนใช้ทุกครั้ง</Label>
      {[
        "✓ ฉนวนไม่แตก ไม่บวม ไม่เห็นทองแดง",
        "✓ มีปลอกกันนิ้ว (finger guard) และปลายโลหะสั้น",
        "✓ พิกัด CAT ของสายวัด ≥ งาน (ใช้ค่าต่ำกว่าของเครื่องกับสาย)",
        "✓ ขั้วเสียบแน่น วัดความต่อเนื่องของสายได้ ≈ 0 Ω",
      ].map((t, i) => (
        <Label key={i} x={34} y={306 + i * 30} size={20} anchor="start">{t}</Label>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F15 Accuracy band of a DMM reading: ±(0.5 % + 2 counts)
// ---------------------------------------------------------------------------
function AccuracyBand() {
  const x0 = 60;
  const x1 = 540;
  const lo = 3.26;
  const hi = 3.34;
  const X = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <rect x={200} y={14} width={200} height={60} rx={8} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <text x={370} y={46} fontSize={36} fontWeight={700} textAnchor="end" dominantBaseline="middle" fill={INK}>3.300</text>
      <Label x={386} y={46} size={22} weight={700}>V</Label>
      <Label x={300} y={96} size={20} muted>ย่าน 4 V (ความละเอียด 0.001 V)</Label>
      <line x1={x0} y1={200} x2={x1} y2={200} stroke={INK} strokeWidth={2.5} />
      {[3.26, 3.28, 3.3, 3.32, 3.34].map((v) => (
        <g key={v}>
          <line x1={X(v)} y1={192} x2={X(v)} y2={208} stroke={INK} strokeWidth={2} />
          <Label x={X(v)} y={228} size={20} muted>{v.toFixed(2)}</Label>
        </g>
      ))}
      <rect x={X(3.2815)} y={140} width={X(3.3185) - X(3.2815)} height={30} fill="var(--fig-accent-soft)" stroke={ACCENT} strokeWidth={2.5} />
      <Label x={300} y={124} size={20} color={ACCENT} weight={700}>±0.0185 V → 3.282 … 3.318 V</Label>
      <line x1={X(3.3)} y1={136} x2={X(3.3)} y2={200} stroke={INK} strokeWidth={2} />
      <rect x={X(3.2635)} y={254} width={X(3.3365) - X(3.2635)} height={26} fill="none" stroke={DANGER} strokeWidth={2.5} strokeDasharray="8 5" />
      <Label x={300} y={304} size={20} color={DANGER} weight={700}>ย่าน 40 V แสดง 3.30 → ±0.0365 V</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F16 Checking the current-jack fuses of a DMM with the Ω range
// ---------------------------------------------------------------------------
function FuseCheck() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <rect x={30} y={20} width={250} height={380} rx={24} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={52} y={42} width={206} height={70} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      <text x={226} y={79} fontSize={40} fontWeight={700} textAnchor="end" dominantBaseline="middle" fill={INK}>OL</text>
      <Label x={244} y={79} size={22} weight={700}>Ω</Label>
      <circle cx={155} cy={190} r={50} fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={148} y={146} width={14} height={88} rx={6} fill={INK} transform="rotate(-40 155 190)" />
      <Label x={86} y={136} size={20} weight={700}>Ω</Label>
      {/* jacks */}
      {[
        { x: 70, t: "10A", red: true },
        { x: 125, t: "mA", red: true },
        { x: 185, t: "COM", red: false },
        { x: 240, t: "VΩ", red: true },
      ].map((j) => (
        <g key={j.t}>
          <Label x={j.x} y={318} size={20} weight={700} color={j.red ? PLUS : INK}>{j.t}</Label>
          <Jack x={j.x} y={352} red={j.red} r={12} />
        </g>
      ))}
      {/* red lead from VΩ looped back, probe tip pushed into the mA jack */}
      <circle cx={240} cy={352} r={5} fill={PLUS} />
      <Wire d="M 240 352 C 240 410, 330 410, 330 300 C 330 240, 200 250, 140 300" color={PLUS} width={4} />
      <line x1={140} y1={300} x2={128} y2={340} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      {/* result box */}
      <Callout x={330} y={40} w={250} h={120} tone="ok">
        <Label x={455} y={72} size={22} weight={700} color={OK}>✓ ฟิวส์ดี</Label>
        <Label x={455} y={104} size={20}>อ่านได้ค่าต่ำ</Label>
        <Label x={455} y={132} size={20}>(ไม่กี่โอห์ม ตามคู่มือ)</Label>
      </Callout>
      <Callout x={330} y={180} w={250} h={100} tone="danger">
        <Label x={455} y={212} size={22} weight={700} color={DANGER}>✗ ฟิวส์ขาด</Label>
        <Label x={455} y={246} size={20}>แสดง OL</Label>
      </Callout>
      <Label x={455} y={318} size={20} muted>ทำซ้ำกับช่อง 10A</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W17-F01": AnalogMeter,
  "W17-F02": DigitalMeter,
  "W17-F03": ScaleFull,
  "W17-F04": DrillA,
  "W17-F05": DrillB,
  "W17-F06": DrillC,
  "W17-F07": ConnectPanels,
  "W17-F08": OhmmeterInside,
  "W17-F09": CatZones,
  "W17-F10": Loading,
  "W17-F11": PowerSupply,
  "W17-F12": CvCcGraph,
  "W17-F13": FindFault,
  "W17-F14": LiveDeadLive,
  "W17-F15": AccuracyBand,
  "W17-F16": FuseCheck,
};
export default figures;
