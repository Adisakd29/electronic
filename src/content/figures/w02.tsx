// Week 2 figures — การป้องกันอุบัติเหตุทางไฟฟ้าและการรับมือเหตุฉุกเฉิน
import type { FigureMap } from "@/content/types";
import type { ReactNode } from "react";
import { Label, Callout, Arrow, Meter, Capacitor } from "./kit";

type Pt = [number, number];
const INK = "var(--fig-ink)";
const SKIN = "var(--fig-skin)";
const BG = "var(--fig-bg)";

// ---------------------------------------------------------------------------
// Local helpers (stick figures and icons)
// ---------------------------------------------------------------------------

/** Standing stick person. Feet on y. Head centre (x, y-150). */
function Person({
  x,
  y,
  stride = 14,
  hands,
  tone = INK,
}: {
  x: number;
  y: number;
  stride?: number;
  hands?: [Pt, Pt];
  tone?: string;
}) {
  const sh: Pt = [x, y - 122];
  const hip: Pt = [x, y - 68];
  const h = hands ?? [
    [x - 22, y - 70],
    [x + 22, y - 70],
  ];
  const elbow = (p: Pt): Pt => [(sh[0] + p[0]) / 2 + (p[0] < sh[0] ? -4 : 4), (sh[1] + p[1]) / 2 + 6];
  return (
    <g stroke={tone} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={x} y1={y - 134} x2={hip[0]} y2={hip[1]} />
      <line x1={hip[0]} y1={hip[1]} x2={x - stride} y2={y} />
      <line x1={hip[0]} y1={hip[1]} x2={x + stride} y2={y} />
      {h.map((p, i) => {
        const e = elbow(p);
        return <polyline key={i} points={`${sh[0]},${sh[1]} ${e[0]},${e[1]} ${p[0]},${p[1]}`} />;
      })}
      <circle cx={x} cy={y - 150} r={15} fill={SKIN} strokeWidth={3} />
    </g>
  );
}

/** Person lying on the back, head at (x, y), body extending toward +x (dir 1) or −x (dir −1). */
function Lying({ x, y, dir = 1, armTo, k = 1 }: { x: number; y: number; dir?: 1 | -1; armTo?: Pt; k?: number }) {
  const sx = x + dir * 22;
  const hip = x + dir * (22 + 88 * k);
  const foot = x + dir * (22 + 173 * k);
  return (
    <g stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={sx} y1={y} x2={hip} y2={y} />
      <line x1={hip} y1={y} x2={foot} y2={y - 4} />
      <line x1={hip} y1={y} x2={foot} y2={y + 6} />
      <polyline points={`${sx + dir * 14},${y} ${armTo ? `${armTo[0]},${armTo[1]}` : `${sx + dir * 60 * k},${y + 12}`}`} />
      <circle cx={x} cy={y} r={14} fill={SKIN} strokeWidth={3} />
    </g>
  );
}

function Bolt({ x, y, s = 1, color = "var(--fig-warn)" }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <path
      d={`M ${x + 4 * s} ${y - 16 * s} L ${x - 8 * s} ${y + 2 * s} L ${x} ${y + 2 * s} L ${x - 4 * s} ${y + 16 * s} L ${x + 8 * s} ${y - 2 * s} L ${x} ${y - 2 * s} Z`}
      fill={color}
      stroke={INK}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  );
}

function Box({
  x,
  y,
  w,
  h,
  tone = "info",
  lines,
  size = 21,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: "info" | "ok" | "danger" | "warn";
  lines: ReactNode[];
  size?: number;
}) {
  const n = lines.length;
  const gap = size + 6;
  const y0 = y + h / 2 - ((n - 1) * gap) / 2;
  return (
    <Callout x={x} y={y} w={w} h={h} tone={tone}>
      {lines.map((t, i) => (
        <Label key={i} x={x + w / 2} y={y0 + i * gap} size={size}>
          {t}
        </Label>
      ))}
    </Callout>
  );
}

