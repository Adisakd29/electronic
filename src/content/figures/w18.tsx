import type { FigureMap } from "@/content/types";
import type { ReactNode } from "react";
import { Label, Wire, Resistor, ACSource, Ground, Node, Arrow, Callout, PEWire } from "./kit";

/* ------------------------------------------------------------------------ */
/* Shared helpers for this week                                              */
/* ------------------------------------------------------------------------ */

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const CH1 = "var(--fig-accent)";
const CH2 = "var(--fig-accent-2)";

type Fn = (xd: number) => number;

/** sine with amplitude a (div), period p (div), phase offset ph (div), dc (div) */
const sine = (a: number, p: number, dc = 0, ph = 0): Fn => (x) => dc + a * Math.sin((2 * Math.PI * (x - ph)) / p);
const square = (a: number, p: number, dc = 0, ph = 0): Fn => (x) => {
  const u = (((x - ph) % p) + p) % p;
  return dc + (u < p / 2 ? a : -a);
};
const triangle = (a: number, p: number, dc = 0, ph = 0): Fn => (x) => {
  const u = ((((x - ph) % p) + p) % p) / p; // 0..1
  // starts at 0 going up
  const v = u < 0.25 ? 4 * u : u < 0.75 ? 2 - 4 * u : 4 * u - 4;
  return dc + a * v;
};

interface TraceDef {
  fn: Fn;
  color?: string;
  dash?: string;
  opacity?: number;
  width?: number;
}

/** Scope graticule 10 × 8 divisions with traces. (x, y) = top-left. */
function Screen({
  x,
  y,
  d,
  traces,
  id,
  markers,
  markerSize = 20,
  children,
}: {
  x: number;
  y: number;
  d: number;
  traces: TraceDef[];
  id: string;
  markers?: { yd: number; label: string; color?: string }[];
  markerSize?: number;
  children?: ReactNode;
}) {
  const W = 10 * d;
  const H = 8 * d;
  const grid: ReactNode[] = [];
  for (let i = 1; i < 10; i++)
    grid.push(<line key={`v${i}`} x1={x + i * d} y1={y} x2={x + i * d} y2={y + H} stroke={MUTED} strokeOpacity={i === 5 ? 0.8 : 0.35} strokeWidth={i === 5 ? 1.5 : 1} />);
  for (let j = 1; j < 8; j++)
    grid.push(<line key={`h${j}`} x1={x} y1={y + j * d} x2={x + W} y2={y + j * d} stroke={MUTED} strokeOpacity={j === 4 ? 0.8 : 0.35} strokeWidth={j === 4 ? 1.5 : 1} />);
  // minor ticks on centre axes (5 per div)
  for (let k = 0; k <= 50; k++) {
    const tx = x + (k * d) / 5;
    grid.push(<line key={`tx${k}`} x1={tx} y1={y + H / 2 - 4} x2={tx} y2={y + H / 2 + 4} stroke={MUTED} strokeWidth={1.2} />);
  }
  for (let k = 0; k <= 40; k++) {
    const ty = y + (k * d) / 5;
    grid.push(<line key={`ty${k}`} x1={x + W / 2 - 4} y1={ty} x2={x + W / 2 + 4} y2={ty} stroke={MUTED} strokeWidth={1.2} />);
  }
  const toX = (xd: number) => x + xd * d;
  const toY = (yd: number) => y + (4 - yd) * d;
  const paths = traces.map((t, i) => {
    const N = 800;
    let p = "";
    for (let k = 0; k <= N; k++) {
      const xd = (10 * k) / N;
      p += `${k ? "L" : "M"}${toX(xd).toFixed(1)} ${toY(t.fn(xd)).toFixed(1)} `;
    }
    return (
      <path
        key={i}
        d={p}
        fill="none"
        stroke={t.color ?? CH1}
        strokeWidth={t.width ?? 3}
        strokeDasharray={t.dash}
        strokeOpacity={t.opacity ?? 1}
        strokeLinejoin="round"
      />
    );
  });
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={W} height={H} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={W} height={H} fill="var(--fig-panel)" stroke={INK} strokeWidth={2.5} rx={4} />
      {grid}
      <g clipPath={`url(#${id})`}>{paths}</g>
      {(markers ?? []).map((m, i) => (
        <g key={i}>
          <path d={`M ${x - 4} ${toY(m.yd)} l -14 -9 l 0 18 z`} fill={m.color ?? CH1} />
          <text x={x - 22} y={toY(m.yd)} fontSize={markerSize} textAnchor="end" dominantBaseline="middle" fontWeight={700} fill={m.color ?? CH1}>
            {m.label}
          </text>
        </g>
      ))}
      {children}
    </g>
  );
}

/** Settings bar below a screen. */
function Settings({ x, y, items }: { x: number; y: number; items: string[] }) {
  return (
    <g>
      {items.map((t, i) => (
        <Label key={i} x={x} y={y + i * 28} anchor="start" size={21}>
          {t}
        </Label>
      ))}
    </g>
  );
}

/** Dimension line with end bars (vertical or horizontal). */
function Dim({ x1, y1, x2, y2, label, side = 1, color = "var(--fig-current)", rotate = false }: { x1: number; y1: number; x2: number; y2: number; label: string; side?: number; color?: string; rotate?: boolean }) {
  const vertical = x1 === x2;
  const tx = vertical ? x1 + side * (rotate ? 18 : 12) : (x1 + x2) / 2;
  const ty = vertical ? (y1 + y2) / 2 : y1 + side * 20;
  return (
    <g stroke={color} strokeWidth={2.5}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - 8} y1={y1} x2={x1 + 8} y2={y1} />
          <line x1={x2 - 8} y1={y2} x2={x2 + 8} y2={y2} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - 8} x2={x1} y2={y1 + 8} />
          <line x1={x2} y1={y2 - 8} x2={x2} y2={y2 + 8} />
        </>
      )}
      <text
        x={tx}
        y={ty}
        transform={rotate ? `rotate(-90 ${tx} ${ty})` : undefined}
        fontSize={21}
        fontWeight={700}
        stroke="none"
        fill={color}
        textAnchor={vertical && !rotate ? (side > 0 ? "start" : "end") : "middle"}
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}

