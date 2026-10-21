/**
 * Week 7 — ตัวต้านทาน (Resistors). Original SVG drawings.
 *
 * Colour exception (authorised for this week only): the 12 IEC 60062 band
 * colours are defined as constants in BAND below and are used ONLY to paint
 * resistor colour bands / swatches. Every band is also outlined with the ink
 * token and named in text so the figures still read in greyscale.
 */
import type { FigureMap } from "@/content/types";
import type { ReactNode } from "react";
import { Resistor, Battery, Wire, Label, Lamp, Node, Terminal, Callout } from "./kit";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";

/** IEC 60062 band colours (band paint only). */
const BAND: Record<string, string> = {
  black: "#1b1b1b",
  brown: "#7b4a24",
  red: "#d32f2f",
  orange: "#f57c00",
  yellow: "#fbc02d",
  green: "#2e8b3c",
  blue: "#1e63c6",
  violet: "#7b3fb0",
  grey: "#9a9a9a",
  white: "#ffffff",
  gold: "#c9a227",
  silver: "#b9bec4",
};

type Pt = [number, number];

/** Axial resistor drawn horizontally with colour bands at given x offsets (from body left). */
function AxialBands({
  x,
  y,
  len,
  h,
  bands,
  body = "var(--fig-copper-soft)",
  lead = 30,
}: {
  x: number; // body left
  y: number; // centre line
  len: number;
  h: number;
  bands: { at: number; c: string; w?: number }[];
  body?: string;
  lead?: number;
}) {
  return (
    <g>
      <line x1={x - lead} y1={y} x2={x} y2={y} stroke={INK} strokeWidth={3} />
      <line x1={x + len} y1={y} x2={x + len + lead} y2={y} stroke={INK} strokeWidth={3} />
      <rect x={x} y={y - h / 2} width={len} height={h} rx={h / 2.6} fill={body} stroke={INK} strokeWidth={2.5} />
      {bands.map((b, i) => (
        <rect
          key={i}
          x={x + b.at - (b.w ?? 10) / 2}
          y={y - h / 2 + 1.5}
          width={b.w ?? 10}
          height={h - 3}
          fill={BAND[b.c]}
          stroke={INK}
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function ArrowHead({ from, to, color = INK, width = 2.5, head = 10 }: { from: Pt; to: Pt; color?: string; width?: number; head?: number }) {
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
    </g>
  );
}

function Leader({ from, to }: { from: Pt; to: Pt }) {
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={MUTED} strokeWidth={1.5} />
      <circle cx={to[0]} cy={to[1]} r={4} fill={INK} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// F01 — symbols of fixed & variable resistors
// ---------------------------------------------------------------------------
function Zigzag({ x, y }: { x: number; y: number }) {
  const pts: string[] = [`${x - 40},${y}`, `${x - 30},${y}`];
  const n = 6;
  const w = 60 / n;
  for (let i = 0; i < n; i++) pts.push(`${x - 30 + w * i + w / 2},${y + (i % 2 === 0 ? -12 : 12)}`);
  pts.push(`${x + 30},${y}`, `${x + 40},${y}`);
  return <polyline points={pts.join(" ")} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />;
}

function CellLabel({ x, y, a, b }: { x: number; y: number; a: ReactNode; b: ReactNode }) {
  return (
    <g>
      <Label x={x} y={y}>{a}</Label>
      <Label x={x} y={y + 28} size={20} muted>{b}</Label>
    </g>
  );
}

function F01Symbols() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <line x1={200} y1={20} x2={200} y2={380} stroke="var(--fig-grid)" strokeWidth={1.5} />
      <line x1={400} y1={20} x2={400} y2={380} stroke="var(--fig-grid)" strokeWidth={1.5} />
      <line x1={20} y1={205} x2={580} y2={205} stroke="var(--fig-grid)" strokeWidth={1.5} />
      {/* row 1 */}
      <Resistor x={100} y={85} />
      <CellLabel x={100} y={145} a="ค่าคงที่ (IEC)" b="IEC 60617 ใช้หลัก" />
      <Zigzag x={300} y={85} />
      <CellLabel x={300} y={145} a="ค่าคงที่ (ANSI)" b="แบบฟันเลื่อย" />
      <Resistor x={500} y={85} variable />
      <CellLabel x={500} y={145} a="ปรับค่าได้" b="ลูกศรเฉียงผ่าน" />
      {/* row 2: potentiometer */}
      <Resistor x={100} y={290} />
      <ArrowHead from={[100, 248]} to={[100, 278]} width={3} />
      <Label x={52} y={275} size={20} muted>1</Label>
      <Label x={148} y={275} size={20} muted>3</Label>
      <Label x={116} y={250} size={20} muted>2</Label>
      <CellLabel x={100} y={335} a="โพเทนชิโอมิเตอร์" b="ขา 2 = แกนกวาด" />
      {/* preset / trimmer */}
      <Resistor x={300} y={290} />
      <line x1={274} y1={314} x2={322} y2={262} stroke={INK} strokeWidth={2.5} />
      <line x1={314} y1={255} x2={330} y2={269} stroke={INK} strokeWidth={3} />
      <CellLabel x={300} y={335} a="ทริมพอต (preset)" b="ตั้งค่าด้วยไขควง" />
      {/* rheostat */}
      <Resistor x={490} y={290} />
      <ArrowHead from={[490, 250]} to={[490, 278]} width={3} />
      <Wire points={[[490, 250], [540, 250], [540, 290]]} />
      <line x1={530} y1={290} x2={556} y2={290} stroke={INK} strokeWidth={3} />
      <Node x={540} y={290} />
      <CellLabel x={500} y={335} a="รีโอสแตต" b="ขากลางต่อกับปลาย" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 — cut-away of a film resistor (hotspot figure, viewBox 600×380)
// ---------------------------------------------------------------------------
function F02Cutaway() {
  const y = 190;
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <defs>
        <clipPath id="w07f02-film">
          <rect x={172} y={y - 34} width={130} height={68} />
        </clipPath>
      </defs>
      {/* leads */}
      <line x1={20} y1={y} x2={135} y2={y} stroke={INK} strokeWidth={4} />
      <line x1={465} y1={y} x2={580} y2={y} stroke={INK} strokeWidth={4} />
      {/* ceramic core */}
      <rect x={150} y={y - 34} width={300} height={68} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      {/* film with helical groove */}
      <rect x={172} y={y - 34} width={130} height={68} fill="var(--fig-copper)" />
      <g clipPath="url(#w07f02-film)">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={i} x1={160 + i * 22} y1={y + 40} x2={190 + i * 22} y2={y - 40} stroke={PANEL} strokeWidth={6} />
        ))}
      </g>
      {/* end caps */}
      <rect x={132} y={y - 44} width={40} height={88} rx={6} fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
      <rect x={428} y={y - 44} width={40} height={88} rx={6} fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
      {/* coating on the right half (cut edge jagged) */}
      <path
        d={`M 302 ${y - 52} L 452 ${y - 52} Q 472 ${y - 52} 472 ${y - 32} L 472 ${y + 32} Q 472 ${y + 52} 452 ${y + 52} L 302 ${y + 52} L 310 ${y + 30} L 298 ${y + 10} L 310 ${y - 10} L 298 ${y - 30} Z`}
        fill="var(--fig-copper-soft)"
        stroke={INK}
        strokeWidth={2.5}
      />
      {[
        { x: 330, c: "yellow" },
        { x: 356, c: "violet" },
        { x: 382, c: "red" },
        { x: 436, c: "gold" },
      ].map((b) => (
        <rect key={b.x} x={b.x - 7} y={y - 50} width={14} height={100} fill={BAND[b.c]} stroke={INK} strokeWidth={1} />
      ))}
      {/* labels */}
      <Label x={110} y={50}>ฝาปลายโลหะ</Label>
      <Leader from={[120, 64]} to={[150, y - 40]} />
      <Label x={300} y={40}>ฟิล์มตัดเกลียว (helix)</Label>
      <Leader from={[260, 56]} to={[238, y - 22]} />
      <Label x={500} y={70}>สารเคลือบ</Label>
      <Leader from={[490, 86]} to={[455, y - 44]} />
      <Label x={80} y={300}>ขาลวด (lead)</Label>
      <Leader from={[80, 284]} to={[70, y]} />
      <Label x={250} y={330}>แกนเซรามิก (core)</Label>
      <Leader from={[245, 314]} to={[214, y + 30]} />
      <Label x={470} y={320}>แถบสีบอกค่า</Label>
      <Leader from={[440, 304]} to={[382, y + 46]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 — gallery of resistor types (line art)
// ---------------------------------------------------------------------------
function F03Gallery() {
  const cell = (cx: number, cy: number, label: string, art: ReactNode) => (
    <g key={label}>
      {art}
      <Label x={cx} y={cy + 52} size={20}>{label}</Label>
    </g>
  );
  return (
    <svg viewBox="0 0 600 450" aria-hidden="true">
      {[200, 400].map((x) => (
        <line key={x} x1={x} y1={10} x2={x} y2={440} stroke="var(--fig-grid)" strokeWidth={1.5} />
      ))}
      {[150, 300].map((y) => (
        <line key={y} x1={10} y1={y} x2={590} y2={y} stroke="var(--fig-grid)" strokeWidth={1.5} />
      ))}
      {/* row 1 */}
      {cell(100, 75, "ฟิล์มคาร์บอน",
        <AxialBands x={55} y={60} len={90} h={28} bands={[{ at: 18, c: "brown" }, { at: 32, c: "black" }, { at: 46, c: "red" }, { at: 74, c: "gold" }]} />)}
      {cell(300, 75, "ฟิล์มโลหะ ±1%",
        <AxialBands x={255} y={60} len={90} h={28} body="var(--fig-accent-soft)" bands={[{ at: 16, c: "brown", w: 8 }, { at: 28, c: "black", w: 8 }, { at: 40, c: "black", w: 8 }, { at: 52, c: "red", w: 8 }, { at: 76, c: "brown", w: 8 }]} />)}
      {cell(500, 75, "ไวร์วาวด์ 25 W",
        <g>
          <rect x={440} y={40} width={120} height={40} rx={4} fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
          {[455, 470, 485, 500, 515, 530, 545].map((x) => (
            <line key={x} x1={x} y1={40} x2={x} y2={80} stroke={INK} strokeWidth={1.5} />
          ))}
          <rect x={425} y={52} width={15} height={16} fill={BG} stroke={INK} strokeWidth={2} />
          <rect x={560} y={52} width={15} height={16} fill={BG} stroke={INK} strokeWidth={2} />
        </g>)}
      {/* row 2 */}
      {cell(100, 225, "ซีเมนต์ (กำลังสูง)",
        <g>
          <line x1={20} y1={210} x2={45} y2={210} stroke={INK} strokeWidth={3} />
          <line x1={155} y1={210} x2={180} y2={210} stroke={INK} strokeWidth={3} />
          <rect x={45} y={188} width={110} height={44} fill={BG} stroke={INK} strokeWidth={2.5} />
          <text x={100} y={211} fontSize={20} textAnchor="middle" dominantBaseline="middle" fill={INK}>5W 10RJ</text>
        </g>)}
      {cell(300, 225, "ชิป SMD (0805)",
        <g>
          <rect x={250} y={190} width={18} height={40} fill="var(--fig-grid)" stroke={INK} strokeWidth={2} />
          <rect x={332} y={190} width={18} height={40} fill="var(--fig-grid)" stroke={INK} strokeWidth={2} />
          <rect x={268} y={190} width={64} height={40} fill={INK} />
          <text x={300} y={211} fontSize={22} textAnchor="middle" dominantBaseline="middle" fontWeight={700} fill={BG}>472</text>
        </g>)}
      {cell(500, 225, "เน็ตเวิร์ก SIP",
        <g>
          <rect x={435} y={180} width={130} height={36} rx={6} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
          <circle cx={448} cy={198} r={4} fill={INK} />
          <text x={506} y={199} fontSize={20} textAnchor="middle" dominantBaseline="middle" fill={INK}>A103J</text>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <line key={i} x1={443 + i * 14.3} y1={216} x2={443 + i * 14.3} y2={240} stroke={INK} strokeWidth={2.5} />
          ))}
        </g>)}
      {/* row 3 */}
      {cell(100, 375, "โพเทนชิโอมิเตอร์",
        <g>
          <circle cx={100} cy={350} r={34} fill={PANEL} stroke={INK} strokeWidth={2.5} />
          <circle cx={100} cy={350} r={13} fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
          <line x1={100} y1={339} x2={100} y2={361} stroke={INK} strokeWidth={3} />
          {[80, 100, 120].map((x) => (
            <line key={x} x1={x} y1={383} x2={x} y2={398} stroke={INK} strokeWidth={3} />
          ))}
        </g>)}
      {cell(300, 375, "ทริมพอต",
        <g>
          <rect x={272} y={322} width={56} height={56} rx={4} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
          <circle cx={300} cy={350} r={16} fill={BG} stroke={INK} strokeWidth={2.5} />
          <line x1={289} y1={361} x2={311} y2={339} stroke={INK} strokeWidth={3} />
          {[284, 300, 316].map((x) => (
            <line key={x} x1={x} y1={378} x2={x} y2={398} stroke={INK} strokeWidth={3} />
          ))}
        </g>)}
      {cell(500, 375, "LDR (ไวแสง)",
        <g>
          <circle cx={500} cy={345} r={30} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2.5} />
          <path d="M 480 330 H 518 V 338 H 482 V 346 H 518 V 354 H 482 V 362 H 520" fill="none" stroke="var(--fig-copper)" strokeWidth={3} />
          <line x1={488} y1={375} x2={488} y2={398} stroke={INK} strokeWidth={3} />
          <line x1={512} y1={375} x2={512} y2={398} stroke={INK} strokeWidth={3} />
        </g>)}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 — colour-code table (IEC 60062) — wide figure
// ---------------------------------------------------------------------------
const TABLE_ROWS: { c: string | null; th: string; d: string; m: string; t: string; tc: string }[] = [
  { c: "black", th: "ดำ", d: "0", m: "×1", t: "—", tc: "250" },
  { c: "brown", th: "น้ำตาล", d: "1", m: "×10", t: "±1% F", tc: "100" },
  { c: "red", th: "แดง", d: "2", m: "×100", t: "±2% G", tc: "50" },
  { c: "orange", th: "ส้ม", d: "3", m: "×1 k", t: "—", tc: "15" },
  { c: "yellow", th: "เหลือง", d: "4", m: "×10 k", t: "—", tc: "25" },
  { c: "green", th: "เขียว", d: "5", m: "×100 k", t: "±0.5% D", tc: "20" },
  { c: "blue", th: "น้ำเงิน", d: "6", m: "×1 M", t: "±0.25% C", tc: "10" },
  { c: "violet", th: "ม่วง", d: "7", m: "×10 M", t: "±0.1% B", tc: "5" },
  { c: "grey", th: "เทา", d: "8", m: "×100 M", t: "±0.05% W", tc: "1" },
  { c: "white", th: "ขาว", d: "9", m: "×1 G", t: "—", tc: "—" },
  { c: "gold", th: "ทอง", d: "—", m: "×0.1", t: "±5% J", tc: "—" },
  { c: "silver", th: "เงิน", d: "—", m: "×0.01", t: "±10% K", tc: "—" },
  { c: null, th: "ไม่มีแถบ", d: "—", m: "—", t: "±20% M", tc: "—" },
];

function F04ColourTable() {
  const top = 70;
  const rh = 46;
  const cols = [
    { x: 30, title: "สี", anchor: "start" as const },
    { x: 330, title: "ตัวเลข" },
    { x: 480, title: "ตัวคูณ" },
    { x: 660, title: "ค่าผิดพลาด" },
    { x: 815, title: "TCR ppm/K" },
  ];
  return (
    <svg viewBox={`0 0 900 ${top + rh * TABLE_ROWS.length + 20}`} aria-hidden="true">
      <rect x={10} y={14} width={880} height={50} rx={6} fill="var(--fig-accent-soft)" />
      {cols.map((c) => (
        <Label key={c.title} x={c.x} y={40} size={26} weight={700} anchor={c.anchor ?? "middle"}>{c.title}</Label>
      ))}
      {TABLE_ROWS.map((r, i) => {
        const y = top + i * rh + rh / 2;
        return (
          <g key={r.th}>
            {i % 2 === 1 ? <rect x={10} y={y - rh / 2} width={880} height={rh} fill={PANEL} /> : null}
            {r.c ? (
              <rect x={30} y={y - 15} width={60} height={30} rx={4} fill={BAND[r.c]} stroke={INK} strokeWidth={1.5} />
            ) : (
              <rect x={30} y={y - 15} width={60} height={30} rx={4} fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="5 4" />
            )}
            <Label x={106} y={y} size={26} anchor="start">{r.th}</Label>
            <Label x={330} y={y} size={26} weight={700}>{r.d}</Label>
            <Label x={480} y={y} size={26}>{r.m}</Label>
            <Label x={660} y={y} size={26}>{r.t}</Label>
            <Label x={815} y={y} size={26} muted={r.tc === "—"}>{r.tc}</Label>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 — band positions on 4-, 5- and 6-band resistors
// ---------------------------------------------------------------------------
function BandRow({
  y0,
  title,
  bands,
  value,
  value2,
}: {
  y0: number;
  title: string;
  bands: { at: number; c: string; tag: string }[];
  value: string;
  value2?: string;
}) {
  const y = y0 + 48;
  return (
    <g>
      <Label x={30} y={y0} anchor="start" size={20} muted>{title}</Label>
      <AxialBands x={80} y={y} len={290} h={50} lead={40} bands={bands.map((b) => ({ at: b.at, c: b.c, w: 16 }))} />
      {bands.map((b) => (
        <Label key={b.at} x={80 + b.at} y={y + 44} size={20} weight={700}>{b.tag}</Label>
      ))}
      <Label x={426} y={value2 ? y - 14 : y} anchor="start" weight={700}>{value}</Label>
      {value2 ? <Label x={426} y={y + 14} anchor="start" size={20} muted>{value2}</Label> : null}
    </g>
  );
}

function F05BandPositions() {
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      <BandRow
        y0={24}
        title="4 แถบ: เหลือง–ม่วง–แดง–ทอง"
        bands={[
          { at: 50, c: "yellow", tag: "1" },
          { at: 85, c: "violet", tag: "2" },
          { at: 120, c: "red", tag: "×" },
          { at: 240, c: "gold", tag: "±" },
        ]}
        value="4.7 kΩ ±5%"
      />
      <BandRow
        y0={146}
        title="5 แถบ: น้ำตาล–ดำ–ดำ–แดง–น้ำตาล"
        bands={[
          { at: 45, c: "brown", tag: "1" },
          { at: 75, c: "black", tag: "2" },
          { at: 105, c: "black", tag: "3" },
          { at: 135, c: "red", tag: "×" },
          { at: 240, c: "brown", tag: "±" },
        ]}
        value="10.0 kΩ ±1%"
      />
      <BandRow
        y0={268}
        title="6 แถบ: เหลือง–ม่วง–ดำ–น้ำตาล–น้ำตาล–แดง"
        bands={[
          { at: 40, c: "yellow", tag: "1" },
          { at: 68, c: "violet", tag: "2" },
          { at: 96, c: "black", tag: "3" },
          { at: 124, c: "brown", tag: "×" },
          { at: 206, c: "brown", tag: "±" },
          { at: 250, c: "red", tag: "ppm" },
        ]}
        value="4.70 kΩ ±1%"
        value2="TCR 50 ppm/K"
      />
      <Label x={300} y={410} size={20} muted>1 2 3 = หลักตัวเลข · × = ตัวคูณ · ± = ค่าผิดพลาด</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 — potentiometer taper curves A / B / C
// ---------------------------------------------------------------------------
function F06Taper() {
  const X0 = 100, X1 = 560, Y0 = 340, Y1 = 40;
  const px = (f: number) => X0 + (X1 - X0) * f;
  const py = (f: number) => Y0 - (Y0 - Y1) * f;
  const A = (x: number) => (Math.pow(10, 2 * x) - 1) / 99;
  const C = (x: number) => 1 - A(1 - x);
  const pts = (fn: (x: number) => number) =>
    Array.from({ length: 41 }, (_, i) => i / 40)
      .map((x) => `${px(x).toFixed(1)},${py(fn(x)).toFixed(1)}`)
      .join(" ");
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={px(f)} y1={Y0} x2={px(f)} y2={Y1} stroke="var(--fig-grid)" strokeWidth={1.5} />
          <line x1={X0} y1={py(f)} x2={X1} y2={py(f)} stroke="var(--fig-grid)" strokeWidth={1.5} />
        </g>
      ))}
      <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={INK} strokeWidth={2.5} />
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={INK} strokeWidth={2.5} />
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <Label x={px(v / 100)} y={Y0 + 22} size={20} muted>{v}</Label>
          <Label x={X0 - 12} y={py(v / 100)} size={20} muted anchor="end">{v}</Label>
        </g>
      ))}
      <Label x={330} y={395} size={22}>มุมการหมุนแกน (%)</Label>
      <text x={30} y={190} fontSize={22} textAnchor="middle" fill={INK} transform="rotate(-90 30 190)">R ขา 1–2 (% ของค่าเต็ม)</text>
      <polyline points={pts((x) => x)} fill="none" stroke={INK} strokeWidth={3} strokeDasharray="10 6" />
      <polyline points={pts(A)} fill="none" stroke="var(--fig-accent)" strokeWidth={3.5} />
      <polyline points={pts(C)} fill="none" stroke="var(--fig-accent-2)" strokeWidth={3.5} strokeDasharray="3 5" />
      <Label x={px(0.36)} y={py(0.29)} anchor="start" size={20}>B เชิงเส้น</Label>
      <Label x={px(0.67)} y={py(0.1)} anchor="start" size={20} color="var(--fig-accent)">A ล็อก (เสียง)</Label>
      <Label x={px(0.03)} y={py(0.95)} anchor="start" size={20} color="var(--fig-accent-2)">C แอนติล็อก</Label>
      <circle cx={px(0.5)} cy={py(A(0.5))} r={5} fill="var(--fig-accent)" />
      <Label x={px(0.5)} y={py(A(0.5)) + 24} size={20} color="var(--fig-accent)">≈10%</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 — LDR resistance vs illuminance (log–log, typical example)
// ---------------------------------------------------------------------------
function F07LDR() {
  const X0 = 120, X1 = 560, Y0 = 340, Y1 = 40;
  const lx = (v: number) => X0 + ((X1 - X0) * Math.log10(v)) / 3; // 1..1000 lx
  const ly = (r: number) => Y0 - ((Y0 - Y1) * (Math.log10(r) - 2)) / 4; // 100 Ω..1 MΩ
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {[1, 10, 100, 1000].map((v) => (
        <line key={v} x1={lx(v)} y1={Y0} x2={lx(v)} y2={Y1} stroke="var(--fig-grid)" strokeWidth={1.5} />
      ))}
      {[100, 1e3, 1e4, 1e5, 1e6].map((r) => (
        <line key={r} x1={X0} y1={ly(r)} x2={X1} y2={ly(r)} stroke="var(--fig-grid)" strokeWidth={1.5} />
      ))}
      <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={INK} strokeWidth={2.5} />
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={INK} strokeWidth={2.5} />
      {[
        [1, "1"],
        [10, "10"],
        [100, "100"],
        [1000, "1,000"],
      ].map(([v, t]) => (
        <Label key={t as string} x={lx(v as number)} y={Y0 + 22} size={20} muted>{t}</Label>
      ))}
      {[
        [100, "100 Ω"],
        [1e3, "1 kΩ"],
        [1e4, "10 kΩ"],
        [1e5, "100 kΩ"],
        [1e6, "1 MΩ"],
      ].map(([r, t]) => (
        <Label key={t as string} x={X0 - 10} y={ly(r as number)} size={20} muted anchor="end">{t}</Label>
      ))}
      <Label x={340} y={395} size={22}>ความสว่าง (lx) — สเกลล็อก</Label>
      <line x1={lx(1)} y1={ly(150e3)} x2={lx(1000)} y2={ly(400)} stroke="var(--fig-accent)" strokeWidth={4} />
      <circle cx={lx(1)} cy={ly(150e3)} r={6} fill="var(--fig-accent)" />
      <circle cx={lx(1000)} cy={ly(400)} r={6} fill="var(--fig-accent)" />
      <Label x={lx(1) + 14} y={ly(150e3) - 22} anchor="start" size={20}>≈150 kΩ ที่ 1 lx (ห้องมืด)</Label>
      <Label x={lx(1000) - 6} y={ly(400) + 24} anchor="end" size={20}>≈400 Ω ที่ 1,000 lx</Label>
      <Callout x={320} y={124} w={240} h={52} tone="info">
        <Label x={440} y={150} size={20}>ค่าตัวอย่าง ต่างกันตามรุ่น</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 — physical size vs power rating (relative scale)
// ---------------------------------------------------------------------------
function F08Sizes() {
  const axial = [
    { cx: 70, len: 50, h: 19, label: "¼ W" },
    { cx: 195, len: 72, h: 26, label: "½ W" },
    { cx: 340, len: 92, h: 34, label: "1 W" },
    { cx: 500, len: 120, h: 42, label: "2 W" },
  ];
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      {axial.map((a) => (
        <g key={a.label}>
          <AxialBands
            x={a.cx - a.len / 2}
            y={90}
            len={a.len}
            h={a.h}
            lead={20}
            bands={[0.22, 0.38, 0.54, 0.8].map((f, i) => ({ at: a.len * f, c: ["brown", "black", "red", "gold"][i], w: Math.max(5, a.len * 0.08) }))}
          />
          <Label x={a.cx} y={145} weight={700}>{a.label}</Label>
        </g>
      ))}
      {/* cement 5 W */}
      <line x1={50} y1={250} x2={80} y2={250} stroke={INK} strokeWidth={3} />
      <line x1={240} y1={250} x2={270} y2={250} stroke={INK} strokeWidth={3} />
      <rect x={80} y={222} width={160} height={56} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={160} y={251} size={20}>5W 100RJ</Label>
      <Label x={160} y={305} weight={700}>5 W ซีเมนต์</Label>
      {/* aluminium-housed 25 W */}
      <rect x={340} y={215} width={190} height={70} rx={4} fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
      {[360, 380, 400, 420, 440, 460, 480, 500].map((x) => (
        <line key={x} x1={x} y1={215} x2={x} y2={285} stroke={INK} strokeWidth={1.5} />
      ))}
      <rect x={320} y={238} width={20} height={24} fill={BG} stroke={INK} strokeWidth={2} />
      <rect x={530} y={238} width={20} height={24} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={435} y={305} weight={700}>25 W ตัวถังอะลูมิเนียม</Label>
      <Label x={300} y={355} size={20} muted>ขนาดโดยประมาณ — พิกัดจริงต้องดูจาก datasheet</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 — potentiometer as voltage divider vs rheostat
// ---------------------------------------------------------------------------
function F09PotDivider() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <line x1={318} y1={20} x2={318} y2={390} stroke="var(--fig-grid)" strokeWidth={2} strokeDasharray="6 6" />
      {/* left: divider */}
      <Label x={150} y={36} weight={700}>ตัวแบ่งแรงดัน (ใช้ 3 ขา)</Label>
      <Battery x={50} y={200} angle={90} />
      <Label x={82} y={200} anchor="start">9 V</Label>
      <Resistor x={190} y={200} angle={90} />
      <Wire points={[[50, 170], [50, 90], [190, 90], [190, 160]]} />
      <Wire points={[[50, 230], [50, 310], [190, 310], [190, 240]]} />
      <ArrowHead from={[244, 215]} to={[204, 215]} width={3} />
      <Wire points={[[244, 215], [286, 215]]} />
      <Wire points={[[190, 310], [286, 310]]} />
      <Node x={190} y={310} />
      <Terminal x={290} y={215} />
      <Terminal x={290} y={310} />
      <Label x={172} y={150} size={20} muted anchor="end">1</Label>
      <Label x={172} y={252} size={20} muted anchor="end">3</Label>
      <Label x={232} y={196} size={20} muted>2</Label>
      <Label x={212} y={160} size={20} anchor="start">R₁</Label>
      <Label x={212} y={256} size={20} anchor="start" color="var(--fig-accent)">R₂</Label>
      <Label x={290} y={262} size={20} weight={700}>Vout</Label>
      <Label x={150} y={350} size={20}>R₁ 7.5 kΩ · R₂ 2.5 kΩ</Label>
      <Label x={150} y={378} size={20}>Vout = 9 × 2.5/10 = 2.25 V</Label>
      {/* right: rheostat */}
      <Label x={460} y={36} weight={700}>รีโอสแตต (ใช้ 2 ขา)</Label>
      <Battery x={350} y={200} angle={90} label="12 V" labelSide="a" />
      <Resistor x={460} y={110} />
      <ArrowHead from={[460, 66]} to={[460, 98]} width={3} />
      <Wire points={[[460, 66], [512, 66], [512, 110]]} />
      <Node x={512} y={110} />
      <Wire points={[[350, 170], [350, 110], [420, 110]]} />
      <Wire points={[[500, 110], [560, 110], [560, 170]]} />
      <Lamp x={560} y={200} angle={90} on />
      <Wire points={[[560, 230], [560, 300], [350, 300], [350, 230]]} />
      <Label x={414} y={132} size={20} muted>1</Label>
      <Label x={448} y={70} size={20} muted>2</Label>
      <Label x={506} y={134} size={20} muted>3</Label>
      <Label x={450} y={340} size={20}>หมุนให้ R เพิ่ม → I ลด</Label>
      <Label x={450} y={366} size={20}>หลอดหรี่ลง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 — measuring a high-value resistor: correct vs wrong
// ---------------------------------------------------------------------------
function Probe({ tip, dir, color }: { tip: Pt; dir: 1 | -1; color: string }) {
  // probe drawn going up-and-out from the tip; dir −1 = to the left, +1 = to the right
  const [x, y] = tip;
  const hx = x + dir * 40;
  const hy = y - 60;
  return (
    <g>
      <line x1={x} y1={y} x2={x + dir * 14} y2={y - 21} stroke={INK} strokeWidth={3} />
      <line x1={x + dir * 14} y1={y - 21} x2={hx} y2={hy} stroke={color} strokeWidth={12} strokeLinecap="round" />
      <line x1={hx} y1={hy} x2={hx + dir * 30} y2={hy - 40} stroke={color} strokeWidth={3} />
    </g>
  );
}

function F10Measure() {
  const y = 200;
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <Callout x={10} y={10} w={285} h={360} tone="ok" />
      <Callout x={305} y={10} w={285} h={360} tone="danger" />
      <Label x={152} y={42} weight={700} color="var(--fig-ok)">✓ ถูกต้อง</Label>
      <Label x={447} y={42} weight={700} color="var(--fig-danger)">✗ ผิด</Label>
      {/* left */}
      <AxialBands x={115} y={y} len={74} h={26} lead={40} bands={[{ at: 16, c: "brown" }, { at: 30, c: "black" }, { at: 44, c: "yellow" }, { at: 62, c: "gold" }]} />
      <Probe tip={[78, y]} dir={-1} color="var(--fig-plus)" />
      <Probe tip={[226, y]} dir={1} color="var(--fig-minus)" />
      <circle cx={38} cy={140} r={16} fill="var(--fig-skin)" stroke={INK} strokeWidth={1.5} />
      <circle cx={266} cy={140} r={16} fill="var(--fig-skin)" stroke={INK} strokeWidth={1.5} />
      <Label x={152} y={262} size={20}>จับเฉพาะด้ามโพรบ</Label>
      <Label x={152} y={300} size={20}>อ่านได้ ≈ 100 kΩ</Label>
      <Label x={152} y={334} size={20} muted>(100 kΩ ±5%)</Label>
      {/* right */}
      <AxialBands x={410} y={y} len={74} h={26} lead={40} bands={[{ at: 16, c: "brown" }, { at: 30, c: "black" }, { at: 44, c: "yellow" }, { at: 62, c: "gold" }]} />
      <Probe tip={[373, y]} dir={-1} color="var(--fig-plus)" />
      <Probe tip={[521, y]} dir={1} color="var(--fig-minus)" />
      <ellipse cx={372} cy={y + 14} rx={16} ry={11} fill="var(--fig-skin)" stroke={INK} strokeWidth={1.5} />
      <ellipse cx={522} cy={y + 14} rx={16} ry={11} fill="var(--fig-skin)" stroke={INK} strokeWidth={1.5} />
      <Label x={447} y={262} size={20}>นิ้วแตะขาทั้งสองข้าง</Label>
      <Label x={447} y={300} size={20}>ร่างกายขนานกับ R</Label>
      <Label x={447} y={334} size={20} color="var(--fig-danger)">อ่านได้ต่ำกว่าจริง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 — find-the-faults: measuring R₂ (viewBox 600×420)
// ---------------------------------------------------------------------------
function F11FindFault() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <Battery x={60} y={200} angle={90} label="9 V" labelSide="a" />
      <Resistor x={150} y={90} label="R₁" value="1 kΩ" />
      <Resistor x={240} y={200} angle={90} label="R₃" value="1.5 kΩ" labelSide="b" />
      <Resistor x={340} y={200} angle={90} />
      <Label x={326} y={186} anchor="end">R₂</Label>
      <Label x={326} y={214} size={20} anchor="end" muted>10 kΩ</Label>
      <Wire points={[[60, 170], [60, 90], [110, 90]]} />
      <Wire points={[[190, 90], [340, 90], [340, 160]]} />
      <Wire points={[[240, 90], [240, 160]]} />
      <Node x={240} y={90} />
      <Wire points={[[60, 230], [60, 310], [340, 310], [340, 240]]} />
      <Wire points={[[240, 240], [240, 310]]} />
      <Node x={240} y={310} />
      {/* probes on R2 */}
      <line x1={340} y1={150} x2={372} y2={150} stroke={INK} strokeWidth={3} />
      <line x1={372} y1={150} x2={404} y2={150} stroke="var(--fig-plus)" strokeWidth={12} strokeLinecap="round" />
      <line x1={340} y1={250} x2={372} y2={250} stroke={INK} strokeWidth={3} />
      <line x1={372} y1={250} x2={404} y2={250} stroke="var(--fig-minus)" strokeWidth={12} strokeLinecap="round" />
      <path d="M 404 150 C 440 150 450 220 530 360" fill="none" stroke="var(--fig-plus)" strokeWidth={3} />
      <path d="M 404 250 C 425 250 430 320 470 360" fill="none" stroke="var(--fig-minus)" strokeWidth={3} />
      <ellipse cx={350} cy={140} rx={15} ry={10} fill="var(--fig-skin)" stroke={INK} strokeWidth={1.5} />
      <ellipse cx={350} cy={262} rx={15} ry={10} fill="var(--fig-skin)" stroke={INK} strokeWidth={1.5} />
      {/* meter */}
      <rect x={440} y={110} width={150} height={290} rx={14} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={456} y={126} width={118} height={48} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={515} y={151} size={22} weight={700}>– – –</Label>
      <circle cx={515} cy={250} r={40} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={515} y1={250} x2={540} y2={222} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Label x={558} y={206} size={20} weight={700}>Ω</Label>
      <Label x={472} y={206} size={20} muted>V</Label>
      <Label x={472} y={296} size={20} muted>A</Label>
      <circle cx={470} cy={360} r={9} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={530} cy={360} r={9} fill={BG} stroke="var(--fig-plus)" strokeWidth={2.5} />
      <Label x={470} y={386} size={20}>COM</Label>
      <Label x={538} y={386} size={20}>VΩ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 — symbols of dependent (special) resistors
// ---------------------------------------------------------------------------
function BentLine({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g>
      <polyline points={`${x - 42},${y + 24} ${x - 28},${y + 24} ${x + 24},${y - 26}`} fill="none" stroke={INK} strokeWidth={2.5} />
      <Label x={x + 30} y={y + 28} size={20} anchor="start" weight={700}>{text}</Label>
    </g>
  );
}

function F12Special() {
  const ys = 90;
  return (
    <svg viewBox="0 0 600 250" aria-hidden="true">
      {[150, 300, 450].map((x) => (
        <line key={x} x1={x} y1={20} x2={x} y2={230} stroke="var(--fig-grid)" strokeWidth={1.5} />
      ))}
      {/* LDR */}
      <Resistor x={75} y={ys} />
      <ArrowHead from={[30, 30]} to={[56, 70]} />
      <ArrowHead from={[56, 26]} to={[82, 66]} />
      <CellLabel x={75} y={160} a="LDR" b="แสงมาก R ลด" />
      {/* NTC */}
      <Resistor x={222} y={ys} />
      <BentLine x={222} y={ys} text="−t°" />
      <CellLabel x={225} y={160} a="NTC" b="ร้อน → R ลด" />
      {/* PTC */}
      <Resistor x={372} y={ys} />
      <BentLine x={372} y={ys} text="+t°" />
      <CellLabel x={375} y={160} a="PTC" b="ร้อน → R เพิ่ม" />
      {/* VDR */}
      <Resistor x={522} y={ys} />
      <BentLine x={522} y={ys} text="U" />
      <CellLabel x={525} y={160} a="VDR (MOV)" b="V สูง → R ลด" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 — which end is band 1? red-red-orange-red (22 kΩ ±2%)
// ---------------------------------------------------------------------------
function F13Reverse() {
  const y = 130;
  const bands = [
    { at: 52, c: "red", th: "แดง" },
    { at: 96, c: "red", th: "แดง" },
    { at: 140, c: "orange", th: "ส้ม" },
    { at: 238, c: "red", th: "แดง" },
  ];
  return (
    <svg viewBox="0 0 600 300" aria-hidden="true">
      <AxialBands x={150} y={y} len={300} h={70} lead={70} bands={bands.map((b) => ({ at: b.at, c: b.c, w: 22 }))} />
      {bands.map((b) => (
        <Label key={b.at} x={150 + b.at} y={y + 58} size={22} weight={700}>{b.th}</Label>
      ))}
      <Label x={110} y={60} weight={700}>ปลาย ก</Label>
      <Label x={490} y={60} weight={700}>ปลาย ข</Label>
      <ArrowHead from={[90, 240]} to={[230, 240]} />
      <Label x={160} y={270} size={20} muted>อ่านจากปลาย ก</Label>
      <ArrowHead from={[510, 240]} to={[370, 240]} />
      <Label x={440} y={270} size={20} muted>อ่านจากปลาย ข</Label>
      <Label x={300} y={40} size={20} muted>ตัวต้านทาน 4 แถบ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F14 — series and mixed combinations (W07-E07, W07-E08)
// ---------------------------------------------------------------------------
function F14Combos() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Label x={30} y={34} anchor="start" weight={700}>(ก) อนุกรม</Label>
      <Terminal x={40} y={100} label="A" />
      <Wire points={[[46, 100], [80, 100]]} />
      <Resistor x={120} y={100} label="100 Ω" />
      <Wire points={[[160, 100], [220, 100]]} />
      <Resistor x={260} y={100} label="220 Ω" />
      <Wire points={[[300, 100], [360, 100]]} />
      <Resistor x={400} y={100} label="330 Ω" />
      <Wire points={[[440, 100], [474, 100]]} />
      <Terminal x={480} y={100} label="B" />
      <Label x={300} y={150} weight={700} color="var(--fig-accent)">R รวม = 650 Ω</Label>
      <line x1={20} y1={180} x2={580} y2={180} stroke="var(--fig-grid)" strokeWidth={1.5} />
      <Label x={30} y={208} anchor="start" weight={700}>(ข) ผสม</Label>
      <Terminal x={40} y={300} label="A" />
      <Wire points={[[46, 300], [80, 300]]} />
      <Resistor x={120} y={300} label="100 Ω" />
      <Wire points={[[160, 300], [230, 300]]} />
      <Node x={230} y={300} />
      <Wire points={[[230, 300], [230, 260], [280, 260]]} />
      <Wire points={[[230, 300], [230, 340], [280, 340]]} />
      <Resistor x={320} y={260} label="220 Ω" />
      <Resistor x={320} y={340} value="330 Ω" labelSide="b" />
      <Wire points={[[360, 260], [410, 260], [410, 340], [360, 340]]} />
      <Node x={410} y={300} />
      <Wire points={[[410, 300], [474, 300]]} />
      <Terminal x={480} y={300} label="B" />
      <Label x={540} y={286} weight={700} color="var(--fig-accent)">R รวม</Label>
      <Label x={540} y={316} weight={700} color="var(--fig-accent)">= 232 Ω</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W07-F01": F01Symbols,
  "W07-F02": F02Cutaway,
  "W07-F03": F03Gallery,
  "W07-F04": F04ColourTable,
  "W07-F05": F05BandPositions,
  "W07-F06": F06Taper,
  "W07-F07": F07LDR,
  "W07-F08": F08Sizes,
  "W07-F09": F09PotDivider,
  "W07-F10": F10Measure,
  "W07-F11": F11FindFault,
  "W07-F12": F12Special,
  "W07-F13": F13Reverse,
  "W07-F14": F14Combos,
};
export default figures;
