/**
 * Relay board schematic (pure SVG, no hooks) — used by Lab.tsx and by
 * previewStage for static PNG QA. Contact blades carry both a `transform`
 * attribute (static renderers) and a CSS transform with a transition
 * (browser animation; stopped by prefers-reduced-motion).
 */
import type { CSSProperties, ReactNode } from "react";
import { formatSI } from "../shared/format";
import { SPIKE_WARN_V, type RelayInputs, type RelayState } from "./model";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const LIVE = "var(--fig-current)";

const FLOW_CSS = `
.rl-flow{stroke-dasharray:3 11;animation:rl-dash .9s linear infinite}
@keyframes rl-dash{to{stroke-dashoffset:-14}}
.rl-move{transition:transform .18s ease-in}
@media (prefers-reduced-motion: reduce){.rl-flow{animation:none}.rl-move{transition:none}}
`;

function Wire({ d, live = false }: { d: string; live?: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke={live ? LIVE : INK} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {live ? <path d={d} fill="none" stroke="var(--fig-bg)" strokeWidth={2.5} className="rl-flow" strokeDasharray="3 11" /> : null}
    </g>
  );
}

function T({ x, y, children, size = 16, anchor = "middle", weight = 400, fill = INK }: { x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end"; weight?: number; fill?: string }) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill={fill}>
      {children}
    </text>
  );
}

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.5} fill={INK} />;
}

function Terminal({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={4} fill="var(--fig-bg)" stroke={INK} strokeWidth={2} />;
}

/** Rotating blade pivoted at (x,y), pointing right, length L, angle in degrees. */
function Blade({ x, y, L, angle, live, anim }: { x: number; y: number; L: number; angle: number; live?: boolean; anim: boolean }) {
  const style: CSSProperties = { transform: `rotate(${angle}deg)`, transformOrigin: `${x}px ${y}px`, transformBox: "view-box" };
  return (
    <g transform={anim ? undefined : `rotate(${angle} ${x} ${y})`} style={anim ? style : undefined} className="rl-move">
      <line x1={x} y1={y} x2={x + L} y2={y} stroke={live ? LIVE : INK} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/** Toggle / relay contact between x1 and x2 at height y. */
function Contact({ x1, x2, y, closed, live, anim }: { x1: number; x2: number; y: number; closed: boolean; live?: boolean; anim: boolean }) {
  return (
    <g>
      <Blade x={x1} y={y} L={x2 - x1 - 4} angle={closed ? 0 : -26} live={live && closed} anim={anim} />
      <Terminal x={x1} y={y} />
      <Terminal x={x2} y={y} />
    </g>
  );
}

/** Push button: NO (bar lifts off, drops when pressed) or NC (bar touches, pushed away). */
function PushButton({ x1, x2, y, nc, pressed, live, anim }: { x1: number; x2: number; y: number; nc: boolean; pressed: boolean; live?: boolean; anim: boolean }) {
  const closed = nc ? !pressed : pressed;
  const barY = nc ? (pressed ? y + 13 : y + 4) : pressed ? y - 4 : y - 13;
  const cx = (x1 + x2) / 2;
  const headY = barY - (nc ? 30 : 14);
  const style: CSSProperties = { transform: `translateY(${barY - y}px)` };
  return (
    <g>
      <g transform={anim ? undefined : `translate(0 ${barY - y})`} style={anim ? style : undefined} className="rl-move">
        <line x1={x1 - 2} y1={y} x2={x2 + 2} y2={y} stroke={live && closed ? LIVE : INK} strokeWidth={3} strokeLinecap="round" />
        <line x1={cx} y1={y} x2={cx} y2={headY - barY + y} stroke={INK} strokeWidth={2} strokeDasharray={nc ? "4 3" : undefined} />
        <line x1={cx - 9} y1={headY - barY + y} x2={cx + 9} y2={headY - barY + y} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </g>
      <Terminal x={x1} y={y} />
      <Terminal x={x2} y={y} />
    </g>
  );
}

function Ground({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={INK} strokeWidth={2.5} strokeLinecap="round">
      <line x1={x - 14} y1={y} x2={x + 14} y2={y} />
      <line x1={x - 9} y1={y + 6} x2={x + 9} y2={y + 6} />
      <line x1={x - 4} y1={y + 12} x2={x + 4} y2={y + 12} />
    </g>
  );
}

function Lamp({ x, y, lit, color }: { x: number; y: number; lit: boolean; color: string }) {
  const r = 16;
  const k = r * 0.7;
  return (
    <g>
      {lit ? (
        <g stroke={color} strokeWidth={2.5} strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const c = Math.cos((a * Math.PI) / 180);
            const s = Math.sin((a * Math.PI) / 180);
            return <line key={a} x1={x + c * 21} y1={y + s * 21} x2={x + c * 28} y2={y + s * 28} />;
          })}
        </g>
      ) : null}
      <circle cx={x} cy={y} r={r} fill={lit ? color : "var(--fig-bg)"} fillOpacity={lit ? 0.85 : 1} stroke={lit ? color : INK} strokeWidth={2.5} />
      <line x1={x - k} y1={y - k} x2={x + k} y2={y + k} stroke={lit ? "var(--fig-bg)" : INK} strokeWidth={2} />
      <line x1={x - k} y1={y + k} x2={x + k} y2={y - k} stroke={lit ? "var(--fig-bg)" : INK} strokeWidth={2} />
    </g>
  );
}

