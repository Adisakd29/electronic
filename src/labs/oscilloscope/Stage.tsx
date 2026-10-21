/**
 * Oscilloscope screen (pure SVG, no hooks) — used by Lab.tsx and previewStage.
 * Every trace point comes from model.computeTraces(); nothing is decorative.
 * The screen keeps a dark CRT-like look in both themes (like a real DSO);
 * channels are told apart by colour AND by "CH1"/"CH2" labels and markers.
 */
import { formatSI } from "../shared/format";
import { computeTraces, DIVS_X, DIVS_Y, MINOR_PER_DIV, type Measurement, type OscilloscopeState } from "./model";

const D = 48; // px per division
const GX = 30;
const GY = 44;
const W = GX * 2 + DIVS_X * D; // 540
const GH = DIVS_Y * D; // 384

export const SCREEN = {
  bg: "#0b1720",
  grid: "#2c4656",
  axis: "#4f7286",
  text: "#d7e3ea",
  muted: "#8fa6b4",
  ch1: "#ffd43b",
  ch2: "#4dd4ff",
  cursor: "#ff9f6e",
  ok: "#4fd37d",
  warn: "#ffb020",
};

const X = (x: number) => GX + x * D;
const Y = (y: number) => GY + (DIVS_Y / 2 - y) * D;
const clampY = (y: number) => Math.max(-6, Math.min(6, y));
const edgeY = (y: number) => Math.max(-DIVS_Y / 2, Math.min(DIVS_Y / 2, y));

const chColor = (n: 1 | 2) => (n === 1 ? SCREEN.ch1 : SCREEN.ch2);

function measText(m: Measurement | null): string {
  if (!m) return "";
  if (m.clipped) return "Vpp ? · Vrms ? · f ? (ล้นจอ)";
  const f = Number.isFinite(m.freq) ? formatSI(m.freq, "Hz") : "—";
  return `Vpp ${formatSI(m.vpp, "V")} · Vrms ${formatSI(m.vrms, "V")} · f ${f}`;
}

