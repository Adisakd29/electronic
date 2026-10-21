// Week 12 — ไมโครโฟนและลำโพง (Microphones & Loudspeakers)
import type { FigureMap } from "@/content/types";
import type { ReactNode } from "react";
import { Wire, Label, Arrow, Node, Terminal, Ground, Resistor, Capacitor, Inductor, ACSource, Callout } from "./kit";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";
const MUTED = "var(--fig-muted)";
const FIELD = "var(--fig-field)";
const ACC = "var(--fig-accent)";
const ACC_SOFT = "var(--fig-accent-soft)";
const PANEL = "var(--fig-panel)";
const PLUS = "var(--fig-plus)";
const OK = "var(--fig-ok)";
const DANGER = "var(--fig-danger)";
const WARN = "var(--fig-warn)";
const COPPER = "var(--fig-copper)";
const GRID = "var(--fig-grid)";

/**
 * Loudspeaker symbol (IEC 60617 style: rectangle + flare), vertical two-terminal part.
 * + terminal at (x, y−30) (top), − terminal at (x, y+30) (bottom); flare opens to the right.
 * `rev` puts the + mark at the bottom terminal (speaker wired the other way round).
 */
function Spk({ x, y, rev = false, label, scale = 1 }: { x: number; y: number; rev?: boolean; label?: ReactNode; scale?: number }) {
  const s = scale;
  return (
    <g>
      <line x1={x} y1={y - 30 * s} x2={x} y2={y - 17 * s} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y + 17 * s} x2={x} y2={y + 30 * s} stroke={INK} strokeWidth={3} />
      <rect x={x - 9 * s} y={y - 17 * s} width={18 * s} height={34 * s} fill={BG} stroke={INK} strokeWidth={3} />
      <path
        d={`M ${x + 9 * s} ${y - 17 * s} L ${x + 31 * s} ${y - 34 * s} L ${x + 31 * s} ${y + 34 * s} L ${x + 9 * s} ${y + 17 * s} Z`}
        fill={BG}
        stroke={INK}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <Label x={x - 16} y={rev ? y + 24 * s : y - 24 * s} size={20} weight={700} color={PLUS}>
        +
      </Label>
      {label ? (
        <Label x={x + 38 * s} y={y} anchor="start" size={20}>
          {label}
        </Label>
      ) : null}
    </g>
  );
}

/** Microphone symbol (IEC 60617 style: circle with a tangent bar on the sound side). */
function MicSym({ x, y, r = 22 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={x - r} y1={y - r} x2={x - r} y2={y + r} stroke={INK} strokeWidth={4} />
    </g>
  );
}

