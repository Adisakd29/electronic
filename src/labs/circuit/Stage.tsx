/**
 * Static SVG schematic of the DC circuit (no hooks → usable by previewStage).
 * Current-flow dots are dashed strokes on `[data-flow]` paths; Lab.tsx animates
 * their stroke-dashoffset using each path's `data-speed` (viewBox units/s).
 * Colours come only from CSS variables (fig-* tokens).
 */
import type { ReactNode } from "react";
import { formatSI } from "../shared/format";
import { flowSpeed, lampStatus, nodesFor, type NodeId, type Solution, type Topology } from "./model";

export const VIEW_W = 560;
export const VIEW_H = 332;
/** Extra height for the symptom banner (troubleshooting mission). */
export const SYMPTOM_H = 30;
export const DOT_GAP = 20;

const yT = 70;
const yB = 290;
const xBat = 56;
const xP = 82;
const swL = 104;
const swR = 150;
const xAm = 196;
const xA = 236;

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const BG = "var(--fig-bg)";
const DANGER = "var(--fig-danger)";
const CURRENT = "var(--fig-current)";

type Orient = "h" | "v";
interface Part {
  idx: 0 | 1 | 2;
  x: number;
  y: number;
  o: Orient;
}
interface Flow {
  id: string;
  d: string;
  I: number;
  /** arrow position + direction (unit vector) */
  arrow?: [number, number, number, number];
}
interface Layout {
  wires: string[];
  parts: Part[];
  nodes: Partial<Record<NodeId, [number, number, "up" | "down"]>>;
  junctions: [number, number][];
  flows: Flow[];
}

function layout(t: Topology, IR: number[], I: number): Layout {
  const loopStart = `M${xBat} ${yT + 100}`; // + plate
  switch (t) {
    case "single": {
      const x = 440;
      return {
        wires: [`M${xBat} ${yT + 100} V${yT} H${swL}`, `M${swR} ${yT} H${x} V${yB} H${xBat} V${yT + 116}`],
        parts: [{ idx: 0, x, y: (yT + yB) / 2, o: "v" }],
        nodes: { P: [xP, yT, "up"], A: [xA, yT, "up"], G: [xP, yB, "down"] },
        junctions: [],
        flows: [
          { id: "loop", d: `${loopStart} V${yT} H${x} V${yB} H${xBat} V${yT + 116}`, I, arrow: [330, yT, 1, 0] },
        ],
      };
    }
    case "series": {
      const xR = 500;
      return {
        wires: [`M${xBat} ${yT + 100} V${yT} H${swL}`, `M${swR} ${yT} H${xR} V${yB} H${xBat} V${yT + 116}`],
        parts: [
          { idx: 0, x: 305, y: yT, o: "h" },
          { idx: 1, x: xR, y: (yT + yB) / 2, o: "v" },
          { idx: 2, x: 305, y: yB, o: "h" },
        ],
        nodes: { P: [xP, yT, "up"], A: [xA, yT, "up"], B: [410, yT, "up"], C: [410, yB, "down"], G: [xP, yB, "down"] },
        junctions: [],
        flows: [
          { id: "loop", d: `${loopStart} V${yT} H${xR} V${yB} H${xBat} V${yT + 116}`, I, arrow: [440, yT, 1, 0] },
        ],
      };
    }
    case "parallel": {
      const xs = [280, 390, 500];
      return {
        wires: [
          `M${xBat} ${yT + 100} V${yT} H${swL}`,
          `M${swR} ${yT} H${xs[2]}`,
          `M${xs[2]} ${yB} H${xBat} V${yT + 116}`,
          ...xs.map((x) => `M${x} ${yT} V${yB}`),
        ],
        parts: xs.map((x, i) => ({ idx: i as 0 | 1 | 2, x, y: (yT + yB) / 2, o: "v" as const })),
        nodes: { P: [xP, yT, "up"], A: [xA, yT, "up"], G: [xP, yB, "down"] },
        junctions: [
          [xs[0], yT],
          [xs[1], yT],
          [xs[0], yB],
          [xs[1], yB],
        ],
        flows: [
          { id: "top", d: `${loopStart} V${yT} H${xs[0]}`, I },
          { id: "t12", d: `M${xs[0]} ${yT} H${xs[1]}`, I: IR[1] + IR[2], arrow: [(xs[0] + xs[1]) / 2, yT, 1, 0] },
          { id: "t23", d: `M${xs[1]} ${yT} H${xs[2]}`, I: IR[2], arrow: [(xs[1] + xs[2]) / 2, yT, 1, 0] },
          ...xs.map((x, i) => ({ id: `b${i}`, d: `M${x} ${yT} V${yB}`, I: IR[i], arrow: [x, 110, 0, 1] as [number, number, number, number] })),
          { id: "b32", d: `M${xs[2]} ${yB} H${xs[1]}`, I: IR[2] },
          { id: "b21", d: `M${xs[1]} ${yB} H${xs[0]}`, I: IR[1] + IR[2] },
          { id: "bot", d: `M${xs[0]} ${yB} H${xBat} V${yT + 116}`, I, arrow: [180, yB, -1, 0] },
        ],
      };
    }
    case "mixed": {
      const x2 = 400;
      const x3 = 500;
      return {
        wires: [
          `M${xBat} ${yT + 100} V${yT} H${swL}`,
          `M${swR} ${yT} H${x3} V${yB} H${xBat} V${yT + 116}`,
          `M${x2} ${yT} V${yB}`,
        ],
        parts: [
          { idx: 0, x: 300, y: yT, o: "h" },
          { idx: 1, x: x2, y: (yT + yB) / 2, o: "v" },
          { idx: 2, x: x3, y: (yT + yB) / 2, o: "v" },
        ],
        nodes: { P: [xP, yT, "up"], A: [xA, yT, "up"], B: [x2, yT, "up"], G: [xP, yB, "down"] },
        junctions: [
          [x2, yT],
          [x2, yB],
        ],
        flows: [
          { id: "top", d: `${loopStart} V${yT} H${x2}`, I },
          { id: "t23", d: `M${x2} ${yT} H${x3}`, I: IR[2], arrow: [(x2 + x3) / 2, yT, 1, 0] },
          { id: "b1", d: `M${x2} ${yT} V${yB}`, I: IR[1], arrow: [x2, 110, 0, 1] },
          { id: "b2", d: `M${x3} ${yT} V${yB}`, I: IR[2], arrow: [x3, 110, 0, 1] },
          { id: "b32", d: `M${x3} ${yB} H${x2}`, I: IR[2] },
          { id: "bot", d: `M${x2} ${yB} H${xBat} V${yT + 116}`, I, arrow: [180, yB, -1, 0] },
        ],
      };
    }
  }
}