/** Vertical DC source, + at top (long plate). */
function BatteryV({ x, yTop, label }: { x: number; yTop: number; label: string }) {
  return (
    <g>
      <line x1={x - 16} y1={yTop} x2={x + 16} y2={yTop} stroke={INK} strokeWidth={3} />
      <line x1={x - 8} y1={yTop + 10} x2={x + 8} y2={yTop + 10} stroke={INK} strokeWidth={5} />
      <T x={x - 22} y={yTop + 2} size={15} anchor="end" fill="var(--fig-plus)">+</T>
      <T x={x + 24} y={yTop + 12} size={16} anchor="start" weight={600}>{label}</T>
    </g>
  );
}

export function RelayStage({ s, inp, animate = true }: { s: RelayState; inp: RelayInputs; animate?: boolean }) {
  const live = s.coilI > 1e-9;
  const e = s.energized;
  const coilFill = e ? "var(--fig-accent-soft)" : "var(--fig-bg)";
  const coilStroke = e ? "var(--fig-accent)" : INK;

  // SPDT changeover — COM 11 pivot, NC 12 up, NO 14 down
  const px = 440;
  const py = 200;
  const ang = e ? 24 : -24;
  const L = 76;
  const tx = px + L * Math.cos((24 * Math.PI) / 180);
  const tyNC = py - L * Math.sin((24 * Math.PI) / 180);
  const tyNO = py + L * Math.sin((24 * Math.PI) / 180);
  const linkX = px + 32 * Math.cos((ang * Math.PI) / 180);
  const linkY = py + 32 * Math.sin((ang * Math.PI) / 180);

  const spike = s.lastSpikeV > 0 && !live;
  const spikeBad = s.lastSpikeV > SPIKE_WARN_V;
  const vs = formatSI(s.supplyV, "V", 3);

  return (
    <svg viewBox="0 0 640 400" className="block h-auto w-full" role="presentation">
      <style>{FLOW_CSS}</style>

      {/* ---------------- coil side ---------------- */}
      <T x={20} y={22} size={15} anchor="start" fill={MUTED}>
        ด้านขดลวด (คอยล์)
      </T>

      {s.mode === "basic" ? (
        <g>
          <Wire d="M60 180 V80 H110" live={live} />
          <Wire d="M170 80 H280 V160" live={live} />
          <Wire d="M280 240 V320 H60 V190" live={live} />
          <BatteryV x={60} yTop={180} label={`V_S ${vs}`} />
          {inp.switchKind === "push" ? (
            <PushButton x1={110} x2={170} y={80} nc={false} pressed={inp.switchOn} live={live} anim={animate} />
          ) : (
            <Contact x1={110} x2={170} y={80} closed={inp.switchOn} live={live} anim={animate} />
          )}
          <T x={140} y={inp.switchKind === "push" ? 46 : 112} size={15}>
            {inp.switchKind === "push" ? "S1 ปุ่มกด" : "S1 สวิตช์"}
          </T>
        </g>
      ) : null}

      {s.mode === "driver" && s.driver ? (
        <g>
          <line x1={262} y1={62} x2={298} y2={62} stroke={INK} strokeWidth={3} />
          <T x={280} y={52} size={16} weight={600}>{`+V_S ${vs}`}</T>
          <Wire d="M280 62 V160" live={live} />
          <Wire d="M280 240 V272" live={live} />
          {/* NPN */}
          <circle cx={272} cy={292} r={25} fill="none" stroke={INK} strokeWidth={2} />
          <line x1={262} y1={276} x2={262} y2={308} stroke={INK} strokeWidth={3} />
          <Wire d="M262 284 L280 272" live={live} />
          <Wire d="M262 300 L280 312 V336" live={live} />
          <path d="M280 312 l-9 -1 l4 -7 z" fill={live ? LIVE : INK} />
          <Ground x={280} y={336} />
          <T x={304} y={298} size={15} anchor="start">Q1 NPN</T>
          {/* base drive */}
          <Wire d="M262 292 H222" live={s.driver.Ib > 0} />
          <rect x={160} y={283} width={62} height={18} fill="var(--fig-bg)" stroke={s.driver.Ib > 0 ? LIVE : INK} strokeWidth={2.5} />
          <T x={191} y={274} size={15}>{`R_B ${formatSI(s.driver.Rb, "Ω", 3)}`}</T>
          <Wire d="M160 292 H70 V300" live={s.driver.Ib > 0} />
          <circle cx={70} cy={318} r={18} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />
          <T x={70} y={315} size={13} weight={600}>+</T>
          <T x={70} y={330} size={13} weight={600}>−</T>
          <Wire d="M70 336 V340" />
          <Ground x={70} y={340} />
          <T x={98} y={330} size={15} anchor="start">{`Vin ${formatSI(s.driver.Vin, "V", 2)}`}</T>
        </g>
      ) : null}

      {s.mode === "latch" ? (
        <g>
          <T x={14} y={52} size={15} anchor="start" weight={600}>+V_S</T>
          <Wire d="M14 64 H40" live={live} />
          <PushButton x1={40} x2={88} y={64} nc pressed={s.stopPressed} live={live} anim={animate} />
          <T x={64} y={98} size={14}>STOP</T>
          <Wire d="M88 64 H106" live={live} />
          <Contact x1={106} x2={148} y={64} closed={!s.olTripped} live={live} anim={animate} />
          <T x={127} y={98} size={13}>OL 95–96</T>
          <Wire d="M148 64 H180" live={live} />
          <Wire d="M165 64 V114 H180" live={live && !inp.startPressed} />
          <PushButton x1={180} x2={228} y={64} nc={false} pressed={s.startPressed} live={live} anim={animate} />
          <T x={204} y={30} size={14}>START</T>
          <Contact x1={180} x2={228} y={114} closed={s.holdClosed} live={live && !inp.startPressed} anim={animate} />
          <T x={204} y={136} size={13}>K1 21–24</T>
          <Wire d="M228 114 H245 V64" live={live && !inp.startPressed} />
          <Wire d="M228 64 H280 V160" live={live} />
          <Dot x={165} y={64} />
          <Dot x={245} y={64} />
          <Wire d="M280 240 V336" live={live} />
          <Ground x={280} y={336} />
          <T x={20} y={140} size={14} anchor="start" fill={MUTED}>{`V_S = ${vs}`}</T>
        </g>
      ) : null}

      {/* flyback diode across the coil (cathode to A1 / +) */}
      {s.flyback ? (
        <g>
          <Wire d="M280 150 H220 V250 H280" />
          <path d="M208 212 H232 L220 190 Z" fill={INK} />
          <line x1={207} y1={189} x2={233} y2={189} stroke={INK} strokeWidth={3} />
          <Dot x={280} y={150} />
          <Dot x={280} y={250} />
          <T x={202} y={206} size={14} anchor="end">D1</T>
        </g>
      ) : (
        <T x={232} y={206} size={13} anchor="end" fill={MUTED}>
          ไม่มี D1
        </T>
      )}

      {/* coil K1 */}
      <rect x={262} y={160} width={36} height={80} rx={2} fill={coilFill} stroke={coilStroke} strokeWidth={2.5} />
      <T x={280} y={206} size={16} weight={700} fill={coilStroke}>
        K1
      </T>
      <T x={306} y={168} size={13} anchor="start">A1</T>
      <T x={306} y={242} size={13} anchor="start">A2</T>

      {/* mechanical linkage */}
      <line x1={298} y1={200} x2={linkX} y2={linkY} stroke={MUTED} strokeWidth={2} strokeDasharray="6 5" />

      {spike ? (
        <T x={14} y={388} size={15} anchor="start" weight={700} fill={spikeBad ? "var(--fig-danger)" : "var(--fig-ok)"}>
          {`ขณะตัดคอยล์: ≈ ${formatSI(s.lastSpikeV, "V", 3)}${spikeBad ? " (> 100 V อันตราย)" : " (ไดโอดจำกัดไว้)"}`}
        </T>
      ) : null}

      {/* ---------------- contact side ---------------- */}
      <line x1={372} y1={30} x2={372} y2={366} stroke="var(--fig-grid)" strokeWidth={2} />
      <T x={386} y={22} size={15} anchor="start" fill={MUTED}>
        ด้านหน้าสัมผัส (โหลด 12 V DC)
      </T>

      <Wire d={`M${tx} ${tyNC} H545 V110 H564`} live={s.lampNC} />
      <Wire d="M596 110 H620" live={s.lampNC} />
      <Wire d={`M${tx} ${tyNO} H545 V290 H564`} live={s.lampNO} />
      <Wire d="M596 290 H620" live={s.lampNO} />
      <Wire d="M620 110 V350 H524" live />
      <Wire d={`M512 350 H${px} V${py}`} live />
      <line x1={512} y1={334} x2={512} y2={366} stroke={INK} strokeWidth={3} />
      <line x1={524} y1={342} x2={524} y2={358} stroke={INK} strokeWidth={5} />
      <T x={504} y={378} size={15} anchor="end" fill="var(--fig-plus)">+</T>
      <T x={536} y={380} size={15} anchor="start">12 V DC</T>
      <Dot x={620} y={290} />

      <Blade x={px} y={py} L={L - 4} angle={ang} live anim={animate} />
      <Terminal x={px} y={py} />
      <Terminal x={tx} y={tyNC} />
      <Terminal x={tx} y={tyNO} />
      <T x={px - 10} y={py + 28} size={14} anchor="end">COM 11</T>
      <T x={tx - 6} y={tyNC - 12} size={14} anchor="end">NC 12</T>
      <T x={tx - 6} y={tyNO + 24} size={14} anchor="end">NO 14</T>

      <Lamp x={580} y={110} lit={s.lampNC} color="var(--fig-danger)" />
      <T x={580} y={70} size={14}>หลอด NC (แดง)</T>
      <T x={580} y={154} size={16} weight={700} fill={s.lampNC ? "var(--fig-danger)" : MUTED}>
        {s.lampNC ? "ติด" : "ดับ"}
      </T>
      <Lamp x={580} y={290} lit={s.lampNO} color="var(--fig-ok)" />
      <T x={580} y={256} size={16} weight={700} fill={s.lampNO ? "var(--fig-ok)" : MUTED}>
        {s.lampNO ? "ติด" : "ดับ"}
      </T>
      <T x={612} y={332} size={14} anchor="end">หลอด NO (เขียว)</T>

      <T x={386} y={60} size={14} anchor="start" fill={e ? "var(--fig-accent)" : MUTED} weight={600}>
        {e ? "รีเลย์ทำงาน (ดูด)" : "รีเลย์ไม่ทำงาน (ปล่อย)"}
      </T>
    </svg>
  );
}