/** Concentric sound-wave arcs pointing right (dir=1) or left (dir=-1). */
function SoundArcs({ x, y, dir = 1, n = 3, color = ACC }: { x: number; y: number; dir?: 1 | -1; n?: number; color?: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const r = 12 + i * 12;
        const x0 = x + dir * i * 12;
        return (
          <path
            key={i}
            d={`M ${x0} ${y - r} Q ${x0 + dir * r * 0.9} ${y} ${x0} ${y + r}`}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function sinePath(x0: number, x1: number, yc: number, amp: number, cycles: number) {
  const n = 60;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = yc - amp * Math.sin(2 * Math.PI * cycles * t);
    d += (i === 0 ? "M " : " L ") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d;
}

// ---------------------------------------------------------------------------
// F14 — energy chain (intro)
function EnergyChain() {
  return (
    <svg viewBox="0 0 600 250" aria-hidden="true">
      <SoundArcs x={22} y={100} dir={1} />
      <MicSym x={115} y={100} />
      <Arrow from={[145, 100]} to={[225, 100]} color={INK} />
      <path d={sinePath(160, 210, 78, 6, 2)} fill="none" stroke={ACC} strokeWidth={2.5} />
      <path d="M 235 60 L 235 140 L 315 100 Z" fill={PANEL} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <Arrow from={[322, 100]} to={[420, 100]} color={INK} />
      <path d={sinePath(335, 405, 74, 14, 2)} fill="none" stroke={ACC} strokeWidth={2.5} />
      <Spk x={450} y={100} />
      <line x1={420} y1={100} x2={432} y2={100} stroke={INK} strokeWidth={3} />
      <SoundArcs x={500} y={100} dir={1} />
      <Label x={115} y={160}>ไมโครโฟน</Label>
      <Label x={275} y={160}>เครื่องขยาย</Label>
      <Label x={470} y={160}>ลำโพง</Label>
      <Label x={185} y={50} size={20} muted>
        ~ mV
      </Label>
      <Label x={370} y={40} size={20} muted>
        ~ V
      </Label>
      <Label x={115} y={200} size={20} muted>
        เสียง → ไฟฟ้า
      </Label>
      <Label x={470} y={200} size={20} muted>
        ไฟฟ้า → เสียง
      </Label>
      <Label x={300} y={232} size={20}>
        ทั้งสองตัวเป็นทรานสดิวเซอร์ (transducer)
      </Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F01 — longitudinal sound wave + audible range and driver bands
function SoundWave() {
  const lines: number[] = [];
  const lam = 200;
  const phase0 = 100; // compressions at 100, 300, 500
  for (let u = 36; u <= 564; u += 8) {
    lines.push(u - 12 * Math.sin((2 * Math.PI * (u - phase0)) / lam));
  }
  let p = "";
  for (let x = 40; x <= 560; x += 4) {
    const y = 190 - 34 * Math.cos((2 * Math.PI * (x - phase0)) / lam);
    p += (x === 40 ? "M " : " L ") + x + " " + y.toFixed(1);
  }
  const fx = (f: number) => 40 + (520 * Math.log10(f / 20)) / 3;
  const ticks: [number, string][] = [
    [20, "20"],
    [100, "100"],
    [1000, "1k"],
    [10000, ""],
    [20000, "20k Hz"],
  ];
  const bands: { f0: number; f1: number; row: number; name: string }[] = [
    { f0: 20, f1: 200, row: 0, name: "ซับวูฟเฟอร์" },
    { f0: 300, f1: 5000, row: 0, name: "มิดเรนจ์" },
    { f0: 40, f1: 1000, row: 1, name: "วูฟเฟอร์" },
    { f0: 2000, f1: 20000, row: 1, name: "ทวีตเตอร์" },
  ];
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      {lines.map((x, i) => (
        <line key={i} x1={x} y1={46} x2={x} y2={124} stroke={INK} strokeWidth={2} />
      ))}
      <Label x={100} y={22} size={20}>อัด (compression)</Label>
      <Label x={400} y={22} size={20}>ขยาย (rarefaction)</Label>
      <line x1={40} y1={190} x2={560} y2={190} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      <path d={p} fill="none" stroke={ACC} strokeWidth={3} />
      <line x1={100} y1={128} x2={100} y2={262} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" />
      <line x1={300} y1={128} x2={300} y2={262} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" />
      <Arrow from={[200, 255]} to={[102, 255]} color={INK} width={2} head={10} />
      <Arrow from={[200, 255]} to={[298, 255]} color={INK} width={2} head={10} />
      <Label x={200} y={280} size={22} weight={700}>λ</Label>
      <Arrow from={[400, 268]} to={[560, 268]} color={INK} width={2.5} />
      <Label x={480} y={292} size={20}>v ≈ 343 m/s</Label>
      {/* frequency scale */}
      <line x1={40} y1={330} x2={560} y2={330} stroke={INK} strokeWidth={2} />
      {ticks.map(([f, t]) => (
        <g key={f}>
          <line x1={fx(f)} y1={324} x2={fx(f)} y2={336} stroke={INK} strokeWidth={2} />
          <Label x={f === 20000 ? fx(f) - 34 : f === 20 ? fx(f) + 4 : fx(f)} y={352} size={20} muted>
            {t}
          </Label>
        </g>
      ))}
      {bands.map((b) => {
        const x0 = fx(b.f0);
        const x1 = fx(b.f1);
        const y = 368 + b.row * 36;
        return (
          <g key={b.name}>
            <rect x={x0} y={y} width={x1 - x0} height={30} rx={6} fill={ACC_SOFT} stroke={ACC} strokeWidth={2} />
            <Label x={(x0 + x1) / 2} y={y + 16} size={20}>
              {b.name}
            </Label>
          </g>
        );
      })}
      <Label x={300} y={452} size={20}>ย่านที่หูคนได้ยิน ≈ 20 Hz – 20 kHz</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 — dynamic (moving-coil) microphone cross-section
function DynamicMic() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <defs>
        <pattern id="w12f02-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={MUTED} strokeWidth="2" />
        </pattern>
      </defs>
      <SoundArcs x={40} y={190} dir={1} />
      <Label x={70} y={268} size={20}>เสียง</Label>
      {/* back plate */}
      <rect x={330} y={100} width={24} height={180} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* pole piece */}
      <rect x={210} y={172} width={120} height={36} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* magnet ring (two sections) */}
      <rect x={262} y={104} width={68} height={50} fill="url(#w12f02-hatch)" stroke={INK} strokeWidth={3} />
      <rect x={262} y={226} width={68} height={50} fill="url(#w12f02-hatch)" stroke={INK} strokeWidth={3} />
      {/* top (front) plate */}
      <rect x={212} y={104} width={50} height={56} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={212} y={220} width={50} height={56} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* voice coil in the gap */}
      <rect x={200} y={162} width={52} height={8} fill={COPPER} stroke={INK} strokeWidth={1.5} />
      <rect x={200} y={210} width={52} height={8} fill={COPPER} stroke={INK} strokeWidth={1.5} />
      {/* coil former to diaphragm */}
      <line x1={172} y1={166} x2={200} y2={166} stroke={INK} strokeWidth={2} />
      <line x1={172} y1={214} x2={200} y2={214} stroke={INK} strokeWidth={2} />
      {/* diaphragm */}
      <path d="M 176 80 Q 146 190 176 300" fill="none" stroke={ACC} strokeWidth={4} />
      {/* output leads */}
      <path d="M 252 166 C 300 140 300 90 360 90 L 470 90" fill="none" stroke={COPPER} strokeWidth={2.5} />
      <path d="M 252 214 C 300 240 300 300 360 300 L 470 300" fill="none" stroke={COPPER} strokeWidth={2.5} />
      <Terminal x={476} y={90} />
      <Terminal x={476} y={300} />
      <path d={sinePath(490, 570, 195, 14, 2)} fill="none" stroke={ACC} strokeWidth={2.5} />
      <Label x={530} y={235} size={20}>e (mV)</Label>
      {/* labels */}
      <Label x={150} y={56} size={20}>ไดอะแฟรม</Label>
      <Label x={296} y={30} size={20}>แม่เหล็กถาวร</Label>
      <line x1={296} y1={44} x2={296} y2={104} stroke={MUTED} strokeWidth={1.5} />
      <Label x={130} y={340} size={20}>วอยซ์คอยล์</Label>
      <line x1={150} y1={326} x2={222} y2={220} stroke={MUTED} strokeWidth={1.5} />
      <Label x={330} y={340} size={20}>แกนขั้ว (pole piece)</Label>
      <line x1={318} y1={326} x2={300} y2={210} stroke={MUTED} strokeWidth={1.5} />
      <Label x={420} y={380} size={22} weight={700}>e = B·l·v</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 — condenser capsule + electret (ECM) bias circuit
function CondenserMic() {
  const holes = [100, 130, 160, 190, 220, 250, 280];
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* capsule section */}
      <SoundArcs x={18} y={190} dir={1} />
      <line x1={100} y1={80} x2={100} y2={300} stroke={COPPER} strokeWidth={4} />
      <rect x={140} y={80} width={22} height={220} fill={PANEL} stroke={INK} strokeWidth={3} />
      {holes.map((h) => (
        <rect key={h} x={140} y={h - 4} width={22} height={8} fill={BG} stroke={INK} strokeWidth={1.5} />
      ))}
      <Label x={90} y={40} size={20}>ไดอะแฟรม</Label>
      <Label x={176} y={66} size={20}>แผ่นหลัง</Label>
      <line x1={100} y1={322} x2={140} y2={322} stroke={INK} strokeWidth={2} />
      <line x1={100} y1={312} x2={100} y2={332} stroke={INK} strokeWidth={2} />
      <line x1={140} y1={312} x2={140} y2={332} stroke={INK} strokeWidth={2} />
      <Label x={120} y={346} size={20}>d</Label>
      <Label x={120} y={390} size={22} weight={700}>C = εA/d</Label>
      <line x1={238} y1={30} x2={238} y2={400} stroke={GRID} strokeWidth={2} strokeDasharray="6 6" />
      {/* electret bias circuit */}
      <Terminal x={450} y={56} />
      <Label x={470} y={56} anchor="start" size={20}>+V 1.5–10 V</Label>
      <Wire points={[[450, 62], [450, 70]]} />
      <Resistor x={450} y={110} angle={90} label="R" value="2.2 kΩ" />
      <Wire points={[[450, 150], [450, 210], [424, 210]]} />
      <Node x={450} y={170} />
      <Wire points={[[450, 170], [480, 170]]} />
      <Capacitor x={510} y={170} />
      <Wire points={[[540, 170], [566, 170]]} />
      <Terminal x={572} y={170} />
      <Label x={572} y={200} size={20}>OUT</Label>
      {/* JFET (n-channel) */}
      <line x1={420} y1={200} x2={420} y2={260} stroke={INK} strokeWidth={4} />
      <Wire points={[[420, 250], [450, 250], [450, 312]]} />
      <line x1={420} y1={210} x2={424} y2={210} stroke={INK} strokeWidth={3} />
      <line x1={366} y1={230} x2={418} y2={230} stroke={INK} strokeWidth={3} />
      <path d="M 418 230 L 406 224 L 406 236 Z" fill={INK} />
      <Label x={437} y={196} size={20} muted>D</Label>
      <Label x={437} y={268} size={20} muted>S</Label>
      <Label x={384} y={248} size={20} muted>G</Label>
      {/* capsule capacitance */}
      <Wire points={[[366, 230], [350, 230], [350, 240]]} />
      <Capacitor x={350} y={270} angle={90} />
      <Wire points={[[350, 300], [350, 312], [450, 312]]} />
      <Ground x={400} y={312} />
      <rect x={312} y={186} width={168} height={170} rx={10} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="8 6" />
      <Label x={396} y={380} size={20}>แคปซูล ECM (มี JFET ในตัว)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 — polar patterns
function polarPath(cx: number, cy: number, R: number, a: number) {
  let d = "";
  for (let deg = 0; deg <= 360; deg += 2) {
    const t = (deg * Math.PI) / 180;
    const r = Math.abs(a + (1 - a) * Math.cos(t)) * R;
    const x = cx + r * Math.sin(t);
    const y = cy - r * Math.cos(t);
    d += (deg === 0 ? "M " : " L ") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + " Z";
}

function PolarPanel({ ox, oy, a, title, note }: { ox: number; oy: number; a: number; title: string; note: string }) {
  const cx = ox + 150;
  const cy = oy + 165;
  const R = 100;
  return (
    <g>
      <Label x={cx} y={oy + 22} size={22} weight={700}>
        {title}
      </Label>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={GRID} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={R / 2} fill="none" stroke={GRID} strokeWidth={1.5} strokeDasharray="5 5" />
      {[0, 45, 90, 135].map((g) => {
        const t = (g * Math.PI) / 180;
        return (
          <line
            key={g}
            x1={cx - R * Math.sin(t)}
            y1={cy + R * Math.cos(t)}
            x2={cx + R * Math.sin(t)}
            y2={cy - R * Math.cos(t)}
            stroke={GRID}
            strokeWidth={1.5}
          />
        );
      })}
      <path d={polarPath(cx, cy, R, a)} fill={ACC_SOFT} fillOpacity={0.6} stroke={ACC} strokeWidth={3} />
      <circle cx={cx} cy={cy} r={5} fill={INK} />
      <Label x={cx} y={cy - R - 14} size={20} muted>
        0°
      </Label>
      <Label x={cx} y={cy + R + 16} size={20} muted>
        180°
      </Label>
      <Label x={cx} y={oy + 300} size={20}>
        {note}
      </Label>
    </g>
  );
}

function PolarPatterns() {
  return (
    <svg viewBox="0 0 600 620" aria-hidden="true">
      <PolarPanel ox={0} oy={0} a={1} title="รอบทิศทาง (omni)" note="รับเท่ากันทุกทิศ" />
      <PolarPanel ox={300} oy={0} a={0.5} title="คาร์ดิออยด์" note="−6 dB ที่ 90° · null 180°" />
      <PolarPanel ox={0} oy={310} a={0.37} title="ซูเปอร์คาร์ดิออยด์" note="null ≈ 126° · หลัง ≈ −12 dB" />
      <PolarPanel ox={300} oy={310} a={0} title="ฟิกเกอร์-8" note="null ที่ 90° และ 270°" />
      <line x1={300} y1={20} x2={300} y2={600} stroke={GRID} strokeWidth={1.5} />
      <line x1={10} y1={308} x2={590} y2={308} stroke={GRID} strokeWidth={1.5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 — connectors: XLR 3-pin and phone jacks
function Plug({ y, trs }: { y: number; trs: boolean }) {
  return (
    <g>
      <rect x={30} y={y - 22} width={100} height={44} rx={8} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={130} y={y - 12} width={trs ? 150 : 180} height={24} fill={BG} stroke={INK} strokeWidth={3} />
      {trs ? (
        <g>
          <rect x={280} y={y - 12} width={8} height={24} fill={INK} />
          <rect x={288} y={y - 12} width={40} height={24} fill={BG} stroke={INK} strokeWidth={3} />
          <rect x={328} y={y - 12} width={8} height={24} fill={INK} />
        </g>
      ) : (
        <rect x={310} y={y - 12} width={8} height={24} fill={INK} />
      )}
      <path d={`M 336 ${y - 12} L 362 ${y - 12} Q 380 ${y} 362 ${y + 12} L 336 ${y + 12} Z`} fill={BG} stroke={INK} strokeWidth={3} />
      {trs ? null : null}
      <Label x={205} y={y + 32} size={20} muted>
        S
      </Label>
      {trs ? (
        <Label x={308} y={y + 32} size={20} muted>
          R
        </Label>
      ) : null}
      <Label x={356} y={y + 32} size={20} muted>
        T
      </Label>
    </g>
  );
}

function Connectors() {
  const pins: [number, number, string][] = [
    [96, 112, "1"],
    [144, 112, "2"],
    [120, 168, "3"],
  ];
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      <circle cx={120} cy={130} r={78} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={110} y={44} width={20} height={14} fill={INK} />
      {pins.map(([x, y, n]) => (
        <g key={n}>
          <circle cx={x} cy={y} r={14} fill={BG} stroke={INK} strokeWidth={3} />
          <Label x={x} y={y + 1} size={20} weight={700}>
            {n}
          </Label>
        </g>
      ))}
      <Label x={120} y={234} size={22} weight={700}>XLR 3 ขา</Label>
      <Label x={240} y={70} anchor="start" size={22}>ขา 1 = กราวด์ / ชีลด์</Label>
      <Label x={240} y={112} anchor="start" size={22}>ขา 2 = hot (+)</Label>
      <Label x={240} y={154} anchor="start" size={22}>ขา 3 = cold (−)</Label>
      <Label x={240} y={196} anchor="start" size={20} muted>สมดุล (balanced) · สายยาวได้</Label>
      <Plug y={290} trs={false} />
      <Plug y={380} trs />
      <Label x={400} y={278} anchor="start" size={22} weight={700}>TS</Label>
      <Label x={400} y={304} anchor="start" size={20}>ไม่สมดุล</Label>
      <Label x={400} y={368} anchor="start" size={22} weight={700}>TRS</Label>
      <Label x={400} y={394} anchor="start" size={20}>สมดุล/สเตอริโอ</Label>
      <Label x={300} y={452} size={20} muted>แจ็ก 6.35 mm และ 3.5 mm ใช้หลักเดียวกัน</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 — dynamic loudspeaker cross-section with magnetic flux path
function SpeakerSection() {
  return (
    <svg viewBox="0 0 600 460" aria-hidden="true">
      <defs>
        <pattern id="w12f06-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={MUTED} strokeWidth="2" />
        </pattern>
      </defs>
      <style>{`.w12f06-flux{stroke-dasharray:10 8;animation:w12f06-move 2.4s linear infinite}@keyframes w12f06-move{to{stroke-dashoffset:-36}}`}</style>
      {/* basket (frame) */}
      <path d="M 200 120 L 262 108 L 480 48" fill="none" stroke={MUTED} strokeWidth={2.5} strokeDasharray="10 6" />
      <path d="M 200 340 L 262 352 L 480 412" fill="none" stroke={MUTED} strokeWidth={2.5} strokeDasharray="10 6" />
      {/* back plate + pole piece (one T-shaped soft-iron part) */}
      <rect x={60} y={120} width={26} height={220} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={86} y={204} width={118} height={52} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* magnet ring */}
      <rect x={86} y={120} width={64} height={62} fill="url(#w12f06-hatch)" stroke={INK} strokeWidth={3} />
      <rect x={86} y={278} width={64} height={62} fill="url(#w12f06-hatch)" stroke={INK} strokeWidth={3} />
      <Label x={100} y={151} size={20} weight={700}>S</Label>
      <Label x={136} y={151} size={20} weight={700}>N</Label>
      <Label x={100} y={309} size={20} weight={700}>S</Label>
      <Label x={136} y={309} size={20} weight={700}>N</Label>
      {/* top plate */}
      <rect x={150} y={120} width={50} height={70} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={150} y={270} width={50} height={70} fill={PANEL} stroke={INK} strokeWidth={3} />
      {/* voice coil in gap + former */}
      <rect x={160} y={193} width={44} height={8} fill={COPPER} stroke={INK} strokeWidth={1.5} />
      <rect x={160} y={259} width={44} height={8} fill={COPPER} stroke={INK} strokeWidth={1.5} />
      <line x1={204} y1={197} x2={236} y2={197} stroke={INK} strokeWidth={2} />
      <line x1={204} y1={263} x2={236} y2={263} stroke={INK} strokeWidth={2} />
      {/* spider */}
      <path d="M 244 197 L 236 186 L 252 174 L 236 162 L 252 150 L 236 138 L 252 126 L 246 114" fill="none" stroke={INK} strokeWidth={2.5} />
      <path d="M 244 263 L 236 274 L 252 286 L 236 298 L 252 310 L 236 322 L 252 334 L 246 346" fill="none" stroke={INK} strokeWidth={2.5} />
      {/* cone */}
      <line x1={236} y1={197} x2={462} y2={66} stroke={INK} strokeWidth={4} />
      <line x1={236} y1={263} x2={462} y2={394} stroke={INK} strokeWidth={4} />
      {/* dust cap */}
      <path d="M 238 197 Q 290 230 238 263" fill="none" stroke={INK} strokeWidth={3} />
      {/* surround */}
      <path d="M 462 66 Q 482 40 484 56" fill="none" stroke={INK} strokeWidth={4} />
      <path d="M 462 394 Q 482 420 484 404" fill="none" stroke={INK} strokeWidth={4} />
      {/* flux path (upper half) */}
      <path
        className="w12f06-flux"
        d="M 140 150 L 178 150 L 178 230 L 74 230 L 74 150 L 96 150"
        fill="none"
        stroke={FIELD}
        strokeWidth={3}
      />
      <path d="M 178 214 l -6 -12 l 12 0 z" fill={FIELD} />
      <path d="M 74 166 l -6 12 l 12 0 z" fill={FIELD} />
      {/* labels */}
      <Label x={70} y={24} size={20}>Back plate</Label>
      <line x1={70} y1={38} x2={70} y2={120} stroke={MUTED} strokeWidth={1.5} />
      <Label x={190} y={24} size={20}>Top plate</Label>
      <line x1={186} y1={38} x2={180} y2={120} stroke={MUTED} strokeWidth={1.5} />
      <Label x={320} y={70} size={20}>สไปเดอร์</Label>
      <line x1={290} y1={80} x2={252} y2={128} stroke={MUTED} strokeWidth={1.5} />
      <Label x={540} y={60} size={20}>ขอบ</Label>
      <Label x={360} y={230} size={20}>กรวย (cone)</Label>
      <line x1={360} y1={216} x2={360} y2={142} stroke={MUTED} strokeWidth={1.5} />
      <Label x={100} y={380} size={20}>แม่เหล็ก</Label>
      <line x1={110} y1={366} x2={118} y2={340} stroke={MUTED} strokeWidth={1.5} />
      <Label x={110} y={420} size={20}>Pole piece</Label>
      <line x1={140} y1={406} x2={150} y2={256} stroke={MUTED} strokeWidth={1.5} />
      <Label x={290} y={420} size={20}>วอยซ์คอยล์</Label>
      <line x1={270} y1={406} x2={186} y2={268} stroke={MUTED} strokeWidth={1.5} />
      <Label x={480} y={446} size={20} color={FIELD}>- - เส้นทางฟลักซ์</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 — enclosures and horn
function DriverSide({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  // cone driver seen from the side, mounted at (x, y), radiating to the right
  return (
    <g>
      <rect x={x - 14 * s} y={y - 12 * s} width={14 * s} height={24 * s} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <path d={`M ${x} ${y - 10 * s} L ${x + 18 * s} ${y - 40 * s} M ${x} ${y + 10 * s} L ${x + 18 * s} ${y + 40 * s}`} stroke={INK} strokeWidth={3} />
    </g>
  );
}

function Enclosures() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      {/* sealed */}
      <Label x={100} y={26} size={22} weight={700}>ตู้ปิด (sealed)</Label>
      <rect x={20} y={60} width={150} height={200} fill="none" stroke={INK} strokeWidth={4} />
      <DriverSide x={152} y={160} />
      <SoundArcs x={180} y={160} n={2} />
      <Label x={100} y={290} size={20}>เบสกระชับ</Label>
      <Label x={100} y={318} size={20} muted>ปิดสนิท</Label>
      {/* bass reflex */}
      <Label x={300} y={26} size={22} weight={700}>เบสรีเฟล็กซ์</Label>
      <rect x={220} y={60} width={150} height={200} fill="none" stroke={INK} strokeWidth={4} />
      <DriverSide x={352} y={130} />
      <line x1={370} y1={214} x2={320} y2={214} stroke={INK} strokeWidth={3} />
      <line x1={370} y1={238} x2={320} y2={238} stroke={INK} strokeWidth={3} />
      <rect x={366} y={216} width={8} height={20} fill={BG} />
      <Arrow from={[330, 226]} to={[398, 226]} color={ACC} width={2.5} head={10} />
      <Label x={300} y={290} size={20}>มีท่อ (port)</Label>
      <Label x={300} y={318} size={20} muted>เบสลึกขึ้น</Label>
      {/* horn */}
      <Label x={500} y={26} size={22} weight={700}>ฮอร์น</Label>
      <rect x={414} y={140} width={34} height={40} fill={PANEL} stroke={INK} strokeWidth={3} />
      <path d="M 448 150 L 470 150 Q 540 140 590 76 M 448 170 L 470 170 Q 540 180 590 244" fill="none" stroke={INK} strokeWidth={4} />
      <Label x={432} y={110} size={20}>ไดรเวอร์</Label>
      <Label x={500} y={290} size={20}>ดัง ไปไกล</Label>
      <Label x={500} y={318} size={20} muted>ย่านแคบ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 — first-order crossover + response
function Crossover() {
  const fc = 2.9e3;
  const fx = (f: number) => 70 + (490 * Math.log10(f / 100)) / Math.log10(200);
  const dy = (db: number) => 360 + (-db / 24) * 110;
  const curve = (hp: boolean) => {
    let d = "";
    for (let i = 0; i <= 80; i++) {
      const f = 100 * Math.pow(200, i / 80);
      const r = f / fc;
      const mag = hp ? r / Math.sqrt(1 + r * r) : 1 / Math.sqrt(1 + r * r);
      const db = Math.max(20 * Math.log10(mag), -24);
      d += (i === 0 ? "M " : " L ") + fx(f).toFixed(1) + " " + dy(db).toFixed(1);
    }
    return d;
  };
  return (
    <svg viewBox="0 0 600 530" aria-hidden="true">
      {/* circuit */}
      <ACSource x={70} y={160} angle={90} />
      <Label x={102} y={160} anchor="start" size={20}>เครื่องขยาย</Label>
      <Wire points={[[70, 120], [70, 50], [420, 50], [420, 70]]} />
      <Wire points={[[70, 200], [70, 210]]} />
      <Wire points={[[230, 50], [230, 80]]} />
      <Node x={230} y={50} />
      <Capacitor x={230} y={110} angle={90} label="C" value="6.8 µF" />
      <Wire points={[[230, 140], [230, 170]]} />
      <Spk x={230} y={200} />
      <Inductor x={420} y={110} angle={90} label="L" value="0.43 mH" />
      <Wire points={[[420, 150], [420, 170]]} />
      <Spk x={420} y={200} />
      <Wire points={[[230, 230], [230, 262], [420, 262], [420, 230]]} />
      <Node x={230} y={262} />
      <Wire points={[[70, 210], [70, 262], [230, 262]]} />
      <Label x={240} y={292} size={20}>ทวีตเตอร์ 8 Ω</Label>
      <Label x={430} y={292} size={20}>วูฟเฟอร์ 8 Ω</Label>
      {/* response */}
      <line x1={70} y1={360} x2={560} y2={360} stroke={GRID} strokeWidth={1.5} />
      <line x1={70} y1={dy(-3)} x2={560} y2={dy(-3)} stroke={GRID} strokeWidth={1.5} strokeDasharray="5 5" />
      <line x1={70} y1={342} x2={70} y2={476} stroke={INK} strokeWidth={2} />
      <line x1={70} y1={476} x2={560} y2={476} stroke={INK} strokeWidth={2} />
      <line x1={fx(fc)} y1={342} x2={fx(fc)} y2={476} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" />
      <path d={curve(false)} fill="none" stroke={ACC} strokeWidth={3} />
      <path d={curve(true)} fill="none" stroke={ACC} strokeWidth={3} strokeDasharray="10 6" />
      <Label x={60} y={358} anchor="end" size={20} muted>0</Label>
      <Label x={60} y={dy(-3) + 8} anchor="end" size={20} muted>−3</Label>
      <Label x={60} y={468} anchor="end" size={20} muted>dB</Label>
      <Label x={80} y={330} anchor="start" size={20}>── วูฟเฟอร์ (ผ่านต่ำ)</Label>
      <Label x={560} y={330} anchor="end" size={20}>- - ทวีตเตอร์ (ผ่านสูง)</Label>
      <Label x={fx(fc)} y={502} size={20}>fc ≈ 2.9 kHz</Label>
      <Label x={fx(100) + 10} y={502} anchor="start" size={20} muted>100 Hz</Label>
      <Label x={fx(20000)} y={502} anchor="end" size={20} muted>20 kHz</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 — impedance curve of an 8 Ω woofer
function ImpedanceCurve() {
  const Re = 6.4;
  const Le = 0.2e-3;
  const Res = 28;
  const Qms = 4;
  const fs = 60;
  const zmag = (f: number) => {
    const w = 2 * Math.PI * f;
    const x = Qms * (f / fs - fs / f);
    // motional: Res / (1 + jx)
    const den = 1 + x * x;
    const mr = Res / den;
    const mi = (-Res * x) / den;
    const re = Re + mr;
    const im = w * Le + mi;
    return Math.hypot(re, im);
  };
  const fx = (f: number) => 70 + (500 * Math.log10(f / 10)) / Math.log10(2000);
  const zy = (z: number) => 320 - (z / 40) * 270;
  let d = "";
  for (let i = 0; i <= 200; i++) {
    const f = 10 * Math.pow(2000, i / 200);
    d += (i === 0 ? "M " : " L ") + fx(f).toFixed(1) + " " + zy(zmag(f)).toFixed(1);
  }
  const ticks: [number, string][] = [
    [10, "10"],
    [100, "100"],
    [1000, "1k"],
    [10000, "10k"],
  ];
  return (
    <svg viewBox="0 0 600 390" aria-hidden="true">
      {[10, 20, 30, 40].map((z) => (
        <g key={z}>
          <line x1={70} y1={zy(z)} x2={570} y2={zy(z)} stroke={GRID} strokeWidth={1.5} />
          <Label x={60} y={zy(z)} anchor="end" size={20} muted>
            {z}
          </Label>
        </g>
      ))}
      {ticks.map(([f, t]) => (
        <g key={f}>
          <line x1={fx(f)} y1={320} x2={fx(f)} y2={328} stroke={INK} strokeWidth={2} />
          <Label x={fx(f)} y={344} size={20} muted>
            {t}
          </Label>
        </g>
      ))}
      <line x1={70} y1={40} x2={70} y2={320} stroke={INK} strokeWidth={2} />
      <line x1={70} y1={320} x2={570} y2={320} stroke={INK} strokeWidth={2} />
      <line x1={70} y1={zy(8)} x2={570} y2={zy(8)} stroke={OK} strokeWidth={2} strokeDasharray="8 6" />
      <line x1={70} y1={zy(6.4)} x2={570} y2={zy(6.4)} stroke={MUTED} strokeWidth={2} strokeDasharray="3 5" />
      <path d={d} fill="none" stroke={ACC} strokeWidth={3} />
      <Label x={20} y={22} anchor="start" size={20}>|Z| (Ω)</Label>
      <Label x={570} y={372} anchor="end" size={20}>ความถี่ f (Hz)</Label>
      <Label x={fx(60) + 14} y={zy(34) - 6} anchor="start" size={20}>ยอดที่ fs ≈ 60 Hz</Label>
      <Label x={330} y={zy(8) - 16} anchor="start" size={20} color={OK}>
        8 Ω = ค่าระบุ (nominal)
      </Label>
      <Label x={330} y={zy(6.4) + 18} anchor="start" size={20} muted>
        Re = 6.4 Ω (DC)
      </Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 — series / parallel / series-parallel
function AmpTerms({ x, top, bottom }: { x: number; top: number; bottom: number }) {
  return (
    <g>
      <Terminal x={x} y={top} />
      <Terminal x={x} y={bottom} />
      <Label x={x - 2} y={top - 22} size={20} weight={700} color={PLUS}>
        +
      </Label>
      <Label x={x - 2} y={bottom + 22} size={20} weight={700}>
        −
      </Label>
    </g>
  );
}

function SpeakerConnections() {
  return (
    <svg viewBox="0 0 600 350" aria-hidden="true">
      <line x1={200} y1={10} x2={200} y2={320} stroke={GRID} strokeWidth={1.5} />
      <line x1={400} y1={10} x2={400} y2={320} stroke={GRID} strokeWidth={1.5} />
      {/* series */}
      <Label x={100} y={24} size={22} weight={700}>อนุกรม</Label>
      <AmpTerms x={30} top={70} bottom={240} />
      <Wire points={[[36, 70], [100, 70], [100, 85]]} />
      <Wire points={[[100, 145], [100, 165]]} />
      <Wire points={[[36, 240], [100, 240], [100, 225]]} />
      <Spk x={100} y={115} />
      <Spk x={100} y={195} />
      <Label x={100} y={278} size={22} weight={700}>Z = 16 Ω</Label>
      <Label x={100} y={308} size={20} muted>8 + 8</Label>
      {/* parallel */}
      <Label x={300} y={24} size={22} weight={700}>ขนาน</Label>
      <AmpTerms x={230} top={70} bottom={240} />
      <Wire points={[[236, 70], [350, 70], [350, 125]]} />
      <Wire points={[[280, 70], [280, 125]]} />
      <Wire points={[[236, 240], [350, 240], [350, 185]]} />
      <Wire points={[[280, 240], [280, 185]]} />
      <Node x={280} y={70} />
      <Node x={280} y={240} />
      <Spk x={280} y={155} />
      <Spk x={350} y={155} />
      <Label x={300} y={278} size={22} weight={700}>Z = 4 Ω</Label>
      <Label x={300} y={308} size={20} muted>(8 × 8)/(8 + 8)</Label>
      {/* series-parallel */}
      <Label x={500} y={24} size={22} weight={700}>อนุกรม-ขนาน</Label>
      <AmpTerms x={430} top={70} bottom={240} />
      <Wire points={[[436, 70], [545, 70], [545, 85]]} />
      <Wire points={[[475, 70], [475, 85]]} />
      <Wire points={[[436, 240], [545, 240], [545, 225]]} />
      <Wire points={[[475, 240], [475, 225]]} />
      <Wire points={[[475, 145], [475, 165]]} />
      <Wire points={[[545, 145], [545, 165]]} />
      <Node x={475} y={70} />
      <Node x={475} y={240} />
      <Spk x={475} y={115} />
      <Spk x={475} y={195} />
      <Spk x={545} y={115} />
      <Spk x={545} y={195} />
      <Label x={500} y={278} size={22} weight={700}>Z = 8 Ω</Label>
      <Label x={500} y={308} size={20} muted>(8+8) ∥ (8+8)</Label>
      <Label x={300} y={338} size={20} muted>ลำโพงทุกตัว 8 Ω · ต่อ + ไป + ตรงเฟส</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 — find-fault: four speaker hook-ups
function FaultPanel({ px, py, tag, children, note }: { px: number; py: number; tag: string; children: ReactNode; note: string }) {
  return (
    <g>
      <rect x={px + 6} y={py} width={288} height={240} rx={12} fill="none" stroke={GRID} strokeWidth={2} />
      <Label x={px + 26} y={py + 26} size={22} weight={700}>
        {tag}
      </Label>
      <AmpTerms x={px + 40} top={py + 70} bottom={py + 190} />
      {children}
      <Label x={px + 150} y={py + 222} size={20} muted>
        {note}
      </Label>
    </g>
  );
}

function ParallelSet({ px, py, xs, rev = [] as number[], scale = 1 }: { px: number; py: number; xs: number[]; rev?: number[]; scale?: number }) {
  const top = py + 70;
  const bot = py + 190;
  const last = xs[xs.length - 1];
  return (
    <g>
      <Wire points={[[px + 46, top], [px + last, top]]} />
      <Wire points={[[px + 46, bot], [px + last, bot]]} />
      {xs.map((x, i) => (
        <g key={x}>
          <Wire points={[[px + x, top], [px + x, py + 130 - 30 * scale]]} />
          <Wire points={[[px + x, bot], [px + x, py + 130 + 30 * scale]]} />
          {i < xs.length - 1 ? <Node x={px + x} y={top} /> : null}
          {i < xs.length - 1 ? <Node x={px + x} y={bot} /> : null}
          <Spk x={px + x} y={py + 130} rev={rev.includes(i)} scale={scale} />
        </g>
      ))}
    </g>
  );
}

function FaultHookups() {
  return (
    <svg viewBox="0 0 600 540" aria-hidden="true">
      <Label x={300} y={22} size={22}>เครื่องขยายทุกชุด: ลำโพงรวมต้อง ≥ 4 Ω</Label>
      <FaultPanel px={0} py={44} tag="ก" note="ลำโพง 8 Ω ทั้ง 4 ตัว">
        <ParallelSet px={0} py={44} xs={[84, 134, 184, 234]} scale={0.7} />
      </FaultPanel>
      <FaultPanel px={300} py={44} tag="ข" note="ลำโพง 8 Ω ทั้ง 2 ตัว">
        <ParallelSet px={300} py={44} xs={[110, 200]} rev={[1]} />
      </FaultPanel>
      <FaultPanel px={0} py={294} tag="ค" note="ลำโพง 8 Ω + 4 Ω">
        <Wire points={[[46, 364], [130, 364]]} />
        <Wire points={[[46, 484], [130, 484]]} />
        <Wire points={[[130, 364], [130, 372]]} />
        <Wire points={[[130, 416], [130, 432]]} />
        <Wire points={[[130, 476], [130, 484]]} />
        <Spk x={130} y={394} label="8 Ω" scale={0.75} />
        <Spk x={130} y={454} label="4 Ω" scale={0.75} />
      </FaultPanel>
      <FaultPanel px={300} py={294} tag="ง" note="ลำโพง 8 Ω ทั้ง 2 ตัว">
        <ParallelSet px={300} py={294} xs={[110, 200]} />
      </FaultPanel>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 — acoustic feedback and placement (top view)
function TopSpeaker({ x, y, dir }: { x: number; y: number; dir: "up" | "down" }) {
  // box with thick front edge facing `dir`
  const front = dir === "up" ? y - 16 : y + 16;
  return (
    <g>
      <rect x={x - 30} y={y - 16} width={60} height={32} rx={4} fill={PANEL} stroke={INK} strokeWidth={3} />
      <line x1={x - 30} y1={front} x2={x + 30} y2={front} stroke={INK} strokeWidth={7} />
    </g>
  );
}

function TopMic({ x, y }: { x: number; y: number }) {
  // capsule head (front = up) and handle down
  return (
    <g>
      <line x1={x} y1={y + 10} x2={x} y2={y + 40} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <circle cx={x} cy={y} r={11} fill={BG} stroke={INK} strokeWidth={3} />
    </g>
  );
}

function Talker({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={18} fill="var(--fig-skin)" stroke={INK} strokeWidth={2.5} />
      <path d={`M ${x - 6} ${y + 18} L ${x} ${y + 26} L ${x + 6} ${y + 18}`} fill="none" stroke={INK} strokeWidth={2.5} />
    </g>
  );
}

function FeedbackPlacement() {
  const cardioid = (cx: number, cy: number) => polarPath(cx, cy, 60, 0.5);
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      <line x1={300} y1={10} x2={300} y2={340} stroke={GRID} strokeWidth={1.5} />
      {/* wrong */}
      <Label x={150} y={24} size={22} weight={700} color={DANGER}>✗ เกิดเสียงหอน</Label>
      <TopSpeaker x={150} y={66} dir="down" />
      <Talker x={150} y={130} />
      <path d={cardioid(150, 200)} fill={ACC_SOFT} fillOpacity={0.5} stroke={ACC} strokeWidth={2} strokeDasharray="6 4" />
      <TopMic x={150} y={180} />
      <path d="M 186 72 C 260 100 250 170 168 176" fill="none" stroke={DANGER} strokeWidth={3} strokeDasharray="8 6" />
      <path d="M 168 176 l 12 -9 l 2 12 z" fill={DANGER} />
      <Label x={150} y={300} size={20}>ลำโพงอยู่หลังผู้พูด</Label>
      <Label x={150} y={326} size={20}>หันเข้าด้านหน้าไมค์</Label>
      {/* right */}
      <Label x={450} y={24} size={22} weight={700} color={OK}>✓ วางถูกตำแหน่ง</Label>
      <Talker x={450} y={110} />
      <path d={cardioid(450, 180)} fill={ACC_SOFT} fillOpacity={0.5} stroke={ACC} strokeWidth={2} strokeDasharray="6 4" />
      <TopMic x={450} y={160} />
      <TopSpeaker x={450} y={258} dir="up" />
      <TopSpeaker x={350} y={214} dir="down" />
      <TopSpeaker x={550} y={214} dir="down" />
      <Label x={450} y={302} size={20}>มอนิเตอร์อยู่ที่ 180°</Label>
      <Label x={450} y={326} size={20} muted>ลำโพงหลักหันไปทางผู้ฟัง</Label>
      {/* loop */}
      <Callout x={20} y={350} w={560} h={66} tone="warn">
        <Label x={300} y={383} size={20}>
          วงป้อนกลับ: ไมค์ → เครื่องขยาย → ลำโพง → ย้อนเข้าไมค์
        </Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 — NIOSH exposure limits
function NoiseLimits() {
  const rows: [number, number, string][] = [
    [85, 480, "8 ชม."],
    [88, 240, "4 ชม."],
    [91, 120, "2 ชม."],
    [94, 60, "1 ชม."],
    [97, 30, "30 นาที"],
    [100, 15, "15 นาที"],
  ];
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Label x={300} y={24} size={22} weight={700}>เวลาฟังสูงสุดต่อวัน (เกณฑ์ NIOSH)</Label>
      {rows.map(([db, min, t], i) => {
        const y = 70 + i * 46;
        const w = (min / 480) * 330;
        return (
          <g key={db}>
            <Label x={20} y={y} anchor="start" size={22}>
              {db} dB(A)
            </Label>
            <rect x={150} y={y - 14} width={w} height={28} rx={4} fill={i < 2 ? WARN : DANGER} />
            <Label x={160 + w} y={y} anchor="start" size={22}>
              {t}
            </Label>
          </g>
        );
      })}
      <Label x={300} y={350} size={20}>ทุก +3 dB → เวลาที่ปลอดภัยลดลงครึ่งหนึ่ง</Label>
      <Label x={300} y={382} size={20} muted>ห้องปฏิบัติการ: ตั้งเป้าไม่เกิน 85 dB(A)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F15 — checking a speaker: R_e with DMM, polarity with 1.5 V cell
function SpeakerTesting() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <line x1={300} y1={10} x2={300} y2={370} stroke={GRID} strokeWidth={1.5} />
      {/* DMM */}
      <Label x={150} y={24} size={22} weight={700}>วัด Rₑ ด้วย DMM</Label>
      <rect x={30} y={60} width={110} height={150} rx={12} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={44} y={76} width={82} height={44} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={85} y={99} size={22} weight={700}>6.4 Ω</Label>
      <Label x={85} y={150} size={20}>Ω</Label>
      <circle cx={60} cy={188} r={7} fill={PLUS} />
      <circle cx={110} cy={188} r={7} fill={INK} />
      <path d="M 60 195 C 60 260 180 250 210 150" fill="none" stroke={PLUS} strokeWidth={3} />
      <path d="M 110 195 C 110 300 200 290 210 210" fill="none" stroke={INK} strokeWidth={3} />
      <Spk x={210} y={180} />
      <Label x={150} y={318} size={20}>ลำโพง 8 Ω → Rₑ ≈ 6–7 Ω</Label>
      <Label x={150} y={346} size={20} muted>∞ = ขาด · ≈ 0 Ω = ช็อต</Label>
      {/* battery polarity test */}
      <Label x={450} y={24} size={22} weight={700}>หาขั้วด้วยถ่าน 1.5 V</Label>
      <line x1={340} y1={100} x2={340} y2={142} stroke={PLUS} strokeWidth={3} />
      <line x1={326} y1={142} x2={354} y2={142} stroke={PLUS} strokeWidth={3} />
      <line x1={333} y1={152} x2={347} y2={152} stroke={INK} strokeWidth={5} />
      <line x1={340} y1={152} x2={340} y2={260} stroke={INK} strokeWidth={3} />
      <Label x={318} y={130} size={20} weight={700} color={PLUS}>+</Label>
      <Label x={352} y={126} anchor="start" size={20}>1.5 V</Label>
      <Wire points={[[340, 100], [420, 100], [420, 118]]} color={PLUS} />
      <Wire points={[[340, 260], [420, 260], [420, 242]]} />
      <Spk x={420} y={180} scale={1.8} />
      <Arrow from={[490, 180]} to={[560, 180]} color={ACC} />
      <Label x={525} y={150} size={20}>กรวยออก</Label>
      <Label x={450} y={300} size={20}>แตะชั่วขณะ · วูฟเฟอร์เท่านั้น</Label>
      <Label x={450} y={330} size={20} muted>ขั้วที่ต่อ + ถ่าน = ขั้ว +</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W12-F01": SoundWave,
  "W12-F02": DynamicMic,
  "W12-F03": CondenserMic,
  "W12-F04": PolarPatterns,
  "W12-F05": Connectors,
  "W12-F06": SpeakerSection,
  "W12-F07": Enclosures,
  "W12-F08": Crossover,
  "W12-F09": ImpedanceCurve,
  "W12-F10": SpeakerConnections,
  "W12-F11": FeedbackPlacement,
  "W12-F12": NoiseLimits,
  "W12-F13": FaultHookups,
  "W12-F14": EnergyChain,
  "W12-F15": SpeakerTesting,
};
export default figures;
