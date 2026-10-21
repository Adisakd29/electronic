import type { FigureMap } from "@/content/types";
import { Label, Arrow, ACSource, SwitchSym, Wire, Ground } from "./kit";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const MUTED = "var(--fig-muted)";
const CU = "var(--fig-copper)";
const SOLDER = "var(--fig-grid)";

// ---------------------------------------------------------------------------
// Shared: side view (cross-section) of a through-hole joint, solder side up.
// (x, y) = centre of the hole on the top surface of the board. k = scale.
// ---------------------------------------------------------------------------
type JK =
  | "bare"
  | "good"
  | "sac"
  | "excess"
  | "insufficient"
  | "cold"
  | "nonwet"
  | "lifted"
  | "disturbed"
  | "burnt"
  | "bridge";

function Joint({ x, y, kind, k = 1 }: { x: number; y: number; kind: JK; k?: number }) {
  const X = (d: number) => x + d * k;
  const Y = (d: number) => y + d * k;
  const pt = (dx: number, dy: number) => `${X(dx)} ${Y(dy)}`;
  const board = <rect x={X(-70)} y={y} width={140 * k} height={16 * k} fill={PANEL} stroke={MUTED} strokeWidth={2} />;
  const lead = (dx: number, tilt = 0) => (
    <rect
      x={X(dx - 4)}
      y={Y(-46)}
      width={8 * k}
      height={76 * k}
      fill={MUTED}
      stroke={INK}
      strokeWidth={1.5}
      transform={tilt ? `rotate(${tilt} ${X(dx)} ${y})` : undefined}
    />
  );
  const pad = (from: number, to: number) => (
    <rect x={X(from)} y={Y(-6)} width={(to - from) * k} height={6 * k} fill={CU} stroke={INK} strokeWidth={1} />
  );
  const solderStyle = { fill: SOLDER, stroke: INK, strokeWidth: 2.5, strokeLinejoin: "round" as const };
  const dots = (pts: [number, number][]) => (
    <g>
      {pts.map(([dx, dy], i) => (
        <circle key={i} cx={X(dx)} cy={Y(dy)} r={1.8 * k} fill={MUTED} />
      ))}
    </g>
  );

  if (kind === "bridge") {
    return (
      <g>
        {board}
        {lead(-30)}
        {lead(30)}
        {pad(-50, -14)}
        {pad(14, 50)}
        <path
          d={`M ${pt(-52, -6)} C ${pt(-60, -50)} ${pt(-14, -40)} ${pt(0, -30)} C ${pt(14, -40)} ${pt(60, -50)} ${pt(52, -6)} Z`}
          {...solderStyle}
        />
      </g>
    );
  }

  // lifted pad geometry: right pad rotated −20° about (5, 0)
  const th = (-20 * Math.PI) / 180;
  const rot = (px: number, py: number): [number, number] => {
    const dx = px - 5;
    return [5 + dx * Math.cos(th) - py * Math.sin(th), dx * Math.sin(th) + py * Math.cos(th)];
  };

  let solder: React.ReactNode = null;
  switch (kind) {
    case "good":
    case "sac":
    case "burnt":
      solder = (
        <g>
          <path d={`M ${pt(-30, -6)} Q ${pt(-8, -8)} ${pt(-4, -40)} L ${pt(4, -40)} Q ${pt(8, -8)} ${pt(30, -6)} Z`} {...solderStyle} />
          {kind === "good" ? (
            <path d={`M ${pt(-22, -10)} Q ${pt(-11, -12)} ${pt(-8, -26)}`} fill="none" stroke={BG} strokeWidth={3} strokeLinecap="round" />
          ) : null}
          {kind === "sac" ? dots([[-16, -10], [-9, -16], [12, -11], [8, -22], [18, -8]]) : null}
        </g>
      );
      break;
    case "excess":
      solder = <path d={`M ${pt(-30, -6)} C ${pt(-52, -62)} ${pt(52, -62)} ${pt(30, -6)} Z`} {...solderStyle} />;
      break;
    case "insufficient":
      solder = <path d={`M ${pt(-13, -6)} Q ${pt(-6, -7)} ${pt(-4, -16)} L ${pt(4, -16)} Q ${pt(6, -7)} ${pt(13, -6)} Z`} {...solderStyle} />;
      break;
    case "cold": {
      const p: [number, number][] = [
        [-26, -6], [-31, -14], [-22, -19], [-27, -27], [-15, -33], [-7, -29], [0, -40],
        [8, -31], [17, -36], [21, -26], [31, -22], [24, -14], [30, -6],
      ];
      solder = (
        <g>
          <path d={"M " + p.map(([a, b]) => pt(a, b)).join(" L ") + " Z"} {...solderStyle} />
          {dots([[-20, -12], [-14, -22], [-6, -14], [10, -18], [16, -10], [6, -26], [-2, -22], [22, -18]])}
        </g>
      );
      break;
    }
    case "nonwet":
      solder = <ellipse cx={X(0)} cy={Y(-27)} rx={15 * k} ry={13 * k} {...solderStyle} />;
      break;
    case "lifted": {
      const [ex, ey] = rot(30, -6);
      solder = <path d={`M ${pt(-30, -6)} Q ${pt(-8, -8)} ${pt(-4, -40)} L ${pt(4, -40)} Q ${pt(9, -14)} ${pt(ex, ey)} Z`} {...solderStyle} />;
      break;
    }
    case "disturbed":
      solder = (
        <g>
          <path
            d={`M ${pt(-30, -6)} Q ${pt(-10, -10)} ${pt(-6, -38)} L ${pt(3, -40)} L ${pt(8, -30)} L ${pt(6, -24)} L ${pt(12, -16)} L ${pt(20, -12)} L ${pt(30, -6)} Z`}
            {...solderStyle}
          />
          <polyline points={[pt(-22, -9), pt(-16, -14), pt(-18, -19), pt(-11, -24)].join(" ")} fill="none" stroke={INK} strokeWidth={1.8} />
          <polyline points={[pt(10, -20), pt(16, -15), pt(14, -10)].join(" ")} fill="none" stroke={INK} strokeWidth={1.8} />
          {dots([[-12, -12], [6, -12], [-4, -20]])}
        </g>
      );
      break;
  }

  const [r1x, r1y] = rot(5, -6);
  const [r2x, r2y] = rot(30, -6);
  const [r3x, r3y] = rot(30, 0);
  return (
    <g>
      {board}
      {lead(0, kind === "disturbed" ? 9 : 0)}
      {pad(-30, -5)}
      {kind === "lifted" ? (
        <g>
          <polygon points={[pt(5, 0), pt(r3x, r3y), pt(30, 0)].join(" ")} fill={BG} stroke="var(--fig-danger)" strokeWidth={1.5} strokeDasharray="3 2" />
          <polygon points={[pt(5, 0), pt(r1x, r1y), pt(r2x, r2y), pt(r3x, r3y)].join(" ")} fill={CU} stroke={INK} strokeWidth={1} />
        </g>
      ) : (
        pad(5, 30)
      )}
      {solder}
      {kind === "burnt" ? (
        <g fill={INK} opacity={0.75}>
          <ellipse cx={X(-40)} cy={Y(-3)} rx={11 * k} ry={4.5 * k} />
          <ellipse cx={X(40)} cy={Y(-3)} rx={12 * k} ry={4.5 * k} />
          <ellipse cx={X(-14)} cy={Y(-14)} rx={5 * k} ry={3 * k} />
          <ellipse cx={X(14)} cy={Y(-12)} rx={4 * k} ry={3 * k} />
        </g>
      ) : null}
    </g>
  );
}

