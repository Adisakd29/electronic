/**
 * DC motor lab schematic (pure SVG, no hooks) — used by Lab.tsx (which
 * passes the animated rotor angle) and by previewStage for static PNG QA.
 */
import type { ReactNode } from "react";
import { formatSI } from "../shared/format";
import { bridgeModeText, CONTROL_V, statusText, toRpm, type MotorInputs, type MotorState } from "./model";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const LIVE = "var(--fig-current)";
const DANGER = "var(--fig-danger)";
const OK = "var(--fig-ok)";
const ACCENT = "var(--fig-accent)";

const FLOW_CSS = `
.mt-flow{stroke-dasharray:3 11;animation:mt-dash .9s linear infinite}
@keyframes mt-dash{to{stroke-dashoffset:-14}}
@media (prefers-reduced-motion: reduce){.mt-flow{animation:none}}
`;

function T({ x, y, children, size = 16, anchor = "middle", weight = 400, fill = INK }: { x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end"; weight?: number; fill?: string }) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill={fill}>
      {children}
    </text>
  );
}

function Wire({ d, live = false, color = LIVE }: { d: string; live?: boolean; color?: string }) {
  return (
    <g>
      <path d={d} fill="none" stroke={live ? color : INK} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {live ? <path d={d} fill="none" stroke="var(--fig-bg)" strokeWidth={2.5} className="mt-flow" strokeDasharray="3 11" /> : null}
    </g>
  );
}

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.5} fill={INK} />;
}

