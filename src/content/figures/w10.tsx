/**
 * Week 10 — หม้อแปลงไฟฟ้า (Transformer) figures.
 * Original drawings; IEC 60617 style; theme tokens only.
 */
import type { FigureMap } from "@/content/types";
import { ACSource, Arrow, Callout, DCSource, Ground, Label, Lamp, Meter, Node, Resistor, SwitchSym, Terminal, Wire } from "./kit";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const MUTED = "var(--fig-muted)";
const CU = "var(--fig-copper)";
const CU_SOFT = "var(--fig-copper-soft)";
const FIELD = "var(--fig-field)";
const OK = "var(--fig-ok)";
const DANGER = "var(--fig-danger)";

type Pt = [number, number];

/** Vertical coil symbol (IEC semicircle form). dir 1 = bumps to the right, −1 = to the left. */
function CoilV({ x, y, len = 100, turns = 4, dir = 1, width = 3 }: { x: number; y: number; len?: number; turns?: number; dir?: 1 | -1; width?: number }) {
  const h = len / turns;
  let d = `M ${x} ${y - len / 2}`;
  for (let i = 0; i < turns; i++) d += ` A ${h / 2} ${h / 2} 0 0 ${dir === 1 ? 1 : 0} ${x} ${y - len / 2 + (i + 1) * h}`;
  return <path d={d} fill="none" stroke={INK} strokeWidth={width} strokeLinejoin="round" />;
}

/** Two parallel core lines (solid = iron; dashed = ferrite). */
function CoreLines({ x, y1, y2, gap = 10, dash }: { x: number; y1: number; y2: number; gap?: number; dash?: string }) {
  return (
    <g stroke={INK} strokeWidth={3} strokeDasharray={dash}>
      <line x1={x - gap / 2} y1={y1} x2={x - gap / 2} y2={y2} />
      <line x1={x + gap / 2} y1={y1} x2={x + gap / 2} y2={y2} />
    </g>
  );
}

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={6} fill={INK} />;
}

function sine(x0: number, yc: number, w: number, amp: number, invert = false, cycles = 1.5): string {
  const n = 60;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const yy = yc - (invert ? -1 : 1) * amp * Math.sin(2 * Math.PI * cycles * t);
    d += `${i === 0 ? "M" : " L"} ${(x0 + t * w).toFixed(1)} ${yy.toFixed(1)}`;
  }
  return d;
}

