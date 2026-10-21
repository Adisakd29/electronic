import type { FigureMap } from "@/content/types";
import type { ReactNode } from "react";
import { Label, Wire, Node, Battery, DCSource, Lamp, SwitchSym, Meter, Diode, Resistor, Arrow, Callout } from "./kit";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";
const MUTED = "var(--fig-muted)";
const IRON = "var(--fig-grid)";
const COPPER = "var(--fig-copper)";
const COPPER_SOFT = "var(--fig-copper-soft)";

type Pt = [number, number];

// ---------------------------------------------------------------------------
// Shared inline primitives (not in kit)
// ---------------------------------------------------------------------------

/** IEC relay coil: rectangle. Vertical (A1 top, A2 bottom) when `vertical`. */
function Coil({ x, y, vertical = true, label, labelDx = 40 }: { x: number; y: number; vertical?: boolean; label?: ReactNode; labelDx?: number }) {
  const w = vertical ? 50 : 28;
  const h = vertical ? 28 : 50;
  return (
    <g>
      {vertical ? (
        <g>
          <line x1={x} y1={y - 34} x2={x} y2={y - h / 2} stroke={INK} strokeWidth={3} />
          <line x1={x} y1={y + h / 2} x2={x} y2={y + 34} stroke={INK} strokeWidth={3} />
        </g>
      ) : null}
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={BG} stroke={INK} strokeWidth={3} />
      {label ? <Label x={x + labelDx} y={y} anchor="start">{label}</Label> : null}
    </g>
  );
}

/** Vertical NO contact; terminals at (x, y-30) and (x, y+30). Returns blade mid-point for linkage. */
function NOContact({ x, y, closed = false }: { x: number; y: number; closed?: boolean }) {
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round">
      <line x1={x} y1={y - 30} x2={x} y2={y - 10} />
      <line x1={x} y1={y + 30} x2={x} y2={y + 10} />
      {closed ? <line x1={x} y1={y + 10} x2={x - 3} y2={y - 12} /> : <line x1={x} y1={y + 10} x2={x - 16} y2={y - 14} />}
    </g>
  );
}

/** Vertical NC contact (stub to the right at top). */
function NCContact({ x, y, open = false }: { x: number; y: number; open?: boolean }) {
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round">
      <line x1={x} y1={y - 30} x2={x} y2={y - 10} />
      <line x1={x} y1={y - 10} x2={x + 14} y2={y - 10} />
      <line x1={x} y1={y + 30} x2={x} y2={y + 10} />
      {open ? <line x1={x} y1={y + 10} x2={x + 22} y2={y - 2} /> : <line x1={x} y1={y + 10} x2={x + 18} y2={y - 14} />}
    </g>
  );
}

/** Vertical changeover (SPDT): COM bottom (x, y+30), NC top-left (x-18, y-30), NO top-right (x+18, y-30). */
function COContact({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round">
      <line x1={x} y1={y + 30} x2={x} y2={y + 10} />
      <line x1={x - 18} y1={y - 30} x2={x - 18} y2={y - 10} />
      <line x1={x - 18} y1={y - 10} x2={x - 4} y2={y - 10} />
      <line x1={x + 18} y1={y - 30} x2={x + 18} y2={y - 8} />
      <line x1={x} y1={y + 10} x2={x - 14} y2={y - 16} />
    </g>
  );
}

/** Push-button actuator drawn to the left of a vertical contact blade. */
function PushActuator({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={INK}>
      <line x1={x} y1={y} x2={x - 30} y2={y} strokeWidth={2} strokeDasharray="5 4" />
      <line x1={x - 30} y1={y - 11} x2={x - 30} y2={y + 11} strokeWidth={3} />
      <line x1={x - 30} y1={y - 11} x2={x - 24} y2={y - 11} strokeWidth={3} />
      <line x1={x - 30} y1={y + 11} x2={x - 24} y2={y + 11} strokeWidth={3} />
    </g>
  );
}

function Link({ from, to }: { from: Pt; to: Pt }) {
  return <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={INK} strokeWidth={2} strokeDasharray="7 5" />;
}

function Zigzag({ from, to, n = 7, amp = 10 }: { from: Pt; to: Pt; n?: number; amp?: number }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const pts: Pt[] = [[x1, y1]];
  const lead = 8;
  pts.push([x1 + ux * lead, y1 + uy * lead]);
  const body = len - 2 * lead;
  for (let i = 0; i < n; i++) {
    const t = lead + (body * (i + 0.5)) / n;
    const s = i % 2 === 0 ? amp : -amp;
    pts.push([x1 + ux * t + px * s, y1 + uy * t + py * s]);
  }
  pts.push([x2 - ux * lead, y2 - uy * lead]);
  pts.push([x2, y2]);
  return <Wire points={pts} width={2.5} />;
}

// ---------------------------------------------------------------------------
// W11-F01 / W11-F11  Armature relay cross-section (OFF / ON)
// ---------------------------------------------------------------------------