function Terminal({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={4} fill="var(--fig-bg)" stroke={INK} strokeWidth={2} />;
}

/** Vertical DC source, + (long plate) at yTop. */
function BatteryV({ x, yTop, label, labelSide = "right" }: { x: number; yTop: number; label: string; labelSide?: "left" | "right" }) {
  return (
    <g>
      <rect x={x - 18} y={yTop - 4} width={36} height={20} fill="var(--fig-bg)" />
      <line x1={x - 16} y1={yTop} x2={x + 16} y2={yTop} stroke={INK} strokeWidth={3} />
      <line x1={x - 8} y1={yTop + 10} x2={x + 8} y2={yTop + 10} stroke={INK} strokeWidth={5} />
      <T x={labelSide === "right" ? x - 22 : x + 22} y={yTop + 2} size={15} anchor={labelSide === "right" ? "end" : "start"} fill="var(--fig-plus)">
        +
      </T>
      <T x={labelSide === "right" ? x + 24 : x - 24} y={yTop + 12} size={16} anchor={labelSide === "right" ? "start" : "end"} weight={600}>
        {label}
      </T>
    </g>
  );
}

/** Horizontal switch contact x1→x2 (blade pivots at x1). */
function ContactH({ x1, x2, y, closed, live }: { x1: number; x2: number; y: number; closed: boolean; live?: boolean }) {
  const L = x2 - x1 - 4;
  const a = closed ? 0 : (-26 * Math.PI) / 180;
  return (
    <g>
      <line x1={x1} y1={y} x2={x1 + L * Math.cos(a)} y2={y + L * Math.sin(a)} stroke={live && closed ? LIVE : INK} strokeWidth={3} strokeLinecap="round" />
      <Terminal x={x1} y={y} />
      <Terminal x={x2} y={y} />
    </g>
  );
}

/** Vertical switch y1 (top) → y2 (bottom), blade pivots at the bottom. */
function ContactV({ x, y1, y2, closed, live, color = LIVE, flip = false }: { x: number; y1: number; y2: number; closed: boolean; live?: boolean; color?: string; flip?: boolean }) {
  const L = y2 - y1 - 4;
  const a = closed ? 0 : ((flip ? -28 : 28) * Math.PI) / 180;
  return (
    <g>
      <line x1={x} y1={y2} x2={x + L * Math.sin(a)} y2={y2 - L * Math.cos(a)} stroke={live && closed ? color : INK} strokeWidth={3} strokeLinecap="round" />
      <Terminal x={x} y={y1} />
      <Terminal x={x} y={y2} />
    </g>
  );
}

/** Horizontal push button: NO (bar above) or NC (bar touching from below). */
function PushButton({ x1, x2, y, nc, pressed, live }: { x1: number; x2: number; y: number; nc: boolean; pressed: boolean; live?: boolean }) {
  const closed = nc ? !pressed : pressed;
  const barY = nc ? (pressed ? y + 13 : y + 4) : pressed ? y - 4 : y - 13;
  const cx = (x1 + x2) / 2;
  const headY = barY - (nc ? 30 : 14);
  return (
    <g>
      <line x1={x1 - 2} y1={barY} x2={x2 + 2} y2={barY} stroke={live && closed ? LIVE : INK} strokeWidth={3} strokeLinecap="round" />
      <line x1={cx} y1={barY} x2={cx} y2={headY} stroke={INK} strokeWidth={2} strokeDasharray={nc ? "4 3" : undefined} />
      <line x1={cx - 9} y1={headY} x2={cx + 9} y2={headY} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Terminal x={x1} y={y} />
      <Terminal x={x2} y={y} />
    </g>
  );
}

/** Motor symbol with rotor spokes at `angle` (deg) and a direction arrow. */
function Motor({ cx, cy, r, angle, s, wNow }: { cx: number; cy: number; r: number; angle: number; s: MotorState; wNow: number }) {
  const spinning = Math.abs(wNow) > 0.5;
  const cw = wNow > 0;
  const ring = s.shortCircuit || s.overheat ? DANGER : s.braking ? ACCENT : s.direction !== "stop" ? OK : INK;
  // direction arc (outside the body)
  const R = r + 12;
  const a0 = (-150 * Math.PI) / 180;
  const a1 = (-30 * Math.PI) / 180;
  const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)];
  const p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
  const tip = cw ? p1 : p0;
  const tang = cw ? a1 + Math.PI / 2 : a0 - Math.PI / 2;
  const head = (dx: number, dy: number) => `${tip[0] + dx} ${tip[1] + dy}`;
  const hx = Math.cos(tang);
  const hy = Math.sin(tang);
  const nx = -hy;
  const ny = hx;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="var(--fig-bg)" stroke={ring} strokeWidth={3} />
      <g transform={`rotate(${angle.toFixed(2)} ${cx} ${cy})`}>
        {[0, 120, 240].map((a) => {
          const c = Math.cos((a * Math.PI) / 180);
          const sn = Math.sin((a * Math.PI) / 180);
          return <line key={a} x1={cx + c * r * 0.3} y1={cy + sn * r * 0.3} x2={cx + c * r * 0.8} y2={cy + sn * r * 0.8} stroke="var(--fig-copper)" strokeWidth={6} strokeLinecap="round" />;
        })}
        <circle cx={cx + r * 0.8} cy={cy} r={4} fill={DANGER} />
      </g>
      <circle cx={cx} cy={cy} r={r * 0.3} fill="var(--fig-panel)" stroke={INK} strokeWidth={2} />
      <T x={cx} y={cy + 6} size={17} weight={700}>
        M
      </T>
      {spinning ? (
        <g stroke={OK} fill={OK}>
          <path d={`M${p0[0]} ${p0[1]} A ${R} ${R} 0 0 1 ${p1[0]} ${p1[1]}`} fill="none" strokeWidth={3} />
          <path d={`M${head(hx * 12, hy * 12)} L${head(nx * 7, ny * 7)} L${head(-nx * 7, -ny * 7)} Z`} strokeWidth={1} />
        </g>
      ) : null}
    </g>
  );
}

function MotorStatus({ x, y, s, wNow }: { x: number; y: number; s: MotorState; wNow: number }) {
  const txt = statusText(s);
  const color = s.shortCircuit || s.overheat ? DANGER : s.braking ? ACCENT : s.direction !== "stop" ? OK : MUTED;
  const now = Math.abs(toRpm(wNow));
  return (
    <g>
      <T x={x} y={y} size={18} weight={700} fill={color}>
        {txt}
      </T>
      <T x={x} y={y + 22} size={15} fill={MUTED}>
        {`ขณะนี้ ≈ ${Math.round(now)} rpm`}
      </T>
      <T x={x} y={y + 42} size={15} fill={MUTED}>
        {`คงตัว ${Math.round(s.rpm)} rpm`}
      </T>
    </g>
  );
}