function Knob({ x, y, r = 20, label, below = true, size = 18 }: { x: number; y: number; r?: number; label?: string; below?: boolean; size?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <circle cx={x} cy={y} r={r * 0.45} fill="var(--fig-panel)" stroke={INK} strokeWidth={1.5} />
      <line x1={x} y1={y} x2={x} y2={y - r + 3} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {label ? (
        <Label x={x} y={below ? y + r + 16 : y - r - 14} size={size} weight={600}>
          {label}
        </Label>
      ) : null}
    </g>
  );
}

function Btn({ x, y, w = 56, h = 28, text, size = 16 }: { x: number; y: number; w?: number; h?: number; text: string; size?: number }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={6} fill="var(--fig-bg)" stroke={INK} strokeWidth={2} />
      <Label x={x} y={y + 1} size={size} weight={700}>
        {text}
      </Label>
    </g>
  );
}

function BNC({ x, y, label, size = 18 }: { x: number; y: number; label?: string; size?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={15} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <circle cx={x} cy={y} r={5} fill={INK} />
      {label ? (
        <Label x={x} y={y + 30} size={size} weight={600}>
          {label}
        </Label>
      ) : null}
    </g>
  );
}

/* ------------------------------------------------------------------------ */
/* F01 Signal parameters                                                     */
/* ------------------------------------------------------------------------ */
function SignalParams() {
  const x0 = 110;
  const zeroY = 330; // 0 V
  const mid = 210; // DC offset level
  const A = 100;
  const P = 220;
  let d = "";
  for (let k = 0; k <= 400; k++) {
    const t = (k / 400) * 400;
    const yy = mid - A * Math.sin((2 * Math.PI * t) / P);
    d += `${k ? "L" : "M"}${(x0 + t).toFixed(1)} ${yy.toFixed(1)} `;
  }
  const pk1 = x0 + P / 4;
  const pk2 = x0 + P / 4 + P;
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* axes */}
      <line x1={x0} y1={30} x2={x0} y2={370} stroke={INK} strokeWidth={2.5} />
      <line x1={x0} y1={zeroY} x2={575} y2={zeroY} stroke={INK} strokeWidth={2.5} />
      <path d={`M 575 ${zeroY} l -12 -6 l 0 12 z`} fill={INK} />
      <Label x={580} y={zeroY + 26} anchor="end" size={20} muted>เวลา t</Label>
      <Label x={x0 - 10} y={zeroY} anchor="end" size={20}>0 V</Label>
      <Label x={x0 - 10} y={40} anchor="end" size={20} muted>v</Label>
      {/* offset line */}
      <line x1={x0} y1={mid} x2={590} y2={mid} stroke={MUTED} strokeWidth={2} strokeDasharray="8 6" />
      <path d={d} fill="none" stroke={CH1} strokeWidth={3.5} />
      {/* Vp */}
      <Dim x1={pk1} y1={mid} x2={pk1} y2={mid - A} label="" side={1} />
      <Label x={pk1 + 12} y={mid - 25} anchor="start" size={22} weight={700} color="var(--fig-current)">Vp</Label>
      {/* Vpp at the left of the axis */}
      <line x1={x0 - 30} y1={mid - A} x2={pk1} y2={mid - A} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
      <line x1={x0 - 30} y1={mid + A} x2={x0 + 3 * P / 4} y2={mid + A} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
      <Dim x1={x0 - 22} y1={mid + A} x2={x0 - 22} y2={mid - A} label="" />
      <Label x={x0 - 34} y={mid - 14} anchor="end" size={22} weight={700} color="var(--fig-current)">Vpp</Label>
      <Label x={x0 - 34} y={mid + 14} anchor="end" size={20} color="var(--fig-current)">= 2Vp</Label>
      {/* T between peaks */}
      <line x1={pk1} y1={mid - A} x2={pk1} y2={60} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
      <line x1={pk2} y1={mid - A} x2={pk2} y2={60} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
      <Dim x1={pk1} y1={70} x2={pk2} y2={70} label="คาบ T  (f = 1/T)" side={-1} color={INK} />
      {/* offset */}
      <Dim x1={545} y1={zeroY} x2={545} y2={mid} label="DC offset" side={1} rotate color="var(--fig-accent-2)" />
      <Label x={590} y={mid - 18} anchor="end" size={20} muted>เส้นกลางคลื่น</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F02 Waveform gallery                                                      */