function Arrow({ x, y, dx, dy }: { x: number; y: number; dx: number; dy: number }) {
  // chevron pointing along (dx, dy)
  const s = 8;
  const px = -dy;
  const py = dx;
  const tip = [x + dx * s, y + dy * s];
  const a = [x - dx * s + px * s, y - dy * s + py * s];
  const b = [x - dx * s - px * s, y - dy * s - py * s];
  return <path d={`M${a[0]} ${a[1]} L${tip[0]} ${tip[1]} L${b[0]} ${b[1]}`} fill="none" stroke={CURRENT} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />;
}

function Battery({ V, Vt }: { V: number; Vt: number }) {
  const yPlus = yT + 100;
  const yMinus = yT + 116;
  return (
    <g>
      <line x1={xBat - 24} x2={xBat + 24} y1={yPlus} y2={yPlus} stroke={INK} strokeWidth={3} />
      <line x1={xBat - 12} x2={xBat + 12} y1={yMinus} y2={yMinus} stroke={INK} strokeWidth={7} />
      <text x={xBat - 30} y={yPlus - 4} fontSize={20} fontWeight={700} textAnchor="end" fill="var(--fig-plus)">
        +
      </text>
      <text x={xBat - 30} y={yMinus + 16} fontSize={20} fontWeight={700} textAnchor="end" fill={INK}>
        −
      </text>
      <text x={xBat + 30} y={yPlus - 2} fontSize={16} fill={MUTED}>
        แหล่งจ่าย
      </text>
      <text x={xBat + 30} y={yMinus + 6} fontSize={19} fontWeight={700} fill={INK}>
        {formatSI(V, "V")}
      </text>
      {Math.abs(Vt - V) > 1e-9 ? (
        <text x={xBat + 30} y={yMinus + 28} fontSize={15} fill={DANGER}>
          ขั้ว {formatSI(Vt, "V")} (CC)
        </text>
      ) : null}
    </g>
  );
}