/** Turns drawn across a vertical core leg (front view). */
function LegTurns({ x1, x2, yTop, yBot, n, width = 4 }: { x1: number; x2: number; yTop: number; yBot: number; n: number; width?: number }) {
  const step = n > 1 ? (yBot - yTop) / (n - 1) : 0;
  return (
    <g stroke={CU} strokeWidth={width} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => (
        <line key={i} x1={x1} y1={yTop + i * step + 6} x2={x2} y2={yTop + i * step - 6} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// F01 — EI transformer cross-section (hotspot figure, viewBox 600×450)
// ---------------------------------------------------------------------------
function EIStructure() {
  const winding = (side: "L" | "R") => {
    // left window spans 190–260, right window 340–410 (from centre leg outwards)
    const s = side === "L" ? -1 : 1;
    const cx = side === "L" ? 260 : 340; // centre-leg face
    const bob = [cx, cx + s * 6];
    const pri = [cx + s * 6, cx + s * 30];
    const ins = [cx + s * 30, cx + s * 36];
    const sec = [cx + s * 36, cx + s * 64];
    const rx = (a: number[]) => Math.min(a[0], a[1]);
    const rw = (a: number[]) => Math.abs(a[1] - a[0]);
    const priDots: Pt[] = [];
    for (let yy = 148; yy <= 316; yy += 8) for (let k = 0; k < 3; k++) priDots.push([rx(pri) + 4 + k * 8, yy]);
    const secDots: Pt[] = [];
    for (let yy = 152; yy <= 312; yy += 14) for (let k = 0; k < 2; k++) secDots.push([rx(sec) + 7 + k * 14, yy]);
    return (
      <g>
        <rect x={rx(bob)} y={138} width={rw(bob)} height={186} fill={MUTED} />
        <rect x={rx(pri)} y={142} width={rw(pri)} height={178} fill={CU_SOFT} stroke={CU} strokeWidth={1.5} />
        {priDots.map(([a, b], i) => (
          <circle key={i} cx={a} cy={b} r={2.6} fill={CU} />
        ))}
        <rect x={rx(ins)} y={140} width={rw(ins)} height={182} fill="var(--fig-glow)" stroke={INK} strokeWidth={1} />
        <rect x={rx(sec)} y={142} width={rw(sec)} height={178} fill={CU_SOFT} stroke={CU} strokeWidth={1.5} />
        {secDots.map(([a, b], i) => (
          <circle key={i} cx={a} cy={b} r={5.5} fill={CU} />
        ))}
      </g>
    );
  };
  return (
    <svg viewBox="0 0 600 450" aria-hidden="true">
      {/* I lamination (slightly lifted to show the E-I split) */}
      <rect x={150} y={92} width={300} height={34} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* E lamination */}
      <path d="M 150 132 L 190 132 L 190 330 L 260 330 L 260 132 L 340 132 L 340 330 L 410 330 L 410 132 L 450 132 L 450 370 L 150 370 Z" fill={PANEL} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      {winding("L")}
      {winding("R")}
      {/* terminals & leads */}
      <Wire points={[[215, 58], [215, 92]]} width={2} dash="5 4" />
      <Wire points={[[245, 58], [245, 92]]} width={2} dash="5 4" />
      <Wire points={[[355, 58], [355, 92]]} width={2} dash="5 4" />
      <Wire points={[[385, 58], [385, 92]]} width={2} dash="5 4" />
      <Terminal x={215} y={52} />
      <Terminal x={245} y={52} />
      <Terminal x={355} y={52} />
      <Terminal x={385} y={52} />
      <Label x={230} y={22} size={20}>ขั้ว P 230 V</Label>
      <Label x={370} y={22} size={20}>ขั้ว S 12 V</Label>
      {/* leaders */}
      <Wire points={[[150, 109], [100, 109]]} width={1.5} color={MUTED} />
      <Label x={70} y={109} size={22}>แผ่น I</Label>
      <Wire points={[[150, 352], [100, 352]]} width={1.5} color={MUTED} />
      <Label x={60} y={352} size={22}>แผ่น E</Label>
      <Wire points={[[210, 230], [142, 230]]} width={1.5} color={MUTED} />
      <Label x={138} y={206} size={20} anchor="end">ขดทุติยภูมิ</Label>
      <Label x={138} y={232} size={20} anchor="end" muted>ลวดใหญ่</Label>
      <Label x={138} y={256} size={20} anchor="end" muted>อยู่ด้านนอก</Label>
      <Wire points={[[358, 190], [462, 190]]} width={1.5} color={MUTED} />
      <Label x={466} y={166} size={20} anchor="start">ขดปฐมภูมิ</Label>
      <Label x={466} y={192} size={20} anchor="start" muted>ลวดเล็ก</Label>
      <Label x={466} y={216} size={20} anchor="start" muted>อยู่ด้านใน</Label>
      <Wire points={[[373, 290], [462, 290]]} width={1.5} color={MUTED} />
      <Label x={466} y={278} size={20} anchor="start">ฉนวนคั่น</Label>
      <Label x={466} y={302} size={20} anchor="start" muted>ระหว่างขด</Label>
      {/* lamination stack inset */}
      <g>
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={40 + i * 11} y={392} width={8} height={40} fill={PANEL} stroke={INK} strokeWidth={1.5} />
        ))}
      </g>
      <Label x={208} y={402} size={20} anchor="start">ขอบแผ่นลามิเนตซ้อนกัน (มองด้านข้าง)</Label>
      <Label x={208} y={426} size={20} anchor="start" muted>ทุกแผ่นเคลือบฉนวนบาง ๆ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 — principle: closed core, flux Φ, Np/Ns, Vp/Vs, Ip/Is
// ---------------------------------------------------------------------------
function Principle() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <style>{`.w10f02-flux{animation:w10f02 3s linear infinite}@keyframes w10f02{to{stroke-dashoffset:-56}}`}</style>
      {/* core */}
      <path d="M 160 80 H 440 V 320 H 160 Z M 200 120 V 280 H 400 V 120 Z" fill={PANEL} stroke={INK} strokeWidth={3} fillRule="evenodd" />
      {/* flux path */}
      <rect x={180} y={100} width={240} height={200} fill="none" stroke={FIELD} strokeWidth={2.5} strokeDasharray="14 14" className="w10f02-flux" />
      <Arrow from={[280, 100]} to={[330, 100]} color={FIELD} head={14} />
      <Arrow from={[330, 300]} to={[280, 300]} color={FIELD} head={14} />
      <Label x={300} y={146} size={26} weight={700} color={FIELD}>Φ</Label>
      {/* windings */}
      <LegTurns x1={150} x2={210} yTop={140} yBot={262} n={8} />
      <LegTurns x1={390} x2={450} yTop={160} yBot={244} n={4} width={6} />
      <Label x={250} y={210} size={24}>Np</Label>
      <Label x={352} y={210} size={24}>Ns</Label>
      {/* primary circuit */}
      <Wire points={[[150, 146], [90, 146], [90, 160]]} />
      <Wire points={[[150, 256], [90, 256], [90, 240]]} />
      <ACSource x={90} y={200} angle={90} />
      <Label x={34} y={200} size={24}>Vp</Label>
      <Arrow from={[100, 128]} to={[140, 128]} label="Ip" labelOffset={[0, -16]} />
      {/* secondary circuit */}
      <Wire points={[[450, 166], [530, 166], [530, 160]]} />
      <Wire points={[[450, 238], [530, 238], [530, 240]]} />
      <Resistor x={530} y={200} angle={90} />
      <Label x={492} y={200} size={24}>Vs</Label>
      <Arrow from={[460, 148]} to={[505, 148]} label="Is" labelOffset={[0, -16]} />
      <Label x={300} y={350} size={22} muted>แกนเหล็กลามิเนต = ทางเดินของฟลักซ์</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 — symbols
// ---------------------------------------------------------------------------
function Symbols() {
  const pair = (cx: number, cy: number, core: "iron" | "ferrite" | "air") => (
    <g>
      <CoilV x={cx - 22} y={cy} len={96} turns={4} dir={1} />
      <CoilV x={cx + 22} y={cy} len={96} turns={4} dir={-1} />
      {core !== "air" ? <CoreLines x={cx} y1={cy - 50} y2={cy + 50} gap={8} dash={core === "ferrite" ? "8 6" : undefined} /> : null}
      <Wire points={[[cx - 22, cy - 48], [cx - 60, cy - 48]]} />
      <Wire points={[[cx - 22, cy + 48], [cx - 60, cy + 48]]} />
      <Wire points={[[cx + 22, cy - 48], [cx + 60, cy - 48]]} />
      <Wire points={[[cx + 22, cy + 48], [cx + 60, cy + 48]]} />
      <Terminal x={cx - 64} y={cy - 48} />
      <Terminal x={cx - 64} y={cy + 48} />
      <Terminal x={cx + 64} y={cy - 48} />
      <Terminal x={cx + 64} y={cy + 48} />
    </g>
  );
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {pair(100, 95, "iron")}
      {pair(300, 95, "ferrite")}
      {pair(500, 95, "air")}
      <Label x={100} y={178} size={20}>แกนเหล็ก</Label>
      <Label x={300} y={178} size={20}>แกนเฟอร์ไรต์</Label>
      <Label x={500} y={178} size={20}>แกนอากาศ</Label>
      {/* centre tap */}
      <g>
        <CoilV x={78} y={300} len={96} turns={4} dir={1} />
        <CoilV x={122} y={276} len={48} turns={2} dir={-1} />
        <CoilV x={122} y={324} len={48} turns={2} dir={-1} />
        <CoreLines x={100} y1={250} y2={350} gap={8} />
        <Wire points={[[78, 252], [40, 252]]} />
        <Wire points={[[78, 348], [40, 348]]} />
        <Wire points={[[122, 252], [160, 252]]} />
        <Wire points={[[122, 300], [160, 300]]} />
        <Wire points={[[122, 348], [160, 348]]} />
        <Terminal x={36} y={252} />
        <Terminal x={36} y={348} />
        <Terminal x={164} y={252} />
        <Terminal x={164} y={300} />
        <Terminal x={164} y={348} />
        <Label x={184} y={300} size={20} anchor="start">0</Label>
      </g>
      <Label x={100} y={388} size={20}>แท็ปกลาง 12-0-12 V</Label>
      {/* autotransformer: one winding with tap */}
      <g>
        <CoilV x={300} y={300} len={112} turns={6} dir={-1} />
        <CoreLines x={274} y1={244} y2={356} gap={8} />
        <Wire points={[[300, 356], [340, 356]]} />
        <Wire points={[[300, 300], [362, 300]]} />
        <Wire points={[[300, 244], [300, 232], [240, 232]]} />
        <Wire points={[[300, 356], [300, 368], [240, 368]]} />
        <Terminal x={236} y={232} />
        <Terminal x={236} y={368} />
        <Terminal x={366} y={300} />
        <Terminal x={344} y={356} />
        <Label x={366} y={274} size={20}>แท็ป</Label>
      </g>
      <Label x={300} y={400} size={20}>ออโต้ (ขดเดียว)</Label>
      {/* IEC form 1: two overlapping circles */}
      <g>
        <circle cx={482} cy={300} r={34} fill="none" stroke={INK} strokeWidth={3} />
        <circle cx={518} cy={300} r={34} fill="none" stroke={INK} strokeWidth={3} />
        <Wire points={[[448, 300], [420, 300]]} />
        <Wire points={[[552, 300], [580, 300]]} />
      </g>
      <Label x={500} y={388} size={20}>แบบวงกลมคู่</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 — core type / shell type / toroid
// ---------------------------------------------------------------------------
function CoreForms() {
  return (
    <svg viewBox="0 0 600 320" aria-hidden="true">
      {/* core type */}
      <path d="M 30 40 H 170 V 220 H 30 Z M 62 72 V 188 H 138 V 72 Z" fill={PANEL} stroke={INK} strokeWidth={3} fillRule="evenodd" />
      <rect x={22} y={88} width={48} height={84} rx={6} fill={CU_SOFT} stroke={CU} strokeWidth={3} />
      <rect x={130} y={88} width={48} height={84} rx={6} fill={CU} stroke={CU} strokeWidth={3} />
      <Label x={46} y={130} size={20} weight={700}>P</Label>
      <Label x={154} y={130} size={20} weight={700} color={BG}>S</Label>
      <Label x={100} y={260} size={22}>แบบแกน</Label>
      <Label x={100} y={290} size={20} muted>ขด P/S คนละขา</Label>
      {/* shell type */}
      <path d="M 220 40 H 380 V 220 H 220 Z M 250 70 V 190 H 280 V 70 Z M 320 70 V 190 H 350 V 70 Z" fill={PANEL} stroke={INK} strokeWidth={3} fillRule="evenodd" />
      <rect x={270} y={78} width={60} height={104} rx={6} fill={CU} stroke={CU} strokeWidth={3} />
      <rect x={278} y={86} width={44} height={88} rx={4} fill={CU_SOFT} stroke={CU} strokeWidth={2} />
      <rect x={288} y={70} width={24} height={120} fill={PANEL} stroke={INK} strokeWidth={2} />
      <Label x={300} y={260} size={22}>แบบเปลือก (E-I)</Label>
      <Label x={300} y={290} size={20} muted>ขดซ้อนบนขากลาง</Label>
      {/* toroid */}
      <circle cx={500} cy={130} r={82} fill={PANEL} stroke={INK} strokeWidth={3} />
      <circle cx={500} cy={130} r={44} fill={BG} stroke={INK} strokeWidth={3} />
      <g stroke={CU} strokeWidth={4} strokeLinecap="round">
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * 2 * Math.PI;
          return <line key={i} x1={500 + 40 * Math.cos(a)} y1={130 + 40 * Math.sin(a)} x2={500 + 87 * Math.cos(a)} y2={130 + 87 * Math.sin(a)} />;
        })}
      </g>
      <Label x={500} y={260} size={22}>ทอรอยด์</Label>
      <Label x={500} y={290} size={20} muted>ฟลักซ์รั่วน้อย</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 — power flow
// ---------------------------------------------------------------------------
function PowerFlow() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <path d="M 20 60 L 330 60 L 330 150 L 20 150 Z" fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={2.5} />
      <path d="M 330 60 L 520 60 L 520 40 L 585 100 L 520 160 L 520 140 L 330 140 Z" fill="var(--fig-accent-soft)" stroke="var(--fig-accent)" strokeWidth={2.5} strokeLinejoin="round" />
      {/* loss branches */}
      <path d="M 170 150 L 170 250 L 155 250 L 180 290 L 205 250 L 190 250 L 190 150 Z" fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M 290 150 L 290 250 L 275 250 L 300 290 L 325 250 L 310 250 L 310 150 Z" fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={2.5} strokeLinejoin="round" />
      <Label x={90} y={93} size={24} weight={700}>Pin</Label>
      <Label x={90} y={122} size={20}>50 W</Label>
      <Label x={460} y={88} size={24} weight={700}>Pout</Label>
      <Label x={460} y={116} size={20}>46 W</Label>
      <Label x={110} y={210} size={20} anchor="end">Pcu ขดลวด</Label>
      <Label x={110} y={236} size={20} anchor="end" muted>ขึ้นกับโหลด</Label>
      <Label x={330} y={210} size={20} anchor="start">Pcore แกนเหล็ก</Label>
      <Label x={330} y={236} size={20} anchor="start" muted>เกือบคงที่</Label>
      <Label x={240} y={316} size={20}>รวมการสูญเสีย 4 W → ความร้อน</Label>
      <Label x={300} y={22} size={20} muted>η = 46/50 × 100% = 92% (ความกว้างแถบไม่ตามสเกล)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 — solid vs laminated core (eddy currents)
// ---------------------------------------------------------------------------
function Eddy() {
  const fluxDots = (x0: number) => (
    <g>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <g key={`${r}${c}`}>
            <circle cx={x0 + 40 + c * 60} cy={90 + r * 60} r={7} fill="none" stroke={FIELD} strokeWidth={2} />
            <circle cx={x0 + 40 + c * 60} cy={90 + r * 60} r={2.2} fill={FIELD} />
          </g>
        )),
      )}
    </g>
  );
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      {/* solid */}
      <rect x={40} y={50} width={200} height={200} fill={PANEL} stroke={INK} strokeWidth={3} />
      {fluxDots(50)}
      <ellipse cx={140} cy={150} rx={80} ry={80} fill="none" stroke={DANGER} strokeWidth={4} />
      <Arrow from={[140, 70]} to={[150, 70]} color={DANGER} head={16} />
      <Label x={140} y={282} size={22} color={DANGER} weight={700}>✗ แกนตัน</Label>
      <Label x={140} y={312} size={20}>กระแสไหลวนวงใหญ่</Label>
      <Label x={140} y={338} size={20}>→ ร้อนมาก</Label>
      {/* laminated */}
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect x={360 + i * 34} y={50} width={28} height={200} fill={PANEL} stroke={INK} strokeWidth={2.5} />
          <ellipse cx={374 + i * 34} cy={150} rx={7} ry={80} fill="none" stroke={OK} strokeWidth={2.5} />
        </g>
      ))}
      <g>
        {[0, 1, 2].map((r) =>
          [0, 2, 4].map((c) => (
            <circle key={`${r}${c}`} cx={374 + c * 34} cy={90 + r * 60} r={2.2} fill={FIELD} />
          )),
        )}
      </g>
      <Label x={460} y={282} size={22} color={OK} weight={700}>✓ แกนลามิเนต</Label>
      <Label x={460} y={312} size={20}>วงเล็กในแต่ละแผ่น</Label>
      <Label x={460} y={338} size={20}>→ ร้อนน้อยลงมาก</Label>
      <Label x={300} y={22} size={20} muted>ภาพตัดแกน: ฟลักซ์ ⊙ พุ่งออกจากกระดาษ และสลับทิศตามไฟ AC</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 — nameplate (generic, no brand)
