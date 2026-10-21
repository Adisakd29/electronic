/**
 * Week 6 — อุปกรณ์ป้องกันไฟฟ้า (Electrical Protective Devices & Earthing)
 * Wire colours per มอก. 11-2553: L brown, N blue, PE green–yellow (PEWire).
 * PEN (combined N+PE of the supply, TN-C part) is drawn blue and labelled "PEN".
 * Symbols per IEC 60617: fuse = rectangle with a line through, circuit breaker
 * = contact with "×", residual current release = ring (CT) + dashed link.
 */
import type { FigureMap } from "@/content/types";
import type { ReactNode } from "react";
import { Label, Wire, Node, Resistor, PEWire, Ground, Callout, Arrow } from "./kit";

type Pt = [number, number];
const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const GRID = "var(--fig-grid)";
const WL = "var(--fig-wire-l)";
const WN = "var(--fig-wire-n)";
const CUR = "var(--fig-current)";
const OK = "var(--fig-ok)";
const DANGER = "var(--fig-danger)";
const WARN = "var(--fig-warn)";
const ACCENT = "var(--fig-accent)";
const ACCENT2 = "var(--fig-accent-2)";
const COPPER = "var(--fig-copper)";
const COPPER_SOFT = "var(--fig-copper-soft)";
const SKIN = "var(--fig-skin)";

// ---------------------------------------------------------------------------
// Local primitives
// ---------------------------------------------------------------------------