function Switch({ closed }: { closed: boolean }) {
  return (
    <g>
      <circle cx={swL} cy={yT} r={4.5} fill={BG} stroke={INK} strokeWidth={2.5} />
      <circle cx={swR} cy={yT} r={4.5} fill={BG} stroke={INK} strokeWidth={2.5} />
      {closed ? (
        <line x1={swL} y1={yT} x2={swR} y2={yT} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      ) : (
        <line x1={swL} y1={yT} x2={swR - 6} y2={yT - 26} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      )}
      <text x={(swL + swR) / 2} y={yT - 32} fontSize={17} fontWeight={700} textAnchor="middle" fill={INK}>
        S
      </text>
      <text x={(swL + swR) / 2} y={yT + 26} fontSize={15} fontWeight={700} textAnchor="middle" fill={closed ? "var(--fig-ok)" : DANGER}>
        {closed ? "ON" : "OFF"}
      </text>
    </g>
  );
}

function Ammeter({ I }: { I: number }) {
  return (
    <g>
      <circle cx={xAm} cy={yT} r={17} fill={BG} stroke={INK} strokeWidth={2.5} />
      <text x={xAm} y={yT + 6} fontSize={18} fontWeight={700} textAnchor="middle" fill={INK}>
        A
      </text>
      <text x={xAm} y={yT + 40} fontSize={16} fontWeight={700} textAnchor="middle" fill={CURRENT}>
        {formatSI(I, "A")}
      </text>
    </g>
  );
}

function ResistorPart({
  p,
  name,
  value,
  fault,
}: {
  p: Part;
  name: string;
  value: string;
  fault: "open" | "short" | null;
}) {
  const L = 76;
  const Wd = 26;
  const h = p.o === "h";
  const x = h ? p.x - L / 2 : p.x - Wd / 2;
  const y = h ? p.y - Wd / 2 : p.y - L / 2;
  const w = h ? L : Wd;
  const hh = h ? Wd : L;
  const below = p.y < (yT + yB) / 2; // top wire → label below; bottom → above
  return (
    <g>
      <rect x={x} y={y} width={w} height={hh} fill={BG} stroke={fault === "open" ? DANGER : INK} strokeWidth={2.5} strokeDasharray={fault === "open" ? "6 4" : undefined} />
      {fault === "open" ? (
        <g stroke={DANGER} strokeWidth={3.5} strokeLinecap="round">
          <line x1={p.x - 9} y1={p.y - 9} x2={p.x + 9} y2={p.y + 9} />
          <line x1={p.x - 9} y1={p.y + 9} x2={p.x + 9} y2={p.y - 9} />
        </g>
      ) : null}
      {fault === "short" ? (
        h ? (
          <path
            d={below ? `M${x - 4} ${p.y} C${x - 4} ${p.y - 42}, ${x + w + 4} ${p.y - 42}, ${x + w + 4} ${p.y}` : `M${x - 4} ${p.y} C${x - 4} ${p.y + 42}, ${x + w + 4} ${p.y + 42}, ${x + w + 4} ${p.y}`}
            fill="none"
            stroke={DANGER}
            strokeWidth={3.5}
          />
        ) : (
          <path d={`M${p.x} ${y - 6} H${p.x + 22} V${y + hh + 6} H${p.x}`} fill="none" stroke={DANGER} strokeWidth={3.5} strokeLinejoin="round" />
        )
      ) : null}
      {h ? (
        <text x={p.x} y={below ? p.y + 36 : p.y - 22} fontSize={16} textAnchor="middle" fill={INK}>
          <tspan fontWeight={700}>{name}</tspan> {value}
        </text>
      ) : (
        <>
          <text x={p.x - 20} y={p.y - 6} fontSize={17} fontWeight={700} textAnchor="end" fill={INK}>
            {name}
          </text>
          <text x={p.x - 20} y={p.y + 15} fontSize={16} textAnchor="end" fill={INK}>
            {value}
          </text>
        </>
      )}
      {fault ? <FaultTag p={p} kind={fault} /> : null}
    </g>
  );
}

