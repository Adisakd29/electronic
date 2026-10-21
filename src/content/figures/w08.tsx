import type { FigureMap } from "@/content/types";
import { Wire, Resistor, Battery, Capacitor, Diode, Meter, SwitchSym, Label, Arrow, Node } from "./kit";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const MUTED = "var(--fig-muted)";

/* ------------------------------------------------------------------ */
/* W08-F01  Parallel-plate structure                                   */
/* ------------------------------------------------------------------ */
function ParallelPlate() {
  const xs = [190, 240, 290, 340, 390, 440];
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <style>{`.w08f01-pulse{animation:w08f01p 3s ease-in-out infinite}@keyframes w08f01p{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      {/* terminals */}
      <Wire points={[[315, 110], [315, 50]]} />
      <circle cx={315} cy={44} r={7} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Wire points={[[315, 284], [315, 344]]} />
      <circle cx={315} cy={350} r={7} fill={BG} stroke={INK} strokeWidth={2.5} />
      <Label x={335} y={44} anchor="start" size={20} muted>ขั้วต่อ (terminal)</Label>
      {/* dielectric */}
      <rect x={165} y={124} width={300} height={146} fill="var(--fig-accent-soft)" stroke="none" />
      {/* plates */}
      <rect x={165} y={110} width={300} height={14} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={3} />
      <rect x={165} y={270} width={300} height={14} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={3} />
      {/* charges */}
      {xs.map((x) => (
        <text key={`p${x}`} x={x - 12} y={142} fontSize={22} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="var(--fig-plus)">+</text>
      ))}
      {xs.map((x) => (
        <text key={`m${x}`} x={x - 12} y={254} fontSize={24} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={INK}>−</text>
      ))}
      {/* field lines + to − */}
      <g className="w08f01-pulse">
        {xs.map((x) => (
          <Arrow key={`f${x}`} from={[x + 8, 152]} to={[x + 8, 244]} color="var(--fig-field)" width={2.5} head={11} />
        ))}
      </g>
      {/* d dimension */}
      <line x1={490} y1={117} x2={530} y2={117} stroke={MUTED} strokeWidth={1.5} />
      <line x1={490} y1={277} x2={530} y2={277} stroke={MUTED} strokeWidth={1.5} />
      <Arrow from={[515, 197]} to={[515, 121]} color={INK} width={2} head={10} />
      <Arrow from={[515, 197]} to={[515, 273]} color={INK} width={2} head={10} />
      <Label x={540} y={197} anchor="start" size={26} weight={700}>d</Label>
      {/* left labels */}
      <Label x={152} y={110} anchor="end" size={22}>แผ่นตัวนำ</Label>
      <Label x={152} y={136} anchor="end" size={20} muted>พื้นที่ A</Label>
      <Label x={152} y={186} anchor="end" size={22}>ไดอิเล็กทริก</Label>
      <Label x={152} y={212} anchor="end" size={20} muted>(ฉนวน, εᵣ)</Label>
      <Label x={300} y={385} size={20} color="var(--fig-field)">ลูกศร = สนามไฟฟ้า ชี้จากแผ่น + ไปแผ่น −</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F02  Aluminium electrolytic: outside + unrolled layers          */
/* ------------------------------------------------------------------ */
function ElectrolyticCutaway() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <Label x={125} y={22} size={22} weight={700}>ภายนอก</Label>
      {/* legs */}
      <line x1={100} y1={290} x2={100} y2={390} stroke={INK} strokeWidth={4} />
      <line x1={150} y1={290} x2={150} y2={345} stroke={INK} strokeWidth={4} />
      {/* body */}
      <rect x={60} y={70} width={130} height={220} rx={12} fill={PANEL} stroke={INK} strokeWidth={3} />
      <ellipse cx={125} cy={70} rx={65} ry={14} fill={BG} stroke={INK} strokeWidth={3} />
      {/* vent (K-shaped score) */}
      <g stroke={INK} strokeWidth={2.5}>
        <line x1={110} y1={62} x2={110} y2={78} />
        <line x1={110} y1={70} x2={140} y2={62} />
        <line x1={110} y1={70} x2={140} y2={78} />
      </g>
      {/* minus stripe on the right */}
      <rect x={158} y={84} width={26} height={200} fill="var(--fig-muted)" stroke="none" />
      {[120, 170, 220, 262].map((y) => (
        <text key={y} x={171} y={y} fontSize={28} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={BG}>−</text>
      ))}
      <Label x={108} y={180} size={20} muted>100 µF</Label>
      <Label x={108} y={206} size={20} muted>25 V</Label>
      {/* leg labels */}
      <Label x={100} y={410} size={20} color="var(--fig-plus)">ขายาว = +</Label>
      <Label x={162} y={360} anchor="start" size={20}>ขาสั้น = −</Label>
      <Label x={202} y={100} anchor="start" size={20}>ร่องนิรภัย</Label>
      <Label x={202} y={170} anchor="start" size={20}>แถบ −</Label>

      {/* unrolled layers */}
      <Label x={445} y={22} size={22} weight={700}>ชั้นภายใน (คลี่ออก)</Label>
      <rect x={290} y={60} width={300} height={60} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2.5} />
      <Label x={440} y={90} size={20}>ฟอยล์แอโนด (+) อะลูมิเนียม</Label>
      <rect x={290} y={120} width={300} height={44} fill="var(--fig-accent)" stroke={INK} strokeWidth={2.5} />
      <Label x={440} y={142} size={20} color={BG} weight={700}>ออกไซด์ Al₂O₃ = ไดอิเล็กทริก</Label>
      <rect x={290} y={164} width={300} height={80} fill="var(--fig-panel)" stroke={INK} strokeWidth={2.5} />
      <g stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 6">
        <line x1={300} y1={178} x2={580} y2={178} />
        <line x1={300} y1={230} x2={580} y2={230} />
      </g>
      <Label x={440} y={194} size={20}>กระดาษชุบอิเล็กโทรไลต์</Label>
      <Label x={440} y={218} size={20} muted>(ตัวนำของแคโทด)</Label>
      <rect x={290} y={244} width={300} height={60} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2.5} />
      <Label x={440} y={274} size={20}>ฟอยล์แคโทด (−)</Label>
      <Label x={440} y={340} size={20} muted>ชั้นทั้งหมดม้วนเป็นทรงกระบอก</Label>
      <Label x={440} y={366} size={20} muted>ออกไซด์บางมาก → C ต่อปริมาตรสูง</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F03  Gallery of capacitor types (line drawings)                 */
/* ------------------------------------------------------------------ */
function Cell({ x, y, name, sub, children }: { x: number; y: number; name: string; sub: string; children: React.ReactNode }) {
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={188} height={174} rx={10} fill="none" stroke="var(--fig-grid)" strokeWidth={2} />
      {children}
      <Label x={x + 100} y={y + 138} size={20} weight={600}>{name}</Label>
      <Label x={x + 100} y={y + 163} size={20} muted>{sub}</Label>
    </g>
  );
}

function TypesGallery() {
  return (
    <svg viewBox="0 0 600 560" aria-hidden="true">
      {/* 1 ceramic disc */}
      <Cell x={0} y={0} name="เซรามิกจาน" sub="ไม่มีขั้ว">
        <line x1={88} y1={80} x2={88} y2={115} stroke={INK} strokeWidth={3} />
        <line x1={112} y1={80} x2={112} y2={115} stroke={INK} strokeWidth={3} />
        <circle cx={100} cy={55} r={38} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={3} />
        <Label x={100} y={56} size={22} weight={700}>103</Label>
      </Cell>
      {/* 2 MLCC */}
      <Cell x={200} y={0} name="MLCC (SMD)" sub="ไม่มีขั้ว">
        <rect x={250} y={38} width={100} height={50} rx={4} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={3} />
        <rect x={250} y={38} width={22} height={50} fill="var(--fig-grid)" stroke={INK} strokeWidth={3} />
        <rect x={328} y={38} width={22} height={50} fill="var(--fig-grid)" stroke={INK} strokeWidth={3} />
        <Label x={300} y={106} size={20} muted>ขั้วโลหะ 2 ข้าง</Label>
      </Cell>
      {/* 3 film box */}
      <Cell x={400} y={0} name="ฟิล์ม (โพลีเอสเตอร์)" sub="ไม่มีขั้ว">
        <line x1={480} y1={92} x2={480} y2={118} stroke={INK} strokeWidth={3} />
        <line x1={520} y1={92} x2={520} y2={118} stroke={INK} strokeWidth={3} />
        <rect x={440} y={24} width={120} height={68} rx={6} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={3} />
        <Label x={500} y={58} size={22} weight={700}>2A104J</Label>
      </Cell>
      {/* 4 radial electrolytic */}
      <Cell x={0} y={185} name="อิเล็กโทรไลต์ radial" sub="มีขั้ว (แถบ −)">
        <line x1={88} y1={290} x2={88} y2={315} stroke={INK} strokeWidth={3} />
        <line x1={112} y1={290} x2={112} y2={305} stroke={INK} strokeWidth={3} />
        <rect x={70} y={205} width={60} height={85} rx={8} fill={PANEL} stroke={INK} strokeWidth={3} />
        <rect x={112} y={211} width={14} height={73} fill="var(--fig-muted)" />
        <text x={119} y={248} fontSize={22} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={BG}>−</text>
      </Cell>
      {/* 5 axial electrolytic */}
      <Cell x={200} y={185} name="อิเล็กโทรไลต์ axial" sub="มีขั้ว (ลูกศรชี้ −)">
        <line x1={215} y1={250} x2={245} y2={250} stroke={INK} strokeWidth={3} />
        <line x1={355} y1={250} x2={385} y2={250} stroke={INK} strokeWidth={3} />
        <rect x={245} y={222} width={110} height={56} rx={10} fill={PANEL} stroke={INK} strokeWidth={3} />
        <line x1={262} y1={222} x2={262} y2={278} stroke={INK} strokeWidth={2} />
        <path d="M 300 250 L 340 250 M 340 250 l -10 -7 M 340 250 l -10 7" stroke={INK} strokeWidth={2.5} fill="none" />
        <Label x={322} y={234} size={20} weight={700}>−</Label>
        <Label x={232} y={232} size={20} weight={700} color="var(--fig-plus)">+</Label>
      </Cell>
      {/* 6 SMD electrolytic */}
      <Cell x={400} y={185} name="อิเล็กโทรไลต์ SMD" sub="มีขั้ว (ครึ่งวงดำ = −)">
        <rect x={450} y={205} width={100} height={100} rx={4} fill={PANEL} stroke={INK} strokeWidth={3} />
        <circle cx={500} cy={255} r={40} fill={BG} stroke={INK} strokeWidth={3} />
        <path d="M 500 215 A 40 40 0 0 1 500 295 Z" fill={INK} />
        <text x={482} y={256} fontSize={22} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="var(--fig-plus)">+</text>
      </Cell>
      {/* 7 tantalum bead */}
      <Cell x={0} y={370} name="แทนทาลัม" sub="มีขั้ว (ขาที่มี +)">
        <line x1={90} y1={460} x2={90} y2={495} stroke={INK} strokeWidth={3} />
        <line x1={110} y1={460} x2={110} y2={495} stroke={INK} strokeWidth={3} />
        <path d="M 100 388 C 140 400 140 462 100 465 C 60 462 60 400 100 388 Z" fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={3} />
        <text x={86} y={430} fontSize={26} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="var(--fig-plus)">+</text>
      </Cell>
      {/* 8 trimmer */}
      <Cell x={200} y={370} name="ทริมเมอร์ (trimmer)" sub="ปรับค่าได้ ไม่มีขั้ว">
        <rect x={255} y={388} width={90} height={80} rx={6} fill={PANEL} stroke={INK} strokeWidth={3} />
        <circle cx={300} cy={428} r={28} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={3} />
        <line x1={284} y1={444} x2={316} y2={412} stroke={INK} strokeWidth={5} />
        <line x1={275} y1={468} x2={275} y2={492} stroke={INK} strokeWidth={3} />
        <line x1={325} y1={468} x2={325} y2={492} stroke={INK} strokeWidth={3} />
      </Cell>
      {/* 9 supercapacitor */}
      <Cell x={400} y={370} name="ซูเปอร์คาปาซิเตอร์" sub="มีขั้ว ค่าระดับ F">
        <line x1={488} y1={470} x2={488} y2={495} stroke={INK} strokeWidth={3} />
        <line x1={512} y1={470} x2={512} y2={485} stroke={INK} strokeWidth={3} />
        <rect x={455} y={385} width={90} height={85} rx={10} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={3} />
        <Label x={500} y={415} size={22} weight={700}>1 F</Label>
        <Label x={500} y={445} size={20}>5.5 V</Label>
      </Cell>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F04  Symbols                                                     */
/* ------------------------------------------------------------------ */
function Leads({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 50} y1={y} x2={x - 10} y2={y} stroke={INK} strokeWidth={3} />
      <line x1={x + 10} y1={y} x2={x + 50} y2={y} stroke={INK} strokeWidth={3} />
    </g>
  );
}

function Symbols() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* 1 non-polar IEC */}
      <Leads x={100} y={90} />
      <line x1={92} y1={60} x2={92} y2={120} stroke={INK} strokeWidth={4} />
      <line x1={108} y1={60} x2={108} y2={120} stroke={INK} strokeWidth={4} />
      <Label x={100} y={155} size={22}>ไม่มีขั้ว</Label>
      <Label x={100} y={182} size={20} muted>IEC / ANSI</Label>
      {/* 2 polar IEC: hollow (+) and filled (−) */}
      <Leads x={300} y={90} />
      <rect x={282} y={60} width={10} height={60} fill={BG} stroke={INK} strokeWidth={3} />
      <rect x={308} y={60} width={10} height={60} fill={INK} stroke={INK} strokeWidth={3} />
      <text x={268} y={60} fontSize={24} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="var(--fig-plus)">+</text>
      <Label x={300} y={155} size={22}>มีขั้ว (IEC)</Label>
      <Label x={300} y={182} size={20} muted>แผ่นโปร่ง = +</Label>
      {/* 3 polar ANSI: straight (+) curved (−) */}
      <Leads x={500} y={90} />
      <line x1={492} y1={60} x2={492} y2={120} stroke={INK} strokeWidth={4} />
      <path d="M 514 60 Q 504 90 514 120" fill="none" stroke={INK} strokeWidth={4} />
      <text x={476} y={60} fontSize={24} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="var(--fig-plus)">+</text>
      <Label x={500} y={155} size={22}>มีขั้ว (ANSI)</Label>
      <Label x={500} y={182} size={20} muted>แผ่นโค้ง = −</Label>
      {/* 4 variable */}
      <Leads x={170} y={280} />
      <line x1={162} y1={250} x2={162} y2={310} stroke={INK} strokeWidth={4} />
      <line x1={178} y1={250} x2={178} y2={310} stroke={INK} strokeWidth={4} />
      <line x1={136} y1={318} x2={200} y2={244} stroke={INK} strokeWidth={2.5} />
      <path d="M 206 237 L 191 243 L 200 251 Z" fill={INK} />
      <Label x={170} y={348} size={22}>ปรับค่าได้</Label>
      <Label x={170} y={375} size={20} muted>(variable) ลูกศร</Label>
      {/* 5 trimmer */}
      <Leads x={430} y={280} />
      <line x1={422} y1={250} x2={422} y2={310} stroke={INK} strokeWidth={4} />
      <line x1={438} y1={250} x2={438} y2={310} stroke={INK} strokeWidth={4} />
      <line x1={396} y1={318} x2={462} y2={242} stroke={INK} strokeWidth={2.5} />
      <line x1={455} y1={236} x2={469} y2={248} stroke={INK} strokeWidth={3} />
      <Label x={430} y={348} size={22}>ทริมเมอร์</Label>
      <Label x={430} y={375} size={20} muted>(trimmer) ปลายรูป T</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F05  Decoding 2A104J                                             */
/* ------------------------------------------------------------------ */
function CodeDecode() {
  const cols = [
    { x: 105, code: "2A", line1: "1.0 × 10²", line2: "= 100 V", head: "อัตราทนแรงดัน" },
    { x: 300, code: "104", line1: "10 × 10⁴ pF", line2: "= 0.1 µF", head: "ความจุ" },
    { x: 495, code: "J", line1: "±5%", line2: "", head: "ค่าผิดพลาด" },
  ];
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <rect x={165} y={20} width={270} height={76} rx={10} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={3} />
      <text x={240} y={60} fontSize={40} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="var(--fig-accent-2)">2A</text>
      <text x={322} y={60} fontSize={40} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={INK}>104</text>
      <text x={398} y={60} fontSize={40} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="var(--fig-ok)">J</text>
      <Arrow from={[240, 98]} to={[120, 150]} color={MUTED} width={2.5} />
      <Arrow from={[322, 98]} to={[300, 150]} color={MUTED} width={2.5} />
      <Arrow from={[398, 98]} to={[480, 150]} color={MUTED} width={2.5} />
      {cols.map((c) => (
        <g key={c.code}>
          <rect x={c.x - 90} y={156} width={180} height={170} rx={10} fill={PANEL} stroke={INK} strokeWidth={2.5} />
          <Label x={c.x} y={186} size={22} weight={700}>{c.head}</Label>
          <Label x={c.x} y={224} size={26} weight={700}>{c.code}</Label>
          <Label x={c.x} y={264} size={22}>{c.line1}</Label>
          {c.line2 ? <Label x={c.x} y={298} size={22} weight={700}>{c.line2}</Label> : null}
        </g>
      ))}
      <Label x={300} y={358} size={20} muted>รหัส 3 หลักอ่านเป็น pF เสมอ: 2 หลักแรก × 10^(หลักที่ 3)</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F06  Series 60/30/20 µF at 30 V                                  */
/* ------------------------------------------------------------------ */
function SeriesCaps() {
  const caps = [
    { x: 230, n: "C₁", v: "60 µF", u: "V₁ = 5 V" },
    { x: 360, n: "C₂", v: "30 µF", u: "V₂ = 10 V" },
    { x: 490, n: "C₃", v: "20 µF", u: "V₃ = 15 V" },
  ];
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      <Wire points={[[100, 175], [100, 100], [200, 100]]} />
      <Wire points={[[260, 100], [330, 100]]} />
      <Wire points={[[390, 100], [460, 100]]} />
      <Wire points={[[520, 100], [570, 100], [570, 290], [100, 290], [100, 235]]} />
      <Battery x={100} y={205} angle={90} />
      <Label x={136} y={222} anchor="start" size={22} weight={700}>E = 30 V</Label>
      {caps.map((c) => (
        <g key={c.n}>
          <Capacitor x={c.x} y={100} label={c.n} value={c.v} />
          <Label x={c.x} y={150} size={20} weight={700} color="var(--fig-accent)">{c.u}</Label>
        </g>
      ))}
      <Label x={360} y={215} size={22}>ความจุรวม = 10 µF</Label>
      <Label x={340} y={250} size={20} muted>Q = 300 µC เท่ากันทุกตัว</Label>
      <Label x={300} y={330} size={20} muted>5 + 10 + 15 = 30 V ✓ ตัวค่าน้อยรับแรงดันมาก</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F07  Charge / discharge curves                                   */
/* ------------------------------------------------------------------ */
function RCCurves() {
  const X0 = 80;
  const SX = 98;
  const Y0 = 340;
  const SY = 3;
  const px = (n: number) => X0 + n * SX;
  const py = (p: number) => Y0 - p * SY;
  let charge = "";
  let dis = "";
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * 5;
    charge += `${i ? "L" : "M"} ${px(t).toFixed(1)} ${py(100 * (1 - Math.exp(-t))).toFixed(1)} `;
    dis += `${i ? "L" : "M"} ${px(t).toFixed(1)} ${py(100 * Math.exp(-t)).toFixed(1)} `;
  }
  const pts = [
    { n: 1, p: 63.2, lx: px(1) + 14, ly: 174, a: "start" as const },
    { n: 2, p: 86.5, lx: px(2), ly: 114, a: "middle" as const },
    { n: 3, p: 95.0, lx: px(3), ly: 84, a: "middle" as const },
    { n: 4, p: 98.2, lx: px(4), ly: 72, a: "middle" as const },
    { n: 5, p: 99.3, lx: px(5), ly: 70, a: "end" as const },
  ];
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* grid */}
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <line key={n} x1={px(n)} y1={py(0)} x2={px(n)} y2={py(100)} stroke="var(--fig-grid)" strokeWidth={1.5} />
      ))}
      {[0, 50, 100].map((p) => (
        <line key={p} x1={px(0)} y1={py(p)} x2={px(5)} y2={py(p)} stroke="var(--fig-grid)" strokeWidth={1.5} />
      ))}
      <line x1={px(0)} y1={py(63.2)} x2={px(1)} y2={py(63.2)} stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 5" />
      {/* axes */}
      <line x1={px(0)} y1={py(0)} x2={px(5) + 8} y2={py(0)} stroke={INK} strokeWidth={2.5} />
      <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(100) - 10} stroke={INK} strokeWidth={2.5} />
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <Label key={n} x={px(n)} y={366} size={20}>{n === 0 ? "0" : `${n}τ`}</Label>
      ))}
      {[0, 50, 100].map((p) => (
        <Label key={p} x={70} y={py(p)} size={20} anchor="end">{`${p}`}</Label>
      ))}
      <Label x={330} y={402} size={20} muted>เวลา t (หน่วยเป็น τ = RC)</Label>
      <text x={22} y={190} fontSize={20} textAnchor="middle" dominantBaseline="middle" fill={MUTED} transform="rotate(-90 22 190)">แรงดันคร่อม C (% ของ E)</text>
      {/* curves */}
      <path d={charge} fill="none" stroke="var(--fig-accent)" strokeWidth={3.5} />
      <path d={dis} fill="none" stroke="var(--fig-current)" strokeWidth={3.5} strokeDasharray="10 7" />
      {pts.map((q) => (
        <g key={q.n}>
          <circle cx={px(q.n)} cy={py(q.p)} r={6} fill="var(--fig-accent)" stroke={BG} strokeWidth={2} />
          <Label x={q.lx} y={q.ly} size={20} anchor={q.a} weight={700} color="var(--fig-accent)">{`${q.p.toFixed(1)}%`}</Label>
        </g>
      ))}
      <circle cx={px(1)} cy={py(36.8)} r={6} fill="var(--fig-current)" stroke={BG} strokeWidth={2} />
      <Label x={px(1) + 12} y={py(36.8) - 16} size={20} anchor="start" weight={700} color="var(--fig-current)">36.8%</Label>
      {/* legend */}
      <line x1={400} y1={190} x2={440} y2={190} stroke="var(--fig-accent)" strokeWidth={3.5} />
      <Label x={450} y={190} size={20} anchor="start">ประจุ (charge)</Label>
      <line x1={400} y1={225} x2={440} y2={225} stroke="var(--fig-current)" strokeWidth={3.5} strokeDasharray="10 7" />
      <Label x={450} y={225} size={20} anchor="start">คายประจุ</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F08  RC lab circuit with SPDT switch and DMM                     */
/* ------------------------------------------------------------------ */
function RCLabCircuit() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      {/* battery to charge contact */}
      <Wire points={[[90, 175], [90, 60], [190, 60]]} />
      <Battery x={90} y={205} angle={90} label="E" value="9 V" labelSide="b" />
      <Wire points={[[90, 235], [90, 320], [460, 320]]} />
      {/* discharge contact to 0 V rail */}
      <Wire points={[[190, 130], [190, 320]]} />
      <Node x={190} y={320} />
      {/* switch contacts */}
      <circle cx={190} cy={60} r={5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={190} cy={130} r={5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={250} cy={95} r={5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={246} y1={92} x2={196} y2={63} stroke={INK} strokeWidth={3.5} />
      <Label x={180} y={38} anchor="end" size={20} weight={700}>ชาร์จ</Label>
      <Label x={180} y={150} anchor="end" size={20} weight={700}>คาย</Label>
      <Label x={250} y={128} size={20} muted>S</Label>
      {/* R and C */}
      <Wire points={[[255, 95], [300, 95]]} />
      <Resistor x={340} y={95} label="R" value="100 kΩ" />
      <Wire points={[[380, 95], [460, 95], [460, 170]]} />
      <Capacitor x={460} y={200} angle={90} polarized label="C" value="100 µF" labelSide="b" />
      <Wire points={[[460, 230], [460, 320]]} />
      <Arrow from={[392, 76]} to={[446, 76]} label="i" labelOffset={[0, -16]} />
      {/* voltmeter across C */}
      <Node x={460} y={130} />
      <Node x={460} y={290} />
      <Wire points={[[460, 130], [550, 130], [550, 172]]} />
      <Meter x={550} y={200} kind="V" angle={90} />
      <Wire points={[[550, 228], [550, 290], [460, 290]]} />
      <Label x={590} y={352} size={20} anchor="end" muted>DMM วัดแรงดันคร่อม C</Label>
      <Label x={260} y={352} size={20} muted>τ = RC = 10 s</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F09  Safe discharge vs screwdriver short                         */
/* ------------------------------------------------------------------ */
function Can({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 14} y1={y + 120} x2={x - 14} y2={y + 170} stroke={INK} strokeWidth={4} />
      <line x1={x + 14} y1={y + 120} x2={x + 14} y2={y + 170} stroke={INK} strokeWidth={4} />
      <rect x={x - 40} y={y} width={80} height={120} rx={10} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={x + 18} y={y + 8} width={16} height={104} fill="var(--fig-muted)" />
    </g>
  );
}

function SafeDischarge() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      {/* left panel OK */}
      <rect x={6} y={6} width={288} height={368} rx={12} fill="none" stroke="var(--fig-ok)" strokeWidth={3} />
      <Label x={150} y={34} size={24} weight={700} color="var(--fig-ok)">✓ ถูกต้อง</Label>
      <Can x={110} y={60} />
      {/* discharge tool: clip leads + resistor */}
      <Wire points={[[96, 225], [96, 250], [60, 250], [60, 300]]} color="var(--fig-wire-n)" />
      <Wire points={[[124, 225], [124, 250], [250, 250], [250, 300]]} color="var(--fig-wire-l)" />
      <rect x={86} y={216} width={20} height={16} rx={3} fill="var(--fig-accent-2)" />
      <rect x={114} y={216} width={20} height={16} rx={3} fill="var(--fig-accent-2)" />
      <Resistor x={155} y={300} />
      <Wire points={[[60, 300], [115, 300]]} color="var(--fig-wire-n)" />
      <Wire points={[[195, 300], [250, 300]]} color="var(--fig-wire-l)" />
      <Label x={165} y={95} size={20} anchor="start">คีบค้าง ≥ 5τ</Label>
      <Label x={165} y={125} size={20} anchor="start">แล้ววัดยืนยัน</Label>
      <Label x={165} y={155} size={20} anchor="start">≈ 0 V</Label>
      <Label x={150} y={335} size={20}>R 1–10 kΩ ≥ 2 W</Label>
      <Label x={150} y={360} size={20} muted>ปากคีบด้ามฉนวน</Label>
      {/* right panel DANGER */}
      <rect x={306} y={6} width={288} height={368} rx={12} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={3} />
      <Label x={450} y={34} size={24} weight={700} color="var(--fig-danger)">✗ อันตราย</Label>
      <Can x={420} y={60} />
      {/* screwdriver across legs */}
      <rect x={472} y={214} width={110} height={26} rx={10} fill="var(--fig-warn)" stroke={INK} strokeWidth={2.5} />
      <rect x={385} y={222} width={88} height={10} fill={MUTED} stroke={INK} strokeWidth={2} />
      {/* spark */}
      <path d="M 406 190 L 412 210 L 398 206 L 410 228 L 392 214 L 402 244" fill="none" stroke="var(--fig-danger)" strokeWidth={3} />
      <path d="M 432 196 l 6 14 l -10 -2 l 8 16" fill="none" stroke="var(--fig-danger)" strokeWidth={3} />
      <Label x={450} y={290} size={20}>ไขควงช็อตขา</Label>
      <Label x={450} y={318} size={20}>ประกายไฟ ขาไหม้</Label>
      <Label x={450} y={346} size={20}>ภายในเสียหาย</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F10  Analog ohmmeter needle behaviour                            */
/* ------------------------------------------------------------------ */
function Dial({
  ox,
  oy,
  title,
  desc,
  needle,
  ghost,
  anim,
  tone,
}: {
  ox: number;
  oy: number;
  title: string;
  desc: string;
  needle: number;
  ghost?: number;
  anim?: boolean;
  tone: "ok" | "danger";
}) {
  const cx = ox + 150;
  const cy = oy + 165;
  const R = 95;
  const L = 86;
  const pt = (deg: number, r: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
  const [ax, ay] = pt(150, R);
  const [bx, by] = pt(30, R);
  const [nx, ny] = pt(needle, L);
  const color = tone === "ok" ? "var(--fig-ok)" : "var(--fig-danger)";
  return (
    <g>
      <rect x={ox + 6} y={oy + 6} width={288} height={218} rx={12} fill={PANEL} stroke={color} strokeWidth={2.5} />
      <Label x={ox + 150} y={oy + 32} size={22} weight={700} color={color}>{title}</Label>
      <path d={`M ${ax} ${ay} A ${R} ${R} 0 0 1 ${bx} ${by}`} fill="none" stroke={INK} strokeWidth={3} />
      <Label x={ax - 12} y={ay + 2} size={22} anchor="end">∞</Label>
      <Label x={bx + 12} y={by + 2} size={22} anchor="start">0</Label>
      {ghost !== undefined ? (
        (() => {
          const [gx, gy] = pt(ghost, L);
          return <line x1={cx} y1={cy} x2={gx} y2={gy} stroke={MUTED} strokeWidth={2.5} strokeDasharray="6 5" />;
        })()
      ) : null}
      {anim ? (
        <line
          className="w08f10-swing"
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="var(--fig-danger)"
          strokeWidth={3.5}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      ) : (
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--fig-danger)" strokeWidth={3.5} />
      )}
      <circle cx={cx} cy={cy} r={7} fill={INK} />
      <Label x={ox + 150} y={oy + 200} size={20}>{desc}</Label>
    </g>
  );
}

function NeedleStates() {
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      <style>{`.w08f10-swing{animation:w08f10s 4s ease-in-out infinite}@keyframes w08f10s{0%,15%{transform:rotate(0deg)}25%{transform:rotate(112deg)}90%,100%{transform:rotate(0deg)}}`}</style>
      <Dial ox={0} oy={0} title="✓ ดี" desc="ตีขึ้นแล้วค่อย ๆ คืนถึง ∞" needle={150} ghost={38} anim tone="ok" />
      <Dial ox={300} oy={0} title="✗ ช็อต" desc="ตีขึ้นค้างที่ 0 Ω" needle={32} tone="danger" />
      <Dial ox={0} oy={230} title="✗ ขาด" desc="เข็มไม่ขยับเลย (∞)" needle={150} tone="danger" />
      <Dial ox={300} oy={230} title="✗ รั่ว" desc="ตีขึ้นแล้วคืนไม่สุด" needle={105} ghost={38} tone="danger" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F11  Failed electrolytics                                         */
/* ------------------------------------------------------------------ */
function FailedCaps() {
  const body = (x: number) => (
    <g>
      <line x1={x - 14} y1={250} x2={x - 14} y2={285} stroke={INK} strokeWidth={4} />
      <line x1={x + 14} y1={250} x2={x + 14} y2={285} stroke={INK} strokeWidth={4} />
      <rect x={x - 50} y={90} width={100} height={160} rx={10} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={x + 26} y={100} width={18} height={140} fill="var(--fig-muted)" />
    </g>
  );
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      {/* normal */}
      {body(100)}
      <ellipse cx={100} cy={90} rx={50} ry={12} fill={BG} stroke={INK} strokeWidth={3} />
      <g stroke={INK} strokeWidth={2.5}>
        <line x1={88} y1={83} x2={88} y2={97} />
        <line x1={88} y1={90} x2={114} y2={83} />
        <line x1={88} y1={90} x2={114} y2={97} />
      </g>
      <Label x={100} y={40} size={22} weight={700} color="var(--fig-ok)">✓ ปกติ</Label>
      <Label x={100} y={315} size={20}>หัวแบนเรียบ</Label>
      {/* bulged */}
      {body(300)}
      <path d="M 250 92 Q 300 40 350 92" fill={BG} stroke="var(--fig-danger)" strokeWidth={3.5} />
      <g stroke="var(--fig-danger)" strokeWidth={2.5}>
        <line x1={288} y1={60} x2={300} y2={74} />
        <line x1={312} y1={60} x2={300} y2={74} />
      </g>
      <Label x={300} y={30} size={22} weight={700} color="var(--fig-danger)">✗ หัวโป่ง</Label>
      <Label x={300} y={315} size={20}>ร่องนิรภัยดันนูน/ปริ</Label>
      {/* leaking */}
      {body(500)}
      <ellipse cx={500} cy={90} rx={50} ry={12} fill={BG} stroke={INK} strokeWidth={3} />
      <path d="M 452 230 q 10 22 0 40 q 30 10 96 4 q -8 -20 0 -44" fill="var(--fig-copper)" opacity={0.75} />
      <ellipse cx={500} cy={290} rx={70} ry={10} fill="var(--fig-copper)" opacity={0.6} />
      <Label x={500} y={40} size={22} weight={700} color="var(--fig-danger)">✗ มีคราบรั่ว</Label>
      <Label x={500} y={315} size={20}>คราบน้ำตาลที่ฐาน</Label>
      <Label x={300} y={348} size={20} muted>พบตัวเสียแบบนี้: หยุดจ่ายไฟ คายประจุ แล้วเปลี่ยนตัวใหม่</Label>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F12  Find-fault: four electrolytic circuits                      */
/* ------------------------------------------------------------------ */
function MiniPanel({
  ox,
  oy,
  tag,
  supply,
  caps,
}: {
  ox: number;
  oy: number;
  tag: string;
  supply: string;
  caps: { reversed?: boolean; v: string; wv: string }[];
}) {
  const top = oy + 60;
  const bot = oy + 190;
  const capX = ox + 200;
  return (
    <g>
      <rect x={ox + 6} y={oy + 6} width={288} height={218} rx={12} fill={PANEL} stroke="var(--fig-grid)" strokeWidth={2.5} />
      <Label x={ox + 24} y={oy + 28} size={24} weight={700} anchor="start">{tag}</Label>
      <Wire points={[[ox + 60, oy + 95], [ox + 60, top], [ox + 110, top]]} />
      <Resistor x={ox + 150} y={top} />
      <Label x={ox + 150} y={oy + 30} size={20} muted>1 kΩ</Label>
      <Battery x={ox + 60} y={oy + 125} angle={90} />
      <Label x={ox + 92} y={oy + 140} anchor="start" size={22} weight={700}>{supply}</Label>
      <Wire points={[[ox + 60, oy + 155], [ox + 60, bot], [capX, bot]]} />
      {caps.length === 1 ? (
        <g>
          <Wire points={[[ox + 190, top], [capX, top], [capX, oy + 95]]} />
          <Capacitor x={capX} y={oy + 125} angle={caps[0].reversed ? -90 : 90} polarized />
          <Wire points={[[capX, oy + 155], [capX, bot]]} />
          <Label x={capX + 30} y={oy + 112} anchor="start" size={20}>{caps[0].v}</Label>
          <Label x={capX + 30} y={oy + 138} anchor="start" size={20} weight={700}>{caps[0].wv}</Label>
        </g>
      ) : (
        <g>
          <Wire points={[[ox + 190, top], [capX, top], [capX, oy + 65]]} />
          <Capacitor x={capX} y={oy + 95} angle={90} polarized />
          <Capacitor x={capX} y={oy + 155} angle={90} polarized />
          <Wire points={[[capX, oy + 185], [capX, bot]]} />
          <Label x={capX + 30} y={oy + 95} anchor="start" size={20} weight={700}>{caps[0].wv}</Label>
          <Label x={capX + 30} y={oy + 155} anchor="start" size={20} weight={700}>{caps[1].wv}</Label>
        </g>
      )}
      <Label x={ox + 150} y={oy + 210} size={20} muted>{caps.length === 1 ? caps[0].v + " " + caps[0].wv : "100 µF 16 V × 2 อนุกรม"}</Label>
    </g>
  );
}

function FaultPanels() {
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      <MiniPanel ox={0} oy={0} tag="ก" supply="12 V" caps={[{ reversed: true, v: "100 µF", wv: "25 V" }]} />
      <MiniPanel ox={300} oy={0} tag="ข" supply="24 V" caps={[{ v: "100 µF", wv: "16 V" }]} />
      <MiniPanel ox={0} oy={230} tag="ค" supply="24 V" caps={[{ v: "100 µF", wv: "16 V" }, { v: "100 µF", wv: "16 V" }]} />
      <MiniPanel ox={300} oy={230} tag="ง" supply="12 V" caps={[{ v: "100 µF", wv: "25 V" }]} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* W08-F13  Intro: LED keeps glowing after unplugging                   */
/* ------------------------------------------------------------------ */
function IntroFade() {
  return (
    <svg viewBox="0 0 600 340" aria-hidden="true">
      <Wire points={[[80, 165], [80, 80], [140, 80]]} />
      <Battery x={80} y={195} angle={90} />
      <Label x={100} y={250} size={20} anchor="start" muted>อะแดปเตอร์ 12 V</Label>
      <SwitchSym x={180} y={80} label="ถอดปลั๊ก" />
      <Wire points={[[220, 80], [330, 80]]} />
      <Resistor x={370} y={80} label="R" value="1 kΩ" />
      <Wire points={[[410, 80], [500, 80], [500, 160]]} />
      <Diode x={500} y={190} angle={90} kind="led" lit />
      <Label x={540} y={196} size={22} anchor="start">LED</Label>
      <Wire points={[[500, 220], [500, 290], [80, 290], [80, 225]]} />
      <Node x={270} y={80} />
      <Node x={270} y={290} />
      <Wire points={[[270, 80], [270, 160]]} />
      <Capacitor x={270} y={190} angle={90} polarized label="C" value="1,000 µF" labelSide="b" />
      <Wire points={[[270, 220], [270, 290]]} />
      <Arrow from={[284, 56]} to={[326, 56]} />
      <Arrow from={[420, 56]} to={[480, 56]} />
      <Label x={390} y={160} size={20} color="var(--fig-current)">กระแสจาก C</Label>
      <Label x={390} y={186} size={20} color="var(--fig-current)">ไหลไป LED</Label>
      <Label x={300} y={322} size={20} muted>ตัดแหล่งจ่ายแล้ว LED ยังสว่างแล้วค่อย ๆ หรี่ลง</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W08-F01": ParallelPlate,
  "W08-F02": ElectrolyticCutaway,
  "W08-F03": TypesGallery,
  "W08-F04": Symbols,
  "W08-F05": CodeDecode,
  "W08-F06": SeriesCaps,
  "W08-F07": RCCurves,
  "W08-F08": RCLabCircuit,
  "W08-F09": SafeDischarge,
  "W08-F10": NeedleStates,
  "W08-F11": FailedCaps,
  "W08-F12": FaultPanels,
  "W08-F13": IntroFade,
};
export default figures;