export function ScopeStage({ s, rollPhase = 0.2 }: { s: OscilloscopeState; rollPhase?: number }) {
  const traces = computeTraces(s, rollPhase);
  const ch2on = s.ch2.source !== "off";
  const trigCh = s.trigger.source === 2 && ch2on ? s.ch2 : s.ch1;
  const trigN: 1 | 2 = s.trigger.source === 2 && ch2on ? 2 : 1;
  const trigY = trigCh.pos + s.trigger.level / trigCh.voltsDiv;
  const trigX = DIVS_X / 2 + s.hpos;

  const rows: { text: string; color: string }[] = [];
  const chLine = (n: 1 | 2) => {
    const c = n === 1 ? s.ch1 : s.ch2;
    return `CH${n} ${formatSI(c.voltsDiv, "V")}/div ${c.coupling} ×${c.probeMenu}`;
  };
  rows.push({ text: `${chLine(1)}${s.measureVisible ? " │ " + measText(s.meas1) : ""}`, color: SCREEN.ch1 });
  if (ch2on) rows.push({ text: `${chLine(2)}${s.measureVisible ? " │ " + measText(s.meas2) : ""}`, color: SCREEN.ch2 });
  if (s.cursors.on) {
    rows.push({
      text: `เคอร์เซอร์ CH${s.cursors.ch}: ΔV ${formatSI(s.cursor.dV, "V")}  Δt ${formatSI(s.cursor.dt, "s")}  1/Δt ${Number.isFinite(s.cursor.invDt) ? formatSI(s.cursor.invDt, "Hz") : "—"}`,
      color: SCREEN.cursor,
    });
  }
  const H = GY + GH + 14 + rows.length * 26 + 6;

  const clipId = "osc-clip";
  const minor: number[] = [];
  for (let i = 1; i < DIVS_X * MINOR_PER_DIV; i++) if (i % MINOR_PER_DIV) minor.push(i / MINOR_PER_DIV);
  const minorY: number[] = [];
  for (let i = 1; i < DIVS_Y * MINOR_PER_DIV; i++) if (i % MINOR_PER_DIV) minorY.push(i / MINOR_PER_DIV - DIVS_Y / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="presentation">
      <rect x={0} y={0} width={W} height={H} rx={10} fill={SCREEN.bg} />

      {/* status bar */}
      <g>
        <rect x={GX} y={8} width={84} height={26} rx={4} fill={s.triggered ? SCREEN.ok : SCREEN.warn} />
        <text x={GX + 42} y={27} fontSize={17} fontWeight={700} textAnchor="middle" fill="#0b1720">
          {s.triggered ? "Trig'd" : "Trig?"}
        </text>
        <text x={GX + 98} y={27} fontSize={17} fill={SCREEN.text}>
          {`H ${formatSI(s.timeDiv, "s")}/div`}
        </text>
        <text x={W - GX} y={27} fontSize={17} textAnchor="end" fill={SCREEN.text}>
          {`T CH${trigN} ${s.trigger.edge === "rising" ? "↑" : "↓"} ${formatSI(s.trigger.level, "V")}`}
        </text>
      </g>

      {/* graticule */}
      <rect x={GX} y={GY} width={DIVS_X * D} height={GH} fill="none" stroke={SCREEN.axis} strokeWidth={1.5} />
      {Array.from({ length: DIVS_X - 1 }, (_, i) => (
        <line key={`gx${i}`} x1={X(i + 1)} x2={X(i + 1)} y1={GY} y2={GY + GH} stroke={SCREEN.grid} strokeWidth={1} strokeDasharray={i + 1 === DIVS_X / 2 ? undefined : "2 3"} />
      ))}
      {Array.from({ length: DIVS_Y - 1 }, (_, i) => (
        <line key={`gy${i}`} x1={GX} x2={GX + DIVS_X * D} y1={GY + (i + 1) * D} y2={GY + (i + 1) * D} stroke={SCREEN.grid} strokeWidth={1} strokeDasharray={i + 1 === DIVS_Y / 2 ? undefined : "2 3"} />
      ))}
      {/* minor ticks on the centre axes (5 per division) */}
      <line x1={X(DIVS_X / 2)} x2={X(DIVS_X / 2)} y1={GY} y2={GY + GH} stroke={SCREEN.axis} strokeWidth={1.2} />
      <line x1={GX} x2={GX + DIVS_X * D} y1={Y(0)} y2={Y(0)} stroke={SCREEN.axis} strokeWidth={1.2} />
      {minor.map((x) => (
        <line key={`mx${x}`} x1={X(x)} x2={X(x)} y1={Y(0) - 4} y2={Y(0) + 4} stroke={SCREEN.axis} strokeWidth={1.2} />
      ))}
      {minorY.map((y) => (
        <line key={`my${y}`} x1={X(DIVS_X / 2) - 4} x2={X(DIVS_X / 2) + 4} y1={Y(y)} y2={Y(y)} stroke={SCREEN.axis} strokeWidth={1.2} />
      ))}

      <clipPath id={clipId}>
        <rect x={GX} y={GY} width={DIVS_X * D} height={GH} />
      </clipPath>

      {/* traces */}
      <g clipPath={`url(#${clipId})`}>
        {traces.map((t) =>
          t.band ? (
            <rect
              key={`b${t.ch}`}
              x={GX}
              width={DIVS_X * D}
              y={Y(clampY(t.band.top))}
              height={Math.max(2, Y(clampY(t.band.bottom)) - Y(clampY(t.band.top)))}
              fill={chColor(t.ch)}
              opacity={0.45}
            />
          ) : (
            t.lines.map((l, i) => (
              <path
                key={`t${t.ch}-${i}`}
                d={l.pts.map(([x, y], j) => `${j ? "L" : "M"}${X(x).toFixed(1)} ${Y(clampY(y)).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={chColor(t.ch)}
                strokeWidth={i === 0 ? 2.2 : 1.6}
                opacity={l.opacity}
                strokeLinejoin="round"
              />
            ))
          ),
        )}

        {/* cursors */}
        {s.cursors.on ? (
          <g stroke={SCREEN.cursor} strokeWidth={1.4} strokeDasharray="6 4">
            <line x1={X(s.cursors.x1)} x2={X(s.cursors.x1)} y1={GY} y2={GY + GH} />
            <line x1={X(s.cursors.x2)} x2={X(s.cursors.x2)} y1={GY} y2={GY + GH} />
            <line x1={GX} x2={GX + DIVS_X * D} y1={Y(s.cursors.y1)} y2={Y(s.cursors.y1)} />
            <line x1={GX} x2={GX + DIVS_X * D} y1={Y(s.cursors.y2)} y2={Y(s.cursors.y2)} />
          </g>
        ) : null}
        {s.cursors.on ? (
          <g fontSize={14} fill={SCREEN.cursor}>
            <text x={X(s.cursors.x1) + 3} y={GY + GH - 6}>X1</text>
            <text x={X(s.cursors.x2) + 3} y={GY + GH - 6}>X2</text>
            <text x={GX + DIVS_X * D - 4} y={Y(s.cursors.y1) - 4} textAnchor="end">Y1</text>
            <text x={GX + DIVS_X * D - 4} y={Y(s.cursors.y2) - 4} textAnchor="end">Y2</text>
          </g>
        ) : null}

        {/* trace labels (colour is not the only cue) */}
        {traces.map((t) => {
          const y0 = t.band ? t.band.top : t.lines[0]?.pts[Math.round(t.lines[0].pts.length * 0.06)]?.[1] ?? t.ground;
          const ly = Y(edgeY(clampY(y0))) + (y0 > DIVS_Y / 2 - 0.6 ? 22 : -8);
          return (
            <g key={`lab${t.ch}`}>
              <rect x={GX + 6} y={ly - 15} width={44} height={19} rx={3} fill={SCREEN.bg} opacity={0.8} />
              <text x={GX + 28} y={ly} fontSize={15} fontWeight={700} textAnchor="middle" fill={chColor(t.ch)}>
                {`CH${t.ch}`}
              </text>
            </g>
          );
        })}
      </g>

      {/* ground (0 V) markers on the left edge */}
      {traces.map((t) => {
        const y = Y(edgeY(t.ground));
        return (
          <g key={`g${t.ch}`}>
            <path d={`M${GX - 22} ${y - 9} L${GX - 4} ${y} L${GX - 22} ${y + 9} Z`} fill={chColor(t.ch)} />
            <text x={GX - 16} y={y + 5} fontSize={13} fontWeight={700} textAnchor="middle" fill="#0b1720">
              {t.ch}
            </text>
          </g>
        );
      })}

      {/* trigger level marker (right) and trigger position marker (top) */}
      <g>
        <path d={`M${W - GX + 22} ${Y(edgeY(trigY)) - 9} L${W - GX + 4} ${Y(edgeY(trigY))} L${W - GX + 22} ${Y(edgeY(trigY)) + 9} Z`} fill={SCREEN.cursor} />
        <text x={W - GX + 16} y={Y(edgeY(trigY)) + 5} fontSize={12} fontWeight={700} textAnchor="middle" fill="#0b1720">
          T
        </text>
        <path d={`M${X(trigX) - 8} ${GY - 9} L${X(trigX) + 8} ${GY - 9} L${X(trigX)} ${GY - 1} Z`} fill={SCREEN.cursor} />
      </g>

      {/* channel / measure rows */}
      {rows.map((r, i) => (
        <text key={i} x={GX} y={GY + GH + 30 + i * 26} fontSize={16} fill={r.color}>
          {r.text}
        </text>
      ))}
    </svg>
  );
}

/** Thai text description of the screen for screen readers. */
export function describeScreen(s: OscilloscopeState): string {
  const parts = [
    `จอออสซิลโลสโคป 10 × 8 ช่อง TIME/DIV ${formatSI(s.timeDiv, "s")} ต่อช่อง`,
    s.triggered ? "ทริกเกอร์ทำงาน ภาพนิ่ง" : "ไม่ทริกเกอร์ (Trig?) ภาพวิ่ง",
    `CH1 ${formatSI(s.ch1.voltsDiv, "V")} ต่อช่อง coupling ${s.ch1.coupling} สูง ${s.divsVertical.toFixed(2)} ช่อง เห็น ${s.cyclesOnScreen.toFixed(2)} รอบ${s.fullyOnScreen ? "" : " คลื่นล้นจอ"}`,
  ];
  if (s.ch2.source !== "off" && s.meas2) parts.push(`CH2 ${formatSI(s.ch2.voltsDiv, "V")} ต่อช่อง สูง ${s.meas2.divs.toFixed(2)} ช่อง`);
  return parts.join(" · ");
}