function DownArrow({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return <Arrow from={[x, y1]} to={[x, y2]} color={INK} width={2.5} head={10} />;
}

// ---------------------------------------------------------------------------
// W02-F01 Step voltage around a fallen line
// ---------------------------------------------------------------------------
function StepVoltage() {
  const cx = 150;
  const cy = 300;
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <style>{`.w02f01-ring{animation:w02f01-p 3s ease-in-out infinite}@keyframes w02f01-p{0%,100%{opacity:.9}50%{opacity:.55}}`}</style>
      {/* potential rings (perspective ellipses) */}
      <ellipse cx={cx} cy={cy} rx={250} ry={52} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={1.5} strokeDasharray="6 6" />
      <ellipse className="w02f01-ring" cx={cx} cy={cy} rx={160} ry={34} fill="var(--fig-danger)" opacity={0.22} stroke="var(--fig-danger)" strokeWidth={1.5} strokeDasharray="6 6" />
      <ellipse className="w02f01-ring" cx={cx} cy={cy} rx={80} ry={17} fill="var(--fig-danger)" opacity={0.45} stroke="var(--fig-danger)" strokeWidth={1.5} />
      {/* pole and broken wire */}
      <rect x={34} y={60} width={12} height={240} fill="var(--fig-muted)" />
      <line x1={20} y1={72} x2={62} y2={72} stroke={INK} strokeWidth={4} />
      <path d={`M 56 72 Q 95 130 ${cx} ${cy}`} fill="none" stroke={INK} strokeWidth={3} />
      <Bolt x={cx + 4} y={cy - 18} s={1.1} />
      <Label x={70} y={36} anchor="start" size={22} weight={700}>สายไฟขาดตกพื้น</Label>
      {/* person A: long stride (danger) */}
      <Person x={250} y={312} stride={34} />
      <path d="M 218 310 L 250 246 L 282 310" fill="none" stroke="var(--fig-current)" strokeWidth={3} strokeDasharray="7 5" />
      <Arrow from={[268, 278]} to={[280, 304]} head={12} />
      <Label x={250} y={128} size={22} weight={700} color="var(--fig-danger)">✗ ก้าวยาว</Label>
      <Label x={250} y={334} size={20} weight={700} color="var(--fig-current)">แรงดันก้าวย่าง</Label>
      {/* person B: feet together */}
      <Person x={450} y={312} stride={5} />
      <Label x={460} y={128} size={22} weight={700} color="var(--fig-ok)">✓ เท้าชิด ก้าวสั้น</Label>
      {/* distance */}
      <line x1={cx} y1={352} x2={cx} y2={372} stroke={INK} strokeWidth={2} />
      <line x1={560} y1={350} x2={560} y2={372} stroke={INK} strokeWidth={2} />
      <Arrow from={[cx, 361]} to={[560, 361]} color={INK} width={2.5} />
      <Label x={355} y={386} size={22} weight={700}>ห่างจุดสายแตะพื้นอย่างน้อย 10 m</Label>
      <Callout x={300} y={14} w={290} h={50} tone="warn">
        <Label x={445} y={39} size={21}>แจ้ง กฟภ. 1129 / กฟน. 1130</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F02 LOTO six steps
// ---------------------------------------------------------------------------
function LotoSteps() {
  const panels: { t: [string, string]; icon: (cx: number, cy: number) => ReactNode }[] = [
    {
      t: ["แจ้งผู้เกี่ยวข้อง", "และหยุดเครื่อง"],
      icon: (cx, cy) => (
        <g>
          <path d={`M ${cx - 40} ${cy - 30} h 80 a 10 10 0 0 1 10 10 v 34 a 10 10 0 0 1 -10 10 h -46 l -18 16 v -16 h -16 a 10 10 0 0 1 -10 -10 v -34 a 10 10 0 0 1 10 -10 z`} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
          <Label x={cx} y={cy - 4} size={30} weight={700}>!</Label>
        </g>
      ),
    },
    {
      t: ["ปลดแหล่งจ่าย", "(เบรกเกอร์ OFF)"],
      icon: (cx, cy) => (
        <g>
          <rect x={cx - 24} y={cy - 38} width={48} height={76} rx={5} fill={BG} stroke={INK} strokeWidth={2.5} />
          <rect x={cx - 8} y={cy - 4} width={16} height={30} rx={3} fill={INK} />
          <Arrow from={[cx + 40, cy - 30]} to={[cx + 40, cy + 26]} />
        </g>
      ),
    },
    {
      t: ["ล็อกด้วย", "กุญแจส่วนตัว"],
      icon: (cx, cy) => (
        <g>
          <path d={`M ${cx - 16} ${cy - 6} v -16 a 16 16 0 0 1 32 0 v 16`} fill="none" stroke={INK} strokeWidth={5} />
          <rect x={cx - 26} y={cy - 6} width={52} height={42} rx={6} fill="var(--fig-warn)" stroke={INK} strokeWidth={2.5} />
          <circle cx={cx} cy={cy + 10} r={5} fill={INK} />
          <rect x={cx - 2} y={cy + 12} width={4} height={12} fill={INK} />
        </g>
      ),
    },
    {
      t: ["ติดป้ายเตือน", "ระบุชื่อ–วันที่"],
      icon: (cx, cy) => (
        <g>
          <path d={`M ${cx - 50} ${cy - 28} h 84 l 18 28 l -18 28 h -84 z`} fill="var(--fig-danger)" stroke={INK} strokeWidth={2.5} />
          <circle cx={cx + 30} cy={cy} r={5} fill={BG} />
          <Label x={cx - 12} y={cy + 1} size={20} weight={700} color={BG}>ห้ามสับ</Label>
        </g>
      ),
    },
    {
      t: ["คายพลังงาน", "ที่สะสมไว้"],
      icon: (cx, cy) => (
        <g>
          <Capacitor x={cx - 14} y={cy} />
          <Arrow from={[cx + 22, cy]} to={[cx + 46, cy]} color={INK} width={2.5} head={10} />
          <Label x={cx + 52} y={cy} anchor="start" size={20} weight={700}>0 V</Label>
        </g>
      ),
    },
    {
      t: ["พิสูจน์ไม่มีไฟ", "live–dead–live"],
      icon: (cx, cy) => (
        <g>
          <Meter x={cx} y={cy} kind="V" />
          <line x1={cx - 24} y1={cy + 18} x2={cx - 44} y2={cy + 36} stroke="var(--fig-wire-l)" strokeWidth={3} />
          <line x1={cx + 24} y1={cy + 18} x2={cx + 44} y2={cy + 36} stroke="var(--fig-wire-n)" strokeWidth={3} />
        </g>
      ),
    },
  ];
  return (
    <svg viewBox="0 0 600 384" aria-hidden="true">
      {panels.map((p, i) => {
        const c = i % 3;
        const r = Math.floor(i / 3);
        const x0 = 12 + c * 196;
        const y0 = 12 + r * 186;
        return (
          <g key={i}>
            <rect x={x0} y={y0} width={184} height={172} rx={12} fill="var(--fig-panel)" stroke="var(--fig-accent)" strokeWidth={2} />
            <circle cx={x0 + 24} cy={y0 + 24} r={16} fill="var(--fig-accent)" />
            <Label x={x0 + 24} y={y0 + 25} size={20} weight={700} color={BG}>{i + 1}</Label>
            {p.icon(x0 + 92, y0 + 70)}
            <Label x={x0 + 92} y={y0 + 128} size={20} weight={700}>{p.t[0]}</Label>
            <Label x={x0 + 92} y={y0 + 152} size={20}>{p.t[1]}</Label>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F03 Thai consumer unit (hotspot target, viewBox 600×380)
// ---------------------------------------------------------------------------
function Breaker({ x, y, w, h, off = false, text }: { x: number; y: number; w: number; h: number; off?: boolean; text?: string }) {
  const lx = x + w / 2 - 8;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <rect x={x + w / 2 - 14} y={y + 46} width={28} height={58} rx={4} fill="var(--fig-panel)" stroke={INK} strokeWidth={1.5} />
      <rect x={lx} y={off ? y + 76 : y + 50} width={16} height={24} rx={3} fill={off ? "var(--fig-danger)" : INK} />
      {text ? <Label x={x + w / 2} y={y + 24} size={20} weight={700}>{text}</Label> : null}
    </g>
  );
}

function ConsumerUnit() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <rect x={20} y={14} width={560} height={352} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={300} y={40} size={22} weight={700}>ตู้ควบคุมไฟฟ้า (consumer unit)</Label>
      <line x1={36} y1={150} x2={564} y2={150} stroke="var(--fig-muted)" strokeWidth={6} />
      {/* main 2P, OFF */}
      <Breaker x={70} y={84} w={104} h={136} off text="MAIN" />
      <Arrow from={[48, 112]} to={[48, 196]} head={13} />
      <Label x={122} y={240} size={20} weight={700}>เมน 2P</Label>
      <Label x={122} y={264} size={20} color="var(--fig-danger)" weight={700}>โยกลง OFF</Label>
      {/* RCBO */}
      <Breaker x={192} y={84} w={88} h={136} />
      <circle cx={262} cy={108} r={11} fill="var(--fig-warn)" stroke={INK} strokeWidth={2} />
      <Label x={262} y={109} size={20} weight={700}>T</Label>
      <Label x={213} y={108} size={20} weight={700}>30</Label>
      <Label x={236} y={240} size={20} weight={700}>RCBO</Label>
      <Label x={236} y={264} size={20}>30 mA</Label>
      {/* MCBs */}
      {["10", "16", "16", "20"].map((a, i) => (
        <Breaker key={i} x={300 + i * 64} y={84} w={54} h={136} text={a} />
      ))}
      <Label x={423} y={240} size={20} weight={700}>MCB วงจรย่อย (A)</Label>
      {/* busbars */}
      <rect x={60} y={286} width={210} height={22} rx={4} fill="var(--fig-wire-n)" stroke={INK} strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={80 + i * 34} cy={297} r={5} fill={BG} stroke={INK} strokeWidth={1.5} />
      ))}
      <Label x={165} y={334} size={20} weight={700}>บัสบาร์ N (ฟ้า)</Label>
      <rect x={330} y={286} width={210} height={22} rx={4} fill="var(--fig-wire-pe-g)" stroke={INK} strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={340 + i * 29} y={287} width={12} height={20} fill="var(--fig-wire-pe-y)" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={350 + i * 34} cy={297} r={5} fill={BG} stroke={INK} strokeWidth={1.5} />
      ))}
      <Label x={435} y={334} size={20} weight={700}>บัสบาร์ PE (เขียว–เหลือง)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F04 Separating a victim (low voltage): correct vs wrong
// ---------------------------------------------------------------------------
function SeparateVictim() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <line x1={300} y1={10} x2={300} y2={340} stroke="var(--fig-muted)" strokeWidth={2} strokeDasharray="8 6" />
      {/* LEFT: correct */}
      <Label x={150} y={26} size={22} weight={700} color="var(--fig-ok)">✓ ถูกต้อง</Label>
      <line x1={10} y1={300} x2={290} y2={300} stroke="var(--fig-muted)" strokeWidth={2} />
      <path d="M 280 50 C 270 150 250 230 236 284" fill="none" stroke={INK} strokeWidth={3} />
      <Bolt x={240} y={270} s={0.8} />
      <Lying x={160} y={290} dir={1} k={0.62} armTo={[228, 284]} />
      <rect x={20} y={300} width={86} height={12} rx={2} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={1.5} />
      <Person x={62} y={300} stride={14} hands={[[86, 200], [100, 192]]} />
      <line x1={80} y1={204} x2={232} y2={276} stroke="var(--fig-copper)" strokeWidth={7} strokeLinecap="round" />
      <Label x={176} y={196} size={20}>ด้ามไม้แห้งยาว</Label>
      <Label x={14} y={330} anchor="start" size={20}>ยืนบนแผ่นไม้แห้ง</Label>
      {/* RIGHT: wrong */}
      <Label x={450} y={26} size={22} weight={700} color="var(--fig-danger)">✗ อันตราย</Label>
      <line x1={310} y1={300} x2={590} y2={300} stroke="var(--fig-muted)" strokeWidth={2} />
      <path d="M 580 50 C 570 150 550 230 536 284" fill="none" stroke={INK} strokeWidth={3} />
      <Bolt x={540} y={270} s={0.8} />
      <Lying x={460} y={290} dir={1} k={0.62} armTo={[528, 284]} />
      <Person x={360} y={300} stride={16} hands={[[436, 284], [444, 288]]} />
      <path d="M 440 280 L 404 236 L 360 180 L 360 232 L 376 298" fill="none" stroke="var(--fig-current)" strokeWidth={3.5} strokeDasharray="8 5" />
      <Arrow from={[370, 270]} to={[376, 298]} head={13} />
      <Label x={440} y={92} size={20} weight={700} color="var(--fig-danger)">จับด้วยมือเปล่า</Label>
      <Label x={440} y={118} size={20}>กระแสผ่านผู้ช่วย</Label>
      <Label x={450} y={330} size={20}>กลายเป็นผู้ประสบภัยรายที่สอง</Label>
      <Callout x={10} y={350} w={580} h={44} tone="warn">
        <Label x={300} y={372} size={20}>ตัดไฟก่อนเสมอ — ใช้ไม้แห้งเฉพาะไฟแรงต่ำที่ตัดไม่ได้</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F05 Nine-step rescue flowchart
// ---------------------------------------------------------------------------
function RescueFlow() {
  const full = [
    { y: 12, t: "1 ประเมินความปลอดภัยรอบจุดเกิดเหตุ", tone: "danger" as const },
    { y: 76, t: "2 ตัดไฟ: โยกเมนเบรกเกอร์ / ถอดปลั๊ก", tone: "danger" as const },
    { y: 140, t: "3 ตัดไฟไม่ได้ → แยกด้วยวัตถุแห้ง", tone: "danger" as const },
    { y: 204, t: "4 โทร 1669 และขอ AED", tone: "info" as const },
    { y: 268, t: "5 ปลุกเรียก + ดูการหายใจ ≤ 10 วินาที", tone: "info" as const },
  ];
  return (
    <svg viewBox="0 0 600 752" aria-hidden="true">
      {full.map((b, i) => (
        <g key={i}>
          <Box x={40} y={b.y} w={520} h={48} tone={b.tone} lines={[b.t]} />
          <DownArrow x={300} y1={b.y + 48} y2={i < 4 ? b.y + 64 : 330} />
        </g>
      ))}
      {/* decision */}
      <path d="M 300 330 L 450 376 L 300 422 L 150 376 Z" fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={2.5} />
      <Label x={300} y={377} size={22} weight={700}>หายใจปกติไหม?</Label>
      <Wire2 points={[[150, 376], [150, 450]]} />
      <Wire2 points={[[450, 376], [450, 450]]} />
      <Label x={126} y={418} size={20} weight={700}>ไม่</Label>
      <Label x={476} y={418} size={20} weight={700}>ใช่</Label>
      <Box x={20} y={452} w={260} h={74} tone="danger" lines={["6ก ไม่หายใจ/หายใจเฮือก", "→ CPR + AED ทันที"]} size={20} />
      <Box x={320} y={452} w={260} h={74} tone="ok" lines={["6ข หายใจ → ท่าพักฟื้น", "(ไม่สงสัยบาดเจ็บหลัง)"]} size={20} />
      {/* left long arrow */}
      <DownArrow x={150} y1={526} y2={688} />
      <Label x={160} y={584} size={20} muted anchor="start">กดต่อเนื่อง</Label>
      <Label x={160} y={612} size={20} muted anchor="start">สลับคน ~2 นาที</Label>
      {/* right column */}
      <DownArrow x={450} y1={526} y2={546} />
      <Box x={320} y={548} w={260} h={48} lines={["7 ตรวจแผลทางเข้า–ออก"]} size={20} />
      <DownArrow x={450} y1={596} y2={616} />
      <Box x={320} y={618} w={260} h={48} lines={["8 ห่มผ้าห่มธรรมดา"]} size={20} />
      <DownArrow x={450} y1={666} y2={688} />
      <Box x={40} y={690} w={520} h={50} tone="ok" lines={["9 เฝ้าดูอาการจนทีมแพทย์รับช่วง"]} />
    </svg>
  );
}

function Wire2({ points }: { points: Pt[] }) {
  const [a, b] = points;
  return <Arrow from={a} to={b} color={INK} width={2.5} head={10} />;
}

// ---------------------------------------------------------------------------
// W02-F06 CPR infographic
// ---------------------------------------------------------------------------
function CprInfo() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <style>{`.w02f06-arm{animation:w02f06-push 0.545s ease-in-out infinite}@keyframes w02f06-push{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}`}</style>
      <line x1={10} y1={330} x2={590} y2={330} stroke="var(--fig-muted)" strokeWidth={2} />
      {/* rescuer (kneeling, behind the victim) */}
      <g className="w02f06-arm">
        <g stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1={210} y1={168} x2={292} y2={236} />
          <line x1={292} y1={236} x2={300} y2={326} />
          <line x1={300} y1={326} x2={372} y2={326} />
          <line x1={210} y1={168} x2={210} y2={278} />
          <line x1={226} y1={162} x2={206} y2={276} strokeWidth={5} />
        </g>
        <circle cx={232} cy={136} r={19} fill={SKIN} stroke={INK} strokeWidth={3} />
        <ellipse cx={210} cy={284} rx={18} ry={7} fill={SKIN} stroke={INK} strokeWidth={2} />
      </g>
      {/* victim lying on back */}
      <circle cx={88} cy={304} r={18} fill={SKIN} stroke={INK} strokeWidth={3} />
      <rect x={108} y={292} width={300} height={30} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <line x1={408} y1={302} x2={540} y2={300} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <line x1={408} y1={314} x2={540} y2={316} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      {/* guide: shoulders over hands */}
      <line x1={210} y1={96} x2={210} y2={150} stroke="var(--fig-accent)" strokeWidth={2} strokeDasharray="6 5" />
      <Label x={30} y={70} anchor="start" size={20}>แขนเหยียดตรง</Label>
      <Label x={30} y={96} anchor="start" size={20}>ไหล่อยู่เหนือมือ</Label>
      {/* depth arrow */}
      <line x1={168} y1={262} x2={168} y2={300} stroke="var(--fig-current)" strokeWidth={3} />
      <path d="M 168 304 l -7 -12 h 14 z" fill="var(--fig-current)" />
      <path d="M 168 258 l -7 12 h 14 z" fill="var(--fig-current)" />
      <Label x={158} y={240} size={20} weight={700} color="var(--fig-current)">5–6 cm</Label>
      {/* badges */}
      {[
        ["ลึก 5–6 cm", "danger"],
        ["100–120 ครั้ง/นาที", "danger"],
        ["ปล่อยอกคืนตัวสุดทุกครั้ง", "info"],
        ["30 : 2 หรือกดอย่างเดียว", "info"],
      ].map(([t, tone], i) => (
        <Box key={i} x={330} y={20 + i * 54} w={256} h={44} tone={tone as "danger" | "info"} lines={[t]} size={20} />
      ))}
      <Label x={300} y={366} size={20} weight={700}>วางส้นมือกลางหน้าอก (ครึ่งล่างกระดูกหน้าอก)</Label>
      <Label x={300} y={390} size={20} muted>ขัดจังหวะให้น้อยที่สุด สลับผู้กดทุก ~2 นาที</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F07 AED pad placement
// ---------------------------------------------------------------------------
function AedPads() {
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      {/* torso */}
      <path d="M 170 40 L 230 40 L 242 74 L 322 96 L 330 360 L 70 360 L 78 96 L 158 74 Z" fill={SKIN} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M 100 100 Q 150 90 196 98 M 204 98 Q 250 90 300 100" fill="none" stroke={INK} strokeWidth={2} />
      <line x1={200} y1={104} x2={200} y2={240} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
      <Label x={200} y={384} size={20} muted>(ภาพหน้าตรงของผู้ป่วย)</Label>
      {/* pad 1: patient's right upper chest (viewer's left) */}
      <rect x={104} y={112} width={70} height={52} rx={8} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={139} y={139} size={24} weight={700}>1</Label>
      {/* pad 2: patient's left side below armpit (viewer's right) */}
      <rect x={256} y={196} width={56} height={78} rx={8} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} transform="rotate(-12 284 235)" />
      <Label x={284} y={236} size={24} weight={700}>2</Label>
      {/* AED */}
      <rect x={420} y={170} width={150} height={120} rx={14} fill="var(--fig-panel)" stroke="var(--fig-ok)" strokeWidth={3} />
      <Label x={470} y={205} size={24} weight={700}>AED</Label>
      <Bolt x={530} y={204} s={1.2} />
      <circle cx={455} cy={256} r={16} fill="var(--fig-ok)" stroke={INK} strokeWidth={2} />
      <path d="M 455 247 v 9 M 448 250 a 9 9 0 1 0 14 0" fill="none" stroke={BG} strokeWidth={2.5} strokeLinecap="round" />
      <Label x={510} y={257} size={20}>เปิด</Label>
      <path d="M 420 210 C 300 180 240 150 176 140" fill="none" stroke={INK} strokeWidth={2} />
      <path d="M 420 250 C 370 250 340 240 312 236" fill="none" stroke={INK} strokeWidth={2} />
      <Callout x={360} y={20} w={226} h={82} tone="danger">
        <Label x={473} y={48} size={21} weight={700} color="var(--fig-danger)">ห้ามแตะผู้ป่วย</Label>
        <Label x={473} y={76} size={20}>ขณะวิเคราะห์/ช็อก</Label>
      </Callout>
      <Label x={495} y={318} size={20}>ทำตามเสียงเครื่อง</Label>
      <Label x={20} y={420} anchor="start" size={20}>แผ่น 1: ใต้ไหปลาร้าขวาของผู้ป่วย</Label>
      <Label x={20} y={450} anchor="start" size={20}>แผ่น 2: ข้างลำตัวซ้าย ใต้รักแร้ (แนวกลางรักแร้)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F08 Recovery position (4 steps, top view)
// ---------------------------------------------------------------------------
function RecoveryPosition() {
  const panel = (i: number, title: string, body: ReactNode) => {
    const c = i % 2;
    const r = Math.floor(i / 2);
    const x0 = 10 + c * 295;
    const y0 = 10 + r * 186;
    return (
      <g key={i}>
        <rect x={x0} y={y0} width={285} height={176} rx={12} fill="var(--fig-panel)" stroke="var(--fig-accent)" strokeWidth={2} />
        <Label x={x0 + 14} y={y0 + 24} anchor="start" size={20} weight={700}>{title}</Label>
        <g transform={`translate(${x0} ${y0})`}>{body}</g>
      </g>
    );
  };
  const S = { stroke: INK, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const hl = { ...S, stroke: "var(--fig-accent)" };
  const yc = 100;
  const head = (x: number, y: number) => <circle cx={x} cy={y} r={14} fill={SKIN} stroke={INK} strokeWidth={3} />;
  const base = (
    <g>
      <line x1={58} y1={yc} x2={160} y2={yc} {...S} />
      <line x1={160} y1={yc} x2={262} y2={yc - 12} {...S} />
    </g>
  );
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {panel(
        0,
        "1 แขนข้างใกล้ตั้งฉาก",
        <g>
          {base}
          <line x1={160} y1={yc} x2={262} y2={yc + 12} {...S} />
          <polyline points={`76,${yc - 4} 150,${yc - 22}`} {...S} />
          <polyline points={`76,${yc + 4} 76,${yc + 50} 40,${yc + 50}`} {...hl} />
          {head(40, yc)}
        </g>,
      )}
      {panel(
        1,
        "2 มือข้างไกลแนบแก้ม",
        <g>
          {base}
          <line x1={160} y1={yc} x2={262} y2={yc + 12} {...S} />
          <polyline points={`76,${yc + 4} 76,${yc + 50} 40,${yc + 50}`} {...S} />
          <polyline points={`76,${yc - 6} 104,${yc + 14} 54,${yc + 14}`} {...hl} />
          {head(40, yc)}
        </g>,
      )}
      {panel(
        2,
        "3 ชันเข่าข้างไกลขึ้น",
        <g>
          <line x1={58} y1={yc} x2={160} y2={yc} {...S} />
          <line x1={160} y1={yc} x2={262} y2={yc + 12} {...S} />
          <polyline points={`160,${yc - 4} 210,${yc - 44} 238,${yc - 10}`} {...hl} />
          <polyline points={`76,${yc + 4} 76,${yc + 50} 40,${yc + 50}`} {...S} />
          <polyline points={`76,${yc - 6} 104,${yc + 14} 54,${yc + 14}`} {...S} />
          {head(40, yc)}
        </g>,
      )}
      {panel(
        3,
        "4 ดึงเข่าพลิกตะแคง",
        <g>
          <line x1={58} y1={yc} x2={160} y2={yc} {...S} />
          <line x1={160} y1={yc} x2={262} y2={yc - 6} {...S} />
          <polyline points={`160,${yc + 2} 200,${yc + 46} 250,${yc + 46}`} {...hl} />
          <polyline points={`76,${yc + 4} 104,${yc + 30} 60,${yc + 30}`} {...S} />
          {head(40, yc + 6)}
          <path d={`M 30 ${yc + 16} q 6 8 14 6`} fill="none" stroke={INK} strokeWidth={2.5} />
          <Label x={150} y={yc + 66} size={20} weight={700}>ศีรษะเงย ปากต่ำ</Label>
        </g>,
      )}
      <Label x={300} y={400} size={20} weight={700}>ใช้เมื่อ: ไม่รู้สึกตัว แต่หายใจปกติ — เฝ้าดูการหายใจตลอด</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F09 Fire classes and suitable extinguishers
// ---------------------------------------------------------------------------
function FireShape({ k, x, y }: { k: string; x: number; y: number }) {
  const txt = <Label x={x} y={y + (k === "A" ? 6 : 1)} size={22} weight={700} color={BG}>{k}</Label>;
  switch (k) {
    case "A":
      return (
        <g>
          <path d={`M ${x} ${y - 24} L ${x + 26} ${y + 20} L ${x - 26} ${y + 20} Z`} fill="var(--fig-ok)" stroke={INK} strokeWidth={2} />
          {txt}
        </g>
      );
    case "B":
      return (
        <g>
          <rect x={x - 21} y={y - 21} width={42} height={42} fill="var(--fig-danger)" stroke={INK} strokeWidth={2} />
          {txt}
        </g>
      );
    case "C":
      return (
        <g>
          <circle cx={x} cy={y} r={23} fill="var(--fig-accent)" stroke={INK} strokeWidth={2} />
          {txt}
        </g>
      );
    case "D": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 ? 12 : 26;
        return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return (
        <g>
          <polygon points={pts} fill="var(--fig-warn)" stroke={INK} strokeWidth={2} />
          <Label x={x} y={y + 2} size={18} weight={700}>{k}</Label>
        </g>
      );
    }
    default: {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return `${(x + 24 * Math.cos(a)).toFixed(1)},${(y + 24 * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return (
        <g>
          <polygon points={pts} fill={INK} stroke={INK} strokeWidth={2} />
          {txt}
        </g>
      );
    }
  }
}

function FireClasses() {
  const rows: [string, string, string, string?][] = [
    ["A", "ไม้ กระดาษ ผ้า ยาง", "ABC, โฟม, น้ำ"],
    ["B", "น้ำมัน แก๊ส ทินเนอร์", "CO₂, โฟม, ABC"],
    ["C", "อุปกรณ์ไฟฟ้าที่มีไฟอยู่", "CO₂ หรือ ABC", "ห้ามน้ำ / โฟม"],
    ["D", "โลหะติดไฟ (แมกนีเซียม)", "ถังชนิด D เฉพาะ"],
    ["K", "น้ำมันทอดในครัว", "ถังชนิด K"],
  ];
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <rect x={10} y={10} width={580} height={46} rx={8} fill="var(--fig-panel)" stroke={INK} strokeWidth={2} />
      <Label x={60} y={34} size={20} weight={700}>ประเภท</Label>
      <Label x={230} y={34} size={20} weight={700}>เชื้อเพลิง</Label>
      <Label x={475} y={34} size={20} weight={700}>ถังที่ใช้ได้</Label>
      {rows.map(([k, fuel, ext, warn], i) => {
        const y = 62 + i * 70;
        return (
          <g key={k}>
            <rect
              x={10}
              y={y}
              width={580}
              height={64}
              rx={8}
              fill={k === "C" ? "var(--fig-accent-soft)" : BG}
              stroke={k === "C" ? "var(--fig-accent)" : "var(--fig-grid)"}
              strokeWidth={k === "C" ? 3 : 1.5}
            />
            <FireShape k={k} x={60} y={y + 32} />
            <Label x={120} y={y + 33} anchor="start" size={20}>{fuel}</Label>
            {warn ? (
              <g>
                <Label x={475} y={y + 20} size={20} weight={700}>{ext}</Label>
                <Label x={475} y={y + 46} size={20} weight={700} color="var(--fig-danger)">✗ {warn}</Label>
              </g>
            ) : (
              <Label x={475} y={y + 33} size={20}>{ext}</Label>
            )}
          </g>
        );
      })}
      <line x1={110} y1={62} x2={110} y2={408} stroke="var(--fig-grid)" strokeWidth={1.5} />
      <line x1={360} y1={62} x2={360} y2={408} stroke="var(--fig-grid)" strokeWidth={1.5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F10 Calling 1669
// ---------------------------------------------------------------------------
function Call1669() {
  const items = [
    "1 เกิดอะไร: คนถูกไฟฟ้าดูด",
    "2 ที่ไหน + จุดสังเกตใกล้เคียง",
    "3 กี่คน รู้สึกตัว/หายใจไหม",
    "4 ไฟฟ้ายังมีอยู่หรือไม่",
    "5 ชื่อและเบอร์ผู้แจ้ง",
  ];
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <rect x={30} y={14} width={170} height={350} rx={24} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <rect x={42} y={46} width={146} height={270} rx={8} fill={BG} stroke={INK} strokeWidth={1.5} />
      <Label x={115} y={110} size={42} weight={700}>1669</Label>
      <Label x={115} y={152} size={20}>แพทย์ฉุกเฉิน</Label>
      <circle cx={115} cy={250} r={28} fill="var(--fig-ok)" stroke={INK} strokeWidth={2} />
      <path d="M 102 240 q 0 -6 6 -6 l 4 8 l -4 4 q 4 8 12 12 l 4 -4 l 8 4 q 0 6 -6 6 q -24 -2 -24 -24 z" fill={BG} />
      <Label x={115} y={340} size={20} muted>ฟรี 24 ชั่วโมง</Label>
      <Label x={230} y={34} anchor="start" size={22} weight={700}>บอกเจ้าหน้าที่ให้ครบ</Label>
      {items.map((t, i) => (
        <Label key={i} x={230} y={80 + i * 44} anchor="start" size={20}>{t}</Label>
      ))}
      <Callout x={222} y={300} w={366} h={64} tone="warn">
        <Label x={405} y={322} size={20} weight={700}>อย่าวางสายก่อน เปิดลำโพง</Label>
        <Label x={405} y={348} size={20}>ทำตามคำแนะนำ (กดหน้าอก ฯลฯ)</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F11 Spot the mistakes in a rescue scene (findFault, viewBox 600×400)
// ---------------------------------------------------------------------------
function RescueMistakes() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <rect x={0} y={0} width={600} height={320} fill="var(--fig-panel)" />
      <line x1={0} y1={320} x2={600} y2={320} stroke={INK} strokeWidth={2} />
      {/* consumer unit with main still ON */}
      <rect x={470} y={36} width={104} height={110} rx={8} fill={BG} stroke={INK} strokeWidth={2.5} />
      <rect x={488} y={56} width={30} height={60} rx={4} fill="var(--fig-panel)" stroke={INK} strokeWidth={1.5} />
      <rect x={495} y={60} width={16} height={24} rx={3} fill={INK} />
      <Label x={546} y={74} size={20} weight={700}>ON</Label>
      <rect x={530} y={92} width={14} height={36} rx={2} fill="var(--fig-panel)" stroke={INK} strokeWidth={1.5} />
      <rect x={550} y={92} width={14} height={36} rx={2} fill="var(--fig-panel)" stroke={INK} strokeWidth={1.5} />
      {/* AED sign */}
      <rect x={290} y={50} width={96} height={64} rx={8} fill="var(--fig-ok)" stroke={INK} strokeWidth={2} />
      <Label x={322} y={83} size={22} weight={700} color={BG}>AED</Label>
      <Bolt x={364} y={82} s={0.9} color={BG} />
      {/* outlet + extension cord */}
      <rect x={44} y={210} width={36} height={46} rx={5} fill={BG} stroke={INK} strokeWidth={2} />
      <path d="M 62 248 L 62 330 Q 62 340 80 340 L 170 340" fill="none" stroke={INK} strokeWidth={4} />
      <rect x={166} y={326} width={34} height={22} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      {/* broom (correct tool) */}
      <line x1={262} y1={150} x2={282} y2={300} stroke="var(--fig-copper)" strokeWidth={7} strokeLinecap="round" />
      <path d="M 270 296 L 296 296 L 300 318 L 262 318 Z" fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2} />
      {/* puddle */}
      <ellipse cx={270} cy={356} rx={170} ry={18} fill="var(--fig-wire-n)" opacity={0.35} />
      {/* victim */}
      <Lying x={236} y={346} dir={1} armTo={[204, 340]} />
      {/* electric blanket */}
      <rect x={390} y={276} width={96} height={40} rx={8} fill="var(--fig-danger-soft)" stroke={INK} strokeWidth={2} />
      <path d="M 396 290 h 84 M 396 302 h 84" stroke="var(--fig-danger)" strokeWidth={1.5} strokeDasharray="4 4" />
      <path d="M 486 300 q 20 0 22 18" fill="none" stroke={INK} strokeWidth={3} />
      <Label x={438} y={258} size={20} weight={700}>ผ้าห่มไฟฟ้า</Label>
      {/* helper grabbing with bare hands, standing in water */}
      <Person x={150} y={356} stride={16} hands={[[200, 334], [206, 340]]} />
      {/* friend with phone dialling 911 */}
      <Person x={540} y={356} stride={14} hands={[[512, 234], [568, 286]]} />
      <rect x={480} y={196} width={40} height={56} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={500} y={225} size={20} weight={700}>911</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// W02-F12 PASS
// ---------------------------------------------------------------------------
function Extinguisher({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 16} y={y - 30} width={32} height={66} rx={12} fill="var(--fig-danger)" stroke={INK} strokeWidth={2} />
      <rect x={x - 8} y={y - 42} width={16} height={14} fill={INK} />
      <path d={`M ${x - 4} ${y - 42} l -18 -10 h 30`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}
function Flame({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M ${x} ${y - 34} C ${x + 18} ${y - 14} ${x + 22} ${y} ${x + 12} ${y + 10} L ${x - 12} ${y + 10} C ${x - 22} ${y} ${x - 14} ${y - 12} ${x - 4} ${y - 20} C ${x - 2} ${y - 10} ${x + 4} ${y - 8} ${x} ${y - 34} Z`}
      fill="var(--fig-warn)"
      stroke="var(--fig-danger)"
      strokeWidth={2.5}
    />
  );
}

function Pass() {
  const cols = [
    { l: "P", en: "Pull", th: "ดึงสลัก" },
    { l: "A", en: "Aim", th: "เล็งที่ฐานไฟ" },
    { l: "S", en: "Squeeze", th: "บีบคันบีบ" },
    { l: "S", en: "Sweep", th: "ส่ายซ้าย–ขวา" },
  ];
  return (
    <svg viewBox="0 0 600 310" aria-hidden="true">
      {cols.map((c, i) => {
        const x0 = 8 + i * 148;
        const cx = x0 + 70;
        return (
          <g key={i}>
            <rect x={x0} y={8} width={140} height={250} rx={12} fill="var(--fig-panel)" stroke="var(--fig-accent)" strokeWidth={2} />
            <Label x={cx} y={36} size={26} weight={700}>{c.l}</Label>
            <Label x={cx} y={62} size={20} muted>{c.en}</Label>
            {i === 0 ? (
              <g>
                <Extinguisher x={cx - 10} y={150} />
                <circle cx={cx + 34} cy={104} r={9} fill="none" stroke={INK} strokeWidth={3} />
                <Arrow from={[cx + 6, 110]} to={[cx + 44, 92]} head={10} />
              </g>
            ) : null}
            {i === 1 ? (
              <g>
                <Extinguisher x={cx - 34} y={150} />
                <line x1={cx - 30} y1={120} x2={cx + 6} y2={176} stroke={INK} strokeWidth={4} strokeLinecap="round" />
                <Flame x={cx + 36} y={176} />
                <Arrow from={[cx + 6, 182]} to={[cx + 24, 184]} head={9} color="var(--fig-accent)" />
              </g>
            ) : null}
            {i === 2 ? (
              <g>
                <Extinguisher x={cx} y={150} />
                <Arrow from={[cx + 30, 92]} to={[cx + 30, 116]} head={10} />
                <Arrow from={[cx - 30, 80]} to={[cx - 6, 100]} head={10} />
              </g>
            ) : null}
            {i === 3 ? (
              <g>
                <Flame x={cx} y={176} />
                <path d={`M ${cx - 44} 206 Q ${cx} 226 ${cx + 44} 206`} fill="none" stroke="var(--fig-accent)" strokeWidth={3} />
                <path d={`M ${cx + 44} 206 l -14 -2 l 6 10 z M ${cx - 44} 206 l 14 -2 l -6 10 z`} fill="var(--fig-accent)" />
                <line x1={cx - 50} y1={110} x2={cx - 10} y2={180} stroke={INK} strokeWidth={4} strokeLinecap="round" />
              </g>
            ) : null}
            <Label x={cx} y={238} size={20} weight={700}>{c.th}</Label>
          </g>
        );
      })}
      <Label x={300} y={290} size={20}>ยืนห่าง ~2–3 m เหนือลม หันหลังให้ทางหนีไฟ</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W02-F01": StepVoltage,
  "W02-F02": LotoSteps,
  "W02-F03": ConsumerUnit,
  "W02-F04": SeparateVictim,
  "W02-F05": RescueFlow,
  "W02-F06": CprInfo,
  "W02-F07": AedPads,
  "W02-F08": RecoveryPosition,
  "W02-F09": FireClasses,
  "W02-F10": Call1669,
  "W02-F11": RescueMistakes,
  "W02-F12": Pass,
};
export default figures;
