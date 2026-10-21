/**
 * Week 1 figures — ระบบความปลอดภัยในการทำงานไฟฟ้าและอิเล็กทรอนิกส์
 * All drawings are original. Wire colours per มอก. 11-2553.
 */
import type { FigureMap } from "@/content/types";
import { ACSource, Arrow, Capacitor, Ground, Label, Node, PEWire, Resistor, Wire } from "./kit";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const PANEL = "var(--fig-panel)";
const BG = "var(--fig-bg)";
const L_C = "var(--fig-wire-l)";
const N_C = "var(--fig-wire-n)";
const OK = "var(--fig-ok)";
const DANGER = "var(--fig-danger)";
const WARN = "var(--fig-warn)";
const CUR = "var(--fig-current)";
const SKIN = "var(--fig-skin)";
const COPPER = "var(--fig-copper)";

type Pt = [number, number];

/** Simple stick person: head centre (x, y); hands at given points; feet spread. */
function Person({
  x,
  y,
  hands,
  scale = 1,
  feetY,
}: {
  x: number;
  y: number;
  hands: [Pt, Pt];
  scale?: number;
  feetY?: number;
}) {
  const s = scale;
  const shoulder: Pt = [x, y + 24 * s];
  const hip: Pt = [x, y + 95 * s];
  const fy = feetY ?? y + 170 * s;
  return (
    <g>
      <line x1={x} y1={y + 16 * s} x2={hip[0]} y2={hip[1]} stroke={INK} strokeWidth={5 * s} strokeLinecap="round" />
      <line x1={shoulder[0]} y1={shoulder[1]} x2={hands[0][0]} y2={hands[0][1]} stroke={INK} strokeWidth={4.5 * s} strokeLinecap="round" />
      <line x1={shoulder[0]} y1={shoulder[1]} x2={hands[1][0]} y2={hands[1][1]} stroke={INK} strokeWidth={4.5 * s} strokeLinecap="round" />
      <line x1={hip[0]} y1={hip[1]} x2={x - 22 * s} y2={fy} stroke={INK} strokeWidth={5 * s} strokeLinecap="round" />
      <line x1={hip[0]} y1={hip[1]} x2={x + 22 * s} y2={fy} stroke={INK} strokeWidth={5 * s} strokeLinecap="round" />
      <circle cx={x} cy={y} r={16 * s} fill={SKIN} stroke={INK} strokeWidth={3} />
    </g>
  );
}

/** Earth surface with hatching. */
function EarthLine({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const ticks = [];
  for (let x = x1 + 6; x < x2; x += 18) {
    ticks.push(<line key={x} x1={x} y1={y + 2} x2={x - 12} y2={y + 14} stroke={MUTED} strokeWidth={2} />);
  }
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeWidth={3} />
      {ticks}
    </g>
  );
}

function Bolt({ x, y, s = 1, fill = WARN }: { x: number; y: number; s?: number; fill?: string }) {
  // lightning bolt centred near (x, y)
  const d = `M ${x + 8 * s} ${y - 40 * s} L ${x - 18 * s} ${y + 4 * s} L ${x - 2 * s} ${y + 4 * s} L ${x - 10 * s} ${y + 40 * s} L ${x + 18 * s} ${y - 6 * s} L ${x + 2 * s} ${y - 6 * s} Z`;
  return <path d={d} fill={fill} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />;
}

