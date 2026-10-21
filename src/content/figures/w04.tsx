// Figures for Week 4 — วงจรไฟฟ้าและการวัดค่าปริมาณทางไฟฟ้าเบื้องต้น
import type { ReactNode } from "react";
import type { FigureMap } from "@/content/types";
import { Resistor, Battery, Wire, Label, Arrow, Lamp, SwitchSym, Meter, Node, Terminal } from "./kit";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const GRID = "var(--fig-grid)";
const DANGER = "var(--fig-danger)";
const OK = "var(--fig-ok)";
const PLUS = "var(--fig-plus)";
const CUR = "var(--fig-current)";
const ACC = "var(--fig-accent)";

/** "R" with a subscript (subscript drawn smaller and lowered). */
function Rs({ s, base = "R" }: { s: string; base?: string }) {
  return (
    <>
      {base}
      <tspan fontSize="0.78em" dy={6}>
        {s}
      </tspan>
      <tspan dy={-6}>{"​"}</tspan>
    </>
  );
}

function Plus({ x, y }: { x: number; y: number }) {
  return (
    <Label x={x} y={y} size={22} weight={700} color={PLUS}>
      +
    </Label>
  );
}

/** IEC 60417-5031 DC mark (solid line over a dashed line), drawn from x to x + w. */
function DcMark({ x, y, w = 18, color = INK }: { x: number; y: number; w?: number; color?: string }) {
  return (
    <g stroke={color} strokeWidth={2.5}>
      <line x1={x} y1={y} x2={x + w} y2={y} />
      <line x1={x} y1={y + 6} x2={x + w} y2={y + 6} strokeDasharray={`${w / 5} ${w / 10}`} />
    </g>
  );
}

/** IEC fuse: rectangle with the conductor drawn through it. */
function Fuse({ x, y, label }: { x: number; y: number; label?: ReactNode }) {
  return (
    <g>
      <line x1={x - 30} y1={y} x2={x - 22} y2={y} stroke={INK} strokeWidth={3} />
      <line x1={x + 22} y1={y} x2={x + 30} y2={y} stroke={INK} strokeWidth={3} />
      <rect x={x - 22} y={y - 10} width={44} height={20} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={x - 22} y1={y} x2={x + 22} y2={y} stroke={INK} strokeWidth={2} />
      {label ? <Label x={x} y={y - 30} size={20}>{label}</Label> : null}
    </g>
  );
}

