import type { ReactNode } from "react";
import type { FigureMap } from "@/content/types";
import { Wire, Label, Arrow, Node, Battery, DCSource, Resistor, SwitchSym, Diode, Lamp, Inductor, Callout, PEWire } from "./kit";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";
const MUTED = "var(--fig-muted)";
const PANEL = "var(--fig-panel)";

type Pt = [number, number];

// ---------------------------------------------------------------------------
// Local primitives (IEC 60617 style)
// ---------------------------------------------------------------------------

/** Motor symbol: circle with M and ⎓ (DC) or 3~ (three-phase AC). */
function MotorSym({ x, y, r = 26, kind = "dc", label }: { x: number; y: number; r?: number; kind?: "dc" | "ac3"; label?: ReactNode }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={BG} stroke={INK} strokeWidth={3} />
      <text x={x} y={y - (kind === "dc" ? 4 : 6)} fontSize={r > 34 ? 30 : 24} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={INK}>
        M
      </text>
      {kind === "dc" ? (
        <g stroke={INK} strokeWidth={2.5}>
          <line x1={x - 11} y1={y + 13} x2={x + 11} y2={y + 13} />
          <line x1={x - 11} y1={y + 19} x2={x + 11} y2={y + 19} strokeDasharray="5 3" />
        </g>
      ) : (
        <text x={x} y={y + (r > 34 ? 22 : 15)} fontSize={20} fontWeight={600} textAnchor="middle" dominantBaseline="middle" fill={INK}>
          3~
        </text>
      )}
      {label ? <Label x={x + r + 10} y={y} anchor="start">{label}</Label> : null}
    </g>
  );
}

