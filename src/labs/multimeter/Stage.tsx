/**
 * Multimeter stage (pure SVG, no hooks): meter face with LCD, RANGE key,
 * rotary dial, four jacks, two test leads, and the selected bench item.
 * Used by Lab.tsx and by previewStage for static PNG QA.
 */
import type { ReactNode } from "react";
import { formatSI } from "../shared/format";
import { bandsFor, BOARD_R, ITEMS, unknownResistor, type BoardPoint, type Dial, type Jack, type MeterInputs, type MultimeterState } from "./model";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const MONO = "ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace";
const BODY = "#2f3437";
const BUMPER = "#e0a800";
const FACE_TXT = "#f3f3f0";
const SEL = "#ffd54a";
const LCD_BG = "#c9d6b8";
const LCD_INK = "#1d2a1c";
const RED = "#d32f2f";
const BLACK = "#1b1b1b";

export const DIAL_LABEL: Record<Dial, string> = {
  off: "OFF",
  VDC: "V⎓",
  VAC: "V~",
  mV: "mV⎓",
  ohm: "Ω",
  continuity: "•)))",
  diode: "▷|",
  mA: "mA",
  A: "A",
};
const DIAL_ANGLE: Record<Dial, number> = { off: -150, VDC: -112.5, VAC: -75, mV: -37.5, ohm: 0, continuity: 37.5, diode: 75, mA: 112.5, A: 150 };
const JACK_X: Record<Jack | "COM", number> = { "10A": 54, mA: 106, COM: 158, "VΩ": 210 };
const JACK_Y = 392;

function T({ x, y, children, size = 16, anchor = "middle", weight = 400, fill = INK, family, halo }: { x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end"; weight?: number; fill?: string; family?: string; halo?: boolean }) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill={fill} fontFamily={family} stroke={halo ? "var(--fig-panel)" : undefined} strokeWidth={halo ? 4 : undefined} paintOrder={halo ? "stroke" : undefined} strokeLinejoin="round">
      {children}
    </text>
  );
}

const polar = (cx: number, cy: number, rad: number, deg: number): [number, number] => [cx + rad * Math.sin((deg * Math.PI) / 180), cy - rad * Math.cos((deg * Math.PI) / 180)];

// ---------------------------------------------------------------------------
// Meter
// ---------------------------------------------------------------------------