function Cross({ x, y, r = 12, color = DANGER }: { x: number; y: number; r?: number; color?: string }) {
  return (
    <g stroke={color} strokeWidth={4} strokeLinecap="round">
      <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
      <line x1={x - r} y1={y + r} x2={x + r} y2={y - r} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// F01 — series vs parallel
// ---------------------------------------------------------------------------
function SeriesVsParallel() {
  const px = [385, 460, 535];
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <Label x={150} y={30} size={24} weight={700}>วงจรอนุกรม</Label>
      <Label x={450} y={30} size={24} weight={700}>วงจรขนาน</Label>
      <line x1={300} y1={10} x2={300} y2={430} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />

      {/* series */}
      <Wire points={[[50, 190], [50, 110], [110, 110]]} />
      <Wire points={[[190, 110], [250, 110], [250, 180]]} />
      <Wire points={[[250, 260], [250, 330], [190, 330]]} />
      <Wire points={[[110, 330], [50, 330], [50, 250]]} />
      <Battery x={50} y={220} angle={90} />
      <Label x={20} y={220}>E</Label>
      <Resistor x={150} y={110} label={<Rs s="1" />} />
      <Resistor x={250} y={220} angle={90} label={<Rs s="2" />} labelSide="b" />
      <Resistor x={150} y={330} label={<Rs s="3" />} labelSide="b" />
      <Arrow from={[200, 92]} to={[244, 92]} label="I" labelOffset={[0, -14]} />
      <Arrow from={[100, 348]} to={[60, 348]} label="I" labelOffset={[0, 18]} />
      <Label x={150} y={398} size={21}>ทางเดินกระแสทางเดียว</Label>
      <Label x={150} y={426} size={21} color={CUR}>I เท่ากันทุกจุด</Label>

      {/* parallel */}
      <Wire points={[[340, 190], [340, 110], [535, 110]]} />
      <Wire points={[[340, 250], [340, 330], [535, 330]]} />
      {px.map((x, i) => (
        <g key={x}>
          <Wire points={[[x, 110], [x, 180]]} />
          <Wire points={[[x, 260], [x, 330]]} />
          {i < 2 ? <Node x={x} y={110} /> : null}
          {i < 2 ? <Node x={x} y={330} /> : null}
          <Resistor x={x} y={220} angle={90} />
          <Label x={x + 17} y={220} anchor="start"><Rs s={String(i + 1)} /></Label>
        </g>
      ))}
      <Battery x={340} y={220} angle={90} />
      <Label x={316} y={220}>E</Label>
      <Arrow from={[352, 92]} to={[420, 92]} label={<Rs s="T" base="I" />} labelOffset={[0, -14]} />
      <Label x={450} y={398} size={21}>แยกเป็นหลายกิ่ง</Label>
      <Label x={450} y={426} size={21} color={ACC}>V เท่ากันทุกกิ่ง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 — series W04-E02 with voltmeters
// ---------------------------------------------------------------------------
function SeriesVoltmeters() {
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      <Wire points={[[80, 200], [80, 120], [240, 120]]} />
      <Wire points={[[320, 120], [480, 120], [480, 190]]} />
      <Wire points={[[480, 270], [480, 340], [320, 340]]} />
      <Wire points={[[240, 340], [80, 340], [80, 260]]} />
      <Battery x={80} y={230} angle={90} label="E" value="10 V" />
      <Resistor x={280} y={120} label={<Rs s="1" />} value="1 kΩ" labelSide="b" />
      <Resistor x={480} y={230} angle={90} label={<Rs s="2" />} value="1 kΩ" labelSide="b" />
      <Resistor x={280} y={340} label={<Rs s="3" />} value="510 Ω" />
      {/* V1 */}
      <Wire points={[[240, 120], [240, 45], [252, 45]]} width={2} />
      <Wire points={[[320, 120], [320, 45], [308, 45]]} width={2} />
      <Node x={240} y={120} />
      <Node x={320} y={120} />
      <Meter x={280} y={45} kind="V" />
      <Plus x={226} y={62} />
      <Label x={340} y={45} anchor="start" size={22} weight={700}>
        <Rs s="1" base="V" /> = 3.98 V
      </Label>
      {/* V2 */}
      <Wire points={[[480, 160], [550, 160], [550, 202]]} width={2} />
      <Wire points={[[480, 300], [550, 300], [550, 258]]} width={2} />
      <Node x={480} y={160} />
      <Node x={480} y={300} />
      <Meter x={550} y={230} kind="V" angle={90} />
      <Plus x={570} y={182} />
      <Label x={590} y={374} anchor="end" size={22} weight={700}>
        <Rs s="2" base="V" /> = 3.98 V
      </Label>
      {/* V3 */}
      <Wire points={[[240, 340], [240, 420], [252, 420]]} width={2} />
      <Wire points={[[320, 340], [320, 420], [308, 420]]} width={2} />
      <Node x={240} y={340} />
      <Node x={320} y={340} />
      <Meter x={280} y={420} kind="V" />
      <Plus x={334} y={402} />
      <Label x={350} y={440} anchor="start" size={22} weight={700}>
        <Rs s="3" base="V" /> = 2.03 V
      </Label>
      <Arrow from={[100, 100]} to={[180, 100]} />
      <Label x={130} y={74} size={21} color={CUR}>I = 3.98 mA</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 — series with two ammeters
// ---------------------------------------------------------------------------
function SeriesAmmeters() {
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      <Wire points={[[80, 190], [80, 110], [132, 110]]} />
      <Wire points={[[188, 110], [280, 110]]} />
      <Wire points={[[360, 110], [480, 110], [480, 180]]} />
      <Wire points={[[480, 260], [480, 330], [360, 330]]} />
      <Wire points={[[280, 330], [188, 330]]} />
      <Wire points={[[132, 330], [80, 330], [80, 250]]} />
      <Battery x={80} y={220} angle={90} label="E" value="10 V" />
      <Meter x={160} y={110} kind="A" />
      <Plus x={124} y={88} />
      <Label x={170} y={58} size={22} weight={700}>
        <Rs s="1" base="A" /> = 3.98 mA
      </Label>
      <Resistor x={320} y={110} label={<Rs s="1" />} value="1 kΩ" />
      <Resistor x={480} y={220} angle={90} label={<Rs s="2" />} value="1 kΩ" labelSide="b" />
      <Resistor x={320} y={330} label={<Rs s="3" />} value="510 Ω" labelSide="b" />
      <Meter x={160} y={330} kind="A" />
      <Plus x={196} y={308} />
      <Label x={160} y={378} size={22} weight={700}>
        <Rs s="2" base="A" /> = 3.98 mA
      </Label>
      <Arrow from={[400, 92]} to={[460, 92]} />
      <Arrow from={[440, 348]} to={[380, 348]} />
      <Label x={300} y={416} size={21}>แอมมิเตอร์ต่ออนุกรมอยู่ในเส้นทางกระแส</Label>
      <Label x={300} y={444} size={21} muted>อ่านค่าได้เท่ากันทั้ง 2 ตำแหน่ง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 — parallel W04-E04 with branch + total ammeters and a voltmeter
// ---------------------------------------------------------------------------
function ParallelMeters() {
  const branches = [
    { x: 270, r: "1", v: "1 kΩ", i: "10 mA" },
    { x: 385, r: "2", v: "2 kΩ", i: "5 mA" },
    { x: 500, r: "3", v: "2 kΩ", i: "5 mA" },
  ];
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      <Wire points={[[50, 205], [50, 110], [97, 110]]} />
      <Wire points={[[153, 110], [500, 110]]} />
      <Wire points={[[50, 265], [50, 400], [500, 400]]} />
      <Battery x={50} y={235} angle={90} />
      <Label x={60} y={438} size={21}>E = 10 V</Label>
      <Meter x={125} y={110} kind="A" />
      <Plus x={92} y={90} />
      <Label x={130} y={62} size={21} weight={700}>
        <Rs s="T" base="A" /> = 20 mA
      </Label>
      {/* voltmeter across the bus = across every branch */}
      <Wire points={[[195, 110], [195, 227]]} width={2} />
      <Wire points={[[195, 283], [195, 400]]} width={2} />
      <Node x={195} y={110} />
      <Node x={195} y={400} />
      <Meter x={195} y={255} kind="V" angle={90} />
      <Plus x={213} y={216} />
      <Label x={162} y={255} anchor="end" size={21} weight={700}>10 V</Label>
      {branches.map((b, k) => (
        <g key={b.x}>
          <Wire points={[[b.x, 110], [b.x, 147]]} />
          <Wire points={[[b.x, 203], [b.x, 250]]} />
          <Wire points={[[b.x, 330], [b.x, 400]]} />
          {k < 2 ? <Node x={b.x} y={110} /> : null}
          {k < 2 ? <Node x={b.x} y={400} /> : null}
          <Meter x={b.x} y={175} kind="A" angle={90} />
          <Plus x={b.x + 20} y={140} />
          <Label x={b.x + 30} y={192} anchor="start" size={20} weight={700}>{b.i}</Label>
          <Resistor x={b.x} y={290} angle={90} label={<Rs s={b.r} />} value={b.v} />
        </g>
      ))}
      <Label x={370} y={438} size={21} color={CUR}>
        <Rs s="T" base="I" /> = 10 + 5 + 5 = 20 mA (KCL)
      </Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 / F17 — mixed circuit (corrected labels: R5 middle, R6 lower-left)
// ---------------------------------------------------------------------------
function makeMixed(v: [string, string, string, string, string, string], box: boolean) {
  function MixedCircuit() {
    return (
      <svg viewBox="0 0 600 430" aria-hidden="true">
        <Wire points={[[46, 100], [90, 100]]} />
        <Wire points={[[170, 100], [320, 100]]} />
        <Wire points={[[400, 100], [500, 100], [500, 170]]} />
        <Wire points={[[500, 250], [500, 320], [400, 320]]} />
        <Wire points={[[320, 320], [170, 320]]} />
        <Wire points={[[90, 320], [46, 320]]} />
        <Wire points={[[230, 100], [230, 170]]} />
        <Wire points={[[230, 250], [230, 320]]} />
        <Terminal x={40} y={100} />
        <Terminal x={40} y={320} />
        <Label x={40} y={210} size={24} weight={700}><Rs s="T" /></Label>
        <Resistor x={130} y={100} label={<Rs s="1" />} value={v[0]} />
        <Resistor x={360} y={100} label={<Rs s="2" />} value={v[1]} />
        <Resistor x={500} y={210} angle={90} label={<Rs s="3" />} value={v[2]} />
        <Resistor x={360} y={320} label={<Rs s="4" />} value={v[3]} labelSide="b" />
        <Resistor x={230} y={210} angle={90} label={<Rs s="5" />} value={v[4]} />
        <Resistor x={130} y={320} label={<Rs s="6" />} value={v[5]} labelSide="b" />
        <Node x={230} y={100} />
        <Node x={230} y={320} />
        <Label x={230} y={72} size={24} weight={700} color={ACC}>A</Label>
        <Label x={230} y={350} size={24} weight={700} color={ACC}>B</Label>
        {box ? (
          <g>
            <rect x={296} y={36} width={290} height={358} rx={14} fill="none" stroke={ACC} strokeWidth={2} strokeDasharray="8 6" />
            <Label x={440} y={414} size={21} color={ACC}>
              <Rs s="2" /> + <Rs s="3" /> + <Rs s="4" /> อนุกรมกัน → <Rs s="T1" />
            </Label>
          </g>
        ) : (
          <Label x={300} y={414} size={21} muted>
            ลดรูปทีละขั้น: <Rs s="T1" /> → <Rs s="T2" /> → <Rs s="T" />
          </Label>
        )}
      </svg>
    );
  }
  return MixedCircuit;
}

// ---------------------------------------------------------------------------
// F10 — mixed circuit reduction stages 2 and 3
// ---------------------------------------------------------------------------
function MixedReduction() {
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <line x1={316} y1={10} x2={316} y2={430} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      {/* stage 2 */}
      <Label x={158} y={26} size={22} weight={700}>ขั้นที่ 2</Label>
      <Terminal x={20} y={100} />
      <Terminal x={20} y={310} />
      <Wire points={[[26, 100], [50, 100]]} />
      <Wire points={[[130, 100], [270, 100], [270, 165]]} />
      <Wire points={[[270, 245], [270, 310], [130, 310]]} />
      <Wire points={[[50, 310], [26, 310]]} />
      <Wire points={[[170, 100], [170, 165]]} />
      <Wire points={[[170, 245], [170, 310]]} />
      <Node x={170} y={100} />
      <Node x={170} y={310} />
      <Resistor x={90} y={100} label={<Rs s="1" />} value="5 Ω" />
      <Resistor x={90} y={310} label={<Rs s="6" />} value="5 Ω" labelSide="b" />
      <Resistor x={170} y={205} angle={90} label={<Rs s="5" />} value="20 Ω" labelSide="b" />
      <Resistor x={270} y={205} angle={90} label={<Rs s="T1" />} value="20 Ω" labelSide="b" />
      <Label x={158} y={410} size={21}>
        <Rs s="T2" /> = <Rs s="T1" /> ∥ <Rs s="5" /> = 10 Ω
      </Label>

      {/* stage 3 */}
      <Label x={460} y={26} size={22} weight={700}>ขั้นที่ 3</Label>
      <Terminal x={350} y={100} />
      <Terminal x={350} y={310} />
      <Wire points={[[356, 100], [390, 100]]} />
      <Wire points={[[470, 100], [560, 100], [560, 165]]} />
      <Wire points={[[560, 245], [560, 310], [470, 310]]} />
      <Wire points={[[390, 310], [356, 310]]} />
      <Resistor x={430} y={100} label={<Rs s="1" />} value="5 Ω" />
      <Resistor x={430} y={310} label={<Rs s="6" />} value="5 Ω" labelSide="b" />
      <Resistor x={560} y={205} angle={90} label={<Rs s="T2" />} value="10 Ω" labelSide="b" />
      <Label x={458} y={410} size={21}>
        <Rs s="T" /> = 5 + 10 + 5 = 20 Ω
      </Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 — digital multimeter front panel (hotspot figure, viewBox 600×500)
// ---------------------------------------------------------------------------
function MultimeterFace() {
  const cx = 300;
  const cy = 272;
  const ring = 94;
  const pos = [
    { a: 45, t: "V~" },
    { a: 90, t: "Ω" },
    { a: 135, t: "•)))" },
    { a: 180, t: "mA" },
    { a: 225, t: "A" },
    { a: 270, t: "OFF" },
    { a: 315, t: "mV" },
  ];
  const jacks = [
    { x: 170, t: "10A", c: PLUS },
    { x: 250, t: "mA", c: PLUS },
    { x: 350, t: "COM", c: INK },
    { x: 430, t: "VΩ", c: PLUS },
  ];
  return (
    <svg viewBox="0 0 600 500" aria-hidden="true">
      <rect x={110} y={8} width={380} height={484} rx={34} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* display */}
      <rect x={150} y={30} width={300} height={86} rx={8} fill={BG} stroke={INK} strokeWidth={3} />
      <Label x={290} y={76} size={50} weight={700}>3.98</Label>
      <Label x={402} y={88} size={24} weight={700}>V</Label>
      <DcMark x={414} y={80} />
      <Label x={170} y={50} size={20} muted anchor="start">AUTO</Label>
      {/* buttons */}
      <rect x={160} y={128} width={100} height={34} rx={8} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={210} y={146} size={20}>RANGE</Label>
      <rect x={340} y={128} width={100} height={34} rx={8} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={390} y={146} size={20}>HOLD</Label>
      {/* dial */}
      <circle cx={cx} cy={cy} r={62} fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={cx - 10} y={cy - 56} width={20} height={112} rx={8} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <path d={`M ${cx} ${cy - 66} l -9 16 l 18 0 z`} fill={INK} />
      <Label x={cx - 8} y={cy - ring} size={22} weight={700}>V</Label>
      <DcMark x={cx + 4} y={cy - ring - 6} w={16} />
      {pos.map((p) => {
        const r = (p.a * Math.PI) / 180;
        return (
          <Label key={p.t} x={cx + ring * Math.sin(r)} y={cy - ring * Math.cos(r)} size={22}>
            {p.t}
          </Label>
        );
      })}
      {/* jacks */}
      {jacks.map((j) => (
        <g key={j.t}>
          <Label x={j.x} y={392} size={21} weight={700}>{j.t}</Label>
          <circle cx={j.x} cy={428} r={17} fill={BG} stroke={j.c} strokeWidth={5} />
          <circle cx={j.x} cy={428} r={6} fill={INK} />
        </g>
      ))}
      <path d="M 150 458 L 150 468 L 270 468 L 270 458" fill="none" stroke={MUTED} strokeWidth={2} />
      <Label x={210} y={482} size={20} muted>มีฟิวส์ภายใน</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 — how to connect the meter for V, I and Ω
// ---------------------------------------------------------------------------
function MeasureRow({ y0, mode }: { y0: number; mode: "V" | "I" | "R" }) {
  const top = y0 + 50;
  const bot = y0 + 150;
  const bx = 50;
  const by = y0 + 100;
  const rx = 390;
  const text: Record<typeof mode, [string, string, string, string]> = {
    V: ["วัดแรงดัน V", "ต่อคร่อม (ขนาน)", "วงจรมีไฟได้", "สายแดงช่อง VΩ"],
    I: ["วัดกระแส I", "ตัดวงจร ต่ออนุกรม", "ปิดไฟก่อนต่อ", "สายแดงช่อง mA"],
    R: ["วัดความต้านทาน", "ไม่มีไฟในวงจร", "ยกขาข้างหนึ่ง", "สายแดงช่อง VΩ"],
  };
  const t = text[mode];
  return (
    <g>
      <rect x={6} y={y0 + 6} width={588} height={176} rx={14} fill="none" stroke={GRID} strokeWidth={2} />
      {mode === "R" ? (
        <g>
          <Terminal x={bx} y={top + 16} />
          <Terminal x={bx} y={bot - 16} />
          <Wire points={[[bx, top + 10], [bx, top], [130, top]]} />
          <Wire points={[[bx, bot - 10], [bx, bot], [rx, bot], [rx, top], [368, top]]} />
          <Label x={bx + 18} y={by} anchor="start" size={20} color={DANGER}>ถอดแหล่งจ่าย</Label>
        </g>
      ) : (
        <g>
          <Battery x={bx} y={by} angle={90} />
          <Wire points={[[bx, by - 30], [bx, top], [130, top]]} />
          <Wire points={[[bx, by + 30], [bx, bot], [rx, bot], [rx, top], [mode === "I" ? 390 : 340, top]]} />
        </g>
      )}
      <Resistor x={170} y={top} label={<Rs s="1" />} />
      {mode === "I" ? (
        <g>
          <Wire points={[[210, top], [242, top]]} />
          <Meter x={270} y={top} kind="A" />
          <Plus x={244} y={top - 28} />
          <Wire points={[[298, top], [310, top]]} />
          <Resistor x={350} y={top} label={<Rs s="2" />} />
        </g>
      ) : mode === "V" ? (
        <g>
          <Wire points={[[210, top], [260, top]]} />
          <Resistor x={300} y={top} label={<Rs s="2" />} />
          <Wire points={[[260, top], [260, top + 52], [282, top + 52]]} width={2} />
          <Wire points={[[340, top], [340, top + 52], [338, top + 52]]} width={2} />
          <Node x={260} y={top} />
          <Node x={340} y={top} />
          <Meter x={310} y={top + 52} kind="V" />
          <Plus x={246} y={top + 30} />
        </g>
      ) : (
        <g>
          <Wire points={[[210, top], [260, top]]} />
          <Resistor x={300} y={top} label={<Rs s="2" />} />
          {/* lifted right leg */}
          <Wire points={[[340, top], [354, top - 16]]} />
          <Cross x={361} y={top} r={6} />
          <Label x={372} y={top - 32} size={20} color={DANGER}>ยกขา</Label>
          <Wire points={[[260, top], [260, top + 52], [282, top + 52]]} width={2} />
          <Wire points={[[354, top - 16], [354, top + 52], [338, top + 52]]} width={2} />
          <Node x={260} y={top} />
          <Meter x={310} y={top + 52} kind="Ω" />
        </g>
      )}
      <Label x={420} y={y0 + 44} anchor="start" size={22} weight={700}>{t[0]}</Label>
      <Label x={420} y={y0 + 82} anchor="start" size={20}>{t[1]}</Label>
      <Label x={420} y={y0 + 114} anchor="start" size={20}>{t[2]}</Label>
      <Label x={420} y={y0 + 146} anchor="start" size={20} muted>{t[3]}</Label>
    </g>
  );
}

function ThreeMeasurements() {
  return (
    <svg viewBox="0 0 600 560" aria-hidden="true">
      <MeasureRow y0={0} mode="V" />
      <MeasureRow y0={186} mode="I" />
      <MeasureRow y0={372} mode="R" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 — finding an open circuit by voltage tracing (points a–f)
// ---------------------------------------------------------------------------
function VoltageTracing() {
  const pt = (x: number, y: number, name: string, v: string, lx: number, ly: number) => (
    <g key={name}>
      <circle cx={x} cy={y} r={7} fill={ACC} />
      <Label x={lx} y={ly} size={22} weight={700}>
        {name}
        <tspan dx={8} fill={v === "0 V" ? DANGER : OK}>
          {v}
        </tspan>
      </Label>
    </g>
  );
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      <Wire points={[[70, 180], [70, 100], [160, 100]]} />
      <Wire points={[[220, 100], [310, 100]]} />
      <Wire points={[[390, 100], [530, 100], [530, 170]]} />
      <Wire points={[[530, 250], [530, 320], [440, 320]]} />
      <Wire points={[[360, 320], [240, 320]]} />
      <Wire points={[[160, 320], [70, 320], [70, 240]]} />
      <Battery x={70} y={210} angle={90} label="E" value="12 V" />
      <Fuse x={190} y={100} />
      <SwitchSym x={350} y={100} closed />
      <Resistor x={530} y={210} angle={90} label={<Rs s="1" />} labelSide="b" />
      <Resistor x={400} y={320} label={<Rs s="2" />} />
      <Cross x={400} y={320} r={14} />
      <Label x={400} y={362} size={20} color={DANGER}>ขาด (open)</Label>
      <Resistor x={200} y={320} label={<Rs s="3" />} />
      {pt(110, 100, "a", "12 V", 115, 70)}
      {pt(265, 100, "b", "12 V", 270, 70)}
      {pt(440, 100, "c", "12 V", 450, 70)}
      {pt(530, 320, "d", "12 V", 520, 356)}
      {pt(300, 320, "e", "0 V", 300, 356)}
      {pt(110, 320, "f", "0 V", 110, 356)}
      <Label x={300} y={406} size={21}>
        สายดำ (COM) แตะขั้ว − ค้างไว้ · สายแดงแตะทีละจุด
      </Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 — summary infographic series vs parallel
// ---------------------------------------------------------------------------
function SummaryInfographic() {
  const rows = [
    { h: "กระแส", s: "เท่ากันทุกตัว", p: "แบ่งตามกิ่ง รวม = ผลบวก" },
    { h: "แรงดัน", s: "แบ่งกัน รวม = E", p: "เท่ากันทุกกิ่ง = E" },
    { h: "R รวม", s: "บวกกัน มากกว่าตัวมากสุด", p: "น้อยกว่าตัวน้อยสุด" },
    { h: "ตัวหนึ่งขาด", s: "ดับทั้งวงจร", p: "กิ่งอื่นยังทำงาน" },
  ];
  const y0 = 64;
  const rh = 88;
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      <rect x={150} y={8} width={220} height={48} rx={10} fill="var(--fig-accent-soft)" />
      <rect x={376} y={8} width={220} height={48} rx={10} fill="var(--fig-accent-soft)" />
      <Label x={260} y={32} size={24} weight={700}>อนุกรม</Label>
      <Label x={486} y={32} size={24} weight={700}>ขนาน</Label>
      {rows.map((r, i) => {
        const y = y0 + i * rh;
        const split = (t: string) => {
          const k = t.indexOf(" ");
          return k > 0 ? [t.slice(0, k), t.slice(k + 1)] : [t];
        };
        const cell = (t: string, cx: number) => {
          const parts = split(t);
          return parts.length === 1 ? (
            <Label x={cx} y={y + rh / 2} size={21}>{parts[0]}</Label>
          ) : (
            <g>
              <Label x={cx} y={y + rh / 2 - 15} size={21}>{parts[0]}</Label>
              <Label x={cx} y={y + rh / 2 + 15} size={21}>{parts[1]}</Label>
            </g>
          );
        };
        return (
          <g key={r.h}>
            <rect x={4} y={y + 4} width={140} height={rh - 8} rx={10} fill={PANEL} />
            <Label x={74} y={y + rh / 2} size={22} weight={700}>{r.h}</Label>
            <rect x={150} y={y + 4} width={220} height={rh - 8} rx={10} fill="none" stroke={GRID} strokeWidth={2} />
            <rect x={376} y={y + 4} width={220} height={rh - 8} rx={10} fill="none" stroke={GRID} strokeWidth={2} />
            {cell(r.s, 260)}
            {cell(r.p, 486)}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 — find-fault: four meter connections (viewBox 600×540)
// ---------------------------------------------------------------------------
function FaultPanel({ x0, y0, n, kind, where, caption }: { x0: number; y0: number; n: string; kind: "A" | "V" | "Ω"; where: "supply" | "r2"; caption: [ReactNode, ReactNode] }) {
  const bx = x0 + 105;
  const top = y0 + 64;
  const bot = y0 + 200;
  const rx = x0 + 240;
  const cy = (top + bot) / 2;
  const mx = where === "supply" ? x0 + 45 : x0 + 195;
  const tap = where === "supply" ? bx : rx;
  return (
    <g>
      <rect x={x0 + 6} y={y0 + 6} width={288} height={258} rx={14} fill="none" stroke={GRID} strokeWidth={2} />
      <circle cx={x0 + 30} cy={y0 + 32} r={18} fill={ACC} />
      <Label x={x0 + 30} y={y0 + 33} size={22} weight={700} color={BG}>{n}</Label>
      <Wire points={[[bx, cy - 30], [bx, top], [x0 + 130, top]]} />
      <Wire points={[[x0 + 210, top], [rx, top], [rx, cy - 40]]} />
      <Wire points={[[rx, cy + 40], [rx, bot], [bx, bot], [bx, cy + 30]]} />
      <Battery x={bx} y={cy} angle={90} />
      <Resistor x={x0 + 170} y={top} label={<Rs s="1" />} />
      <Resistor x={rx} y={cy} angle={90} />
      <Label x={rx + 20} y={cy} anchor="start" size={22}><Rs s="2" /></Label>
      <Wire points={[[tap, top + 14], [mx, top + 14], [mx, cy - 28]]} width={2} />
      <Wire points={[[tap, bot - 14], [mx, bot - 14], [mx, cy + 28]]} width={2} />
      <Node x={tap} y={top + 14} />
      <Node x={tap} y={bot - 14} />
      <Meter x={mx} y={cy} kind={kind} angle={90} />
      <Label x={x0 + 150} y={y0 + 226} size={20}>{caption[0]}</Label>
      <Label x={x0 + 150} y={y0 + 250} size={20} muted>{caption[1]}</Label>
    </g>
  );
}

function MeterFaults() {
  return (
    <svg viewBox="0 0 600 540" aria-hidden="true">
      <FaultPanel x0={0} y0={0} n="1" kind="A" where="supply" caption={["ย่าน mA คร่อมแบตเตอรี่", "สายแดงช่อง mA"]} />
      <FaultPanel x0={300} y0={0} n="2" kind="Ω" where="r2" caption={[<>ย่าน Ω คร่อม <Rs s="2" /></>, "แบตเตอรี่ยังต่ออยู่"]} />
      <FaultPanel x0={0} y0={270} n="3" kind="V" where="r2" caption={[<>ย่าน DCV คร่อม <Rs s="2" /></>, "สายแดงค้างช่อง mA"]} />
      <FaultPanel x0={300} y0={270} n="4" kind="V" where="r2" caption={[<>ย่าน DCV คร่อม <Rs s="2" /></>, "สายแดงช่อง VΩ"]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 — KVL around the series loop (E02 values)
// ---------------------------------------------------------------------------
function KvlLoop() {
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <Wire points={[[90, 180], [90, 90], [230, 90]]} />
      <Wire points={[[310, 90], [450, 90], [450, 170]]} />
      <Wire points={[[450, 250], [450, 330], [310, 330]]} />
      <Wire points={[[230, 330], [90, 330], [90, 240]]} />
      <Battery x={90} y={210} angle={90} label="E" value="10 V" />
      <Resistor x={270} y={90} label={<Rs s="1" />} value="1 kΩ" />
      <Resistor x={450} y={210} angle={90} label={<Rs s="2" />} value="1 kΩ" />
      <Resistor x={270} y={330} label={<Rs s="3" />} value="510 Ω" labelSide="b" />
      {/* drop polarity (conventional current enters the + end) */}
      <Label x={222} y={116} size={22} weight={700} color={PLUS}>+</Label>
      <Label x={318} y={116} size={24} weight={700}>−</Label>
      <Label x={428} y={160} size={22} weight={700} color={PLUS}>+</Label>
      <Label x={428} y={262} size={24} weight={700}>−</Label>
      <Label x={318} y={304} size={22} weight={700} color={PLUS}>+</Label>
      <Label x={222} y={304} size={24} weight={700}>−</Label>
      {/* loop arrow (clockwise, same as I) */}
      <path d="M 180 172 A 100 58 0 1 1 180 248" fill="none" stroke={CUR} strokeWidth={3} strokeDasharray="8 6" />
      <Arrow from={[192, 254]} to={[176, 244]} />
      <Label x={256} y={198} size={21} color={CUR}>เดินรอบวง</Label>
      <Label x={256} y={226} size={21} color={CUR}>ตามทิศ I</Label>
      <Label x={300} y={420} size={22} weight={700}>
        3.98 V + 3.98 V + 2.03 V ≈ 10 V = E
      </Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F15 — KCL at a node (E04 values)
// ---------------------------------------------------------------------------
function KclNode() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <Wire points={[[30, 170], [240, 170]]} />
      <Wire points={[[240, 170], [440, 70]]} />
      <Wire points={[[240, 170], [450, 170]]} />
      <Wire points={[[240, 170], [440, 270]]} />
      <circle cx={240} cy={170} r={12} fill={INK} />
      <Label x={240} y={130} size={22} weight={700}>จุดต่อ A</Label>
      <Arrow from={[50, 148]} to={[180, 148]} width={4} />
      <Label x={110} y={120} size={22} weight={700} color={CUR}>
        <Rs s="T" base="I" /> = 20 mA
      </Label>
      <Arrow from={[300, 124]} to={[380, 84]} width={4} />
      <Arrow from={[310, 150]} to={[410, 150]} width={4} />
      <Arrow from={[300, 216]} to={[380, 256]} width={4} />
      <Label x={452} y={62} anchor="start" size={22} weight={700} color={CUR}>
        <Rs s="1" base="I" /> = 10 mA
      </Label>
      <Label x={462} y={170} anchor="start" size={22} weight={700} color={CUR}>
        <Rs s="2" base="I" /> = 5 mA
      </Label>
      <Label x={452} y={278} anchor="start" size={22} weight={700} color={CUR}>
        <Rs s="3" base="I" /> = 5 mA
      </Label>
      <Label x={200} y={312} size={22}>เข้า 20 mA = ออก 10 + 5 + 5 mA</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 / F14 — scenario: 3 lamps in parallel along a bus, L2 & L3 dark
// ---------------------------------------------------------------------------
function makeLampBus(showBreak: boolean) {
  function LampBus() {
    const xs = [200, 340, 480];
    return (
      <svg viewBox="0 0 600 400" aria-hidden="true">
        <Wire points={[[70, 160], [70, 80], [showBreak ? 262 : 480, 80]]} />
        {showBreak ? <Wire points={[[282, 80], [480, 80]]} /> : null}
        <Wire points={[[70, 220], [70, 300], [480, 300]]} />
        <Battery x={70} y={190} angle={90} label="E" value="12 V" />
        {xs.map((x, i) => (
          <g key={x}>
            <Wire points={[[x, 80], [x, 160]]} />
            <Wire points={[[x, 220], [x, 300]]} />
            <Lamp x={x} y={190} angle={90} on={i === 0} label={<Rs s={String(i + 1)} base="L" />} labelSide="a" />
            <circle cx={x} cy={80} r={7} fill={ACC} />
            <Label x={x} y={50} size={22} weight={700} color={ACC}>{`p${i + 1}`}</Label>
            {i < 2 ? <Node x={x} y={300} /> : null}
          </g>
        ))}
        {showBreak ? (
          <g>
            <Cross x={272} y={80} r={12} />
            <Label x={272} y={118} size={20} color={DANGER}>ขาด</Label>
          </g>
        ) : null}
        <Label x={200} y={340} size={21} color={OK}>ติด</Label>
        <Label x={340} y={340} size={21} color={DANGER}>ดับ</Label>
        <Label x={480} y={340} size={21} color={DANGER}>ดับ</Label>
        <Label x={300} y={380} size={20} muted>
          {showBreak ? "p1 = 12 V · p2 = 0 V → จุดขาดอยู่ระหว่าง p1 กับ p2" : "จุดวัด p1–p3 วัดเทียบขั้ว − ของแหล่งจ่าย"}
        </Label>
      </svg>
    );
  }
  return LampBus;
}

// ---------------------------------------------------------------------------
// F16 — the parts of a basic circuit (review of week 3)
// ---------------------------------------------------------------------------
function BasicCircuit() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Wire points={[[80, 180], [80, 100], [160, 100]]} />
      <Wire points={[[220, 100], [340, 100]]} />
      <Wire points={[[420, 100], [500, 100], [500, 180]]} />
      <Wire points={[[500, 240], [500, 320], [80, 320], [80, 240]]} />
      <Battery x={80} y={210} angle={90} />
      <Label x={112} y={196} anchor="start" size={21} weight={700}>แหล่งจ่าย E</Label>
      <Label x={112} y={224} anchor="start" size={20} muted>12 V DC</Label>
      <Fuse x={190} y={100} />
      <Label x={190} y={56} size={21} weight={700}>ฟิวส์ (ป้องกัน)</Label>
      <SwitchSym x={380} y={100} closed />
      <Label x={380} y={56} size={21} weight={700}>สวิตช์ (ควบคุม)</Label>
      <Lamp x={500} y={210} angle={90} on />
      <Label x={466} y={196} anchor="end" size={21} weight={700}>หลอดไฟ</Label>
      <Label x={466} y={224} anchor="end" size={20} muted>(โหลด)</Label>
      <Label x={290} y={296} size={21} weight={700}>สายตัวนำ</Label>
      <Arrow from={[530, 124]} to={[530, 172]} />
      <Label x={548} y={148} anchor="start" size={22} weight={700} color={CUR}>I</Label>
      <Arrow from={[330, 342]} to={[250, 342]} />
      <Label x={290} y={376} size={20} color={CUR}>I ทิศกระแสนิยม: ออกจาก + ผ่านโหลด กลับเข้า −</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F18 — why lab values are scaled ×100 (power check)
// ---------------------------------------------------------------------------
function PowerCompare() {
  const panel = (x0: number, bad: boolean) => {
    const c = bad ? DANGER : OK;
    const lines = bad
      ? ["10 Ω ∥ 20 Ω ∥ 20 Ω", "E = 10 V", "I_T = 2 A", "P_R1 = 10 W", "เกิน ¼ W ถึง 40 เท่า"]
      : ["1 kΩ ∥ 2 kΩ ∥ 2 kΩ", "E = 10 V", "I_T = 20 mA", "P_R1 = 0.1 W", "≤ ½ × ¼ W = 0.125 W"];
    return (
      <g>
        <rect x={x0 + 6} y={8} width={282} height={364} rx={14} fill={bad ? "var(--fig-danger-soft)" : PANEL} stroke={c} strokeWidth={3} strokeDasharray={bad ? "10 6" : undefined} />
        <Label x={x0 + 147} y={40} size={22} weight={700}>{bad ? "ค่าในตำรา" : "ค่าที่ใช้ในแล็บ (×100)"}</Label>
        <Resistor x={x0 + 147} y={96} highlight={bad ? "var(--fig-danger-soft)" : BG} />
        {bad ? (
          <g stroke={DANGER} strokeWidth={2.5} fill="none">
            <path d={`M ${x0 + 127} 76 q -6 -10 0 -20 q 6 -10 0 -20`} />
            <path d={`M ${x0 + 147} 76 q -6 -10 0 -20 q 6 -10 0 -20`} />
            <path d={`M ${x0 + 167} 76 q -6 -10 0 -20 q 6 -10 0 -20`} />
          </g>
        ) : null}
        {lines.map((t, i) => {
          const sub = t.match(/^(I|P)_(T|R1)(.*)$/);
          return (
            <Label key={t} x={x0 + 147} y={150 + i * 38} size={22} weight={i === 3 ? 700 : 500}>
              {sub ? (
                <>
                  <Rs s={sub[2]} base={sub[1]} />
                  {sub[3]}
                </>
              ) : (
                t
              )}
            </Label>
          );
        })}
        <Label x={x0 + 147} y={344} size={24} weight={700} color={c}>
          {bad ? "✗ ร้อนจนไหม้ ห้ามต่อจริง" : "✓ ปลอดภัย วัดได้ง่าย"}
        </Label>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      {panel(0, true)}
      {panel(300, false)}
    </svg>
  );
}

export const figures: FigureMap = {
  "W04-F01": SeriesVsParallel,
  "W04-F02": SeriesVoltmeters,
  "W04-F03": SeriesAmmeters,
  "W04-F04": ParallelMeters,
  "W04-F05": makeMixed(["5 Ω", "5 Ω", "5 Ω", "10 Ω", "20 Ω", "5 Ω"], true),
  "W04-F06": MultimeterFace,
  "W04-F07": ThreeMeasurements,
  "W04-F08": VoltageTracing,
  "W04-F09": SummaryInfographic,
  "W04-F10": MixedReduction,
  "W04-F11": MeterFaults,
  "W04-F12": KvlLoop,
  "W04-F13": makeLampBus(false),
  "W04-F14": makeLampBus(true),
  "W04-F15": KclNode,
  "W04-F16": BasicCircuit,
  "W04-F17": makeMixed(["100 Ω", "330 Ω", "470 Ω", "1 kΩ", "1.2 kΩ", "180 Ω"], false),
  "W04-F18": PowerCompare,
};
export default figures;
