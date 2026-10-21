/**
 * Static SVG drawings for the capacitor lab (no hooks → usable by previewStage).
 */
import { formatSI } from "../shared/format";
import type { ComboResult, RcMode } from "./model";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const WIRE = { stroke: INK, strokeWidth: 2.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.5} fill={INK} />;
}

/** Battery, + on top, centred at (x, y). */
function Battery({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 20} x2={x + 20} y1={y - 7} y2={y - 7} stroke={INK} strokeWidth={3} />
      <line x1={x - 10} x2={x + 10} y1={y + 7} y2={y + 7} stroke={INK} strokeWidth={5} />
      <text x={x + 24} y={y - 12} fontSize={16} fontWeight={700} fill="var(--fig-plus)">
        +
      </text>
      <text x={x + 24} y={y + 20} fontSize={16} fontWeight={700} fill="var(--fig-minus)">
        −
      </text>
    </g>
  );
}

/** Resistor — IEC 60617 rectangle between x1 and x2 on row y. */
function ResistorH({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return <rect x={x1} y={y - 8} width={x2 - x1} height={16} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.5} />;
}

/**
 * Polarised (electrolytic) capacitor. orient "v": current flows vertically,
 * + plate on top (straight), − plate below (curved). orient "h": + plate on the left.
 */
function Cap({ x, y, orient, fill = 0, label }: { x: number; y: number; orient: "v" | "h"; fill?: number; label?: string }) {
  const g = 8; // half gap
  const half = 22;
  const op = 0.12 + 0.7 * Math.min(1, Math.max(0, fill));
  if (orient === "v")
    return (
      <g>
        <rect x={x - half + 2} y={y - g + 2} width={half * 2 - 4} height={g * 2 - 4} fill="var(--fig-accent)" opacity={op} />
        <line x1={x - half} x2={x + half} y1={y - g} y2={y - g} stroke={INK} strokeWidth={3.5} />
        <path d={`M${x - half} ${y + g + 6} Q${x} ${y + g - 4} ${x + half} ${y + g + 6}`} stroke={INK} strokeWidth={3.5} fill="none" />
        <text x={x + half + 4} y={y - g - 4} fontSize={16} fontWeight={700} fill="var(--fig-plus)">
          +
        </text>
        {label ? (
          <text x={x - half - 8} y={y + 5} fontSize={15} textAnchor="end" fill={INK}>
            {label}
          </text>
        ) : null}
      </g>
    );
  return (
    <g>
      <rect x={x - g + 2} y={y - half + 2} width={g * 2 - 4} height={half * 2 - 4} fill="var(--fig-accent)" opacity={op} />
      <line x1={x - g} x2={x - g} y1={y - half} y2={y + half} stroke={INK} strokeWidth={3.5} />
      <path d={`M${x + g + 6} ${y - half} Q${x + g - 4} ${y} ${x + g + 6} ${y + half}`} stroke={INK} strokeWidth={3.5} fill="none" />
      <text x={x - g - 14} y={y - half + 2} fontSize={16} fontWeight={700} fill="var(--fig-plus)">
        +
      </text>
    </g>
  );
}

function Arrow({ x, y, dir, color }: { x: number; y: number; dir: 1 | -1; color: string }) {
  const L = 34;
  const x1 = x - (dir * L) / 2;
  const x2 = x + (dir * L) / 2;
  return (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={color} strokeWidth={3} />
      <path d={`M${x2} ${y} L${x2 - dir * 10} ${y - 6} L${x2 - dir * 10} ${y + 6} Z`} fill={color} />
    </g>
  );
}

export interface RcStageProps {
  V: number;
  R: number;
  C: number;
  mode: RcMode;
  t: number;
  tau: number;
  vc: number;
  ic: number;
  rating: number;
}