/* ------------------------------------------------------------------------ */
function Waveforms() {
  const cells: { name: string; sub: string; fn: Fn }[] = [
    { name: "ไซน์ (sine)", sub: "Vrms = Vp/√2", fn: sine(1, 1) },
    { name: "สี่เหลี่ยม (square)", sub: "Vrms = Vp", fn: square(1, 1) },
    { name: "สามเหลี่ยม (triangle)", sub: "ขึ้น–ลงชันเท่ากัน", fn: triangle(1, 1) },
    { name: "ฟันเลื่อย (ramp)", sub: "ขึ้นช้า ตกทันที", fn: (x) => 2 * ((((x + 0.5) % 1) + 1) % 1) - 1 },
    { name: "พัลส์ (pulse)", sub: "duty = ช่วงสูง ÷ T", fn: (x) => ((((x % 1) + 1) % 1) < 0.2 ? 1 : -1) },
  ];
  const pos = [
    [20, 20],
    [215, 20],
    [410, 20],
    [117, 225],
    [312, 225],
  ];
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      {cells.map((c, i) => {
        const [cx, cy] = pos[i];
        const w = 170;
        const h = 90;
        let d = "";
        for (let k = 0; k <= 400; k++) {
          const xd = (k / 400) * 2; // 2 cycles
          const yv = c.fn(xd);
          d += `${k ? "L" : "M"}${(cx + 5 + (xd / 2) * (w - 10)).toFixed(1)} ${(cy + 10 + h / 2 - (yv * (h - 20)) / 2).toFixed(1)} `;
        }
        return (
          <g key={i}>
            <rect x={cx} y={cy} width={w} height={h + 20} rx={8} fill="var(--fig-panel)" stroke={INK} strokeWidth={2} />
            <line x1={cx + 5} y1={cy + 10 + h / 2} x2={cx + w - 5} y2={cy + 10 + h / 2} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
            <path d={d} fill="none" stroke={CH1} strokeWidth={3} strokeLinejoin="round" />
            <Label x={cx + w / 2} y={cy + h + 44} size={20} weight={700}>{c.name}</Label>
            <Label x={cx + w / 2} y={cy + h + 70} size={20} muted>{c.sub}</Label>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F03 Function generator front panel (hotspot)                              */
/* ------------------------------------------------------------------------ */
function FunctionGenerator() {
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <rect x={10} y={10} width={580} height={420} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={30} y={36} anchor="start" size={20} weight={700}>FUNCTION GENERATOR</Label>
      {/* display */}
      <rect x={30} y={58} width={250} height={80} rx={6} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <text x={155} y={99} fontSize={36} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={INK} style={{ fontFamily: "monospace" }}>1.000 kHz</text>
      {/* waveform buttons */}
      <Label x={450} y={40} size={20} weight={700}>FUNCTION</Label>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={360 + i * 64} y={60} width={52} height={40} rx={6} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      ))}
      <path d="M 370 80 q 8 -16 16 0 t 16 0" fill="none" stroke={INK} strokeWidth={2.5} />
      <path d="M 432 90 v -20 h 16 v 20 h 16 v -20" fill="none" stroke={INK} strokeWidth={2.5} />
      <path d="M 496 90 l 8 -20 l 8 20 l 8 -20" fill="none" stroke={INK} strokeWidth={2.5} />
      {/* range buttons */}
      <Label x={300} y={160} anchor="start" size={20} weight={700}>RANGE</Label>
      {["Hz", "kHz", "MHz"].map((t, i) => (
        <Btn key={t} x={420 + i * 64} y={160} w={56} h={36} text={t} size={20} />
      ))}
      {/* knobs row */}
      <Knob x={90} y={250} r={32} label="FREQUENCY" size={20} />
      <Knob x={220} y={250} r={22} label="AMPLITUDE" size={20} />
      <Knob x={345} y={250} r={22} label="OFFSET" size={20} />
      <Knob x={460} y={250} r={22} label="DUTY" size={20} />
      <Btn x={545} y={242} w={66} h={38} text="ATT" size={20} />
      <Label x={545} y={284} size={20} weight={600}>−20 dB</Label>
      {/* bottom row */}
      <Btn x={85} y={372} w={110} h={42} text="POWER" size={20} />
      <BNC x={300} y={362} label="TTL/SYNC" size={20} />
      <Btn x={425} y={362} w={104} h={40} text="OUTPUT" size={20} />
      <BNC x={540} y={362} label="50 Ω" size={20} />
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F04 Digital storage oscilloscope front panel (hotspot)                    */
/* ------------------------------------------------------------------------ */
function DSOPanel() {
  const sx = 24;
  const sy = 30;
  const d = 24;
  const box = (x: number, y: number, w: number, h: number) => (
    <rect x={x} y={y} width={w} height={h} rx={8} fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 4" />
  );
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <rect x={10} y={10} width={580} height={460} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Screen x={sx} y={sy} d={d} id="w18f04clip" traces={[{ fn: sine(2, 4) }, { fn: square(1, 4, -0.5), color: CH2, dash: "7 5" }]} markers={[]} />
      <Label x={144} y={246} size={20} muted>CH1 ทึบ · CH2 ประ</Label>
      {/* top buttons */}
      <Btn x={355} y={45} w={130} h={36} text="AUTOSET" size={20} />
      <Btn x={505} y={45} w={130} h={36} text="RUN/STOP" size={20} />
      <Btn x={355} y={90} w={130} h={36} text="MEASURE" size={20} />
      <Btn x={505} y={90} w={130} h={36} text="CURSOR" size={20} />
      {/* vertical */}
      {box(285, 120, 180, 182)}
      <Label x={375} y={140} size={20} weight={700} muted>VERTICAL</Label>
      <Knob x={340} y={196} r={24} />
      <Label x={340} y={240} size={20} weight={700}>VOLTS/DIV</Label>
      <Knob x={428} y={190} r={16} />
      <Label x={428} y={220} size={20} weight={700}>POS</Label>
      <Btn x={375} y={278} w={80} h={32} text="CH1" size={20} />
      {/* horizontal */}
      {box(475, 120, 105, 182)}
      <Label x={527} y={140} size={20} weight={700} muted>HORIZ</Label>
      <Knob x={527} y={196} r={24} />
      <Label x={527} y={240} size={20} weight={700}>TIME/DIV</Label>
      {/* trigger */}
      {box(285, 314, 295, 100)}
      <Label x={300} y={334} anchor="start" size={20} weight={700} muted>TRIGGER</Label>
      <Knob x={318} y={380} r={18} />
      <Label x={344} y={380} anchor="start" size={20} weight={700}>LEVEL</Label>
      <Btn x={520} y={380} w={96} h={34} text="MENU" size={20} />
      {/* BNC row */}
      <BNC x={60} y={300} label="CH1" size={20} />
      <BNC x={150} y={300} label="CH2" size={20} />
      <BNC x={240} y={300} label="EXT" size={20} />
      {/* CAL terminals */}
      <rect x={53} y={378} width={14} height={34} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <rect x={103} y={378} width={14} height={34} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <Label x={60} y={438} size={20} weight={700}>CAL</Label>
      <Label x={110} y={438} size={22} weight={700}>⏚</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F05 Analog (CRT) oscilloscope panel for comparison                        */
/* ------------------------------------------------------------------------ */
function AnalogScope() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <rect x={10} y={10} width={580} height={360} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <rect x={30} y={30} width={240} height={190} rx={18} fill="var(--fig-bg)" stroke={INK} strokeWidth={3} />
      <Screen x={46} y={45} d={20.8} id="w18f05clip" traces={[{ fn: sine(1.5, 5), color: "var(--fig-ok)" }]} />
      <Label x={150} y={244} size={20} muted>จอ CRT</Label>
      <Knob x={65} y={300} r={18} label="INTEN" size={20} />
      <Knob x={150} y={300} r={18} label="FOCUS" size={20} />
      <BNC x={235} y={300} label="CH1" size={20} />
      {/* AC-GND-DC slide */}
      <rect x={300} y={40} width={36} height={120} rx={6} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <rect x={305} y={91} width={26} height={18} rx={3} fill={INK} />
      <Label x={346} y={58} anchor="start" size={20} weight={700}>AC</Label>
      <Label x={346} y={100} anchor="start" size={20} weight={700}>GND</Label>
      <Label x={346} y={142} anchor="start" size={20} weight={700}>DC</Label>
      <Knob x={480} y={88} r={38} />
      <Knob x={480} y={88} r={13} />
      <Label x={480} y={150} size={20} weight={700}>VOLTS/DIV</Label>
      <Label x={480} y={176} size={20} muted>VARIABLE → CAL</Label>
      <Knob x={360} y={258} r={30} />
      <Label x={360} y={310} size={20} weight={700}>TIME/DIV</Label>
      <Knob x={500} y={258} r={20} />
      <Label x={500} y={310} size={20} weight={700}>TRIG LEVEL</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* Scope screens                                                             */
/* ------------------------------------------------------------------------ */
const SX = 70;
const SY = 16;
const SD = 46; // 460 × 368

function ScreenE01() {
  // sine 4 div pp, period 4 div, 1 V/div, 1 ms/div
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen x={SX} y={SY} d={SD} id="w18f06clip" traces={[{ fn: sine(2, 4, 0, 0.0) }]} markers={[{ yd: 0, label: "1" }]}>
        <line x1={SX + 1 * SD} y1={SY + 2 * SD} x2={SX + 10 * SD + 22} y2={SY + 2 * SD} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
        <line x1={SX + 3 * SD} y1={SY + 6 * SD} x2={SX + 10 * SD + 22} y2={SY + 6 * SD} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
        <Dim x1={SX + 10 * SD + 18} y1={SY + 6 * SD} x2={SX + 10 * SD + 18} y2={SY + 2 * SD} label="4 div" side={1} rotate />
        <Dim x1={SX + 1 * SD} y1={SY + 1.4 * SD} x2={SX + 5 * SD} y2={SY + 1.4 * SD} label="1 รอบ = 4 div" side={-1} color="var(--fig-accent-2)" />
      </Screen>
      <Settings x={SX} y={410} items={["CH1  1 V/div  ·  DC  ·  โพรบ ×1", "TIME  1 ms/div"]} />
    </svg>
  );
}

function ScreenE02() {
  // square 2 div pp, period 2 div, 2 V/div, 0.5 ms/div
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen x={SX} y={SY} d={SD} id="w18f07clip" traces={[{ fn: square(1, 2, 0, 0.5) }]} markers={[{ yd: 0, label: "1" }]} />
      <Settings x={SX} y={410} items={["CH1  2 V/div  ·  DC  ·  โพรบ ×10 (เมนู ×10)", "TIME  0.5 ms/div"]} />
    </svg>
  );
}

function ScreenE03() {
  // triangle 4 div pp, period 5 div, 1 V/div, 0.1 ms/div
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen x={SX} y={SY} d={SD} id="w18f08clip" traces={[{ fn: triangle(2, 5) }]} markers={[{ yd: 0, label: "1" }]} />
      <Settings x={SX} y={410} items={["CH1  1 V/div  ·  DC  ·  โพรบ ×1", "TIME  0.1 ms/div"]} />
    </svg>
  );
}

function CouplingCompare() {
  const d = 32; // 320 × 256
  const yS = 50;
  const L = 100;
  const R = 560;
  return (
    <svg viewBox="0 0 900 420" aria-hidden="true">
      <Label x={L + 160} y={24} size={26} weight={700}>DC coupling</Label>
      <Screen x={L} y={yS} d={d} id="w18f09a" markerSize={26} traces={[{ fn: sine(1, 5, 2) }]} markers={[{ yd: 0, label: "GND" }]} />
      <Dim x1={L + 10 * d + 12} y1={yS + 4 * d} x2={L + 10 * d + 12} y2={yS + 2 * d} label="2 div" side={1} rotate color="var(--fig-accent-2)" />
      <Label x={L + 160} y={yS + 8 * d + 34} size={26}>ยกขึ้น 2 ช่อง = DC 2 V</Label>
      <Label x={R + 160} y={24} size={26} weight={700}>AC coupling</Label>
      <Screen x={R} y={yS} d={d} id="w18f09b" markerSize={26} traces={[{ fn: sine(1, 5, 0) }]} markers={[{ yd: 0, label: "GND" }]} />
      <Label x={R + 160} y={yS + 8 * d + 34} size={26}>DC ถูกตัด เหลือ ±1 ช่อง</Label>
      <Label x={450} y={yS + 8 * d + 84} size={26} muted>ไซน์ 2 Vpp + offset 2 V · 1 V/div · 0.2 ms/div</Label>
    </svg>
  );
}

function TriggerCompare() {
  const d = 32;
  const yS = 50;
  const L = 70;
  const R = 540;
  const rolling: TraceDef[] = [0, 0.7, 1.5, 2.3, 3.1].map((ph) => ({ fn: sine(2, 4, 0, ph), opacity: 0.45, width: 2.5 }));
  return (
    <svg viewBox="0 0 900 420" aria-hidden="true">
      <Label x={L + 160} y={24} size={26} weight={700} color="var(--fig-ok)">✓ ภาพนิ่ง (triggered)</Label>
      <Screen x={L} y={yS} d={d} id="w18f10a" markerSize={26} traces={[{ fn: sine(2, 4, 0, 0) }]} markers={[{ yd: 1, label: "T", color: "var(--fig-current)" }]}>
        <line x1={L} y1={yS + 3 * d} x2={L + 10 * d} y2={yS + 3 * d} stroke="var(--fig-current)" strokeWidth={2.5} strokeDasharray="8 6" />
      </Screen>
      <Label x={L + 160} y={yS + 8 * d + 34} size={26}>LEVEL อยู่ระหว่างยอดบวก–ลบ</Label>
      <Label x={R + 160} y={24} size={26} weight={700} color="var(--fig-danger)">✗ ภาพวิ่ง (Trig?)</Label>
      <Screen x={R} y={yS} d={d} id="w18f10b" markerSize={26} traces={rolling} markers={[{ yd: 3.3, label: "T", color: "var(--fig-current)" }]}>
        <line x1={R} y1={yS + 0.7 * d} x2={R + 10 * d} y2={yS + 0.7 * d} stroke="var(--fig-current)" strokeWidth={2.5} strokeDasharray="8 6" />
      </Screen>
      <Label x={R + 160} y={yS + 8 * d + 34} size={26}>LEVEL สูงกว่ายอดสัญญาณ</Label>
      <Label x={450} y={yS + 8 * d + 84} size={26} muted>เส้นประส้ม = ระดับทริกเกอร์ (trigger level)</Label>
    </svg>
  );
}

function ScreenShunt() {
  // shunt voltage: 5 div pp at 0.1 V/div → 0.5 Vpp
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen x={SX} y={SY} d={SD} id="w18f15clip" traces={[{ fn: sine(2.5, 5, 0, 0) , color: CH2, dash: "9 5"}]} markers={[{ yd: 0, label: "2", color: CH2 }]} />
      <Settings x={SX} y={410} items={["CH2  20 mV/div · DC · โพรบ ×1 (คร่อม shunt 10 Ω)", "TIME  0.2 ms/div"]} />
    </svg>
  );
}