// ---------------------------------------------------------------------------
// F01 Soldering vs welding (principle)
// ---------------------------------------------------------------------------
function SolderVsWeld() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      <Label x={150} y={28} size={24} weight={700}>การบัดกรี (soldering)</Label>
      <Label x={450} y={28} size={24} weight={700}>การเชื่อม (welding)</Label>
      <line x1={300} y1={10} x2={300} y2={350} stroke="var(--fig-grid)" strokeWidth={2} />
      {/* soldering: wire lying on a copper pad */}
      <rect x={30} y={190} width={240} height={40} fill={CU} stroke={INK} strokeWidth={2} />
      <path d="M 70 190 Q 120 186 128 150 L 172 150 Q 180 186 230 190 Z" fill={SOLDER} stroke={INK} strokeWidth={2.5} />
      <rect x={110} y={120} width={80} height={34} rx={6} fill={CU} stroke={INK} strokeWidth={2} />
      {/* IMC layer */}
      <path d="M 72 188 L 228 188" stroke="var(--fig-accent)" strokeWidth={3} strokeDasharray="6 4" />
      <path d="M 128 153 L 172 153" stroke="var(--fig-accent)" strokeWidth={3} strokeDasharray="6 4" />
      <Label x={150} y={92} size={20}>ตะกั่วเปียกผิวและไหลแผ่</Label>
      <Label x={150} y={256} size={20} color="var(--fig-accent)">- - ชั้นสารประกอบโลหะ (IMC)</Label>
      <Label x={150} y={290} size={20}>โลหะงานไม่หลอม</Label>
      <Label x={150} y={320} size={20} muted>โลหะบัดกรีหลอม &lt; 450 °C</Label>
      {/* welding: two plates fused */}
      <rect x={330} y={170} width={115} height={50} fill={PANEL} stroke={INK} strokeWidth={2} />
      <rect x={455} y={170} width={115} height={50} fill={PANEL} stroke={INK} strokeWidth={2} />
      <path d="M 415 170 Q 450 140 485 170 L 478 220 Q 450 232 422 220 Z" fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={2.5} />
      <g stroke="var(--fig-danger)" strokeWidth={1.5}>
        <line x1={428} y1={180} x2={444} y2={164} />
        <line x1={432} y1={200} x2={462} y2={170} />
        <line x1={440} y1={214} x2={475} y2={180} />
        <line x1={458} y1={218} x2={478} y2={198} />
      </g>
      <Label x={450} y={110} size={20}>แนวเชื่อม: โลหะงานหลอมรวม</Label>
      <Label x={450} y={290} size={20}>โลหะงานหลอมละลาย</Label>
      <Label x={450} y={320} size={20} muted>เหล็กกล้า ≈ 1,400 °C ขึ้นไป</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 Safe soldering bench (hotspot)
// ---------------------------------------------------------------------------
function SafeBench() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      {/* bench */}
      <rect x={10} y={300} width={580} height={24} fill="var(--fig-copper-soft)" stroke={MUTED} strokeWidth={2} />
      {/* safety glasses */}
      <g stroke={INK} strokeWidth={3} fill="var(--fig-accent-soft)">
        <ellipse cx={72} cy={80} rx={30} ry={20} />
        <ellipse cx={138} cy={80} rx={30} ry={20} />
        <path d="M 102 76 Q 105 68 108 76" fill="none" />
        <path d="M 42 74 L 24 66" fill="none" />
        <path d="M 168 74 L 186 66" fill="none" />
      </g>
      <Label x={105} y={128} size={20}>แว่นตานิรภัย</Label>
      {/* ESD wrist strap */}
      <ellipse cx={238} cy={80} rx={24} ry={14} fill="none" stroke={INK} strokeWidth={4} />
      <path d="M 262 80 q 6 -10 12 0 t 12 0 t 12 0 t 12 0 L 320 80" fill="none" stroke={INK} strokeWidth={2.5} />
      <Ground x={320} y={80} />
      <Label x={275} y={36} size={20}>สายรัดข้อมือ ESD</Label>
      {/* no food / drink */}
      <g>
        <path d="M 385 60 L 415 60 L 410 96 L 390 96 Z" fill={PANEL} stroke={INK} strokeWidth={2.5} />
        <circle cx={400} cy={78} r={34} fill="none" stroke="var(--fig-danger)" strokeWidth={5} />
        <line x1={376} y1={54} x2={424} y2={102} stroke="var(--fig-danger)" strokeWidth={5} />
      </g>
      <Label x={400} y={132} size={20}>ห้ามกิน/ดื่ม</Label>
      {/* fume extractor */}
      <rect x={485} y={150} width={100} height={100} rx={8} fill={PANEL} stroke={INK} strokeWidth={3} />
      <circle cx={535} cy={200} r={36} fill={BG} stroke={INK} strokeWidth={2} />
      <g fill={MUTED}>
        <path d="M 535 200 L 535 168 Q 552 176 535 200 Z" />
        <path d="M 535 200 L 563 216 Q 546 228 535 200 Z" />
        <path d="M 535 200 L 507 216 Q 510 196 535 200 Z" />
      </g>
      <Arrow from={[400, 240]} to={[478, 206]} color="var(--fig-accent)" />
      <path d="M 380 262 q -8 -10 0 -20 q 8 -10 0 -20" fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="4 4" />
      <Label x={530} y={134} size={20}>ดูดควันฟลักซ์</Label>
      {/* soldering station */}
      <rect x={30} y={210} width={150} height={90} rx={8} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={44} y={224} width={86} height={34} rx={3} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={87} y={242} size={20} weight={700}>350 °C</Label>
      <circle cx={155} cy={270} r={14} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={155} y1={270} x2={155} y2={258} stroke={INK} strokeWidth={2.5} />
      {/* cable routed behind, away from the tip */}
      <path d="M 384 176 C 400 200, 230 160, 150 210" fill="none" stroke={INK} strokeWidth={3} />
      {/* stand: coil holder + iron */}
      <ellipse cx={300} cy={294} rx={56} ry={9} fill={MUTED} stroke={INK} strokeWidth={2} />
      <line x1={280} y1={292} x2={300} y2={262} stroke={INK} strokeWidth={4} />
      <g transform="rotate(-45 320 240)">
        <rect x={270} y={226} width={100} height={28} rx={4} fill="none" stroke={INK} strokeWidth={2.5} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={280 + i * 13} y1={226} x2={286 + i * 13} y2={254} stroke={INK} strokeWidth={2} />
        ))}
        <rect x={250} y={236} width={60} height={8} fill="var(--fig-danger)" />
        <rect x={350} y={230} width={70} height={20} rx={8} fill={MUTED} stroke={INK} strokeWidth={2} />
      </g>
      {/* sponge */}
      <rect x={396} y={288} width={100} height={12} fill={MUTED} stroke={INK} strokeWidth={2} />
      <rect x={404} y={268} width={84} height={20} rx={3} fill="var(--fig-warn)" opacity={0.6} stroke={INK} strokeWidth={2} />
      <Label x={105} y={350} size={20}>สถานีบัดกรี</Label>
      <Label x={300} y={350} size={20}>ขาตั้งหัวแร้ง</Label>
      <Label x={446} y={350} size={20}>ฟองน้ำชื้น</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 Temperature-controlled station + iron cut-away
