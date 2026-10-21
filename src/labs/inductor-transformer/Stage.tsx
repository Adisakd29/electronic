/**
 * Pure SVG stages (no hooks) — used by Lab.tsx and by previewStage for QA renders.
 * Animation is CSS-only (classes defined in STAGE_CSS) and is disabled under
 * prefers-reduced-motion or when `animate` is false.
 */
import { formatSI } from "../shared/format";
import {
  CORES,
  ELV_AC,
  SATURATION_B,
  clamp,
  fieldLineCount,
  type InductorState,
  type TransformerState,
} from "./model";

export const STAGE_CSS = `
@keyframes it-flow { to { stroke-dashoffset: -30; } }
@keyframes it-ac { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -60; } }
.it-flow { animation: it-flow 1.4s linear infinite; }
.it-ac { animation: it-ac 1s ease-in-out infinite alternate; }
@media (prefers-reduced-motion: reduce) { .it-flow, .it-ac { animation: none; } }
`;

const C = {
  ink: "var(--fig-ink)",
  muted: "var(--fig-muted)",
  grid: "var(--fig-grid)",
  panel: "var(--fig-panel)",
  copper: "var(--fig-copper)",
  copperSoft: "var(--fig-copper-soft)",
  field: "var(--fig-field)",
  current: "var(--fig-current)",
  danger: "var(--fig-danger)",
  warn: "var(--fig-warn)",
  accent: "var(--fig-accent)",
  bg: "var(--fig-bg)",
};

function Arrow({ x, y, dir, color, size = 7 }: { x: number; y: number; dir: "left" | "right" | "up" | "down"; color: string; size?: number }) {
  const s = size;
  const pts = {
    right: `${x + s},${y} ${x - s * 0.6},${y - s * 0.7} ${x - s * 0.6},${y + s * 0.7}`,
    left: `${x - s},${y} ${x + s * 0.6},${y - s * 0.7} ${x + s * 0.6},${y + s * 0.7}`,
    up: `${x},${y - s} ${x - s * 0.7},${y + s * 0.6} ${x + s * 0.7},${y + s * 0.6}`,
    down: `${x},${y + s} ${x - s * 0.7},${y - s * 0.6} ${x + s * 0.7},${y - s * 0.6}`,
  }[dir];
  return <polygon points={pts} fill={color} />;
}

// ---------------------------------------------------------------------------
// Inductor (solenoid)
// ---------------------------------------------------------------------------