function Spark({ x, y, r = 14, color = WARN }: { x: number; y: number; r?: number; color?: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return <polygon points={pts.join(" ")} fill={color} stroke={INK} strokeWidth={1.5} />;
}

// ---------------------------------------------------------------------------
// F01 — three groups of electrical hazards
// ---------------------------------------------------------------------------
function HazardGroups() {
  const cards = [
    { x: 10, title: "ไฟฟ้าดูด", en: "(electric shock)", l1: "กระแสไหลผ่าน", l2: "ร่างกาย" },
    { x: 207, title: "อาร์ก/แผลไหม้", en: "(arc flash, burns)", l1: "ประกายไฟและ", l2: "ความร้อนสูงมาก" },
    { x: 404, title: "อัคคีภัย", en: "(electrical fire)", l1: "กระแสเกิน/", l2: "ลัดวงจร → ไฟไหม้" },
  ];
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      {cards.map((c) => (
        <g key={c.x}>
          <rect x={c.x} y={10} width={186} height={320} rx={14} fill={PANEL} stroke={DANGER} strokeWidth={2.5} />
          <Label x={c.x + 93} y={42} size={24} weight={700}>{c.title}</Label>
          <Label x={c.x + 93} y={72} size={20} muted>{c.en}</Label>
          <Label x={c.x + 93} y={270} size={20}>{c.l1}</Label>
          <Label x={c.x + 93} y={298} size={20}>{c.l2}</Label>
        </g>
      ))}
      {/* shock: person-like hand to bolt */}
      <Bolt x={103} y={165} s={1.5} />
      <circle cx={103} cy={165} r={62} fill="none" stroke={DANGER} strokeWidth={3} strokeDasharray="8 6" />
      {/* arc flash: two electrodes and a burst */}
      <rect x={232} y={150} width={40} height={30} rx={4} fill={COPPER} stroke={INK} strokeWidth={2.5} />
      <rect x={328} y={150} width={40} height={30} rx={4} fill={COPPER} stroke={INK} strokeWidth={2.5} />
      <Spark x={300} y={165} r={34} />
      <Spark x={300} y={165} r={16} color={BG} />
      <path d="M 272 165 l 8 -10 l 6 14 l 6 -12 l 8 16" fill="none" stroke={INK} strokeWidth={2.5} />
      {/* fire: flame */}
      <path
        d="M 497 230 C 450 230 445 180 470 150 C 470 175 485 178 487 165 C 487 140 500 120 515 100 C 515 130 545 150 540 190 C 538 220 520 230 497 230 Z"
        fill={CUR}
        stroke={INK}
        strokeWidth={2.5}
      />
      <path d="M 497 228 C 478 226 476 200 490 186 C 492 200 502 200 503 190 C 512 200 520 215 497 228 Z" fill={WARN} stroke={INK} strokeWidth={2} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 — log scale band of body-current effects (AC 50 Hz, hand–feet)
// ---------------------------------------------------------------------------
function CurrentBand() {
  const X = (amp: number) => 40 + 104 * Math.log10(amp / 1e-4);
  const zones = [
    { a: 1e-4, b: 5e-4, fill: OK, n: "1" },
    { a: 5e-4, b: 1e-2, fill: WARN, n: "2" },
    { a: 1e-2, b: 5e-2, fill: CUR, n: "3" },
    { a: 5e-2, b: 10, fill: DANGER, n: "4" },
  ];
  const ticks: [number, string][] = [
    [1e-4, "0.1 mA"],
    [1e-3, "1 mA"],
    [1e-2, "10 mA"],
    [1e-1, "100 mA"],
    [1, "1 A"],
    [10, "10 A"],
  ];
  const legend = [
    { n: "1", fill: OK, t: "โดยทั่วไปไม่รู้สึก" },
    { n: "2", fill: WARN, t: "รู้สึก → เจ็บ กล้ามเนื้อกระตุก ยังปล่อยมือได้" },
    { n: "3", fill: CUR, t: "ปล่อยมือไม่ได้ หายใจลำบาก" },
    { n: "4", fill: DANGER, t: "เสี่ยงหัวใจเต้นพลิ้ว (VF) ถ้าเกิน ~50–80 mA นาน > 1 s" },
  ];
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <Label x={300} y={24} size={20} weight={700}>กระแสสลับ 50 Hz ผ่านร่างกาย มือ→เท้า (ค่าประมาณ)</Label>
      {/* marker labels above band */}
      <line x1={X(5e-4)} y1={128} x2={X(5e-4)} y2={150} stroke={INK} strokeWidth={2} />
      <Label x={X(5e-4)} y={114} size={20}>รู้สึก ~0.5 mA</Label>
      <line x1={X(1e-2)} y1={78} x2={X(1e-2)} y2={150} stroke={INK} strokeWidth={2} />
      <Label x={X(1e-2) - 6} y={64} size={20}>ปล่อยมือไม่ได้ ~10 mA</Label>
      <line x1={X(0.23)} y1={128} x2={X(0.23)} y2={150} stroke={INK} strokeWidth={2} />
      <Label x={X(0.23) + 20} y={114} size={20} weight={700}>ไฟบ้าน มือเปียก ≈ 230 mA</Label>
      {/* band */}
      {zones.map((z) => (
        <g key={z.n}>
          <rect x={X(z.a)} y={150} width={X(z.b) - X(z.a)} height={50} fill={z.fill} opacity={0.55} />
          <Label x={(X(z.a) + X(z.b)) / 2} y={176} size={22} weight={700}>{z.n}</Label>
        </g>
      ))}
      <rect x={40} y={150} width={520} height={50} fill="none" stroke={INK} strokeWidth={2.5} />
      {/* zone borders (pattern-independent) */}
      {zones.slice(1).map((z) => (
        <line key={z.n} x1={X(z.a)} y1={150} x2={X(z.a)} y2={200} stroke={INK} strokeWidth={2} />
      ))}
      {/* RCD 30 mA dashed marker */}
      <line x1={X(0.03)} y1={140} x2={X(0.03)} y2={256} stroke={INK} strokeWidth={3} strokeDasharray="7 5" />
      <Label x={X(0.03)} y={272} size={20} weight={700}>RCD 30 mA</Label>
      {/* ticks */}
      {ticks.map(([a, t]) => (
        <g key={t}>
          <line x1={X(a)} y1={200} x2={X(a)} y2={212} stroke={INK} strokeWidth={2} />
          <Label x={X(a)} y={230} size={20} muted>{t}</Label>
        </g>
      ))}
      {/* legend */}
      {legend.map((l, i) => (
        <g key={l.n}>
          <rect x={20} y={298 + i * 30} width={30} height={22} fill={l.fill} opacity={0.55} stroke={INK} strokeWidth={1.5} />
          <Label x={35} y={310 + i * 30} size={18} weight={700}>{l.n}</Label>
          <Label x={62} y={310 + i * 30} size={20} anchor="start">{l.t}</Label>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 — three ways of getting a shock (wide)
// ---------------------------------------------------------------------------
function ShockModes() {
  return (
    <svg viewBox="0 0 900 440" aria-hidden="true">
      {[0, 300, 600].map((ox) => (
        <rect key={ox} x={ox + 6} y={6} width={288} height={428} rx={12} fill={PANEL} stroke="var(--fig-grid)" strokeWidth={2} />
      ))}
      {/* (ก) L–N */}
      <g>
        <Label x={150} y={38} size={26} weight={700}>(ก) จับ L และ N</Label>
        <Wire points={[[16, 84], [104, 84]]} color={L_C} width={7} />
        <Wire points={[[104, 84], [118, 84]]} color={COPPER} width={5} />
        <Label x={36} y={110} size={26} weight={700} color={L_C}>L</Label>
        <Wire points={[[196, 84], [284, 84]]} color={N_C} width={7} />
        <Wire points={[[182, 84], [196, 84]]} color={COPPER} width={5} />
        <Label x={264} y={110} size={26} weight={700} color={N_C}>N</Label>
        <Person x={150} y={150} hands={[[120, 88], [180, 88]]} feetY={318} />
        <rect x={92} y={318} width={116} height={14} fill={MUTED} />
        <Arrow from={[124, 100]} to={[146, 168]} color={CUR} width={4} />
        <Arrow from={[154, 168]} to={[176, 100]} color={CUR} width={4} />
        <Label x={150} y={358} size={26}>ยืนบนฉนวน</Label>
        <Label x={150} y={402} size={28} weight={800} color={DANGER}>RCD ไม่ตัด ✗</Label>
      </g>
      {/* (ข) L–earth */}
      <g>
        <Label x={450} y={38} size={26} weight={700}>(ข) จับ L ยืนบนพื้น</Label>
        <Wire points={[[316, 84], [414, 84]]} color={L_C} width={7} />
        <Wire points={[[414, 84], [428, 84]]} color={COPPER} width={5} />
        <Label x={336} y={110} size={26} weight={700} color={L_C}>L</Label>
        <Person x={470} y={150} hands={[[430, 88], [500, 228]]} feetY={318} />
        <EarthLine x1={320} x2={584} y={320} />
        <Arrow from={[438, 104]} to={[464, 170]} color={CUR} width={4} />
        <Arrow from={[470, 252]} to={[456, 306]} color={CUR} width={4} />
        <Arrow from={[448, 326]} to={[448, 344]} color={CUR} width={4} head={10} />
        <Label x={450} y={366} size={26}>กระแสรั่วลงดิน</Label>
        <Label x={450} y={406} size={28} weight={800} color={OK}>RCD ตัด ✓</Label>
      </g>
      {/* (ค) frame leakage without PE */}
      <g>
        <Label x={750} y={38} size={26} weight={700}>(ค) โครงเครื่องรั่ว</Label>
        <Wire points={[[640, 172], [640, 70], [612, 70]]} color={L_C} width={5} />
        <Wire points={[[652, 172], [652, 60], [612, 60]]} color={N_C} width={5} />
        <rect x={622} y={172} width={124} height={148} rx={8} fill={BG} stroke={INK} strokeWidth={3} />
        <circle cx={684} cy={252} r={36} fill={PANEL} stroke={INK} strokeWidth={3} />
        <Spark x={730} y={190} r={13} />
        <Person x={818} y={150} hands={[[748, 220], [846, 230]]} feetY={318} />
        <EarthLine x1={612} x2={886} y={320} />
        <Arrow from={[756, 216]} to={[808, 186]} color={CUR} width={4} />
        <Arrow from={[818, 252]} to={[804, 306]} color={CUR} width={4} />
        <Label x={750} y={366} size={26}>ไม่มีสายดิน PE</Label>
        <Label x={750} y={406} size={28} weight={800} color={DANGER}>กระแสผ่านคน ✗</Label>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 — body equivalent circuit
// ---------------------------------------------------------------------------
function BodyCircuit() {
  return (
    <svg viewBox="0 0 600 450" aria-hidden="true">
      <Wire points={[[80, 130], [80, 60], [190, 60]]} />
      <ACSource x={80} y={170} angle={90} label="L–N" value="230 V ~" />
      <Resistor x={230} y={60} label="R มือ (ผิวหนัง)" />
      <Wire points={[[270, 60], [400, 60], [400, 100]]} />
      <Arrow from={[300, 82]} to={[370, 82]} label="I" labelOffset={[0, 18]} />
      <Resistor x={400} y={140} angle={90} label="R ภายในร่างกาย" />
      <Wire points={[[400, 180], [400, 210]]} />
      <Resistor x={400} y={250} angle={90} label="R เท้า + พื้น" />
      <Wire points={[[400, 290], [400, 300]]} />
      <Ground x={400} y={300} kind="earth" />
      <Wire points={[[80, 210], [80, 300]]} />
      <Ground x={80} y={300} kind="earth" label="N ต่อลงดินที่หม้อแปลง" />
      <Label x={240} y={350} size={20} muted>กระแสไหลกลับผ่านดิน</Label>
      <rect x={60} y={372} width={480} height={70} rx={10} fill={PANEL} stroke="var(--fig-accent)" strokeWidth={2.5} />
      <Label x={300} y={392} size={20}>R รวม (มือเปียก เท้าเปล่า) ≈ 1,000 Ω</Label>
      <Label x={300} y={424} size={22} weight={700} color={DANGER}>I = 230 V ÷ 1,000 Ω = 0.23 A = 230 mA</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 — conductor colours (มอก. 11-2553)
// ---------------------------------------------------------------------------
function Core({ y, color, pe, label, y0 }: { y: number; color?: string; pe?: boolean; label: string; y0: number }) {
  const pts: Pt[] = [
    [180, y0],
    [220, y0],
    [280, y],
    [330, y],
  ];
  return (
    <g>
      {pe ? <PEWire points={pts} width={11} /> : <Wire points={pts} color={color} width={11} />}
      <Wire points={[[330, y], [352, y]]} color={COPPER} width={6} />
      <Label x={364} y={y} size={20} anchor="start">{label}</Label>
    </g>
  );
}

function WireColours() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <Label x={20} y={26} size={22} weight={700} anchor="start">ระบบ 1 เฟส (3 แกน)</Label>
      <rect x={20} y={66} width={170} height={40} rx={8} fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
      <Core y={58} y0={76} color={L_C} label="L — สีน้ำตาล" />
      <Core y={90} y0={86} color={N_C} label="N — สีฟ้า" />
      <Core y={122} y0={96} pe label="PE — เขียวแถบเหลือง" />
      <Label x={20} y={186} size={22} weight={700} anchor="start">ระบบ 3 เฟส (5 แกน)</Label>
      <rect x={20} y={262} width={170} height={60} rx={8} fill="var(--fig-grid)" stroke={INK} strokeWidth={2.5} />
      <Core y={222} y0={272} color={L_C} label="L1 — สีน้ำตาล" />
      <Core y={256} y0={282} color="var(--fig-wire-l2)" label="L2 — สีดำ" />
      <Core y={290} y0={292} color="var(--fig-wire-l3)" label="L3 — สีเทา" />
      <Core y={324} y0={302} color={N_C} label="N — สีฟ้า" />
      <Core y={358} y0={312} pe label="PE — เขียวแถบเหลือง" />
      <Label x={300} y={400} size={20} muted>อาคารเก่าอาจใช้สีเดิม — ต้องวัดตรวจสอบเสมอ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 — spot the hazard at home (hotspot find, viewBox 600×450)
// ---------------------------------------------------------------------------
function HomeHazards() {
  return (
    <svg viewBox="0 0 600 450" aria-hidden="true">
      {/* rooms */}
      <rect x={0} y={0} width={600} height={402} fill={PANEL} />
      <line x1={300} y1={0} x2={300} y2={402} stroke={MUTED} strokeWidth={3} />
      <rect x={0} y={402} width={600} height={48} fill="var(--fig-grid)" />
      <line x1={0} y1={402} x2={600} y2={402} stroke={INK} strokeWidth={3} />
      <Label x={150} y={24} size={20} muted>ห้องนั่งเล่น</Label>
      <Label x={450} y={24} size={20} muted>ห้องน้ำ / ครัว</Label>

      {/* H1 cracked plug in wall socket (90, 150) */}
      <rect x={66} y={128} width={48} height={48} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      <rect x={74} y={140} width={32} height={30} rx={4} fill="var(--fig-wire-l2)" stroke={INK} strokeWidth={2} />
      <path d="M 82 140 l 6 8 l -4 6 l 8 6 l -3 10" fill="none" stroke={WARN} strokeWidth={3} />
      <Wire points={[[90, 170], [90, 200], [60, 230]]} color="var(--fig-wire-l2)" width={4} />

      {/* H2 child at low socket (40, 320) */}
      <rect x={24} y={306} width={34} height={34} rx={5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={35} cy={320} r={3.5} fill={INK} />
      <circle cx={47} cy={320} r={3.5} fill={INK} />
      <Person x={100} y={300} hands={[[56, 322], [118, 350]]} scale={0.6} feetY={400} />
      <line x1={56} y1={322} x2={46} y2={324} stroke={MUTED} strokeWidth={3} />

      {/* H3 daisy-chained power strips on floor */}
      <rect x={90} y={410} width={84} height={18} rx={4} fill={BG} stroke={INK} strokeWidth={2.5} />
      <rect x={196} y={418} width={84} height={18} rx={4} fill={BG} stroke={INK} strokeWidth={2.5} />
      {[104, 124, 144].map((x) => (
        <rect key={x} x={x} y={414} width={10} height={10} fill="var(--fig-wire-l2)" />
      ))}
      {[214, 234, 254].map((x) => (
        <rect key={x} x={x} y={422} width={10} height={10} fill="var(--fig-wire-l2)" />
      ))}
      <Wire points={[[160, 419], [160, 400], [186, 400], [196, 427]]} color="var(--fig-wire-l2)" width={3} />
      <Wire points={[[90, 419], [70, 419], [62, 342]]} color="var(--fig-wire-l2)" width={3} />

      {/* H4 heavy cabinet on cable (180–270, 290–400) */}
      <rect x={180} y={290} width={92} height={110} rx={4} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={3} />
      <line x1={226} y1={300} x2={226} y2={390} stroke={INK} strokeWidth={2} />
      <Wire points={[[280, 427], [286, 400], [262, 400], [180, 400]]} color="var(--fig-wire-l2)" width={4} />

      {/* H5 lamp covered with cloth on cabinet (226, 250) */}
      <line x1={226} y1={290} x2={226} y2={262} stroke={INK} strokeWidth={4} />
      <path d="M 196 262 L 256 262 L 244 222 L 208 222 Z" fill={WARN} stroke={INK} strokeWidth={2.5} />
      <path d="M 190 270 C 196 240 200 214 226 206 C 252 214 256 240 262 270 C 248 260 238 274 226 264 C 214 274 204 260 190 270 Z" fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />

      {/* H6 water heater with only L and N (360, 100) */}
      <rect x={326} y={56} width={68} height={92} rx={8} fill={BG} stroke={INK} strokeWidth={3} />
      <circle cx={360} cy={86} r={10} fill="none" stroke={INK} strokeWidth={2.5} />
      <Wire points={[[350, 56], [350, 40], [300, 40]]} color={L_C} width={4} />
      <Wire points={[[370, 56], [370, 34], [300, 34]]} color={N_C} width={4} />
      <Wire points={[[360, 148], [360, 168], [372, 186]]} color={MUTED} width={4} />

      {/* H7 wet person with hair dryer (470) */}
      <ellipse cx={470} cy={402} rx={58} ry={9} fill="var(--fig-wire-n)" opacity={0.45} />
      <Person x={470} y={210} hands={[[436, 196], [500, 280]]} feetY={398} />
      <path d="M 420 186 L 446 186 L 446 206 L 420 206 Z" fill={MUTED} stroke={INK} strokeWidth={2} />
      <path d="M 434 206 L 438 228" stroke={INK} strokeWidth={4} />
      {[[506, 292], [512, 306], [498, 304]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M ${x} ${y - 7} q 5 7 0 10 q -5 -3 0 -10 Z`} fill="var(--fig-wire-n)" />
      ))}
      <Wire points={[[438, 228], [420, 260], [404, 300], [380, 260]]} color="var(--fig-wire-l2)" width={3} />
      <rect x={366} y={244} width={28} height={28} rx={4} fill={BG} stroke={INK} strokeWidth={2.5} />

      {/* H8 cable draped near hot stove (550, 330) */}
      <rect x={516} y={340} width={80} height={60} fill="var(--fig-grid)" stroke={INK} strokeWidth={3} />
      <rect x={522} y={326} width={68} height={14} rx={3} fill={INK} />
      <ellipse cx={556} cy={326} rx={24} ry={5} fill={DANGER} />
      <path d="M 546 318 q 4 -8 0 -14 M 558 318 q 4 -8 0 -14 M 570 318 q 4 -8 0 -14" fill="none" stroke={DANGER} strokeWidth={2.5} />
      <Wire points={[[596, 300], [570, 322], [540, 324], [520, 300], [510, 290]]} color="var(--fig-wire-l2)" width={4} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 — safety signs and symbols
// ---------------------------------------------------------------------------
function SafetySymbols() {
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      {[
        [10, 10],
        [305, 10],
        [10, 225],
        [305, 225],
      ].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={285} height={205} rx={12} fill={PANEL} stroke="var(--fig-grid)" strokeWidth={2} />
      ))}
      {/* W012 */}
      <path d="M 152 28 L 212 132 L 92 132 Z" fill={WARN} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <path d="M 158 58 L 136 98 L 150 98 L 142 124 L 168 86 L 154 86 Z" fill={INK} />
      <Label x={152} y={160} size={20} weight={700}>ISO 7010 W012</Label>
      <Label x={152} y={190} size={20}>อันตรายจากไฟฟ้า</Label>
      {/* Protective earth IEC 60417-5019 */}
      <circle cx={447} cy={82} r={46} fill={BG} stroke={INK} strokeWidth={3.5} />
      <g stroke={INK} strokeWidth={4} strokeLinecap="round">
        <line x1={447} y1={50} x2={447} y2={80} />
        <line x1={423} y1={80} x2={471} y2={80} />
        <line x1={431} y1={93} x2={463} y2={93} />
        <line x1={440} y1={106} x2={454} y2={106} />
      </g>
      <Label x={447} y={160} size={20} weight={700}>IEC 60417-5019</Label>
      <Label x={447} y={190} size={20}>ขั้วสายดินป้องกัน (PE)</Label>
      {/* Class II */}
      <rect x={106} y={244} width={92} height={92} fill="none" stroke={INK} strokeWidth={4} />
      <rect x={128} y={266} width={48} height={48} fill="none" stroke={INK} strokeWidth={4} />
      <Label x={152} y={372} size={20} weight={700}>Class II</Label>
      <Label x={152} y={402} size={20}>ฉนวนสองชั้น ไม่ต้องต่อดิน</Label>
      {/* Tag */}
      <path d="M 392 244 L 502 244 L 502 352 L 392 352 Z" fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={392} y={244} width={110} height={34} fill={DANGER} />
      <circle cx={447} cy={258} r={0} />
      <Label x={447} y={262} size={20} weight={800} color={BG}>อันตราย</Label>
      <Label x={447} y={302} size={20} weight={700}>ห้ามสับ</Label>
      <Label x={447} y={330} size={20} weight={700}>สวิตช์</Label>
      <Label x={447} y={372} size={20} weight={700}>ป้ายแขวนที่สวิตช์</Label>
      <Label x={447} y={402} size={20}>“กำลังซ่อม”</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 — a safe electronics workbench (hotspot explore, viewBox 600×420)
// ---------------------------------------------------------------------------
function SafeBench() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <rect x={0} y={0} width={600} height={420} fill={PANEL} />
      {/* wall items */}
      <rect x={30} y={40} width={80} height={90} rx={8} fill={WARN} stroke={INK} strokeWidth={3} />
      <circle cx={70} cy={84} r={26} fill={DANGER} stroke={INK} strokeWidth={3} />
      <Label x={70} y={150} size={20} weight={700}>หยุดฉุกเฉิน</Label>
      <rect x={150} y={44} width={70} height={84} rx={6} fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={168} y={60} width={34} height={22} rx={3} fill="var(--fig-grid)" stroke={INK} strokeWidth={2} />
      <circle cx={185} cy={106} r={9} fill="var(--fig-accent)" stroke={INK} strokeWidth={2} />
      <Label x={185} y={150} size={20} weight={700}>RCD โต๊ะ</Label>
      {/* bench */}
      <rect x={10} y={270} width={580} height={20} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={3} />
      <line x1={40} y1={290} x2={40} y2={410} stroke={INK} strokeWidth={6} />
      <line x1={500} y1={290} x2={500} y2={410} stroke={INK} strokeWidth={6} />
      {/* ESD mat */}
      <rect x={60} y={262} width={140} height={8} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={1.5} />
      {/* soldering iron in stand */}
      <path d="M 250 268 L 300 268 L 290 252 L 260 252 Z" fill={MUTED} stroke={INK} strokeWidth={2.5} />
      <path d="M 262 252 L 300 196" stroke={INK} strokeWidth={3} fill="none" />
      <path d="M 268 248 L 316 180" stroke={INK} strokeWidth={3} fill="none" />
      <line x1={318} y1={176} x2={336} y2={152} stroke={INK} strokeWidth={12} strokeLinecap="round" />
      <line x1={292} y1={212} x2={312} y2={184} stroke={MUTED} strokeWidth={6} />
      <ellipse cx={240} cy={262} rx={14} ry={6} fill="var(--fig-wire-n)" opacity={0.6} stroke={INK} strokeWidth={1.5} />
      <Label x={250} y={312} size={20} weight={700}>ขาตั้งหัวแร้ง</Label>
      {/* fume extractor */}
      <rect x={370} y={176} width={74} height={94} rx={8} fill={BG} stroke={INK} strokeWidth={3} />
      <circle cx={407} cy={218} r={26} fill="none" stroke={INK} strokeWidth={2.5} />
      <path d="M 407 218 L 407 194 M 407 218 L 428 230 M 407 218 L 386 230" stroke={INK} strokeWidth={3} />
      <Label x={407} y={150} size={20} weight={700}>ดูดควัน</Label>
      {/* safety glasses */}
      <g fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={3}>
        <ellipse cx={490} cy={252} rx={20} ry={14} />
        <ellipse cx={540} cy={252} rx={20} ry={14} />
      </g>
      <line x1={510} y1={250} x2={520} y2={250} stroke={INK} strokeWidth={3} />
      <Label x={515} y={222} size={20} weight={700}>แว่นนิรภัย</Label>
      {/* battery bin under bench */}
      <rect x={350} y={320} width={110} height={88} rx={6} fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={378} y={344} width={22} height={40} rx={3} fill={OK} stroke={INK} strokeWidth={2} />
      <rect x={410} y={344} width={22} height={40} rx={3} fill={OK} stroke={INK} strokeWidth={2} />
      <rect x={384} y={338} width={10} height={6} fill={INK} />
      <rect x={416} y={338} width={10} height={6} fill={INK} />
      <Label x={405} y={312} size={20} weight={700}>ถังแยกแบตเตอรี่</Label>
      <Label x={130} y={240} size={20} weight={700}>แผ่นรอง ESD</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 — frame fault with PE + RCD
// ---------------------------------------------------------------------------
function PEandRCD() {
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      {/* consumer unit */}
      <rect x={14} y={60} width={170} height={190} rx={10} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={99} y={40} size={20} weight={700}>ตู้ไฟฟ้า</Label>
      <rect x={34} y={84} width={130} height={56} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={99} y={104} size={20} weight={700}>RCD</Label>
      <Label x={99} y={126} size={18} muted>IΔn 30 mA</Label>
      {/* conductors */}
      <Wire points={[[164, 112], [214, 112], [214, 120], [410, 120]]} color={L_C} width={5} />
      <Wire points={[[164, 128], [200, 128], [200, 150], [410, 150]]} color={N_C} width={5} />
      <PEWire points={[[99, 240], [99, 186], [410, 186]]} width={6} />
      <Label x={250} y={102} size={20} weight={700} color={L_C}>L</Label>
      <Label x={290} y={136} size={20} weight={700} color={N_C}>N</Label>
      <Label x={330} y={170} size={20} weight={700}>PE</Label>
      {/* earth electrode */}
      <Ground x={99} y={252} kind="earth" />
      <Label x={130} y={272} size={18} anchor="start" muted>หลักดิน ≤ 5 Ω</Label>
      {/* appliance */}
      <rect x={410} y={90} width={170} height={170} rx={10} fill={BG} stroke={INK} strokeWidth={3.5} />
      <Label x={495} y={74} size={20} weight={700}>เครื่องโครงโลหะ</Label>
      <Wire points={[[410, 120], [470, 120], [470, 108]]} color={L_C} width={4} />
      <Spark x={482} y={100} r={14} />
      <Node x={410} y={186} r={6} />
      <Label x={500} y={160} size={18}>L แตะโครง</Label>
      {/* fault current path along PE */}
      <Arrow from={[395, 206]} to={[240, 206]} color={CUR} width={4} />
      <Label x={316} y={228} size={20} color={CUR} weight={700}>กระแสลัดวงจรลงดินกลับทาง PE</Label>
      {/* result */}
      <rect x={20} y={300} width={560} height={116} rx={12} fill={PANEL} stroke={OK} strokeWidth={3} />
      <Label x={300} y={330} size={20}>กระแสขาไป (L) ≠ ขากลับ (N) → RCD ตัดวงจร</Label>
      <Label x={300} y={362} size={20}>กระแสรั่วมากพอ → MCB ตัดด้วย</Label>
      <Label x={300} y={394} size={20} weight={700} color={OK}>โครงไม่ค้างแรงดันอันตราย ✓</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 — stored-energy and heat hazards in electronics work
// ---------------------------------------------------------------------------
function ElectronicsHazards() {
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      {[
        [10, 10],
        [305, 10],
        [10, 225],
        [305, 225],
      ].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={285} height={205} rx={12} fill={PANEL} stroke="var(--fig-grid)" strokeWidth={2} />
      ))}
      {/* capacitor */}
      <Capacitor x={152} y={80} polarized />
      <Wire points={[[92, 80], [122, 80]]} />
      <Wire points={[[182, 80], [212, 80]]} />
      <Label x={152} y={126} size={20} weight={700}>ตัวเก็บประจุ ~ 325 V</Label>
      <Label x={152} y={158} size={20}>ถอดปลั๊กแล้วยังค้างประจุ</Label>
      <Label x={152} y={188} size={20} muted>(ภาคจ่ายไฟ ไมโครเวฟ แฟลช)</Label>
      {/* Li-ion battery */}
      <path d="M 404 50 C 424 34 470 34 490 50 L 490 104 C 470 120 424 120 404 104 Z" fill={WARN} stroke={INK} strokeWidth={3} />
      <rect x={438} y={40} width={18} height={8} fill={INK} />
      <Label x={447} y={80} size={20} weight={700}>Li-ion</Label>
      <Label x={447} y={140} size={20} weight={700}>แบตเตอรี่ลิเทียม</Label>
      <Label x={447} y={170} size={20}>ลัดวงจร/บวม → ไฟไหม้</Label>
      {/* soldering iron */}
      <line x1={60} y1={300} x2={180} y2={300} stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <path d="M 180 293 L 234 300 L 180 307 Z" fill={MUTED} stroke={INK} strokeWidth={2} />
      <path d="M 238 290 q 6 -10 0 -20 M 250 292 q 6 -10 0 -20" fill="none" stroke={DANGER} strokeWidth={3} />
      <Label x={152} y={350} size={20} weight={700}>หัวแร้ง 300–400 °C</Label>
      <Label x={152} y={382} size={20}>ไหม้ ควันฟลักซ์ ตะกั่ว</Label>
      {/* ESD */}
      <rect x={420} y={262} width={56} height={44} rx={4} fill={INK} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <line x1={428 + i * 13} y1={306} x2={428 + i * 13} y2={318} stroke={INK} strokeWidth={3} />
          <line x1={428 + i * 13} y1={250} x2={428 + i * 13} y2={262} stroke={INK} strokeWidth={3} />
        </g>
      ))}
      <path d="M 340 290 C 360 270 380 274 392 282" fill="none" stroke={SKIN} strokeWidth={14} strokeLinecap="round" />
      <path d="M 396 280 l 8 6 l -6 4 l 10 6" fill="none" stroke={WARN} strokeWidth={3.5} />
      <Label x={447} y={350} size={20} weight={700}>ไฟฟ้าสถิต (ESD)</Label>
      <Label x={447} y={382} size={20}>ทำลายชิปโดยไม่รู้ตัว</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 — Thai 3-pin plug & socket (มอก. 166-2549)
// ---------------------------------------------------------------------------
function PlugSocket() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* socket face */}
      <rect x={30} y={40} width={220} height={220} rx={22} fill={BG} stroke={INK} strokeWidth={3.5} />
      <circle cx={95} cy={120} r={14} fill={INK} />
      <circle cx={185} cy={120} r={14} fill={INK} />
      <circle cx={140} cy={180} r={14} fill={INK} />
      <Label x={140} y={22} size={20} weight={700}>เต้ารับ (มองด้านหน้า)</Label>
      <Label x={140} y={84} size={20}>รูขั้วไฟ 2 รู</Label>
      <Label x={140} y={220} size={20} weight={700}>รู E (สายดิน)</Label>
      {/* plug side view */}
      <rect x={400} y={60} width={120} height={180} rx={18} fill="var(--fig-grid)" stroke={INK} strokeWidth={3.5} />
      <rect x={330} y={100} width={70} height={12} fill={COPPER} stroke={INK} strokeWidth={2} />
      <rect x={350} y={100} width={50} height={12} fill={INK} />
      <rect x={330} y={140} width={70} height={12} fill={COPPER} stroke={INK} strokeWidth={2} />
      <rect x={350} y={140} width={50} height={12} fill={INK} />
      <rect x={316} y={190} width={84} height={12} fill={COPPER} stroke={INK} strokeWidth={2} />
      <Wire points={[[520, 150], [580, 150]]} color={MUTED} width={14} />
      <Label x={460} y={40} size={20} weight={700}>เต้าเสียบ (มองด้านข้าง)</Label>
      <Label x={440} y={268} size={20}>ขา E (ล่าง) ยาวกว่า → ต่อดินก่อน</Label>
      <Label x={440} y={296} size={20}>ขาไฟ 2 ขามีปลอกฉนวนที่โคน</Label>
      <rect x={20} y={322} width={560} height={66} rx={10} fill={PANEL} stroke={DANGER} strokeWidth={2.5} />
      <Label x={300} y={342} size={20} weight={700}>ปลั๊กเสียบกลับด้านได้ — ห้ามเดาว่ารูไหนคือ N</Label>
      <Label x={300} y={370} size={20}>ถือว่ารูขั้วไฟ “มีไฟ” ทั้งสองรู</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W01-F01": HazardGroups,
  "W01-F02": CurrentBand,
  "W01-F03": ShockModes,
  "W01-F04": BodyCircuit,
  "W01-F05": WireColours,
  "W01-F06": HomeHazards,
  "W01-F07": SafetySymbols,
  "W01-F08": SafeBench,
  "W01-F09": PEandRCD,
  "W01-F10": ElectronicsHazards,
  "W01-F11": PlugSocket,
};
export default figures;
