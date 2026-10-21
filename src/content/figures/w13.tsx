import type { ReactNode, ComponentProps } from "react";
import type { FigureMap } from "@/content/types";
import {
  Wire,
  Resistor,
  Battery,
  Lamp,
  SwitchSym,
  Capacitor,
  Diode,
  NPN,
  PNP,
  Arrow,
  Label as KLabel,
  Node,
  Terminal,
  Callout,
  Ground,
} from "./kit";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const MUTED = "var(--fig-muted)";
const ACC = "var(--fig-accent)";
const OK = "var(--fig-ok)";
const DANGER = "var(--fig-danger)";
const CUR = "var(--fig-current)";
const ELEC = "var(--fig-electron)";
const PLUS = "var(--fig-plus)";
const GRID = "var(--fig-grid)";

type Pt = [number, number];

/** Turn "R_B = 1 kΩ" into R with a lowered subscript B (SVG tspan). */
function sub(t: string, size = 22): ReactNode {
  const parts = t.split(/_([A-Za-z0-9]+)/);
  if (parts.length === 1) return t;
  const dy = Math.round(size * 0.28);
  const out: ReactNode[] = [];
  parts.forEach((p, i) => {
    if (i % 2 === 0) {
      if (i === 0) out.push(p);
      else out.push(<tspan key={i} dy={-dy}>{p || "\u200b"}</tspan>);
    } else {
      out.push(
        <tspan key={i} dy={dy} fontSize={Math.round(size * 0.72)}>
          {p}
        </tspan>,
      );
    }
  });
  return out;
}

/** Label that renders "_x" as a subscript. */
function Label(props: ComponentProps<typeof KLabel>) {
  const { children, size = 22 } = props;
  return <KLabel {...props}>{typeof children === "string" ? sub(children, size) : children}</KLabel>;
}

/** Polyline path of y = f(t) for t in [0,1] mapped to [x0, x0+w]. */
function curve(x0: number, w: number, f: (t: number) => number, n = 160): string {
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    d += (i ? " L " : "M ") + (x0 + t * w).toFixed(1) + " " + f(t).toFixed(1);
  }
  return d;
}

/** Simple transformer (two vertical coils + core) between x=cx-22 and cx+22, centred at cy. */
function Transformer({ cx, cy, h = 80 }: { cx: number; cy: number; h?: number }) {
  const turns = 4;
  const step = h / turns;
  let left = `M ${cx - 30} ${cy - h / 2}`;
  let right = `M ${cx + 30} ${cy - h / 2}`;
  for (let i = 0; i < turns; i++) {
    const y = cy - h / 2 + i * step;
    left += ` A ${step / 2} ${step / 2} 0 0 1 ${cx - 30} ${y + step}`;
    right += ` A ${step / 2} ${step / 2} 0 0 0 ${cx + 30} ${y + step}`;
  }
  return (
    <g>
      <path d={left} fill="none" stroke={INK} strokeWidth={3} />
      <path d={right} fill="none" stroke={INK} strokeWidth={3} />
      <line x1={cx - 5} y1={cy - h / 2} x2={cx - 5} y2={cy + h / 2} stroke={INK} strokeWidth={2.5} />
      <line x1={cx + 5} y1={cy - h / 2} x2={cx + 5} y2={cy + h / 2} stroke={INK} strokeWidth={2.5} />
    </g>
  );
}

/** IEC relay coil (rectangle) centred at (x,y), vertical, terminals at y±40. */
function Coil({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <line x1={x} y1={y - 40} x2={x} y2={y - 22} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y + 22} x2={x} y2={y + 40} stroke={INK} strokeWidth={3} />
      <rect x={x - 18} y={y - 22} width={36} height={44} fill={BG} stroke={INK} strokeWidth={3} />
      {label ? <Label x={x - 28} y={y} anchor="end" size={20}>{label}</Label> : null}
    </g>
  );
}

/** SCR symbol: anode at (x, y-30) top, cathode at (x, y+30) bottom; gate lead to the right-down. */
function SCRSym({ x, y, gateLen = 34 }: { x: number; y: number; gateLen?: number }) {
  return (
    <g>
      <Diode x={x} y={y} angle={90} />
      <line x1={x + 2} y1={y + 13} x2={x + 20} y2={y + 26} stroke={INK} strokeWidth={3} />
      <line x1={x + 20} y1={y + 26} x2={x + 20 + gateLen} y2={y + 26} stroke={INK} strokeWidth={3} />
    </g>
  );
}

/** Schottky diode symbol (horizontal, anode left). */
function Schottky({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 30} y1={y} x2={x - 12} y2={y} stroke={INK} strokeWidth={3} />
      <line x1={x + 12} y1={y} x2={x + 30} y2={y} stroke={INK} strokeWidth={3} />
      <path d={`M ${x - 12} ${y - 16} L ${x - 12} ${y + 16} L ${x + 12} ${y} Z`} fill={BG} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path
        d={`M ${x + 20} ${y - 12} L ${x + 20} ${y - 18} L ${x + 12} ${y - 18} L ${x + 12} ${y + 18} L ${x + 4} ${y + 18} L ${x + 4} ${y + 12}`}
        fill="none"
        stroke={INK}
        strokeWidth={3}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// F01 — P-type and N-type crystal (2-D)
// ---------------------------------------------------------------------------
function Lattice({ ox, center, kind }: { ox: number; center: string; kind: "p" | "n" }) {
  const cy = 180;
  const s = 88;
  const atoms: Pt[] = [];
  for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) atoms.push([ox + dx * s, cy + dy * s]);
  const bonds: [Pt, Pt][] = [];
  for (const [x, y] of atoms) {
    if (x < ox + s) bonds.push([[x, y], [x + s, y]]);
    if (y < cy + s) bonds.push([[x, y], [x, y + s]]);
  }
  return (
    <g>
      {bonds.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={GRID} strokeWidth={6} />
      ))}
      {bonds.map(([a, b], i) => {
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        const horiz = a[1] === b[1];
        const isCenterRight = kind === "p" && a[0] === ox && a[1] === cy && horiz;
        const e1: Pt = horiz ? [mx, my - 8] : [mx - 8, my];
        const e2: Pt = horiz ? [mx, my + 8] : [mx + 8, my];
        return (
          <g key={"e" + i}>
            <circle cx={e1[0]} cy={e1[1]} r={5} fill={ELEC} />
            {isCenterRight ? (
              <circle cx={e2[0]} cy={e2[1]} r={7} fill={BG} stroke={PLUS} strokeWidth={3} />
            ) : (
              <circle cx={e2[0]} cy={e2[1]} r={5} fill={ELEC} />
            )}
          </g>
        );
      })}
      {atoms.map(([x, y], i) => {
        const c = x === ox && y === cy;
        return (
          <g key={"a" + i}>
            <circle cx={x} cy={y} r={24} fill={c ? "var(--fig-accent-soft)" : PANEL} stroke={c ? ACC : INK} strokeWidth={c ? 3 : 2} />
            <Label x={x} y={y + 1} size={20} weight={c ? 700 : 500}>{c ? center : "Si"}</Label>
          </g>
        );
      })}
      {kind === "n" ? (
        <g>
          <circle cx={ox + 30} cy={cy + 30} r={7} fill={ELEC} />
          <Label x={ox + 42} y={cy + 32} size={20} color={ELEC} anchor="start">e⁻</Label>
        </g>
      ) : (
        <Label x={ox + 44} y={cy + 30} size={20} color={PLUS} anchor="start">โฮล</Label>
      )}
    </g>
  );
}

