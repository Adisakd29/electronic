/**
 * Week 5 — วงจรไฟฟ้าแสงสว่าง (Lighting Circuits)
 * Wire colours per มอก. 11-2553: L brown, N blue, PE green–yellow.
 * Every conductor that can carry L potential (switch line, travellers) is brown.
 */
import type { FigureMap } from "@/content/types";
import type { ReactNode } from "react";
import { Label, Wire, Node, Lamp, SwitchSym, Inductor, Capacitor, PEWire, Callout, Arrow } from "./kit";

type Pt = [number, number];
const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const WL = "var(--fig-wire-l)";
const WN = "var(--fig-wire-n)";
const CUR = "var(--fig-current)";
const OK = "var(--fig-ok)";
const DANGER = "var(--fig-danger)";

// ---------------------------------------------------------------------------
// Local primitives
// ---------------------------------------------------------------------------

function Term({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={6} fill={BG} stroke={INK} strokeWidth={2.5} />;
}

/** Highlight underlay for a live current path (drawn beneath the wires). */
function PathGlow({ points }: { points: Pt[] }) {
  return (
    <path
      d={"M" + points.map((p) => p.join(" ")).join(" L")}
      fill="none"
      stroke={CUR}
      strokeWidth={12}
      strokeOpacity={0.3}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

/**
 * Two-way (SPDT) switch. COM at (x, y). Contacts L1 (upper) and L2 (lower)
 * at x ± dx (right side unless mirror), y ∓ dy.
 */
function SPDT({
  x,
  y,
  pos,
  mirror = false,
  dx = 70,
  dy = 50,
  labels = true,
  size = 26,
}: {
  x: number;
  y: number;
  pos: "u" | "d";
  mirror?: boolean;
  dx?: number;
  dy?: number;
  labels?: boolean;
  size?: number;
}) {
  const sx = mirror ? -1 : 1;
  const cx = x + sx * dx;
  const ty = pos === "u" ? y - dy : y + dy;
  // blade stops a little short of the contact
  const bx = x + sx * (dx - 9);
  const by = y + (ty - y) * ((dx - 9) / dx);
  return (
    <g>
      <line x1={x} y1={y} x2={bx} y2={by} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <Term x={x} y={y} />
      <Term x={cx} y={y - dy} />
      <Term x={cx} y={y + dy} />
      {labels ? (
        <g>
          <Label x={cx} y={y - dy - 28} size={size} muted>L1</Label>
          <Label x={cx} y={y + dy + 30} size={size} muted>L2</Label>
          <Label x={x - sx * 8} y={y + 38} size={size} muted anchor={mirror ? "start" : "end"}>COM</Label>
        </g>
      ) : null}
    </g>
  );
}

/** Intermediate (DPDT cross-over) switch: left terminals (x, y∓dy), right (x+w, y∓dy). */
function Intermediate({ x, y, cross, w = 80, dy = 50 }: { x: number; y: number; cross: boolean; w?: number; dy?: number }) {
  return (
    <g>
      <rect x={x - 18} y={y - dy - 22} width={w + 36} height={2 * dy + 44} rx={8} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="6 5" />
      {cross ? (
        <g stroke={INK} strokeWidth={3.5} strokeLinecap="round">
          <line x1={x + 6} y1={y - dy + 4} x2={x + w - 6} y2={y + dy - 4} />
          <line x1={x + 6} y1={y + dy - 4} x2={x + w - 6} y2={y - dy + 4} />
        </g>
      ) : (
        <g stroke={INK} strokeWidth={3.5} strokeLinecap="round">
          <line x1={x + 6} y1={y - dy} x2={x + w - 6} y2={y - dy} />
          <line x1={x + 6} y1={y + dy} x2={x + w - 6} y2={y + dy} />
        </g>
      )}
      <Term x={x} y={y - dy} />
      <Term x={x} y={y + dy} />
      <Term x={x + w} y={y - dy} />
      <Term x={x + w} y={y + dy} />
    </g>
  );
}

function Fuse({ x, y, label }: { x: number; y: number; label?: ReactNode }) {
  return (
    <g>
      <rect x={x - 30} y={y - 12} width={60} height={24} fill={BG} stroke={INK} strokeWidth={3} rx={2} />
      <line x1={x - 40} y1={y} x2={x + 40} y2={y} stroke={INK} strokeWidth={2.5} />
      {label ? <Label x={x} y={y - 34} size={26}>{label}</Label> : null}
    </g>
  );
}

function Badge({ x, y, children, r = 24 }: { x: number; y: number; children: ReactNode; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={2.5} />
      <Label x={x} y={y + 1} size={26} weight={700}>{children}</Label>
    </g>
  );
}

function Leader({ from, to }: { from: Pt; to: Pt }) {
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={MUTED} strokeWidth={1.8} />
      <circle cx={to[0]} cy={to[1]} r={4} fill={MUTED} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// W05-F01 ผังระบบไฟฟ้าจากโรงไฟฟ้าถึงบ้าน (wide 900×540)
// ---------------------------------------------------------------------------
function Distribution() {
  const arrow = (from: Pt, to: Pt) => <Arrow from={from} to={to} color={MUTED} width={3} head={16} />;
  return (
    <svg viewBox="0 0 900 580" aria-hidden="true">
      {/* Row 1 */}
      {/* 1 power plant */}
      <g>
        <rect x={80} y={90} width={110} height={80} fill={PANEL} stroke={INK} strokeWidth={3} />
        <rect x={150} y={40} width={22} height={50} fill={PANEL} stroke={INK} strokeWidth={3} />
        <path d="M 95 130 l 20 -14 l 0 14 l 20 -14 l 0 14" fill="none" stroke={INK} strokeWidth={2.5} />
        <Badge x={50} y={60}>1</Badge>
        <Label x={135} y={205} size={26} weight={700}>โรงไฟฟ้า</Label>
        <Label x={135} y={240} size={26} muted>ผลิตและยกแรงดัน</Label>
      </g>
      {arrow([215, 130], [330, 130])}
      {/* 2 transmission tower */}
      <g>
        <path d="M 450 40 L 420 170 M 450 40 L 480 170 M 428 135 L 472 135 M 436 100 L 464 100" fill="none" stroke={INK} strokeWidth={3} />
        <line x1={405} y1={70} x2={495} y2={70} stroke={INK} strokeWidth={3} />
        <Badge x={365} y={60}>2</Badge>
        <Label x={450} y={205} size={26} weight={700}>สายส่งแรงสูง</Label>
        <Label x={450} y={240} size={26} muted>115–500 kV</Label>
      </g>
      {arrow([520, 130], [635, 130])}
      {/* 3 substation */}
      <g>
        <rect x={670} y={70} width={150} height={100} rx={6} fill={PANEL} stroke={INK} strokeWidth={3} />
        <circle cx={732} cy={120} r={24} fill="none" stroke={INK} strokeWidth={3} />
        <circle cx={758} cy={120} r={24} fill="none" stroke={INK} strokeWidth={3} />
        <Badge x={660} y={50}>3</Badge>
        <Label x={745} y={205} size={26} weight={700}>สถานีไฟฟ้าย่อย</Label>
        <Label x={745} y={240} size={26} muted>ลดแรงดันลง</Label>
      </g>
      {/* down arrow to row 2 */}
      {arrow([860, 175], [860, 320])}
      {/* Row 2 (right → left) */}
      {/* 4 distribution line */}
      <g>
        <line x1={690} y1={330} x2={690} y2={440} stroke={INK} strokeWidth={4} />
        <line x1={655} y1={345} x2={725} y2={345} stroke={INK} strokeWidth={3} />
        <path d="M 600 345 Q 640 360 655 345 M 725 345 Q 760 360 800 345" fill="none" stroke={INK} strokeWidth={2.5} />
        <Badge x={790} y={300}>4</Badge>
        <Label x={720} y={470} size={26} weight={700}>สายจำหน่ายแรงสูง</Label>
        <Label x={720} y={504} size={26} muted>กฟภ. 22/33 kV</Label>
        <Label x={720} y={536} size={26} muted>กฟน. 12/24 kV</Label>
      </g>
      {arrow([590, 390], [520, 390])}
      {/* 5 distribution transformer on pole */}
      <g>
        <line x1={450} y1={320} x2={450} y2={440} stroke={INK} strokeWidth={4} />
        <rect x={420} y={345} width={60} height={60} rx={8} fill={PANEL} stroke={INK} strokeWidth={3} />
        <circle cx={442} cy={375} r={13} fill="none" stroke={INK} strokeWidth={2.5} />
        <circle cx={458} cy={375} r={13} fill="none" stroke={INK} strokeWidth={2.5} />
        <Badge x={385} y={320}>5</Badge>
        <Label x={450} y={470} size={26} weight={700}>หม้อแปลงจำหน่าย</Label>
        <Label x={450} y={504} size={26} muted>230/400 V</Label>
        <Label x={450} y={536} size={26} muted>3 เฟส 4 สาย</Label>
      </g>
      {arrow([395, 390], [290, 390])}
      {/* 6 house */}
      <g>
        <path d="M 100 380 L 170 325 L 240 380 Z" fill={PANEL} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <rect x={115} y={380} width={110} height={60} fill={PANEL} stroke={INK} strokeWidth={3} />
        <Wire points={[[230, 360], [262, 360]]} color={WL} width={4} />
        <Wire points={[[230, 372], [262, 372]]} color={WN} width={4} />
        <Badge x={60} y={330}>6</Badge>
        <Label x={170} y={470} size={26} weight={700}>บ้าน 1 เฟส 2 สาย</Label>
        <Label x={170} y={504} size={26} muted>L + N 230 V</Label>
        <Label x={170} y={536} size={26} muted>PE จากหลักดินในบ้าน</Label>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F02 cd / lm / lx (600×420)
// ---------------------------------------------------------------------------
function Photometry() {
  const src: Pt = [90, 210];
  const patch = { x: 400, y1: 120, y2: 300 };
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <path
        d={`M ${src[0]} ${src[1]} L ${patch.x} ${patch.y1} L ${patch.x + 40} ${patch.y1 + 24} L ${patch.x + 40} ${patch.y2 + 24} L ${patch.x} ${patch.y2} Z`}
        fill="var(--fig-glow)"
        opacity={0.25}
      />
      <line x1={src[0]} y1={src[1]} x2={patch.x} y2={patch.y1} stroke={MUTED} strokeWidth={2} strokeDasharray="6 5" />
      <line x1={src[0]} y1={src[1]} x2={patch.x} y2={patch.y2} stroke={MUTED} strokeWidth={2} strokeDasharray="6 5" />
      <line x1={src[0]} y1={src[1]} x2={patch.x + 40} y2={patch.y1 + 24} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 5" />
      <line x1={src[0]} y1={src[1]} x2={patch.x + 40} y2={patch.y2 + 24} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 5" />
      {/* patch 1 m² */}
      <path
        d={`M ${patch.x} ${patch.y1} L ${patch.x + 40} ${patch.y1 + 24} L ${patch.x + 40} ${patch.y2 + 24} L ${patch.x} ${patch.y2} Z`}
        fill="var(--fig-accent-soft)"
        stroke="var(--fig-accent)"
        strokeWidth={3}
      />
      {/* source */}
      <circle cx={src[0]} cy={src[1]} r={22} fill="var(--fig-glow)" opacity={0.5} />
      <circle cx={src[0]} cy={src[1]} r={9} fill="var(--fig-glow)" stroke={INK} strokeWidth={2.5} />
      <Label x={src[0] + 4} y={src[1] + 50} size={22} weight={700}>แหล่งจุด</Label>
      <Label x={src[0] + 4} y={src[1] + 78} size={22}>I = 1 cd</Label>
      <Label x={250} y={204} size={22}>มุมตัน 1 sr</Label>
      <Arrow from={[200, 236]} to={[330, 236]} color={CUR} label="Φ = 1 lm" labelOffset={[0, 22]} />
      <Label x={460} y={90} size={22} anchor="start">A = 1 m²</Label>
      <Label x={460} y={360} size={22} anchor="start" weight={700}>E = 1 lx</Label>
      {/* distance */}
      <line x1={src[0]} y1={385} x2={patch.x} y2={385} stroke={INK} strokeWidth={2} />
      <line x1={src[0]} y1={375} x2={src[0]} y2={395} stroke={INK} strokeWidth={2} />
      <line x1={patch.x} y1={375} x2={patch.x} y2={395} stroke={INK} strokeWidth={2} />
      <Label x={(src[0] + patch.x) / 2} y={365} size={22}>d = 1 m</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F03 ภาพตัดหลอดไส้ขั้ว E27 (600×520) — hotspot figure
// ---------------------------------------------------------------------------
function IncandescentCutaway() {
  const cx = 200;
  return (
    <svg viewBox="0 0 600 520" aria-hidden="true">
      {/* glass bulb */}
      <path
        d={`M ${cx - 40} 330 C ${cx - 40} 280 ${cx - 140} 250 ${cx - 140} 170 A 140 140 0 1 1 ${cx + 140} 170 C ${cx + 140} 250 ${cx + 40} 280 ${cx + 40} 330 Z`}
        fill="var(--fig-accent-soft)"
        fillOpacity={0.35}
        stroke={INK}
        strokeWidth={3}
      />
      {/* glass stem + exhaust tube */}
      <path d={`M ${cx - 24} 330 L ${cx - 10} 210 L ${cx + 10} 210 L ${cx + 24} 330`} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <line x1={cx} y1={330} x2={cx} y2={225} stroke={MUTED} strokeWidth={4} />
      {/* heat deflector disc */}
      <rect x={cx - 34} y={292} width={68} height={8} fill={MUTED} stroke={INK} strokeWidth={1.5} />
      {/* lead-in wires */}
      <path d={`M ${cx - 16} 340 L ${cx - 16} 300 L ${cx - 60} 130`} fill="none" stroke={INK} strokeWidth={2.5} />
      <path d={`M ${cx + 16} 400 L ${cx + 16} 300 L ${cx + 60} 130`} fill="none" stroke={INK} strokeWidth={2.5} />
      {/* internal fuse (thin section in left lead inside the base) */}
      <path d={`M ${cx - 16} 340 l -6 8 l 12 8 l -12 8 l 6 8 L ${cx - 16} 448`} fill="none" stroke={DANGER} strokeWidth={2} />
      {/* support wires */}
      <path d={`M ${cx} 212 L ${cx} 100 M ${cx} 120 L ${cx - 30} 108 M ${cx} 120 L ${cx + 30} 108`} fill="none" stroke={MUTED} strokeWidth={1.8} />
      {/* filament coil */}
      <path
        d={`M ${cx - 60} 130 ${Array.from({ length: 12 }, (_, i) => `q 5 ${i % 2 ? 10 : -10} 10 0`).join(" ")}`}
        fill="none"
        stroke="var(--fig-current)"
        strokeWidth={3}
      />
      <circle cx={cx} cy={128} r={46} fill="var(--fig-glow)" opacity={0.25} />
      {/* screw base (shell) */}
      <rect x={cx - 42} y={330} width={84} height={100} fill="var(--fig-wire-n)" fillOpacity={0.15} stroke={INK} strokeWidth={3} />
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} d={`M ${cx - 42} ${342 + i * 18} Q ${cx} ${352 + i * 18} ${cx + 42} ${342 + i * 18}`} fill="none" stroke={INK} strokeWidth={2} />
      ))}
      {/* insulator + centre contact */}
      <path d={`M ${cx - 34} 430 L ${cx + 34} 430 L ${cx + 20} 455 L ${cx - 20} 455 Z`} fill={INK} />
      <rect x={cx - 12} y={455} width={24} height={14} rx={4} fill="var(--fig-wire-l)" stroke={INK} strokeWidth={2} />
      {/* labels */}
      <Leader from={[400, 60]} to={[cx + 50, 128]} />
      <Label x={405} y={60} size={20} anchor="start">ไส้ทังสเตน</Label>
      <Leader from={[400, 110]} to={[cx + 100, 150]} />
      <Label x={405} y={110} size={20} anchor="start">ก๊าซ Ar + N₂</Label>
      <Leader from={[400, 175]} to={[cx + 44, 175]} />
      <Label x={405} y={175} size={20} anchor="start">ลวดนำกระแส</Label>
      <Leader from={[400, 240]} to={[cx + 12, 250]} />
      <Label x={405} y={240} size={20} anchor="start">ก้านแก้ว/ท่อดูดอากาศ</Label>
      <Leader from={[400, 296]} to={[cx + 34, 296]} />
      <Label x={405} y={296} size={20} anchor="start">แผ่นกันความร้อน</Label>
      <Leader from={[400, 380]} to={[cx + 42, 380]} />
      <Label x={405} y={380} size={20} anchor="start">เกลียว (shell) → N</Label>
      <Leader from={[400, 462]} to={[cx + 12, 462]} />
      <Label x={405} y={462} size={20} anchor="start">ขั้วกลาง → L</Label>
      <Leader from={[30, 410]} to={[cx - 22, 400]} />
      <Label x={20} y={440} size={20} anchor="start" color={DANGER}>ฟิวส์ภายใน</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F04 วงจรหลอดฟลูออเรสเซนต์ (wide 900×480) — hotspot figure
// ---------------------------------------------------------------------------
function FluorescentCircuit() {
  const tube = { x1: 470, x2: 820, y: 230 };
  return (
    <svg viewBox="0 0 900 480" aria-hidden="true">
      {/* luminaire housing (metal body) */}
      <rect x={215} y={50} width={680} height={385} rx={12} fill="none" stroke={MUTED} strokeWidth={2.5} strokeDasharray="10 7" />
      <Label x={880} y={80} size={26} anchor="end" muted>โครงโคมโลหะ</Label>
      {/* supply labels */}
      <Label x={30} y={110} size={26} weight={700} color={WL}>L</Label>
      <Label x={30} y={400} size={26} weight={700} color={WN}>N</Label>
      <Label x={36} y={462} size={26} weight={700}>PE</Label>
      {/* L → switch → node → ballast */}
      <Wire points={[[55, 110], [110, 110]]} color={WL} />
      <SwitchSym x={150} y={110} closed />
      <Label x={150} y={160} size={26}>สวิตช์</Label>
      <Wire points={[[190, 110], [330, 110]]} color={WL} />
      <Node x={260} y={110} />
      <Inductor x={370} y={110} core="iron" turns={5} />
      <Label x={370} y={160} size={26}>บัลลาสต์</Label>
      <Wire points={[[410, 110], [440, 110], [440, 210], [tube.x1 - 18, 210]]} color={WL} />
      {/* PF capacitor across L–N after the switch */}
      <Wire points={[[260, 110], [260, 225]]} color={WL} />
      <Capacitor x={260} y={255} angle={90} />
      <Wire points={[[260, 285], [260, 400]]} color={WN} />
      <Node x={260} y={400} />
      <Label x={286} y={250} size={26} anchor="start">C (PF)</Label>
      {/* tube */}
      <rect x={tube.x1} y={tube.y - 40} width={tube.x2 - tube.x1} height={80} rx={36} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={tube.x1 + 6} y={tube.y - 34} width={tube.x2 - tube.x1 - 12} height={68} rx={30} fill="none" stroke="var(--fig-accent-2)" strokeWidth={2} strokeDasharray="3 4" />
      <Label x={(tube.x1 + tube.x2) / 2} y={tube.y + 2} size={26}>หลอด</Label>
      {/* filaments */}
      <path d={`M ${tube.x1 + 4} 210 q 14 4 14 10 q -14 4 0 10 q 14 4 -14 10 L ${tube.x1 + 4} 250`} fill="none" stroke={CUR} strokeWidth={2.5} />
      <path d={`M ${tube.x2 - 4} 210 q -14 4 -14 10 q 14 4 0 10 q -14 4 14 10 L ${tube.x2 - 4} 250`} fill="none" stroke={CUR} strokeWidth={2.5} />
      {/* pins */}
      <Wire points={[[tube.x1 - 18, 210], [tube.x1 + 4, 210]]} />
      <Wire points={[[tube.x1 - 18, 250], [tube.x1 + 4, 250]]} />
      <Wire points={[[tube.x2 - 4, 210], [tube.x2 + 18, 210]]} />
      <Wire points={[[tube.x2 - 4, 250], [tube.x2 + 18, 250]]} />
      <Label x={tube.x1 + 30} y={290} size={26} muted>A</Label>
      <Label x={tube.x2 - 30} y={290} size={26} muted>B</Label>
      {/* starter between A2 and B2 */}
      <Wire points={[[tube.x1 - 18, 250], [440, 250], [440, 340], [612, 340]]} />
      <circle cx={645} cy={340} r={32} fill={BG} stroke={INK} strokeWidth={3} />
      <path d="M 628 352 L 628 330 Q 640 318 648 332" fill="none" stroke={INK} strokeWidth={2.5} />
      <line x1={660} y1={330} x2={660} y2={352} stroke={INK} strokeWidth={2.5} />
      <Wire points={[[612, 340], [613, 340]]} />
      <Wire points={[[677, 340], [850, 340], [850, 250], [tube.x2 + 18, 250]]} />
      <Label x={645} y={292} size={26}>สตาร์ตเตอร์</Label>
      {/* B1 → N */}
      <Wire points={[[tube.x2 + 18, 210], [870, 210], [870, 400], [55, 400]]} color={WN} />
      {/* PE to housing */}
      <PEWire points={[[70, 462], [560, 462], [560, 435]]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F05 โครงสร้างหลอด LED ทรง A60 (600×520) — hotspot figure
// ---------------------------------------------------------------------------
function LedBulb() {
  const cx = 200;
  return (
    <svg viewBox="0 0 600 520" aria-hidden="true">
      {/* diffuser dome */}
      <path d={`M ${cx - 120} 200 A 120 120 0 1 1 ${cx + 120} 200 Z`} fill="var(--fig-glow)" fillOpacity={0.18} stroke={INK} strokeWidth={3} />
      {/* LED board */}
      <rect x={cx - 105} y={196} width={210} height={14} fill="var(--fig-ok)" fillOpacity={0.35} stroke={INK} strokeWidth={2} />
      {[-80, -48, -16, 16, 48, 80].map((dx) => (
        <rect key={dx} x={cx + dx - 9} y={184} width={18} height={12} fill="var(--fig-glow)" stroke={INK} strokeWidth={2} />
      ))}
      {/* heat sink body */}
      <path d={`M ${cx - 110} 210 L ${cx + 110} 210 L ${cx + 60} 340 L ${cx - 60} 340 Z`} fill={PANEL} stroke={INK} strokeWidth={3} />
      {[230, 255, 280, 305].map((y) => (
        <line key={y} x1={cx - 100 + (y - 210) * 0.38} y1={y} x2={cx + 100 - (y - 210) * 0.38} y2={y} stroke={MUTED} strokeWidth={1.5} />
      ))}
      {/* driver board inside */}
      <rect x={cx - 34} y={230} width={68} height={140} rx={4} fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={2.5} />
      <rect x={cx - 22} y={248} width={20} height={26} fill={BG} stroke={INK} strokeWidth={1.5} />
      <circle cx={cx + 12} cy={262} r={10} fill={BG} stroke={INK} strokeWidth={1.5} />
      <rect x={cx - 20} y={290} width={40} height={14} fill={BG} stroke={INK} strokeWidth={1.5} />
      {/* E27 base */}
      <rect x={cx - 42} y={360} width={84} height={90} fill="var(--fig-wire-n)" fillOpacity={0.15} stroke={INK} strokeWidth={3} />
      {Array.from({ length: 4 }, (_, i) => (
        <path key={i} d={`M ${cx - 42} ${372 + i * 18} Q ${cx} ${382 + i * 18} ${cx + 42} ${372 + i * 18}`} fill="none" stroke={INK} strokeWidth={2} />
      ))}
      <path d={`M ${cx - 34} 450 L ${cx + 34} 450 L ${cx + 20} 474 L ${cx - 20} 474 Z`} fill={INK} />
      <rect x={cx - 12} y={474} width={24} height={14} rx={4} fill="var(--fig-wire-l)" stroke={INK} strokeWidth={2} />
      {/* labels */}
      <Leader from={[380, 80]} to={[cx + 60, 110]} />
      <Label x={385} y={80} size={20} anchor="start">ฝาครอบกระจายแสง</Label>
      <Leader from={[380, 160]} to={[cx + 80, 188]} />
      <Label x={385} y={160} size={20} anchor="start">ชิป LED บนแผ่นวงจร</Label>
      <Leader from={[380, 250]} to={[cx + 85, 250]} />
      <Label x={385} y={250} size={20} anchor="start">ตัวระบายความร้อน</Label>
      <Leader from={[380, 320]} to={[cx + 34, 320]} />
      <Label x={385} y={320} size={20} anchor="start">วงจรขับ (LED driver)</Label>
      <Leader from={[380, 410]} to={[cx + 42, 410]} />
      <Label x={385} y={410} size={20} anchor="start">ขั้ว E27 (230 V)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F06 สวิตช์ทางเดียว 1 หลอด แบบแผนภาพการเดินสาย (wide 900×450)
// ---------------------------------------------------------------------------
function OneWayWiring() {
  return (
    <svg viewBox="0 0 900 450" aria-hidden="true">
      {/* distribution board */}
      <rect x={20} y={40} width={170} height={380} rx={10} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={105} y={75} size={26} weight={700}>แผงจ่ายไฟ</Label>
      <Label x={105} y={110} size={26} muted>MCB 10 A</Label>
      <Label x={150} y={170} size={26} weight={700} color={WL}>L</Label>
      <Label x={150} y={320} size={26} weight={700} color={WN}>N</Label>
      <Label x={140} y={390} size={26} weight={700}>PE</Label>
      <Term x={190} y={170} />
      <Term x={190} y={320} />
      <Term x={190} y={390} />
      {/* L → switch */}
      <Wire points={[[196, 170], [360, 170]]} color={WL} width={4} />
      <Label x={280} y={145} size={26}>L (น้ำตาล)</Label>
      <SwitchSym x={400} y={170} closed />
      <Label x={400} y={120} size={26} weight={700}>S1 ตัดสาย L</Label>
      {/* switched line */}
      <Wire points={[[440, 170], [760, 170], [760, 215]]} color={WL} width={4} />
      <Label x={600} y={145} size={26} muted>สาย L หลังสวิตช์</Label>
      {/* luminaire */}
      <rect x={680} y={195} width={180} height={105} rx={10} fill="none" stroke={MUTED} strokeWidth={2.5} strokeDasharray="8 6" />
      <Lamp x={760} y={245} angle={90} on />
      <Label x={665} y={222} size={26} anchor="end">ขั้วกลาง ← L</Label>
      <Label x={665} y={272} size={26} anchor="end">เกลียว ← N</Label>
      <Label x={820} y={248} size={26} muted>โคม</Label>
      {/* N */}
      <Wire points={[[760, 275], [760, 320], [196, 320]]} color={WN} width={4} />
      <Label x={440} y={298} size={26}>N (ฟ้า)</Label>
      {/* PE */}
      <PEWire points={[[196, 390], [840, 390], [840, 300]]} />
      <Label x={520} y={366} size={26}>PE (เขียว-เหลือง) → โครงโคม</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F07 / W05-F13 สวิตช์สองทาง (wide 900×450), state factory
// ---------------------------------------------------------------------------
function twoWay(s1: "u" | "d", s2: "u" | "d") {
  const on = s1 === s2;
  const y1 = s1 === "u" ? 150 : 250;
  const name = (p: "u" | "d") => (p === "u" ? "บน (L1)" : "ล่าง (L2)");
  function TwoWayFig() {
    return (
      <svg viewBox="0 0 900 450" aria-hidden="true">
        {on ? (
          <PathGlow points={[[70, 200], [200, 200], [270, y1], [560, y1], [630, 200], [760, 200], [760, 250], [760, 310], [760, 370], [70, 370]]} />
        ) : null}
        <Label x={36} y={200} size={26} weight={700} color={WL}>L</Label>
        <Label x={36} y={370} size={26} weight={700} color={WN}>N</Label>
        {/* L → COM of S1 */}
        <Wire points={[[60, 200], [200, 200]]} color={WL} width={4} />
        <SPDT x={200} y={200} pos={s1} />
        <Label x={235} y={70} size={26} weight={700}>S1</Label>
        {/* travellers */}
        <Wire points={[[270, 150], [560, 150]]} color={WL} width={4} />
        <Wire points={[[270, 250], [560, 250]]} color={WL} width={4} />
        <Label x={415} y={130} size={26} muted>T1</Label>
        <Label x={415} y={275} size={26} muted>T2</Label>
        <Label x={415} y={202} size={26}>สาย traveller</Label>
        <SPDT x={630} y={200} pos={s2} mirror />
        <Label x={595} y={70} size={26} weight={700}>S2</Label>
        {/* COM S2 → lamp → N */}
        <Wire points={[[630, 200], [760, 200], [760, 250]]} color={WL} width={4} />
        <Lamp x={760} y={280} angle={90} on={on} />
        <Label x={800} y={282} size={26} anchor="start">หลอด</Label>
        <Wire points={[[760, 310], [760, 370], [60, 370]]} color={WN} width={4} />
        {/* status */}
        <Label x={450} y={420} size={26} weight={700} color={on ? OK : MUTED}>
          {`S1 ${name(s1)} · S2 ${name(s2)} → ${on ? "หลอดติด ✓" : "หลอดดับ (วงจรเปิด)"}`}
        </Label>
      </svg>
    );
  }
  return TwoWayFig;
}

// ---------------------------------------------------------------------------
// W05-F08 สวิตช์ทางกลาง (wide 900×450)
// ---------------------------------------------------------------------------
function intermediate(a: 0 | 1, cross: boolean, b: 0 | 1) {
  const out = (a ^ (cross ? 1 : 0)) as 0 | 1;
  const on = out === b;
  const yy = (k: 0 | 1) => (k === 0 ? 150 : 250);
  function InterFig() {
    return (
      <svg viewBox="0 0 900 450" aria-hidden="true">
        {on ? (
          <PathGlow
            points={[[60, 200], [160, 200], [230, yy(a)], [380, yy(a)], [460, yy(out)], [610, yy(out)], [680, 200], [780, 200], [780, 250], [780, 310], [780, 370], [60, 370]]}
          />
        ) : null}
        <Label x={30} y={200} size={26} weight={700} color={WL}>L</Label>
        <Label x={30} y={370} size={26} weight={700} color={WN}>N</Label>
        <Wire points={[[52, 200], [160, 200]]} color={WL} width={4} />
        <SPDT x={160} y={200} pos={a === 0 ? "u" : "d"} />
        <Wire points={[[230, 150], [380, 150]]} color={WL} width={4} />
        <Wire points={[[230, 250], [380, 250]]} color={WL} width={4} />
        <Intermediate x={380} y={200} cross={cross} />
        <Wire points={[[460, 150], [610, 150]]} color={WL} width={4} />
        <Wire points={[[460, 250], [610, 250]]} color={WL} width={4} />
        <SPDT x={680} y={200} pos={b === 0 ? "u" : "d"} mirror />
        <Label x={190} y={70} size={26} weight={700}>S1 สองทาง</Label>
        <Label x={420} y={70} size={26} weight={700}>S2 ทางกลาง</Label>
        <Label x={650} y={70} size={26} weight={700}>S3 สองทาง</Label>
        <Wire points={[[680, 200], [780, 200], [780, 250]]} color={WL} width={4} />
        <Lamp x={780} y={280} angle={90} on={on} />
        <Label x={818} y={282} size={26} anchor="start">หลอด</Label>
        <Wire points={[[780, 310], [780, 370], [52, 370]]} color={WN} width={4} />
        <Label x={450} y={420} size={26} weight={700} color={on ? OK : MUTED}>
          {`S1 ${a === 0 ? "บน" : "ล่าง"} · S2 ${cross ? "ไขว้" : "ตรง"} · S3 ${b === 0 ? "บน" : "ล่าง"} → ${on ? "หลอดติด ✓" : "หลอดดับ"}`}
        </Label>
      </svg>
    );
  }
  return InterFig;
}

// ---------------------------------------------------------------------------
// W05-F09 แสงบาดตาจากการสะท้อน และมุมตัดแสง (600×420)
// ---------------------------------------------------------------------------
function Glare() {
  const A: Pt = [170, 58];
  const eye: Pt = [500, 222];
  const deskY = 300;
  // mirror reflection point on the desk
  const ex2 = 2 * deskY - eye[1];
  const px = A[0] + ((eye[0] - A[0]) * (deskY - A[1])) / (ex2 - A[1]);
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <line x1={0} y1={40} x2={600} y2={40} stroke={MUTED} strokeWidth={3} />
      <Label x={20} y={22} size={20} anchor="start" muted>ฝ้าเพดาน</Label>
      {/* luminaire A: bare */}
      <rect x={120} y={40} width={100} height={18} fill="var(--fig-glow)" stroke={INK} strokeWidth={2.5} />
      <Label x={112} y={78} size={20} anchor="end">โคม A</Label>
      {/* glossy desk */}
      <rect x={180} y={deskY} width={280} height={12} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
      <line x1={200} y1={312} x2={200} y2={392} stroke={INK} strokeWidth={3} />
      <line x1={440} y1={312} x2={440} y2={392} stroke={INK} strokeWidth={3} />
      <Label x={320} y={340} size={20}>โต๊ะผิวมัน</Label>
      {/* reflected glare ray */}
      <Wire points={[A, [px, deskY], eye]} color={DANGER} width={3} dash="9 6" />
      <Arrow from={[px + (eye[0] - px) * 0.55, deskY + (eye[1] - deskY) * 0.55]} to={[px + (eye[0] - px) * 0.7, deskY + (eye[1] - deskY) * 0.7]} color={DANGER} />
      <Label x={250} y={250} size={20} color={DANGER} weight={700}>✗ สะท้อนเข้าตา</Label>
      {/* viewer */}
      <circle cx={525} cy={215} r={26} fill="var(--fig-skin)" stroke={INK} strokeWidth={2.5} />
      <circle cx={507} cy={212} r={4} fill={INK} />
      <path d="M 525 242 L 525 330 M 525 330 L 500 392 M 525 330 L 555 392 M 525 270 L 480 300" fill="none" stroke={INK} strokeWidth={3} />
      {/* luminaire B with louvre and cut-off */}
      <rect x={360} y={40} width={110} height={26} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      {[375, 395, 415, 435, 455].map((x) => (
        <line key={x} x1={x} y1={44} x2={x} y2={66} stroke={INK} strokeWidth={2} />
      ))}
      <line x1={365} y1={66} x2={325} y2={150} stroke={OK} strokeWidth={2.5} strokeDasharray="6 5" />
      <line x1={465} y1={66} x2={505} y2={150} stroke={OK} strokeWidth={2.5} strokeDasharray="6 5" />
      <Label x={415} y={104} size={20} color={OK} weight={700}>✓ ตะแกรง</Label>
      <Label x={415} y={130} size={20} color={OK}>มุมตัดแสง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F10 เปรียบเทียบประสิทธิผล lm/W (600×460)
// ---------------------------------------------------------------------------
function EfficacyChart() {
  const x0 = 210;
  const scale = 290 / 150; // px per lm/W
  const rows: { name: string; tag: string; lo: number; hi: number; typ: number; val: string; hg?: boolean }[] = [
    { name: "หลอดไส้", tag: "1,000 h", lo: 10.8, hi: 10.8, typ: 10.8, val: "10.8" },
    { name: "ฮาโลเจน", tag: "2,000–4,000 h", lo: 15, hi: 25, typ: 15, val: "15–25" },
    { name: "แสงจันทร์ HPMV", tag: "มีปรอท · เลิกใช้", lo: 35, hi: 60, typ: 35, val: "35–60", hg: true },
    { name: "ฟลูออเรสเซนต์", tag: "มีปรอท · 10,000 h", lo: 78, hi: 78, typ: 78, val: "78", hg: true },
    { name: "LED", tag: "15,000–50,000 h", lo: 90, hi: 150, typ: 90, val: "90–150" },
  ];
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      {[0, 50, 100, 150].map((t) => (
        <g key={t}>
          <line x1={x0 + t * scale} y1={30} x2={x0 + t * scale} y2={405} stroke="var(--fig-grid)" strokeWidth={1.5} />
          <Label x={x0 + t * scale} y={428} size={20} muted>{t}</Label>
        </g>
      ))}
      <Label x={x0 + 170} y={452} size={20} muted>ประสิทธิผล (lm/W)</Label>
      {rows.map((r, i) => {
        const y = 60 + i * 76;
        return (
          <g key={r.name}>
            <Label x={10} y={y - 4} size={20} anchor="start" weight={700}>{r.name}</Label>
            <Label x={10} y={y + 22} size={20} anchor="start" muted>{r.tag}</Label>
            {r.hi > r.lo ? (
              <rect x={x0} y={y - 13} width={r.hi * scale} height={26} fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={1.5} strokeDasharray="5 4" />
            ) : null}
            <rect
              x={x0}
              y={y - 13}
              width={r.typ * scale}
              height={26}
              fill={r.hg ? "var(--fig-warn)" : "var(--fig-accent)"}
              opacity={0.85}
            />
            <Label x={x0 + r.hi * scale + 8} y={y} size={20} anchor="start" weight={700}>{r.val}</Label>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F11 บอร์ดฝึก 12 V (wide 900×420)
// ---------------------------------------------------------------------------
function TrainingBoard() {
  return (
    <svg viewBox="0 0 900 420" aria-hidden="true">
      <rect x={10} y={90} width={180} height={190} rx={10} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={100} y={130} size={26} weight={700}>อะแดปเตอร์</Label>
      <Label x={100} y={165} size={26}>SELV</Label>
      <Label x={100} y={200} size={26}>12 V DC</Label>
      <Label x={212} y={276} size={26} color={WN} weight={700}>−</Label>
      <Label x={212} y={116} size={26} color="var(--fig-plus)" weight={700}>+</Label>
      <Term x={190} y={140} />
      <Term x={190} y={250} />
      {/* + (brown, plays the role of L) */}
      <Wire points={[[196, 140], [270, 140]]} color={WL} width={4} />
      <Fuse x={310} y={140} label="ฟิวส์ 1 A" />
      <Wire points={[[350, 140], [455, 140]]} color={WL} width={4} />
      <Term x={460} y={140} />
      <Label x={460} y={105} size={26} muted>เทอร์มินอล</Label>
      <Wire points={[[466, 140], [540, 140]]} color={WL} width={4} />
      <SwitchSym x={580} y={140} />
      <Label x={580} y={100} size={26} weight={700}>สวิตช์</Label>
      <Wire points={[[620, 140], [740, 140], [740, 175]]} color={WL} width={4} />
      <Lamp x={740} y={205} angle={90} on={false} />
      <Label x={775} y={195} size={26} anchor="start">LED</Label>
      <Label x={775} y={228} size={26} anchor="start">12 V 3 W</Label>
      {/* − (blue, plays the role of N) */}
      <Wire points={[[740, 235], [740, 270], [460, 270], [460, 250], [196, 250]]} color={WN} width={4} />
      <Term x={460} y={250} />
      <Label x={330} y={226} size={26} color={WN}>− สีฟ้า (แทน N)</Label>
      <Label x={330} y={185} size={26} color={WL}>+ สีน้ำตาล (แทน L)</Label>
      <Callout x={20} y={315} w={860} h={90} tone="warn">
        <Label x={450} y={345} size={26} weight={700}>บอร์ดแรงดันต่ำเพื่อฝึกการต่อวงจรและนิสัยสีสาย</Label>
        <Label x={450} y={380} size={26} muted>ไม่ได้จำลองอันตรายของไฟ 230 V · ห้ามต่อบอร์ดเข้ากับไฟบ้าน</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F12 สวิตช์ทางเดียวควบคุม 2 หลอดขนาน (600×360)
// ---------------------------------------------------------------------------
function TwoLampsParallel() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      <Label x={28} y={80} size={22} weight={700} color={WL}>L</Label>
      <Label x={28} y={280} size={22} weight={700} color={WN}>N</Label>
      <Wire points={[[44, 80], [110, 80]]} color={WL} width={3.5} />
      <SwitchSym x={150} y={80} closed />
      <Label x={150} y={42} size={22} weight={700}>S1</Label>
      <Wire points={[[190, 80], [480, 80], [480, 150]]} color={WL} width={3.5} />
      <Wire points={[[300, 80], [300, 150]]} color={WL} width={3.5} />
      <Node x={300} y={80} />
      <Lamp x={300} y={180} angle={90} on />
      <Lamp x={480} y={180} angle={90} on />
      <Label x={334} y={180} size={22} anchor="start">H1</Label>
      <Label x={514} y={180} size={22} anchor="start">H2</Label>
      <Wire points={[[300, 210], [300, 280]]} color={WN} width={3.5} />
      <Wire points={[[480, 210], [480, 280], [44, 280]]} color={WN} width={3.5} />
      <Node x={300} y={280} />
      <Label x={300} y={330} size={20} muted>หลอดต่อขนาน: ทุกดวงได้แรงดันเต็ม 230 V</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F14 ตำแหน่ง "ตรง" และ "ไขว้" ของสวิตช์ทางกลาง (600×300)
// ---------------------------------------------------------------------------
function IntermediatePositions() {
  const panel = (ox: number, cross: boolean, title: string) => (
    <g>
      <Label x={ox + 130} y={36} size={22} weight={700}>{title}</Label>
      <Wire points={[[ox + 20, 110], [ox + 80, 110]]} color={WL} />
      <Wire points={[[ox + 20, 210], [ox + 80, 210]]} color={WL} />
      <Wire points={[[ox + 180, 110], [ox + 240, 110]]} color={WL} />
      <Wire points={[[ox + 180, 210], [ox + 240, 210]]} color={WL} />
      <Intermediate x={ox + 80} y={160} cross={cross} w={100} />
      <Label x={ox + 16} y={86} size={20} muted anchor="start">T1</Label>
      <Label x={ox + 16} y={240} size={20} muted anchor="start">T2</Label>
      <Label x={ox + 244} y={86} size={20} muted anchor="end">T1</Label>
      <Label x={ox + 244} y={240} size={20} muted anchor="end">T2</Label>
      <Label x={ox + 130} y={278} size={20}>{cross ? "T1→T2 · T2→T1" : "T1→T1 · T2→T2"}</Label>
    </g>
  );
  return (
    <svg viewBox="0 0 600 300" aria-hidden="true">
      {panel(20, false, "ตำแหน่งตรง")}
      {panel(320, true, "ตำแหน่งไขว้")}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F15 หาจุดผิด 4 แผนภาพ (wide 900×600) — findFault figure
// ---------------------------------------------------------------------------
function FaultPanels() {
  const frame = (ox: number, oy: number, letter: string, body: ReactNode) => (
    <g transform={`translate(${ox} ${oy})`}>
      <rect x={8} y={8} width={434} height={284} rx={12} fill="none" stroke="var(--fig-grid)" strokeWidth={2.5} />
      <Badge x={40} y={40} r={22}>{letter}</Badge>
      {body}
    </g>
  );
  // ก: switch in N
  const a = (
    <g>
      <Label x={70} y={110} size={26} weight={700} color={WL}>L</Label>
      <Label x={70} y={230} size={26} weight={700} color={WN}>N</Label>
      <Wire points={[[90, 110], [380, 110], [380, 140]]} color={WL} width={4} />
      <Lamp x={380} y={170} angle={90} />
      <Wire points={[[380, 200], [380, 230], [260, 230]]} color={WN} width={4} />
      <SwitchSym x={220} y={230} />
      <Wire points={[[180, 230], [90, 230]]} color={WN} width={4} />
    </g>
  );
  // ข: two-way with L fed into a traveller terminal, COM of S1 left empty
  const b = (
    <g>
      <Label x={86} y={70} size={26} weight={700} color={WL}>L</Label>
      <Label x={60} y={262} size={26} weight={700} color={WN}>N</Label>
      <Wire points={[[104, 70], [170, 70], [170, 114]]} color={WL} width={4} />
      <SPDT x={110} y={160} pos="d" dx={60} dy={46} labels={false} />
      <Label x={100} y={200} size={22} anchor="end" muted>COM</Label>
      <Wire points={[[170, 114], [290, 114]]} color={WL} width={4} />
      <Wire points={[[170, 206], [290, 206]]} color={WL} width={4} />
      <SPDT x={350} y={160} pos="u" dx={60} dy={46} mirror labels={false} />
      <Wire points={[[350, 160], [400, 160], [400, 185]]} color={WL} width={4} />
      <Lamp x={400} y={215} angle={90} />
      <Wire points={[[400, 245], [400, 262], [80, 262]]} color={WN} width={4} />
    </g>
  );
  // ค: lamp across L–L (N left unconnected)
  const c = (
    <g>
      <Label x={70} y={110} size={26} weight={700} color={WL}>L</Label>
      <Label x={70} y={250} size={26} weight={700} color={WN}>N</Label>
      <Wire points={[[90, 110], [180, 110]]} color={WL} width={4} />
      <SwitchSym x={220} y={110} />
      <Wire points={[[260, 110], [380, 110], [380, 140]]} color={WL} width={4} />
      <Lamp x={380} y={170} angle={90} />
      <Wire points={[[380, 200], [380, 215], [120, 215], [120, 110]]} color={WL} width={4} />
      <Node x={120} y={110} />
      <Wire points={[[90, 250], [170, 250]]} color={WN} width={4} />
      <circle cx={176} cy={250} r={6} fill={BG} stroke={WN} strokeWidth={3} />
    </g>
  );
  // ง: correct one-way
  const d = (
    <g>
      <Label x={70} y={110} size={26} weight={700} color={WL}>L</Label>
      <Label x={70} y={230} size={26} weight={700} color={WN}>N</Label>
      <Wire points={[[90, 110], [180, 110]]} color={WL} width={4} />
      <SwitchSym x={220} y={110} />
      <Wire points={[[260, 110], [380, 110], [380, 140]]} color={WL} width={4} />
      <Lamp x={380} y={170} angle={90} />
      <Wire points={[[380, 200], [380, 230], [90, 230]]} color={WN} width={4} />
    </g>
  );
  return (
    <svg viewBox="0 0 900 600" aria-hidden="true">
      {frame(0, 0, "ก", a)}
      {frame(450, 0, "ข", b)}
      {frame(0, 300, "ค", c)}
      {frame(450, 300, "ง", d)}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F16 การต่อขั้วหลอด E27 (600×400)
// ---------------------------------------------------------------------------
function E27Holder() {
  const cx = 300;
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* insulating body */}
      <rect x={cx - 110} y={40} width={220} height={250} rx={14} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={cx} y={20} size={20} muted>ขั้วรับหลอด E27 (ภาพตัด)</Label>
      {/* screw shell */}
      <rect x={cx - 70} y={60} width={140} height={160} fill="var(--fig-wire-n)" fillOpacity={0.12} stroke={WN} strokeWidth={3} />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M ${cx - 70} ${76 + i * 25} Q ${cx} ${88 + i * 25} ${cx + 70} ${76 + i * 25}`} fill="none" stroke={WN} strokeWidth={2} />
      ))}
      {/* centre contact */}
      <rect x={cx - 22} y={232} width={44} height={16} rx={4} fill="var(--fig-wire-l)" stroke={INK} strokeWidth={2} />
      {/* wires */}
      <Wire points={[[cx - 70, 140], [80, 140], [80, 330]]} color={WN} width={4} />
      <Wire points={[[cx, 248], [cx, 270], [cx + 160, 270], [cx + 160, 330]]} color={WL} width={4} />
      <Label x={20} y={360} size={22} anchor="start" color={WN} weight={700}>N (ฟ้า) → เกลียว</Label>
      <Label x={580} y={360} size={22} anchor="end" color={WL} weight={700}>L หลังสวิตช์ → ขั้วกลาง</Label>
      <Label x={cx} y={196} size={20}>เกลียว (shell)</Label>
      <Label x={cx + 32} y={240} size={20} anchor="start">ขั้วกลาง</Label>
      <Label x={cx} y={396} size={20} muted>นิ้วอาจแตะเกลียวขณะเปลี่ยนหลอด → เกลียวต้องเป็น N</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F17 ไฟบันไดควบคุมได้ 2 ที่ (600×380) — intro
// ---------------------------------------------------------------------------
function Staircase() {
  const steps: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = 140 + i * 50;
    const y = 330 - i * 32;
    steps.push(`L ${x} ${y} L ${x} ${y - 32}`);
  }
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <path d={`M 20 330 L 140 330 ${steps.join(" ")} L 590 106`} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <line x1={20} y1={330} x2={20} y2={20} stroke={MUTED} strokeWidth={2} />
      <line x1={20} y1={20} x2={590} y2={20} stroke={MUTED} strokeWidth={2} />
      {/* lamp */}
      <line x1={330} y1={20} x2={330} y2={60} stroke={INK} strokeWidth={2.5} />
      <Lamp x={330} y={78} on />
      <Label x={330} y={118} size={22}>หลอดไฟบันได</Label>
      {/* switches */}
      <rect x={60} y={210} width={34} height={50} rx={5} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={70} y={222} width={14} height={14} fill={INK} />
      <Label x={77} y={290} size={22} weight={700}>S1</Label>
      <Label x={77} y={316} size={20} muted>ชั้นล่าง</Label>
      <rect x={520} y={40} width={34} height={50} rx={5} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={530} y={64} width={14} height={14} fill={INK} />
      <Label x={508} y={90} size={22} weight={700} anchor="end">S2 ชั้นบน</Label>
      {/* concealed wiring */}
      <path d="M 94 230 L 130 230 L 130 78 L 300 78" fill="none" stroke={WL} strokeWidth={2.5} strokeDasharray="7 6" />
      <path d="M 520 58 L 400 58 L 400 78 L 360 78" fill="none" stroke={WL} strokeWidth={2.5} strokeDasharray="7 6" />
      <Label x={140} y={180} size={20} anchor="start" muted>สายในผนัง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W05-F18 สวิตช์ตัดสาย N (ผิด) — ขั้วหลอดยังมีไฟ (600×360)
// ---------------------------------------------------------------------------
function SwitchInNeutral() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      <Label x={30} y={90} size={22} weight={700} color={WL}>L</Label>
      <Label x={30} y={250} size={22} weight={700} color={WN}>N</Label>
      <Wire points={[[46, 90], [300, 90], [300, 140]]} color={WL} width={4} />
      <circle cx={300} cy={170} r={50} fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={2.5} strokeDasharray="7 5" />
      <Lamp x={300} y={170} angle={90} />
      <Wire points={[[300, 200], [300, 250], [210, 250]]} color={WN} width={4} />
      <SwitchSym x={170} y={250} />
      <Wire points={[[130, 250], [46, 250]]} color={WN} width={4} />
      <Label x={170} y={300} size={20}>สวิตช์อยู่ในสาย N (ผิด)</Label>
      <Callout x={370} y={70} w={215} h={200} tone="danger">
        <Label x={477} y={105} size={20} weight={700} color={DANGER}>⚠ อันตราย</Label>
        <Label x={477} y={140} size={20}>ปิดสวิตช์แล้ว</Label>
        <Label x={477} y={170} size={20}>ขั้วหลอดยังต่อ L</Label>
        <Label x={477} y={200} size={20}>≈ 230 V เทียบดิน</Label>
        <Label x={477} y={235} size={20} muted>หลอดดับ แต่ยังมีไฟ</Label>
      </Callout>
    </svg>
  );
}

export const figures: FigureMap = {
  "W05-F01": Distribution,
  "W05-F02": Photometry,
  "W05-F03": IncandescentCutaway,
  "W05-F04": FluorescentCircuit,
  "W05-F05": LedBulb,
  "W05-F06": OneWayWiring,
  "W05-F07": twoWay("u", "u"),
  "W05-F08": intermediate(0, false, 0),
  "W05-F09": Glare,
  "W05-F10": EfficacyChart,
  "W05-F11": TrainingBoard,
  "W05-F12": TwoLampsParallel,
  "W05-F13": twoWay("d", "u"),
  "W05-F14": IntermediatePositions,
  "W05-F15": FaultPanels,
  "W05-F16": E27Holder,
  "W05-F17": Staircase,
  "W05-F18": SwitchInNeutral,
  "W05-F19": intermediate(0, true, 1),
};
export default figures;