// ---------------------------------------------------------------------------
function StationCutaway() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* station */}
      <rect x={40} y={40} width={200} height={120} rx={10} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={58} y={58} width={110} height={44} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={113} y={81} size={24} weight={700}>330 °C</Label>
      <circle cx={205} cy={120} r={20} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={205} y1={120} x2={216} y2={104} stroke={INK} strokeWidth={2.5} />
      <Label x={113} y={130} size={20} muted>ตั้งค่า/แสดงผล</Label>
      <Label x={420} y={70} size={22} weight={700}>ชุดควบคุมอุณหภูมิ</Label>
      <Label x={420} y={100} size={20} muted>วัดอุณหภูมิจริง → ปรับกำลังฮีตเตอร์</Label>
      <Label x={420} y={128} size={20} muted>(ป้อนกลับ: feedback)</Label>
      {/* cord */}
      <path d="M 140 160 C 140 230, 560 220, 560 290" fill="none" stroke={INK} strokeWidth={3} />
      {/* handpiece cut-away */}
      <path d="M 70 300 L 110 290 L 110 310 Z" fill={CU} stroke={INK} strokeWidth={2} />
      <rect x={110} y={288} width={70} height={24} fill={CU} stroke={INK} strokeWidth={2} />
      <rect x={180} y={284} width={150} height={32} fill={BG} stroke={INK} strokeWidth={2.5} />
      <path
        d="M 190 300 l 6 -10 l 12 20 l 12 -20 l 12 20 l 12 -20 l 12 20 l 12 -20 l 12 20 l 12 -20 l 12 20 l 12 -20 l 6 10"
        fill="none"
        stroke="var(--fig-danger)"
        strokeWidth={2.5}
      />
      <circle cx={186} cy={300} r={5} fill="var(--fig-accent)" />
      <rect x={330} y={274} width={230} height={52} rx={20} fill={MUTED} stroke={INK} strokeWidth={3} />
      <g stroke={INK} strokeWidth={2} opacity={0.6}>
        <line x1={380} y1={278} x2={380} y2={322} />
        <line x1={400} y1={278} x2={400} y2={322} />
        <line x1={420} y1={278} x2={420} y2={322} />
      </g>
      <Label x={100} y={350} size={20}>ปลาย (tip)</Label>
      <Label x={255} y={250} size={20} color="var(--fig-danger)">ฮีตเตอร์</Label>
      <line x1={186} y1={294} x2={170} y2={262} stroke="var(--fig-accent)" strokeWidth={2} />
      <Label x={150} y={250} size={20} color="var(--fig-accent)">เซนเซอร์</Label>
      <Label x={445} y={350} size={20}>ด้ามจับ: จับตรงนี้เท่านั้น</Label>
      <Label x={300} y={395} size={20} muted>หัวแร้งแช่ทั่วไปมีฮีตเตอร์แต่ไม่มีเซนเซอร์และชุดควบคุม</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 Soldering gun = step-down transformer with a 1-turn secondary