function Fuse({ x1, x2, y, blown }: { x1: number; x2: number; y: number; blown: boolean }) {
  const m = (x1 + x2) / 2;
  return (
    <g>
      <rect x={x1} y={y - 9} width={x2 - x1} height={18} rx={3} fill={blown ? "var(--fig-danger-soft)" : "var(--fig-bg)"} stroke={blown ? DANGER : INK} strokeWidth={2.5} />
      {blown ? (
        <g stroke={DANGER} strokeWidth={2.5}>
          <line x1={x1} y1={y} x2={m - 7} y2={y - 3} />
          <line x1={m + 7} y1={y + 3} x2={x2} y2={y} />
          <line x1={m - 6} y1={y - 16} x2={m + 6} y2={y - 4} />
          <line x1={m + 6} y1={y - 16} x2={m - 6} y2={y - 4} />
        </g>
      ) : (
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeWidth={2} />
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------

function PwmStage({ s, angle, wNow }: { s: MotorState; angle: number; wNow: number }) {
  const live = s.current > 1e-9;
  const mx = 400;
  const my = 190;
  return (
    <g>
      <T x={20} y={26} size={15} anchor="start" fill={MUTED}>
        ควบคุมความเร็วด้วย PWM (V_eff = D × V)
      </T>
      <Wire d="M60 170 V70 H150" live={live} />
      <Wire d={`M270 70 H${mx} V${my - 52}`} live={live} />
      <Wire d={`M${mx} ${my + 52} V330 H60 V180`} live={live} />
      <BatteryV x={60} yTop={170} label={formatSI(s.V, "V", 3)} />
      {/* PWM switch (MOSFET) */}
      <rect x={150} y={48} width={120} height={44} rx={4} fill="var(--fig-accent-soft)" stroke={ACCENT} strokeWidth={2.5} />
      <T x={210} y={68} size={15} weight={700} fill={ACCENT}>
        Q1 สวิตช์ PWM
      </T>
      <T x={210} y={86} size={14}>
        {`D = ${Math.round(s.duty * 100)} %`}
      </T>
      {/* freewheel diode across the motor, cathode to + */}
      <Wire d="M320 70 V180" />
      <Wire d="M320 214 V330" />
      <path d="M306 214 H334 L320 192 Z" fill={INK} />
      <line x1={305} y1={190} x2={335} y2={190} stroke={INK} strokeWidth={3} />
      <Dot x={320} y={70} />
      <Dot x={320} y={330} />
      <T x={300} y={208} size={14} anchor="end">D1</T>
      <T x={300} y={226} size={12} anchor="end" fill={MUTED}>ฟรีวีล</T>

      <Motor cx={mx} cy={my} r={52} angle={angle} s={s} wNow={wNow} />
      {/* shaft + load */}
      <line x1={mx + 52} y1={my} x2={mx + 110} y2={my} stroke={INK} strokeWidth={5} />
      <rect x={mx + 110} y={my - 28} width={90} height={56} rx={4} fill="var(--fig-panel)" stroke={INK} strokeWidth={2} />
      <T x={mx + 155} y={my - 6} size={15} weight={600}>ภาระ T_L</T>
      <T x={mx + 155} y={my + 16} size={15}>{`${formatSI(s.load, "N·m", 3)}`}</T>

      <MotorStatus x={540} y={276} s={s} wNow={wNow} />
      <T x={20} y={372} size={16} anchor="start" weight={600}>
        {`V_eff = ${formatSI(s.vEff, "V", 3)} · I = ${formatSI(s.current, "A", 3)} · E = ${formatSI(s.backEmf, "V", 3)}`}
      </T>
      {s.overheat ? (
        <T x={20} y={394} size={15} anchor="start" weight={700} fill={DANGER}>
          กระแสเกิน 3 A – ขดลวดร้อนเกิน!
        </T>
      ) : null}
    </g>
  );
}

function HBridgeStage({ s, inp, angle, wNow }: { s: MotorState; inp: MotorInputs; angle: number; wNow: number }) {
  const [s1, s2, s3, s4] = inp.switches;
  const L = 220;
  const R = 460;
  const top = 70;
  const bot = 350;
  const mid = 200;
  const mx = 340;
  const run = s.current > 1e-9 && !s.shortCircuit;
  const fwd = run && s.bridgeMode === "forward";
  const rev = run && s.bridgeMode === "reverse";
  // shoot-through flash: only while the offending switches are still closed
  const stL = s.bridgeMode === "shoot-through" && s1 && s2;
  const stR = s.bridgeMode === "shoot-through" && s3 && s4;
  const lit = (on: boolean, st: boolean) => (st ? { live: true, color: DANGER } : { live: on });

  return (
    <g>
      <T x={20} y={26} size={15} anchor="start" fill={MUTED}>
        H-bridge กลับทิศทางหมุน
      </T>
      {/* supply + fuse + rails */}
      <Wire d={`M60 ${mid - 10} V${top} H100`} {...lit(run, stL || stR)} />
      <Fuse x1={100} x2={160} y={top} blown={s.fuseBlown} />
      <T x={130} y={top - 22} size={14} fill={s.fuseBlown ? DANGER : INK} weight={s.fuseBlown ? 700 : 400}>
        {s.fuseBlown ? "ฟิวส์ขาด" : "ฟิวส์ F1"}
      </T>
      <Wire d={`M160 ${top} H${L}`} {...lit(run, stL || stR)} />
      <Wire d={`M${L} ${top} H${R}`} {...lit(rev, stR)} />
      <Dot x={L} y={top} />
      <Wire d={`M60 ${mid + 10} V${bot} H${L}`} {...lit(run, stL || stR)} />
      <Wire d={`M${L} ${bot} H${R}`} {...lit(fwd, stR)} />
      <Dot x={L} y={bot} />
      <BatteryV x={60} yTop={mid - 10} label={formatSI(s.V, "V", 3)} />

      {/* left leg */}
      <Wire d={`M${L} ${top} V90`} {...lit(fwd, stL)} />
      <ContactV x={L} y1={90} y2={150} closed={s1} {...lit(fwd, stL)} />
      <Wire d={`M${L} 150 V${mid} V250`} {...lit(fwd || rev, stL)} />
      <ContactV x={L} y1={250} y2={310} closed={s2} {...lit(rev, stL)} />
      <Wire d={`M${L} 310 V${bot}`} {...lit(rev, stL)} />
      {/* right leg */}
      <Wire d={`M${R} ${top} V90`} {...lit(rev, stR)} />
      <ContactV x={R} y1={90} y2={150} closed={s3} flip {...lit(rev, stR)} />
      <Wire d={`M${R} 150 V${mid} V250`} {...lit(fwd || rev, stR)} />
      <ContactV x={R} y1={250} y2={310} closed={s4} flip {...lit(fwd, stR)} />
      <Wire d={`M${R} 310 V${bot}`} {...lit(fwd, stR)} />
      <Dot x={L} y={mid} />
      <Dot x={R} y={mid} />

      {/* switch labels */}
      {[
        { x: L - 14, y: 126, name: "S1", on: s1, a: "end" as const },
        { x: L - 14, y: 286, name: "S2", on: s2, a: "end" as const },
        { x: R + 14, y: 126, name: "S3", on: s3, a: "start" as const },
        { x: R + 14, y: 286, name: "S4", on: s4, a: "start" as const },
      ].map((k) => (
        <g key={k.name}>
          <T x={k.x} y={k.y - 8} size={17} anchor={k.a} weight={700}>
            {k.name}
          </T>
          <T x={k.x} y={k.y + 12} size={14} anchor={k.a} fill={k.on ? ACCENT : MUTED} weight={600}>
            {k.on ? "ON ต่อ" : "OFF ตัด"}
          </T>
        </g>
      ))}

      {/* motor across the bridge */}
      <Wire d={`M${L} ${mid} H${mx - 44}`} live={fwd || rev} />
      <Wire d={`M${mx + 44} ${mid} H${R}`} live={fwd || rev} />
      <Motor cx={mx} cy={mid} r={44} angle={angle} s={s} wNow={wNow} />
      <T x={mx - 54} y={mid + 20} size={13} anchor="end">A</T>
      <T x={mx + 54} y={mid + 20} size={13} anchor="start">B</T>

      <T x={20} y={374} size={18} anchor="start" weight={700} fill={s.shortCircuit ? DANGER : s.braking ? ACCENT : s.direction !== "stop" ? OK : MUTED}>
        {statusText(s)}
      </T>
      <T x={620} y={374} size={15} anchor="end" fill={MUTED}>
        {`≈ ${Math.round(Math.abs(toRpm(wNow)))} rpm`}
      </T>
      <T x={20} y={396} size={15} anchor="start" weight={600} fill={s.bridgeMode === "shoot-through" || s.fuseBlown ? DANGER : INK}>
        {s.fuseBlown && s.bridgeMode !== "shoot-through" ? "ฟิวส์ขาด – กดรีเซ็ตเพื่อเปลี่ยนฟิวส์" : bridgeModeText(s.bridgeMode)}
      </T>
    </g>
  );
}

function ContactorStage({ s, inp, angle, wNow }: { s: MotorState; inp: MotorInputs; angle: number; wNow: number }) {
  const c = s.contactor;
  const live = c.coil;
  const viaStart = live && inp.startPressed;
  const viaHold = live && !inp.startPressed;
  const run = s.current > 1e-9;
  const coilStroke = c.coil ? ACCENT : INK;
  const mx = 580;
  const my = 215;
  return (
    <g>
      {/* ---------- control circuit 24 V ---------- */}
      <T x={14} y={24} size={15} anchor="start" fill={MUTED}>
        {`วงจรควบคุม ${CONTROL_V} V (จำลอง)`}
      </T>
      <T x={14} y={44} size={15} anchor="start" weight={600}>+24 V</T>
      <Wire d="M14 80 H44" live={live} />
      <PushButton x1={44} x2={92} y={80} nc pressed={c.stopPressed} live={live} />
      <T x={68} y={114} size={14}>STOP (NC)</T>
      <Wire d="M92 80 H130" live={live} />
      <Dot x={115} y={80} />
      <Wire d="M115 80 V150 H130" live={viaHold} />
      <PushButton x1={130} x2={178} y={80} nc={false} pressed={c.startPressed} live={viaStart} />
      <T x={154} y={42} size={14}>START (NO)</T>
      <ContactH x1={130} x2={178} y={150} closed={c.holding} live={viaHold} />
      <T x={154} y={176} size={14} fill={c.holding ? ACCENT : INK} weight={c.holding ? 700 : 400}>
        K1 13–14
      </T>
      <Wire d="M178 150 H195 V80" live={viaHold} />
      <Dot x={195} y={80} />
      <Wire d="M178 80 H260 V180" live={live} />
      {/* coil */}
      <rect x={242} y={180} width={36} height={70} rx={2} fill={c.coil ? "var(--fig-accent-soft)" : "var(--fig-bg)"} stroke={coilStroke} strokeWidth={2.5} />
      <T x={260} y={221} size={16} weight={700} fill={coilStroke}>K1</T>
      <T x={286} y={190} size={13} anchor="start">A1</T>
      <T x={286} y={248} size={13} anchor="start">A2</T>
      <T x={232} y={221} size={13} anchor="end" fill={c.coil ? ACCENT : MUTED} weight={600}>
        {c.coil ? "มีไฟ" : "ไม่มีไฟ"}
      </T>
      <Wire d="M260 250 V300 H190" live={live} />
      <ContactH x1={140} x2={190} y={300} closed={!c.overloadTripped} live={live} />
      <T x={165} y={330} size={14} fill={c.overloadTripped ? DANGER : INK} weight={c.overloadTripped ? 700 : 400}>
        {c.overloadTripped ? "OL 95–96 เปิด (ทริป)" : "OL 95–96 (NC)"}
      </T>
      <Wire d="M140 300 H14" live={live} />
      <T x={14} y={290} size={15} anchor="start" weight={600}>0 V</T>

      {/* ---------- main circuit ---------- */}
      <line x1={330} y1={34} x2={330} y2={360} stroke="var(--fig-grid)" strokeWidth={2} />
      <T x={344} y={24} size={15} anchor="start" fill={MUTED}>
        วงจรกำลัง (มอเตอร์ 12 V DC)
      </T>
      <Wire d="M370 190 V80 H410" live={run} />
      <ContactH x1={410} x2={460} y={80} closed={c.mainClosed} live={run} />
      <T x={435} y={112} size={14} fill={c.mainClosed ? ACCENT : INK} weight={c.mainClosed ? 700 : 400}>
        K1 1–2
      </T>
      <Wire d="M460 80 H490" live={run} />
      {/* thermal OL heater */}
      <rect x={490} y={70} width={44} height={20} fill="var(--fig-bg)" stroke={c.overloadTripped ? DANGER : INK} strokeWidth={2.5} />
      <path d="M494 80 h6 v-6 h8 v12 h8 v-12 h8 v6 h6" fill="none" stroke={c.overloadTripped ? DANGER : INK} strokeWidth={2} />
      <T x={512} y={60} size={14}>OL</T>
      <Wire d={`M534 80 H${mx} V${my - 34}`} live={run} />
      <Wire d={`M${mx} ${my + 34} V340 H370 V200`} live={run} />
      <BatteryV x={370} yTop={190} label={formatSI(s.V, "V", 3)} />
      <Motor cx={mx} cy={my} r={34} angle={angle} s={s} wNow={wNow} />

      <T x={480} y={290} size={17} weight={700} fill={s.overheat ? DANGER : s.direction !== "stop" ? OK : MUTED}>
        {statusText(s)}
      </T>
      <T x={480} y={312} size={14} fill={MUTED}>
        {`≈ ${Math.round(Math.abs(toRpm(wNow)))} rpm`}
      </T>

      <T x={14} y={372} size={15} anchor="start" weight={600} fill={c.overloadTripped ? DANGER : c.running && !inp.startPressed ? ACCENT : INK}>
        {c.overloadTripped
          ? "โอเวอร์โหลดทริป – รีเซ็ต OL แล้วกด START ใหม่"
          : c.running
            ? inp.startPressed
              ? "ทำงาน (กด START อยู่)"
              : "ทำงาน – ยึดตัวเองผ่าน K1 13–14"
            : "หยุด – รอกด START"}
      </T>
      <T x={14} y={394} size={13} anchor="start" fill={MUTED}>
        วงจรกำลัง 230/400 V จริง เป็นงานสาธิตของครูเท่านั้น
      </T>
    </g>
  );
}

export function MotorStage({ s, inp, angle = 0, wNow }: { s: MotorState; inp: MotorInputs; angle?: number; wNow?: number }) {
  const w = wNow ?? (s.direction === "ccw" ? -s.omega : s.omega);
  return (
    <svg viewBox="0 0 640 400" className="block h-auto w-full" role="presentation">
      <style>{FLOW_CSS}</style>
      {s.tab === "pwm" ? <PwmStage s={s} angle={angle} wNow={w} /> : null}
      {s.tab === "hbridge" ? <HBridgeStage s={s} inp={inp} angle={angle} wNow={w} /> : null}
      {s.tab === "contactor" ? <ContactorStage s={s} inp={inp} angle={angle} wNow={w} /> : null}
    </svg>
  );
}