export function RcStage(p: RcStageProps) {
  const yTop = 50;
  const yBot = 230;
  const xB = 90; // battery
  const xS = 210; // switch contacts
  const piv = { x: 280, y: 90 };
  const xC = 470;
  const yC = 158;
  const contact = p.mode === "charge" ? { x: xS, y: yTop } : { x: xS, y: 130 };
  const iAbs = Math.abs(p.ic);
  const flowing = iAbs > 1e-9 && iAbs >= (p.V / p.R) * 1e-4;
  const over = p.V > p.rating;
  const n = p.t / p.tau;
  return (
    <svg viewBox="0 0 600 270" className="block h-auto w-full" role="img" aria-label="วงจร RC: แหล่งจ่าย สวิตช์สองทาง ตัวต้านทาน และตัวเก็บประจุ">
      {/* source branch */}
      <path d={`M${xB} ${yTop} L${xS} ${yTop}`} {...WIRE} />
      <path d={`M${xB} ${yTop} L${xB} ${142 - 7}`} {...WIRE} />
      <path d={`M${xB} ${142 + 7} L${xB} ${yBot}`} {...WIRE} />
      <Battery x={xB} y={142} />
      <text x={xB - 26} y={147} fontSize={16} textAnchor="end" fill={INK}>
        {formatSI(p.V, "V")}
      </text>
      {/* switch */}
      <path d={`M${xS} 130 L${xS} ${yBot}`} {...WIRE} />
      <circle cx={xS} cy={yTop} r={5} fill="var(--fig-bg)" stroke={INK} strokeWidth={2} />
      <circle cx={xS} cy={130} r={5} fill="var(--fig-bg)" stroke={INK} strokeWidth={2} />
      <text x={xS} y={yTop - 14} fontSize={14} textAnchor="middle" fill={p.mode === "charge" ? "var(--fig-accent)" : MUTED} fontWeight={p.mode === "charge" ? 700 : 400}>
        ประจุ
      </text>
      <text x={xS - 12} y={152} fontSize={14} textAnchor="end" fill={p.mode === "discharge" ? "var(--fig-accent)" : MUTED} fontWeight={p.mode === "discharge" ? 700 : 400}>
        คายประจุ
      </text>
      <line x1={piv.x} y1={piv.y} x2={contact.x + 4} y2={contact.y + (p.mode === "charge" ? 2 : -2)} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Dot x={piv.x} y={piv.y} />
      <text x={piv.x} y={piv.y + 26} fontSize={13} textAnchor="middle" fill={MUTED}>
        S
      </text>
      {/* resistor + capacitor */}
      <path d={`M${piv.x} ${piv.y} L310 ${piv.y}`} {...WIRE} />
      <ResistorH x1={310} x2={390} y={piv.y} />
      <text x={350} y={piv.y - 18} fontSize={15} textAnchor="middle" fill={INK}>
        R = {formatSI(p.R, "Ω")}
      </text>
      <path d={`M390 ${piv.y} L${xC} ${piv.y} L${xC} ${yC - 8}`} {...WIRE} />
      <path d={`M${xC} ${yC + 10} L${xC} ${yBot}`} {...WIRE} />
      <Cap x={xC} y={yC} orient="v" fill={p.V > 0 ? p.vc / p.V : 0} label={`C = ${formatSI(p.C, "F")}`} />
      <text x={xC - 30} y={yC + 24} fontSize={13} textAnchor="end" fill={over ? "var(--fig-danger)" : MUTED} fontWeight={over ? 700 : 400}>
        {over ? `⚠ เกินพิกัด ${formatSI(p.rating, "V")}` : `พิกัด ${formatSI(p.rating, "V")} (มีขั้ว)`}
      </text>
      {/* current arrow */}
      {flowing ? (
        <>
          <Arrow x={430} y={piv.y + 20} dir={p.ic > 0 ? 1 : -1} color="var(--fig-current)" />
          <text x={430} y={piv.y + 44} fontSize={14} textAnchor="middle" fill="var(--fig-current)">
            i = {formatSI(iAbs, "A")}
          </text>
        </>
      ) : (
        <text x={430} y={piv.y + 30} fontSize={14} textAnchor="middle" fill={MUTED}>
          i ≈ 0
        </text>
      )}
      {/* bottom rail (0 V) */}
      <path d={`M${xB} ${yBot} L${xC} ${yBot}`} {...WIRE} />
      <Dot x={xS} y={yBot} />
      <Dot x={xC} y={yBot} />
      <text x={(xB + xS) / 2} y={yBot + 20} fontSize={13} textAnchor="middle" fill={MUTED}>
        0 V
      </text>
      {/* voltmeter across C */}
      <path d={`M${xC} 118 L550 118 L550 ${yC - 24}`} stroke={MUTED} strokeWidth={1.8} fill="none" />
      <path d={`M550 ${yC + 24} L550 ${yBot} L${xC} ${yBot}`} stroke={MUTED} strokeWidth={1.8} fill="none" />
      <Dot x={xC} y={118} />
      <circle cx={550} cy={yC} r={24} fill="var(--fig-bg)" stroke={INK} strokeWidth={2.2} />
      <text x={550} y={yC + 6} fontSize={18} fontWeight={700} textAnchor="middle" fill={INK}>
        V
      </text>
      <text x={550} y={yBot + 22} fontSize={16} fontWeight={700} textAnchor="middle" fill="var(--fig-accent)">
        v<tspan fontSize={12} dy={4}>C</tspan><tspan dy={-4}> = {formatSI(p.vc, "V")}</tspan>
      </text>
      {/* time */}
      <text x={590} y={22} fontSize={14} textAnchor="end" fill={MUTED}>
        t = {formatSI(p.t, "s")} ({n.toFixed(2)}τ) · τ = {formatSI(p.tau, "s")}
      </text>
    </svg>
  );
}