function ScreenRCPhase() {
  // T = 10 div (1 kHz at 0.1 ms/div). CH1 = input 4 div pp; CH2 = V_R 2.13 div pp leading by 1.61 div
  const lead = (57.858 / 360) * 10;
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen
        x={SX}
        y={SY}
        d={SD}
        id="w18f16clip"
        traces={[
          { fn: (x) => 2 * Math.sin((2 * Math.PI * (x - 2.5)) / 10) },
          { fn: (x) => 1.064 * Math.sin((2 * Math.PI * (x - 2.5 + lead)) / 10), color: CH2, dash: "9 5" },
        ]}
        markers={[
          { yd: 0, label: "1" },
        ]}
      >
        <line x1={SX + (2.5 - lead) * SD} y1={SY + 4 * SD} x2={SX + (2.5 - lead) * SD} y2={SY + 7.2 * SD} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
        <line x1={SX + 2.5 * SD} y1={SY + 4 * SD} x2={SX + 2.5 * SD} y2={SY + 7.2 * SD} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} />
        <Dim x1={SX + (2.5 - lead) * SD} y1={SY + 7.2 * SD} x2={SX + 2.5 * SD} y2={SY + 7.2 * SD} label="Δt" side={-1} color={INK} />
      </Screen>
      <Settings x={SX} y={410} items={["CH1 ทึบ = ขาเข้า · CH2 ประ = แรงดันคร่อม R", "ทั้งสองช่อง 1 V/div · TIME 0.1 ms/div"]} />
    </svg>
  );
}