// ---------------------------------------------------------------------------
function Nameplate() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      <rect x={30} y={20} width={540} height={320} rx={16} fill={PANEL} stroke={INK} strokeWidth={3} />
      {[
        [52, 42],
        [548, 42],
        [52, 318],
        [548, 318],
      ].map(([a, b], i) => (
        <circle key={i} cx={a} cy={b} r={7} fill={BG} stroke={INK} strokeWidth={2} />
      ))}
      <Label x={300} y={58} size={24} weight={700}>หม้อแปลงไฟฟ้า (TRANSFORMER)</Label>
      <line x1={60} y1={84} x2={540} y2={84} stroke={INK} strokeWidth={1.5} />
      <Label x={70} y={116} size={22} anchor="start" muted>INPUT</Label>
      <Label x={200} y={116} size={24} anchor="start" weight={700}>230 V~  50 Hz</Label>
      <Label x={70} y={156} size={22} anchor="start" muted>OUTPUT</Label>
      <Label x={200} y={156} size={24} anchor="start" weight={700}>12-0-12 V~  2 A</Label>
      <Label x={70} y={196} size={22} anchor="start" muted>RATING</Label>
      <Label x={200} y={196} size={24} anchor="start" weight={700}>48 VA</Label>
      <line x1={60} y1={222} x2={540} y2={222} stroke={INK} strokeWidth={1.5} />
      {/* terminal diagram */}
      <CoilV x={230} y={280} len={64} turns={3} dir={1} width={2.5} />
      <CoilV x={290} y={280} len={64} turns={3} dir={-1} width={2.5} />
      <CoreLines x={260} y1={246} y2={314} gap={8} />
      <Label x={176} y={250} size={20} anchor="end">230</Label>
      <Label x={176} y={310} size={20} anchor="end">0</Label>
      <Wire points={[[230, 248], [186, 248]]} width={2} />
      <Wire points={[[230, 312], [186, 312]]} width={2} />
      <Wire points={[[290, 248], [336, 248]]} width={2} />
      <Wire points={[[290, 280], [336, 280]]} width={2} />
      <Wire points={[[290, 312], [336, 312]]} width={2} />
      <Label x={346} y={250} size={20} anchor="start">12</Label>
      <Label x={346} y={280} size={20} anchor="start">0 (แท็ปกลาง)</Label>
      <Label x={346} y={310} size={20} anchor="start">12</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 — dot convention, in phase / out of phase