export function InductorStage({ s, animate = true }: { s: InductorState; animate?: boolean }) {
  const W = 480;
  const H = 360;
  const cx = 240;
  const cy = 165;
  const coilW = 110 + ((s.l - 0.01) / 0.19) * 190; // 110…300 px ↔ 1…20 cm
  const rh = 16 + ((s.d - 0.005) / 0.045) * 34; // half-height 16…50 px ↔ Ø 0.5…5 cm
  const x0 = cx - coilW / 2;
  const x1 = cx + coilW / 2;
  const turns = clamp(Math.round(4 + Math.sqrt(s.N) * 0.85), 6, 30);
  const pitch = coilW / turns;
  const n = fieldLineCount(s.B);
  const gapOut = n ? Math.min(11, 78 / n) : 0;
  const coreFill = s.core === "air" ? "none" : s.core === "ferrite" ? C.muted : C.panel;
  const sat = s.core !== "air" && s.B > SATURATION_B[s.core];

  const lines: { d: string; yIn: number; yOut: number }[] = [];
  for (let k = 0; k < n; k++) {
    const yi = ((k + 0.5) / n) * (rh - 5);
    const out = rh + 14 + (n - 1 - k) * gapOut;
    const ext = 22 + (n - 1 - k) * gapOut * 0.9;
    for (const sign of [-1, 1]) {
      const yIn = cy + sign * yi;
      const yOut = cy + sign * out;
      const a = x0 - 8;
      const b = x1 + 8;
      lines.push({
        d: `M${a} ${yIn} L${b} ${yIn} C${b + ext} ${yIn} ${b + ext} ${yOut} ${b - 10} ${yOut} L${a + 10} ${yOut} C${a - ext} ${yOut} ${a - ext} ${yIn} ${a} ${yIn} Z`,
        yIn,
        yOut,
      });
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="ภาพขดลวดโซลินอยด์และเส้นแรงแม่เหล็ก">
      {/* back halves of the turns */}
      {Array.from({ length: turns }, (_, j) => {
        const x = x0 + (j + 0.5) * pitch;
        const rx = Math.max(2.5, Math.min(9, pitch * 0.42));
        return <path key={`b${j}`} d={`M${x} ${cy - rh} A${rx} ${rh} 0 0 0 ${x} ${cy + rh}`} fill="none" stroke={C.copper} strokeOpacity={0.4} strokeWidth={1.5} />;
      })}
      {/* core */}
      <rect
        x={x0 - 4}
        y={cy - rh + 4}
        width={coilW + 8}
        height={2 * rh - 8}
        rx={4}
        fill={coreFill}
        fillOpacity={s.core === "ferrite" ? 0.45 : 1}
        stroke={C.muted}
        strokeDasharray={s.core === "air" ? "4 4" : undefined}
      />
      {s.core === "iron"
        ? Array.from({ length: 5 }, (_, j) => (
            <line key={`h${j}`} x1={x0} x2={x1} y1={cy - rh + 4 + ((j + 1) * (2 * rh - 8)) / 6} y2={cy - rh + 4 + ((j + 1) * (2 * rh - 8)) / 6} stroke={C.muted} strokeOpacity={0.5} />
          ))
        : null}
      {/* field lines */}
      <g>
        {lines.map((ln, i) => (
          <path
            key={i}
            d={ln.d}
            fill="none"
            stroke={C.field}
            strokeWidth={1.6}
            strokeDasharray="12 3"
            className={animate ? "it-flow" : undefined}
          />
        ))}
        {lines.map((ln, i) => (
          <g key={`a${i}`}>
            <Arrow x={cx} y={ln.yIn} dir="right" color={C.field} size={5} />
            <Arrow x={cx} y={ln.yOut} dir="left" color={C.field} size={5} />
          </g>
        ))}
      </g>
      {/* front halves of the turns */}
      {Array.from({ length: turns }, (_, j) => {
        const x = x0 + (j + 0.5) * pitch;
        const rx = Math.max(2.5, Math.min(9, pitch * 0.42));
        return <path key={`f${j}`} d={`M${x} ${cy - rh} A${rx} ${rh} 0 0 1 ${x} ${cy + rh}`} fill="none" stroke={C.copper} strokeWidth={2.6} strokeLinecap="round" />;
      })}
      {/* poles */}
      <text x={x0 - 12} y={cy + 6} fontSize={17} fontWeight={700} textAnchor="end">
        S
      </text>
      <text x={x1 + 12} y={cy + 6} fontSize={17} fontWeight={700}>
        N
      </text>
      {/* leads & current */}
      <path d={`M${x0 + pitch * 0.5} ${cy + rh} V${H - 46} H${x0 - 10}`} fill="none" stroke={C.copper} strokeWidth={2} />
      <path d={`M${x1 - pitch * 0.5} ${cy + rh} V${H - 46} H${x1 + 10}`} fill="none" stroke={C.copper} strokeWidth={2} />
      <circle cx={x0 - 14} cy={H - 46} r={4} fill={C.bg} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={x1 + 14} cy={H - 46} r={4} fill={C.bg} stroke={C.ink} strokeWidth={1.5} />
      {s.I > 0 ? <Arrow x={x0 + pitch * 0.5} y={H - 64} dir="up" color={C.current} /> : null}
      <text x={x0 - 26} y={H - 41} fontSize={14} textAnchor="end">
        I = {formatSI(s.I, "A")}
      </text>
      {/* header */}
      <text x={12} y={22} fontSize={15} fontWeight={700}>
        N = {s.N} รอบ · l = {formatSI(s.l * 100, "")} cm · Ø {formatSI(s.d * 100, "")} cm
      </text>
      <text x={12} y={42} fontSize={14} fill={C.muted}>
        แกน: {CORES[s.core].label}
      </text>
      <text x={W - 12} y={22} fontSize={15} fontWeight={700} textAnchor="end">
        L = {formatSI(s.L, "H")}
      </text>
      <text x={W - 12} y={42} fontSize={14} textAnchor="end" fill={sat ? C.danger : C.ink}>
        B ≈ {formatSI(s.B, "T")}
        {sat ? " (เกินจุดอิ่มตัวจริง)" : ""}
      </text>
      <text x={W - 12} y={H - 12} fontSize={13} textAnchor="end" fill={C.muted}>
        {n === 0 ? "I = 0 → ไม่มีสนามแม่เหล็ก" : "ความหนาแน่นเส้นแรง ∝ B (สเกลลอการิทึม) · ภาพจำนวนรอบแบบย่อ"}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Transformer
// ---------------------------------------------------------------------------

function coilTurns(N: number) {
  return clamp(Math.round(2 + 3.4 * Math.log10(N / 5)), 3, 13);
}

function WindingOnLeg({ lx, y0, y1, N }: { lx: number; y0: number; y1: number; N: number }) {
  const n = coilTurns(N);
  const pitch = (y1 - y0) / n;
  return (
    <g>
      {Array.from({ length: n }, (_, j) => {
        const y = y0 + (j + 0.5) * pitch;
        return <rect key={j} x={lx - 7} y={y - pitch * 0.36} width={35 + 14} height={pitch * 0.72} rx={3} fill={C.copperSoft} stroke={C.copper} strokeWidth={1.6} />;
      })}
    </g>
  );
}

export function TransformerStage({ s, animate = true }: { s: TransformerState; animate?: boolean }) {
  const W = 480;
  const H = 320;
  const open = !Number.isFinite(s.Rload);
  const hv = s.Vp > ELV_AC || s.Vs > ELV_AC;
  // core geometry
  const cx0 = 172;
  const cx1 = 324;
  const cy0 = 62;
  const cy1 = 252;
  const leg = 34;
  const f0 = cx0 + leg / 2;
  const f1 = cx1 - leg / 2;
  const g0 = cy0 + leg / 2;
  const g1 = cy1 - leg / 2;
  const coilY0 = cy0 + leg + 8;
  const coilY1 = cy1 - leg - 8;
  const typeLabel = s.type === "step-up" ? "หม้อแปลงแรงดันขึ้น (step-up)" : s.type === "step-down" ? "หม้อแปลงแรงดันลง (step-down)" : "หม้อแปลงแยกวงจร 1:1 (isolation)";
  const ratioText = s.ratio >= 1 ? `${formatSI(s.ratio, "", 3)} : 1` : `1 : ${formatSI(1 / s.ratio, "", 3)}`;
  const top = coilY0 + 4;
  const bot = coilY1 - 4;
  const srcX = 96;
  const loadX = 414;
  const mid = (cy0 + cy1) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="ภาพหม้อแปลงแกนเหล็กแผ่นบาง ขดปฐมภูมิและทุติยภูมิ">
      <text x={W / 2} y={22} fontSize={16} fontWeight={700} textAnchor="middle">
        {typeLabel}
      </text>
      <text x={W / 2} y={42} fontSize={14} textAnchor="middle" fill={C.muted}>
        Np : Ns = {s.Np} : {s.Ns} (= {ratioText})
      </text>
      {/* laminated core */}
      <path
        d={`M${cx0} ${cy0} H${cx1} V${cy1} H${cx0} Z M${cx0 + leg} ${cy0 + leg} V${cy1 - leg} H${cx1 - leg} V${cy0 + leg} Z`}
        fill={C.panel}
        fillRule="evenodd"
        stroke={C.muted}
        strokeWidth={1.5}
      />
      {[0.25, 0.75].map((k) => {
        const o = leg * k;
        return <rect key={k} x={cx0 + o} y={cy0 + o} width={cx1 - cx0 - 2 * o} height={cy1 - cy0 - 2 * o} fill="none" stroke={C.muted} strokeOpacity={0.45} strokeWidth={1} />;
      })}
      {/* flux path (AC → alternating) */}
      <rect x={f0} y={g0} width={f1 - f0} height={g1 - g0} fill="none" stroke={C.field} strokeWidth={2.2} strokeDasharray="14 6" className={animate ? "it-ac" : undefined} />
      <Arrow x={(f0 + f1) / 2} y={g0} dir="right" color={C.field} />
      <Arrow x={(f0 + f1) / 2} y={g1} dir="left" color={C.field} />
      <text x={(f0 + f1) / 2} y={mid - 4} fontSize={16} fontWeight={700} textAnchor="middle" fill={C.field}>
        Φ
      </text>
      <text x={(f0 + f1) / 2} y={mid + 14} fontSize={12} textAnchor="middle" fill={C.field}>
        ไฟสลับ
      </text>
      {/* windings */}
      <WindingOnLeg lx={cx0} y0={coilY0} y1={coilY1} N={s.Np} />
      <WindingOnLeg lx={cx1 - leg} y0={coilY0} y1={coilY1} N={s.Ns} />
      {/* dots (same-phase ends) */}
      <circle cx={cx0 - 16} cy={coilY0 + 2} r={4.5} fill={C.ink} />
      <circle cx={cx1 + 16} cy={coilY0 + 2} r={4.5} fill={C.ink} />
      {/* primary circuit */}
      <path d={`M${cx0 - 7} ${top} H${srcX} V${mid - 22}`} fill="none" stroke={C.copper} strokeWidth={2} />
      <path d={`M${cx0 - 7} ${bot} H${srcX} V${mid + 22}`} fill="none" stroke={C.copper} strokeWidth={2} />
      <circle cx={srcX} cy={mid} r={22} fill={C.bg} stroke={C.ink} strokeWidth={2} />
      <path d={`M${srcX - 12} ${mid} q6 -10 12 0 t12 0`} fill="none" stroke={C.ink} strokeWidth={2} />
      <text x={srcX - 28} y={mid - 4} fontSize={14} textAnchor="end">
        Vp
      </text>
      <text x={srcX - 28} y={mid + 14} fontSize={14} textAnchor="end" fontWeight={700}>
        {formatSI(s.Vp, "V")}
      </text>
      {s.Ip > 0 ? <Arrow x={(srcX + cx0) / 2} y={top} dir="right" color={C.current} /> : null}
      <text x={cx0 - 12} y={top + 22} fontSize={13} textAnchor="end">
        Ip = {formatSI(s.Ip, "A")}
      </text>
      {hv ? (
        <text x={12} y={H - 34} fontSize={14} fontWeight={700} fill={C.danger}>
          แบบจำลองเท่านั้น
        </text>
      ) : null}
      {/* secondary circuit */}
      <path d={`M${cx1 + 7} ${top} H${loadX} V${mid - 30}`} fill="none" stroke={C.copper} strokeWidth={2} />
      <path d={`M${cx1 + 7} ${bot} H${loadX} V${mid + 30}`} fill="none" stroke={C.copper} strokeWidth={2} />
      {open ? (
        <g>
          <circle cx={loadX} cy={mid - 30} r={3.5} fill={C.bg} stroke={C.ink} />
          <circle cx={loadX} cy={mid + 30} r={3.5} fill={C.bg} stroke={C.ink} />
          <text x={loadX} y={mid + 5} fontSize={13} textAnchor="middle">
            เปิดวงจร
          </text>
        </g>
      ) : (
        <g>
          <path
            d={`M${loadX} ${mid - 30} v6 l9 4 l-18 8 l18 8 l-18 8 l18 8 l-9 4 v6`}
            fill="none"
            stroke={C.ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <text x={loadX + 14} y={mid - 8} fontSize={14}>
            R
          </text>
        </g>
      )}
      <text x={loadX + 14} y={mid + 16} fontSize={14}>
        Vs
      </text>
      <text x={loadX + 14} y={mid + 34} fontSize={14} fontWeight={700}>
        {formatSI(s.Vs, "V")}
      </text>
      <text x={cx1 + 12} y={top + 22} fontSize={13}>
        Is = {formatSI(s.Is, "A")}
      </text>
      {s.Is > 0 ? <Arrow x={(cx1 + loadX) / 2 + 6} y={top} dir="right" color={C.current} /> : null}
      {/* power summary */}
      <text x={W / 2} y={H - 34} fontSize={14} textAnchor="middle">
        Pp = {formatSI(s.Pp, "W")} → Ps = {formatSI(s.Ps, "W")}
      </text>
      <text x={W / 2} y={H - 14} fontSize={13} textAnchor="middle" fill={C.muted}>
        ประสิทธิภาพ {formatSI(s.eta * 100, "", 3)} % · ภาพจำนวนรอบแบบย่อ · • = ปลายขั้วเฟสเดียวกัน
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Polarity test mini-diagram (H1–X1 jumpered, voltmeter across the others)
// ---------------------------------------------------------------------------

export function PolarityDiagram({ s }: { s: TransformerState }) {
  const add = s.polarity === "additive";
  // subtractive: X1 sits next to H1 (top); additive: X1 sits diagonally (bottom)
  const xTopLabel = add ? "X2" : "X1";
  const xBotLabel = add ? "X1" : "X2";
  return (
    <svg viewBox="0 0 320 170" className="block h-auto w-full max-w-[360px]" role="img" aria-label={`แผนภาพทดสอบขั้ว ${add ? "แบบบวก (additive)" : "แบบลบ (subtractive)"}`}>
      <rect x={110} y={30} width={100} height={100} rx={6} fill={C.panel} stroke={C.muted} />
      <line x1={160} y1={36} x2={160} y2={124} stroke={C.muted} strokeDasharray="3 3" />
      <text x={135} y={86} fontSize={13} textAnchor="middle">
        ปฐมภูมิ
      </text>
      <text x={186} y={86} fontSize={13} textAnchor="middle">
        ทุติยภูมิ
      </text>
      {/* terminals */}
      {[
        { x: 120, y: 30, t: "H1", dot: true },
        { x: 120, y: 130, t: "H2", dot: false },
        { x: 200, y: 30, t: xTopLabel, dot: !add },
        { x: 200, y: 130, t: xBotLabel, dot: add },
      ].map((p) => (
        <g key={p.t}>
          <line x1={p.x} y1={p.y} x2={p.x} y2={p.y < 80 ? 14 : 146} stroke={C.copper} strokeWidth={2} />
          <circle cx={p.x} cy={p.y < 80 ? 14 : 146} r={4} fill={C.bg} stroke={C.ink} strokeWidth={1.5} />
          <text x={p.x + (p.x < 160 ? -10 : 10)} y={p.y < 80 ? 18 : 150} fontSize={13} fontWeight={700} textAnchor={p.x < 160 ? "end" : "start"}>
            {p.t}
          </text>
          {p.dot ? <circle cx={p.x + (p.x < 160 ? 10 : -10)} cy={p.y < 80 ? 42 : 118} r={4} fill={C.ink} /> : null}
        </g>
      ))}
      {/* jumper top, voltmeter bottom */}
      <path d="M120 14 Q160 -2 200 14" fill="none" stroke={C.accent} strokeWidth={2} />
      <text x={160} y={10} fontSize={11} textAnchor="middle" fill={C.accent}>
        สายจัมเปอร์
      </text>
      <path d="M120 146 V160 H145 M175 160 H200 V146" fill="none" stroke={C.ink} strokeWidth={1.5} />
      <circle cx={160} cy={160} r={10} fill={C.bg} stroke={C.ink} strokeWidth={1.5} />
      <text x={160} y={164.5} fontSize={12} fontWeight={700} textAnchor="middle">
        V
      </text>
      <text x={232} y={66} fontSize={13}>
        {add ? "ขั้วแบบบวก" : "ขั้วแบบลบ"}
      </text>
      <text x={232} y={86} fontSize={13}>
        V = Vp {add ? "+" : "−"} Vs
      </text>
      <text x={232} y={106} fontSize={14} fontWeight={700}>
        = {formatSI(s.Vtest, "V")}
      </text>
    </svg>
  );
}
