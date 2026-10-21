/**
 * Schematic stage for each tab — a pure function of the solved state, so it can be
 * rendered statically by `previewStage` and live by Lab.tsx.
 */
import { formatSI } from "../shared/format";
import {
  BJT_LED_VF,
  LED_COLORS,
  MATERIALS,
  bjtLoadOn,
  ledBrightness,
  type BjtState,
  type DiodeState,
  type LedState,
  type RectState,
  type SemiState,
} from "./model";
import { ArrowHead, Badge, Battery, Capacitor, Coil, Diode, Dot, Flow, Ground, INK, Lbl, Led, MUTED, Resistor, Terminal, Wire, type Pt } from "./parts";

const W = 560;
const H = 300;

function Svg({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

/** Flow speed from current (log-ish, 0.15…1). */
const speed = (I: number, Iref: number) => Math.min(1, Math.max(0.15, Math.abs(I) / Iref));

// ---------------------------------------------------------------------------
// Series loop: source – R – device (diode / LED)
// ---------------------------------------------------------------------------

function SeriesLoop({
  Vs,
  R,
  device,
  I,
  Iref,
  devLabel,
  devValue,
}: {
  Vs: number;
  R: number;
  device: React.ReactNode;
  I: number;
  Iref: number;
  devLabel: React.ReactNode;
  devValue: React.ReactNode;
}) {
  const pos = Vs >= 0;
  const flowOn = I > 1e-6;
  return (
    <>
      {/* source: + toward the top when Vs ≥ 0 */}
      {pos ? <Battery a={[70, 240]} b={[70, 60]} /> : <Battery a={[70, 60]} b={[70, 240]} />}
      <text x={46} y={pos ? 134 : 178} fontSize={20} fontWeight={700} textAnchor="middle" fill="var(--fig-plus)">
        +
      </text>
      <text x={46} y={pos ? 178 : 134} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
        −
      </text>
      <Lbl x={90} y={146} main="V" sub="S" />
      <Lbl x={90} y={168} main={formatSI(Vs, "V")} size={16} color={MUTED} />
      <Resistor a={[70, 60]} b={[400, 60]} />
      <Lbl x={235} y={36} main="R" rest={` = ${formatSI(R, "Ω")}`} anchor="middle" />
      {device}
      <Wire d="M400 240 L70 240" />
      {devLabel}
      {devValue}
      <Flow d="M70 60 L400 60 L400 240 L70 240 Z" on={flowOn} speed={speed(I, Iref)} />
      {flowOn ? (
        <>
          <ArrowHead p={[320, 60]} angle={0} />
          <Lbl x={320} y={88} main="I" rest={` = ${formatSI(I, "A")}`} anchor="middle" size={16} />
        </>
      ) : (
        <Lbl x={235} y={88} main="I" rest=" ≈ 0 A" anchor="middle" size={16} color={MUTED} />
      )}
    </>
  );
}

export function DiodeStage({ s }: { s: DiodeState }) {
  const fwd = s.bias === "forward";
  return (
    <Svg label={`วงจรไดโอดอนุกรม แหล่งจ่าย ${formatSI(s.Vs, "V")} ตัวต้านทาน ${formatSI(s.R, "Ω")} ไดโอด${MATERIALS[s.material].label} ${fwd ? "ไบแอสตรง" : "ไบแอสกลับ"} กระแส ${formatSI(Math.max(0, s.Id), "A")}`}>
      <SeriesLoop
        Vs={s.Vs}
        R={s.R}
        I={s.Id}
        Iref={0.01}
        device={<Diode a={[400, 60]} b={[400, 240]} on={fwd && s.Id > 1e-4} schottky={s.material === "schottky"} />}
        devLabel={<Lbl x={428} y={130} main={`D (${s.material === "si" ? "Si" : s.material === "ge" ? "Ge" : "Schottky"})`} />}
        devValue={<Lbl x={428} y={156} main="V" sub="D" rest={` = ${formatSI(s.Vd, "V")}`} size={16} />}
      />
      <Lbl x={428} y={86} main="A (แอโนด)" size={14} color={MUTED} />
      <Lbl x={428} y={222} main="K (แคโทด)" size={14} color={MUTED} />
      <Badge x={235} y={276} text={fwd ? (s.Id > 1e-4 ? "ไบแอสตรง – ไดโอดนำกระแส" : "ไบแอสตรง – ยังไม่ถึงแรงดันเข่า") : "ไบแอสกลับ – ไม่นำกระแส (รั่ว ≈ 0)"} tone={fwd ? (s.Id > 1e-4 ? "ok" : "warn") : "muted"} />
    </Svg>
  );
}

export function LedStage({ s }: { s: LedState }) {
  const c = LED_COLORS[s.color];
  const b = ledBrightness(s);
  const burnt = s.status === "burnt";
  const over = !burnt && s.If > 0.02;
  const text =
    s.status === "burnt"
      ? "เกินพิกัด – LED เสีย"
      : s.status === "off"
        ? s.Vs < 0
          ? "ไบแอสกลับ – LED ไม่ติด"
          : "แรงดันต่ำกว่า VF – LED ไม่ติด"
        : over
          ? "สว่าง แต่กระแสเกินพิกัด 20 mA"
          : s.status === "dim"
            ? "ติดหรี่ (กระแสน้อย)"
            : `LED ติด สว่าง ${Math.round(b * 100)} %`;
  const tone = burnt ? "danger" : over ? "warn" : s.status === "ok" ? "ok" : s.status === "dim" ? "warn" : "muted";
  return (
    <Svg label={`วงจร LED สี${c.label} แหล่งจ่าย ${formatSI(s.Vs, "V")} ตัวต้านทาน ${formatSI(s.R, "Ω")} กระแส ${formatSI(s.If, "A")} สถานะ ${text}`}>
      <SeriesLoop
        Vs={s.Vs}
        R={s.R}
        I={s.If}
        Iref={0.02}
        device={<Led a={[400, 60]} b={[400, 240]} color={c.hex} glow={b} burnt={burnt} arrowsUp={false} />}
        devLabel={<Lbl x={455} y={130} main="LED" />}
        devValue={<Lbl x={455} y={156} main="V" sub="F" rest={` = ${formatSI(s.Vf, "V")}`} size={16} />}
      />
      <Badge x={235} y={276} text={text} tone={tone} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Rectifier
// ---------------------------------------------------------------------------

function Transformer({ ct, Vrms }: { ct: boolean; Vrms: number }) {
  return (
    <g>
      {/* primary */}
      <Coil x={40} y0={100} y1={200} bumps={4} side={-1} />
      <Wire d="M40 100 L40 92 L14 92 M40 200 L40 208 L14 208" />
      <Terminal p={[14, 92]} />
      <Terminal p={[14, 208]} />
      {/* core */}
      <path d="M53 84 L53 216 M59 84 L59 216" stroke={INK} strokeWidth={2} />
      {/* secondary */}
      <Coil x={72} y0={80} y1={220} bumps={4} side={1} />
      <text x={18} y={150} fontSize={13} textAnchor="middle" fill={MUTED} transform="rotate(-90 18 150)">
        230 V~
      </text>
      <text x={94} y={ct ? 120 : 128} fontSize={15} fill={INK}>
        {`${formatSI(Vrms, "V")}~`}
      </text>
      {ct ? (
        <text x={94} y={196} fontSize={15} fill={INK}>
          {`${formatSI(Vrms, "V")}~`}
        </text>
      ) : null}
    </g>
  );
}

function Load({ x1, x2, yTop, yBot, C, Rl }: { x1: number; x2: number; yTop: number; yBot: number; C: number; Rl: number }) {
  return (
    <g>
      {C > 0 ? (
        <>
          <Capacitor a={[x1, yTop]} b={[x1, yBot]} />
          <Dot p={[x1, yTop]} />
          <Dot p={[x1, yBot]} />
          <Lbl x={x1 + 14} y={(yTop + yBot) / 2 - 22} main="C" size={15} />
          <Lbl x={x1 + 14} y={(yTop + yBot) / 2 + 34} main={formatSI(C, "F")} size={13} color={MUTED} />
        </>
      ) : (
        <Lbl x={x1} y={(yTop + yBot) / 2 + 5} main="ไม่มี C" size={14} anchor="middle" color={MUTED} />
      )}
      <Resistor a={[x2, yTop]} b={[x2, yBot]} len={Math.min(56, yBot - yTop - 24)} />
      <Lbl x={x2 + 14} y={(yTop + yBot) / 2 - 4} main="R" sub="L" size={15} />
      <Lbl x={x2 + 14} y={(yTop + yBot) / 2 + 16} main={formatSI(Rl, "Ω")} size={13} color={MUTED} />
      <text x={x2 + 30} y={yTop + 20} fontSize={18} fontWeight={700} fill="var(--fig-plus)">
        +
      </text>
      <text x={x2 + 30} y={yBot - 6} fontSize={18} fontWeight={700} fill={INK}>
        −
      </text>
    </g>
  );
}

export function RectStage({ s }: { s: RectState }) {
  const label = `วงจรเรียงกระแส${s.type === "half" ? "ครึ่งคลื่น" : s.type === "center-tap" ? "เต็มคลื่นแบบแทปกลาง" : "เต็มคลื่นแบบบริดจ์"} แรงดันทุติยภูมิ ${formatSI(s.Vrms, "V")} rms โหลด ${formatSI(s.Rl, "Ω")} ${s.C > 0 ? `ตัวเก็บประจุ ${formatSI(s.C, "F")}` : "ไม่มีตัวเก็บประจุ"} แรงดันเอาต์พุตเฉลี่ย ${formatSI(s.Vdc, "V")}`;
  if (s.type === "half") {
    return (
      <Svg label={label}>
        <Transformer ct={false} Vrms={s.Vrms} />
        <Wire d="M72 80 L72 60 L120 60" />
        <Diode a={[120, 60]} b={[240, 60]} on />
        <Wire d="M240 60 L470 60 M72 220 L72 240 L470 240" />
        <Lbl x={180} y={36} main="D1" anchor="middle" size={15} />
        <Load x1={300} x2={420} yTop={60} yBot={240} C={s.C} Rl={s.Rl} />
        <Dot p={[420, 60]} />
        <Dot p={[420, 240]} />
              </Svg>
    );
  }
  if (s.type === "center-tap") {
    return (
      <Svg label={label}>
        <Transformer ct Vrms={s.Vrms} />
        <Wire d="M72 80 L72 50 L120 50 M72 220 L72 262 L120 262" />
        <Diode a={[120, 50]} b={[240, 50]} on />
        <Diode a={[120, 262]} b={[240, 262]} on />
        <Wire d="M240 50 L520 50 L520 262 L240 262 M72 150 L420 150" />
        <Dot p={[72, 150]} />
        <Dot p={[520, 50]} />
        <Lbl x={180} y={30} main="D1" anchor="middle" size={15} />
        <Lbl x={180} y={290} main="D2" anchor="middle" size={15} />
        <Lbl x={92} y={170} main="CT" size={13} color={MUTED} />
        <Load x1={300} x2={420} yTop={50} yBot={150} C={s.C} Rl={s.Rl} />
        <Dot p={[420, 50]} />
        <Dot p={[420, 150]} />
      </Svg>
    );
  }
  // bridge — AC on the left/right nodes, + at top, − at bottom
  const A1: Pt = [180, 150];
  const A2: Pt = [300, 150];
  const P: Pt = [240, 90];
  const N: Pt = [240, 210];
  return (
    <Svg label={label}>
      <Transformer ct={false} Vrms={s.Vrms} />
      <Wire d={`M72 80 L72 60 L140 60 L140 150 L${A1[0]} ${A1[1]}`} />
      <Wire d={`M72 220 L72 280 L340 280 L340 150 L${A2[0]} ${A2[1]}`} />
      <Diode a={A1} b={P} on />
      <Diode a={A2} b={P} on />
      <Diode a={N} b={A1} on />
      <Diode a={N} b={A2} on />
      {[A1, A2, P, N].map((p, i) => (
        <Dot key={i} p={p} />
      ))}
      <Lbl x={190} y={112} main="D1" anchor="end" size={14} />
      <Lbl x={290} y={112} main="D2" size={14} />
      <Lbl x={190} y={200} main="D3" anchor="end" size={14} />
      <Lbl x={290} y={200} main="D4" size={14} />
      <Wire d={`M240 90 L240 50 L480 50`} />
      {/* − rail hops over the riser at x = 340 */}
      <Wire d={`M240 210 L240 250 L332 250 A8 8 0 0 1 348 250 L480 250`} />
      <Load x1={400} x2={480} yTop={50} yBot={250} C={s.C} Rl={s.Rl} />
      <Dot p={[480, 50]} />
      <Dot p={[480, 250]} />
          </Svg>
  );
}

// ---------------------------------------------------------------------------
// BJT switch
// ---------------------------------------------------------------------------

export function BjtStage({ s }: { s: BjtState }) {
  const on = s.Ic > 1e-6;
  const loadOn = bjtLoadOn(s);
  const regionTh = s.region === "cutoff" ? "คัตออฟ (สวิตช์เปิด)" : s.region === "saturation" ? "อิ่มตัว (สวิตช์ปิด/ต่อ)" : "แอกทีฟ (ขยาย – ไม่ใช่สวิตช์)";
  const X = 400;
  return (
    <Svg label={`วงจรทรานซิสเตอร์ NPN เป็นสวิตช์ Vcc ${formatSI(s.Vcc, "V")} Vin ${formatSI(s.Vin, "V")} RB ${formatSI(s.Rb, "Ω")} RC ${formatSI(s.Rc, "Ω")} เบตา ${s.beta} IB ${formatSI(s.Ib, "A")} IC ${formatSI(s.Ic, "A")} VCE ${formatSI(s.Vce, "V")} ย่าน ${regionTh}`}>
      {/* Vcc */}
      <Terminal p={[X, 24]} />
      <Lbl x={X + 14} y={30} main="+V" sub="CC" rest={` = ${formatSI(s.Vcc, "V")}`} size={16} />
      {/* load */}
      {s.load === "resistor" ? (
        <>
          <Resistor a={[X, 29]} b={[X, 130]} />
          <Lbl x={X + 16} y={84} main="R" sub="C" rest={` = ${formatSI(s.Rc, "Ω")}`} size={15} />
        </>
      ) : s.load === "led" ? (
        <>
          <Resistor a={[X, 29]} b={[X, 80]} len={36} />
          <Lbl x={X + 16} y={60} main="R" sub="C" rest={` = ${formatSI(s.Rc, "Ω")}`} size={15} />
          <Led a={[X, 80]} b={[X, 130]} color={LED_COLORS.red.hex} glow={Math.min(1, s.Ic / 0.02)} burnt={false} arrowsUp={false} />
          <Lbl x={X + 40} y={112} main={`LED ${BJT_LED_VF} V`} size={13} color={MUTED} />
        </>
      ) : (
        <>
          <Wire d={`M${X} 29 L${X} 60 M${X} 100 L${X} 130 M${X} 42 L355 42 M${X} 118 L355 118`} />
          <Diode a={[355, 118]} b={[355, 42]} />
          <rect x={X - 14} y={60} width={28} height={40} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2.5} />
          <Lbl x={X + 22} y={76} main="คอยล์รีเลย์" size={14} />
          <Lbl x={X + 22} y={96} main={formatSI(s.Rc, "Ω")} size={13} color={MUTED} />
          <Lbl x={340} y={84} main="D" anchor="end" size={13} color={MUTED} />
          <Dot p={[X, 42]} />
          <Dot p={[X, 118]} />
        </>
      )}
      <Lbl x={X - 10} y={146} main="C" anchor="end" size={13} color={MUTED} />
      {/* NPN */}
      <circle cx={385} cy={180} r={30} fill="var(--fig-panel)" stroke={INK} strokeWidth={2} />
      <path d="M372 162 L372 198" stroke={INK} strokeWidth={4} />
      <Wire d={`M372 170 L${X} 152 L${X} 130 M372 190 L${X} 208 L${X} 260`} />
      <ArrowHead p={[394, 204]} angle={33} color={INK} />
      <Lbl x={X + 10} y={238} main="E" size={13} color={MUTED} />
      <Lbl x={358} y={208} main="B" anchor="end" size={13} color={MUTED} />
      {/* base drive */}
      <Battery a={[100, 260]} b={[100, 180]} />
      <text x={80} y={212} fontSize={18} fontWeight={700} textAnchor="middle" fill="var(--fig-plus)">
        +
      </text>
      <Lbl x={114} y={232} main="V" sub="in" rest={` = ${formatSI(s.Vin, "V")}`} size={15} />
      <Resistor a={[100, 180]} b={[372, 180]} len={50} />
      <Lbl x={236} y={164} main="R" sub="B" rest={` = ${formatSI(s.Rb, "Ω")}`} anchor="middle" size={15} />
      <Wire d="M100 260 L400 260" />
      <Ground p={[250, 260]} />
      {/* currents */}
      <Flow d="M100 260 L100 180 L372 180" on={s.Ib > 0} speed={speed(s.Ib, 2e-4)} />
      <Flow d={`M${X} 29 L${X} 152 L372 170 M372 190 L${X} 208 L${X} 260`} on={on} speed={speed(s.Ic, 0.02)} />
      <Lbl x={236} y={206} main="I" sub="B" rest={` = ${formatSI(s.Ib, "A")}`} anchor="middle" size={15} />
      <Lbl x={X + 40} y={176} main="I" sub="C" rest={` = ${formatSI(s.Ic, "A")}`} size={15} />
      <Lbl x={X + 40} y={200} main="V" sub="CE" rest={` = ${formatSI(s.Vce, "V")}`} size={15} />
      <Badge x={180} y={60} text={regionTh} tone={s.region === "saturation" ? "ok" : s.region === "active" ? "warn" : "muted"} />
      {s.load === "relay" ? <Lbl x={556} y={142} anchor="end" main={loadOn ? "หน้าสัมผัส: ทำงาน" : "หน้าสัมผัส: ไม่ทำงาน"} size={13} weight={700} /> : null}
    </Svg>
  );
}

export function SemiStage({ state }: { state: SemiState }) {
  switch (state.tab) {
    case "led":
      return <LedStage s={state.led} />;
    case "rect":
      return <RectStage s={state.rect} />;
    case "bjt":
      return <BjtStage s={state.bjt} />;
    default:
      return <DiodeStage s={state.diode} />;
  }
}