function FaultTag({ p, kind }: { p: Part; kind: "open" | "short" }) {
  const label = kind === "open" ? "ขาด (open)" : "ลัด (short)";
  if (p.o === "h") {
    const below = p.y < (yT + yB) / 2;
    return (
      <text x={p.x} y={below ? p.y - 36 : p.y - 46} fontSize={15} fontWeight={700} textAnchor="middle" fill={DANGER}>
        {label}
      </text>
    );
  }
  return (
    <text x={p.x - 20} y={p.y + 36} fontSize={15} fontWeight={700} textAnchor="end" fill={DANGER}>
      {kind === "open" ? "ขาด" : "ลัด"}
    </text>
  );
}

function Lamp({ p, brightness, overload, fault }: { p: Part; brightness: number; overload: boolean; fault: "open" | "short" | null }) {
  const r = 20;
  const glowR = r + 4 + 16 * brightness;
  const h = p.o === "h";
  const k = r * Math.SQRT1_2;
  return (
    <g>
      {brightness > 0.005 ? (
        <>
          <circle cx={p.x} cy={p.y} r={glowR} fill="var(--fig-glow)" opacity={0.25 + 0.55 * brightness} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4 + Math.PI / 8;
            const r1 = r + 6;
            const r2 = r + 8 + 12 * brightness;
            return (
              <line
                key={i}
                x1={p.x + r1 * Math.cos(a)}
                y1={p.y + r1 * Math.sin(a)}
                x2={p.x + r2 * Math.cos(a)}
                y2={p.y + r2 * Math.sin(a)}
                stroke="var(--fig-warn)"
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={Math.min(1, 0.3 + brightness)}
              />
            );
          })}
        </>
      ) : null}
      <circle cx={p.x} cy={p.y} r={r} fill={BG} stroke={overload || fault === "open" ? DANGER : INK} strokeWidth={2.5} strokeDasharray={fault === "open" ? "6 4" : undefined} />
      <g stroke={fault === "open" ? DANGER : INK} strokeWidth={2.5}>
        <line x1={p.x - k} y1={p.y - k} x2={p.x + k} y2={p.y + k} />
        <line x1={p.x - k} y1={p.y + k} x2={p.x + k} y2={p.y - k} />
      </g>
      {fault === "short" ? (
        h ? (
          <path d={`M${p.x - r - 6} ${p.y} C${p.x - r - 6} ${p.y - 50}, ${p.x + r + 6} ${p.y - 50}, ${p.x + r + 6} ${p.y}`} fill="none" stroke={DANGER} strokeWidth={3.5} />
        ) : (
          <path d={`M${p.x} ${p.y - r - 8} H${p.x + r + 10} V${p.y + r + 8} H${p.x}`} fill="none" stroke={DANGER} strokeWidth={3.5} strokeLinejoin="round" />
        )
      ) : null}
      {h ? (
        <text x={p.x} y={p.y + 54} fontSize={16} textAnchor="middle" fill={INK}>
          <tspan fontWeight={700}>หลอด</tspan> 12 V 6 W
        </text>
      ) : (
        <>
          <text x={p.x - 46} y={p.y - 6} fontSize={17} fontWeight={700} textAnchor="end" fill={INK}>
            หลอด (R1)
          </text>
          <text x={p.x - 46} y={p.y + 15} fontSize={16} textAnchor="end" fill={INK}>
            12 V 6 W
          </text>
        </>
      )}
      {overload ? (
        <text x={h ? p.x : p.x - 46} y={h ? p.y + 74 : p.y + 36} fontSize={15} fontWeight={700} textAnchor={h ? "middle" : "end"} fill={DANGER}>
          เกินพิกัด!
        </text>
      ) : null}
      {fault ? (
        <text x={h ? p.x : p.x - 46} y={h ? p.y - 40 : p.y + 36} fontSize={15} fontWeight={700} textAnchor={h ? "middle" : "end"} fill={DANGER}>
          {fault === "open" ? "ขาด (open)" : "ลัด (short)"}
        </text>
      ) : null}
    </g>
  );
}

export interface StageProps {
  sol: Solution;
  faultHidden: boolean;
  probes?: { red: NodeId; black: NodeId };
  /** Show the flow dots (always drawn; Lab animates them). */
  dots?: boolean;
  title?: string;
  /** Symptom line drawn on the stage while a fault is hidden (troubleshooting mission). */
  symptom?: string | null;
}