// ---------------------------------------------------------------------------
function GunTransformer() {
  const prim = Array.from({ length: 9 }, (_, i) => 120 + i * 18);
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <ACSource x={70} y={210} angle={90} />
      <Label x={104} y={210} size={20} anchor="start">230 V</Label>
      <Wire points={[[70, 170], [70, 100], [100, 100]]} />
      <SwitchSym x={140} y={100} label="ไก (สวิตช์)" labelSide="b" />
      <Wire points={[[180, 100], [228, 100], [228, 126], [243, 126]]} />
      <Wire points={[[70, 250], [70, 310], [228, 310], [228, 270], [243, 270]]} />
      {/* core */}
      <path d="M 250 90 H 400 V 330 H 250 Z M 280 120 V 300 H 370 V 120 Z" fill={MUTED} fillRule="evenodd" stroke={INK} strokeWidth={2.5} opacity={0.85} />
      {/* primary: many turns on left limb */}
      {prim.map((yy) => (
        <ellipse key={yy} cx={265} cy={yy + 6} rx={22} ry={7} fill="none" stroke="var(--fig-accent)" strokeWidth={2.5} />
      ))}
      <Label x={265} y={60} size={20} color="var(--fig-accent)">ขดปฐมภูมิ หลายรอบ</Label>
      {/* secondary: one heavy copper turn around right limb, extended to the tip loop */}
      <path d="M 352 200 H 470 V 160 H 560 V 260 H 470 V 220 H 352" fill="none" stroke={CU} strokeWidth={12} strokeLinejoin="round" />
      <ellipse cx={385} cy={210} rx={24} ry={14} fill="none" stroke={CU} strokeWidth={12} />
      <path d="M 560 150 V 270" stroke={INK} strokeWidth={2} strokeDasharray="5 4" />
      <Label x={490} y={132} size={20} color="var(--fig-copper)">ขดทุติยภูมิ 1 รอบ</Label>
      <Label x={505} y={296} size={20}>ปลายลวดทองแดง</Label>
      <Label x={505} y={326} size={20} muted>≈ 1 V, I สูงมาก</Label>
      <Label x={300} y={372} size={20} muted>รอบน้อย → แรงดันต่ำ → กระแสที่ปลายสูง</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 Tip shapes
// ---------------------------------------------------------------------------
function TipShapes() {
  const cols = [75, 225, 375, 525];
  return (
    <svg viewBox="0 0 600 300" aria-hidden="true">
      {cols.map((cx) => (
        <rect key={cx} x={cx - 14} y={30} width={28} height={120} fill={MUTED} stroke={INK} strokeWidth={2.5} />
      ))}
      {/* conical */}
      <path d="M 61 150 L 89 150 L 76 214 L 74 214 Z" fill={CU} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {/* chisel (screwdriver) */}
      <path d="M 211 150 L 239 150 L 232 214 L 218 214 Z" fill={CU} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {/* bevel (cut at 45°) */}
      <path d="M 361 150 L 389 150 L 389 176 L 361 210 Z" fill={CU} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {/* knife */}
      <path d="M 511 150 L 539 150 L 539 214 L 531 214 L 511 182 Z" fill={CU} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <Label x={75} y={244} size={22}>กรวย</Label>
      <Label x={75} y={272} size={20} muted>conical</Label>
      <Label x={225} y={244} size={22} weight={700}>สกัด ✓</Label>
      <Label x={225} y={272} size={20} muted>chisel</Label>
      <Label x={375} y={244} size={22}>ตัดเฉียง</Label>
      <Label x={375} y={272} size={20} muted>bevel</Label>
      <Label x={525} y={244} size={22}>มีด</Label>
      <Label x={525} y={272} size={20} muted>knife</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 Flux-cored solder wire
// ---------------------------------------------------------------------------
function FluxCore() {
  const cores: [number, number][] = [
    [140, 120],
    [182, 122],
    [160, 160],
  ];
  return (
    <svg viewBox="0 0 600 320" aria-hidden="true">
      <Label x={160} y={30} size={22} weight={700}>ภาพตัดขวาง</Label>
      <circle cx={160} cy={140} r={90} fill={SOLDER} stroke={INK} strokeWidth={3} />
      {cores.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r={17} fill="var(--fig-warn)" opacity={0.75} stroke={INK} strokeWidth={2} />
      ))}
      <Label x={160} y={258} size={20}>Ø 0.6–1.0 mm (ภาพขยาย)</Label>
      <Label x={420} y={30} size={22} weight={700}>ภาพผ่าตามยาว</Label>
      <rect x={300} y={110} width={260} height={60} rx={30} fill={SOLDER} stroke={INK} strokeWidth={3} />
      <rect x={300} y={124} width={250} height={10} fill="var(--fig-warn)" opacity={0.75} />
      <rect x={300} y={146} width={250} height={10} fill="var(--fig-warn)" opacity={0.75} />
      <line x1={420} y1={129} x2={420} y2={78} stroke={INK} strokeWidth={1.5} />
      <Label x={420} y={64} size={20}>ไส้ฟลักซ์ยางสน (flux core)</Label>
      <line x1={500} y1={166} x2={500} y2={208} stroke={INK} strokeWidth={1.5} />
      <Label x={470} y={222} size={20}>โลหะบัดกรี เช่น SAC305</Label>
      <Label x={300} y={300} size={20} muted>ฟลักซ์ละลายออกก่อนโลหะ → ขจัดออกไซด์ตรงจุดที่ป้อนตะกั่ว</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 Temperature map: melting points vs tip settings
// ---------------------------------------------------------------------------
function TempScale() {
  const AX = 262;
  const y = (t: number) => 410 - ((t - 150) * 370) / 300;
  const ticks = [150, 200, 250, 300, 350, 400, 450];
  const melts: { t: number; ly: number; text: string }[] = [
    { t: 183, ly: 392, text: "Sn63/Pb37 183 °C" },
    { t: 190, ly: 360, text: "Sn60/Pb40 183–190 °C" },
    { t: 219, ly: 318, text: "SAC305 217–220 °C" },
    { t: 227, ly: 286, text: "Sn99.3Cu0.7 227 °C" },
  ];
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <Label x={150} y={22} size={20} weight={700}>จุดหลอมของโลหะบัดกรี</Label>
      <Label x={470} y={22} size={20} weight={700}>อุณหภูมิปลายหัวแร้ง</Label>
      <line x1={AX} y1={y(450)} x2={AX} y2={y(150)} stroke={INK} strokeWidth={3} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={AX - 8} y1={y(t)} x2={AX + 8} y2={y(t)} stroke={INK} strokeWidth={2} />
        </g>
      ))}
      {ticks.map((t) => (
        <text key={"t" + t} x={AX + 12} y={y(t) + 7} fontSize={20} textAnchor="start" fill={MUTED}>
          {t}
        </text>
      ))}
      {melts.map((m) => (
        <g key={m.t}>
          <circle cx={AX} cy={y(m.t)} r={5} fill={INK} />
          <polyline points={`${AX},${y(m.t)} ${AX - 26},${y(m.t)} ${AX - 42},${m.ly}`} fill="none" stroke={INK} strokeWidth={1.5} />
          <Label x={AX - 46} y={m.ly} size={20} anchor="end">{m.text}</Label>
        </g>
      ))}
      {/* tip bands */}
      <rect x={318} y={y(350)} width={26} height={y(300) - y(350)} fill="var(--fig-ok)" opacity={0.5} stroke="var(--fig-ok)" strokeWidth={2} />
      <rect x={348} y={y(380)} width={26} height={y(350) - y(380)} fill="var(--fig-accent)" opacity={0.45} stroke="var(--fig-accent)" strokeWidth={2} />
      <rect x={318} y={y(450)} width={56} height={y(400) - y(450)} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={2} strokeDasharray="6 4" />
      <Label x={382} y={y(318)} size={20} anchor="start">มีตะกั่ว 300–350 °C</Label>
      <Label x={382} y={y(372)} size={20} anchor="start">ไร้สารตะกั่ว 350–380 °C</Label>
      <Label x={382} y={y(425)} size={20} anchor="start" color="var(--fig-danger)">✗ ร้อนเกิน &gt; 400 °C</Label>
      <Label x={330} y={y(250)} size={20} anchor="start" muted>ตั้งใกล้จุดหลอม</Label>
      <Label x={330} y={y(232)} size={20} anchor="start" muted>→ รอยต่อเย็น ✗</Label>
      <Label x={AX} y={430} size={20} muted>°C</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 Five steps of a THT joint (wide)
// ---------------------------------------------------------------------------
function Iron({ tx, ty, away = false }: { tx: number; ty: number; away?: boolean }) {
  const ox = away ? -26 : 0;
  const oy = away ? -26 : 0;
  return (
    <g>
      <line x1={tx - 78 + ox} y1={ty - 78 + oy} x2={tx - 20 + ox} y2={ty - 20 + oy} stroke={MUTED} strokeWidth={16} />
      <line x1={tx - 22 + ox} y1={ty - 22 + oy} x2={tx + ox} y2={ty + oy} stroke={CU} strokeWidth={10} />
    </g>
  );
}
function SolderWire({ tx, ty, away = false }: { tx: number; ty: number; away?: boolean }) {
  const ox = away ? 26 : 0;
  const oy = away ? -26 : 0;
  return (
    <g>
      <line x1={tx + 70 + ox} y1={ty - 70 + oy} x2={tx + ox} y2={ty + oy} stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <line x1={tx + 70 + ox} y1={ty - 70 + oy} x2={tx + ox} y2={ty + oy} stroke={SOLDER} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}
function FiveSteps() {
  const k = 1.15;
  const by = 250;
  const titles = ["① แตะหัวแร้ง", "② ป้อนตะกั่ว", "③ ถอนตะกั่ว", "④ ถอนหัวแร้ง", "⑤ อย่าขยับ"];
  const notes = ["pad+ขา ~1 s", "ฝั่งตรงข้าม", "เมื่อคลุม pad", "ทันที", "รวม 2–4 s"];
  return (
    <svg viewBox="0 0 900 360" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const cx = 90 + i * 180;
        const kind: JK = i === 0 ? "bare" : i === 1 ? "insufficient" : "good";
        const left: [number, number] = [cx - 7 * k, by - 9 * k];
        const right: [number, number] = [cx + 9 * k, by - 9 * k];
        return (
          <g key={i}>
            {i > 0 ? <line x1={cx - 90} y1={50} x2={cx - 90} y2={330} stroke="var(--fig-grid)" strokeWidth={2} /> : null}
            <Label x={cx} y={30} size={26} weight={700}>{titles[i]}</Label>
            <Joint x={cx} y={by} kind={kind} k={k} />
            {i <= 2 ? <Iron tx={left[0]} ty={left[1]} /> : null}
            {i === 3 ? <Iron tx={left[0]} ty={left[1]} away /> : null}
            {i === 1 ? <SolderWire tx={right[0] + 2} ty={right[1]} /> : null}
            {i === 2 ? <SolderWire tx={right[0] + 2} ty={right[1]} away /> : null}
            {i === 2 ? <Arrow from={[cx + 40, by - 70]} to={[cx + 62, by - 92]} color="var(--fig-accent)" /> : null}
            {i === 3 ? <Arrow from={[cx - 70, by - 110]} to={[cx - 88 + 10, by - 128]} color="var(--fig-accent)" /> : null}
            {i === 4 ? (
              <g>
                <path d={`M ${cx - 30} ${by - 95} q 8 -10 0 -20 q -8 -10 0 -20`} fill="none" stroke={MUTED} strokeWidth={2} />
                <path d={`M ${cx + 30} ${by - 95} q 8 -10 0 -20 q -8 -10 0 -20`} fill="none" stroke={MUTED} strokeWidth={2} />
              </g>
            ) : null}
            <Label x={cx} y={316} size={26} muted>{notes[i]}</Label>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 Good joint (large cross-section)
// ---------------------------------------------------------------------------
function GoodJoint() {
  const k = 3.2;
  const x = 260;
  const y = 260;
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Joint x={x} y={y} kind="good" k={k} />
      {/* wetting angle at left pad edge */}
      <path d={`M ${x - 30 * k + 40} ${y - 6 * k} A 40 40 0 0 0 ${x - 30 * k + 39} ${y - 6 * k - 9}`} fill="none" stroke="var(--fig-accent)" strokeWidth={3} />
      <Label x={60} y={170} size={22} anchor="start" color="var(--fig-accent)">มุมเปียก θ &lt; 90°</Label>
      <line x1={140} y1={180} x2={x - 30 * k + 44} y2={y - 6 * k - 6} stroke="var(--fig-accent)" strokeWidth={1.5} />
      <Label x={430} y={60} size={22} anchor="start">เห็นรูปขา</Label>
      <line x1={428} y1={66} x2={x + 6} y2={y - 44 * k} stroke={INK} strokeWidth={1.5} />
      <Label x={430} y={150} size={22} anchor="start">ผิวเรียบ เว้า</Label>
      <Label x={430} y={178} size={20} anchor="start" muted>(รูปกรวย / fillet)</Label>
      <line x1={428} y1={158} x2={x + 16 * k} y2={y - 14 * k} stroke={INK} strokeWidth={1.5} />
      <Label x={430} y={240} size={22} anchor="start">คลุม pad เต็ม</Label>
      <line x1={428} y1={240} x2={x + 28 * k} y2={y - 8 * k} stroke={INK} strokeWidth={1.5} />
      <Label x={x} y={386} size={20} muted>ภาพตัดขวาง: แผ่นวงจร · pad ทองแดง · ขาอุปกรณ์</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 Defect gallery (labelled, wide)
// ---------------------------------------------------------------------------
const GALLERY: { kind: JK; name: string }[] = [
  { kind: "cold", name: "รอยต่อเย็น" },
  { kind: "nonwet", name: "ไม่เปียกผิว" },
  { kind: "insufficient", name: "ตะกั่วน้อยไป" },
  { kind: "excess", name: "ตะกั่วมากไป" },
  { kind: "bridge", name: "สะพานตะกั่ว" },
  { kind: "lifted", name: "pad หลุดล่อน" },
  { kind: "disturbed", name: "ขยับขณะเย็นตัว" },
  { kind: "burnt", name: "ฟลักซ์ไหม้" },
];
function DefectGallery() {
  return (
    <svg viewBox="0 0 900 460" aria-hidden="true">
      {GALLERY.map((g, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const cx = 112 + col * 225;
        const top = row * 230;
        return (
          <g key={g.kind}>
            <rect x={col * 225 + 6} y={top + 6} width={213} height={218} rx={10} fill="none" stroke="var(--fig-danger)" strokeWidth={2} strokeDasharray="6 4" />
            <Label x={cx} y={top + 36} size={26} weight={700}>✗ {g.name}</Label>
            <Joint x={cx} y={top + 160} kind={g.kind} k={1.35} />
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 Desoldering: pump (4 steps) and wick (3 steps) — wide
// ---------------------------------------------------------------------------
function Pump({ x, y, cocked, nozzleAt }: { x: number; y: number; cocked: boolean; nozzleAt?: boolean }) {
  // x,y = nozzle tip
  const top = y - 140;
  return (
    <g opacity={nozzleAt === false ? 0.9 : 1}>
      <path d={`M ${x - 6} ${y} L ${x + 6} ${y} L ${x + 10} ${y - 24} L ${x - 10} ${y - 24} Z`} fill={MUTED} stroke={INK} strokeWidth={2} />
      <rect x={x - 16} y={top} width={32} height={116} rx={4} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <rect x={x + 16} y={top + 50} width={8} height={18} fill="var(--fig-accent)" stroke={INK} strokeWidth={1.5} />
      <line x1={x} y1={top} x2={x} y2={cocked ? top - 8 : top - 50} stroke={INK} strokeWidth={5} />
      <rect x={x - 14} y={(cocked ? top - 8 : top - 50) - 10} width={28} height={10} rx={3} fill={INK} />
    </g>
  );
}
function Desolder() {
  const by = 290;
  const k = 0.95;
  const t1 = ["① ง้างสปริง", "② หลอมจุดต่อ", "③ จ่อหัวดูดชิด", "④ กดปุ่มปลด"];
  const t2 = ["① วางสายถักบน pad", "② กดด้วยหัวแร้ง", "③ ยกออกพร้อมกัน"];
  return (
    <svg viewBox="0 0 900 620" aria-hidden="true">
      <Label x={14} y={24} size={26} weight={700} anchor="start">ที่ดูดตะกั่ว (desoldering pump)</Label>
      {t1.map((t, i) => {
        const cx = 112 + i * 225;
        return (
          <g key={t}>
            <Label x={cx} y={by + 52} size={26}>{t}</Label>
            <Joint x={cx} y={by} kind={i === 3 ? "bare" : "good"} k={k} />
            {i === 0 ? (
              <g>
                <Pump x={cx + 50} y={by - 30} cocked />
                <Arrow from={[cx + 90, by - 200]} to={[cx + 90, by - 160]} color="var(--fig-accent)" />
              </g>
            ) : null}
            {i === 1 ? <Iron tx={cx - 8} ty={by - 10} /> : null}
            {i === 2 ? (
              <g>
                <Iron tx={cx - 8} ty={by - 10} />
                <Pump x={cx + 4} y={by - 46} cocked />
              </g>
            ) : null}
            {i === 3 ? (
              <g>
                <Pump x={cx + 4} y={by - 46} cocked={false} />
                <Arrow from={[cx + 44, by - 70]} to={[cx + 44, by - 130]} color="var(--fig-accent)" />
              </g>
            ) : null}
          </g>
        );
      })}
      <line x1={10} y1={372} x2={890} y2={372} stroke="var(--fig-grid)" strokeWidth={2} />
      <Label x={14} y={400} size={26} weight={700} anchor="start">สายถักซับตะกั่ว (solder wick)</Label>
      {t2.map((t, i) => {
        const cx = [150, 470, 770][i];
        const wy = 550;
        const lift = i === 2 ? -54 : 0;
        return (
          <g key={t}>
            <Label x={cx} y={wy + 50} size={26}>{t}</Label>
            <Joint x={cx} y={wy} kind={i === 2 ? "bare" : "good"} k={k} />
            <g transform={lift ? `translate(0 ${lift})` : undefined}>
              <rect x={cx - 96} y={wy - 22} width={88} height={14} fill={CU} stroke={INK} strokeWidth={2} />
              {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                <line key={j} x1={cx - 92 + j * 12} y1={wy - 22} x2={cx - 84 + j * 12} y2={wy - 8} stroke={INK} strokeWidth={1.2} />
              ))}
              {i >= 1 ? <rect x={cx - 40} y={wy - 22} width={32} height={14} fill={SOLDER} stroke={INK} strokeWidth={2} /> : null}
              {i >= 1 ? <Iron tx={cx - 26} ty={wy - 22} /> : null}
            </g>
            {i === 2 ? <Arrow from={[cx + 40, wy - 60]} to={[cx + 40, wy - 110]} color="var(--fig-accent)" /> : null}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 Board types
// ---------------------------------------------------------------------------
function BoardTypes() {
  const p = 22; // pitch drawn (represents 2.54 mm)
  const pads = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) pads.push([40 + c * p, 60 + r * p]);
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      {/* (a) pad board */}
      <rect x={20} y={40} width={240} height={150} rx={6} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2} />
      {pads.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x + 18} cy={y + 8} r={8} fill={CU} />
          <circle cx={x + 18} cy={y + 8} r={2.5} fill={BG} />
        </g>
      ))}
      <Label x={140} y={22} size={22} weight={700}>แพดบอร์ด (pad board)</Label>
      <g stroke={INK} strokeWidth={2}>
        <line x1={58} y1={196} x2={80} y2={196} />
        <line x1={58} y1={188} x2={58} y2={204} />
        <line x1={80} y1={188} x2={80} y2={204} />
      </g>
      <Label x={90} y={214} size={20} anchor="start">ระยะห่างรู 2.54 mm (0.1 นิ้ว)</Label>
      {/* (b) strip board */}
      <rect x={320} y={40} width={250} height={150} rx={6} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <g key={r}>
          <rect x={330} y={58 + r * p} width={230} height={14} fill={CU} />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
            <circle key={c} cx={342 + c * p} cy={65 + r * p} r={2.5} fill={BG} />
          ))}
        </g>
      ))}
      <Label x={445} y={22} size={22} weight={700}>แผ่นลายแถว (stripboard)</Label>
      {/* (c) protoboard-pattern PCB */}
      <rect x={20} y={270} width={240} height={150} rx={6} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2} />
      <rect x={32} y={280} width={216} height={10} fill={CU} />
      <rect x={32} y={400} width={216} height={10} fill={CU} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
        <g key={c}>
          <rect x={40 + c * 23} y={300} width={12} height={42} rx={3} fill={CU} />
          <rect x={40 + c * 23} y={350} width={12} height={42} rx={3} fill={CU} />
        </g>
      ))}
      <Label x={140} y={252} size={22} weight={700}>PCB ลายแบบโปรโตบอร์ด</Label>
      {/* (d) solderless breadboard */}
      <rect x={320} y={270} width={250} height={150} rx={6} fill={PANEL} stroke={INK} strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
        <g key={c}>
          <line x1={342 + c * 22} y1={302} x2={342 + c * 22} y2={338} stroke="var(--fig-accent)" strokeWidth={3} />
          <line x1={342 + c * 22} y1={354} x2={342 + c * 22} y2={390} stroke="var(--fig-accent)" strokeWidth={3} />
          {[0, 1, 2, 3, 4].map((r) => (
            <rect key={r} x={339 + c * 22} y={300 + r * 9} width={6} height={5} fill={INK} />
          ))}
        </g>
      ))}
      <line x1={334} y1={284} x2={556} y2={284} stroke="var(--fig-plus)" strokeWidth={3} />
      <line x1={334} y1={406} x2={556} y2={406} stroke="var(--fig-wire-n)" strokeWidth={3} />
      <Label x={445} y={252} size={22} weight={700}>breadboard: ไม่ต้องบัดกรี</Label>
      <Label x={445} y={448} size={20} muted>เส้นน้ำเงิน = ต่อกันภายใน</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 Double-sided PTH board cross-section