/** Highlight underlay for a current path. */
function PathGlow({ points, color = CUR }: { points: Pt[]; color?: string }) {
  return (
    <path
      d={"M" + points.map((p) => p.join(" ")).join(" L")}
      fill="none"
      stroke={color}
      strokeWidth={12}
      strokeOpacity={0.28}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

function Term({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={6} fill={BG} stroke={INK} strokeWidth={2.5} />;
}

/** IEC fuse symbol, horizontal, centred on (x, y); total length 80. */
function FuseSym({ x, y, color = INK }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <line x1={x - 40} y1={y} x2={x + 40} y2={y} stroke={color} strokeWidth={3} />
      <rect x={x - 26} y={y - 11} width={52} height={22} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={x - 26} y1={y} x2={x + 26} y2={y} stroke={INK} strokeWidth={3} />
    </g>
  );
}

/**
 * IEC contact, horizontal, left terminal (x−40, y), right terminal (x+40, y).
 * kind "cb" = circuit-breaker (× on the fixed contact), "sw" = plain switch contact.
 */
function ContactSym({ x, y, kind = "cb", color = INK }: { x: number; y: number; kind?: "cb" | "sw"; color?: string }) {
  return (
    <g>
      <line x1={x - 40} y1={y} x2={x - 20} y2={y} stroke={color} strokeWidth={3} />
      <line x1={x - 20} y1={y} x2={x + 16} y2={y - 20} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <line x1={x + 20} y1={y} x2={x + 40} y2={y} stroke={color} strokeWidth={3} />
      {kind === "cb" ? (
        <g stroke={INK} strokeWidth={2.5}>
          <line x1={x + 14} y1={y - 6} x2={x + 26} y2={y + 6} />
          <line x1={x + 14} y1={y + 6} x2={x + 26} y2={y - 6} />
        </g>
      ) : (
        <line x1={x + 20} y1={y - 8} x2={x + 20} y2={y} stroke={INK} strokeWidth={3} />
      )}
    </g>
  );
}

/** Tension spring (zig-zag) between two points. */
function Spring({ from, to, turns = 7 }: { from: Pt; to: Pt; turns?: number }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const lead = 10;
  const pts: Pt[] = [[x1, y1], [x1 + ux * lead, y1 + uy * lead]];
  const n = turns * 2;
  const seg = (len - 2 * lead) / n;
  for (let i = 1; i <= n; i++) {
    const s = lead + seg * (i - 0.5);
    const side = i % 2 ? 9 : -9;
    pts.push([x1 + ux * s + nx * side, y1 + uy * s + ny * side]);
  }
  pts.push([x2 - ux * lead, y2 - uy * lead], [x2, y2]);
  return <Wire points={pts} width={2.5} />;
}

function Pivot({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={x} cy={y} r={2.5} fill={INK} />
    </g>
  );
}

/** Lightning bolt icon. */
function Bolt({ x, y, s = 1, color = WARN }: { x: number; y: number; s?: number; color?: string }) {
  const p = [
    [0, 0], [-14, 30], [-2, 30], [-12, 58], [16, 22], [3, 22], [12, 0],
  ].map(([a, b]) => `${x + a * s} ${y + b * s}`);
  return <path d={`M ${p.join(" L ")} Z`} fill={color} stroke={INK} strokeWidth={2} strokeLinejoin="round" />;
}

/** Spark (star) icon. */
function Spark({ x, y, r = 16, color = DANGER }: { x: number; y: number; r?: number; color?: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${x + rr * Math.cos(a)} ${y + rr * Math.sin(a)}`);
  }
  return <path d={`M ${pts.join(" L ")} Z`} fill={color} stroke={INK} strokeWidth={1.5} />;
}

/** Simple person (standing), feet at (x, y). Height ≈ 120. */
function Person({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const k = (v: number) => v * s;
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round">
      <circle cx={x} cy={y - k(108)} r={k(13)} fill={SKIN} />
      <line x1={x} y1={y - k(94)} x2={x} y2={y - k(45)} />
      <line x1={x} y1={y - k(45)} x2={x - k(14)} y2={y} />
      <line x1={x} y1={y - k(45)} x2={x + k(14)} y2={y} />
      <line x1={x} y1={y - k(82)} x2={x - k(24)} y2={y - k(58)} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// W06-F13 — four hazards and the device that answers each one
// ---------------------------------------------------------------------------

function HazardCard({ x, y, title, device, children }: { x: number; y: number; title: string; device: string; children: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={285} height={190} rx={12} fill={PANEL} stroke={GRID} strokeWidth={2} />
      <Label x={x + 142} y={y + 26} size={22} weight={700}>{title}</Label>
      {children}
      <rect x={x + 12} y={y + 146} width={261} height={34} rx={8} fill={BG} stroke={ACCENT} strokeWidth={2} />
      <Label x={x + 142} y={y + 164} size={20} weight={700} color={ACCENT}>{device}</Label>
    </g>
  );
}

function F13Hazards() {
  return (
    <svg viewBox="0 0 600 410" aria-hidden="true">
      {/* 1 overload */}
      <HazardCard x={10} y={10} title="① กระแสเกิน (overload)" device="→ ฟิวส์ / MCB (ความร้อน)">
        <Wire points={[[40, 95], [250, 95]]} color={WL} width={8} />
        {[80, 125, 170, 215].map((xx) => (
          <path key={xx} d={`M ${xx} 80 q -6 -8 0 -16 q 6 -8 0 -16`} fill="none" stroke={DANGER} strokeWidth={2.5} />
        ))}
        <Label x={145} y={114} size={20}>20 A บนวงจร 16 A</Label>
        <Label x={145} y={136} size={20}>นาน ๆ → สายร้อน</Label>
      </HazardCard>
      {/* 2 short circuit */}
      <HazardCard x={305} y={10} title="② ลัดวงจร (short circuit)" device="→ ฟิวส์ / MCB (แม่เหล็ก)">
        <Wire points={[[335, 70], [430, 70], [445, 88]]} color={WL} width={6} />
        <Wire points={[[335, 108], [430, 108], [445, 90]]} color={WN} width={6} />
        <Spark x={452} y={89} r={20} />
        <Label x={360} y={56} size={20} color={WL}>L</Label>
        <Label x={360} y={126} size={20} color={WN}>N</Label>
        <Label x={530} y={80} size={20}>I สูงมาก</Label>
        <Label x={530} y={104} size={20}>หลายร้อย A</Label>
      </HazardCard>
      {/* 3 earth leakage */}
      <HazardCard x={10} y={205} title="③ ไฟรั่ว (earth leakage)" device="→ RCD 30 mA">
        <rect x={40} y={245} width={70} height={60} rx={6} fill={BG} stroke={INK} strokeWidth={3} />
        <Spark x={100} y={258} r={11} />
        <Person x={150} y={340} s={0.72} />
        <Wire points={[[110, 280], [133, 290]]} color={DANGER} width={3} dash="5 4" />
        <Label x={232} y={262} size={20}>mA ผ่านคน</Label>
        <Label x={232} y={288} size={20}>ลงดิน</Label>
      </HazardCard>
      {/* 4 surge */}
      <HazardCard x={305} y={205} title="④ ไฟกระชาก (surge)" device="→ SPD (กันไฟกระชาก)">
        <Bolt x={350} y={240} s={1.05} />
        <path d="M 390 290 q 12 -22 24 0 t 24 0" fill="none" stroke={INK} strokeWidth={2.5} />
        <path d="M 438 290 l 6 -55 l 6 55" fill="none" stroke={DANGER} strokeWidth={3} />
        <path d="M 450 290 q 12 -22 24 0" fill="none" stroke={INK} strokeWidth={2.5} />
        <Label x={535} y={262} size={20}>หลาย kV</Label>
        <Label x={535} y={288} size={20}>ชั่ว µs</Label>
      </HazardCard>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F01 — cartridge fuse cut-away (intact / blown) + IEC symbol
// ---------------------------------------------------------------------------

function Cartridge({ y, blown }: { y: number; blown?: boolean }) {
  const x0 = 40;
  const x1 = 340;
  return (
    <g>
      <rect x={x0 + 40} y={y - 32} width={x1 - x0 - 80} height={64} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* arc-quenching sand (dots) */}
      {Array.from({ length: 36 }).map((_, i) => (
        <circle key={i} cx={x0 + 52 + (i % 12) * 19} cy={y - 20 + Math.floor(i / 12) * 20} r={1.8} fill={MUTED} />
      ))}
      <rect x={x0} y={y - 38} width={46} height={76} rx={6} fill={COPPER_SOFT} stroke={INK} strokeWidth={3} />
      <rect x={x1 - 46} y={y - 38} width={46} height={76} rx={6} fill={COPPER_SOFT} stroke={INK} strokeWidth={3} />
      {blown ? (
        <g>
          <Wire points={[[x0 + 46, y], [178, y], [184, y - 5]]} color={COPPER} width={4} />
          <Wire points={[[x1 - 46, y], [202, y], [196, y + 5]]} color={COPPER} width={4} />
          <circle cx={190} cy={y} r={9} fill="none" stroke={DANGER} strokeWidth={2} strokeDasharray="3 3" />
        </g>
      ) : (
        <g>
          <Wire points={[[x0 + 46, y], [176, y]]} color={COPPER} width={4} />
          <Wire points={[[204, y], [x1 - 46, y]]} color={COPPER} width={4} />
          <path d={`M 176 ${y - 2} L 190 ${y - 0.6} L 204 ${y - 2} L 204 ${y + 2} L 190 ${y + 0.6} L 176 ${y + 2} Z`} fill={COPPER} />
        </g>
      )}
    </g>
  );
}

function F01Fuse() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <Label x={190} y={30} size={22} weight={700}>ปกติ: ไส้ฟิวส์ต่อเนื่อง</Label>
      <Cartridge y={100} />
      <Label x={63} y={182} size={20} muted>ฝาปลายโลหะ</Label>
      <line x1={63} y1={170} x2={63} y2={140} stroke={MUTED} strokeWidth={1.5} />
      <Label x={150} y={158} size={20} muted anchor="start">จุดคอด (หลอมก่อน)</Label>
      <line x1={190} y1={146} x2={190} y2={106} stroke={MUTED} strokeWidth={1.5} />

      <Label x={190} y={218} size={22} weight={700} color={DANGER}>ขาด: วงจรเปิด ✗</Label>
      <Cartridge y={285} blown />
      <Label x={190} y={350} size={20} muted>ทรายดับอาร์กในหลอด</Label>

      <rect x={380} y={50} width={200} height={140} rx={10} fill={PANEL} stroke={GRID} strokeWidth={2} />
      <Label x={480} y={76} size={20} weight={700}>สัญลักษณ์ IEC</Label>
      <FuseSym x={480} y={120} />
      <Label x={480} y={164} size={20}>F1 · 10 A</Label>

      <Label x={480} y={240} size={20}>หลอมเมื่อพลังงาน</Label>
      <Label x={480} y={266} size={20}>ความร้อน I²t เกิน</Label>
      <Label x={480} y={302} size={20} weight={700}>ใช้ได้ครั้งเดียว</Label>
      <Label x={480} y={328} size={20}>เปลี่ยนพิกัดเดิมเท่านั้น</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F11 — automotive blade fuses, ISO 8820-3 colours
// ---------------------------------------------------------------------------

const BLADES: { a: string; color: string; name: string }[] = [
  { a: "5 A", color: COPPER_SOFT, name: "น้ำตาลอ่อน" },
  { a: "7.5 A", color: WL, name: "น้ำตาล" },
  { a: "10 A", color: DANGER, name: "แดง" },
  { a: "15 A", color: WN, name: "น้ำเงิน" },
  { a: "20 A", color: "var(--fig-glow)", name: "เหลือง" },
  { a: "25 A", color: BG, name: "ใส/ขาว" },
  { a: "30 A", color: "var(--fig-wire-pe-g)", name: "เขียว" },
];

function F11Blade() {
  return (
    <svg viewBox="0 0 600 330" aria-hidden="true">
      {BLADES.map((b, i) => {
        const cx = 56 + i * 81;
        return (
          <g key={b.a}>
            <Label x={cx} y={40} size={22} weight={700}>{b.a}</Label>
            <path
              d={`M ${cx - 32} 70 L ${cx + 32} 70 L ${cx + 28} 140 L ${cx - 28} 140 Z`}
              fill={b.color}
              stroke={INK}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            <rect x={cx - 24} y={140} width={13} height={44} fill={PANEL} stroke={INK} strokeWidth={2.5} />
            <rect x={cx + 11} y={140} width={13} height={44} fill={PANEL} stroke={INK} strokeWidth={2.5} />
            <Label x={cx} y={i % 2 ? 236 : 208} size={20}>{b.name}</Label>
          </g>
        );
      })}
      <Label x={300} y={276} size={20}>อ่านพิกัดจากตัวเลขบนหัวฟิวส์ และจากสีตัวฟิวส์ (ISO 8820-3)</Label>
      <Label x={300} y={306} size={20} muted>ใช้ในรถยนต์ ไฟ DC แรงดันต่ำ (ไม่เกิน 32 V) · ใช้ครั้งเดียว</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F02 / F03 — thermal and magnetic trip mechanisms (closed / tripped)
// Shared parts: latch lever (pivot 200, oy+150), contact arm (pivot 530, oy+190),
// opening spring, fixed contact (390, oy+205) and output terminal.
// ---------------------------------------------------------------------------

function TripMechanism({ oy, tripped }: { oy: number; tripped: boolean }) {
  // latch lever: top end is pushed to the right by the trip element
  const lvTop: Pt = tripped ? [214, oy + 100] : [200, oy + 100];
  const lvBot: Pt = tripped ? [186, oy + 200] : [200, oy + 200];
  // contact arm: tip near the latch, pivot on the right
  const piv: Pt = [530, oy + 190];
  const tip: Pt = tripped ? [222, oy + 118] : [222, oy + 190];
  const at = (t: number): Pt => [tip[0] + (piv[0] - tip[0]) * t, tip[1] + (piv[1] - tip[1]) * t];
  const mc = at((390 - tip[0]) / (piv[0] - tip[0])); // moving contact under the arm at x≈390
  const sp = at((300 - tip[0]) / (piv[0] - tip[0])); // spring attach x≈300
  return (
    <g>
      {/* fixed contact + output */}
      <rect x={376} y={oy + 203} width={28} height={10} fill={COPPER} stroke={INK} strokeWidth={2} />
      <Wire points={[[390, oy + 213], [390, oy + 236], [568, oy + 236]]} color={WL} />
      <Term x={570} y={oy + 236} />
      {/* contact arm */}
      <line x1={tip[0]} y1={tip[1]} x2={piv[0]} y2={piv[1]} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <rect x={mc[0] - 14} y={mc[1] + 2} width={28} height={10} fill={COPPER} stroke={INK} strokeWidth={2} />
      <Pivot x={piv[0]} y={piv[1]} />
      {/* opening spring (pulls the arm up) */}
      <line x1={286} y1={oy + 84} x2={314} y2={oy + 84} stroke={INK} strokeWidth={4} />
      <Spring from={[300, oy + 84]} to={sp} turns={tripped ? 4 : 6} />
      {/* latch lever with hook at the bottom */}
      <line x1={lvTop[0]} y1={lvTop[1]} x2={lvBot[0]} y2={lvBot[1]} stroke={ACCENT} strokeWidth={6} strokeLinecap="round" />
      <path
        d={`M ${lvBot[0]} ${lvBot[1]} L ${lvBot[0] + 26} ${lvBot[1] - 18}`}
        stroke={ACCENT}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Pivot x={200} y={oy + 150} />
    </g>
  );
}

function ThermalPanel({ oy, tripped }: { oy: number; tripped: boolean }) {
  const top: Pt = tripped ? [196, oy + 104] : [150, oy + 104];
  const bimetal = tripped
    ? `M 150 ${oy + 216} Q 152 ${oy + 140} ${top[0]} ${top[1]}`
    : `M 150 ${oy + 216} L 150 ${oy + 104}`;
  const path: Pt[] = [[40, oy + 236], [150, oy + 236], [150, oy + 104]];
  return (
    <g>
      {!tripped ? (
        <g>
          <PathGlow points={path} />
          <PathGlow points={[[150, oy + 60], [530, oy + 60], [530, oy + 190], [390, oy + 200], [390, oy + 236], [570, oy + 236]]} />
        </g>
      ) : null}
      <Term x={40} y={oy + 236} />
      <Wire points={[[46, oy + 236], [150, oy + 236], [150, oy + 216]]} color={WL} />
      {/* bimetal: two layers */}
      <path d={bimetal} fill="none" stroke={COPPER} strokeWidth={14} strokeLinecap="butt" />
      <path d={bimetal} fill="none" stroke={MUTED} strokeWidth={5} strokeLinecap="butt" transform="translate(4 0)" />
      {/* flexible braid from bimetal top to the arm pivot */}
      <Wire points={[top, [top[0], oy + 60], [530, oy + 60], [530, oy + 183]]} color={WL} dash={tripped ? undefined : undefined} />
      <TripMechanism oy={oy} tripped={tripped} />
      {tripped ? (
        <g>
          {[110, 150].map((yy) => (
            <path key={yy} d={`M 108 ${oy + yy} q -6 -8 0 -16 q 6 -8 0 -16`} fill="none" stroke={DANGER} strokeWidth={2.5} />
          ))}
        </g>
      ) : null}
    </g>
  );
}

function F02Thermal() {
  return (
    <svg viewBox="0 0 600 560" aria-hidden="true">
      <Label x={300} y={22} size={22} weight={700}>ปกติ: หน้าสัมผัสปิด กระแสไหล</Label>
      <ThermalPanel oy={10} tripped={false} />
      <Label x={70} y={140} size={20} anchor="middle">แผ่นโลหะคู่</Label>
      <Label x={250} y={178} size={20} color={ACCENT} anchor="start">สลัก</Label>
      <Label x={330} y={112} size={20} anchor="start">สปริง</Label>
      <Label x={530} y={232} size={20}>จุดหมุน</Label>
      <Label x={40} y={270} size={20} muted>เข้า</Label>
      <Label x={570} y={270} size={20} muted>ออก</Label>

      <line x1={10} y1={286} x2={590} y2={286} stroke={GRID} strokeWidth={2} />
      <Label x={300} y={308} size={22} weight={700} color={DANGER}>กระแสเกินนาน: โลหะคู่ร้อนโก่ง → ตัด</Label>
      <ThermalPanel oy={296} tripped />
      <Label x={70} y={470} size={20}>ร้อน → โก่ง</Label>
      <Label x={266} y={486} size={20} color={ACCENT} anchor="start">สลักหลุด</Label>
      <Label x={440} y={420} size={20}>หน้าสัมผัสเปิด</Label>
      <Label x={480} y={552} size={20} color={DANGER}>กระแสหยุดไหล</Label>
    </svg>
  );
}

function MagneticPanel({ oy, tripped }: { oy: number; tripped: boolean }) {
  const shift = tripped ? 22 : 0;
  return (
    <g>
      {!tripped ? (
        <PathGlow points={[[40, oy + 236], [60, oy + 236], [60, oy + 145], [170, oy + 145], [170, oy + 60], [530, oy + 60], [530, oy + 190], [390, oy + 200], [390, oy + 236], [570, oy + 236]]} />
      ) : null}
      <Term x={40} y={oy + 236} />
      {/* iron plunger (moves right when pulled into the coil) */}
      <rect x={34 + shift} y={oy + 100} width={110} height={22} fill={GRID} stroke={INK} strokeWidth={2.5} />
      <line x1={144 + shift} y1={oy + 111} x2={176 + shift} y2={oy + 111} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      {/* coil */}
      {Array.from({ length: 6 }).map((_, i) => (
        <ellipse key={i} cx={82 + i * 16} cy={oy + 111} rx={8} ry={24} fill="none" stroke={COPPER} strokeWidth={4} />
      ))}
      <Wire points={[[46, oy + 236], [60, oy + 236], [60, oy + 145], [82, oy + 135]]} color={WL} />
      <Wire points={[[162, oy + 87], [170, oy + 87], [170, oy + 60], [530, oy + 60], [530, oy + 183]]} color={WL} />
      <TripMechanism oy={oy} tripped={tripped} />
      {tripped ? <Arrow from={[66, oy + 160]} to={[120, oy + 160]} color={DANGER} /> : null}
    </g>
  );
}

function F03Magnetic() {
  return (
    <svg viewBox="0 0 600 560" aria-hidden="true">
      <Label x={300} y={22} size={22} weight={700}>ปกติ: สนามแม่เหล็กอ่อน แกนไม่ขยับ</Label>
      <MagneticPanel oy={10} tripped={false} />
      <Label x={100} y={70} size={20}>ขดลวดแม่เหล็ก</Label>
      <Label x={250} y={178} size={20} color={ACCENT} anchor="start">สลัก</Label>
      <Label x={330} y={112} size={20} anchor="start">สปริง</Label>
      <Label x={530} y={232} size={20}>จุดหมุน</Label>
      <Label x={40} y={270} size={20} muted>เข้า</Label>
      <Label x={570} y={270} size={20} muted>ออก</Label>

      <line x1={10} y1={286} x2={590} y2={286} stroke={GRID} strokeWidth={2} />
      <Label x={300} y={308} size={22} weight={700} color={DANGER}>ลัดวงจร: ดูดแกนทันที → ตัด &lt; 0.1 s</Label>
      <MagneticPanel oy={296} tripped />
      <Label x={128} y={486} size={20} color={DANGER}>แกนถูกดูด</Label>
      <Label x={266} y={486} size={20} color={ACCENT} anchor="start">สลักหลุด</Label>
      <Label x={440} y={420} size={20}>หน้าสัมผัสเปิด</Label>
      <Label x={480} y={552} size={20} color={DANGER}>กระแสหยุดไหล</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F04 — time–current curves, MCB Type B and C (log–log, indicative)
// ---------------------------------------------------------------------------

const TX0 = 100;
const TX1 = 570;
const TY0 = 30;
const TY1 = 380;
const xm = (m: number) => TX0 + (Math.log10(m) / 2) * (TX1 - TX0);
const yt = (t: number) => TY0 + ((4 - Math.log10(t)) / 6) * (TY1 - TY0);
const toPts = (a: [number, number][]) => a.map(([m, t]) => `${xm(m).toFixed(1)} ${yt(t).toFixed(1)}`);

function F04Curve() {
  const thermalUpper: [number, number][] = [[1.45, 10000], [1.45, 3600], [2, 400], [2.55, 60], [3, 25], [4, 10], [5, 6]];
  const thermalLower: [number, number][] = [[1.13, 10000], [1.5, 400], [2, 50], [2.55, 1.5], [3, 0.8]];
  const bUpper = [...thermalUpper, [5, 0.01]] as [number, number][];
  const bLower = [...thermalLower, [3, 0.01]] as [number, number][];
  const cUpper = [...thermalUpper, [7, 3], [10, 1.5], [10, 0.01]] as [number, number][];
  const cLower = [...thermalLower, [4, 0.4], [5, 0.25], [5, 0.01]] as [number, number][];
  const band = (u: [number, number][], l: [number, number][]) => `M ${[...toPts(u), ...toPts([...l].reverse())].join(" L ")} Z`;
  const xTicks = [1, 2, 3, 5, 10, 20, 50, 100];
  const yTicks: [number, string][] = [[0.01, "0.01"], [0.1, "0.1"], [1, "1"], [10, "10"], [100, "100"], [1000, "1000"], [10000, "10000"]];
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      {/* grid */}
      {xTicks.map((m) => (
        <g key={m}>
          <line x1={xm(m)} y1={TY0} x2={xm(m)} y2={TY1} stroke={GRID} strokeWidth={1.5} />
          <Label x={xm(m)} y={TY1 + 20} size={20} muted>{m}</Label>
        </g>
      ))}
      {yTicks.map(([t, s]) => (
        <g key={t}>
          <line x1={TX0} y1={yt(t)} x2={TX1} y2={yt(t)} stroke={GRID} strokeWidth={1.5} />
          <Label x={TX0 - 8} y={yt(t)} size={20} muted anchor="end">{s}</Label>
        </g>
      ))}
      <rect x={TX0} y={TY0} width={TX1 - TX0} height={TY1 - TY0} fill="none" stroke={INK} strokeWidth={2} />
      {/* bands */}
      <path d={band(cUpper, cLower)} fill={ACCENT2} fillOpacity={0.14} stroke={ACCENT2} strokeWidth={2.5} strokeDasharray="8 5" />
      <path d={band(bUpper, bLower)} fill={ACCENT} fillOpacity={0.2} stroke={ACCENT} strokeWidth={3} />
      {/* 1 hour line (conventional test time) */}
      <line x1={TX0} y1={yt(3600)} x2={TX1} y2={yt(3600)} stroke={MUTED} strokeWidth={2} strokeDasharray="2 5" />
      <Label x={TX1 - 6} y={yt(3600) + 18} size={20} muted anchor="end">1 ชั่วโมง</Label>
      {/* markers 2 In and 10 In */}
      <line x1={xm(2)} y1={TY0} x2={xm(2)} y2={TY1} stroke={CUR} strokeWidth={2.5} strokeDasharray="4 4" />
      <line x1={xm(10)} y1={TY0} x2={xm(10)} y2={TY1} stroke={CUR} strokeWidth={2.5} strokeDasharray="4 4" />
      <Label x={xm(2) + 6} y={TY0 + 16} size={20} color={CUR} anchor="start">2 In</Label>
      <Label x={xm(10) + 6} y={TY0 + 16} size={20} color={CUR} anchor="start">10 In</Label>
      {/* annotations */}
      <Label x={xm(3.2)} y={yt(300)} size={20} anchor="start">ส่วนความร้อน: หน่วงเวลา</Label>
      <Label x={xm(3.9)} y={yt(0.03)} size={20} weight={700} color={ACCENT}>B</Label>
      <Label x={xm(7.1)} y={yt(0.03)} size={20} weight={700} color={ACCENT2}>C</Label>
      <Label x={xm(14)} y={yt(0.03)} size={20} anchor="start">แม่เหล็ก &lt; 0.1 s</Label>
      {/* axes titles */}
      <Label x={(TX0 + TX1) / 2} y={TY1 + 52} size={20}>กระแส เป็นกี่เท่าของพิกัด (I / In)</Label>
      <text x={24} y={(TY0 + TY1) / 2} fontSize={20} textAnchor="middle" dominantBaseline="middle" fill={INK} transform={`rotate(-90 24 ${(TY0 + TY1) / 2})`}>
        เวลาตัด (s)
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F05 — RCD principle: core-balance CT, normal vs leakage through a person
// ---------------------------------------------------------------------------

function RcdPanel({ oy, leak }: { oy: number; leak: boolean }) {
  const yL = oy + 80;
  const yN = oy + 140;
  return (
    <g>
      {/* conductors */}
      <Wire points={[[20, yL], [420, yL]]} color={WL} />
      <Wire points={[[20, yN], [420, yN]]} color={WN} />
      {/* trip contacts (open when tripped) */}
      {[yL, yN].map((yy, i) => (
        <g key={i}>
          <line x1={420} y1={yy} x2={leak ? 452 : 458} y2={leak ? yy - 18 : yy} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <line x1={460} y1={yy} x2={580} y2={yy} stroke={i ? WN : WL} strokeWidth={3} />
        </g>
      ))}
      {/* load */}
      <rect x={540} y={yL + 14} width={36} height={32} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={558} y1={yL} x2={558} y2={yL + 14} stroke={INK} strokeWidth={3} />
      <line x1={558} y1={yL + 46} x2={558} y2={yN} stroke={INK} strokeWidth={3} />
      <Node x={558} y={yL} r={4} />
      <Node x={558} y={yN} r={4} />
      {/* CT ring */}
      <ellipse cx={200} cy={(yL + yN) / 2} rx={24} ry={58} fill="none" stroke={INK} strokeWidth={7} />
      {/* sense coil → trip relay */}
      <Wire points={[[200, oy + 168], [200, oy + 196], [300, oy + 196]]} width={2.5} />
      <rect x={300} y={oy + 180} width={90} height={32} rx={4} fill={leak ? "var(--fig-danger-soft)" : PANEL} stroke={INK} strokeWidth={2.5} />
      <Label x={345} y={oy + 197} size={20}>รีเลย์</Label>
      <line x1={390} y1={oy + 196} x2={404} y2={oy + 196} stroke={INK} strokeWidth={2} strokeDasharray="6 4" />
      <path d={`M 404 ${oy + 196} L 404 ${yL - 26} L 438 ${yL - 26}`} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="6 4" />
      {leak ? (
        <g>
          <Node x={500} y={yL} r={4} />
          <Wire points={[[500, yL], [500, yL + 26]]} color={DANGER} width={3} />
          <Person x={510} y={oy + 232} s={0.85} />
          <Arrow from={[488, yL + 34]} to={[488, oy + 220]} color={DANGER} />
          <Ground x={540} y={oy + 228} />
        </g>
      ) : null}
    </g>
  );
}

function F05Rcd() {
  return (
    <svg viewBox="0 0 600 560" aria-hidden="true">
      <Label x={300} y={20} size={22} weight={700}>ปกติ: กระแสไป = กระแสกลับ → ไม่ตัด ✓</Label>
      <RcdPanel oy={10} leak={false} />
      <Label x={100} y={68} size={20} color={WL}>L 5.000 A →</Label>
      <Label x={100} y={176} size={20} color={WN}>N ← 5.000 A</Label>
      <Label x={200} y={246} size={20}>วงแหวน CT</Label>
      <Label x={540} y={246} size={20} muted>โหลด</Label>

      <line x1={10} y1={268} x2={590} y2={268} stroke={GRID} strokeWidth={2} />
      <Label x={300} y={292} size={22} weight={700} color={DANGER}>รั่วผ่านคน: ต่างกัน 30 mA → ตัด ✗</Label>
      <RcdPanel oy={290} leak />
      <Label x={100} y={348} size={20} color={WL}>L 5.030 A →</Label>
      <Label x={100} y={456} size={20} color={WN}>N ← 5.000 A</Label>
      <Label x={345} y={532} size={20}>สั่งปลดหน้าสัมผัส</Label>
      <Label x={414} y={472} size={20} color={DANGER} anchor="start">30 mA</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F06 — TN-C-S house cut-away (hotspot, viewBox 900×560)
// ---------------------------------------------------------------------------

function F06TNCS() {
  return (
    <svg viewBox="0 0 900 560" aria-hidden="true">
      {/* ground */}
      <rect x={0} y={440} width={900} height={120} fill={COPPER_SOFT} opacity={0.45} />
      <line x1={0} y1={440} x2={900} y2={440} stroke={INK} strokeWidth={2} />
      {/* pole + transformer */}
      <line x1={95} y1={60} x2={95} y2={440} stroke={MUTED} strokeWidth={10} />
      <rect x={12} y={60} width={160} height={84} rx={8} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={92} y={88} size={26} weight={700}>หม้อแปลง</Label>
      <Label x={92} y={120} size={26} muted>230/400 V</Label>
      {/* transformer neutral earth */}
      <Wire points={[[130, 144], [130, 470]]} color={WN} width={3} />
      <line x1={130} y1={470} x2={130} y2={530} stroke={COPPER} strokeWidth={8} />
      <Label x={142} y={500} size={26} anchor="start">ดินของหม้อแปลง</Label>
      {/* service drop L + PEN */}
      <Wire points={[[172, 80], [300, 110], [300, 220]]} color={WL} />
      <Wire points={[[172, 104], [285, 128], [285, 220]]} color={WN} />
      <Label x={230} y={74} size={26} color={WL}>L</Label>
      <Label x={215} y={150} size={26} color={WN} weight={700}>PEN</Label>
      {/* house */}
      <path d="M 250 200 L 560 40 L 870 200" fill="none" stroke={INK} strokeWidth={3} />
      <rect x={260} y={200} width={600} height={240} fill="none" stroke={INK} strokeWidth={3} />
      {/* meter */}
      <rect x={256} y={214} width={74} height={50} rx={4} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={293} y={240} size={26}>kWh</Label>
      {/* main board */}
      <rect x={340} y={230} width={150} height={150} rx={6} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={415} y={252} size={26} weight={700}>ตู้เมน</Label>
      <Wire points={[[300, 266], [300, 286], [360, 286]]} color={WL} />
      <Wire points={[[285, 266], [285, 300], [360, 300], [360, 320]]} color={WN} />
      {/* N bar & PE bar + bond */}
      <line x1={352} y1={320} x2={420} y2={320} stroke={WN} strokeWidth={8} />
      <PEWire points={[[352, 360], [470, 360]]} width={8} />
      <line x1={400} y1={320} x2={400} y2={360} stroke={INK} strokeWidth={5} />
      <Node x={400} y={320} />
      <Node x={400} y={360} />
      {/* earth conductor and rod */}
      <PEWire points={[[430, 360], [430, 445]]} width={6} />
      <rect x={424} y={445} width={12} height={100} fill={COPPER} stroke={INK} strokeWidth={2} />
      <Label x={448} y={480} size={26} anchor="start">หลักดิน ≥ 2.4 m</Label>
      <Label x={448} y={514} size={26} anchor="start" weight={700}>≤ 5 Ω</Label>
      {/* branch circuit L/N/PE */}
      <Wire points={[[470, 286], [490, 286], [620, 286]]} color={WL} />
      <Wire points={[[420, 320], [490, 320], [620, 320]]} color={WN} />
      <PEWire points={[[470, 360], [620, 360]]} width={5} />
      <Label x={562} y={266} size={26} muted>L · N · PE</Label>
      {/* socket */}
      <rect x={620} y={270} width={70} height={110} rx={10} fill={BG} stroke={INK} strokeWidth={3} />
      <circle cx={655} cy={300} r={7} fill={INK} />
      <circle cx={638} cy={340} r={7} fill={INK} />
      <circle cx={672} cy={340} r={7} fill={INK} />
      <Label x={655} y={404} size={26}>เต้ารับ 3 รู</Label>
      {/* Class I appliance */}
      <Wire points={[[690, 320], [730, 320]]} width={5} color={MUTED} />
      <rect x={730} y={250} width={124} height={130} rx={8} fill={GRID} stroke={INK} strokeWidth={3} />
      <Label x={792} y={296} size={26} weight={700}>Class I</Label>
      <Label x={792} y={336} size={26}>โครงโลหะ</Label>
      <Label x={792} y={228} size={26}>เครื่องใช้</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F07 — consumer unit (hotspot, viewBox 600×460)
// ---------------------------------------------------------------------------

function Module({ x, w, top, bottom, circuit, rcd, poles = 1 }: { x: number; w: number; top: string; bottom?: string; circuit?: string; rcd?: boolean; poles?: number }) {
  return (
    <g>
      <rect x={x} y={100} width={w} height={120} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      {Array.from({ length: poles }).map((_, i) => {
        const cx = x + (w / poles) * (i + 0.5);
        return <rect key={i} x={cx - 8} y={128} width={16} height={34} rx={3} fill={INK} />;
      })}
      {rcd ? (
        <g>
          <rect x={x + w - 26} y={176} width={20} height={20} rx={3} fill={ACCENT} />
          <Label x={x + w - 16} y={187} size={14} weight={700} color={BG}>T</Label>
        </g>
      ) : null}
      <Label x={x + w / 2} y={80} size={20} weight={700}>{top}</Label>
      {bottom ? <Label x={x + w / 2} y={240} size={20}>{bottom}</Label> : null}
      {circuit ? <Label x={x + w / 2} y={268} size={20} muted>{circuit}</Label> : null}
    </g>
  );
}

function F07Board() {
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      <rect x={10} y={20} width={580} height={430} rx={12} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={300} y={42} size={20} muted>ตู้โลหะ · ราง DIN</Label>
      <line x1={30} y1={160} x2={570} y2={160} stroke={MUTED} strokeWidth={6} />
      <Module x={30} w={80} top="32 A" bottom="เมน 2P" poles={2} />
      <Module x={120} w={70} top="SPD" bottom="Type 2" circuit="ไฟกระชาก" />
      <Module x={200} w={86} top="16 A" bottom="30 mA" circuit="เต้ารับ" rcd />
      <Module x={296} w={86} top="10 A" bottom="B" circuit="แสงสว่าง" />
      <Module x={392} w={86} top="25 A" bottom="30 mA" circuit="น้ำอุ่น" rcd />
      <Module x={488} w={86} top="20 A" bottom="C" circuit="แอร์" />
      {/* bus bars */}
      <line x1={40} y1={320} x2={270} y2={320} stroke={WN} strokeWidth={10} />
      {[60, 100, 140, 180, 220, 255].map((x) => (
        <circle key={x} cx={x} cy={320} r={4} fill={BG} />
      ))}
      <Label x={150} y={300} size={20} color={WN} weight={700}>บัสบาร์ N</Label>
      <PEWire points={[[330, 320], [560, 320]]} width={10} />
      <Label x={445} y={300} size={20} color={OK} weight={700}>บัสบาร์ PE</Label>
      {/* bonding jumper N–PE */}
      <path d="M 266 320 Q 300 352 334 320" fill="none" stroke={INK} strokeWidth={5} />
      <Label x={300} y={368} size={20}>ต่อฝาก N–PE</Label>
      {/* earth conductor exit */}
      <PEWire points={[[520, 320], [520, 450]]} width={6} />
      <Label x={510} y={420} size={20} anchor="end">ไปหลักดิน</Label>
      {/* circuit label card */}
      <rect x={34} y={386} width={170} height={48} rx={6} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={119} y={410} size={20}>ป้ายระบุวงจร</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F08 — separate appliance earth rod (wrong) vs PE back to the board (correct)
// ---------------------------------------------------------------------------

function FaultRow({ oy, good }: { oy: number; good: boolean }) {
  return (
    <g>
      {/* transformer */}
      <rect x={20} y={oy + 40} width={90} height={56} rx={6} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <Label x={65} y={oy + 68} size={20}>หม้อแปลง</Label>
      <Wire points={[[65, oy + 96], [65, oy + 120]]} color={WN} />
      <Resistor x={65} y={oy + 160} angle={90} />
      <Label x={80} y={oy + 160} size={20} anchor="start">5 Ω</Label>
      <Wire points={[[65, oy + 200], [65, oy + 210]]} />
      <Ground x={65} y={oy + 210} />
      {/* L → MCB → appliance */}
      <Wire points={[[110, oy + 56], [140, oy + 56]]} color={WL} />
      <ContactSym x={180} y={oy + 56} color={WL} />
      <Label x={180} y={oy + 90} size={20}>MCB 16 A</Label>
      <Wire points={[[220, oy + 56], [300, oy + 56]]} color={WL} />
      <rect x={300} y={oy + 30} width={84} height={80} rx={6} fill={GRID} stroke={INK} strokeWidth={3} />
      <Spark x={318} y={oy + 56} r={12} />
      <Label x={342} y={oy + 90} size={20}>โครง</Label>
      {good ? (
        <g>
          <PathGlow points={[[110, oy + 56], [300, oy + 56], [342, oy + 110], [342, oy + 240], [140, oy + 240], [140, oy + 96], [110, oy + 96]]} />
          <PEWire points={[[342, oy + 110], [342, oy + 240], [140, oy + 240], [140, oy + 96], [110, oy + 96]]} width={6} />
          <Label x={240} y={oy + 222} size={20}>PE กลับตู้เมน → PEN</Label>
        </g>
      ) : (
        <g>
          <PEWire points={[[342, oy + 110], [342, oy + 132]]} width={6} />
          <Resistor x={342} y={oy + 172} angle={90} />
          <Label x={358} y={oy + 172} size={20} anchor="start">10 Ω</Label>
          <Wire points={[[342, oy + 212], [342, oy + 214]]} />
          <Ground x={342} y={oy + 214} />
          <line x1={330} y1={oy + 254} x2={90} y2={oy + 254} stroke={MUTED} strokeWidth={2.5} strokeDasharray="7 5" />
          <Label x={210} y={oy + 238} size={20} muted>กลับทางดิน</Label>
        </g>
      )}
      {/* result box */}
      <Callout x={406} y={oy + 26} w={184} h={190} tone={good ? "ok" : "danger"}>
        {good ? (
          <g>
            <Label x={498} y={oy + 52} size={20}>ลูป ≈ 1 Ω</Label>
            <Label x={498} y={oy + 82} size={20} weight={700}>I ≈ 230 A</Label>
            <Label x={498} y={oy + 112} size={20}>&gt; 10 × 16 = 160 A</Label>
            <Label x={498} y={oy + 148} size={20} weight={700} color={OK}>ตัดทันที ✓</Label>
            <Label x={498} y={oy + 180} size={20}>(&lt; 0.1 s)</Label>
          </g>
        ) : (
          <g>
            <Label x={498} y={oy + 52} size={20}>230 ÷ (10 + 5)</Label>
            <Label x={498} y={oy + 82} size={20} weight={700}>I = 15.3 A</Label>
            <Label x={498} y={oy + 112} size={20}>&lt; 16 A ไม่ตัด ✗</Label>
            <Label x={498} y={oy + 148} size={20} weight={700} color={DANGER}>โครง 153 V</Label>
            <Label x={498} y={oy + 180} size={20} color={DANGER}>อันตราย</Label>
          </g>
        )}
      </Callout>
    </g>
  );
}

function F08Compare() {
  return (
    <svg viewBox="0 0 600 580" aria-hidden="true">
      <Label x={300} y={20} size={22} weight={700} color={DANGER}>✗ หลักดินแยกเฉพาะเครื่อง</Label>
      <FaultRow oy={20} good={false} />
      <line x1={10} y1={292} x2={590} y2={292} stroke={GRID} strokeWidth={2} />
      <Label x={300} y={314} size={22} weight={700} color={OK}>✓ PE ต่อกลับบัสบาร์ดินที่ตู้เมน</Label>
      <FaultRow oy={316} good />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F09 — IEC 60617 symbols of protective devices
// ---------------------------------------------------------------------------

function SymCell({ x, y, name, sub, children }: { x: number; y: number; name: string; sub: string; children: ReactNode }) {
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={188} height={198} rx={10} fill={PANEL} stroke={GRID} strokeWidth={2} />
      {children}
      <Label x={x + 100} y={y + 160} size={22} weight={700}>{name}</Label>
      <Label x={x + 100} y={y + 186} size={20} muted>{sub}</Label>
    </g>
  );
}

function RingRelease({ x, y, toX, toY }: { x: number; y: number; toX: number; toY: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={9} ry={20} fill="none" stroke={INK} strokeWidth={2.5} />
      <Wire points={[[x, y + 20], [x, y + 36], [toX, y + 36], [toX, toY]]} width={2} dash="6 4" />
    </g>
  );
}

function F09Symbols() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <SymCell x={0} y={0} name="ฟิวส์" sub="F">
        <FuseSym x={100} y={80} />
      </SymCell>
      <SymCell x={200} y={0} name="เบรกเกอร์ MCB" sub="Q · มี ×">
        <ContactSym x={300} y={80} />
      </SymCell>
      <SymCell x={400} y={0} name="RCCB" sub="ตัดไฟรั่วอย่างเดียว">
        <ContactSym x={520} y={70} kind="sw" />
        <RingRelease x={448} y={70} toX={516} toY={62} />
        <line x1={420} y1={70} x2={480} y2={70} stroke={INK} strokeWidth={3} />
      </SymCell>
      <SymCell x={0} y={210} name="RCBO" sub="MCB + RCD">
        <ContactSym x={120} y={280} />
        <RingRelease x={48} y={280} toX={116} toY={272} />
        <line x1={20} y1={280} x2={80} y2={280} stroke={INK} strokeWidth={3} />
      </SymCell>
      <SymCell x={200} y={210} name="SPD" sub="กันไฟกระชาก">
        <line x1={300} y1={226} x2={300} y2={244} stroke={INK} strokeWidth={3} />
        <rect x={284} y={244} width={32} height={50} fill={BG} stroke={INK} strokeWidth={3} />
        <Wire points={[[274, 300], [290, 286], [310, 252], [326, 240]]} width={2.5} />
        <Label x={334} y={270} size={20} anchor="start">U</Label>
        <line x1={300} y1={294} x2={300} y2={306} stroke={INK} strokeWidth={3} />
        <Ground x={300} y={306} />
      </SymCell>
      <SymCell x={400} y={210} name="ดิน / PE" sub="หลักดิน · สายดิน">
        <line x1={460} y1={236} x2={460} y2={256} stroke={INK} strokeWidth={3} />
        <Ground x={460} y={256} />
        <line x1={540} y1={236} x2={540} y2={256} stroke={INK} strokeWidth={3} />
        <Ground x={540} y={256} kind="pe" />
      </SymCell>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F10 — insulation check of a Class I appliance (unplugged)
// ---------------------------------------------------------------------------

function F10Insulation() {
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      {/* step banner */}
      <rect x={20} y={14} width={560} height={40} rx={8} fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={2} />
      <Label x={300} y={34} size={22} weight={700}>① ถอดปลั๊กออกจากเต้ารับก่อนเสมอ</Label>
      {/* kettle (metal body) */}
      <path d="M 410 140 L 540 140 L 556 300 L 394 300 Z" fill={GRID} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M 540 160 q 40 10 30 70 q -6 30 -22 34" fill="none" stroke={INK} strokeWidth={6} />
      <rect x={420} y={256} width={50} height={26} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={445} y={269} size={16} weight={700}>ON</Label>
      <Label x={475} y={180} size={20}>โครงโลหะ</Label>
      <Label x={475} y={212} size={20} muted>② สวิตช์ ON</Label>
      {/* cord */}
      <Wire d="M 394 280 C 340 300 330 200 290 210" color={MUTED} width={6} />
      {/* plug face (มอก. 166, 3 round pins) */}
      <circle cx={240} cy={200} r={56} fill={PANEL} stroke={INK} strokeWidth={3} />
      <circle cx={240} cy={172} r={8} fill={INK} />
      <circle cx={214} cy={218} r={8} fill={INK} />
      <circle cx={266} cy={218} r={8} fill={INK} />
      <Label x={240} y={150} size={20} weight={700}>E</Label>
      <Label x={170} y={232} size={20} weight={700} color={WL}>L</Label>
      <Label x={310} y={232} size={20} weight={700} color={WN}>N</Label>
      {/* E ↔ body continuity */}
      <path d="M 248 168 C 320 110 380 120 410 160" fill="none" stroke={OK} strokeWidth={2.5} strokeDasharray="6 4" />
      <Label x={330} y={104} size={20} color={OK}>E ↔ โครง &lt; 1 Ω</Label>
      {/* DMM */}
      <rect x={30} y={290} width={150} height={150} rx={12} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={44} y={304} width={122} height={46} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={105} y={328} size={24} weight={700}>OL MΩ</Label>
      <Label x={105} y={378} size={20}>③ ย่าน MΩ</Label>
      <circle cx={70} cy={414} r={8} fill={DANGER} />
      <circle cx={140} cy={414} r={8} fill={INK} />
      {/* probes */}
      <Wire d="M 70 414 C 70 470 200 330 214 226" color={DANGER} width={3} />
      <Wire d="M 140 414 C 160 330 150 200 232 172" color={INK} width={3} />
      {/* verdicts */}
      <Callout x={210} y={330} w={370} h={110} tone="info">
        <Label x={395} y={356} size={20}>วัด L–E และ N–E</Label>
        <Label x={395} y={386} size={20} color={OK} weight={700}>✓ สูงมาก / OL (≥ 1 MΩ) ผ่าน</Label>
        <Label x={395} y={416} size={20} color={DANGER} weight={700}>✗ &lt; 1 MΩ ส่งตรวจ 500 V (ครู)</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F12 — find the faults in an installation (findFault, viewBox 900×520)
// Faults: N–PE bond repeated in sub-board · appliance earth rod · RCCB N bypassed.
// ---------------------------------------------------------------------------

function F12Faults() {
  return (
    <svg viewBox="0 0 900 520" aria-hidden="true">
      <line x1={0} y1={462} x2={900} y2={462} stroke={INK} strokeWidth={2} />
      {/* ---- main board */}
      <rect x={20} y={60} width={320} height={360} rx={8} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={180} y={36} size={26} weight={700}>ตู้เมน</Label>
      <Wire points={[[70, 0], [70, 90]]} color={WL} />
      <Wire points={[[110, 0], [110, 90]]} color={WN} />
      <rect x={46} y={90} width={90} height={50} rx={4} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={91} y={116} size={26}>เมน</Label>
      {/* N bar */}
      <Wire points={[[110, 140], [110, 200]]} color={WN} />
      <line x1={40} y1={200} x2={300} y2={200} stroke={WN} strokeWidth={9} />
      <Label x={150} y={180} size={26} color={WN} weight={700}>N</Label>
      {/* main N–PE bond (correct, one point) */}
      <line x1={46} y1={200} x2={46} y2={380} stroke={INK} strokeWidth={5} />
      <Node x={46} y={200} />
      <Node x={46} y={380} />
      {/* PE bar + main earth rod */}
      <PEWire points={[[40, 380], [320, 380]]} width={9} />
      <Label x={250} y={404} size={26} color={OK} weight={700}>PE</Label>
      <PEWire points={[[150, 380], [150, 466]]} width={6} />
      <rect x={144} y={466} width={12} height={50} fill={COPPER} stroke={INK} strokeWidth={2} />
      <Label x={166} y={492} size={26} anchor="start">หลักดิน</Label>
      {/* RCCB: L from main switch, N from N bar */}
      <Wire points={[[70, 140], [70, 165], [225, 165], [225, 236]]} color={WL} />
      <Wire points={[[275, 200], [275, 236]]} color={WN} />
      <Node x={275} y={200} r={4} />
      <rect x={200} y={236} width={100} height={64} rx={4} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={250} y={258} size={22}>RCCB</Label>
      <Label x={250} y={284} size={22}>30 mA</Label>
      {/* RCCB outputs: L out used, N out left empty */}
      <Wire points={[[225, 300], [225, 320], [400, 320]]} color={WL} />
      <Wire points={[[275, 300], [275, 312]]} color={WN} />
      <circle cx={275} cy={318} r={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      {/* sub-board N taken straight from the N bar (bypasses the RCCB) */}
      <Wire points={[[300, 200], [360, 200], [360, 340], [400, 340]]} color={WN} />
      {/* PE to sub-board */}
      <PEWire points={[[320, 380], [400, 380]]} width={5} />
      {/* ---- sub-board */}
      <rect x={400} y={230} width={200} height={180} rx={8} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={500} y={208} size={26} weight={700}>แผงย่อย</Label>
      <Wire points={[[400, 320], [470, 320], [470, 262], [600, 262]]} color={WL} />
      <line x1={410} y1={340} x2={590} y2={340} stroke={WN} strokeWidth={7} />
      <PEWire points={[[400, 380], [590, 380]]} width={7} />
      {/* repeated N–PE bond in the sub-board */}
      <line x1={540} y1={340} x2={540} y2={380} stroke={INK} strokeWidth={5} />
      <Node x={540} y={340} />
      <Node x={540} y={380} />
      {/* circuit to socket */}
      <Wire points={[[600, 262], [640, 262]]} color={WL} />
      <Wire points={[[590, 340], [615, 340], [615, 282], [640, 282]]} color={WN} />
      <PEWire points={[[590, 380], [628, 380], [628, 302], [640, 302]]} width={5} />
      <rect x={640} y={240} width={60} height={84} rx={8} fill={BG} stroke={INK} strokeWidth={3} />
      <circle cx={670} cy={262} r={5} fill={INK} />
      <circle cx={658} cy={292} r={5} fill={INK} />
      <circle cx={682} cy={292} r={5} fill={INK} />
      <Label x={670} y={348} size={26}>เต้ารับ</Label>
      {/* fridge */}
      <Wire points={[[700, 282], [730, 282]]} color={MUTED} width={6} />
      <rect x={730} y={110} width={140} height={250} rx={10} fill={GRID} stroke={INK} strokeWidth={3} />
      <line x1={730} y1={190} x2={870} y2={190} stroke={INK} strokeWidth={2} />
      <Label x={800} y={150} size={26} weight={700}>ตู้เย็น</Label>
      {/* fridge's own earth rod */}
      <PEWire points={[[840, 360], [840, 466]]} width={6} />
      <rect x={834} y={466} width={12} height={50} fill={COPPER} stroke={INK} strokeWidth={2} />
      <Label x={824} y={492} size={26} anchor="end">หลักดินตู้เย็น</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F15 — training-board wiring (de-energised build): main 2P → RCBO → socket,
// MCB → switch → lamp; N bar, PE bar, removable N–PE link (viewBox 900×500)
// ---------------------------------------------------------------------------

function MechLink({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke={INK} strokeWidth={2} strokeDasharray="6 4" />;
}

function F15Board() {
  const yL = 90;
  const yN = 160;
  const yB = 270; // lighting branch
  const yNB = 350; // N bar
  const yPE = 430; // PE bar
  return (
    <svg viewBox="0 0 900 500" aria-hidden="true">
      {/* supply terminals (connected by the teacher only) */}
      <rect x={6} y={56} width={52} height={400} rx={6} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <Term x={44} y={yL} />
      <Term x={44} y={yN} />
      <Term x={44} y={yPE} />
      <Label x={26} y={yL} size={26} color={WL} weight={700}>L</Label>
      <Label x={26} y={yN} size={26} color={WN} weight={700}>N</Label>
      <Label x={26} y={yPE - 34} size={22} weight={700}>PE</Label>
      {/* Q1 main 2P */}
      <Wire points={[[50, yL], [110, yL]]} color={WL} />
      <Wire points={[[50, yN], [110, yN]]} color={WN} />
      <ContactSym x={150} y={yL} color={WL} />
      <ContactSym x={150} y={yN} color={WN} />
      <MechLink x={158} y1={yL - 10} y2={yN - 12} />
      <Label x={150} y={22} size={26} weight={700}>Q1 เมน 2P</Label>
      <Label x={150} y={52} size={26}>32 A</Label>
      {/* L and N after main */}
      <Wire points={[[190, yL], [330, yL]]} color={WL} />
      <Wire points={[[190, yN], [330, yN]]} color={WN} />
      <Node x={240} y={yL} />
      <Node x={270} y={yN} />
      {/* Q2 RCBO (socket circuit): L and N both pass through it */}
      <ellipse cx={330} cy={(yL + yN) / 2} rx={12} ry={52} fill="none" stroke={INK} strokeWidth={2.5} />
      <ContactSym x={400} y={yL} color={WL} />
      <ContactSym x={400} y={yN} kind="sw" color={WN} />
      <MechLink x={408} y1={yL - 10} y2={yN - 12} />
      <Wire points={[[342, (yL + yN) / 2], [380, (yL + yN) / 2]]} width={2} dash="6 4" />
      <Label x={400} y={22} size={26} weight={700}>Q2 RCBO</Label>
      <Label x={400} y={52} size={26}>16 A 30 mA</Label>
      <Wire points={[[330, yL], [360, yL]]} color={WL} />
      <Wire points={[[330, yN], [360, yN]]} color={WN} />
      <Wire points={[[440, yL], [770, yL], [770, 110]]} color={WL} />
      <Wire points={[[440, yN], [770, yN], [770, 150]]} color={WN} />
      {/* socket */}
      <rect x={744} y={100} width={130} height={130} rx={10} fill={BG} stroke={INK} strokeWidth={3} />
      <Label x={810} y={196} size={26}>เต้ารับ</Label>
      <PEWire points={[[850, yPE], [850, 160]]} width={6} />
      {/* Q3 MCB lighting branch */}
      <Wire points={[[240, yL], [240, yB], [360, yB]]} color={WL} />
      <ContactSym x={400} y={yB} color={WL} />
      <Label x={400} y={yB + 40} size={26} weight={700}>Q3 MCB B10</Label>
      <Wire points={[[440, yB], [500, yB]]} color={WL} />
      {/* switch */}
      <line x1={500} y1={yB} x2={536} y2={yB - 22} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <circle cx={500} cy={yB} r={4.5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={540} cy={yB} r={4.5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={520} y={yB + 40} size={26}>S1</Label>
      <Wire points={[[545, yB], [600, yB]]} color={WL} />
      {/* lamp */}
      <circle cx={620} cy={yB} r={20} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={606} y1={yB - 14} x2={634} y2={yB + 14} stroke={INK} strokeWidth={2.5} />
      <line x1={606} y1={yB + 14} x2={634} y2={yB - 14} stroke={INK} strokeWidth={2.5} />
      <Label x={620} y={yB - 40} size={26}>หลอด</Label>
      <Wire points={[[640, yB], [680, yB], [680, yNB]]} color={WN} />
      <PEWire points={[[620, yPE], [620, yB + 22]]} width={5} />
      {/* N bar (fed from main N) */}
      <Wire points={[[270, yN], [270, yNB]]} color={WN} />
      <line x1={250} y1={yNB} x2={700} y2={yNB} stroke={WN} strokeWidth={9} />
      <Label x={530} y={yNB + 34} size={26} color={WN} weight={700}>บัสบาร์ N</Label>
      {/* PE bar */}
      <PEWire points={[[50, yPE], [870, yPE]]} width={9} />
      <Label x={470} y={yPE + 36} size={26} color={OK} weight={700}>บัสบาร์ PE</Label>
      {/* removable N–PE link */}
      <line x1={300} y1={yNB} x2={300} y2={yPE} stroke={INK} strokeWidth={5} strokeDasharray="10 6" />
      <Label x={312} y={yNB + 40} size={26} anchor="start">B ลิงก์ N–PE</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W06-F14 — surge protective device: waveform and connection
// ---------------------------------------------------------------------------

function F14Spd() {
  const sine = Array.from({ length: 121 }, (_, i) => {
    const x = 60 + i * 4;
    const y = 150 - 34 * Math.sin((i / 120) * 4 * Math.PI);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <line x1={50} y1={150} x2={560} y2={150} stroke={GRID} strokeWidth={1.5} />
      <path d={`M ${sine.join(" L ")}`} fill="none" stroke={INK} strokeWidth={2.5} />
      {/* spike without SPD (dashed) and clipped with SPD */}
      <path d="M 196 116 L 204 30 L 214 150" fill="none" stroke={DANGER} strokeWidth={3} strokeDasharray="6 4" />
      <path d="M 196 116 L 200 84 L 210 84 L 214 116" fill="none" stroke={OK} strokeWidth={4} />
      <Label x={226} y={36} size={20} color={DANGER} anchor="start">ไม่มี SPD: หลาย kV</Label>
      <Label x={226} y={74} size={20} color={OK} anchor="start">มี SPD: จำกัดไว้ที่ Up</Label>
      <Label x={300} y={212} size={20} muted>ไฟ 230 V 50 Hz (ภาพไม่ตามสเกล)</Label>
      {/* connection */}
      <line x1={40} y1={262} x2={250} y2={262} stroke={WL} strokeWidth={6} />
      <line x1={40} y1={302} x2={250} y2={302} stroke={WN} strokeWidth={6} />
      <Label x={30} y={262} size={20} color={WL} anchor="end">L</Label>
      <Label x={30} y={302} size={20} color={WN} anchor="end">N</Label>
      <Wire points={[[220, 262], [290, 262]]} color={WL} />
      <Wire points={[[230, 302], [290, 302]]} color={WN} />
      <Node x={220} y={262} />
      <Node x={230} y={302} />
      <rect x={290} y={244} width={90} height={76} rx={6} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={335} y={270} size={20} weight={700}>SPD</Label>
      <Label x={335} y={296} size={20}>Uc 275 V</Label>
      <PEWire points={[[380, 300], [430, 300], [430, 360], [540, 360]]} width={6} />
      <Label x={490} y={340} size={20} color={OK}>บัสบาร์ PE</Label>
      <Arrow from={[440, 280]} to={[440, 340]} color={CUR} />
      <Label x={590} y={232} size={20} anchor="end">กระแสกระชากลงดิน</Label>
      <Label x={300} y={400} size={20}>สายต่อ L/N → SPD → PE สั้นที่สุด (รวม &lt; 0.5 m)</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W06-F01": F01Fuse,
  "W06-F02": F02Thermal,
  "W06-F03": F03Magnetic,
  "W06-F04": F04Curve,
  "W06-F05": F05Rcd,
  "W06-F06": F06TNCS,
  "W06-F07": F07Board,
  "W06-F08": F08Compare,
  "W06-F09": F09Symbols,
  "W06-F10": F10Insulation,
  "W06-F11": F11Blade,
  "W06-F12": F12Faults,
  "W06-F13": F13Hazards,
  "W06-F14": F14Spd,
  "W06-F15": F15Board,
};
export default figures;