export function ComboStage({ combo, V, rating }: { combo: ComboResult; V: number; rating: number }) {
  const yTop = 60;
  const yBot = 222;
  const xB = 70;
  const xR = 560;
  const n = combo.C.length;
  const vColor = (v: number) => (v > rating ? "var(--fig-danger)" : "var(--fig-accent)");
  const title = combo.type === "series" ? "ต่ออนุกรม" : "ต่อขนาน";
  return (
    <svg viewBox="0 0 600 270" className="block h-auto w-full" role="img" aria-label={`ตัวเก็บประจุ ${n} ตัว${title}กับแหล่งจ่าย`}>
      <Battery x={xB} y={142} />
      <text x={xB - 24} y={180} fontSize={15} textAnchor="middle" fill={INK}>
        {formatSI(V, "V")}
      </text>
      <path d={`M${xB} ${142 - 7} L${xB} ${yTop} L${combo.type === "series" ? xR : 160 + (n - 1) * 140} ${yTop}`} {...WIRE} />
      <path d={`M${xB} ${142 + 7} L${xB} ${yBot} L${combo.type === "series" ? xR : 160 + (n - 1) * 140} ${yBot}`} {...WIRE} />
      {combo.type === "series" ? (
        <>
          <path d={`M${xR} ${yTop} L${xR} ${yBot}`} {...WIRE} />
          {combo.C.map((c, i) => {
            const x = 140 + ((i + 0.5) * (xR - 140 - 20)) / n;
            return (
              <g key={i}>
                <rect x={x - 16} y={yTop - 26} width={32} height={52} fill="var(--fig-bg)" />
                <Cap x={x} y={yTop} orient="h" fill={combo.Vk[i] / V} />
                <text x={x} y={yTop + 50} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK}>
                  C{i + 1} = {formatSI(c, "F")}
                </text>
                <text x={x} y={yTop + 72} fontSize={15} textAnchor="middle" fill={vColor(combo.Vk[i])} fontWeight={700}>
                  V{i + 1} = {formatSI(combo.Vk[i], "V")}
                  {combo.Vk[i] > rating ? " ⚠" : ""}
                </text>
                <text x={x} y={yTop + 92} fontSize={14} textAnchor="middle" fill={MUTED}>
                  Q = {formatSI(combo.Q[i], "C")}
                </text>
              </g>
            );
          })}
        </>
      ) : (
        combo.C.map((c, i) => {
          const x = 160 + i * 140;
          const yc = 140;
          return (
            <g key={i}>
              <path d={`M${x} ${yTop} L${x} ${yc - 8}`} {...WIRE} />
              <path d={`M${x} ${yc + 10} L${x} ${yBot}`} {...WIRE} />
              <Dot x={x} y={yTop} />
              <Dot x={x} y={yBot} />
              <Cap x={x} y={yc} orient="v" fill={combo.Vk[i] / V} />
              <text x={x + 42} y={yc - 26} fontSize={15} fontWeight={700} fill={INK}>
                C{i + 1}
              </text>
              <text x={x + 42} y={yc - 8} fontSize={14} fill={INK}>
                {formatSI(c, "F")}
              </text>
              <text x={x + 42} y={yc + 22} fontSize={14} fill={vColor(combo.Vk[i])} fontWeight={700}>
                {formatSI(combo.Vk[i], "V")}
              </text>
              <text x={x + 42} y={yc + 40} fontSize={13} fill={MUTED}>
                Q = {formatSI(combo.Q[i], "C")}
              </text>
            </g>
          );
        })
      )}
      <text x={300} y={258} fontSize={17} fontWeight={700} textAnchor="middle" fill={INK}>
        {title}: C_eq = {formatSI(combo.Ceq, "F", 4)} · Q รวม = {formatSI(combo.Qtotal, "C")}
      </text>
    </svg>
  );
}