// ---------------------------------------------------------------------------
function PcbLayers() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      {/* FR-4 core */}
      <rect x={30} y={140} width={400} height={100} fill="var(--fig-warn)" opacity={0.3} />
      <rect x={30} y={140} width={400} height={100} fill="none" stroke={INK} strokeWidth={2} />
      {/* copper layers (with gaps where traces end) */}
      <rect x={30} y={126} width={140} height={14} fill={CU} />
      <rect x={215} y={126} width={215} height={14} fill={CU} />
      <rect x={30} y={240} width={140} height={14} fill={CU} />
      <rect x={215} y={240} width={120} height={14} fill={CU} />
      {/* PTH barrel at x 150..170 region? use hole at 100 */}
      <rect x={88} y={126} width={30} height={128} fill={BG} />
      <rect x={84} y={126} width={6} height={128} fill={CU} />
      <rect x={116} y={126} width={6} height={128} fill={CU} />
      {/* via */}
      <rect x={300} y={126} width={14} height={128} fill={BG} />
      <rect x={297} y={126} width={4} height={128} fill={CU} />
      <rect x={313} y={126} width={4} height={128} fill={CU} />
      {/* solder mask (not over the PTH pad) */}
      <rect x={140} y={114} width={290} height={12} fill="var(--fig-ok)" opacity={0.55} />
      <rect x={140} y={254} width={290} height={12} fill="var(--fig-ok)" opacity={0.55} />
      {/* silkscreen */}
      <rect x={350} y={104} width={60} height={10} fill={INK} />
      {/* leaders */}
      <g stroke={INK} strokeWidth={1.5}>
        <line x1={410} y1={109} x2={450} y2={56} />
        <line x1={400} y1={120} x2={450} y2={98} />
        <line x1={420} y1={133} x2={450} y2={140} />
        <line x1={420} y1={182} x2={450} y2={182} />
        <line x1={103} y1={265} x2={103} y2={300} />
        <line x1={307} y1={270} x2={307} y2={300} />
      </g>
      <Label x={455} y={52} size={20} anchor="start">ลายสกรีน</Label>
      <Label x={455} y={96} size={20} anchor="start" color="var(--fig-ok)">solder mask</Label>
      <Label x={455} y={140} size={20} anchor="start" color="var(--fig-copper)">ทองแดง</Label>
      <Label x={455} y={180} size={20} anchor="start">ฐาน FR-4</Label>
      <Label x={455} y={206} size={20} anchor="start" muted>(ใยแก้วอีพ็อกซี)</Label>
      <Label x={103} y={320} size={20}>รูชุบทะลุ (PTH)</Label>
      <Label x={307} y={320} size={20}>via (รูเชื่อมชั้น)</Label>
      <Label x={300} y={360} size={20} muted>ภาพตัดขวาง PCB สองหน้า (ความหนาขยายเกินจริง)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F15 Numbered joints for find-the-fault (wide, no names)