export function CircuitStage({ sol, faultHidden, probes, dots = true, title, symptom }: StageProps): ReactNode {
  const s = sol.state;
  const L = layout(s.topology, s.IR, s.I);
  const n = s.topology === "single" ? 1 : 3;
  const fault = s.fault;
  const faultAt = (i: number): "open" | "short" | null => {
    if (faultHidden || fault === "none") return null;
    if (Number(fault.slice(-1)) - 1 !== i) return null;
    return fault.startsWith("open") ? "open" : "short";
  };
  const lamp = lampStatus(s);
  const avail = nodesFor(s.topology);
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + (symptom ? SYMPTOM_H : 0)}`} className="block h-auto w-full" role="presentation" aria-hidden="true">
      {title ? <title>{title}</title> : null}
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H + (symptom ? SYMPTOM_H : 0)} fill={BG} />
      {L.wires.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      {L.junctions.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4.5} fill={INK} />
      ))}
      {/* conventional-current dots (+ → load → −) */}
      {dots
        ? L.flows.map((f) => {
            const v = flowSpeed(f.I, s.I);
            return v > 0 ? (
              <path
                key={f.id}
                data-flow={f.id}
                data-speed={v.toFixed(3)}
                d={f.d}
                fill="none"
                stroke={CURRENT}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`0 ${DOT_GAP}`}
                opacity={0.9}
              />
            ) : null;
          })
        : null}
      {L.flows.map((f) =>
        f.arrow && f.I > 1e-12 ? <Arrow key={`a${f.id}`} x={f.arrow[0]} y={f.arrow[1]} dx={f.arrow[2]} dy={f.arrow[3]} /> : null,
      )}
      <Battery V={s.V} Vt={sol.Vt} />
      <Switch closed={s.switchClosed} />
      <Ammeter I={s.I} />
      {L.parts.slice(0, n).map((p) =>
        p.idx === 0 && s.lamp ? (
          <Lamp key={p.idx} p={p} brightness={lamp.brightness} overload={lamp.overload} fault={faultAt(0)} />
        ) : (
          <ResistorPart key={p.idx} p={p} name={`R${p.idx + 1}`} value={formatSI(s.R[p.idx], "Ω")} fault={faultAt(p.idx)} />
        ),
      )}
      {/* measurement nodes */}
      {avail.map((id) => {
        const pos = L.nodes[id];
        if (!pos) return null;
        const [x, y, side] = pos;
        const isRed = probes?.red === id;
        const isBlack = probes?.black === id;
        return (
          <g key={id}>
            {isRed ? <circle cx={x} cy={y} r={10} fill="none" stroke="var(--fig-plus)" strokeWidth={3} /> : null}
            {isBlack ? <circle cx={x} cy={y} r={isRed ? 14 : 10} fill="none" stroke="var(--fig-minus)" strokeWidth={3} strokeDasharray="4 3" /> : null}
            <circle cx={x} cy={y} r={4.5} fill={BG} stroke={INK} strokeWidth={2} />
            <text x={x} y={side === "up" ? y - 16 : y + 28} fontSize={16} fontWeight={700} textAnchor="middle" fill={MUTED}>
              {id}
              {isRed ? <tspan fill="var(--fig-plus)">(+)</tspan> : null}
              {isBlack ? <tspan fill={INK}>(COM)</tspan> : null}
            </text>
          </g>
        );
      })}
      {sol.shorted ? (
        <text x={VIEW_W - 8} y={VIEW_H - 8} fontSize={15} fontWeight={700} textAnchor="end" fill={DANGER}>
          ลัดวงจร – จำกัดกระแส 3 A
        </text>
      ) : null}
      {symptom ? (
        <g transform={`translate(0 ${VIEW_H})`}>
          <rect x={6} y={2} width={VIEW_W - 12} height={SYMPTOM_H - 6} rx={4} fill={BG} stroke="var(--fig-warn)" strokeWidth={1.5} />
          <text x={14} y={20} fontSize={13.5} fontWeight={700} fill={INK}>
            อาการ: <tspan fontWeight={400}>{symptom.length > 72 ? symptom.slice(0, 70) + "…" : symptom}</tspan>
          </text>
        </g>
      ) : null}
    </svg>
  );
}