function F01() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <Label x={150} y={24} weight={700}>ชนิด P (เติม B หมู่ 3)</Label>
      <Label x={450} y={24} weight={700}>ชนิด N (เติม P หมู่ 5)</Label>
      <Lattice ox={150} center="B" kind="p" />
      <Lattice ox={450} center="P" kind="n" />
      <line x1={300} y1={50} x2={300} y2={320} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      <Label x={150} y={318} size={20} muted>พาหะส่วนใหญ่ = โฮล (+)</Label>
      <Label x={450} y={318} size={20} muted>พาหะส่วนใหญ่ = อิเล็กตรอน (−)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 — PN junction forward / reverse bias
// ---------------------------------------------------------------------------
function JunctionPanel({ oy, forward }: { oy: number; forward: boolean }) {
  const dl = forward ? 288 : 255;
  const dr = forward ? 312 : 345;
  const holes: Pt[] = [];
  const elecs: Pt[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++) {
      const hx = 170 + i * ((dl - 185) / 3);
      const ex = dr + 15 + i * ((435 - dr - 15) / 3);
      holes.push([hx, oy + 62 + j * 34]);
      elecs.push([ex, oy + 62 + j * 34]);
    }
  return (
    <g>
      <Label x={300} y={oy + 18} weight={700} color={forward ? OK : DANGER}>
        {forward ? "ไบอัสตรง: + ต่อ P → ชั้นปลอดพาหะแคบ → นำกระแส ✓" : "ไบอัสกลับ: + ต่อ N → ชั้นปลอดพาหะกว้าง → ไม่นำ"}
      </Label>
      <rect x={150} y={oy + 42} width={dl - 150} height={74} fill="var(--fig-danger-soft)" stroke={INK} strokeWidth={2.5} />
      <rect x={dl} y={oy + 42} width={dr - dl} height={74} fill={BG} stroke={INK} strokeWidth={2} strokeDasharray="5 4" />
      <rect x={dr} y={oy + 42} width={450 - dr} height={74} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
      {holes.map(([x, y], i) => (
        <circle key={"h" + i} cx={x} cy={y} r={7} fill={BG} stroke={PLUS} strokeWidth={2.5} />
      ))}
      {elecs.map(([x, y], i) => (
        <circle key={"e" + i} cx={x} cy={y} r={6} fill={ELEC} />
      ))}
      <Label x={128} y={oy + 79} weight={700} anchor="end">P</Label>
      <Label x={472} y={oy + 79} weight={700} anchor="start">N</Label>
      <Wire points={[[150, oy + 116], [150, oy + 170], [180, oy + 170]]} />
      <Battery x={210} y={oy + 170} angle={forward ? 0 : 180} />
      <Wire points={[[240, oy + 170], [330, oy + 170]]} />
      <Lamp x={360} y={oy + 170} on={forward} />
      <Wire points={[[390, oy + 170], [450, oy + 170], [450, oy + 116]]} />
      <Label x={490} y={oy + 170} anchor="start" size={20} color={forward ? OK : MUTED}>
        {forward ? "หลอดติด" : "หลอดดับ"}
      </Label>
      {forward ? <Arrow from={[320, oy + 196]} to={[255, oy + 196]} /> : null}
    </g>
  );
}