const HINGE: Pt = [100, 121];
const THETA_ON = 7.4; // degrees, armature rotation when energised
function rotP(p: Pt, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - HINGE[0];
  const dy = p[1] - HINGE[1];
  return [HINGE[0] + dx * Math.cos(a) - dy * Math.sin(a), HINGE[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}
const NO_TOP = rotP([410, 136], THETA_ON); // where the moving contact lands when ON

function RelayCut({ on }: { on: boolean }) {
  const th = on ? THETA_ON : 0;
  const springEnd = rotP([330, 114], th);
  const braidStart = rotP([370, 128], th);
  const noY = NO_TOP[1];
  const noX = NO_TOP[0];
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {on ? (
        <style>{`.w11f11-flux{animation:w11f11 2.4s linear infinite}@keyframes w11f11{to{stroke-dashoffset:-48}}`}</style>
      ) : null}
      {/* state title */}
      <Label x={590} y={24} anchor="end" weight={700} color={on ? "var(--fig-ok)" : MUTED}>
        {on ? "จ่ายไฟขดลวด (ON)" : "ไม่จ่ายไฟขดลวด (OFF)"}
      </Label>
      {/* base */}
      <rect x={60} y={334} width={500} height={14} rx={3} fill="var(--fig-panel)" stroke={INK} strokeWidth={2} />
      {/* yoke (L-shaped iron frame) */}
      <path d="M 90 112 L 110 112 L 110 314 L 270 314 L 270 334 L 90 334 Z" fill={IRON} stroke={INK} strokeWidth={2.5} />
      {/* core */}
      <rect x={230} y={150} width={40} height={164} fill={IRON} stroke={INK} strokeWidth={2.5} />
      {/* coil halves (cross-section) */}
      {[200, 270].map((cx) => (
        <g key={cx}>
          <rect x={cx} y={165} width={30} height={140} fill={COPPER_SOFT} stroke={COPPER} strokeWidth={2.5} />
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={cx + 3} y1={175 + i * 12} x2={cx + 27} y2={175 + i * 12} stroke={COPPER} strokeWidth={1.5} />
          ))}
        </g>
      ))}
      {/* magnetic flux loop when ON */}
      {on ? (
        <path
          className="w11f11-flux"
          d="M 250 296 L 250 140 L 112 140 L 100 140 L 100 324 L 250 324 Z"
          fill="none"
          stroke="var(--fig-field)"
          strokeWidth={2.5}
          strokeDasharray="10 6"
        />
      ) : null}
      {/* spring anchor + spring */}
      <rect x={305} y={38} width={50} height={12} fill={IRON} stroke={INK} strokeWidth={2} />
      <Zigzag from={[330, 50]} to={springEnd} n={on ? 9 : 7} />
      {/* NC fixed contact (top) */}
      <Wire points={[[400, 94], [530, 94], [530, 334]]} width={5} color={COPPER} />
      <rect x={400} y={97} width={20} height={9} fill={COPPER} stroke={INK} strokeWidth={1.5} />
      {/* NO fixed contact (bottom) */}
      <Wire points={[[noX - 12, noY + 12], [460, noY + 12], [460, 334]]} width={5} color={COPPER} />
      <rect x={noX - 12} y={noY} width={20} height={9} fill={COPPER} stroke={INK} strokeWidth={1.5} />
      {/* armature (rotates about hinge) */}
      <g transform={th ? `rotate(${th} ${HINGE[0]} ${HINGE[1]})` : undefined}>
        <rect x={96} y={114} width={300} height={14} rx={3} fill={IRON} stroke={INK} strokeWidth={2.5} />
        {/* insulated contact spring carrying moving contact */}
        <rect x={380} y={115} width={40} height={12} fill={COPPER_SOFT} stroke={INK} strokeWidth={1.5} />
        <rect x={400} y={106} width={20} height={9} fill={COPPER} stroke={INK} strokeWidth={1.5} />
        <rect x={400} y={127} width={20} height={9} fill={COPPER} stroke={INK} strokeWidth={1.5} />
      </g>
      <circle cx={HINGE[0]} cy={HINGE[1]} r={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      {/* COM flexible lead */}
      <path
        d={`M ${braidStart[0]} ${braidStart[1]} C ${braidStart[0] + 30} ${braidStart[1] + 60}, 360 260, 380 334`}
        fill="none"
        stroke={COPPER}
        strokeWidth={3}
        strokeDasharray="3 3"
      />
      {/* coil leads to pins */}
      <Wire points={[[285, 305], [290, 334]]} width={2} color={COPPER} />
      <Wire points={[[300, 200], [330, 200], [330, 334]]} width={2} color={COPPER} />
      {/* pins */}
      {[290, 330, 380, 460, 530].map((px) => (
        <line key={px} x1={px} y1={348} x2={px} y2={372} stroke={INK} strokeWidth={4} />
      ))}
      <Label x={290} y={392} size={20}>A2</Label>
      <Label x={330} y={392} size={20}>A1</Label>
      <Label x={380} y={392} size={20} weight={700}>COM</Label>
      <Label x={460} y={392} size={20} weight={700}>NO</Label>
      <Label x={530} y={392} size={20} weight={700}>NC</Label>
      {/* part labels */}
      <Label x={190} y={78} size={22}>อาร์เมเจอร์</Label>
      <line x1={190} y1={92} x2={190} y2={112} stroke={MUTED} strokeWidth={1.5} />
      <Label x={356} y={70} size={22} anchor="start">สปริง</Label>
      <line x1={352} y1={74} x2={338} y2={84} stroke={MUTED} strokeWidth={1.5} />
      <Label x={155} y={200} size={20}>แกนเหล็ก</Label>
      <line x1={190} y1={212} x2={240} y2={230} stroke={MUTED} strokeWidth={1.5} />
      <Label x={155} y={270} size={20}>ขดลวด</Label>
      <line x1={180} y1={270} x2={204} y2={270} stroke={MUTED} strokeWidth={1.5} />
      {/* contact state text */}
      <Label x={590} y={56} size={20} anchor="end" weight={700} color={on ? "var(--fig-ok)" : "var(--fig-accent)"}>
        {on ? "COM–NO ต่อ" : "COM–NC ต่อ"}
      </Label>
      {on ? (
        <Label x={160} y={374} size={20} color="var(--fig-field)">ฟลักซ์แม่เหล็ก</Label>
      ) : null}
    </svg>
  );
}

const RelayOff = () => <RelayCut on={false} />;
const RelayOn = () => <RelayCut on />;

// ---------------------------------------------------------------------------
// W11-F12  Control circuit vs load circuit (ON state)
// ---------------------------------------------------------------------------