// ---------------------------------------------------------------------------
const FF_KINDS: JK[] = ["good", "bridge", "cold", "sac", "insufficient", "excess", "good", "lifted"];
function FaultBoard() {
  return (
    <svg viewBox="0 0 900 460" aria-hidden="true">
      {FF_KINDS.map((kind, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const cx = 112 + col * 225;
        const top = row * 230;
        return (
          <g key={i}>
            <rect x={col * 225 + 6} y={top + 6} width={213} height={218} rx={10} fill="none" stroke="var(--fig-grid)" strokeWidth={2} />
            <circle cx={col * 225 + 34} cy={top + 34} r={18} fill={INK} />
            <Label x={col * 225 + 34} y={top + 35} size={26} weight={700} color={BG}>{i + 1}</Label>
            <Joint x={cx} y={top + 160} kind={kind} k={1.35} />
            {kind === "sac" ? <Label x={cx + 22} y={top + 36} size={24} muted>ไร้สารตะกั่ว</Label> : null}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F14 Preparing and soldering a stranded wire (2 × 2 panels)
// ---------------------------------------------------------------------------
function WirePrep() {
  const INS = "var(--fig-accent-soft)";
  const strands = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <line x1={300} y1={10} x2={300} y2={430} stroke="var(--fig-grid)" strokeWidth={2} />
      <line x1={10} y1={220} x2={590} y2={220} stroke="var(--fig-grid)" strokeWidth={2} />
      {/* ① strip */}
      <Label x={150} y={30} size={22} weight={700}>① ปอกฉนวน</Label>
      <rect x={30} y={96} width={150} height={30} rx={6} fill={INS} stroke={INK} strokeWidth={2} />
      {strands.map((j) => (
        <line key={j} x1={180} y1={100 + j * 5.5} x2={250} y2={98 + j * 6.5} stroke={CU} strokeWidth={2.5} />
      ))}
      <g stroke={INK} strokeWidth={1.5}>
        <line x1={180} y1={70} x2={180} y2={88} />
        <line x1={250} y1={70} x2={250} y2={88} />
        <line x1={180} y1={79} x2={250} y2={79} />
      </g>
      <Label x={215} y={58} size={20}>3–5 mm</Label>
      <Label x={150} y={180} size={20} muted>ไม่บากลวดขาด</Label>
      {/* ② twist */}
      <Label x={450} y={30} size={22} weight={700}>② บิดเกลียวลวดฝอย</Label>
      <rect x={330} y={96} width={150} height={30} rx={6} fill={INS} stroke={INK} strokeWidth={2} />
      <rect x={480} y={101} width={70} height={20} rx={6} fill={CU} stroke={INK} strokeWidth={1.5} />
      {[0, 1, 2, 3, 4].map((j) => (
        <line key={j} x1={486 + j * 13} y1={121} x2={496 + j * 13} y2={101} stroke={INK} strokeWidth={1.5} />
      ))}
      <Label x={450} y={180} size={20} muted>เส้นฝอยไม่แตกออก</Label>
      {/* ③ tin */}
      <Label x={150} y={250} size={22} weight={700}>③ ไล้ตะกั่ว (tinning)</Label>
      <rect x={30} y={316} width={150} height={30} rx={6} fill={INS} stroke={INK} strokeWidth={2} />
      <rect x={180} y={321} width={70} height={20} rx={8} fill={SOLDER} stroke={INK} strokeWidth={2} />
      <line x1={140} y1={262} x2={208} y2={318} stroke={MUTED} strokeWidth={12} />
      <line x1={200} y1={311} x2={212} y2={321} stroke={CU} strokeWidth={8} />
      <line x1={272} y1={268} x2={232} y2={340} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <line x1={272} y1={268} x2={232} y2={340} stroke={SOLDER} strokeWidth={4} strokeLinecap="round" />
      <Label x={150} y={400} size={20} muted>ตะกั่วซึมเข้าเส้นฝอยบาง ๆ</Label>
      {/* ④ terminal */}
      <Label x={450} y={250} size={22} weight={700}>④ คล้องหลักแล้วบัดกรี</Label>
      <rect x={500} y={276} width={22} height={90} rx={3} fill={MUTED} stroke={INK} strokeWidth={2} />
      <circle cx={511} cy={318} r={6} fill={BG} stroke={INK} strokeWidth={1.5} />
      <rect x={340} y={318} width={130} height={26} rx={6} fill={INS} stroke={INK} strokeWidth={2} />
      <path d="M 470 331 L 504 331 Q 534 331 532 318 Q 528 306 511 308" fill="none" stroke={SOLDER} strokeWidth={9} strokeLinecap="round" />
      <path d="M 470 331 L 504 331 Q 534 331 532 318 Q 528 306 511 308" fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="4 3" />
      <g stroke={INK} strokeWidth={1.5}>
        <line x1={470} y1={350} x2={470} y2={372} />
        <line x1={496} y1={350} x2={496} y2={372} />
        <line x1={470} y1={364} x2={496} y2={364} />
      </g>
      <Label x={318} y={392} size={20} anchor="start">ฉนวนห่าง 1–2 mm</Label>
      <Label x={450} y={424} size={20} muted>คล้องหลัก ½–¾ รอบ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F16 Tip care: tinned vs oxidised tip, and why plated tips must not be filed
// ---------------------------------------------------------------------------
function TipCare() {
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      {/* tinned tip */}
      <rect x={136} y={20} width={28} height={100} fill={MUTED} stroke={INK} strokeWidth={2.5} />
      <path d="M 136 120 L 164 120 L 157 186 L 143 186 Z" fill={CU} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M 133 140 L 167 140 L 160 192 L 140 192 Z" fill={SOLDER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M 146 148 L 143 182" stroke={BG} strokeWidth={4} strokeLinecap="round" />
      <Label x={150} y={226} size={22} weight={700} color="var(--fig-ok)">✓ เคลือบตะกั่วไว้</Label>
      <Label x={150} y={254} size={20} muted>ผิวเงา ตะกั่วไหลเกาะ</Label>
      {/* oxidised tip */}
      <rect x={436} y={20} width={28} height={100} fill={MUTED} stroke={INK} strokeWidth={2.5} />
      <path d="M 436 120 L 464 120 L 457 186 L 443 186 Z" fill={INK} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {[[478, 170], [488, 150], [420, 176]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={7} fill={SOLDER} stroke={INK} strokeWidth={2} />
      ))}
      <Label x={450} y={226} size={22} weight={700} color="var(--fig-danger)">✗ ปลายดำ มีออกไซด์</Label>
      <Label x={450} y={254} size={20} muted>ตะกั่วเป็นเม็ด ไม่เกาะ</Label>
      <line x1={10} y1={280} x2={590} y2={280} stroke="var(--fig-grid)" strokeWidth={2} />
      {/* section of an iron-plated tip */}
      <path d="M 40 306 L 300 306 L 372 336 L 300 366 L 40 366 Z" fill={CU} stroke={MUTED} strokeWidth={9} strokeLinejoin="round" />
      <line x1={330} y1={320} x2={420} y2={310} stroke={INK} strokeWidth={1.5} />
      <line x1={200} y1={336} x2={420} y2={350} stroke={INK} strokeWidth={1.5} />
      <Label x={424} y={308} size={20} anchor="start">ชั้นชุบเหล็กบาง</Label>
      <Label x={424} y={350} size={20} anchor="start">แกนทองแดง</Label>
      <Label x={300} y={408} size={20} color="var(--fig-danger)">ห้ามตะไบ/ขัด: ชั้นชุบหลุด ปลายสึกเร็ว</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W14-F01": SolderVsWeld,
  "W14-F02": SafeBench,
  "W14-F03": StationCutaway,
  "W14-F04": GunTransformer,
  "W14-F05": TipShapes,
  "W14-F06": FluxCore,
  "W14-F07": TempScale,
  "W14-F08": FiveSteps,
  "W14-F09": GoodJoint,
  "W14-F10": DefectGallery,
  "W14-F11": Desolder,
  "W14-F12": BoardTypes,
  "W14-F13": PcbLayers,
  "W14-F14": WirePrep,
  "W14-F15": FaultBoard,
  "W14-F16": TipCare,
};
export default figures;