function Meter({ s }: { s: MultimeterState }) {
  const cx = 136;
  const cy = 262;
  const [px, py] = polar(cx, cy, 40, DIAL_ANGLE[s.dial]);
  const on = s.dial !== "off";
  return (
    <g>
      <rect x={10} y={12} width={252} height={440} rx={26} fill={BUMPER} />
      <rect x={22} y={24} width={228} height={416} rx={16} fill={BODY} />
      {/* LCD */}
      <rect x={34} y={36} width={204} height={100} rx={6} fill={LCD_BG} stroke="#3b4a3a" strokeWidth={3} />
      {on ? (
        <g>
          <T x={44} y={58} size={14} anchor="start" weight={700} fill={LCD_INK} family={MONO}>
            {s.autoRange ? "AUTO" : "MANU"}
          </T>
          <T x={44} y={74} size={12} anchor="start" fill={LCD_INK} family={MONO}>
            {s.rangeLabel}
          </T>
          {s.beep ? (
            <T x={228} y={58} size={14} anchor="end" weight={700} fill={LCD_INK} family={MONO}>
              •))) BEEP
            </T>
          ) : null}
          {s.fuseBlown && (s.dial === "mA" || s.dial === "A") ? (
            <T x={228} y={74} size={12} anchor="end" weight={700} fill={LCD_INK}>
              FUSE?
            </T>
          ) : null}
          <T x={196} y={116} size={s.display.length > 5 ? 40 : 46} anchor="end" weight={700} fill={LCD_INK} family={MONO}>
            {s.display}
          </T>
          <T x={230} y={116} size={18} anchor="end" weight={700} fill={LCD_INK} family={MONO}>
            {s.displayUnit}
          </T>
        </g>
      ) : null}
      {/* keys */}
      <rect x={44} y={148} width={78} height={28} rx={6} fill="#4a5155" stroke="#73797d" />
      <T x={83} y={168} size={14} weight={700} fill={FACE_TXT}>
        RANGE
      </T>
      <rect x={150} y={148} width={78} height={28} rx={6} fill="#4a5155" stroke="#73797d" />
      <T x={189} y={168} size={14} weight={700} fill={FACE_TXT}>
        HOLD
      </T>
      {/* dial */}
      {(Object.keys(DIAL_ANGLE) as Dial[]).map((d) => {
        const [lx, ly] = polar(cx, cy, 74, DIAL_ANGLE[d]);
        const [tx, ty] = polar(cx, cy, 55, DIAL_ANGLE[d]);
        const [tx2, ty2] = polar(cx, cy, 60, DIAL_ANGLE[d]);
        const act = d === s.dial;
        return (
          <g key={d}>
            <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke={act ? SEL : "#9aa0a4"} strokeWidth={act ? 3 : 2} />
            <T x={lx} y={ly + 5} size={act ? 16 : 14} weight={act ? 700 : 400} fill={act ? SEL : FACE_TXT}>
              {DIAL_LABEL[d]}
            </T>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={50} fill="#1f2326" stroke="#555c60" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={34} fill="#3a4044" />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={SEL} strokeWidth={7} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="#1f2326" />
      {/* jacks */}
      {(["10A", "mA", "COM", "VΩ"] as const).map((j) => {
        const x = JACK_X[j];
        const blown = (j === "mA" && s.blownMA) || (j === "10A" && s.blown10A);
        return (
          <g key={j}>
            <circle cx={x} cy={JACK_Y} r={14} fill="#111" stroke={j === "COM" ? "#9aa0a4" : RED} strokeWidth={4} />
            <circle cx={x} cy={JACK_Y} r={5} fill="#444" />
            <T x={x} y={JACK_Y + 34} size={14} weight={700} fill={FACE_TXT}>
              {j}
            </T>
            {blown ? (
              <g>
                <rect x={x - 24} y={JACK_Y - 44} width={48} height={20} rx={4} fill={RED} />
                <T x={x} y={JACK_Y - 29} size={13} weight={700} fill="#fff">
                  ฟิวส์ขาด
                </T>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Bench items: each returns its drawing and named test points
// ---------------------------------------------------------------------------

type Pts = Record<string, [number, number]>;
const L = 340;
const R = 560;
const MY = 210;

function TermLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <T x={x} y={y - 18} size={16} weight={700}>
      {text}
    </T>
  );
}

function Sub({ children, fill = MUTED, y = 64 }: { children: ReactNode; fill?: string; y?: number }) {
  return (
    <T x={453} y={y} size={15} fill={fill}>
      {children}
    </T>
  );
}

function Pad({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={6} fill="var(--fig-copper)" stroke={INK} strokeWidth={1.5} />;
}

const BAND = ["#111", "#7b4a1e", "#d32f2f", "#f57c00", "#fbc02d", "#2e7d32", "#1565c0", "#7b1fa2", "#888", "#fafafa"];

function item(inp: MeterInputs, s: MultimeterState): { node: ReactNode; pts: Pts } {
  const def = ITEMS[inp.item];
  const two = (node: ReactNode): { node: ReactNode; pts: Pts } => ({
    node: (
      <g>
        {node}
        <Pad x={L} y={MY} />
        <Pad x={R} y={MY} />
        <TermLabel x={L} y={MY} text={def.points[0]} />
        <TermLabel x={R} y={MY} text={def.points[1]} />
      </g>
    ),
    pts: { p1: [L, MY], p2: [R, MY] },
  });
  switch (inp.item) {
    case "battery-9v":
      return two(
        <g>
          <line x1={L} y1={MY} x2={R} y2={MY} stroke={INK} strokeWidth={3} />
          <rect x={380} y={160} width={140} height={100} rx={10} fill="#37474f" stroke={INK} strokeWidth={2} />
          <T x={450} y={222} size={32} weight={700} fill="#fff">9V</T>
          <Sub>ค่าในแบบจำลอง 9.37 V</Sub>
        </g>,
      );
    case "aa":
    case "aa-flat":
      return two(
        <g>
          <line x1={L} y1={MY} x2={R} y2={MY} stroke={INK} strokeWidth={3} />
          <rect x={372} y={184} width={8} height={52} fill="#bbb" stroke={INK} />
          <rect x={380} y={176} width={150} height={68} rx={8} fill={inp.item === "aa" ? "#2e7d32" : "#6d6d6d"} stroke={INK} strokeWidth={2} />
          <T x={455} y={218} size={20} weight={700} fill="#fff">AA 1.5V</T>
          <Sub>{inp.item === "aa" ? "ถ่านใหม่" : "ถ่านใช้แล้ว"}</Sub>
        </g>,
      );
    case "resistor-unknown": {
      const b = bandsFor(unknownResistor(inp.unknownSeed).nominal);
      return two(
        <g>
          <line x1={L} y1={MY} x2={R} y2={MY} stroke={MUTED} strokeWidth={3} />
          <rect x={400} y={190} width={100} height={40} rx={14} fill="#e8d3a8" stroke={INK} strokeWidth={2} />
          {[b[0], b[1], b[2]].map((c, i) => (
            <rect key={i} x={414 + i * 18} y={190} width={9} height={40} fill={BAND[c]} />
          ))}
          <rect x={478} y={190} width={9} height={40} fill="#c9a227" />
          <Sub>ค่าไม่ทราบ — วัดด้วยย่าน Ω (ถอดออกจากวงจรแล้ว)</Sub>
        </g>,
      );
    }
    case "resistor-board": {
      const xs = [330, 410, 490, 570];
      const pts: Pts = {};
      (["A", "B", "C", "D"] as BoardPoint[]).forEach((p, i) => (pts[p] = [xs[i], MY]));
      return {
        node: (
          <g>
            <rect x={306} y={140} width={290} height={150} rx={8} fill="#1b5e20" fillOpacity={0.18} stroke={INK} strokeWidth={1.5} />
            {BOARD_R.map((rv, i) => (
              <g key={i}>
                <line x1={xs[i]} y1={MY} x2={xs[i + 1]} y2={MY} stroke={MUTED} strokeWidth={3} />
                <rect x={xs[i] + 16} y={MY - 12} width={48} height={24} rx={8} fill="#e8d3a8" stroke={INK} strokeWidth={2} />
                <T x={xs[i] + 40} y={MY - 40} size={14}>{`R${i + 1} ${formatSI(rv, "Ω", 2)}`}</T>
              </g>
            ))}
            {(["A", "B", "C", "D"] as BoardPoint[]).map((p, i) => (
              <g key={p}>
                <Pad x={xs[i]} y={MY} />
                <T x={xs[i]} y={MY - 14} size={18} weight={700}>{p}</T>
              </g>
            ))}
            <Sub>วงจรไม่มีไฟ (ถอดแหล่งจ่ายแล้ว)</Sub>
          </g>
        ),
        pts,
      };
    }
    case "diode-1n4007":
      return two(
        <g>
          <line x1={L} y1={MY} x2={R} y2={MY} stroke={MUTED} strokeWidth={3} />
          <rect x={410} y={194} width={80} height={32} rx={6} fill="#222" stroke={INK} />
          <rect x={472} y={194} width={10} height={32} fill="#cfd8dc" />
          <Sub>1N4007 · แถบสีเงิน = แคโทด (K)</Sub>
        </g>,
      );
    case "led-red":
      return two(
        <g>
          <polyline points={`${L},${MY} 430,${MY} 430,238`} fill="none" stroke={MUTED} strokeWidth={3} />
          <polyline points={`${R},${MY} 470,${MY} 470,238`} fill="none" stroke={MUTED} strokeWidth={3} />
          {s.ledGlow ? <circle cx={450} cy={170} r={44} fill="#ff5252" fillOpacity={0.25} /> : null}
          <path d="M424 238 L424 170 A26 26 0 0 1 476 170 L476 238 Z" fill={s.ledGlow ? "#ff3d3d" : "#b71c1c"} fillOpacity={s.ledGlow ? 0.95 : 0.6} stroke={INK} strokeWidth={2} />
          <rect x={418} y={236} width={64} height={8} fill="#b71c1c" stroke={INK} />
          <Sub>{s.ledGlow ? "LED ติดสลัว ๆ" : "LED ดับ"} · ขายาว = แอโนด (A)</Sub>
        </g>,
      );
    case "wire-good":
    case "wire-broken": {
      const broken = inp.item === "wire-broken";
      return two(
        <g>
          {broken ? (
            <g>
              <line x1={L} y1={MY} x2={444} y2={MY} stroke="var(--fig-copper)" strokeWidth={6} strokeLinecap="round" />
              <line x1={456} y1={MY} x2={R} y2={MY} stroke="var(--fig-copper)" strokeWidth={6} strokeLinecap="round" />
              <T x={450} y={MY + 34} size={15} fill="var(--fig-danger)">รอยต่อขาด (วงจรเปิด)</T>
            </g>
          ) : (
            <line x1={L} y1={MY} x2={R} y2={MY} stroke="var(--fig-copper)" strokeWidth={6} strokeLinecap="round" />
          )}
          <circle cx={L + 18} cy={MY} r={11} fill="#b0bec5" stroke={INK} />
          <circle cx={R - 18} cy={MY} r={11} fill="#b0bec5" stroke={INK} />
          <Sub>รอยบัดกรีที่ปลายสายทั้งสองข้าง · ไม่มีไฟ</Sub>
        </g>,
      );
    }
    case "fuse-good":
    case "fuse-blown": {
      const blown = inp.item === "fuse-blown";
      return two(
        <g>
          <line x1={L} y1={MY} x2={R} y2={MY} stroke={MUTED} strokeWidth={3} />
          <rect x={390} y={188} width={120} height={44} rx={6} fill={blown ? "#9e9e9e" : "#e3f2fd"} fillOpacity={blown ? 0.6 : 0.8} stroke={INK} strokeWidth={2} />
          <rect x={378} y={186} width={18} height={48} rx={3} fill="#b0bec5" stroke={INK} />
          <rect x={504} y={186} width={18} height={48} rx={3} fill="#b0bec5" stroke={INK} />
          {blown ? (
            <g stroke={INK} strokeWidth={2}>
              <line x1={396} y1={MY} x2={440} y2={MY - 4} />
              <line x1={460} y1={MY + 4} x2={504} y2={MY} />
            </g>
          ) : (
            <line x1={396} y1={MY} x2={504} y2={MY} stroke={INK} strokeWidth={2} />
          )}
          <Sub>{blown ? "ไส้ฟิวส์ขาด หลอดแก้วดำ" : "ไส้ฟิวส์ต่อเนื่อง"} · ถอดออกจากเครื่องแล้ว</Sub>
        </g>,
      );
    }
    case "outlet-230":
      return {
        node: (
          <g>
            <rect x={300} y={54} width={306} height={30} rx={6} fill="var(--fig-danger)" />
            <T x={453} y={75} size={17} weight={700} fill="#fff">⚠ ครูสาธิตเท่านั้น (ภาพจำลอง)</T>
            <T x={453} y={108} size={15} weight={700}>ใช้มิเตอร์และสายวัดพิกัด CAT II / CAT III</T>
            <rect x={380} y={124} width={140} height={160} rx={14} fill="#f5f5f5" stroke={INK} strokeWidth={2} />
            <circle cx={450} cy={160} r={9} fill="#333" />
            <T x={423} y={202} size={16} weight={700} fill="#222">L</T>
            <T x={477} y={202} size={16} weight={700} fill="#222">N</T>
            <rect x={418} y={210} width={10} height={36} rx={3} fill="#333" />
            <rect x={472} y={210} width={10} height={36} rx={3} fill="#333" />
            <T x={453} y={436} size={14} fill={MUTED}>นักเรียนห้ามวัดเต้ารับหรือไฟบ้านจริง</T>
          </g>
        ),
        pts: { p1: [423, 228], p2: [477, 228] },
      };
    case "series-circuit-current": {
      const ser = inp.placement === "series";
      const T0 = 130;
      const B0 = 270;
      return {
        node: (
          <g>
            <Sub>{ser ? "ตัดวงจรที่ X–Y แล้วแทรกมิเตอร์อนุกรม" : "วงจรต่อครบ (X–Y ต่อกัน)"}</Sub>
            <Sub y={84}>{`กระแสในวงจรขณะนี้ ≈ ${formatSI(s.circuitI, "A", 3)}`}</Sub>
            {/* loop: battery on left, R on top, break X–Y on bottom */}
            <polyline points={`330,170 330,${T0} 410,${T0}`} fill="none" stroke={INK} strokeWidth={2.5} />
            <polyline points={`490,${T0} 570,${T0} 570,${B0} 500,${B0}`} fill="none" stroke={INK} strokeWidth={2.5} />
            <polyline points={`440,${B0} 330,${B0} 330,236`} fill="none" stroke={INK} strokeWidth={2.5} />
            {ser ? null : <line x1={440} y1={B0} x2={500} y2={B0} stroke={INK} strokeWidth={2.5} />}
            {/* battery (+ on top) */}
            <line x1={310} y1={180} x2={350} y2={180} stroke={INK} strokeWidth={3} />
            <line x1={320} y1={194} x2={340} y2={194} stroke={INK} strokeWidth={6} />
            <line x1={330} y1={180} x2={330} y2={170} stroke={INK} strokeWidth={2.5} />
            <line x1={310} y1={208} x2={350} y2={208} stroke={INK} strokeWidth={3} />
            <line x1={320} y1={222} x2={340} y2={222} stroke={INK} strokeWidth={6} />
            <line x1={330} y1={222} x2={330} y2={236} stroke={INK} strokeWidth={2.5} />
            <T x={358} y={186} size={16} anchor="start" weight={700}>+</T>
            <T x={358} y={230} size={16} anchor="start" weight={700}>−</T>
            <T x={380} y={210} size={16} anchor="start">12 V</T>
            {/* resistor */}
            <rect x={410} y={T0 - 12} width={80} height={24} rx={4} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
            <T x={450} y={T0 - 20} size={16}>R 1 kΩ</T>
            <Pad x={410} y={T0} />
            <Pad x={490} y={T0} />
            <Pad x={330} y={155} />
            <Pad x={330} y={250} />
            <Pad x={440} y={B0} />
            <Pad x={500} y={B0} />
            <T x={512} y={B0 - 10} size={16} anchor="start" weight={700}>X</T>
            <T x={428} y={B0 - 10} size={16} anchor="end" weight={700}>Y</T>
          </g>
        ),
        pts: { p1: [500, B0], p2: [440, B0], "s+": [330, 155], "s-": [330, 250], "r+": [410, T0], "r-": [490, T0] },
      };
    }
    case "capacitor-charged":
      return two(
        <g>
          <line x1={L} y1={MY} x2={R} y2={MY} stroke={MUTED} strokeWidth={3} />
          <rect x={390} y={176} width={120} height={68} rx={12} fill="#1565c0" stroke={INK} strokeWidth={2} />
          <rect x={486} y={176} width={16} height={68} fill="#90caf9" />
          <T x={494} y={216} size={18} weight={700} fill="#0d47a1">−</T>
          <T x={440} y={208} size={14} weight={700} fill="#fff">470 µF</T>
          <T x={440} y={226} size={13} fill="#fff">25 V</T>
          <Sub fill={s.capDischarged ? MUTED : "var(--fig-danger)"}>{s.capDischarged ? "คายประจุแล้ว (≈ 0 V)" : "⚠ มีประจุค้าง 12 V — คายประจุก่อนวัด Ω"}</Sub>
        </g>,
      );
  }
}

// ---------------------------------------------------------------------------
// Probe + lead
// ---------------------------------------------------------------------------

function Probe({ from, tip, color, label, right }: { from: [number, number]; tip: [number, number]; color: string; label: string; right: boolean }) {
  const [jx, jy] = from;
  const [x, y] = tip;
  const by = y + 52;
  const c2y = Math.min(by + 70, 470);
  const d = `M${jx} ${jy + 12} C${jx} ${jy + 70}, ${x} ${c2y}, ${x} ${by}`;
  return (
    <g>
      <path d={d} fill="none" stroke="#9aa0a6" strokeWidth={7} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x} y2={y + 12} stroke="#b0b7bb" strokeWidth={3} strokeLinecap="round" />
      <rect x={x - 6} y={y + 12} width={12} height={40} rx={4} fill={color} stroke="#9aa0a6" strokeWidth={1.5} />
      <T x={right ? x + 11 : x - 11} y={y + 38} size={14} anchor={right ? "start" : "end"} weight={700} halo>
        {label}
      </T>
    </g>
  );
}

export function MultimeterStage({ s, inp }: { s: MultimeterState; inp: MeterInputs }) {
  const it = item(inp, s);
  let red: [number, number] = [560, 350];
  let black: [number, number] = [500, 350];
  if (s.probesOn) {
    if (inp.item === "resistor-board") {
      red = it.pts[inp.redPoint];
      black = it.pts[inp.blackPoint];
      if (inp.redPoint === inp.blackPoint) black = [black[0] + 10, black[1]];
    } else {
      let a = it.pts.p1;
      let b = it.pts.p2;
      if (inp.item === "series-circuit-current" && inp.placement === "across-supply") [a, b] = [it.pts["s+"], it.pts["s-"]];
      if (inp.item === "series-circuit-current" && inp.placement === "across-resistor") [a, b] = [it.pts["r+"], it.pts["r-"]];
      [red, black] = inp.reversed ? [b, a] : [a, b];
    }
  }
  return (
    <svg viewBox="0 0 640 464" className="block h-auto w-full" role="presentation">
      <rect x={276} y={12} width={354} height={440} rx={12} fill="var(--fig-panel)" stroke="var(--fig-grid)" />
      <T x={453} y={40} size={16} weight={700}>
        {ITEMS[inp.item].label}
      </T>
      {it.node}
      <Probe from={[JACK_X.COM, JACK_Y]} tip={black} color={BLACK} label="ดำ COM" right={black[0] > red[0]} />
      <Probe from={[JACK_X[inp.jack], JACK_Y]} tip={red} color={RED} label={`แดง ${inp.jack}`} right={red[0] >= black[0]} />
      <Meter s={s} />
      <circle cx={JACK_X.COM} cy={JACK_Y} r={9} fill={BLACK} stroke="#9aa0a6" strokeWidth={2} />
      <circle cx={JACK_X[inp.jack]} cy={JACK_Y} r={9} fill={RED} stroke="#9aa0a6" strokeWidth={2} />
      {!s.probesOn ? (
        <T x={392} y={384} size={14} fill={MUTED}>
          โพรบยังไม่แตะชิ้นงาน
        </T>
      ) : null}
    </svg>
  );
}