function ControlVsLoad() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* region boxes */}
      <rect x={14} y={40} width={260} height={310} rx={12} fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray="6 5" />
      <rect x={296} y={40} width={290} height={310} rx={12} fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray="6 5" />
      <Label x={144} y={378} size={20} weight={700}>วงจรควบคุม (ขดลวด)</Label>
      <Label x={441} y={378} size={20} weight={700}>วงจรโหลด (หน้าสัมผัส)</Label>
      {/* control loop */}
      <Battery x={50} y={210} angle={90} />
      <Label x={80} y={210} size={20} anchor="start">12 V</Label>
      <Wire points={[[50, 180], [50, 100], [90, 100]]} />
      <SwitchSym x={130} y={100} closed label="S1 (ON)" />
      <Wire points={[[170, 100], [215, 100], [215, 176]]} />
      <Coil x={215} y={210} />
      <Label x={203} y={174} size={20} anchor="end" muted>A1</Label>
      <Label x={203} y={248} size={20} anchor="end" muted>A2</Label>
      <Label x={176} y={210} size={22} weight={700} anchor="end">K1</Label>
      <Wire points={[[215, 244], [215, 310], [50, 310], [50, 240]]} />
      <Arrow from={[34, 150]} to={[34, 118]} />
      {/* mechanical link */}
      <Link from={[240, 210]} to={[450, 176]} />
      {/* load loop: battery on the top wire */}
      <Battery x={500} y={90} />
      <Label x={548} y={62} size={20} anchor="start">12 V</Label>
      <Wire points={[[470, 90], [440, 90], [440, 145]]} />
      <Wire points={[[530, 90], [560, 90], [560, 320], [476, 320]]} />
      <circle cx={440} cy={150} r={5} fill={BG} stroke={INK} strokeWidth={2.5} />
      {/* blade touching NO (energised) */}
      <line x1={440} y1={150} x2={472} y2={198} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <circle cx={404} cy={202} r={5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={476} cy={202} r={5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={452} y={136} size={20} anchor="start" weight={700}>COM</Label>
      <Label x={392} y={186} size={20} anchor="end" weight={700}>NC</Label>
      <Label x={490} y={186} size={20} anchor="start" weight={700}>NO</Label>
      <Wire points={[[404, 207], [404, 240]]} />
      <Wire points={[[476, 207], [476, 240]]} />
      <Lamp x={404} y={270} angle={90} label="H2 ดับ" labelSide="b" />
      <Lamp x={476} y={270} angle={90} on label="H1 ติด" labelSide="a" />
      <Wire points={[[404, 300], [404, 320], [476, 320]]} />
      <Wire points={[[476, 300], [476, 320]]} />
      <Node x={476} y={320} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F02  Contact forms table with IEC symbols
// ---------------------------------------------------------------------------

function ContactForms() {
  const rows = [
    { name: "SPST-NO (1A)", sub: "ปกติเปิด", pins: "2 ขา", total: "รวม 4 ขา", kind: "no" },
    { name: "SPST-NC (1B)", sub: "ปกติปิด", pins: "2 ขา", total: "รวม 4 ขา", kind: "nc" },
    { name: "SPDT (1C)", sub: "COM / NO / NC", pins: "3 ขา", total: "รวม 5 ขา", kind: "co" },
    { name: "DPDT (2C)", sub: "2 ชุดพร้อมกัน", pins: "6 ขา", total: "รวม 8 ขา", kind: "dp" },
  ];
  const top = 56;
  const rh = 95;
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      <rect x={6} y={6} width={588} height={top - 6} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={1.5} />
      <Label x={300} y={455} size={20} muted>“รวม” = ขาหน้าสัมผัส + ขาขดลวด A1, A2</Label>
      <Label x={110} y={31} size={20} weight={700}>รูปแบบ</Label>
      <Label x={350} y={31} size={20} weight={700}>สัญลักษณ์ IEC</Label>
      <Label x={535} y={31} size={20} weight={700}>จำนวนขา</Label>
      {rows.map((r, i) => {
        const y0 = top + i * rh;
        const yc = y0 + rh / 2;
        const cx = 330;
        return (
          <g key={r.name}>
            <rect x={6} y={y0} width={588} height={rh} fill="none" stroke={MUTED} strokeWidth={1.5} />
            <Label x={18} y={yc - 16} size={22} weight={700} anchor="start">{r.name}</Label>
            <Label x={18} y={yc + 18} size={20} anchor="start" muted>{r.sub}</Label>
            {/* coil */}
            <line x1={262} y1={yc - 34} x2={262} y2={yc - 12} stroke={INK} strokeWidth={3} />
            <line x1={262} y1={yc + 12} x2={262} y2={yc + 34} stroke={INK} strokeWidth={3} />
            <rect x={242} y={yc - 12} width={40} height={24} fill={BG} stroke={INK} strokeWidth={3} />
            {r.kind === "no" ? (
              <g>
                <NOContact x={cx + 40} y={yc} />
                <Link from={[282, yc]} to={[cx + 32, yc - 2]} />
              </g>
            ) : r.kind === "nc" ? (
              <g>
                <NCContact x={cx + 30} y={yc} />
                <Link from={[282, yc]} to={[cx + 39, yc - 2]} />
              </g>
            ) : r.kind === "co" ? (
              <g>
                <COContact x={cx + 40} y={yc} />
                <Link from={[282, yc]} to={[cx + 33, yc - 3]} />
              </g>
            ) : (
              <g>
                <COContact x={cx + 20} y={yc} />
                <COContact x={cx + 100} y={yc} />
                <Link from={[282, yc]} to={[cx + 93, yc - 3]} />
              </g>
            )}
            <Label x={535} y={yc - 14} size={22} weight={700}>{r.pins}</Label>
            <Label x={535} y={yc + 16} size={20} muted>{r.total}</Label>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F03  Pinouts: PCB 5-pin relay (bottom view) and 8-pin DPDT socket
// ---------------------------------------------------------------------------

function PinBox({ x, y, text, coil = false }: { x: number; y: number; text: string; coil?: boolean }) {
  return (
    <g>
      <rect x={x - 32} y={y - 18} width={64} height={36} rx={6} fill={coil ? COPPER_SOFT : BG} stroke={coil ? COPPER : INK} strokeWidth={2.5} />
      <Label x={x} y={y + 1} size={20} weight={700}>{text}</Label>
    </g>
  );
}

function Pinouts() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Label x={160} y={30} size={20} weight={700}>รีเลย์ PCB 5 ขา (มองด้านล่าง)</Label>
      <Label x={450} y={30} size={20} weight={700}>ซ็อกเก็ต 8 ขา (DPDT)</Label>
      <rect x={40} y={60} width={240} height={280} rx={10} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <PinBox x={90} y={110} text="A1" coil />
      <PinBox x={90} y={200} text="COM" />
      <PinBox x={90} y={290} text="A2" coil />
      <PinBox x={230} y={110} text="NC" />
      <PinBox x={230} y={290} text="NO" />
      <rect x={315} y={60} width={270} height={280} rx={10} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <PinBox x={360} y={110} text="NC1" />
      <PinBox x={360} y={200} text="COM1" />
      <PinBox x={360} y={290} text="NO1" />
      <PinBox x={450} y={150} text="A1" coil />
      <PinBox x={450} y={250} text="A2" coil />
      <PinBox x={540} y={110} text="NC2" />
      <PinBox x={540} y={200} text="COM2" />
      <PinBox x={540} y={290} text="NO2" />
      <Label x={300} y={372} size={20} muted>ตำแหน่งขาต่างกันตามรุ่น — ดูผังบนตัวรีเลย์/ซ็อกเก็ตเสมอ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F04  Break-before-make vs make-before-break timing
// ---------------------------------------------------------------------------

function Timing() {
  const x0 = 150;
  const x1 = 580;
  const tE = 230;
  const ta = 320;
  const tb = 400;
  const panel = (oy: number, title: string, bbm: boolean) => {
    const ncHi = oy + 50;
    const ncLo = oy + 80;
    const noHi = oy + 120;
    const noLo = oy + 150;
    const ncOff = bbm ? ta : tb;
    const noOn = bbm ? tb : ta;
    return (
      <g>
        <Label x={10} y={oy + 14} size={22} weight={700} anchor="start">{title}</Label>
        <rect
          x={ta}
          y={oy + 38}
          width={tb - ta}
          height={124}
          fill={bbm ? "var(--fig-accent-soft)" : "var(--fig-danger-soft)"}
          stroke="none"
        />
        <Label x={10} y={oy + 65} size={20} anchor="start">COM–NC</Label>
        <Label x={10} y={oy + 135} size={20} anchor="start">COM–NO</Label>
        <Wire points={[[x0, ncHi], [ncOff, ncHi], [ncOff, ncLo], [x1, ncLo]]} color="var(--fig-accent)" />
        <Wire points={[[x0, noLo], [noOn, noLo], [noOn, noHi], [x1, noHi]]} color="var(--fig-ok)" />
        <Label x={(ta + tb) / 2} y={oy + 178} size={20} weight={700} color={bbm ? "var(--fig-accent)" : "var(--fig-danger)"}>
          {bbm ? "ไม่ต่อทั้งคู่ชั่วครู่" : "ต่อพร้อมกันชั่วครู่"}
        </Label>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      {panel(10, "ตัดก่อนต่อ (Break-before-Make)", true)}
      {panel(205, "ต่อก่อนตัด (Make-before-Break)", false)}
      <line x1={tE} y1={40} x2={tE} y2={400} stroke={MUTED} strokeWidth={2} strokeDasharray="6 5" />
      <Label x={tE} y={418} size={20} muted>เริ่มจ่ายไฟขดลวด</Label>
      <Arrow from={[430, 418]} to={[575, 418]} color={MUTED} width={2} />
      <Label x={500} y={398} size={20} muted>เวลา</Label>
      <Label x={10} y={454} size={20} muted anchor="start">เส้นสูง = หน้าสัมผัสต่อ · เส้นต่ำ = แยก</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F05  Reed switch and reed relay
// ---------------------------------------------------------------------------

function ReedTube({ yc, closed }: { yc: number; closed: boolean }) {
  const left: Pt[] = closed ? [[150, yc - 7], [300, yc - 7], [362, yc - 2]] : [[150, yc - 7], [362, yc - 7]];
  const right: Pt[] = closed ? [[530, yc + 7], [380, yc + 7], [318, yc + 2]] : [[530, yc + 7], [318, yc + 7]];
  return (
    <g>
      <rect x={190} y={yc - 26} width={300} height={52} rx={26} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2} />
      <Wire points={left} width={5} color={MUTED} />
      <Wire points={right} width={5} color={MUTED} />
    </g>
  );
}

function Reed() {
  return (
    <svg viewBox="0 0 600 450" aria-hidden="true">
      <Label x={10} y={22} size={22} weight={700} anchor="start">รีดสวิตช์ (reed switch) — สวิตช์ทำงานด้วยแม่เหล็ก</Label>
      <ReedTube yc={78} closed={false} />
      <Label x={10} y={68} size={20} anchor="start" weight={700}>ไม่มีแม่เหล็ก</Label>
      <Label x={10} y={92} size={20} anchor="start" muted>แยกกัน (OFF)</Label>
      <Label x={340} y={126} size={20} muted>แผ่นรีดเหล็ก-นิกเกิล 2 แผ่นในหลอดแก้ว</Label>
      <ReedTube yc={178} closed />
      <Label x={10} y={168} size={20} anchor="start" weight={700}>แม่เหล็กใกล้</Label>
      <Label x={10} y={192} size={20} anchor="start" weight={700} color="var(--fig-ok)">ดูดติด (ON) ✓</Label>
      <rect x={260} y={214} width={80} height={30} fill="var(--fig-danger-soft)" stroke={INK} strokeWidth={2.5} />
      <rect x={340} y={214} width={80} height={30} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
      <Label x={300} y={230} size={22} weight={700}>N</Label>
      <Label x={380} y={230} size={22} weight={700}>S</Label>
      <Label x={440} y={230} size={20} anchor="start" muted>แม่เหล็กถาวร</Label>
      <line x1={10} y1={266} x2={590} y2={266} stroke={MUTED} strokeWidth={1.5} strokeDasharray="6 5" />
      <Label x={10} y={292} size={22} weight={700} anchor="start">รีดรีเลย์ (reed relay) = รีดสวิตช์ + ขดลวด</Label>
      <ReedTube yc={366} closed={false} />
      {Array.from({ length: 9 }, (_, i) => {
        const cx = 222 + i * 29.5;
        return <ellipse key={i} cx={cx} cy={366} rx={9} ry={40} fill="none" stroke={COPPER} strokeWidth={3} />;
      })}
      <Wire points={[[213, 406], [213, 428], [170, 428]]} width={2.5} color={COPPER} />
      <Wire points={[[467, 406], [467, 428], [510, 428]]} width={2.5} color={COPPER} />
      <Label x={160} y={428} size={20} anchor="end">A1</Label>
      <Label x={520} y={428} size={20} anchor="start">A2</Label>
      <Label x={10} y={340} size={20} anchor="start" color={COPPER} weight={700}>ขดลวด</Label>
      <Label x={10} y={364} size={20} anchor="start" muted>สร้างสนาม</Label>
      <Label x={10} y={388} size={20} anchor="start" muted>แทนแม่เหล็ก</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F06  Solid-state relay block diagram
// ---------------------------------------------------------------------------

function SSR() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <rect x={100} y={40} width={390} height={230} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={295} y={64} size={20} weight={700}>โซลิดสเตตรีเลย์ (SSR)</Label>
      {/* input terminals */}
      <circle cx={60} cy={120} r={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={60} cy={220} r={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={36} y={120} size={22} weight={700} color="var(--fig-plus)">+</Label>
      <Label x={36} y={220} size={22} weight={700}>−</Label>
      <Label x={60} y={256} size={20}>อินพุต</Label>
      <Wire points={[[68, 120], [190, 120], [190, 140]]} />
      <Diode x={190} y={170} angle={90} kind="led" />
      <Wire points={[[190, 200], [190, 220], [68, 220]]} />
      <Label x={150} y={170} size={20} anchor="end">LED</Label>
      {/* light arrows */}
      <Arrow from={[214, 160]} to={[262, 160]} color="var(--fig-warn)" width={2.5} />
      <Arrow from={[214, 182]} to={[262, 182]} color="var(--fig-warn)" width={2.5} />
      {/* isolation barrier */}
      <line x1={275} y1={84} x2={275} y2={258} stroke={INK} strokeWidth={2} strokeDasharray="8 6" />
      {/* output switch */}
      <rect x={292} y={128} width={168} height={84} rx={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={376} y={156} size={20} weight={700}>TRIAC/SCR (AC)</Label>
      <Label x={376} y={186} size={20} weight={700}>MOSFET (DC)</Label>
      <Wire points={[[376, 128], [376, 110], [530, 110]]} />
      <Wire points={[[376, 212], [376, 230], [530, 230]]} />
      <circle cx={538} cy={110} r={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={538} cy={230} r={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={540} y={170} size={20}>เอาต์พุต</Label>
      <Label x={295} y={292} size={20} weight={700}>แยกทางไฟฟ้าด้วยแสง (opto-isolation)</Label>
      <Callout x={20} y={312} w={560} h={78} tone="warn">
        <Label x={300} y={336} size={20}>ขณะนำ: แรงดันตก ≈ 1–1.6 V → ร้อน ต้องมีแผ่นระบายความร้อน</Label>
        <Label x={300} y={366} size={20}>ขณะ OFF: มีกระแสรั่วระดับ mA → วัดด้วยโอห์มมิเตอร์ไม่ได้</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F07  Hysteresis: coil voltage vs contact state
// ---------------------------------------------------------------------------

function Hysteresis() {
  const xv = (v: number) => 80 + v * 32;
  const yOn = 130;
  const yOff = 300;
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* axes */}
      <line x1={80} y1={340} x2={580} y2={340} stroke={INK} strokeWidth={2} />
      <line x1={80} y1={90} x2={80} y2={340} stroke={INK} strokeWidth={2} />
      {[0, 3, 6, 9, 12, 15].map((v) => (
        <g key={v}>
          <line x1={xv(v)} y1={340} x2={xv(v)} y2={348} stroke={INK} strokeWidth={2} />
          <Label x={xv(v)} y={366} size={20}>{v}</Label>
        </g>
      ))}
      <Label x={330} y={396} size={20}>แรงดันขดลวด (V) — รีเลย์พิกัด 12 VDC</Label>
      <Label x={70} y={yOn} size={20} anchor="end" weight={700}>ดูด</Label>
      <Label x={70} y={yOff} size={20} anchor="end" weight={700}>ปล่อย</Label>
      {/* datasheet limits */}
      <line x1={xv(9)} y1={80} x2={xv(9)} y2={340} stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 5" />
      <line x1={xv(1.2)} y1={80} x2={xv(1.2)} y2={340} stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 5" />
      <Label x={xv(9) + 6} y={70} size={20} muted anchor="start">pull-in ≤ 9 V</Label>
      <Label x={xv(1.2) - 6} y={70} size={20} muted anchor="start">drop-out ≥ 1.2 V</Label>
      {/* rising path */}
      <Wire points={[[xv(0), yOff + 6], [xv(8), yOff + 6], [xv(8), yOn - 6], [xv(12), yOn - 6]]} color="var(--fig-accent)" width={3.5} />
      <Arrow from={[xv(2), yOff + 6]} to={[xv(5), yOff + 6]} color="var(--fig-accent)" />
      <Arrow from={[xv(8), 240]} to={[xv(8), 190]} color="var(--fig-accent)" />
      {/* falling path */}
      <Wire points={[[xv(12), yOn + 6], [xv(3), yOn + 6], [xv(3), yOff - 6], [xv(0), yOff - 6]]} color="var(--fig-current)" width={3} dash="9 6" />
      <Arrow from={[xv(7), yOn + 6]} to={[xv(5), yOn + 6]} color="var(--fig-current)" />
      <Arrow from={[xv(3), 190]} to={[xv(3), 240]} color="var(--fig-current)" />
      <Label x={xv(8) + 10} y={215} size={20} anchor="start" color="var(--fig-accent)" weight={700}>ดูดที่ ≈ 8 V</Label>
      <Label x={xv(3) + 10} y={262} size={20} anchor="start" color="var(--fig-current)" weight={700}>ปล่อยที่ ≈ 3 V</Label>
      <Label x={xv(12) + 8} y={yOn} size={20} anchor="start" muted>12 V</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F08  Pull-in / drop-out test circuit
// ---------------------------------------------------------------------------

function PullInCircuit() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* coil side */}
      <DCSource x={60} y={200} angle={90} />
      <line x1={36} y1={232} x2={86} y2={168} stroke={INK} strokeWidth={2.5} />
      <path d="M 86 168 l -11 3 l 6 8 z" fill={INK} />
      <Label x={20} y={346} size={20} anchor="start">แหล่งจ่าย 0–15 V (จำกัดกระแส)</Label>
      <Wire points={[[60, 160], [60, 80], [260, 80], [260, 166]]} />
      <Wire points={[[260, 234], [260, 320], [60, 320], [60, 240]]} />
      <Wire points={[[130, 80], [130, 172]]} />
      <Meter x={130} y={200} kind="V" angle={90} />
      <Wire points={[[130, 228], [130, 320]]} />
      <Wire points={[[195, 80], [195, 140]]} />
      <Diode x={195} y={170} angle={-90} />
      <Wire points={[[195, 200], [195, 320]]} />
      <Label x={180} y={128} size={20} anchor="end">D1</Label>
      <Node x={130} y={80} />
      <Node x={195} y={80} />
      <Node x={130} y={320} />
      <Node x={195} y={320} />
      <Coil x={260} y={200} />
      <Label x={290} y={240} size={22} weight={700} anchor="start">K1</Label>
      {/* link */}
      <Link from={[285, 200]} to={[392, 140]} />
      {/* contact side */}
      <Battery x={560} y={200} angle={90} label="12 V" labelSide="b" />
      <Wire points={[[560, 170], [560, 80], [400, 80], [400, 105]]} />
      <NOContact x={400} y={135} />
      <Label x={418} y={132} size={20} anchor="start" weight={700}>COM–NO</Label>
      <Resistor x={400} y={205} angle={90} />
      <Label x={382} y={214} size={20} anchor="end">470 Ω</Label>
      <Diode x={400} y={280} angle={90} kind="led" label="LED" />
      <Wire points={[[400, 310], [400, 320], [560, 320], [560, 230]]} />
      <Label x={300} y={384} size={20} muted>เพิ่ม/ลดแรงดันทีละ 0.5 V แล้วดู LED และอ่านโวลต์มิเตอร์</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F09  Self-holding Start/Stop circuit (IEC)
// ---------------------------------------------------------------------------

function SelfHolding() {
  const cA = 190;
  const cB = 470;
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      {/* rails */}
      <Wire points={[[60, 50], [560, 50]]} color="var(--fig-wire-l)" width={4} />
      <Wire points={[[60, 430], [560, 430]]} color="var(--fig-wire-n)" width={4} />
      <Label x={60} y={26} size={20} anchor="start" weight={700}>+12 V</Label>
      <Label x={60} y={454} size={20} anchor="start" weight={700}>0 V</Label>
      {/* STOP (NC) */}
      <Wire points={[[cA, 50], [cA, 80]]} />
      <NCContact x={cA} y={110} />
      <PushActuator x={cA + 7} y={108} />
      <Label x={cA + 34} y={100} size={20} anchor="start" weight={700}>S0 หยุด</Label>
      <Label x={cA + 34} y={124} size={20} anchor="start" muted>(STOP, NC)</Label>
      <Wire points={[[cA, 140], [cA, 165]]} />
      <Node x={cA} y={165} />
      {/* START (NO) || K1 13-14 */}
      <Wire points={[[cA - 40, 165], [cA + 60, 165]]} />
      <Wire points={[[cA - 40, 165], [cA - 40, 185]]} />
      <NOContact x={cA - 40} y={215} />
      <PushActuator x={cA - 46} y={213} />
      <Label x={cA - 80} y={258} size={20} anchor="middle" weight={700}>S1 เริ่ม</Label>
      <Label x={cA - 80} y={282} size={20} anchor="middle" muted>(START, NO)</Label>
      <Wire points={[[cA + 60, 165], [cA + 60, 185]]} />
      <NOContact x={cA + 60} y={215} />
      <Label x={cA + 78} y={200} size={20} anchor="start" weight={700}>K1</Label>
      <Label x={cA + 78} y={224} size={20} anchor="start" muted>11–14</Label>
      <Wire points={[[cA - 40, 245], [cA - 40, 270], [cA + 60, 270], [cA + 60, 245]]} />
      <Node x={cA} y={270} />
      {/* coil + flyback */}
      <Wire points={[[cA, 270], [cA, 300]]} />
      <Node x={cA} y={300} />
      <Coil x={cA} y={340} label="" />
      <Label x={cA - 34} y={340} size={22} weight={700} anchor="end">K1</Label>
      <Wire points={[[cA, 374], [cA, 400]]} />
      <Node x={cA} y={400} />
      <Wire points={[[cA, 400], [cA, 430]]} />
      <Wire points={[[cA, 300], [cA + 80, 300], [cA + 80, 310]]} />
      <Diode x={cA + 80} y={340} angle={-90} />
      <Wire points={[[cA + 80, 370], [cA + 80, 400], [cA, 400]]} />
      <Label x={cA + 102} y={340} size={20} anchor="start" weight={700}>D1</Label>
      {/* load rung */}
      <Wire points={[[cB, 50], [cB, 150]]} />
      <NOContact x={cB} y={180} />
      <Label x={cB + 18} y={168} size={20} anchor="start" weight={700}>K1</Label>
      <Label x={cB + 18} y={192} size={20} anchor="start" muted>21–24</Label>
      <Wire points={[[cB, 210], [cB, 300]]} />
      <Lamp x={cB} y={330} angle={90} label="H1" />
      <Wire points={[[cB, 360], [cB, 430]]} />
      <Node x={cA} y={50} />
      <Node x={cB} y={50} />
      <Node x={cA} y={430} />
      <Node x={cB} y={430} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F10  Relay module (generic line drawing)
// ---------------------------------------------------------------------------

function RelayModule() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Label x={290} y={26} size={22} weight={700}>โมดูลรีเลย์ 1 ช่อง (ลายเส้นทั่วไป)</Label>
      <rect x={20} y={50} width={520} height={290} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      {/* header pins */}
      {[
        ["VCC", 110],
        ["GND", 180],
        ["IN", 250],
      ].map(([t, y]) => (
        <g key={t as string}>
          <rect x={34} y={(y as number) - 14} width={28} height={28} fill={BG} stroke={INK} strokeWidth={2.5} />
          <Label x={72} y={y as number} size={20} anchor="start" weight={700}>{t}</Label>
        </g>
      ))}
      {/* optocoupler */}
      <rect x={150} y={84} width={90} height={64} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={195} y={116} size={20}>ออปโต</Label>
      {/* transistor */}
      <circle cx={300} cy={116} r={26} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={300} y={117} size={20} weight={700}>Q</Label>
      {/* indicator LED */}
      <circle cx={190} cy={250} r={16} fill="var(--fig-glow)" stroke={INK} strokeWidth={2.5} />
      <Label x={190} y={290} size={20}>LED สถานะ</Label>
      {/* diode */}
      <rect x={265} y={238} width={60} height={24} rx={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <rect x={309} y={238} width={8} height={24} fill={INK} />
      <Label x={295} y={290} size={20}>ไดโอด</Label>
      {/* relay */}
      <rect x={350} y={80} width={115} height={220} rx={8} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={3} />
      <Label x={407} y={180} size={20} weight={700}>รีเลย์</Label>
      <Label x={407} y={206} size={20}>5 VDC</Label>
      {/* screw terminals */}
      <rect x={478} y={95} width={52} height={190} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      {[
        ["NO", 128],
        ["COM", 190],
        ["NC", 252],
      ].map(([t, y]) => (
        <g key={t as string}>
          <circle cx={504} cy={y as number} r={14} fill="none" stroke={INK} strokeWidth={2.5} />
          <line x1={494} y1={(y as number) - 10} x2={514} y2={(y as number) + 10} stroke={INK} strokeWidth={2.5} />
          <Label x={548} y={y as number} size={20} anchor="start" weight={700}>{t}</Label>
        </g>
      ))}
      {/* traces */}
      <Wire points={[[108, 250], [130, 250], [130, 130], [150, 130]]} color={MUTED} width={2} />
      <Wire points={[[240, 116], [274, 116]]} color={MUTED} width={2} />
      <Wire points={[[326, 116], [350, 116]]} color={MUTED} width={2} />
      <Wire points={[[325, 250], [350, 250]]} color={MUTED} width={2} />
      <Label x={290} y={370} size={20} muted>หลายรุ่น: IN = 0 V → รีเลย์ทำงาน (active-low)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F13  Three-step ohmmeter test
// ---------------------------------------------------------------------------

function Lcd({ x, y, pair, value, tone }: { x: number; y: number; pair: string; value: string; tone: "ok" | "open" }) {
  return (
    <g>
      <Label x={x + 70} y={y - 16} size={20} weight={700}>{pair}</Label>
      <rect x={x} y={y} width={140} height={46} rx={6} fill="var(--fig-panel)" stroke={INK} strokeWidth={2.5} />
      <Label x={x + 70} y={y + 24} size={24} weight={700} color={tone === "ok" ? "var(--fig-ok)" : "var(--fig-danger)"}>
        {value}
      </Label>
    </g>
  );
}

function TestSteps() {
  const rows = [
    { t: "① วัดขดลวด", s: "ยังไม่จ่ายไฟ", lcd: [["A1–A2", "≈ 400 Ω", "ok"]] },
    { t: "② วัดหน้าสัมผัส", s: "ยังไม่จ่ายไฟ", lcd: [["COM–NC", "≈ 0 Ω", "ok"], ["COM–NO", "OL", "open"]] },
    { t: "③ จ่าย 12 V ที่ขดลวด", s: "ได้ยินเสียง “แกร๊ก”", lcd: [["COM–NO", "≈ 0 Ω", "ok"], ["COM–NC", "OL", "open"]] },
  ] as const;
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      {rows.map((r, i) => {
        const y0 = 10 + i * 135;
        return (
          <g key={r.t}>
            <rect x={6} y={y0} width={588} height={124} rx={10} fill="none" stroke={MUTED} strokeWidth={1.5} />
            <Label x={20} y={y0 + 42} size={22} weight={700} anchor="start">{r.t}</Label>
            <Label x={20} y={y0 + 80} size={20} anchor="start" muted>{r.s}</Label>
            {r.lcd.map(([pair, v, tone], j) => (
              <Lcd key={pair} x={r.lcd.length === 1 ? 440 : 290 + j * 150} y={y0 + 50} pair={pair} value={v} tone={tone} />
            ))}
          </g>
        );
      })}
      <Label x={300} y={420} size={20} muted>OL = เกินย่าน (วงจรเปิด) · รีเลย์ 12 VDC ตัวอย่าง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F14  Five measured relays (find the faulty ones)
// ---------------------------------------------------------------------------

function FiveRelays() {
  // columns: relay | A1–A2 | off: NC, NO | on: NC, NO
  const xs = [6, 76, 186, 288, 390, 492, 594];
  const top = 44;
  const h1 = 40;
  const h2 = 36;
  const rh = 58;
  const data = [
    ["R1", "395 Ω", "0.2 Ω", "OL", "OL", "0.2 Ω"],
    ["R2", "OL", "0.2 Ω", "OL", "0.2 Ω", "OL"],
    ["R3", "1.5 Ω", "0.2 Ω", "OL", "0.2 Ω", "OL"],
    ["R4", "402 Ω", "OL", "0.2 Ω", "OL", "0.2 Ω"],
    ["R5", "380 Ω", "0.2 Ω", "OL", "OL", "OL"],
  ];
  const head = "var(--fig-accent-soft)";
  const body = top + h1 + h2;
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <Label x={300} y={22} size={20} weight={700}>รีเลย์ 12 VDC ขดลวด 400 Ω ±10% จำนวน 5 ตัว</Label>
      {/* header */}
      <rect x={xs[0]} y={top} width={xs[1] - xs[0]} height={h1 + h2} fill={head} stroke={INK} strokeWidth={1.5} />
      <rect x={xs[1]} y={top} width={xs[2] - xs[1]} height={h1 + h2} fill={head} stroke={INK} strokeWidth={1.5} />
      <Label x={(xs[0] + xs[1]) / 2} y={top + 38} size={20} weight={700}>รีเลย์</Label>
      <Label x={(xs[1] + xs[2]) / 2} y={top + 38} size={20} weight={700}>A1–A2</Label>
      <rect x={xs[2]} y={top} width={xs[4] - xs[2]} height={h1} fill={head} stroke={INK} strokeWidth={1.5} />
      <rect x={xs[4]} y={top} width={xs[6] - xs[4]} height={h1} fill={head} stroke={INK} strokeWidth={1.5} />
      <Label x={(xs[2] + xs[4]) / 2} y={top + 21} size={20} weight={700}>ไม่จ่ายไฟขดลวด</Label>
      <Label x={(xs[4] + xs[6]) / 2} y={top + 21} size={20} weight={700}>จ่าย 12 V ที่ขดลวด</Label>
      {[2, 3, 4, 5].map((c) => (
        <g key={c}>
          <rect x={xs[c]} y={top + h1} width={xs[c + 1] - xs[c]} height={h2} fill={head} stroke={INK} strokeWidth={1.5} />
          <Label x={(xs[c] + xs[c + 1]) / 2} y={top + h1 + 19} size={20}>{c % 2 === 0 ? "COM–NC" : "COM–NO"}</Label>
        </g>
      ))}
      {data.map((row, i) => {
        const y = body + i * rh;
        return (
          <g key={row[0]}>
            {row.map((v, j) => (
              <g key={j}>
                <rect x={xs[j]} y={y} width={xs[j + 1] - xs[j]} height={rh} fill="none" stroke={MUTED} strokeWidth={1.5} />
                <Label x={(xs[j] + xs[j + 1]) / 2} y={y + rh / 2} size={j === 0 ? 22 : 20} weight={j === 0 ? 700 : 500}>
                  {v}
                </Label>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F15  Three flyback-diode variants (find the faults)
// ---------------------------------------------------------------------------

function FlybackPanel({ cx, variant, tag }: { cx: number; variant: "ok" | "rev" | "none"; tag: string }) {
  const xc = cx - 35;
  const xd = cx + 35;
  return (
    <g>
      <Label x={cx} y={28} size={20} weight={700}>+12 V</Label>
      <Wire points={[[xc, 46], [xd + (variant === "none" ? -70 : 0), 46]]} color="var(--fig-wire-l)" width={4} />
      <Wire points={[[xc, 46], [xc, 116]]} />
      <Coil x={xc} y={150} />
      <Label x={xc - 32} y={150} size={20} anchor="end" weight={700}>K1</Label>
      {variant !== "none" ? (
        <g>
          <Wire points={[[xd, 46], [xd, 120]]} />
          <Diode x={xd} y={150} angle={variant === "ok" ? -90 : 90} />
          <Wire points={[[xd, 180], [xd, 200], [xc, 200]]} />
          <Node x={xc} y={200} />
          <Node x={xc} y={46} />
        </g>
      ) : (
        <Wire points={[[xc, 46], [xc, 46]]} />
      )}
      <Wire points={[[xc, 184], [xc, 215]]} />
      <SwitchSym x={xc} y={255} angle={90} />
      <Label x={xc + 26} y={255} size={20} anchor="start">S</Label>
      <Wire points={[[xc, 295], [xc, 310]]} />
      <Label x={xc} y={330} size={20}>0 V</Label>
      <Label x={cx} y={370} size={22} weight={700}>{tag}</Label>
    </g>
  );
}

function FlybackThree() {
  return (
    <svg viewBox="0 0 600 390" aria-hidden="true">
      <FlybackPanel cx={100} variant="rev" tag="(ก)" />
      <line x1={200} y1={20} x2={200} y2={380} stroke={MUTED} strokeWidth={1.5} strokeDasharray="6 5" />
      <FlybackPanel cx={300} variant="ok" tag="(ข)" />
      <line x1={400} y1={20} x2={400} y2={380} stroke={MUTED} strokeWidth={1.5} strokeDasharray="6 5" />
      <FlybackPanel cx={500} variant="none" tag="(ค)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F16  Flyback diode current path
// ---------------------------------------------------------------------------

function FlybackPath() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Battery x={110} y={215} angle={90} label="12 V" labelSide="b" />
      <Wire points={[[110, 185], [110, 70], [420, 70], [420, 140]]} />
      <Wire points={[[300, 70], [300, 126]]} />
      <Node x={300} y={70} />
      <Coil x={300} y={160} />
      <Label x={268} y={160} size={22} weight={700} anchor="end">K1</Label>
      <Wire points={[[300, 194], [300, 250]]} />
      <Diode x={420} y={170} angle={-90} />
      <Wire points={[[420, 200], [420, 250], [300, 250]]} />
      <Node x={300} y={250} />
      <Label x={445} y={150} size={20} anchor="start" weight={700}>D1 (1N4007)</Label>
      <Label x={445} y={176} size={20} anchor="start" muted>ขีด (K) ไป +12 V</Label>
      <Wire points={[[300, 250], [300, 262]]} />
      <SwitchSym x={300} y={302} angle={90} />
      <Label x={326} y={302} size={20} anchor="start">S (เพิ่งตัด)</Label>
      <Wire points={[[300, 342], [300, 360], [110, 360], [110, 245]]} />
      {/* ON path */}
      <Arrow from={[150, 52]} to={[250, 52]} label="ขณะ S ต่อ" labelOffset={[0, -18]} />
      {/* freewheel loop */}
      <Arrow from={[334, 120]} to={[334, 210]} color="var(--fig-accent-2)" />
      <Arrow from={[392, 232]} to={[392, 110]} color="var(--fig-accent-2)" />
      <Label x={362} y={96} size={20} weight={700} color="var(--fig-accent-2)">กระแสวน</Label>
      <Callout x={350} y={322} w={240} h={62} tone="ok">
        <Label x={470} y={341} size={20}>แรงดันที่ S ถูกจำกัด</Label>
        <Label x={470} y={366} size={20} weight={700}>≈ 12 + 0.7 V</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F17  Unlabelled 5-pin relay (bottom view, pins numbered)
// ---------------------------------------------------------------------------

function UnlabelledPins() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <Label x={300} y={26} size={20} weight={700}>รีเลย์ 12 VDC ไม่มีฉลาก (มองด้านล่าง)</Label>
      <rect x={160} y={50} width={280} height={250} rx={12} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      {[
        ["1", 220, 95],
        ["2", 220, 175],
        ["3", 220, 255],
        ["4", 380, 95],
        ["5", 380, 255],
      ].map(([t, x, y]) => (
        <g key={t as string}>
          <circle cx={x as number} cy={y as number} r={22} fill={BG} stroke={INK} strokeWidth={3} />
          <Label x={x as number} y={(y as number) + 1} size={22} weight={700}>{t}</Label>
        </g>
      ))}
      <Label x={300} y={325} size={20} muted>ใช้โอห์มมิเตอร์หาขาขดลวด COM NO NC</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F18  IEC 60617 vs ANSI relay symbols + terminal numbering
// ---------------------------------------------------------------------------

function AnsiContact({ x, y, nc = false }: { x: number; y: number; nc?: boolean }) {
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round">
      <line x1={x - 50} y1={y} x2={x - 9} y2={y} />
      <line x1={x + 9} y1={y} x2={x + 50} y2={y} />
      <line x1={x - 9} y1={y - 18} x2={x - 9} y2={y + 18} />
      <line x1={x + 9} y1={y - 18} x2={x + 9} y2={y + 18} />
      {nc ? <line x1={x - 18} y1={y + 20} x2={x + 18} y2={y - 20} /> : null}
    </g>
  );
}

function SymbolCompare() {
  const rows = [
    { yc: 100, name: "ขดลวด", sub: "coil" },
    { yc: 197, name: "หน้าสัมผัส NO", sub: "ปกติเปิด" },
    { yc: 292, name: "หน้าสัมผัส NC", sub: "ปกติปิด" },
    { yc: 392, name: "สองทาง (CO)", sub: "COM/NC/NO" },
  ];
  const xi = 265;
  const xa = 490;
  return (
    <svg viewBox="0 0 600 455" aria-hidden="true">
      <rect x={6} y={6} width={588} height={44} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={1.5} />
      <Label x={78} y={28} size={20} weight={700}>ส่วน</Label>
      <Label x={xi} y={28} size={20} weight={700}>IEC 60617 (K)</Label>
      <Label x={xa} y={28} size={20} weight={700}>ANSI (CR)</Label>
      {[50, 150, 245, 340].map((y, i) => (
        <rect key={y} x={6} y={y} width={588} height={i === 3 ? 105 : [100, 95, 95][i]} fill="none" stroke={MUTED} strokeWidth={1.5} />
      ))}
      <line x1={150} y1={50} x2={150} y2={445} stroke={MUTED} strokeWidth={1.5} />
      <line x1={380} y1={50} x2={380} y2={445} stroke={MUTED} strokeWidth={1.5} />
      {rows.map((r) => (
        <g key={r.name}>
          <Label x={16} y={r.yc - 13} size={20} weight={700} anchor="start">{r.name}</Label>
          <Label x={16} y={r.yc + 15} size={20} anchor="start" muted>{r.sub}</Label>
        </g>
      ))}
      {/* row 1: coil */}
      <Coil x={xi} y={100} />
      <Label x={xi + 14} y={70} size={20} anchor="start" muted>A1</Label>
      <Label x={xi + 14} y={132} size={20} anchor="start" muted>A2</Label>
      <Label x={xi - 36} y={100} size={22} weight={700} anchor="end">K1</Label>
      <line x1={xa - 50} y1={100} x2={xa - 24} y2={100} stroke={INK} strokeWidth={3} />
      <line x1={xa + 24} y1={100} x2={xa + 50} y2={100} stroke={INK} strokeWidth={3} />
      <circle cx={xa} cy={100} r={24} fill={BG} stroke={INK} strokeWidth={3} />
      <Label x={xa} y={101} size={20} weight={700}>CR</Label>
      {/* row 2: NO */}
      <NOContact x={xi} y={197} />
      <Label x={xi + 16} y={172} size={20} anchor="start" muted>13</Label>
      <Label x={xi + 16} y={222} size={20} anchor="start" muted>14</Label>
      <AnsiContact x={xa} y={197} />
      {/* row 3: NC */}
      <NCContact x={xi} y={292} />
      <Label x={xi - 14} y={267} size={20} anchor="end" muted>21</Label>
      <Label x={xi - 14} y={317} size={20} anchor="end" muted>22</Label>
      <AnsiContact x={xa} y={292} nc />
      {/* row 4: changeover */}
      <COContact x={xi} y={392} />
      <Label x={xi - 28} y={364} size={20} anchor="end" muted>12</Label>
      <Label x={xi + 28} y={364} size={20} anchor="start" muted>14</Label>
      <Label x={xi + 14} y={420} size={20} anchor="start" muted>11</Label>
      <Label x={xa} y={380} size={20}>ใช้ NO + NC</Label>
      <Label x={xa} y={406} size={20} muted>ต่อขาร่วมกัน</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W11-F19  Magnetic contactor terminal overview (preview W16)
// ---------------------------------------------------------------------------

function ContactorPreview() {
  const mains = [
    { x: 180, t: "1/L1", b: "2/T1" },
    { x: 260, t: "3/L2", b: "4/T2" },
    { x: 340, t: "5/L3", b: "6/T3" },
  ];
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <rect x={20} y={74} width={560} height={252} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={2.5} />
      <Label x={260} y={24} size={20} weight={700}>หน้าสัมผัสหลัก (main)</Label>
      <Label x={260} y={50} size={20} muted>วงจรกำลัง เช่น มอเตอร์ 3 เฟส</Label>
      <Label x={485} y={24} size={20} weight={700}>หน้าสัมผัสช่วย</Label>
      <Label x={485} y={50} size={20} muted>วงจรควบคุม</Label>
      {/* coil */}
      <Coil x={75} y={200} />
      <Label x={89} y={156} size={20} anchor="start" muted>A1</Label>
      <Label x={89} y={244} size={20} anchor="start" muted>A2</Label>
      <Label x={75} y={292} size={22} weight={700}>K1</Label>
      <Wire points={[[75, 166], [75, 110]]} />
      <Wire points={[[75, 234], [75, 270]]} />
      {/* main contacts */}
      {mains.map((m) => (
        <g key={m.x}>
          <Wire points={[[m.x, 110], [m.x, 170]]} width={4} />
          <Wire points={[[m.x, 230], [m.x, 290]]} width={4} />
          <NOContact x={m.x} y={200} />
          <Label x={m.x} y={96} size={20} weight={700}>{m.t}</Label>
          <Label x={m.x} y={306} size={20} weight={700}>{m.b}</Label>
        </g>
      ))}
      {/* auxiliary */}
      <Wire points={[[440, 120], [440, 170]]} />
      <Wire points={[[440, 230], [440, 280]]} />
      <NOContact x={440} y={200} />
      <Label x={440} y={104} size={20} weight={700}>13</Label>
      <Label x={440} y={298} size={20} weight={700}>14</Label>
      <Wire points={[[530, 120], [530, 170]]} />
      <Wire points={[[530, 230], [530, 280]]} />
      <NCContact x={530} y={200} />
      <Label x={530} y={104} size={20} weight={700}>21</Label>
      <Label x={530} y={298} size={20} weight={700}>22</Label>
      <line x1={100} y1={196} x2={546} y2={196} stroke={INK} strokeWidth={2} strokeDasharray="7 5" />
      <line x1={400} y1={84} x2={400} y2={316} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 6" />
      <Label x={300} y={356} size={20}>คอนแทกเตอร์ = รีเลย์กำลัง หลักการเดียวกัน (ขดลวด A1–A2)</Label>
      <Label x={300} y={384} size={20} muted>ใช้ร่วมกับโอเวอร์โหลดรีเลย์ — เรียนต่อสัปดาห์ที่ 16</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W11-F01": RelayOff,
  "W11-F02": ContactForms,
  "W11-F03": Pinouts,
  "W11-F04": Timing,
  "W11-F05": Reed,
  "W11-F06": SSR,
  "W11-F07": Hysteresis,
  "W11-F08": PullInCircuit,
  "W11-F09": SelfHolding,
  "W11-F10": RelayModule,
  "W11-F11": RelayOn,
  "W11-F12": ControlVsLoad,
  "W11-F13": TestSteps,
  "W11-F14": FiveRelays,
  "W11-F15": FlybackThree,
  "W11-F16": FlybackPath,
  "W11-F17": UnlabelledPins,
  "W11-F18": SymbolCompare,
  "W11-F19": ContactorPreview,
};
export default figures;