/** Rotation arrow over the top of a circle. cw = clockwise on screen. */
function RotArrow({ cx, cy, r, cw = true, color = "var(--fig-accent)", cls }: { cx: number; cy: number; r: number; cw?: boolean; color?: string; cls?: string }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a0 = cw ? 205 : 335;
  const a1 = cw ? 335 : 205;
  const p = (a: number): Pt => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const t: Pt = cw ? [-Math.sin(rad(a1)), Math.cos(rad(a1))] : [Math.sin(rad(a1)), -Math.cos(rad(a1))];
  const h = 12;
  const n: Pt = [-t[1], t[0]];
  const tip: Pt = [x1 + t[0] * 4, y1 + t[1] * 4];
  const b1: Pt = [x1 - t[0] * h + n[0] * (h / 2), y1 - t[1] * h + n[1] * (h / 2)];
  const b2: Pt = [x1 - t[0] * h - n[0] * (h / 2), y1 - t[1] * h - n[1] * (h / 2)];
  return (
    <g className={cls}>
      <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 ${cw ? 1 : 0} ${x1} ${y1}`} fill="none" stroke={color} strokeWidth={3} />
      <path d={`M ${tip[0]} ${tip[1]} L ${b1[0]} ${b1[1]} L ${b2[0]} ${b2[1]} Z`} fill={color} />
    </g>
  );
}

/** Vertical contact, terminals at (x, y−30) and (x, y+30). */
function Contact({
  x,
  y,
  nc = false,
  push = false,
  thermal = false,
  main = false,
  breaker = false,
  closed = false,
}: {
  x: number;
  y: number;
  nc?: boolean;
  push?: boolean;
  thermal?: boolean;
  main?: boolean;
  breaker?: boolean;
  closed?: boolean;
}) {
  const blade = nc ? `M ${x} ${y + 12} L ${x + 17} ${y - 15}` : closed ? `M ${x} ${y + 12} L ${x - 3} ${y - 12}` : `M ${x} ${y + 12} L ${x - 15} ${y - 14}`;
  const mid: Pt = nc ? [x + 8, y - 1] : [x - 7, y - 1];
  return (
    <g>
      <line x1={x} y1={y - 30} x2={x} y2={y - 12} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y + 30} x2={x} y2={y + 12} stroke={INK} strokeWidth={3} />
      {nc ? <line x1={x} y1={y - 12} x2={x + 16} y2={y - 12} stroke={INK} strokeWidth={3} /> : null}
      <path d={blade} stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
      {main ? <path d={`M ${x - 6} ${y - 12} A 6 6 0 0 0 ${x + 6} ${y - 12}`} fill="none" stroke={INK} strokeWidth={2.5} /> : null}
      {breaker ? (
        <g stroke={INK} strokeWidth={2.5}>
          <line x1={x - 6} y1={y - 18} x2={x + 6} y2={y - 6} />
          <line x1={x - 6} y1={y - 6} x2={x + 6} y2={y - 18} />
        </g>
      ) : null}
      {push ? (
        <g stroke={INK} strokeWidth={2.5} fill="none">
          <line x1={mid[0]} y1={mid[1]} x2={x - 34} y2={mid[1]} strokeDasharray="5 4" />
          <path d={`M ${x - 28} ${mid[1] - 10} L ${x - 34} ${mid[1] - 10} L ${x - 34} ${mid[1] + 10} L ${x - 28} ${mid[1] + 10}`} />
        </g>
      ) : null}
      {thermal ? (
        <g stroke={INK} strokeWidth={2.5} fill="none">
          <line x1={mid[0]} y1={mid[1]} x2={x - 30} y2={mid[1]} strokeDasharray="5 4" />
          <path d={`M ${x - 30} ${mid[1] - 8} h -8 v 16 h -8`} />
        </g>
      ) : null}
    </g>
  );
}

/** Coil (relay/contactor) rectangle, terminals at (x, y−15−12) and (x, y+15+12). */
function Coil({ x, y, w = 56, h = 30 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <line x1={x} y1={y - h / 2 - 12} x2={x} y2={y - h / 2} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y + h / 2} x2={x} y2={y + h / 2 + 12} stroke={INK} strokeWidth={3} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={BG} stroke={INK} strokeWidth={3} />
    </g>
  );
}

/** Vertical fuse, terminals at (x, y−30) and (x, y+30). */
function FuseV({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 9} y={y - 20} width={18} height={40} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y - 30} x2={x} y2={y + 30} stroke={INK} strokeWidth={2.5} />
    </g>
  );
}

/** Overload-relay thermal element (heater), terminals at (x, y−30) and (x, y+30). */
function OLHeater({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y - 30} x2={x} y2={y - 18} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y + 18} x2={x} y2={y + 30} stroke={INK} strokeWidth={3} />
      <rect x={x - 12} y={y - 18} width={24} height={36} fill={BG} stroke={INK} strokeWidth={3} />
      <path d={`M ${x} ${y - 18} v 8 h -6 v 12 h 6 v 16`} fill="none" stroke={INK} strokeWidth={2.5} />
    </g>
  );
}

function Box({ x, y, w, h, children, tone, size = 22, weight = 600 }: { x: number; y: number; w: number; h: number; children: ReactNode; tone?: "accent" | "plain"; size?: number; weight?: number }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={tone === "accent" ? "var(--fig-accent-soft)" : PANEL}
        stroke={tone === "accent" ? "var(--fig-accent)" : INK}
        strokeWidth={tone === "accent" ? 3.5 : 2.5}
      />
      <Label x={x + w / 2} y={y + h / 2 + 1} size={size} weight={weight}>
        {children}
      </Label>
    </g>
  );
}

function Leader({ from, to }: { from: Pt; to: Pt }) {
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={MUTED} strokeWidth={1.8} />
      <circle cx={to[0]} cy={to[1]} r={3.5} fill={MUTED} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// W16-F01 Motor classification
// ---------------------------------------------------------------------------
function Classification() {
  const cols = [
    { x: 8, title: "1 เฟส 230 V", items: ["สปลิตเฟส", "คาปาซิเตอร์", "เชดเดดโพล", "ยูนิเวอร์แซล"] },
    { x: 154, title: "3 เฟส 400 V", items: ["เหนี่ยวนำ", "(induction)", "ปั๊ม สายพาน"] },
    { x: 308, title: "แม่เหล็กถาวร", items: ["PMDC", "ของเล่น", "พัดลม DC", "หุ่นยนต์"], accent: true },
    { x: 454, title: "ขดลวดสนาม", items: ["อนุกรม", "ขนาน", "ผสม", "กระตุ้นแยก"] },
  ];
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <Wire points={[[300, 64], [300, 82], [150, 82], [150, 100]]} width={2.5} />
      <Wire points={[[300, 82], [450, 82], [450, 100]]} width={2.5} />
      <Wire points={[[150, 148], [150, 166], [77, 166], [77, 184]]} width={2.5} />
      <Wire points={[[150, 166], [223, 166], [223, 184]]} width={2.5} />
      <Wire points={[[450, 148], [450, 166], [377, 166], [377, 184]]} width={2.5} />
      <Wire points={[[450, 166], [523, 166], [523, 184]]} width={2.5} />
      <Box x={150} y={14} w={300} h={50} size={24} weight={700}>มอเตอร์ไฟฟ้า (motor)</Box>
      <Box x={20} y={100} w={260} h={48}>กระแสสลับ (AC)</Box>
      <Box x={320} y={100} w={260} h={48}>กระแสตรง (DC)</Box>
      {cols.map((c) => (
        <g key={c.title}>
          <Box x={c.x} y={184} w={138} h={46} size={20} tone={c.accent ? "accent" : "plain"}>
            {c.title}
          </Box>
          {c.items.map((it, i) => (
            <Label key={it} x={c.x + 69} y={262 + i * 32} size={20} weight={c.accent && i === 0 ? 700 : 500} muted={!c.accent && c.x === 154 && i === 2}>
              {it}
            </Label>
          ))}
        </g>
      ))}
      <Label x={377} y={392} size={20} color="var(--fig-accent)" weight={700}>★ สัปดาห์นี้</Label>
      <Label x={300} y={424} size={20} muted>มอเตอร์ AC ตัวถังโลหะต้องต่อสายดิน (PE) เสมอ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F02 PMDC cutaway (8 labelled parts) — hotspot coordinates in week file
// ---------------------------------------------------------------------------
function PmdcCutaway() {
  const laminations = [];
  for (let x = 250; x <= 410; x += 10) laminations.push(<line key={x} x1={x} y1={174} x2={x} y2={296} stroke="var(--fig-grid)" strokeWidth={1.5} />);
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      <style>{`.w16f02-rot{stroke-dasharray:10 8;animation:w16f02-spin 2.4s linear infinite}@keyframes w16f02-spin{to{stroke-dashoffset:-36}}`}</style>
      {/* shaft */}
      <rect x={40} y={226} width={535} height={18} rx={4} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      {/* housing / yoke walls */}
      <rect x={130} y={120} width={340} height={230} fill="none" stroke={INK} strokeWidth={3} />
      <rect x={130} y={120} width={340} height={12} fill="var(--fig-grid)" stroke={INK} strokeWidth={2} />
      <rect x={130} y={338} width={340} height={12} fill="var(--fig-grid)" stroke={INK} strokeWidth={2} />
      {/* permanent magnets */}
      <rect x={215} y={132} width={230} height={30} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={2.5} />
      <Label x={330} y={148} size={22} weight={700} color="var(--fig-danger)">N</Label>
      <rect x={215} y={308} width={230} height={30} fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={2.5} />
      <Label x={330} y={324} size={22} weight={700} color="var(--fig-accent)">S</Label>
      {/* armature core (laminated) */}
      <rect x={240} y={172} width={180} height={126} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      {laminations}
      <rect x={240} y={182} width={180} height={12} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2} />
      <rect x={240} y={276} width={180} height={12} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2} />
      <rect x={226} y={178} width={14} height={114} rx={6} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      <rect x={420} y={178} width={14} height={114} rx={6} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      {/* commutator */}
      <rect x={160} y={205} width={45} height={60} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      {[218, 235, 252].map((y) => (
        <line key={y} x1={160} y1={y} x2={205} y2={y} stroke={INK} strokeWidth={2} />
      ))}
      <Wire points={[[205, 210], [226, 192]]} color="var(--fig-copper)" width={2.5} />
      <Wire points={[[205, 260], [226, 278]]} color="var(--fig-copper)" width={2.5} />
      {/* brushes + springs */}
      <rect x={170} y={172} width={25} height={33} fill={MUTED} stroke={INK} strokeWidth={2} />
      <rect x={170} y={265} width={25} height={33} fill={MUTED} stroke={INK} strokeWidth={2} />
      <path d="M 182 136 l 8 4 l -16 6 l 16 6 l -16 6 l 16 6 l -8 4 v 4" fill="none" stroke={INK} strokeWidth={2} />
      <path d="M 182 334 l 8 -4 l -16 -6 l 16 -6 l -16 -6 l 16 -6 l -8 -4 v -4" fill="none" stroke={INK} strokeWidth={2} />
      {/* end caps with bushing / bearing */}
      <rect x={105} y={150} width={25} height={170} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={105} y={220} width={25} height={30} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2} />
      <rect x={470} y={150} width={25} height={170} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={472} y={210} width={21} height={50} fill={BG} stroke={INK} strokeWidth={2} />
      <circle cx={482.5} cy={218} r={6} fill={MUTED} />
      <circle cx={482.5} cy={252} r={6} fill={MUTED} />
      {/* terminals */}
      <rect x={82} y={160} width={23} height={16} fill={BG} stroke={INK} strokeWidth={2.5} />
      <rect x={82} y={294} width={23} height={16} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={70} y={168} size={22} weight={700} color="var(--fig-plus)">+</Label>
      <Label x={70} y={302} size={22} weight={700}>−</Label>
      <Wire points={[[105, 168], [150, 168], [170, 186]]} width={2} />
      <Wire points={[[105, 302], [150, 302], [170, 284]]} width={2} />
      {/* rotation indicator */}
      <path className="w16f02-rot" d="M 548 214 A 16 22 0 1 1 548 256" fill="none" stroke="var(--fig-accent)" strokeWidth={3} />
      <path d="M 548 256 l 10 -2 l -6 10 z" fill="var(--fig-accent)" />
      {/* labels */}
      <Label x={110} y={30} size={20}>⑤ แปรงถ่าน + สปริง</Label>
      <Leader from={[150, 44]} to={[182, 138]} />
      <Label x={480} y={30} size={20}>① โครง/เปลือก (yoke)</Label>
      <Leader from={[465, 44]} to={[455, 125]} />
      <Label x={330} y={78} size={20}>② แม่เหล็กถาวร (สเตเตอร์)</Label>
      <Leader from={[330, 92]} to={[300, 140]} />
      <Label x={100} y={398} size={20}>④ คอมมิวเตเตอร์</Label>
      <Leader from={[110, 384]} to={[165, 258]} />
      <Label x={320} y={398} size={20}>③ อาร์เมเจอร์ (โรเตอร์)</Label>
      <Leader from={[320, 384]} to={[320, 292]} />
      <Label x={515} y={398} size={20}>⑦ ลูกปืน/บูช</Label>
      <Leader from={[505, 384]} to={[483, 256]} />
      <Label x={110} y={446} size={20}>⑧ ขั้วต่อ + / −</Label>
      <Leader from={[90, 432]} to={[93, 310]} />
      <Label x={480} y={446} size={20}>⑥ เพลา (shaft)</Label>
      <Leader from={[540, 432]} to={[560, 244]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F03 Force on a conductor + Fleming's left-hand rule
// ---------------------------------------------------------------------------
function FieldPoles({ x0 = 20, x1 = 250, y = 80, h = 180 }: { x0?: number; x1?: number; y?: number; h?: number }) {
  return (
    <g>
      <rect x={x0} y={y} width={60} height={h} rx={6} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={3} />
      <Label x={x0 + 30} y={y + h / 2} size={30} weight={700} color="var(--fig-danger)">N</Label>
      <rect x={x1} y={y} width={60} height={h} rx={6} fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={3} />
      <Label x={x1 + 30} y={y + h / 2} size={30} weight={700} color="var(--fig-accent)">S</Label>
    </g>
  );
}

function ConductorDot({ x, y, out }: { x: number; y: number; out: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={22} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={3} />
      {out ? (
        <circle cx={x} cy={y} r={5} fill={INK} />
      ) : (
        <g stroke={INK} strokeWidth={3}>
          <line x1={x - 11} y1={y - 11} x2={x + 11} y2={y + 11} />
          <line x1={x - 11} y1={y + 11} x2={x + 11} y2={y - 11} />
        </g>
      )}
    </g>
  );
}

function FieldLines({ cx = 165, cy = 170 }: { cx?: number; cy?: number }) {
  const F = "var(--fig-field)";
  return (
    <g>
      <Arrow from={[86, 100]} to={[244, 100]} color={F} width={2.5} />
      <Arrow from={[86, 240]} to={[244, 240]} color={F} width={2.5} />
      <Arrow from={[86, cy]} to={[cx - 28, cy]} color={F} width={2.5} />
      <Arrow from={[cx + 28, cy]} to={[244, cy]} color={F} width={2.5} />
    </g>
  );
}

function ForceRule() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <FieldPoles />
      <FieldLines />
      <Label x={225} y={80} size={22} weight={700} color="var(--fig-field)">B</Label>
      <ConductorDot x={165} y={170} out />
      <Arrow from={[165, 144]} to={[165, 40]} color="var(--fig-current)" width={4} head={16} />
      <Label x={190} y={46} size={24} weight={700} color="var(--fig-current)" anchor="start">F</Label>
      <Label x={165} y={290} size={20}>⊙ กระแส I พุ่งออกจากกระดาษ</Label>
      <Label x={165} y={318} size={20} muted>⊗ = พุ่งเข้า (แรงจะกลับทิศเป็นลง)</Label>
      {/* left-hand rule axes */}
      <line x1={345} y1={20} x2={345} y2={330} stroke="var(--fig-grid)" strokeWidth={2} />
      <Label x={472} y={32} size={22} weight={700}>กฎมือซ้าย (Fleming)</Label>
      <Arrow from={[430, 220]} to={[430, 80]} color="var(--fig-current)" width={4} head={16} />
      <Label x={446} y={92} size={20} anchor="start">นิ้วโป้ง = แรง F</Label>
      <Arrow from={[430, 220]} to={[575, 220]} color="var(--fig-field)" width={4} head={16} />
      <Label x={575} y={196} size={20} anchor="end">นิ้วชี้ = สนาม B</Label>
      <Arrow from={[430, 220]} to={[380, 280]} color={INK} width={4} head={16} />
      <Label x={398} y={308} size={20} anchor="start">นิ้วกลาง = กระแส I</Label>
      <Node x={430} y={220} r={6} />
    </svg>
  );
}

/** W16-F16 Predict figure: conductor ⊗ in field, F unknown. */
function ForceQuestion() {
  return (
    <svg viewBox="0 0 600 300" aria-hidden="true">
      <FieldPoles y={60} />
      <g transform="translate(0 -20)">
        <FieldLines />
      </g>
      <Label x={225} y={64} size={22} weight={700} color="var(--fig-field)">B</Label>
      <ConductorDot x={165} y={150} out={false} />
      <Label x={165} y={272} size={20}>⊗ กระแส I พุ่งเข้าในกระดาษ</Label>
      <Callout x={350} y={90} w={230} h={120} tone="info">
        <Label x={465} y={130} size={24} weight={700}>แรง F = ?</Label>
        <Label x={465} y={172} size={20} muted>ใช้กฎมือซ้าย</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F04 Single loop + split-ring commutator, 4 positions
// ---------------------------------------------------------------------------
function LoopPanel({ ox, oy, angle, caption, caption2 }: { ox: number; oy: number; angle: number; caption: string; caption2: string }) {
  const cx = ox + 150;
  const cy = oy + 100;
  const r = 62;
  const rad = (angle * Math.PI) / 180;
  // side "a" starts at the left (0°) and moves clockwise on screen
  const ax = cx - r * Math.cos(rad);
  const ay = cy - r * Math.sin(rad);
  const bx = cx + r * Math.cos(rad);
  const by = cy + r * Math.sin(rad);
  const neutral = angle % 180 !== 0;
  // current: whichever side is on the LEFT carries ⊙ (out), right side ⊗ (in) — commutator keeps it so
  const aOut = angle === 0 ? true : angle === 180 ? false : true;
  const bOut = !aOut;
  const conductor = (x: number, y: number, out: boolean, name: string, showI: boolean) => (
    <g>
      <circle cx={x} cy={y} r={14} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      {showI ? (
        out ? (
          <circle cx={x} cy={y} r={4} fill={INK} />
        ) : (
          <g stroke={INK} strokeWidth={2.5}>
            <line x1={x - 7} y1={y - 7} x2={x + 7} y2={y + 7} />
            <line x1={x - 7} y1={y + 7} x2={x + 7} y2={y - 7} />
          </g>
        )
      ) : null}
      <Label x={x + (x < cx ? -24 : x > cx ? 24 : 26)} y={y + (y < cy ? -14 : y > cy ? 14 : -22)} size={20} weight={700}>
        {name}
      </Label>
    </g>
  );
  // commutator split orientation: gaps perpendicular to coil plane
  const gapAngle = angle + 90;
  const gr = (gapAngle * Math.PI) / 180;
  const cr = 16;
  const gx = cr * Math.cos(gr);
  const gy = cr * Math.sin(gr);
  return (
    <g>
      <rect x={ox + 6} y={oy + 40} width={30} height={120} rx={4} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={2} />
      <Label x={ox + 21} y={oy + 100} size={20} weight={700} color="var(--fig-danger)">N</Label>
      <rect x={ox + 264} y={oy + 40} width={30} height={120} rx={4} fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={2} />
      <Label x={ox + 279} y={oy + 100} size={20} weight={700} color="var(--fig-accent)">S</Label>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--fig-grid)" strokeWidth={2} strokeDasharray="6 5" />
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="var(--fig-copper)" strokeWidth={2} strokeDasharray="4 4" />
      {/* commutator halves */}
      <circle cx={cx} cy={cy} r={cr} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      <line x1={cx - gx} y1={cy - gy} x2={cx + gx} y2={cy + gy} stroke={BG} strokeWidth={5} />
      {/* brushes left (+) and right (−) */}
      <rect x={cx - cr - 12} y={cy - 6} width={12} height={12} fill={MUTED} />
      <rect x={cx + cr} y={cy - 6} width={12} height={12} fill={MUTED} />
      {conductor(ax, ay, aOut, "a", !neutral)}
      {conductor(bx, by, bOut, "b", !neutral)}
      {!neutral ? (
        <g>
          <Arrow from={[Math.min(ax, bx), cy - 18]} to={[Math.min(ax, bx), cy - 50]} color="var(--fig-current)" width={3} head={11} />
          <Arrow from={[Math.max(ax, bx), cy + 18]} to={[Math.max(ax, bx), cy + 50]} color="var(--fig-current)" width={3} head={11} />
        </g>
      ) : null}
      <Label x={cx} y={oy + 196} size={20} weight={700}>{caption}</Label>
      <Label x={cx} y={oy + 222} size={20} muted>{caption2}</Label>
    </g>
  );
}

function CommutatorSteps() {
  return (
    <svg viewBox="0 0 600 500" aria-hidden="true">
      <LoopPanel ox={0} oy={6} angle={0} caption="0° แรงบิดสูงสุด" caption2="a ⊙ ขึ้น · b ⊗ ลง" />
      <LoopPanel ox={300} oy={6} angle={90} caption="90° แนวกลาง" caption2="แปรงคร่อมร่อง → สลับ" />
      <LoopPanel ox={0} oy={256} angle={180} caption="180° กระแสใน a กลับทิศ" caption2="แต่แรงบิดทิศเดิม" />
      <LoopPanel ox={300} oy={256} angle={270} caption="270° แนวกลางอีกครั้ง" caption2="สลับ → หมุนต่อเนื่อง" />
      <line x1={300} y1={10} x2={300} y2={490} stroke="var(--fig-grid)" strokeWidth={2} />
      <line x1={10} y1={250} x2={590} y2={250} stroke="var(--fig-grid)" strokeWidth={2} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F05 Armature line drawing
// ---------------------------------------------------------------------------
function Armature() {
  const lams = [];
  for (let x = 206; x <= 414; x += 8) lams.push(<line key={x} x1={x} y1={82} x2={x} y2={218} stroke="var(--fig-grid)" strokeWidth={1.5} />);
  return (
    <svg viewBox="0 0 600 300" aria-hidden="true">
      <rect x={20} y={142} width={560} height={16} rx={4} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={200} y={80} width={220} height={140} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      {lams}
      {[92, 120, 172, 200].map((y) => (
        <rect key={y} x={200} y={y} width={220} height={9} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2} />
      ))}
      <rect x={186} y={86} width={14} height={128} rx={6} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      <rect x={420} y={86} width={14} height={128} rx={6} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      <rect x={90} y={112} width={60} height={76} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      {[127, 142, 158, 173].map((y) => (
        <line key={y} x1={90} y1={y} x2={150} y2={y} stroke={INK} strokeWidth={2} />
      ))}
      {[118, 135, 165, 182].map((y, i) => (
        <Wire key={y} points={[[150, y], [186, [96, 124, 176, 204][i]]]} color="var(--fig-copper)" width={2.5} />
      ))}
      <Label x={120} y={30} size={20}>คอมมิวเตเตอร์</Label>
      <Label x={120} y={56} size={20} muted>(commutator)</Label>
      <Leader from={[120, 70]} to={[120, 114]} />
      <Label x={330} y={30} size={20}>แกนอาร์เมเจอร์</Label>
      <Label x={330} y={56} size={20} muted>แผ่นเหล็กบางอัดซ้อน</Label>
      <Leader from={[330, 70]} to={[330, 86]} />
      <Label x={110} y={262} size={20}>ฉนวนไมกาคั่นซี่</Label>
      <Leader from={[110, 248]} to={[120, 175]} />
      <Label x={330} y={262} size={20}>ขดลวดอาร์เมเจอร์ (ในร่อง)</Label>
      <Leader from={[380, 248]} to={[426, 210]} />
      <Label x={530} y={262} size={20}>เพลา (shaft)</Label>
      <Leader from={[530, 248]} to={[530, 158]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F06 Equivalent circuit + speed/voltage and current/load graphs (lab model)
// ---------------------------------------------------------------------------
function Graph({ ox, oy, w, h, pts, xLab, yLab, title, notes }: { ox: number; oy: number; w: number; h: number; pts: Pt[]; xLab: string; yLab: string; title: string; notes: { x: number; y: number; t: string; anchor?: "start" | "end" | "middle" }[] }) {
  return (
    <g>
      <Label x={ox + w / 2} y={oy - h - 30} size={22} weight={700}>{title}</Label>
      <line x1={ox} y1={oy} x2={ox + w} y2={oy} stroke={INK} strokeWidth={2.5} />
      <line x1={ox} y1={oy} x2={ox} y2={oy - h} stroke={INK} strokeWidth={2.5} />
      <path d={`M ${ox + w} ${oy} l -10 -5 v 10 z M ${ox} ${oy - h} l -5 10 h 10 z`} fill={INK} />
      <Wire points={pts} color="var(--fig-accent)" width={3.5} />
      {pts.map(([x, y], i) => (i > 0 ? <circle key={i} cx={x} cy={y} r={5} fill="var(--fig-accent)" /> : null))}
      <Label x={ox + w} y={oy + 22} size={20} anchor="end">{xLab}</Label>
      <Label x={ox + 10} y={oy - h + 4} size={20} anchor="start">{yLab}</Label>
      {notes.map((n) => (
        <Label key={n.t} x={n.x} y={n.y} size={20} anchor={n.anchor ?? "middle"} muted>
          {n.t}
        </Label>
      ))}
    </g>
  );
}

/** "E" with subscript text, legible size (main 24, subscript 20). */
function SubLabel({ x, y, main, sub, rest, anchor = "start", color = INK }: { x: number; y: number; main: string; sub: string; rest?: string; anchor?: "start" | "middle" | "end"; color?: string }) {
  return (
    <text x={x} y={y} fontSize={24} fontWeight={700} textAnchor={anchor} dominantBaseline="middle" fill={color}>
      {main}
      <tspan fontSize={20} dy={6}>{sub}</tspan>
      {rest ? <tspan dy={-6}>{rest}</tspan> : null}
    </text>
  );
}

function EquivalentCircuit() {
  // Lab model: k = 0.02 V·s/rad, Ra = 2 Ω, Tf = 0.005 N·m → no-load I = 0.25 A, ω = (V − 0.5)/0.02
  const sx = (v: number) => 60 + (v / 12) * 200;
  const sy = (w: number) => 460 - (w / 600) * 125;
  const speed: Pt[] = [[sx(0.5), sy(0)], [sx(3), sy(125)], [sx(6), sy(275)], [sx(9), sy(425)], [sx(12), sy(575)]];
  const cx = (t: number) => 360 + (t / 0.05) * 200;
  const cy = (i: number) => 460 - (i / 3) * 125;
  const cur: Pt[] = [[cx(0), cy(0.25)], [cx(0.02), cy(1.25)], [cx(0.05), cy(2.75)]];
  return (
    <svg viewBox="0 0 600 490" aria-hidden="true">
      {/* source */}
      <Battery x={80} y={120} angle={90} />
      <Label x={36} y={110} size={22} weight={700}>V</Label>
      <Label x={36} y={136} size={20} muted>12 V</Label>
      <Wire points={[[80, 90], [80, 50], [260, 50]]} />
      <Wire points={[[80, 150], [80, 190], [430, 190], [430, 150]]} />
      <Arrow from={[110, 28]} to={[170, 28]} />
      <SubLabel x={180} y={28} main="I" sub="a" />
      {/* motor model inside dashed box */}
      <rect x={210} y={14} width={376} height={200} rx={10} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="8 6" />
      <Label x={398} y={232} size={20} muted>ภายในมอเตอร์ (แบบจำลอง)</Label>
      <Resistor x={300} y={50} />
      <SubLabel x={300} y={86} main="R" sub="a" rest=" = 2 Ω" anchor="middle" />
      <Wire points={[[340, 50], [430, 50], [430, 90]]} />
      <DCSource x={430} y={120} angle={90} />
      <SubLabel x={470} y={106} main="E" sub="b" rest=" = kω" />
      <Label x={470} y={140} size={20} anchor="start" muted>ต้านกลับ</Label>
      <text x={300} y={264} fontSize={24} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={INK}>
        V = E<tspan fontSize={20} dy={6}>b</tspan>
        <tspan dy={-6}> + I</tspan>
        <tspan fontSize={20} dy={6}>a</tspan>
        <tspan dy={-6}>R</tspan>
        <tspan fontSize={20} dy={6}>a</tspan>
      </text>
      <Graph ox={60} oy={460} w={210} h={125} pts={speed} xLab="V (V)" yLab="ω" title="ความเร็ว ∝ แรงดัน" notes={[{ x: 82, y: 356, t: "575 rad/s", anchor: "start" }]} />
      <Graph ox={360} oy={460} w={210} h={125} pts={cur} xLab="ภาระ T" yLab="I" title="กระแส ∝ ภาระ" notes={[{ x: 558, y: 442, t: "0.25 → 2.75 A", anchor: "end" }]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F07 Reversing direction for three motor types
// ---------------------------------------------------------------------------
function MiniDC({ x, y, swap, cw, note, ok }: { x: number; y: number; swap: boolean; cw: boolean; note: string; ok?: boolean }) {
  // battery vertical at x, motor at x+150
  const top = y - 40;
  const bot = y + 40;
  return (
    <g>
      <Battery x={x} y={y} angle={swap ? -90 : 90} />
      <Wire points={[[x, y - 30], [x, top], [x + 150, top], [x + 150, y - 24]]} color={swap ? "var(--fig-wire-n)" : "var(--fig-wire-l)"} />
      <Wire points={[[x, y + 30], [x, bot], [x + 150, bot], [x + 150, y + 24]]} color={swap ? "var(--fig-wire-l)" : "var(--fig-wire-n)"} />
      <MotorSym x={x + 150} y={y} r={24} />
      <RotArrow cx={x + 150} cy={y} r={36} cw={cw} />
      <Label x={x + 75} y={y + 66} size={20} weight={600} color={ok === undefined ? INK : ok ? "var(--fig-ok)" : "var(--fig-danger)"}>
        {note}
      </Label>
    </g>
  );
}

function MiniShunt({ x, y, swapSupply, swapArm, cw, note, ok }: { x: number; y: number; swapSupply: boolean; swapArm: boolean; cw: boolean; note: string; ok: boolean }) {
  const top = y - 44;
  const bot = y + 44;
  const X = "var(--fig-current)";
  return (
    <g>
      <Battery x={x} y={y} angle={swapSupply ? -90 : 90} />
      <Wire points={[[x, y - 30], [x, top], [x + 140, top]]} />
      <Wire points={[[x, y + 30], [x, bot], [x + 140, bot]]} />
      <Inductor x={x + 80} y={y} angle={90} turns={4} />
      <Wire points={[[x + 80, top], [x + 80, y - 40]]} />
      <Wire points={[[x + 80, y + 40], [x + 80, bot]]} />
      <Node x={x + 80} y={top} r={4} />
      <Node x={x + 80} y={bot} r={4} />
      <Label x={x + 58} y={y} size={20} anchor="end" muted>F</Label>
      {swapArm ? (
        <g>
          <Wire points={[[x + 140, top], [x + 170, bot]]} color={X} />
          <Wire points={[[x + 140, bot], [x + 170, top]]} color={X} />
        </g>
      ) : (
        <g>
          <Wire points={[[x + 140, top], [x + 170, top]]} />
          <Wire points={[[x + 140, bot], [x + 170, bot]]} />
        </g>
      )}
      <Wire points={[[x + 170, top], [x + 200, top], [x + 200, y - 20]]} />
      <Wire points={[[x + 170, bot], [x + 200, bot], [x + 200, y + 20]]} />
      <circle cx={x + 200} cy={y} r={20} fill={BG} stroke={INK} strokeWidth={3} />
      <Label x={x + 200} y={y + 1} size={20} weight={700}>A</Label>
      <RotArrow cx={x + 200} cy={y} r={32} cw={cw} />
      <Label x={x + 110} y={y + 70} size={20} weight={600} color={ok ? "var(--fig-ok)" : "var(--fig-danger)"}>
        {note}
      </Label>
    </g>
  );
}

function Mini3Ph({ x, y, swap, cw, note, ok }: { x: number; y: number; swap: boolean; cw: boolean; note: string; ok?: boolean }) {
  const cols = ["var(--fig-wire-l)", "var(--fig-wire-l2)", "var(--fig-wire-l3)"];
  const names = ["L1", "L2", "L3"];
  const mx = x + 170;
  const ends = [y - 18, y, y + 18];
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const src = y - 30 + i * 30;
        const dst = swap ? ends[2 - i] : ends[i];
        return (
          <g key={i}>
            <Label x={x - 4} y={src} size={20} anchor="end">{names[i]}</Label>
            <Wire points={[[x + 4, src], [x + 70, src], [x + 120, dst], [mx - 30, dst]]} color={cols[i]} width={4} />
          </g>
        );
      })}
      <MotorSym x={mx} y={y} r={28} kind="ac3" />
      <RotArrow cx={mx} cy={y} r={40} cw={cw} />
      <Label x={x + 90} y={y + 70} size={20} weight={600} color={ok === undefined ? INK : ok ? "var(--fig-ok)" : "var(--fig-danger)"}>
        {note}
      </Label>
    </g>
  );
}

function Reversing() {
  return (
    <svg viewBox="0 0 600 600" aria-hidden="true">
      <Label x={14} y={24} size={22} weight={700} anchor="start">① แม่เหล็กถาวร (PMDC): สลับขั้วแหล่งจ่าย</Label>
      <MiniDC x={50} y={110} swap={false} cw note="เดิม: ตามเข็ม" />
      <MiniDC x={350} y={110} swap cw={false} note="สลับขั้ว: ทวนเข็ม ✓" ok />
      <line x1={10} y1={200} x2={590} y2={200} stroke="var(--fig-grid)" strokeWidth={2} />
      <Label x={14} y={224} size={22} weight={700} anchor="start">② ขดลวดสนามแบบขนาน (shunt) — เดิมหมุนตามเข็ม</Label>
      <MiniShunt x={40} y={310} swapSupply swapArm={false} cw note="สลับขั้วแหล่งจ่าย: ทิศเดิม ✗" ok={false} />
      <MiniShunt x={340} y={310} swapSupply={false} swapArm cw={false} note="สลับเฉพาะอาร์เมเจอร์ A ✓" ok />
      <line x1={10} y1={400} x2={590} y2={400} stroke="var(--fig-grid)" strokeWidth={2} />
      <Label x={14} y={424} size={22} weight={700} anchor="start">③ มอเตอร์ 3 เฟส: สลับ 2 สาย (L1 ↔ L3)</Label>
      <Mini3Ph x={50} y={510} swap={false} cw note="เดิม: ตามเข็ม" />
      <Mini3Ph x={350} y={510} swap cw={false} note="L1↔L3: ทวนเข็ม ✓" ok />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F08 H-bridge (lab numbering: S1 high-left, S2 low-left, S3 high-right, S4 low-right)
// ---------------------------------------------------------------------------
function HBridge() {
  const L = 140;
  const R = 380;
  const cur = "var(--fig-current)";
  const flyback = (x: number, y: number, side: -1 | 1) => {
    const dx = x + side * 52;
    return (
      <g>
        <Diode x={dx} y={y} angle={-90} />
        <Wire points={[[dx, y - 30], [dx, y - 48], [x, y - 48]]} width={2.5} />
        <Wire points={[[dx, y + 30], [dx, y + 48], [x, y + 48]]} width={2.5} />
        <Node x={x} y={y - 48} r={4} />
        <Node x={x} y={y + 48} r={4} />
      </g>
    );
  };
  const rows: [string, string, boolean][] = [
    ["S1 + S4", "เดินหน้า (ตามเข็ม)", false],
    ["S3 + S2", "ถอยหลัง (ทวนเข็ม)", false],
    ["S2 + S4", "เบรก (ลัดขั้วมอเตอร์)", false],
    ["ปิดทั้งหมด", "หมุนอิสระ (coast)", false],
    ["S1+S2 / S3+S4", "✗ ลัดวงจร shoot-through", true],
  ];
  return (
    <svg viewBox="0 0 600 580" aria-hidden="true">
      <Label x={30} y={26} size={22} weight={700} anchor="start" color="var(--fig-plus)">+12 V</Label>
      <Wire points={[[88, 50], [520, 50], [520, 95]]} />
      <rect x={511} y={95} width={18} height={40} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={520} y1={95} x2={520} y2={135} stroke={INK} strokeWidth={2.5} />
      <Label x={540} y={115} size={20} anchor="start">F</Label>
      <Wire points={[[520, 135], [520, 160]]} />
      <Battery x={520} y={190} angle={90} />
      <Wire points={[[520, 220], [520, 330], [88, 330]]} />
      <Label x={30} y={352} size={22} weight={700} anchor="start">0 V</Label>
      {/* left leg */}
      <Wire points={[[L, 50], [L, 80]]} />
      <SwitchSym x={L} y={120} angle={90} closed label="S1" />
      <Wire points={[[L, 160], [L, 220]]} />
      <SwitchSym x={L} y={260} angle={90} label="S2" />
      <Wire points={[[L, 300], [L, 330]]} />
      {/* right leg */}
      <Wire points={[[R, 50], [R, 80]]} />
      <SwitchSym x={R} y={120} angle={90} label="S3" labelSide="b" />
      <Wire points={[[R, 160], [R, 220]]} />
      <SwitchSym x={R} y={260} angle={90} closed label="S4" labelSide="b" />
      <Wire points={[[R, 300], [R, 330]]} />
      {/* flyback diodes, cathode toward +12 V */}
      {flyback(L, 120, -1)}
      {flyback(L, 260, -1)}
      {flyback(R, 120, 1)}
      {flyback(R, 260, 1)}
      <Wire points={[[88, 72], [88, 50]]} width={2.5} />
      <Wire points={[[88, 308], [88, 330]]} width={2.5} />
      <Wire points={[[432, 72], [432, 50]]} width={2.5} />
      <Wire points={[[432, 308], [432, 330]]} width={2.5} />
      {/* motor */}
      <Wire points={[[L, 190], [234, 190]]} />
      <Wire points={[[286, 190], [R, 190]]} />
      <Node x={L} y={190} />
      <Node x={R} y={190} />
      <MotorSym x={260} y={190} />
      <RotArrow cx={260} cy={190} r={38} cw />
      {/* forward current path */}
      <Arrow from={[160, 66]} to={[160, 92]} color={cur} width={3} head={10} />
      <Arrow from={[180, 214]} to={[226, 214]} color={cur} width={3} head={10} />
      <Arrow from={[298, 214]} to={[344, 214]} color={cur} width={3} head={10} />
      <Arrow from={[360, 290]} to={[360, 316]} color={cur} width={3} head={10} />
      <Label x={260} y={244} size={20} color={cur} weight={600}>I (เดินหน้า)</Label>
      {/* state table */}
      <rect x={20} y={378} width={560} height={196} rx={8} fill={PANEL} stroke={INK} strokeWidth={2} />
      {rows.map(([on, res, bad], i) => (
        <g key={on}>
          {i > 0 ? <line x1={20} y1={378 + i * 39} x2={580} y2={378 + i * 39} stroke="var(--fig-grid)" strokeWidth={1.5} /> : null}
          <Label x={36} y={398 + i * 39} size={20} anchor="start" weight={700} color={bad ? "var(--fig-danger)" : INK}>
            {on}
          </Label>
          <Label x={250} y={398 + i * 39} size={20} anchor="start" color={bad ? "var(--fig-danger)" : INK} weight={bad ? 700 : 500}>
            {res}
          </Label>
        </g>
      ))}
      <line x1={232} y1={378} x2={232} y2={574} stroke="var(--fig-grid)" strokeWidth={1.5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F09 PWM waveforms
// ---------------------------------------------------------------------------
function PwmWaves() {
  const rows = [
    { d: 0.25, y0: 130 },
    { d: 0.5, y0: 280 },
    { d: 0.75, y0: 440 },
  ];
  const H = 80;
  const x0 = 170;
  const T = 90;
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      <Label x={300} y={22} size={22} weight={700}>แหล่งจ่าย 12 V · คาบ T เท่ากันทุกแถว</Label>
      {rows.map(({ d, y0 }) => {
        let p = `M ${x0} ${y0}`;
        for (let k = 0; k < 4; k++) {
          const s0 = x0 + k * T;
          p += ` L ${s0} ${y0 - H} L ${s0 + d * T} ${y0 - H} L ${s0 + d * T} ${y0} L ${s0 + T} ${y0}`;
        }
        const avg = y0 - H * d;
        return (
          <g key={d}>
            <line x1={x0} y1={y0} x2={x0 + 4 * T + 6} y2={y0} stroke="var(--fig-grid)" strokeWidth={2} />
            <path d={p} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <line x1={x0} y1={avg} x2={x0 + 4 * T} y2={avg} stroke="var(--fig-accent)" strokeWidth={3} strokeDasharray="10 6" />
            <Label x={16} y={y0 - 54} size={22} weight={700} anchor="start">D = {d * 100}%</Label>
            <Label x={16} y={y0 - 22} size={20} anchor="start" color="var(--fig-accent)" weight={600}>
              เฉลี่ย {12 * d} V
            </Label>
            <Label x={x0 + 4 * T + 10} y={y0 - H} size={20} anchor="start" muted>12 V</Label>
            <Label x={x0 + 4 * T + 10} y={y0} size={20} anchor="start" muted>0 V</Label>
          </g>
        );
      })}
      {/* t_on and T brackets above the 75 % row */}
      <Arrow from={[x0 + 2, 334]} to={[x0 + 0.75 * T, 334]} color={MUTED} width={2} head={9} />
      <Arrow from={[x0 + 0.75 * T - 2, 334]} to={[x0, 334]} color={MUTED} width={2} head={9} />
      <Label x={x0 + 34} y={316} size={20} muted>t on</Label>
      <Arrow from={[x0 + T + 2, 334]} to={[x0 + 2 * T, 334]} color={MUTED} width={2} head={9} />
      <Arrow from={[x0 + 2 * T - 2, 334]} to={[x0 + T, 334]} color={MUTED} width={2} head={9} />
      <Label x={x0 + 1.5 * T} y={316} size={20} muted>T</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F10 Magnetic contactor (principle + terminals) and overload relay
// ---------------------------------------------------------------------------
function Contactor() {
  const top = ["1/L1", "3/L2", "5/L3", "13", "A1"];
  const bot = ["2/T1", "4/T2", "6/T3", "14", "A2"];
  return (
    <svg viewBox="0 0 600 500" aria-hidden="true">
      <Label x={150} y={24} size={22} weight={700}>ก. หลักการ (ไม่มีไฟ)</Label>
      {/* arc chamber */}
      <rect x={40} y={70} width={220} height={100} rx={8} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="7 5" />
      <Label x={150} y={56} size={20} muted>ห้องดับอาร์ก</Label>
      {/* moving contact bridge (above) and fixed contacts (below): coil pulls armature down → bridge closes on fixed contacts */}
      <rect x={90} y={96} width={120} height={12} fill="var(--fig-copper)" />
      <rect x={145} y={108} width={10} height={132} fill={PANEL} stroke={INK} strokeWidth={2} />
      <rect x={56} y={140} width={56} height={12} fill={MUTED} />
      <rect x={188} y={140} width={56} height={12} fill={MUTED} />
      <Label x={84} y={124} size={20}>1</Label>
      <Label x={216} y={124} size={20}>2</Label>
      {/* armature */}
      <rect x={50} y={240} width={200} height={28} fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
      <Label x={150} y={255} size={20}>อาร์เมเจอร์</Label>
      {/* spring */}
      <path d="M 232 268 l 8 3 l -16 5 l 16 5 l -16 5 l 8 3" fill="none" stroke={INK} strokeWidth={2} />
      {/* E core + coil */}
      <path d="M 50 292 h 200 v 100 h -200 z M 78 292 v 66 h 44 v -66 M 178 292 v 66 h 44 v -66" fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
      <rect x={106} y={300} width={88} height={50} fill="var(--fig-copper-soft)" stroke="var(--fig-copper)" strokeWidth={2.5} />
      <Label x={150} y={325} size={20} weight={700}>ขดลวด</Label>
      <rect x={52} y={286} width={22} height={8} fill="var(--fig-copper)" />
      <Label x={36} y={418} size={20} anchor="start" muted>แกน E · วงแหวนบังเงา ▬</Label>
      <Label x={150} y={452} size={20}>จ่ายไฟ A1–A2 → ดูดลง</Label>
      <Label x={150} y={478} size={20}>→ หน้าสัมผัสต่อ</Label>
      <line x1={300} y1={20} x2={300} y2={490} stroke="var(--fig-grid)" strokeWidth={2} />
      {/* right: terminal layout */}
      <Label x={450} y={24} size={22} weight={700}>ข. ขั้วต่อ K1 และ F2</Label>
      <rect x={318} y={70} width={268} height={170} rx={10} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      {top.map((t, i) => (
        <g key={t}>
          <circle cx={344 + i * 54} cy={92} r={7} fill={BG} stroke={INK} strokeWidth={2} />
          <Label x={344 + i * 54} y={116} size={20}>{t}</Label>
        </g>
      ))}
      {bot.map((t, i) => (
        <g key={t}>
          <Label x={344 + i * 54} y={194} size={20}>{t}</Label>
          <circle cx={344 + i * 54} cy={218} r={7} fill={BG} stroke={INK} strokeWidth={2} />
        </g>
      ))}
      <Label x={452} y={155} size={26} weight={700}>K1</Label>
      <rect x={318} y={262} width={268} height={170} rx={10} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <Label x={404} y={290} size={22} weight={700}>F2 (OL)</Label>
      <circle cx={380} cy={340} r={22} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={380} y1={340} x2={392} y2={324} stroke={INK} strokeWidth={3} />
      <Label x={380} y={384} size={20}>ตั้งกระแส</Label>
      <Label x={520} y={300} size={20}>95–96 NC</Label>
      <Label x={520} y={334} size={20}>97–98 NO</Label>
      <rect x={480} y={360} width={80} height={32} rx={6} fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={2} />
      <Label x={520} y={377} size={20}>RESET</Label>
      <Label x={452} y={414} size={20} muted>ออก T1 T2 T3 → มอเตอร์</Label>
      <Label x={452} y={466} size={20} muted>ตั้ง ≈ กระแสบน nameplate</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F11 Power circuit (3-phase 400 V, teacher demo)
// ---------------------------------------------------------------------------
function PowerCircuit() {
  const xs = [200, 260, 320];
  const cols = ["var(--fig-wire-l)", "var(--fig-wire-l2)", "var(--fig-wire-l3)"];
  const seg = (y1: number, y2: number) => xs.map((x, i) => <Wire key={`${x}-${y1}`} points={[[x, y1], [x, y2]]} color={cols[i]} width={3.5} />);
  return (
    <svg viewBox="0 0 600 560" aria-hidden="true">
      {["L1", "L2", "L3"].map((n, i) => (
        <Label key={n} x={xs[i]} y={24} size={20} weight={700}>{n}</Label>
      ))}
      <Label x={420} y={24} size={20} weight={700}>PE</Label>
      {seg(40, 80)}
      {xs.map((x) => (
        <Contact key={`q${x}`} x={x} y={110} breaker />
      ))}
      <line x1={186} y1={109} x2={316} y2={109} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
      <Label x={40} y={110} size={22} anchor="start" weight={700}>Q1</Label>
      {seg(140, 190)}
      {xs.map((x) => (
        <Contact key={`k${x}`} x={x} y={220} main />
      ))}
      <line x1={186} y1={219} x2={316} y2={219} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
      <Label x={40} y={220} size={22} anchor="start" weight={700}>K1</Label>
      <Label x={214} y={196} size={20} anchor="start" muted>1</Label>
      <Label x={214} y={246} size={20} anchor="start" muted>2</Label>
      {seg(250, 300)}
      {xs.map((x) => (
        <OLHeater key={`f${x}`} x={x} y={330} />
      ))}
      <line x1={212} y1={330} x2={308} y2={330} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
      <Label x={40} y={330} size={22} anchor="start" weight={700}>F2</Label>
      <Wire points={[[200, 360], [200, 400], [236, 428]]} color={cols[0]} width={3.5} />
      <Wire points={[[260, 360], [260, 416]]} color={cols[1]} width={3.5} />
      <Wire points={[[320, 360], [320, 400], [284, 428]]} color={cols[2]} width={3.5} />
      <MotorSym x={260} y={460} r={44} kind="ac3" />
      <Label x={40} y={460} size={22} anchor="start" weight={700}>M1</Label>
      <PEWire points={[[420, 40], [420, 480], [304, 480]]} />
      <Label x={432} y={500} size={20} anchor="start" muted>ต่อโครงมอเตอร์</Label>
      <Callout x={436} y={180} w={156} h={130} tone="danger">
        <Label x={513} y={212} size={20} weight={700} color="var(--fig-danger)">อันตราย 400 V</Label>
        <Label x={515} y={246} size={20}>ครูสาธิต</Label>
        <Label x={515} y={276} size={20}>เท่านั้น (S3)</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F12 / F15 Symbol legends
// ---------------------------------------------------------------------------
function SymbolsControl() {
  const cells: { x: number; y: number; sym: ReactNode; l1: string; l2: string }[] = [
    { x: 100, y: 80, sym: <Contact x={110} y={80} push />, l1: "ปุ่มกด NO", l2: "Start (เขียว)" },
    { x: 300, y: 80, sym: <Contact x={300} y={80} nc push />, l1: "ปุ่มกด NC", l2: "Stop (แดง)" },
    { x: 500, y: 80, sym: <Coil x={500} y={80} />, l1: "ขดลวด K1", l2: "A1–A2" },
    { x: 100, y: 280, sym: <Contact x={110} y={280} />, l1: "หน้าสัมผัสช่วย", l2: "NO 13–14" },
    { x: 300, y: 280, sym: <Contact x={300} y={280} nc />, l1: "หน้าสัมผัสช่วย", l2: "NC 21–22" },
    { x: 500, y: 280, sym: <Contact x={510} y={280} nc thermal />, l1: "หน้าสัมผัส OL", l2: "NC 95–96" },
  ];
  const nums: [number, number, string][] = [
    [490, 52, "A1"],
    [490, 110, "A2"],
    [86, 254, "13"],
    [86, 306, "14"],
    [276, 254, "21"],
    [276, 306, "22"],
    [540, 254, "95"],
    [540, 306, "96"],
  ];
  return (
    <svg viewBox="0 0 600 410" aria-hidden="true">
      {cells.map((c) => (
        <g key={c.l1 + c.l2}>
          {c.sym}
          <Label x={c.x} y={c.y + 70} size={20} weight={700}>{c.l1}</Label>
          <Label x={c.x} y={c.y + 96} size={20} muted>{c.l2}</Label>
        </g>
      ))}
      {nums.map(([x, y, t]) => (
        <Label key={t} x={x} y={y} size={20} anchor={x > 500 ? "start" : "end"} muted>
          {t}
        </Label>
      ))}
      <line x1={10} y1={200} x2={590} y2={200} stroke="var(--fig-grid)" strokeWidth={1.5} />
    </svg>
  );
}

function SymbolsPower() {
  return (
    <svg viewBox="0 0 600 410" aria-hidden="true">
      <FuseV x={100} y={80} />
      <Label x={100} y={150} size={20} weight={700}>ฟิวส์ F</Label>
      <Label x={100} y={176} size={20} muted>ป้องกันลัดวงจร</Label>
      <Contact x={300} y={80} breaker />
      <Label x={300} y={150} size={20} weight={700}>เบรกเกอร์ Q</Label>
      <Label x={300} y={176} size={20} muted>ตัด/ป้องกัน</Label>
      <Contact x={500} y={80} main />
      <Label x={500} y={150} size={20} weight={700}>หน้าสัมผัสหลัก</Label>
      <Label x={500} y={176} size={20} muted>K1 1–2</Label>
      <line x1={10} y1={200} x2={590} y2={200} stroke="var(--fig-grid)" strokeWidth={1.5} />
      <OLHeater x={100} y={280} />
      <Label x={100} y={350} size={20} weight={700}>ฮีตเตอร์ของ OL</Label>
      <Label x={100} y={376} size={20} muted>F2 (heater)</Label>
      <MotorSym x={300} y={280} r={34} kind="ac3" />
      <Label x={300} y={350} size={20} weight={700}>M 3~</Label>
      <Label x={300} y={376} size={20} muted>มอเตอร์ 3 เฟส</Label>
      <MotorSym x={500} y={280} r={34} />
      <Label x={500} y={350} size={20} weight={700}>M (DC)</Label>
      <Label x={500} y={376} size={20} muted>มอเตอร์ไฟตรง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F13 / F14 Control circuit start–stop (correct / faulty for find-fault)
// ---------------------------------------------------------------------------
function Ladder({ faulty }: { faulty: boolean }) {
  const X = 200;
  const XR = 360;
  return (
    <svg viewBox="0 0 600 600" aria-hidden="true">
      <Label x={40} y={30} size={22} weight={700} anchor="start" color="var(--fig-plus)">+24 V</Label>
      <Wire points={[[130, 46], [470, 46]]} color="var(--fig-wire-l)" width={4} />
      <Label x={40} y={566} size={22} weight={700} anchor="start">0 V</Label>
      <Wire points={[[130, 548], [470, 548]]} color="var(--fig-wire-n)" width={4} />
      <Node x={X} y={46} />
      <Wire points={[[X, 46], [X, 55]]} />
      <FuseV x={X} y={85} />
      <Label x={X + 30} y={85} size={20} anchor="start">F3 ฟิวส์วงจรควบคุม</Label>
      <Wire points={[[X, 115], [X, 135]]} />
      {faulty ? <Contact x={X} y={165} thermal /> : <Contact x={X} y={165} nc thermal />}
      <Label x={X + 30} y={165} size={20} anchor="start">{faulty ? "F2 97–98" : "F2 95–96 (NC)"}</Label>
      <Wire points={[[X, 195], [X, 215]]} />
      {faulty ? <Contact x={X} y={245} push /> : <Contact x={X} y={245} nc push />}
      <Label x={X + 30} y={245} size={20} anchor="start">S0 Stop</Label>
      <Wire points={[[X, 275], [X, 300]]} />
      {faulty ? (
        <g>
          <Contact x={X} y={330} push />
          <Label x={X - 46} y={330} size={20} anchor="end">S1 Start</Label>
          <Contact x={X} y={390} />
          <Label x={X + 30} y={390} size={20} anchor="start">K1 13–14</Label>
          <Wire points={[[X, 420], [X, 433]]} />
        </g>
      ) : (
        <g>
          <Node x={X} y={300} />
          <Wire points={[[X, 300], [XR, 300], [XR, 320]]} />
          <Wire points={[[X, 300], [X, 320]]} />
          <Contact x={X} y={350} push />
          <Label x={X - 46} y={350} size={20} anchor="end">S1 Start</Label>
          <Contact x={XR} y={350} />
          <Label x={XR + 22} y={340} size={20} anchor="start">K1 13–14</Label>
          <Label x={XR + 22} y={366} size={20} anchor="start" muted>(ยึดตัวเอง)</Label>
          <Wire points={[[X, 380], [X, 410], [X, 433]]} />
          <Wire points={[[XR, 380], [XR, 410], [X, 410]]} />
          <Node x={X} y={410} />
        </g>
      )}
      <Coil x={X} y={460} />
      <Label x={X - 36} y={438} size={20} anchor="end" muted>A1</Label>
      <Label x={X - 36} y={484} size={20} anchor="end" muted>A2</Label>
      <Label x={X + 36} y={460} size={22} anchor="start" weight={700}>K1</Label>
      <Wire points={[[X, 487], [X, 548]]} />
      <Node x={X} y={548} />
      {/* H1 run lamp in parallel with coil */}
      <Node x={X} y={faulty ? 427 : 410} />
      <Wire points={[[X, faulty ? 427 : 410], [470, faulty ? 427 : 410], [470, 430]]} />
      <Lamp x={470} y={460} angle={90} on={!faulty} />
      <Label x={496} y={460} size={20} anchor="start">H1</Label>
      <Wire points={[[470, 490], [470, 548]]} />
    </svg>
  );
}

function ControlCircuit() {
  return <Ladder faulty={false} />;
}
function ControlCircuitFaulty() {
  return <Ladder faulty />;
}

// ---------------------------------------------------------------------------
// W16-F17 Speed control: series rheostat vs PWM low-side MOSFET + flyback diode
// ---------------------------------------------------------------------------
/** N-channel enhancement MOSFET, drain (x, y−40), source (x, y+40), gate (x−40, y). */
function NMos({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 40} y1={y} x2={x - 22} y2={y} stroke={INK} strokeWidth={3} />
      <line x1={x - 22} y1={y - 20} x2={x - 22} y2={y + 20} stroke={INK} strokeWidth={3} />
      {[-18, 0, 18].map((d) => (
        <line key={d} x1={x - 12} y1={y + d - 7} x2={x - 12} y2={y + d + 7} stroke={INK} strokeWidth={3.5} />
      ))}
      <Wire points={[[x - 12, y - 18], [x, y - 18], [x, y - 40]]} />
      <Wire points={[[x - 12, y + 18], [x, y + 18], [x, y + 40]]} />
      <Wire points={[[x - 12, y], [x, y], [x, y + 18]]} />
      <path d={`M ${x - 11} ${y} l 10 -5 v 10 z`} fill={INK} />
    </g>
  );
}

function SpeedControl() {
  const ox = 300;
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* (a) rheostat */}
      <Battery x={50} y={190} angle={90} />
      <Label x={80} y={206} size={20} anchor="start" muted>12 V</Label>
      <Wire points={[[50, 160], [50, 90], [110, 90]]} />
      <Resistor x={150} y={90} variable />
      <Label x={150} y={46} size={20}>R ปรับค่า</Label>
      <Wire points={[[190, 90], [240, 90], [240, 164]]} />
      <MotorSym x={240} y={190} />
      <Wire points={[[240, 216], [240, 290], [50, 290], [50, 220]]} />
      <Label x={150} y={142} size={20} color="var(--fig-danger)" weight={600}>ร้อน I²R</Label>
      <Label x={150} y={336} size={22} weight={700}>ก. รีโอสแตตอนุกรม</Label>
      <Label x={150} y={366} size={20} muted>สูญเสียมาก แรงบิดต่ำตก</Label>
      <line x1={300} y1={20} x2={300} y2={380} stroke="var(--fig-grid)" strokeWidth={2} />
      {/* (b) PWM low-side switch */}
      <Label x={ox + 20} y={40} size={20} anchor="start" weight={700} color="var(--fig-plus)">+12 V</Label>
      <Wire points={[[ox + 90, 60], [ox + 260, 60]]} color="var(--fig-wire-l)" width={3.5} />
      <Wire points={[[ox + 180, 60], [ox + 180, 104]]} />
      <MotorSym x={ox + 180} y={130} />
      <Wire points={[[ox + 180, 156], [ox + 180, 190]]} />
      <Node x={ox + 180} y={60} />
      <Node x={ox + 180} y={190} />
      <Wire points={[[ox + 260, 60], [ox + 260, 100]]} />
      <Diode x={ox + 260} y={130} angle={-90} />
      <Wire points={[[ox + 260, 160], [ox + 260, 190], [ox + 180, 190]]} />
      <NMos x={ox + 180} y={230} />
      <Wire points={[[ox + 180, 270], [ox + 180, 290]]} />
      <Wire points={[[ox + 90, 290], [ox + 260, 290]]} color="var(--fig-wire-n)" width={3.5} />
      <Label x={ox + 20} y={290} size={20} anchor="start" weight={700}>0 V</Label>
      <Wire points={[[ox + 140, 230], [ox + 120, 230]]} />
      <path d={`M ${ox + 40} 244 h 12 v -28 h 14 v 28 h 12 v -28 h 14 v 28 h 12`} fill="none" stroke="var(--fig-accent)" strokeWidth={3} />
      <Label x={ox + 82} y={200} size={20} color="var(--fig-accent)" weight={700}>PWM</Label>
      <Label x={ox + 210} y={240} size={20} anchor="start">MOSFET</Label>
      <Label x={ox + 150} y={336} size={22} weight={700}>ข. PWM + ไดโอด flyback</Label>
      <Label x={ox + 150} y={366} size={20} muted>เปิด–ปิดเร็ว สูญเสียน้อย</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W16-F18 Reversing a PMDC with a cross-wired DPDT switch
// ---------------------------------------------------------------------------
function DpdtReverse() {
  const L = "var(--fig-wire-l)";
  const N = "var(--fig-wire-n)";
  const term = (x: number, y: number) => <circle cx={x} cy={y} r={6} fill={BG} stroke={INK} strokeWidth={2.5} />;
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      {/* motor on the left */}
      <Wire points={[[100, 164], [100, 130], [234, 130]]} />
      <Wire points={[[100, 216], [100, 270], [234, 270]]} />
      <MotorSym x={100} y={190} />
      <RotArrow cx={100} cy={190} r={38} cw />
      {/* DPDT: commons at x=240, throws a/b at x=330 */}
      {term(240, 130)}
      {term(240, 270)}
      {term(330, 100)}
      {term(330, 160)}
      {term(330, 240)}
      {term(330, 300)}
      <line x1={244} y1={128} x2={322} y2={104} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={244} y1={268} x2={322} y2={244} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={284} y1={118} x2={284} y2={254} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
      <Label x={346} y={84} size={20} anchor="start" muted>a</Label>
      <Label x={346} y={176} size={20} anchor="start" muted>b</Label>
      <Label x={346} y={224} size={20} anchor="start" muted>a</Label>
      <Label x={346} y={318} size={20} anchor="start" muted>b</Label>
      <Label x={240} y={330} size={20} weight={700}>DPDT</Label>
      {/* outer loop 1a–2b = + ; inner loop 1b–2a = − */}
      <Wire points={[[336, 100], [410, 100], [410, 300], [380, 300]]} color={L} />
      <path d="M 380 300 h -2 a 8 8 0 0 0 -16 0 h -26" fill="none" stroke={L} strokeWidth={3} />
      <Wire points={[[336, 160], [370, 160], [370, 240], [336, 240]]} color={N} />
      <Node x={410} y={100} r={4} />
      <Node x={370} y={240} r={4} />
      {/* supply with fuse */}
      <Wire points={[[410, 100], [410, 60], [520, 60], [520, 75]]} color={L} />
      <FuseV x={520} y={105} />
      <Label x={540} y={105} size={20} anchor="start">F 2 A</Label>
      <Wire points={[[520, 135], [520, 170]]} color={L} />
      <Battery x={520} y={200} angle={90} />
      <Label x={548} y={210} size={20} anchor="start" muted>12 V</Label>
      <Wire points={[[520, 230], [520, 360], [370, 360], [370, 240]]} color={N} />
      <Label x={300} y={398} size={20}>โยกขึ้น (a): ขั้วบนมอเตอร์ = + → ตามเข็ม</Label>
      <Label x={300} y={426} size={20}>โยกลง (b): ขั้วบนมอเตอร์ = − → ทวนเข็ม</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W16-F01": Classification,
  "W16-F02": PmdcCutaway,
  "W16-F03": ForceRule,
  "W16-F04": CommutatorSteps,
  "W16-F05": Armature,
  "W16-F06": EquivalentCircuit,
  "W16-F07": Reversing,
  "W16-F08": HBridge,
  "W16-F09": PwmWaves,
  "W16-F10": Contactor,
  "W16-F11": PowerCircuit,
  "W16-F12": SymbolsControl,
  "W16-F13": ControlCircuit,
  "W16-F14": ControlCircuitFaulty,
  "W16-F15": SymbolsPower,
  "W16-F16": ForceQuestion,
  "W16-F17": SpeedControl,
  "W16-F18": DpdtReverse,
};
export default figures;