function F02() {
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <JunctionPanel oy={0} forward />
      <line x1={20} y1={216} x2={580} y2={216} stroke={GRID} strokeWidth={2} />
      <JunctionPanel oy={222} forward={false} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 — diode I–V characteristic
// ---------------------------------------------------------------------------
function F03() {
  const ox = 260;
  const oy = 250;
  const sx = 120; // px per volt (forward)
  const knee = (vk: number, x0: number) =>
    curve(x0, (vk + 0.25) * sx, (t) => {
      const v = t * (vk + 0.25);
      const i = v < vk - 0.15 ? 0 : Math.pow((v - (vk - 0.15)) / 0.4, 2) * 200;
      return oy - Math.min(i, 220);
    });
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <line x1={20} y1={oy} x2={585} y2={oy} stroke={INK} strokeWidth={2} />
      <line x1={ox} y1={20} x2={ox} y2={385} stroke={INK} strokeWidth={2} />
      <path d={`M 585 ${oy} l -12 -6 l 0 12 z`} fill={INK} />
      <path d={`M ${ox} 20 l -6 12 l 12 0 z`} fill={INK} />
      <Label x={580} y={oy + 24} anchor="end" size={20}>V (V)</Label>
      <Label x={ox + 10} y={30} anchor="start" size={20}>I</Label>
      <path d={knee(0.3, ox)} fill="none" stroke={ELEC} strokeWidth={3} strokeDasharray="8 5" />
      <path d={knee(0.7, ox)} fill="none" stroke={ACC} strokeWidth={3.5} />
      <path d={knee(2.0, ox)} fill="none" stroke={DANGER} strokeWidth={3} strokeDasharray="2 5" strokeLinecap="round" />
      <Label x={ox + 40} y={60} size={20} color={ELEC} anchor="end">Ge</Label>
      <Label x={ox + 0.95 * sx + 14} y={60} size={20} color={ACC} weight={700} anchor="start">Si</Label>
      <Label x={ox + 2.25 * sx - 16} y={60} size={20} color={DANGER} anchor="end">LED แดง</Label>
      {[0.3, 0.7, 2.0].map((v) => (
        <g key={v}>
          <line x1={ox + v * sx} y1={oy - 4} x2={ox + v * sx} y2={oy + 8} stroke={INK} strokeWidth={2} />
          <Label x={ox + v * sx} y={oy + 24} size={20}>{String(v)}</Label>
        </g>
      ))}
      {/* reverse: tiny leakage then breakdown */}
      <path d={`M ${ox} ${oy} L 90 ${oy + 6} Q 76 ${oy + 10} 72 ${oy + 60} L 66 380`} fill="none" stroke={ACC} strokeWidth={3.5} />
      <Label x={70} y={oy - 22} size={20} anchor="start">−V_BR</Label>
      <Label x={170} y={oy + 30} size={20} muted>← ไบอัสกลับ</Label>
      <Label x={180} y={oy + 60} size={20} muted>กระแสรั่ว ≈ 0</Label>
      <Label x={110} y={355} size={20} anchor="start" color={DANGER}>พังทลาย (breakdown)</Label>
      <Label x={480} y={oy + 56} size={20} muted>ไบอัสตรง →</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 — IEC symbols (also used by hotspot I22)
// ---------------------------------------------------------------------------
function F04() {
  const col = [80, 230, 380, 520];
  const r1 = 95;
  const r2 = 300;
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <Diode x={col[0]} y={r1} />
      <Diode x={col[1]} y={r1} kind="zener" />
      <Diode x={col[2]} y={r1} kind="led" />
      <Diode x={col[3]} y={r1} kind="photodiode" />
      <Label x={col[0]} y={r1 + 50} size={20}>ไดโอด</Label>
      <Label x={col[1]} y={r1 + 50} size={20}>ซีเนอร์</Label>
      <Label x={col[2]} y={r1 + 50} size={20}>LED</Label>
      <Label x={col[3]} y={r1 + 50} size={20}>โฟโตไดโอด</Label>
      <Label x={col[0] - 34} y={r1 - 28} size={20} muted>A</Label>
      <Label x={col[0] + 34} y={r1 - 28} size={20} muted>K</Label>
      <line x1={20} y1={190} x2={580} y2={190} stroke={GRID} strokeWidth={2} />
      <Schottky x={col[0]} y={r2} />
      <NPN x={col[1] - 10} y={r2} />
      <PNP x={col[2] - 10} y={r2} />
      <SCRSym x={col[3] - 10} y={r2} />
      <Label x={col[3] - 30} y={r2 - 34} size={20} muted>A</Label>
      <Label x={col[3] - 30} y={r2 + 34} size={20} muted>K</Label>
      <Label x={col[3] + 40} y={r2 + 48} size={20} muted>G</Label>
      <Label x={col[0]} y={r2 + 76} size={20}>ชอตต์กี</Label>
      <Label x={col[1]} y={r2 + 76} size={20}>NPN</Label>
      <Label x={col[1]} y={r2 + 102} size={20} muted>ลูกศรชี้ออก</Label>
      <Label x={col[2]} y={r2 + 76} size={20}>PNP</Label>
      <Label x={col[2]} y={r2 + 102} size={20} muted>ลูกศรชี้เข้า</Label>
      <Label x={col[3]} y={r2 + 76} size={20}>SCR</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 — DMM diode test, both directions
// ---------------------------------------------------------------------------
function DMM({ x, y, reading, ok }: { x: number; y: number; reading: string; ok: boolean }) {
  return (
    <g>
      <rect x={x - 70} y={y - 60} width={140} height={150} rx={14} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={x - 54} y={y - 46} width={108} height={46} rx={6} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={x} y={y - 22} size={26} weight={700} color={ok ? OK : INK}>{reading}</Label>
      <circle cx={x} cy={y + 40} r={22} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={x} y={y + 41} size={20} weight={700}>→|</Label>
      <circle cx={x - 40} cy={y + 76} r={7} fill={INK} />
      <circle cx={x + 40} cy={y + 76} r={7} fill={PLUS} />
    </g>
  );
}

function DiodeBody({ x, y, flip }: { x: number; y: number; flip: boolean }) {
  // stripe (cathode) on the right unless flipped
  const sx = flip ? x - 30 : x + 22;
  return (
    <g>
      <line x1={x - 70} y1={y} x2={x + 70} y2={y} stroke={MUTED} strokeWidth={3} />
      <rect x={x - 40} y={y - 16} width={80} height={32} rx={8} fill={INK} />
      <rect x={sx} y={y - 16} width={10} height={32} fill="var(--fig-grid)" />
    </g>
  );
}

function F05() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      {/* left: forward */}
      <DiodeBody x={150} y={70} flip />
      <Label x={80} y={36} size={20}>K (แถบ)</Label>
      <Label x={220} y={36} size={20}>A</Label>
      <DMM x={150} y={210} reading="0.62 V" ok />
      <Wire d="M 190 286 C 262 300, 262 110, 220 72" color={PLUS} width={3} />
      <Wire d="M 110 286 C 38 300, 38 110, 80 72" color={INK} width={3} />
      <Label x={150} y={330} size={20} color={OK}>แดงที่ A → ไบอัสตรง ✓</Label>
      {/* right: reverse */}
      <line x1={300} y1={20} x2={300} y2={340} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      <DiodeBody x={450} y={70} flip={false} />
      <Label x={380} y={36} size={20}>A</Label>
      <Label x={520} y={36} size={20}>K (แถบ)</Label>
      <DMM x={450} y={210} reading="OL" ok={false} />
      <Wire d="M 490 286 C 560 270, 540 150, 520 72" color={PLUS} width={3} />
      <Wire d="M 410 286 C 340 270, 360 150, 380 72" color={INK} width={3} />
      <Label x={450} y={330} size={20}>แดงที่ K → ไบอัสกลับ = OL</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 — half-wave rectifier
// ---------------------------------------------------------------------------
function F06() {
  return (
    <svg viewBox="0 30 600 310" aria-hidden="true">
      <Wire points={[[40, 120], [90, 120]]} color="var(--fig-wire-l)" width={4} />
      <Wire points={[[40, 200], [90, 200]]} color="var(--fig-wire-n)" width={4} />
      <Label x={60} y={92} size={20}>230 V~</Label>
      <Label x={60} y={232} size={20} muted>(ครูต่อ)</Label>
      <Wire points={[[90, 120], [90, 120]]} />
      <path d="M 90 120 L 110 120" stroke={INK} strokeWidth={3} />
      <path d="M 90 200 L 110 200" stroke={INK} strokeWidth={3} />
      <Transformer cx={140} cy={160} h={80} />
      <Wire points={[[170, 120], [250, 120]]} />
      <Wire points={[[170, 200], [440, 200]]} />
      <Label x={196} y={160} size={20} anchor="start">12 V~</Label>
      <Diode x={280} y={120} label="D (1N4007)" />
      <Wire points={[[310, 120], [440, 120], [440, 120]]} />
      <Resistor x={440} y={160} angle={90} />
      <Node x={440} y={120} />
      <Node x={440} y={200} />
      <Label x={470} y={148} anchor="start" size={20}>R_L 1 kΩ</Label>
      <Label x={470} y={176} anchor="start" size={20} muted>+ บน, − ล่าง</Label>
      <Arrow from={[340, 140]} to={[410, 140]} label="I (ซีกบวก)" labelOffset={[0, 18]} />
      {/* input & output sketches */}
      <rect x={110} y={252} width={180} height={80} rx={8} fill={PANEL} stroke={GRID} />
      <path d={curve(120, 160, (t) => 290 - 28 * Math.sin(t * 4 * Math.PI))} fill="none" stroke={MUTED} strokeWidth={2.5} />
      <Label x={120} y={240} size={20} muted anchor="start">อินพุต (ทุติยภูมิ)</Label>
      <rect x={330} y={252} width={220} height={80} rx={8} fill={PANEL} stroke={GRID} />
      <path d={curve(340, 200, (t) => 310 - 40 * Math.max(0, Math.sin(t * 4 * Math.PI)))} fill="none" stroke={ACC} strokeWidth={3} />
      <Label x={340} y={240} size={20} muted anchor="start">เอาต์พุตบน R_L</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 — centre-tap and bridge rectifiers
// ---------------------------------------------------------------------------
function F07() {
  // bridge geometry
  const cx = 450;
  const cy = 190;
  const d = 76;
  const T: Pt = [cx, cy - d];
  const R: Pt = [cx + d, cy];
  const B: Pt = [cx, cy + d];
  const L: Pt = [cx - d, cy];
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <Label x={150} y={24} weight={700}>เซ็นเตอร์แทป (2 ไดโอด)</Label>
      <Label x={450} y={24} weight={700}>บริดจ์ (4 ไดโอด)</Label>
      {/* centre tap */}
      <Transformer cx={60} cy={190} h={160} />
      <Wire points={[[90, 110], [120, 110]]} />
      <Wire points={[[90, 270], [120, 270]]} />
      <Node x={90} y={190} />
      <Label x={100} y={222} size={20} anchor="start" muted>CT</Label>
      <Diode x={150} y={110} label="D1" />
      <Diode x={150} y={270} label="D2" labelSide="b" />
      <Wire points={[[180, 110], [250, 110], [250, 270], [180, 270]]} />
      <Node x={250} y={190} />
      <Wire points={[[90, 190], [130, 190]]} />
      <Resistor x={170} y={190} />
      <Wire points={[[210, 190], [250, 190]]} />
      <Label x={170} y={160} size={20}>R_L</Label>
      <Label x={228} y={168} size={22} color={PLUS} weight={700}>+</Label>
      <Label x={114} y={168} size={22} weight={700}>−</Label>
      <line x1={300} y1={40} x2={300} y2={360} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      {/* bridge */}
      <Wire points={[T, R, B, L, T]} />
      <Diode x={mid(T, R)[0]} y={mid(T, R)[1]} angle={45} />
      <Diode x={mid(B, R)[0]} y={mid(B, R)[1]} angle={-45} />
      <Diode x={mid(L, T)[0]} y={mid(L, T)[1]} angle={-45} />
      <Diode x={mid(L, B)[0]} y={mid(L, B)[1]} angle={45} />
      {[T, R, B, L].map((p, i) => (
        <Node key={i} x={p[0]} y={p[1]} />
      ))}
      <Wire points={[T, [cx, 56]]} />
      <Wire points={[B, [cx, 324]]} />
      <Terminal x={cx} y={50} />
      <Terminal x={cx} y={330} />
      <Label x={cx + 18} y={52} anchor="start" size={20}>~</Label>
      <Label x={cx + 18} y={332} anchor="start" size={20}>~</Label>
      <Wire points={[R, [570, cy]]} />
      <Wire points={[L, [345, cy], [345, 360], [570, 360]]} />
      <Resistor x={570} y={275} angle={90} />
      <Wire points={[[570, cy], [570, 235]]} />
      <Wire points={[[570, 315], [570, 360]]} />
      <Label x={560} y={cy - 20} anchor="end" size={20} color={PLUS}>+</Label>
      <Label x={556} y={275} anchor="end" size={20}>R_L</Label>
      <Label x={360} y={cy + 24} anchor="start" size={22}>−</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 — waveforms: input, half, full, full + C
// ---------------------------------------------------------------------------
function F08() {
  const x0 = 170;
  const w = 410;
  const rows = [
    { y: 60, label: "อินพุต ac" },
    { y: 170, label: "ครึ่งคลื่น" },
    { y: 280, label: "เต็มคลื่น/บริดจ์" },
    { y: 390, label: "บริดจ์ + C" },
  ];
  const A = 40;
  const sin = (t: number) => Math.sin(t * 4 * Math.PI);
  // full-wave with capacitor: track |sin| while rising, decay linearly afterwards
  const filtered = (t: number) => {
    const ph = (t * 4) % 1; // half-cycle phase 0..1
    const decay = 0.18;
    // after the peak (ph=0.5) the cap voltage falls linearly
    const capAfter = (p: number) => 1 - decay * (p - 0.5);
    let v: number;
    if (ph >= 0.5) v = capAfter(ph);
    else {
      const prev = capAfter(ph + 1);
      v = Math.max(Math.sin(ph * Math.PI), prev);
    }
    if (t < 0.125) v = Math.sin(t * 4 * Math.PI); // first charge from 0
    return v;
  };
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      {rows.map((r, i) => (
        <g key={i}>
          <line x1={x0} y1={r.y + (i === 0 ? 0 : 30)} x2={x0 + w} y2={r.y + (i === 0 ? 0 : 30)} stroke={GRID} strokeWidth={2} />
          <Label x={10} y={r.y + (i === 0 ? 0 : 6)} anchor="start" size={20} weight={600}>{r.label}</Label>
        </g>
      ))}
      <path d={curve(x0, w, (t) => 60 - A * sin(t))} fill="none" stroke={MUTED} strokeWidth={3} />
      <path d={curve(x0, w, (t) => 200 - A * 1.6 * Math.max(0, sin(t)))} fill="none" stroke={ACC} strokeWidth={3} />
      <path d={curve(x0, w, (t) => 310 - A * 1.6 * Math.abs(sin(t)))} fill="none" stroke={ACC} strokeWidth={3} />
      <path d={curve(x0, w, (t) => 420 - A * 1.6 * Math.abs(sin(t)))} fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" />
      <path d={curve(x0, w, (t) => 420 - A * 1.6 * filtered(t), 400)} fill="none" stroke={OK} strokeWidth={3.5} />
      <Label x={10} y={226} anchor="start" size={20} muted>ripple 50 Hz</Label>
      <Label x={10} y={336} anchor="start" size={20} muted>ripple 100 Hz</Label>
      <Label x={10} y={430} anchor="start" size={20} muted>ราบเรียบขึ้น</Label>
      <Label x={10} y={102} anchor="start" size={20} muted>2 ไซเคิล = 40 ms</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 — reverse-polarity protection diode
// ---------------------------------------------------------------------------
function ProtectPanel({ ox, ok }: { ox: number; ok: boolean }) {
  return (
    <g>
      <Label x={ox + 140} y={26} weight={700} color={ok ? OK : INK}>{ok ? "ต่อถูกขั้ว" : "ต่อกลับขั้ว"}</Label>
      <Wire points={[[ox + 50, 140], [ox + 50, 80], [ox + 100, 80]]} />
      <Battery x={ox + 50} y={170} angle={ok ? 90 : -90} />
      <Wire points={[[ox + 50, 200], [ox + 50, 250], [ox + 230, 250], [ox + 230, 200]]} />
      <Diode x={ox + 130} y={80} />
      <Wire points={[[ox + 160, 80], [ox + 230, 80], [ox + 230, 140]]} />
      <Lamp x={ox + 230} y={170} angle={90} on={ok} />
      <Label x={ox + 140} y={290} size={20} color={ok ? OK : MUTED}>{ok ? "ไบอัสตรง → หลอดติด" : "ไบอัสกลับ → ไม่มีกระแส"}</Label>
      <Label x={ox + 140} y={318} size={20} muted>{ok ? "เสียแรงดัน ≈ 0.7 V" : "วงจรไม่เสียหาย"}</Label>
      {ok ? <Arrow from={[ox + 175, 64]} to={[ox + 220, 64]} /> : null}
    </g>
  );
}

function F09() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <ProtectPanel ox={10} ok />
      <line x1={300} y1={20} x2={300} y2={330} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      <ProtectPanel ox={310} ok={false} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 — Zener shunt regulator
// ---------------------------------------------------------------------------
function F10() {
  return (
    <svg viewBox="0 0 600 320" aria-hidden="true">
      <Battery x={110} y={170} angle={90} label={sub("V_in")} value="12 V" labelSide="b" />
      <Wire points={[[110, 140], [110, 80], [180, 80]]} />
      <Resistor x={220} y={80} label="R" value="680 Ω" />
      <Wire points={[[260, 80], [520, 80], [520, 130]]} />
      <Node x={340} y={80} />
      <Wire points={[[340, 80], [340, 140]]} />
      <Diode x={340} y={170} angle={-90} kind="zener" />
      <Label x={370} y={160} anchor="start" size={20}>D_Z</Label>
      <Label x={370} y={186} anchor="start" size={20} muted>5.1 V</Label>
      <Wire points={[[340, 200], [340, 260]]} />
      <Resistor x={520} y={170} angle={90} />
      <Label x={505} y={160} anchor="end" size={20}>R_L</Label>
      <Wire points={[[520, 210], [520, 260], [110, 260], [110, 200]]} />
      <Node x={340} y={260} />
      <Arrow from={[270, 56]} to={[320, 56]} label={sub("I_R", 20)} labelOffset={[0, -14]} />
      <Arrow from={[364, 110]} to={[364, 138]} />
      <Label x={378} y={112} anchor="start" size={20} color={CUR}>I_Z</Label>
      <Label x={300} y={300} size={20} muted>แคโทดซีเนอร์ต่อทาง + (ไบอัสกลับ) · V_out ≈ 5.1 V</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 — LED + series resistor, single and 3 in series
// ---------------------------------------------------------------------------
function F11() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* single LED */}
      <Battery x={90} y={120} angle={90} label={sub("V_S")} labelSide="b" />
      <Wire points={[[90, 90], [90, 50], [110, 50]]} />
      <Resistor x={150} y={50} label="R" />
      <Wire points={[[190, 50], [240, 50], [240, 90]]} />
      <Diode x={240} y={120} angle={90} kind="led" lit />
      <Wire points={[[240, 150], [240, 190], [90, 190], [90, 150]]} />
      <Arrow from={[200, 72]} to={[228, 72]} />
      <Label x={165} y={222} size={20}>R = (V_S − V_F) / I_F</Label>
      {/* table of cases */}
      <Callout x={300} y={30} w={290} h={180} tone="info">
        <Label x={445} y={56} size={20} weight={700}>LED แดง 2.0 V, 20 mA</Label>
        <Label x={320} y={92} size={20} anchor="start">5 V → 150 Ω</Label>
        <Label x={320} y={126} size={20} anchor="start">9 V → 350 Ω ⇒ 390 Ω</Label>
        <Label x={320} y={160} size={20} anchor="start">12 V → 500 Ω ⇒ 560 Ω</Label>
        <Label x={320} y={192} size={20} anchor="start" muted>ปัดขึ้นเป็นค่า E12 ถัดไป</Label>
      </Callout>
      <line x1={20} y1={246} x2={580} y2={246} stroke={GRID} strokeWidth={2} />
      {/* three in series */}
      <Battery x={90} y={335} angle={90} label="12 V" labelSide="b" />
      <Wire points={[[90, 305], [90, 300], [110, 300]]} />
      <Resistor x={150} y={300} label="330 Ω" />
      <Wire points={[[190, 300], [210, 300]]} />
      <Diode x={240} y={300} kind="led" lit />
      <Wire points={[[270, 300], [290, 300]]} />
      <Diode x={320} y={300} kind="led" lit />
      <Wire points={[[350, 300], [370, 300]]} />
      <Diode x={400} y={300} kind="led" lit />
      <Wire points={[[430, 300], [460, 300], [460, 380], [90, 380], [90, 365]]} />
      <Label x={480} y={300} anchor="start" size={20}>3 ดวง</Label>
      <Label x={480} y={328} anchor="start" size={20} muted>(12 − 6)/0.02</Label>
      <Label x={480} y={352} anchor="start" size={20} muted>= 300 Ω</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 — real packages: diode stripe, LED legs, TO-92 pinout
// ---------------------------------------------------------------------------
function F12() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      {/* diode */}
      <line x1={20} y1={80} x2={180} y2={80} stroke={MUTED} strokeWidth={3} />
      <rect x={55} y={62} width={90} height={36} rx={8} fill={INK} />
      <rect x={122} y={62} width={11} height={36} fill={GRID} />
      <Label x={36} y={50} size={20}>A</Label>
      <Label x={165} y={50} size={20}>K</Label>
      <Label x={100} y={130} size={20}>แถบ = แคโทด</Label>
      {/* LED */}
      <path d="M 240 60 a 40 40 0 0 1 80 0 L 320 140 L 240 140 Z" fill="var(--fig-danger-soft)" stroke={INK} strokeWidth={3} />
      <line x1={320} y1={70} x2={320} y2={140} stroke={INK} strokeWidth={5} />
      <rect x={232} y={140} width={96} height={12} fill="var(--fig-danger-soft)" stroke={INK} strokeWidth={2.5} />
      <line x1={260} y1={152} x2={260} y2={280} stroke={MUTED} strokeWidth={4} />
      <line x1={300} y1={152} x2={300} y2={240} stroke={MUTED} strokeWidth={4} />
      <Label x={252} y={302} size={20}>ขายาว A</Label>
      <Label x={308} y={258} size={20} anchor="start">ขาสั้น K</Label>
      <Label x={330} y={110} size={20} anchor="start" muted>ด้านแบน</Label>
      {/* TO-92 */}
      <path d="M 450 140 L 450 70 a 50 50 0 0 1 100 0 L 550 140 Z" fill={INK} />
      <line x1={470} y1={140} x2={470} y2={240} stroke={MUTED} strokeWidth={4} />
      <line x1={500} y1={140} x2={500} y2={240} stroke={MUTED} strokeWidth={4} />
      <line x1={530} y1={140} x2={530} y2={240} stroke={MUTED} strokeWidth={4} />
      <Label x={500} y={100} size={20} color={BG}>BC547</Label>
      <Label x={470} y={262} size={22} weight={700}>C</Label>
      <Label x={500} y={262} size={22} weight={700}>B</Label>
      <Label x={530} y={262} size={22} weight={700}>E</Label>
      <Label x={500} y={296} size={20} muted>มองด้านแบน ขาชี้ลง</Label>
      <Label x={500} y={322} size={20} muted>(2N3904 = E B C)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 — NPN structure, carrier flow, currents
// ---------------------------------------------------------------------------
function F13() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <rect x={110} y={80} width={150} height={110} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={3} />
      <rect x={260} y={80} width={36} height={110} fill="var(--fig-danger-soft)" stroke={INK} strokeWidth={3} />
      <rect x={296} y={80} width={200} height={110} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={3} />
      {Array.from({ length: 18 }).map((_, i) => (
        <circle key={"e" + i} cx={125 + (i % 6) * 24} cy={98 + Math.floor(i / 6) * 36} r={5} fill={ELEC} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <circle key={"c" + i} cx={330 + (i % 3) * 60} cy={105 + Math.floor(i / 3) * 60} r={5} fill={ELEC} />
      ))}
      <circle cx={278} cy={115} r={6} fill={BG} stroke={PLUS} strokeWidth={2.5} />
      <circle cx={278} cy={160} r={6} fill={BG} stroke={PLUS} strokeWidth={2.5} />
      <Label x={185} y={58} size={20} weight={700}>E (N⁺) โด๊ปเข้มมาก</Label>
      <Label x={278} y={222} size={20} weight={700}>B (P) บาง โด๊ปน้อย</Label>
      <Label x={420} y={58} size={20} weight={700}>C (N) ใหญ่สุด</Label>
      <Arrow from={[150, 135]} to={[460, 135]} color={ELEC} width={3} />
      <Label x={490} y={250} size={20} color={ELEC}>อิเล็กตรอน E → C</Label>
      <Wire points={[[110, 135], [40, 135]]} />
      <Wire points={[[496, 135], [570, 135]]} />
      <Wire points={[[278, 190], [278, 200]]} />
      <Wire points={[[278, 240], [278, 290]]} />
      <Arrow from={[90, 112]} to={[45, 112]} label={sub("I_E", 20)} labelOffset={[0, -16]} />
      <Arrow from={[565, 112]} to={[515, 112]} label={sub("I_C", 20)} labelOffset={[0, -16]} />
      <Arrow from={[300, 290]} to={[300, 248]} label={sub("I_B", 20)} labelOffset={[24, 0]} />
      <Label x={300} y={318} size={22} weight={700} color={CUR}>I_E = I_B + I_C</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F14 — NPN/PNP symbols with diode equivalents
// ---------------------------------------------------------------------------
function F14() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      <Label x={150} y={24} weight={700}>NPN</Label>
      <Label x={450} y={24} weight={700}>PNP</Label>
      <NPN x={130} y={110} />
      <PNP x={430} y={110} />
      <Arrow from={[160, 160]} to={[160, 196]} label="C → E" labelOffset={[44, 0]} />
      <Arrow from={[460, 196]} to={[460, 160]} label="E → C" labelOffset={[44, 0]} />
      <line x1={300} y1={20} x2={300} y2={340} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      {/* NPN equivalent: anodes common at B */}
      <Diode x={170} y={250} angle={-90} />
      <Diode x={170} y={310} angle={90} />
      <Wire points={[[100, 280], [170, 280]]} />
      <Node x={170} y={280} />
      <Label x={90} y={280} anchor="end" size={20}>B</Label>
      <Label x={196} y={220} anchor="start" size={20}>C</Label>
      <Label x={196} y={340} anchor="start" size={20}>E</Label>
      <Label x={60} y={226} anchor="start" size={20} muted>แอโนดร่วม</Label>
      {/* PNP equivalent: cathodes common at B */}
      <Diode x={470} y={250} angle={90} />
      <Diode x={470} y={310} angle={-90} />
      <Wire points={[[400, 280], [470, 280]]} />
      <Node x={470} y={280} />
      <Label x={390} y={280} anchor="end" size={20}>B</Label>
      <Label x={496} y={220} anchor="start" size={20}>C</Label>
      <Label x={496} y={340} anchor="start" size={20}>E</Label>
      <Label x={358} y={226} anchor="start" size={20} muted>แคโทดร่วม</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F15 — IC–VCE output characteristics with regions
// ---------------------------------------------------------------------------
function F15() {
  const ox = 80;
  const oy = 320;
  const ib = [10, 20, 30, 40];
  return (
    <svg viewBox="0 0 600 390" aria-hidden="true">
      <rect x={ox} y={40} width={40} height={oy - 40} fill="var(--fig-danger-soft)" />
      <rect x={ox} y={oy - 16} width={500} height={16} fill="var(--fig-accent-soft)" />
      <line x1={ox} y1={oy} x2={585} y2={oy} stroke={INK} strokeWidth={2} />
      <line x1={ox} y1={oy} x2={ox} y2={30} stroke={INK} strokeWidth={2} />
      <path d={`M 585 ${oy} l -12 -6 l 0 12 z`} fill={INK} />
      <path d={`M ${ox} 30 l -6 12 l 12 0 z`} fill={INK} />
      <Label x={580} y={oy + 26} anchor="end" size={20}>V_CE</Label>
      <Label x={ox - 10} y={44} anchor="end" size={20}>I_C</Label>
      {ib.map((b, i) => {
        const level = oy - 16 - (i + 1) * 58;
        const d = `M ${ox} ${oy} Q ${ox + 20} ${level} ${ox + 50} ${level} L 560 ${level - 12}`;
        return (
          <g key={b}>
            <path d={d} fill="none" stroke={ACC} strokeWidth={3} />
            <Label x={565} y={level - 32} anchor="end" size={20} muted>{`I_B = ${b} µA`}</Label>
          </g>
        );
      })}
      <Label x={ox + 48} y={40} size={20} color={DANGER} anchor="start">← อิ่มตัว (V_CE ≈ 0.2 V)</Label>
      <Label x={330} y={oy - 30} size={20} color={ACC}>ตัดกระแส (I_B = 0) ↓</Label>
      <Label x={320} y={366} size={20} weight={700}>แอกทีฟ: I_C ≈ β·I_B (เส้นเกือบแบน)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F16 — fixed bias and voltage-divider bias
// ---------------------------------------------------------------------------
function F16() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Label x={150} y={22} weight={700}>ไบอัสคงที่ (fixed)</Label>
      <Label x={450} y={22} weight={700}>แบ่งแรงดัน (divider)</Label>
      {/* fixed */}
      <Wire points={[[40, 60], [260, 60]]} color="var(--fig-wire-l)" />
      <Label x={40} y={46} anchor="start" size={20}>+10 V</Label>
      <Resistor x={80} y={130} angle={90} />
      <Label x={64} y={124} anchor="end" size={20}>R_B</Label>
      <Label x={64} y={146} anchor="end" size={20} muted>1 MΩ</Label>
      <Wire points={[[80, 60], [80, 90]]} />
      <Wire points={[[80, 170], [80, 240], [110, 240]]} />
      <NPN x={150} y={240} />
      <Resistor x={170} y={130} angle={90} />
      <Label x={196} y={124} anchor="start" size={20}>R_C</Label>
      <Label x={196} y={146} anchor="start" size={20} muted>1 kΩ</Label>
      <Wire points={[[170, 60], [170, 90]]} />
      <Wire points={[[170, 170], [170, 200]]} />
      <Wire points={[[170, 280], [170, 340]]} />
      <Ground x={170} y={340} />
      <Label x={150} y={390} size={20} muted>I_B = (V_CC − 0.7)/R_B</Label>
      <line x1={300} y1={20} x2={300} y2={390} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      {/* divider */}
      <Wire points={[[330, 60], [580, 60]]} color="var(--fig-wire-l)" />
      <Label x={330} y={46} anchor="start" size={20}>+12 V</Label>
      <Resistor x={380} y={130} angle={90} />
      <Label x={364} y={124} anchor="end" size={20}>R1</Label>
      <Label x={364} y={146} anchor="end" size={20} muted>47 k</Label>
      <Wire points={[[380, 60], [380, 90]]} />
      <Wire points={[[380, 170], [380, 290]]} />
      <Node x={380} y={240} />
      <Wire points={[[380, 240], [420, 240]]} />
      <Resistor x={380} y={330} angle={90} />
      <Label x={364} y={324} anchor="end" size={20}>R2</Label>
      <Label x={364} y={346} anchor="end" size={20} muted>10 k</Label>
      <NPN x={460} y={240} />
      <Resistor x={480} y={130} angle={90} />
      <Label x={506} y={124} anchor="start" size={20}>R_C 3.3 k</Label>
      <Wire points={[[480, 60], [480, 90]]} />
      <Wire points={[[480, 170], [480, 200]]} />
      <Resistor x={480} y={320} angle={90} />
      <Label x={506} y={320} anchor="start" size={20}>R_E 1 k</Label>
      <Wire points={[[480, 280], [480, 280]]} />
      <Wire points={[[380, 370], [480, 370], [480, 360]]} />
      <Ground x={430} y={370} />
      <Label x={400} y={226} anchor="end" size={20} color={ACC}>V_B</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F17 — low-side relay driver with flyback diode
// ---------------------------------------------------------------------------
function F17() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Wire points={[[160, 40], [520, 40]]} color="var(--fig-wire-l)" width={4} />
      <Label x={160} y={22} anchor="start" size={20}>+12 V</Label>
      <Wire points={[[300, 40], [300, 70]]} />
      <Coil x={300} y={110} label="K1 400 Ω" />
      <Node x={300} y={40} />
      <Node x={300} y={170} />
      <Wire points={[[300, 150], [300, 200]]} />
      <Wire points={[[300, 170], [400, 170], [400, 140]]} />
      <Wire points={[[300, 40], [400, 40], [400, 80]]} />
      <Diode x={400} y={110} angle={-90} />
      <Label x={426} y={98} anchor="start" size={20}>D 1N4007</Label>
      <Label x={426} y={124} anchor="start" size={20} muted>แคโทด → +12 V</Label>
      <NPN x={280} y={240} />
      <Label x={330} y={300} anchor="start" size={20}>Q1 BC547</Label>
      <Wire points={[[300, 280], [300, 340]]} />
      <Wire points={[[160, 340], [520, 340]]} color="var(--fig-wire-n)" width={4} />
      <Label x={160} y={366} anchor="start" size={20}>0 V</Label>
      <Resistor x={170} y={240} label={sub("R_B = 1 kΩ")} />
      <Wire points={[[210, 240], [240, 240]]} />
      <Terminal x={90} y={240} />
      <Label x={90} y={272} size={20}>V_in = 5 V</Label>
      <Wire points={[[96, 240], [130, 240]]} />
      <Arrow from={[282, 178]} to={[282, 204]} />
      <Label x={274} y={186} anchor="end" size={20} color={CUR}>I_C</Label>
      <Arrow from={[150, 266]} to={[190, 266]} />
      <Label x={200} y={268} anchor="start" size={20} color={CUR}>I_B</Label>
      <Callout x={420} y={170} w={170} h={110} tone="warn">
        <Label x={505} y={198} size={20}>Q1 ตัด → กระแส</Label>
        <Label x={505} y={224} size={20}>ขดลวดวนผ่าน D</Label>
        <Label x={505} y={250} size={20}>V_C ≈ 12 + 0.7 V</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F18 — LDR light switch driving relay
// ---------------------------------------------------------------------------
function LDR({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Resistor x={x} y={y} angle={90} />
      <circle cx={x} cy={y} r={34} fill="none" stroke={INK} strokeWidth={2} />
      <line x1={x - 60} y1={y - 40} x2={x - 38} y2={y - 18} stroke={INK} strokeWidth={2} />
      <path d={`M ${x - 38} ${y - 18} l -2 -9 l -7 7 z`} fill={INK} />
      <line x1={x - 60} y1={y - 16} x2={x - 38} y2={y + 6} stroke={INK} strokeWidth={2} />
      <path d={`M ${x - 38} ${y + 6} l -2 -9 l -7 7 z`} fill={INK} />
    </g>
  );
}

function F18() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Wire points={[[60, 40], [560, 40]]} color="var(--fig-wire-l)" width={4} />
      <Label x={60} y={22} anchor="start" size={20}>+9 V</Label>
      <Wire points={[[140, 40], [140, 80]]} />
      <LDR x={140} y={120} />
      <Label x={186} y={100} anchor="start" size={20}>LDR</Label>
      <Wire points={[[140, 160], [140, 210]]} />
      <Node x={140} y={210} />
      <Wire points={[[140, 210], [180, 210]]} />
      <Resistor x={220} y={210} label={sub("R_B")} value="10 kΩ" />
      <Wire points={[[260, 210], [300, 210]]} />
      <Resistor x={140} y={270} angle={90} />
      <Label x={124} y={262} anchor="end" size={20}>R</Label>
      <Label x={124} y={286} anchor="end" size={20} muted>10 kΩ</Label>
      <Wire points={[[140, 210], [140, 230]]} />
      <Wire points={[[140, 310], [140, 350]]} />
      <NPN x={340} y={210} />
      <Wire points={[[360, 40], [360, 80]]} />
      <Coil x={360} y={120} label="K1" />
      <Wire points={[[360, 160], [360, 170]]} />
      <Node x={360} y={165} />
      <Wire points={[[360, 165], [440, 165], [440, 150]]} />
      <Diode x={440} y={120} angle={-90} />
      <Wire points={[[440, 90], [440, 40]]} />
      <Node x={440} y={40} />
      <Node x={360} y={40} />
      <Wire points={[[360, 250], [360, 350]]} />
      <Wire points={[[60, 350], [560, 350]]} color="var(--fig-wire-n)" width={4} />
      <Label x={60} y={374} anchor="start" size={20}>0 V</Label>
      <Callout x={460} y={190} w={130} h={110} tone="info">
        <Label x={525} y={216} size={20}>สว่าง: ON</Label>
        <Label x={525} y={244} size={20}>(อิ่มตัว)</Label>
        <Label x={525} y={272} size={20}>มืด: OFF</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F19 — BJT diode-mode test (NPN) probing B–E
// ---------------------------------------------------------------------------
function F19() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      <Label x={300} y={24} weight={700}>NPN ย่าน →| (สายแดง = +)</Label>
      <Diode x={200} y={130} angle={-90} />
      <Diode x={200} y={230} angle={90} />
      <Wire points={[[120, 180], [200, 180]]} />
      <Node x={200} y={180} />
      <Wire points={[[200, 100], [200, 80]]} />
      <Wire points={[[200, 160], [200, 200]]} />
      <Wire points={[[200, 260], [200, 280]]} />
      <Terminal x={120} y={180} label="B" />
      <Terminal x={200} y={74} />
      <Terminal x={200} y={286} />
      <Label x={226} y={74} anchor="start" size={20}>C</Label>
      <Label x={226} y={290} anchor="start" size={20}>E</Label>
      <Callout x={320} y={60} w={260} h={250} tone="info">
        <Label x={340} y={92} anchor="start" size={20}>B(+) E(−) → 0.68 V</Label>
        <Label x={340} y={124} anchor="start" size={20}>B(+) C(−) → 0.66 V</Label>
        <Label x={340} y={156} anchor="start" size={20}>B(−) E(+) → OL</Label>
        <Label x={340} y={188} anchor="start" size={20}>B(−) C(+) → OL</Label>
        <Label x={340} y={220} anchor="start" size={20}>C–E ทั้งสองทาง → OL</Label>
        <Label x={340} y={260} anchor="start" size={20} muted>B–C ต่ำกว่าเล็กน้อย</Label>
        <Label x={340} y={286} anchor="start" size={20} muted>→ ใช้แยกขา C กับ E</Label>
      </Callout>
      <Label x={160} y={330} size={20} muted>วงจรสมมูล NPN</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F20 — SCR structure and symbol
// ---------------------------------------------------------------------------
function F20() {
  const layers = [
    { t: "P", y: 70 },
    { t: "N", y: 130 },
    { t: "P", y: 190 },
    { t: "N", y: 250 },
  ];
  return (
    <svg viewBox="0 0 600 350" aria-hidden="true">
      <Label x={150} y={22} weight={700}>โครงสร้าง 4 ชั้น</Label>
      <Label x={450} y={24} weight={700}>สัญลักษณ์</Label>
      {layers.map((l, i) => (
        <g key={i}>
          <rect x={90} y={l.y} width={120} height={60} fill={l.t === "P" ? "var(--fig-danger-soft)" : "var(--fig-accent-soft)"} stroke={INK} strokeWidth={2.5} />
          <Label x={150} y={l.y + 30} weight={700}>{l.t}</Label>
        </g>
      ))}
      <Wire points={[[150, 70], [150, 52]]} />
      <Wire points={[[150, 310], [150, 328]]} />
      <Label x={166} y={54} anchor="start" size={20}>A แอโนด</Label>
      <Label x={166} y={330} anchor="start" size={20}>K แคโทด</Label>
      <Wire points={[[210, 220], [250, 220]]} />
      <Terminal x={256} y={220} />
      <Label x={256} y={250} size={20}>G เกต</Label>
      <line x1={300} y1={20} x2={300} y2={330} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      <SCRSym x={440} y={170} gateLen={40} />
      <Wire points={[[440, 140], [440, 90]]} />
      <Wire points={[[440, 200], [440, 250]]} />
      <Label x={420} y={90} anchor="end" size={20}>A</Label>
      <Label x={420} y={250} anchor="end" size={20}>K</Label>
      <Label x={510} y={196} anchor="start" size={20}>G</Label>
      <Label x={450} y={300} size={20} muted>เกตอยู่ด้านแคโทด</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F21 — SCR latching test circuit
// ---------------------------------------------------------------------------
function F21() {
  return (
    <svg viewBox="0 0 600 390" aria-hidden="true">
      <Battery x={90} y={200} angle={90} label="12 V" labelSide="b" />
      <Wire points={[[90, 170], [90, 60], [120, 60]]} />
      <SwitchSym x={160} y={60} closed label="S2 (NC)" />
      <Wire points={[[200, 60], [270, 60]]} />
      <Lamp x={300} y={60} on label="หลอด 12 V" />
      <Wire points={[[330, 60], [420, 60], [420, 170]]} />
      <SCRSym x={420} y={200} gateLen={20} />
      <Label x={392} y={200} anchor="end" size={20}>SCR</Label>
      <Wire points={[[420, 230], [420, 320], [90, 320], [90, 230]]} />
      <Wire points={[[460, 226], [520, 226], [520, 210]]} />
      <Resistor x={520} y={170} angle={90} />
      <Label x={540} y={166} anchor="start" size={20}>R_G</Label>
      <Label x={540} y={188} anchor="start" size={20} muted>1 kΩ</Label>
      <Wire points={[[520, 130], [520, 100]]} />
      <SwitchSym x={520} y={60} angle={-90} />
      <Label x={544} y={60} anchor="start" size={20}>S1</Label>
      <Wire points={[[520, 20], [470, 20], [470, 60], [420, 60]]} />
      <Node x={420} y={60} />
      <Label x={300} y={350} size={20} muted>กด S1 (เกต) แล้วปล่อย → หลอดติดค้าง</Label>
      <Label x={300} y={374} size={20} muted>กด S2 (รีเซ็ต) → I &lt; I_H → ดับ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F22 — find the fault (4 mini circuits)
// ---------------------------------------------------------------------------
function F22() {
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      <line x1={300} y1={10} x2={300} y2={450} stroke={GRID} strokeWidth={2} />
      <line x1={10} y1={230} x2={590} y2={230} stroke={GRID} strokeWidth={2} />
      {/* A: LED direct on 9 V (no resistor) */}
      <Label x={20} y={30} anchor="start" size={20} weight={700}>ก. ไฟแสดงผล 9 V</Label>
      <Battery x={100} y={130} angle={90} label="9 V" labelSide="b" />
      <Wire points={[[100, 100], [100, 70], [200, 70], [200, 100]]} />
      <Diode x={200} y={130} angle={90} kind="led" />
      <Wire points={[[200, 160], [200, 190], [100, 190], [100, 160]]} />
      {/* B: relay with flyback diode */}
      <Label x={320} y={30} anchor="start" size={20} weight={700}>ข. ขับรีเลย์ 12 V</Label>
      <Wire points={[[330, 60], [585, 60]]} />
      <Label x={585} y={44} anchor="end" size={20}>+12 V</Label>
      <Node x={450} y={60} />
      <Coil x={450} y={100} />
      <Wire points={[[530, 60], [530, 70]]} />
      <Diode x={530} y={100} angle={90} />
      <Wire points={[[530, 130], [530, 140], [450, 140]]} />
      <Node x={450} y={140} />
      <NPN x={430} y={180} />
      <Resistor x={345} y={180} />
      <Label x={345} y={152} size={20}>R_B</Label>
      <Wire points={[[385, 180], [390, 180]]} />
      <Wire points={[[450, 220], [450, 226]]} />
      <Wire points={[[330, 226], [585, 226]]} />
      <Label x={585} y={208} anchor="end" size={20}>0 V</Label>
      {/* C: half-wave with filter capacitor */}
      <Label x={20} y={256} anchor="start" size={20} weight={700}>ค. ตัวกรองหลังเรียงกระแส</Label>
      <Terminal x={40} y={300} />
      <Terminal x={40} y={420} />
      <Label x={40} y={360} size={20}>~</Label>
      <Wire points={[[46, 300], [90, 300]]} />
      <Diode x={120} y={300} />
      <Wire points={[[150, 300], [250, 300], [250, 330]]} />
      <Capacitor x={180} y={360} angle={-90} polarized />
      <Wire points={[[180, 300], [180, 330]]} />
      <Wire points={[[180, 390], [180, 420]]} />
      <Node x={180} y={300} />
      <Node x={180} y={420} />
      <Resistor x={250} y={370} angle={90} />
      <Wire points={[[250, 410], [250, 420], [46, 420]]} />
      <Label x={206} y={386} anchor="start" size={20} muted>C</Label>
      {/* D: reverse-polarity protection */}
      <Label x={320} y={256} anchor="start" size={20} weight={700}>ง. กันแบตกลับขั้ว</Label>
      <Battery x={380} y={360} angle={90} label="9 V" labelSide="b" />
      <Wire points={[[380, 330], [380, 300], [410, 300]]} />
      <Diode x={440} y={300} />
      <Wire points={[[470, 300], [540, 300], [540, 330]]} />
      <Lamp x={540} y={360} angle={90} />
      <Wire points={[[540, 390], [540, 420], [380, 420], [380, 390]]} />
    </svg>
  );
}


// ---------------------------------------------------------------------------
// F23 — block diagram of a simple linear DC power supply
// ---------------------------------------------------------------------------
function F23() {
  const w = 150;
  const xs = [4, 191, 378, 565, 752];
  const names = ["หม้อแปลง", "เรียงกระแส", "กรองด้วย C", "คุมแรงดัน", "โหลด"];
  const top = 70;
  const wy = 230; // waveform baseline
  const full = (t: number) => Math.abs(Math.sin(t * 4 * Math.PI));
  const ripple = (t: number) => {
    const ph = (t * 4) % 1;
    const after = (p: number) => 1 - 0.22 * (p - 0.5);
    if (ph >= 0.5) return after(ph);
    return Math.max(Math.sin(ph * Math.PI), after(ph + 1));
  };
  const waves: ((t: number) => number)[] = [
    (t) => wy - 40 - 34 * Math.sin(t * 4 * Math.PI),
    (t) => wy - 70 * full(t),
    (t) => wy - 70 * ripple(t),
    () => wy - 46,
    () => wy - 46,
  ];
  return (
    <svg viewBox="0 0 900 330" aria-hidden="true">
      <rect x={0} y={44} width={158} height={282} rx={10} fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={2} strokeDasharray="6 5" />
      <Label x={4} y={22} size={26} color={DANGER} weight={700} anchor="start">ด้าน 230 V: ครูเท่านั้น</Label>
      {xs.map((x, i) => (
        <g key={i}>
          <rect x={x} y={top} width={w} height={64} rx={8} fill={PANEL} stroke={INK} strokeWidth={2.5} />
          <Label x={x + w / 2} y={top + 32} size={26} weight={600}>{names[i]}</Label>
          <rect x={x} y={150} width={w} height={100} rx={6} fill={BG} stroke={GRID} strokeWidth={1.5} />
          <line x1={x + 8} y1={i === 0 ? wy - 40 : wy} x2={x + w - 8} y2={i === 0 ? wy - 40 : wy} stroke={GRID} strokeWidth={1.5} />
          <path d={curve(x + 8, w - 16, waves[i], 140)} fill="none" stroke={i < 2 ? ACC : OK} strokeWidth={3.5} />
          {i < 4 ? <Arrow from={[x + w + 3, top + 32]} to={[xs[i + 1] - 3, top + 32]} color={INK} head={12} /> : null}
        </g>
      ))}
      <Label x={79} y={290} size={26} muted>12 V~</Label>
      <Label x={266} y={290} size={26} muted>ไฟตรงพัลส์</Label>
      <Label x={453} y={290} size={26} muted>มี ripple</Label>
      <Label x={640} y={290} size={26} muted>ไฟตรงคงที่</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W13-F01": F01,
  "W13-F02": F02,
  "W13-F03": F03,
  "W13-F04": F04,
  "W13-F05": F05,
  "W13-F06": F06,
  "W13-F07": F07,
  "W13-F08": F08,
  "W13-F09": F09,
  "W13-F10": F10,
  "W13-F11": F11,
  "W13-F12": F12,
  "W13-F13": F13,
  "W13-F14": F14,
  "W13-F15": F15,
  "W13-F16": F16,
  "W13-F17": F17,
  "W13-F18": F18,
  "W13-F19": F19,
  "W13-F20": F20,
  "W13-F21": F21,
  "W13-F22": F22,
  "W13-F23": F23,
};
export default figures;