// ---------------------------------------------------------------------------
function DotConvention() {
  const panel = (y0: number, inPhase: boolean) => {
    const yc = y0 + 105;
    return (
      <g>
        <Label x={20} y={y0 + 22} size={22} anchor="start" weight={700} color={inPhase ? OK : "var(--fig-accent-2)"}>
          {inPhase ? "ตามเฟส (in phase): จุดอยู่ด้านบนทั้งคู่" : "กลับเฟส 180° (out of phase): จุดอยู่คนละด้าน"}
        </Label>
        {/* input wave */}
        <line x1={20} y1={yc} x2={160} y2={yc} stroke={MUTED} strokeWidth={1.5} />
        <path d={sine(20, yc, 140, 34)} fill="none" stroke="var(--fig-accent)" strokeWidth={3} />
        <Label x={90} y={yc + 58} size={20}>Vin</Label>
        {/* transformer */}
        <CoilV x={270} y={yc} len={88} turns={4} dir={1} />
        <CoilV x={330} y={yc} len={88} turns={4} dir={-1} />
        <CoreLines x={300} y1={yc - 46} y2={yc + 46} gap={8} />
        <Wire points={[[270, yc - 44], [210, yc - 44]]} />
        <Wire points={[[270, yc + 44], [210, yc + 44]]} />
        <Wire points={[[330, yc - 44], [390, yc - 44]]} />
        <Wire points={[[330, yc + 44], [390, yc + 44]]} />
        <Terminal x={206} y={yc - 44} />
        <Terminal x={206} y={yc + 44} />
        <Terminal x={394} y={yc - 44} />
        <Terminal x={394} y={yc + 44} />
        <Dot x={252} y={yc - 30} />
        <Dot x={348} y={inPhase ? yc - 30 : yc + 30} />
        {/* output wave */}
        <line x1={440} y1={yc} x2={580} y2={yc} stroke={MUTED} strokeWidth={1.5} />
        <path d={sine(440, yc, 140, 34, !inPhase)} fill="none" stroke={inPhase ? OK : "var(--fig-accent-2)"} strokeWidth={3} strokeDasharray={inPhase ? undefined : "10 5"} />
        <Label x={510} y={yc + 58} size={20}>Vout</Label>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {panel(0, true)}
      <line x1={20} y1={208} x2={580} y2={208} stroke="var(--fig-grid)" strokeWidth={2} />
      {panel(212, false)}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 — DC (battery-kick) polarity test
// ---------------------------------------------------------------------------
function DcPolarityTest() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <path d="M 170 110 H 430 V 310 H 170 Z M 210 150 V 270 H 390 V 150 Z" fill={PANEL} stroke={INK} strokeWidth={3} fillRule="evenodd" />
      <LegTurns x1={160} x2={220} yTop={164} yBot={256} n={5} />
      <LegTurns x1={380} x2={440} yTop={164} yBot={256} n={5} />
      <Label x={250} y={210} size={22}>ขด A</Label>
      <Label x={350} y={210} size={22}>ขด B</Label>
      {/* battery + push switch on coil A */}
      <Wire points={[[70, 190], [70, 140], [80, 140]]} />
      <SwitchSym x={120} y={140} />
      <Wire points={[[160, 140], [160, 170]]} />
      <Wire points={[[160, 250], [160, 290], [70, 290], [70, 250]]} />
      <g transform="translate(0 0)">
        {/* battery drawn vertically: long (+) plate on top */}
        <line x1={70} y1={190} x2={70} y2={214} stroke={INK} strokeWidth={3} />
        <line x1={48} y1={214} x2={92} y2={214} stroke="var(--fig-plus)" strokeWidth={3} />
        <line x1={59} y1={226} x2={81} y2={226} stroke={INK} strokeWidth={5} />
        <line x1={70} y1={226} x2={70} y2={250} stroke={INK} strokeWidth={3} />
        <Label x={40} y={204} size={22} weight={700} color="var(--fig-plus)">+</Label>
      </g>
      <Label x={70} y={322} size={20}>1.5 V</Label>
      <Label x={120} y={104} size={20}>สวิตช์กด</Label>
      <Dot x={148} y={180} />
      {/* coil B → analogue meter */}
      <Wire points={[[440, 170], [500, 170], [500, 150]]} />
      <Wire points={[[440, 250], [550, 250], [550, 150]]} />
      <rect x={465} y={40} width={120} height={110} rx={10} fill={BG} stroke={INK} strokeWidth={3} />
      <path d="M 485 118 A 42 42 0 0 1 565 118" fill="none" stroke={INK} strokeWidth={2} />
      <line x1={485} y1={118} x2={479} y2={112} stroke={INK} strokeWidth={2} />
      <line x1={525} y1={128} x2={552} y2={86} stroke={DANGER} strokeWidth={3} strokeLinecap="round" />
      <circle cx={525} cy={128} r={4} fill={INK} />
      <Label x={500} y={137} size={18} weight={700}>+</Label>
      <Label x={552} y={137} size={16}>COM</Label>
      <Label x={525} y={24} size={20}>DCV ย่านต่ำ</Label>
      <Dot x={452} y={182} />
      <Callout x={20} y={346} w={560} h={66} tone="warn">
        <Label x={300} y={366} size={20}>ดูเข็ม “ขณะกดสวิตช์” เท่านั้น: เข็มตีขวา → ปลายที่ต่อ</Label>
        <Label x={300} y={392} size={20}>+ แบตเตอรี่ และ + มิเตอร์ เป็นขั้วตรงกัน ทำจุด ●</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 — low-voltage AC polarity test with two 12 V secondaries
// ---------------------------------------------------------------------------
function AcPolarityTest() {
  const panel = (x0: number, additive: boolean) => (
    <g>
      <Label x={x0 + 150} y={24} size={22} weight={700}>
        {additive ? "(ก) จุดที่ขั้ว 1 และ 4" : "(ข) จุดที่ขั้ว 1 และ 3"}
      </Label>
      <CoilV x={x0 + 95} y={190} len={100} turns={4} dir={1} />
      <CoilV x={x0 + 205} y={190} len={100} turns={4} dir={-1} />
      <CoreLines x={x0 + 150} y1={136} y2={244} gap={8} />
      <Wire points={[[x0 + 95, 140], [x0 + 70, 140]]} />
      <Wire points={[[x0 + 95, 240], [x0 + 70, 240]]} />
      <Wire points={[[x0 + 205, 140], [x0 + 230, 140]]} />
      <Wire points={[[x0 + 205, 240], [x0 + 230, 240]]} />
      {/* jumper 1–3 */}
      <Wire points={[[x0 + 70, 140], [x0 + 70, 80], [x0 + 230, 80], [x0 + 230, 140]]} color="var(--fig-accent)" dash="9 6" />
      <Label x={x0 + 150} y={62} size={20} color="var(--fig-accent)">จัมเปอร์</Label>
      {/* voltmeter 2–4 */}
      <Wire points={[[x0 + 70, 240], [x0 + 70, 300], [x0 + 126, 300]]} />
      <Wire points={[[x0 + 174, 300], [x0 + 230, 300], [x0 + 230, 240]]} />
      <Meter x={x0 + 150} y={300} kind="V" />
      <Terminal x={x0 + 70} y={140} />
      <Terminal x={x0 + 70} y={240} />
      <Terminal x={x0 + 230} y={140} />
      <Terminal x={x0 + 230} y={240} />
      <Label x={x0 + 46} y={140} size={20}>1</Label>
      <Label x={x0 + 46} y={240} size={20}>2</Label>
      <Label x={x0 + 254} y={140} size={20}>3</Label>
      <Label x={x0 + 254} y={240} size={20}>4</Label>
      <Dot x={x0 + 112} y={150} />
      <Dot x={x0 + 188} y={additive ? 230 : 150} />
      <Label x={x0 + 150} y={356} size={24} weight={700}>{additive ? "≈ 24 V" : "≈ 0 V"}</Label>
      <Label x={x0 + 150} y={388} size={20} muted>{additive ? "ขั้วแบบบวก (additive)" : "ขั้วแบบลบ (subtractive)"}</Label>
    </g>
  );
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {panel(0, true)}
      <line x1={300} y1={50} x2={300} y2={400} stroke="var(--fig-grid)" strokeWidth={2} />
      {panel(300, false)}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 — isolation transformer vs autotransformer (touching one conductor)
// ---------------------------------------------------------------------------
function Person({ x, yHand, yFeet, hit }: { x: number; yHand: number; yFeet: number; hit: boolean }) {
  const head = yFeet - 118;
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
      <circle cx={x} cy={head} r={14} fill="var(--fig-skin)" />
      <line x1={x} y1={head + 14} x2={x} y2={yFeet - 44} />
      <line x1={x} y1={yFeet - 44} x2={x - 16} y2={yFeet} />
      <line x1={x} y1={yFeet - 44} x2={x + 16} y2={yFeet} />
      <line x1={x} y1={head + 30} x2={x - 40} y2={yHand} />
      <line x1={x} y1={head + 30} x2={x + 22} y2={head + 54} />
      {hit ? <circle cx={x - 40} cy={yHand} r={8} stroke={DANGER} strokeWidth={3} /> : null}
    </g>
  );
}

function IsolationVsAuto() {
  const src = (y0: number) => (
    <g>
      <ACSource x={50} y={y0 + 90} angle={90} />
      <Wire points={[[50, y0 + 50], [50, y0 + 30], [130, y0 + 30]]} color="var(--fig-wire-l)" />
      <Wire points={[[50, y0 + 130], [50, y0 + 150], [130, y0 + 150]]} color="var(--fig-wire-n)" />
      <Label x={90} y={y0 + 14} size={20} color="var(--fig-wire-l)" weight={700}>L</Label>
      <Label x={90} y={y0 + 170} size={20} color="var(--fig-wire-n)" weight={700}>N</Label>
      <Wire points={[[30, y0 + 150], [50, y0 + 150]]} color="var(--fig-wire-n)" />
      <Wire points={[[30, y0 + 150], [30, y0 + 176]]} />
      <Ground x={30} y={y0 + 176} />
    </g>
  );
  const earth = (y: number) => (
    <g>
      <line x1={20} y1={y} x2={580} y2={y} stroke={MUTED} strokeWidth={2} />
      {Array.from({ length: 28 }, (_, i) => (
        <line key={i} x1={24 + i * 20} y1={y} x2={14 + i * 20} y2={y + 10} stroke={MUTED} strokeWidth={1.5} />
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      {/* --- isolation --- */}
      {src(20)}
      <Wire points={[[130, 50], [160, 50]]} color="var(--fig-wire-l)" />
      <Wire points={[[130, 50], [130, 50]]} />
      <Wire points={[[130, 170], [160, 170], [160, 160]]} color="var(--fig-wire-n)" />
      <Wire points={[[160, 50], [160, 60]]} color="var(--fig-wire-l)" />
      <CoilV x={160} y={110} len={100} turns={4} dir={1} />
      <CoilV x={220} y={110} len={100} turns={4} dir={-1} />
      <CoreLines x={190} y1={56} y2={164} gap={8} />
      <Wire points={[[220, 60], [220, 50], [400, 50], [400, 122], [420, 122]]} />
      <Wire points={[[220, 160], [220, 170], [400, 170]]} />
      <Label x={300} y={110} size={20} muted>ด้านออกลอย</Label>
      <Label x={300} y={136} size={20} muted>ไม่ต่อลงดิน</Label>
      <Person x={460} yHand={122} yFeet={210} hit={false} />
      <Label x={540} y={100} size={20} color={OK} weight={700}>✓ ไม่ครบ</Label>
      <Label x={540} y={126} size={20} color={OK} weight={700}>วงจร</Label>
      <Label x={300} y={14} size={20} weight={700}>หม้อแปลงแยกวงจร 1:1</Label>
      {earth(212)}
      {/* --- autotransformer --- */}
      {src(250)}
      <Wire points={[[130, 280], [190, 280], [190, 290]]} color="var(--fig-wire-l)" />
      <Wire points={[[130, 400], [190, 400], [190, 390]]} color="var(--fig-wire-n)" />
      <CoilV x={190} y={340} len={100} turns={5} dir={-1} />
      <CoreLines x={164} y1={290} y2={390} gap={8} />
      <Wire points={[[190, 320], [400, 320], [400, 352], [420, 352]]} />
      <Wire points={[[190, 400], [400, 400]]} color="var(--fig-wire-n)" />
      <Node x={190} y={320} />
      <Label x={300} y={302} size={20} muted>แท็ปต่อถึง L ผ่านขดลวด</Label>
      <Person x={460} yHand={352} yFeet={440} hit />
      {/* fault current path */}
      <Wire points={[[452, 444], [452, 452], [30, 452], [30, 434]]} color={DANGER} dash="10 6" width={3} />
      <Arrow from={[300, 452]} to={[250, 452]} color={DANGER} />
      <Label x={540} y={342} size={20} color={DANGER} weight={700}>✗ อันตราย</Label>
      <Label x={540} y={368} size={20} color={DANGER} weight={700}>กระแสผ่านตัว</Label>
      <Label x={300} y={244} size={20} weight={700}>ออโต้ทรานส์ฟอร์เมอร์ / วาริแอค</Label>
      {earth(442)}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 — find-fault: four bench set-ups (2×2)
// ---------------------------------------------------------------------------
function FaultPanels() {
  const tx = (x0: number, y0: number, leftLabel: string, rightLabel: string) => (
    <g>
      <CoilV x={x0 + 130} y={y0 + 125} len={80} turns={4} dir={1} />
      <CoilV x={x0 + 180} y={y0 + 125} len={80} turns={4} dir={-1} />
      <CoreLines x={x0 + 155} y1={y0 + 82} y2={y0 + 168} gap={8} />
      <Label x={x0 + 146} y={y0 + 204} size={20} anchor="end" muted>{leftLabel}</Label>
      <Label x={x0 + 164} y={y0 + 204} size={20} anchor="start" muted>{rightLabel}</Label>
    </g>
  );
  const leftLoop = (x0: number, y0: number) => (
    <g>
      <Wire points={[[x0 + 50, y0 + 85], [x0 + 50, y0 + 70], [x0 + 130, y0 + 70], [x0 + 130, y0 + 85]]} />
      <Wire points={[[x0 + 50, y0 + 165], [x0 + 50, y0 + 180], [x0 + 100, y0 + 180]]} />
      <Wire points={[[x0 + 100, y0 + 180], [x0 + 130, y0 + 180], [x0 + 130, y0 + 165]]} />
    </g>
  );
  const rightLamp = (x0: number, y0: number) => (
    <g>
      <Wire points={[[x0 + 180, y0 + 85], [x0 + 180, y0 + 70], [x0 + 255, y0 + 70], [x0 + 255, y0 + 95]]} />
      <Wire points={[[x0 + 180, y0 + 165], [x0 + 180, y0 + 180], [x0 + 255, y0 + 180], [x0 + 255, y0 + 155]]} />
      <Lamp x={x0 + 255} y={y0 + 125} angle={90} />
    </g>
  );
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      <line x1={300} y1={10} x2={300} y2={450} stroke="var(--fig-grid)" strokeWidth={2} />
      <line x1={10} y1={230} x2={590} y2={230} stroke="var(--fig-grid)" strokeWidth={2} />
      {/* ก: DC into primary */}
      <Label x={16} y={26} size={22} anchor="start" weight={700}>ก</Label>
      <Label x={44} y={26} size={20} anchor="start">แหล่งจ่าย DC → ขด 230 V</Label>
      {leftLoop(0, 0)}
      <DCSource x={50} y={125} angle={90} />
      {tx(0, 0, "230 V", "12 V")}
      {rightLamp(0, 0)}
      {/* ข: 12 V AC adapter into 12 V winding, 230 V side open */}
      <Label x={316} y={26} size={22} anchor="start" weight={700}>ข</Label>
      <Label x={344} y={26} size={20} anchor="start">12 V~ เข้าขด 12 V</Label>
      <Wire points={[[350, 85], [350, 70], [430, 70], [430, 85]]} />
      <Wire points={[[350, 165], [350, 180], [430, 180], [430, 165]]} />
      <ACSource x={350} y={125} angle={90} />
      {tx(300, 0, "12 V", "230 V")}
      <Wire points={[[480, 85], [480, 70], [540, 70]]} />
      <Wire points={[[480, 165], [480, 180], [540, 180]]} />
      <Terminal x={546} y={70} />
      <Terminal x={546} y={180} />
      {/* ค: shorted secondary */}
      <Label x={16} y={256} size={22} anchor="start" weight={700}>ค</Label>
      <Label x={44} y={256} size={20} anchor="start">ไฟ 230 V~ (ครูต่อ)</Label>
      <Wire points={[[50, 315], [50, 300], [130, 300], [130, 315]]} color="var(--fig-wire-l)" />
      <Wire points={[[50, 395], [50, 410], [130, 410], [130, 395]]} color="var(--fig-wire-n)" />
      <ACSource x={50} y={355} angle={90} />
      {tx(0, 230, "230 V", "12 V")}
      <Wire points={[[180, 315], [180, 300], [250, 300], [250, 410], [180, 410], [180, 395]]} />
      {/* ง: correct */}
      <Label x={316} y={256} size={22} anchor="start" weight={700}>ง</Label>
      <Label x={344} y={256} size={20} anchor="start">ไฟ 230 V~ (ครูต่อ) + ฟิวส์</Label>
      <Wire points={[[350, 315], [350, 300], [370, 300]]} color="var(--fig-wire-l)" />
      <rect x={370} y={292} width={40} height={16} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={370} y1={300} x2={410} y2={300} stroke={INK} strokeWidth={2} />
      <Wire points={[[410, 300], [430, 300], [430, 315]]} color="var(--fig-wire-l)" />
      <Wire points={[[350, 395], [350, 410], [430, 410], [430, 395]]} color="var(--fig-wire-n)" />
      <ACSource x={350} y={355} angle={90} />
      {tx(300, 230, "230 V", "12 V")}
      {rightLamp(300, 230)}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 — autotransformer connection of the E01 transformer (E02)
// ---------------------------------------------------------------------------
function AutoBoost() {
  return (
    <svg viewBox="0 0 600 390" aria-hidden="true">
      <ACSource x={80} y={270} angle={90} />
      <Wire points={[[80, 230], [80, 200], [250, 200]]} />
      <Wire points={[[80, 310], [80, 350], [420, 350], [420, 240]]} />
      <Wire points={[[250, 350], [250, 330]]} />
      {/* winding A (230 V) */}
      <Wire points={[[250, 200], [250, 215]]} />
      <CoilV x={250} y={272} len={114} turns={5} dir={1} />
      <Wire points={[[250, 329], [250, 350]]} />
      {/* winding B (57.5 V) */}
      <Wire points={[[250, 200], [250, 185]]} />
      <CoilV x={250} y={142} len={86} turns={3} dir={1} />
      <Wire points={[[250, 99], [250, 60], [420, 60], [420, 160]]} />
      <CoreLines x={290} y1={95} y2={330} gap={8} />
      <Node x={250} y={200} />
      <Node x={250} y={350} />
      <Dot x={236} y={226} />
      <Dot x={236} y={110} />
      <Resistor x={420} y={200} angle={90} />
      <Label x={330} y={272} size={22} anchor="start">230 V</Label>
      <Label x={330} y={142} size={22} anchor="start">57.5 V</Label>
      <Arrow from={[222, 268]} to={[222, 320]} label="Ip = 0.5 A" labelOffset={[-66, 4]} />
      <Arrow from={[222, 170]} to={[222, 120]} label="Is = 2 A" labelOffset={[-60, 0]} />
      <Arrow from={[110, 226]} to={[170, 226]} label="I₁ = 2.5 A" labelOffset={[0, -38]} />
      <Arrow from={[330, 44]} to={[390, 44]} label="IL = 2 A" labelOffset={[0, -18]} />
      <Label x={452} y={188} size={22} anchor="start">VL</Label>
      <Label x={452} y={214} size={20} anchor="start">= 287.5 V</Label>
      <Label x={300} y={378} size={20} muted>ต่อขดตามจุดให้แรงดันเสริมกัน (additive)</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W10-F01": EIStructure,
  "W10-F02": Principle,
  "W10-F03": Symbols,
  "W10-F04": CoreForms,
  "W10-F05": PowerFlow,
  "W10-F06": Eddy,
  "W10-F07": Nameplate,
  "W10-F08": DotConvention,
  "W10-F09": DcPolarityTest,
  "W10-F10": AcPolarityTest,
  "W10-F11": IsolationVsAuto,
  "W10-F12": FaultPanels,
  "W10-F13": AutoBoost,
};
export default figures;