function ScreenPractice8k() {
  // sine 6 div pp at 0.5 V/div; period 2.5 div at 50 µs/div → 8 kHz
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen x={SX} y={SY} d={SD} id="w18f17clip" traces={[{ fn: sine(3, 2.5, 0, 0) }]} markers={[{ yd: 0, label: "1" }]} />
      <Settings x={SX} y={410} items={["CH1  0.5 V/div  ·  DC  ·  โพรบ ×1", "TIME  50 µs/div"]} />
    </svg>
  );
}

function ScreenProbeTrap() {
  // square 4 div pp at 0.1 V/div with probe switch ×10, menu ×1
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen x={SX} y={SY} d={SD} id="w18f18clip" traces={[{ fn: square(2, 5, 0, 0) }]} markers={[{ yd: 0, label: "1" }]} />
      <Settings x={SX} y={410} items={["CH1  0.1 V/div · DC · เมนูโพรบ ×1", "สวิตช์ที่ตัวโพรบ: ×10  ·  TIME 0.2 ms/div"]} />
    </svg>
  );
}

function ScreenE04() {
  // default preset: sine 1 kHz 4 Vpp, 1 V/div, 0.2 ms/div → 4 div pp, 5 div per cycle
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen x={SX} y={SY} d={SD} id="w18f20clip" traces={[{ fn: sine(2, 5, 0, 0) }]} markers={[{ yd: 0, label: "1" }]} />
      <Settings x={SX} y={410} items={["CH1  1 V/div  ·  DC  ·  โพรบ ×10 (เมนู ×10)", "TIME  0.2 ms/div"]} />
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F11 Probe ×1/×10 and compensation                                         */
/* ------------------------------------------------------------------------ */
function ProbeComp() {
  const panel = (x: number, kind: "under" | "ok" | "over", title: string, tone: string) => {
    const w = 170;
    const h = 120;
    const y = 220;
    const top = y + 30;
    const bot = y + h - 20;
    const seg = (w - 16) / 4;
    let d = `M ${x + 8} ${bot}`;
    for (let c = 0; c < 2; c++) {
      const x0 = x + 8 + c * 2 * seg;
      if (kind === "ok") d += ` L ${x0} ${top} L ${x0 + seg} ${top} L ${x0 + seg} ${bot} L ${x0 + 2 * seg} ${bot}`;
      if (kind === "under")
        d += ` L ${x0} ${bot - 30} Q ${x0 + 6} ${top} ${x0 + seg} ${top} L ${x0 + seg} ${top + 30} Q ${x0 + seg + 6} ${bot} ${x0 + 2 * seg} ${bot}`;
      if (kind === "over")
        d += ` L ${x0} ${top - 18} Q ${x0 + 8} ${top} ${x0 + seg} ${top} L ${x0 + seg} ${bot + 18} Q ${x0 + seg + 8} ${bot} ${x0 + 2 * seg} ${bot}`;
    }
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={6} fill="var(--fig-panel)" stroke={tone} strokeWidth={2.5} />
        <path d={d} fill="none" stroke={CH1} strokeWidth={3} strokeLinejoin="round" />
        <Label x={x + w / 2} y={y + h + 26} size={20} weight={700} color={tone}>{title}</Label>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* probe body */}
      <path d="M 40 100 L 70 92 L 70 108 Z" fill={INK} />
      <rect x={70} y={84} width={150} height={32} rx={14} fill="var(--fig-bg)" stroke={INK} strokeWidth={3} />
      <rect x={140} y={78} width={44} height={12} rx={3} fill={INK} />
      <Label x={162} y={58} size={20} weight={700}>สวิตช์ ×1 / ×10</Label>
      <Label x={40} y={140} anchor="start" size={20}>ปลายวัด (tip)</Label>
      {/* ground lead */}
      <Wire d="M 210 116 C 215 160, 250 170, 270 180" width={2.5} />
      <path d="M 266 172 l 12 0 l 4 16 l -20 0 z" fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <Label x={292} y={182} anchor="start" size={20}>ปากคีบกราวด์</Label>
      {/* cable */}
      <Wire d="M 220 100 C 300 100, 330 100, 420 100" width={5} />
      {/* compensation box near BNC */}
      <rect x={420} y={84} width={70} height={32} rx={6} fill="var(--fig-bg)" stroke={INK} strokeWidth={3} />
      <circle cx={455} cy={100} r={8} fill="none" stroke={INK} strokeWidth={2.5} />
      <line x1={449} y1={100} x2={461} y2={100} stroke={INK} strokeWidth={2.5} />
      <Label x={455} y={58} size={20} weight={700}>ทริมเมอร์ชดเชย</Label>
      <rect x={490} y={92} width={30} height={16} fill={INK} />
      <Label x={540} y={100} anchor="start" size={20}>BNC</Label>
      {panel(15, "under", "ขาดชดเชย (มุมมน)", "var(--fig-warn)")}
      {panel(215, "ok", "พอดี ✓ (เหลี่ยมเรียบ)", "var(--fig-ok)")}
      {panel(415, "over", "เกินชดเชย (มีหนาม)", "var(--fig-danger)")}
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F12 Connection: generator → R → shunt (ground side) → scope, one ground   */
/* ------------------------------------------------------------------------ */
function ShuntConnection() {
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      {/* generator */}
      <ACSource x={80} y={210} angle={90} />
      <Label x={118} y={200} anchor="start" size={20}>เครื่องกำเนิด</Label>
      <Label x={118} y={224} anchor="start" size={20}>สัญญาณ</Label>
      <Wire points={[[80, 170], [80, 90], [200, 90]]} />
      <Resistor x={240} y={90} label="R" value="1 kΩ" labelSide="b" />
      <Wire points={[[280, 90], [340, 90], [340, 160]]} />
      <Resistor x={340} y={200} angle={90} label="R shunt" value="10 Ω" />
      <Wire points={[[340, 240], [340, 330]]} />
      <Wire points={[[80, 250], [80, 330], [470, 330]]} />
      <Node x={340} y={330} />
      <Node x={80} y={90} />
      <Node x={340} y={90} />
      <Ground x={200} y={330} />
      {/* scope */}
      <rect x={470} y={60} width={110} height={290} rx={10} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={525} y={84} size={20} weight={700}>สโคป</Label>
      <Label x={525} y={140} size={20} weight={700} color={CH1}>CH1</Label>
      <Label x={525} y={220} size={20} weight={700} color={CH2}>CH2</Label>
      <Label x={525} y={330} size={20} weight={700}>⏚</Label>
      {/* probe leads */}
      <Wire points={[[80, 90], [80, 36], [440, 36], [440, 140], [470, 140]]} color={CH1} width={2.5} />
      <Wire points={[[340, 160], [458, 160], [458, 220], [470, 220]]} color={CH2} width={2.5} dash="8 5" />
      <Node x={340} y={160} r={6} />
      <Label x={315} y={160} anchor="end" size={20}>A</Label>
      <Callout x={95} y={374} w={420} h={46} tone="ok">
        <Label x={305} y={397} size={20}>กราวด์ทุกเส้นที่จุดเดียว · shunt อยู่ฝั่งกราวด์</Label>
      </Callout>
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F13 Danger: ground clip on L of mains vs differential probe               */
/* ------------------------------------------------------------------------ */
function MainsDanger() {
  return (
    <svg viewBox="0 0 900 500" aria-hidden="true">
      {/* left panel: danger */}
      <rect x={10} y={10} width={500} height={480} rx={12} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={3} />
      <Label x={260} y={42} size={26} weight={700} color="var(--fig-danger)">✗ อันตราย: โพรบปกติกับไฟบ้าน</Label>
      {/* source */}
      <rect x={40} y={90} width={110} height={70} rx={8} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <Label x={95} y={125} size={26} weight={700}>230 V</Label>
      <Wire points={[[150, 105], [320, 105]]} color="var(--fig-wire-l)" width={5} />
      <Label x={180} y={84} size={26} weight={700} color="var(--fig-wire-l)">L</Label>
      <Wire points={[[150, 145], [320, 145]]} color="var(--fig-wire-n)" width={5} />
      <Label x={180} y={172} size={26} weight={700} color="var(--fig-wire-n)">N</Label>
      {/* clip on L */}
      <Node x={300} y={105} r={7} />
      <Wire d="M 300 105 C 330 160, 360 220, 380 250" width={3} dash="6 4" />
      <Label x={250} y={225} size={26}>ปากคีบกราวด์</Label>
      {/* scope */}
      <rect x={370} y={240} width={120} height={90} rx={8} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <Label x={430} y={285} size={26} weight={700}>สโคป</Label>
      <PEWire points={[[430, 330], [430, 400], [95, 400], [95, 170]]} width={6} />
      <Label x={250} y={430} size={26}>สายดินปลั๊ก (PE) → ดิน → N</Label>
      <Arrow from={[330, 160]} to={[370, 240]} color="var(--fig-danger)" width={4} />
      <Arrow from={[400, 360]} to={[200, 380]} color="var(--fig-danger)" width={4} />
      <Label x={260} y={468} size={26} weight={700} color="var(--fig-danger)">ลัดวงจรลงดิน · Vpp ≈ 650 V</Label>
      {/* right panel: OK */}
      <rect x={520} y={10} width={370} height={480} rx={12} fill="var(--fig-panel)" stroke="var(--fig-ok)" strokeWidth={3} />
      <Label x={705} y={42} size={26} weight={700} color="var(--fig-ok)">✓ ครูเท่านั้น (S3)</Label>
      <rect x={600} y={120} width={210} height={110} rx={10} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <Label x={705} y={155} size={26} weight={700}>โพรบผลต่าง</Label>
      <Label x={705} y={190} size={26}>(differential)</Label>
      <Wire points={[[620, 120], [620, 80]]} color="var(--fig-wire-l)" width={4} />
      <Wire points={[[790, 120], [790, 80]]} color="var(--fig-wire-n)" width={4} />
      <Label x={705} y={90} size={26} muted>+ in  − in</Label>
      <Label x={705} y={270} size={26} weight={700}>พิกัด CAT ≥ งาน</Label>
      <Wire points={[[705, 230], [705, 330]]} width={4} />
      <rect x={645} y={330} width={120} height={80} rx={8} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
      <Label x={705} y={370} size={26} weight={700}>สโคป</Label>
      <Label x={705} y={450} size={26}>ขาเข้าแยกจากดิน</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F14 Final assessment stations                                             */
/* ------------------------------------------------------------------------ */
function Stations() {
  const box = (x: number, y: number, title: string, l1: string, l2: string, l3: string) => (
    <g>
      <rect x={x} y={y} width={430} height={170} rx={12} fill="var(--fig-panel)" stroke="var(--fig-accent)" strokeWidth={3} />
      <Label x={x + 20} y={y + 34} anchor="start" size={26} weight={700}>{title}</Label>
      <Label x={x + 20} y={y + 76} anchor="start" size={26}>{l1}</Label>
      <Label x={x + 20} y={y + 112} anchor="start" size={26} muted>{l2}</Label>
      <Label x={x + 20} y={y + 148} anchor="start" size={26} muted>{l3}</Label>
    </g>
  );
  return (
    <svg viewBox="0 0 900 520" aria-hidden="true">
      {box(10, 10, "A ความรู้ + ความปลอดภัย", "สมรรถนะ 1 · 40 นาที · 25%", "ข้อสอบ ≥ 60%", "สถานการณ์ปลอดภัย 3/3")}
      {box(460, 10, "B ประกอบวงจรไฟฟ้า", "สมรรถนะ 2 · 30 นาที · 20%", "บอร์ด 12 V ทำงานถูก", "ค่าวัดคลาด ≤ 10%")}
      {box(10, 195, "C ตรวจอุปกรณ์อิเล็กทรอนิกส์", "สมรรถนะ 3 · 25 นาที · 20%", "ชิ้นส่วนสุ่ม 6 ชิ้น", "ถูก ≥ 5 จาก 6")}
      {box(460, 195, "D ใช้เครื่องมือวัด", "สมรรถนะ 4 · 30 นาที · 35%", "generator + สโคป + DMM", "±5% หรือ ±0.2 div")}
      <rect x={10} y={385} width={880} height={125} rx={12} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={3} strokeDasharray="10 6" />
      <Label x={450} y={418} size={26} weight={700} color="var(--fig-danger)">ผิดร้ายแรง (critical fail) = ไม่ผ่านสถานีนั้น สอบซ่อม 1 ครั้ง</Label>
      <Label x={450} y={456} size={24}>แอมมิเตอร์คร่อมแหล่งจ่าย · จ่ายไฟก่อนครูตรวจ · วัด Ω ขณะมีไฟ</Label>
      <Label x={450} y={490} size={24}>หนีบกราวด์โพรบผิดจุด · จ่ายไฟให้อิเล็กโทรไลต์กลับขั้ว · ต่อสโคปกับไฟบ้าน</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F19 Find-fault: five probe connection scenes                              */
/* ------------------------------------------------------------------------ */
function Chain({ x, y, tip, clips }: { x: number; y: number; tip?: number; clips: { at: number; label: string }[] }) {
  // vertical chain: node0 (+12 V) top, R, node1 (mid), R, node2 (GND)
  const ny = [y, y + 100, y + 200];
  return (
    <g>
      <Label x={x} y={y - 22} size={26} weight={700}>+12 V</Label>
      <Wire points={[[x, ny[0]], [x, ny[0] + 10]]} />
      <Resistor x={x} y={ny[0] + 50} angle={90} />
      <Wire points={[[x, ny[1] - 10], [x, ny[1] + 10]]} />
      <Resistor x={x} y={ny[1] + 50} angle={90} />
      <Wire points={[[x, ny[2] - 10], [x, ny[2]]]} />
      <Ground x={x} y={ny[2]} />
      {[0, 1, 2].map((i) => (
        <Node key={i} x={x} y={ny[i]} />
      ))}
      {tip !== undefined ? (
        <g>
          <path d={`M ${x + 8} ${ny[tip]} l 24 -10 l 0 20 z`} fill={CH1} />
          <Label x={x + 38} y={ny[tip]} anchor="start" size={26} weight={700} color={CH1}>tip</Label>
        </g>
      ) : null}
      {clips.map((c, i) => (
        <g key={i}>
          <path d={`M ${x - 8} ${ny[c.at]} l -16 -11 l -14 0 l 0 22 l 14 0 z`} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
          <Label x={x - 44} y={ny[c.at]} anchor="end" size={26} weight={700}>{c.label}</Label>
        </g>
      ))}
    </g>
  );
}

function ProbeFaults() {
  const panel = (x: number, y: number, w: number, n: string, caption: string, body: ReactNode) => (
    <g>
      <rect x={x} y={y} width={w} height={330} rx={10} fill="var(--fig-panel)" stroke={INK} strokeWidth={2} />
      <circle cx={x + 28} cy={y + 28} r={20} fill={INK} />
      <Label x={x + 28} y={y + 29} size={26} weight={700} color="var(--fig-bg)">{n}</Label>
      {body}
      <Label x={x + w / 2} y={y + 306} size={26}>{caption}</Label>
    </g>
  );
  return (
    <svg viewBox="0 0 900 700" aria-hidden="true">
      {panel(10, 10, 285, "1", "กราวด์หนีบ +12 V", <Chain x={195} y={66} tip={1} clips={[{ at: 0, label: "กราวด์" }]} />)}
      {panel(307, 10, 285, "2", "ใช้ 2 โพรบ", <Chain x={495} y={66} tip={1} clips={[{ at: 1, label: "กราวด์2" }, { at: 2, label: "กราวด์1" }]} />)}
      {panel(604, 10, 286, "3", "×10 วัดเต้ารับ 230 V", (
        <g>
          <rect x={670} y={80} width={140} height={150} rx={14} fill="var(--fig-bg)" stroke={INK} strokeWidth={3} />
          <circle cx={712} cy={150} r={10} fill={INK} />
          <circle cx={768} cy={150} r={10} fill={INK} />
          <circle cx={740} cy={198} r={11} fill={INK} />
          <Label x={740} y={106} size={26} weight={700}>230 V</Label>
          <path d="M 786 143 l 44 -32 l 7 9 l -44 32 z" fill={CH1} />
          <Label x={846} y={96} size={26} weight={700} color={CH1}>×10</Label>
        </g>
      ))}
      {panel(158, 355, 285, "4", "ปลั๊กสโคปไม่มีขาดิน", (
        <g>
          <rect x={245} y={405} width={110} height={74} rx={10} fill="var(--fig-bg)" stroke={INK} strokeWidth={3} />
          <rect x={265} y={479} width={11} height={42} fill={INK} />
          <rect x={324} y={479} width={11} height={42} fill={INK} />
          <rect x={295} y={479} width={11} height={30} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="4 3" />
          <Label x={300} y={442} size={26} weight={700}>สโคป</Label>
          <Label x={300} y={556} size={26} weight={700} color="var(--fig-danger)">ขา E ถูกตัด</Label>
          <Label x={300} y={594} size={26} muted>(ใช้ปลั๊กแปลง 2 ขา)</Label>
        </g>
      ))}
      {panel(455, 355, 285, "5", "กราวด์ที่ GND", <Chain x={640} y={410} tip={1} clips={[{ at: 2, label: "กราวด์" }]} />)}
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* F21 Square wave with DC offset (station-D practice card 6)                */
/* ------------------------------------------------------------------------ */
function ScreenOffsetSquare() {
  // square 500 Hz, 0 V → +2 V (2 Vpp, offset +1 V); 0.5 V/div DC; 0.5 ms/div → 4 div high, period 4 div
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <Screen x={SX} y={SY} d={SD} id="w18f21clip" traces={[{ fn: square(2, 4, 0, 0) }]} markers={[{ yd: -2, label: "1" }]}>
        <Label x={SX + 10 * SD - 8} y={SY + 6 * SD + 20} anchor="end" size={20} weight={700} color={CH1}>GND (0 V)</Label>
      </Screen>
      <Settings x={SX} y={410} items={["CH1  0.5 V/div  ·  DC  ·  โพรบ ×10 (เมนู ×10)", "TIME  0.5 ms/div"]} />
    </svg>
  );
}

export const figures: FigureMap = {
  "W18-F01": SignalParams,
  "W18-F02": Waveforms,
  "W18-F03": FunctionGenerator,
  "W18-F04": DSOPanel,
  "W18-F05": AnalogScope,
  "W18-F06": ScreenE01,
  "W18-F07": ScreenE02,
  "W18-F08": ScreenE03,
  "W18-F09": CouplingCompare,
  "W18-F10": TriggerCompare,
  "W18-F11": ProbeComp,
  "W18-F12": ShuntConnection,
  "W18-F13": MainsDanger,
  "W18-F14": Stations,
  "W18-F15": ScreenShunt,
  "W18-F16": ScreenRCPhase,
  "W18-F17": ScreenPractice8k,
  "W18-F18": ScreenProbeTrap,
  "W18-F19": ProbeFaults,
  "W18-F20": ScreenE04,
  "W18-F21": ScreenOffsetSquare,
};
export default figures;
