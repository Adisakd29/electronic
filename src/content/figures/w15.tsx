import type { ReactNode } from "react";
import type { FigureMap } from "@/content/types";
import { Label, Arrow, Wire, Node, Resistor, Battery, SwitchSym, Capacitor, Diode, Callout } from "./kit";

const INK = "var(--fig-ink)";
const BG = "var(--fig-bg)";
const PANEL = "var(--fig-panel)";
const MUTED = "var(--fig-muted)";
const CU = "var(--fig-copper)";
const CU_SOFT = "var(--fig-copper-soft)";
const OK = "var(--fig-ok)";
const DANGER = "var(--fig-danger)";
const WARN = "var(--fig-warn)";
const ACCENT = "var(--fig-accent)";
const SOLDER = "var(--fig-grid)";

type Pt = [number, number];

// ---------------------------------------------------------------------------
// Shared schematic helpers
// ---------------------------------------------------------------------------
/** NPN BJT whose base can face left or right. (x, y): collector/emitter line x, base y.
 *  Collector end (x, y−40), emitter end (x, y+40), base terminal (x ± 60, y). */
function Bjt({ x, y, face = "left" }: { x: number; y: number; face?: "left" | "right" }) {
  const s = face === "left" ? -1 : 1;
  const bar = x + 26 * s;
  const base = x + 60 * s;
  return (
    <g>
      <circle cx={x + 14 * s} cy={y} r={30} fill={BG} stroke={INK} strokeWidth={2.5} />
      <line x1={base} y1={y} x2={bar} y2={y} stroke={INK} strokeWidth={3} />
      <line x1={bar} y1={y - 18} x2={bar} y2={y + 18} stroke={INK} strokeWidth={4} />
      <line x1={bar} y1={y - 8} x2={x} y2={y - 26} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y - 26} x2={x} y2={y - 40} stroke={INK} strokeWidth={3} />
      <line x1={bar} y1={y + 8} x2={x} y2={y + 26} stroke={INK} strokeWidth={3} />
      <line x1={x} y1={y + 26} x2={x} y2={y + 40} stroke={INK} strokeWidth={3} />
      <path d={`M ${x} ${y + 26} l ${12 * s} -1 l ${-5 * s} -8 z`} fill={INK} />
      <Label x={base - 10 * s} y={y + 22} size={20} muted>B</Label>
      <Label x={x - 16 * s} y={y - 34} size={20} muted>C</Label>
      <Label x={x - 16 * s} y={y + 34} size={20} muted>E</Label>
    </g>
  );
}

/** Test point marker (small ring with a tag). */
function TP({ x, y, label, lx, ly, anchor = "middle" }: { x: number; y: number; label: string; lx: number; ly: number; anchor?: "start" | "middle" | "end" }) {
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill={BG} stroke={ACCENT} strokeWidth={3} />
      <Label x={lx} y={ly} size={20} weight={700} anchor={anchor} color={ACCENT}>
        {label}
      </Label>
    </g>
  );
}

// ---------------------------------------------------------------------------
// F01 Kit schematic (two-transistor astable, IEC symbols) with TP1–TP6
// ---------------------------------------------------------------------------
function KitSchematic() {
  const A = 140; // Q1 collector column
  const B = 245; // R2 column (Q1 base)
  const C = 355; // R3 column (Q2 base)
  const D = 460; // Q2 collector column
  const top = 60;
  const gnd = 440;
  return (
    <svg viewBox="0 0 600 480" aria-hidden="true">
      {/* rails */}
      <Wire points={[[30, 160], [30, top], [D, top]]} />
      <Wire points={[[30, 370], [30, gnd], [D, gnd]]} />
      <Label x={520} y={top} size={22} weight={700} anchor="start" color="var(--fig-plus)">+9 V</Label>
      <Label x={520} y={gnd} size={22} weight={700} anchor="start">0 V</Label>
      {/* switch + battery */}
      <SwitchSym x={30} y={200} angle={90} closed label="S1" />
      <Wire points={[[30, 240], [30, 310]]} />
      <Battery x={30} y={340} angle={90} label="B1" value="9 V" />
      {/* left branch: R1 → LED1 → Q1 */}
      <Wire points={[[A, top], [A, 70]]} />
      <Resistor x={A} y={110} angle={90} label="R1" value="470 Ω" labelSide="b" />
      <Wire points={[[A, 150], [A, 180]]} />
      <Diode x={A} y={210} angle={90} kind="led" lit />
      <Label x={178} y={198} size={20} anchor="start">LED1</Label>
      <Label x={178} y={224} size={20} anchor="start" muted>แดง</Label>
      <Wire points={[[A, 240], [A, 320]]} />
      <Bjt x={A} y={360} face="right" />
      <Wire points={[[A, 400], [A, gnd]]} />
      {/* right branch: R4 → LED2 → Q2 */}
      <Wire points={[[D, top], [D, 70]]} />
      <Resistor x={D} y={110} angle={90} label="R4" value="470 Ω" />
      <Wire points={[[D, 150], [D, 180]]} />
      <Diode x={D} y={210} angle={90} kind="led" />
      <Label x={422} y={198} size={20} anchor="end">LED2</Label>
      <Label x={422} y={224} size={20} anchor="end" muted>แดง</Label>
      <Wire points={[[D, 240], [D, 320]]} />
      <Bjt x={D} y={360} face="left" />
      <Wire points={[[D, 400], [D, gnd]]} />
      {/* base resistors */}
      <Wire points={[[B, top], [B, 110]]} />
      <Resistor x={B} y={150} angle={90} label="R2" value="47 kΩ" labelSide="b" />
      <Wire points={[[B, 190], [B, 360], [200, 360]]} />
      <Wire points={[[C, top], [C, 110]]} />
      <Resistor x={C} y={150} angle={90} label="R3" value="47 kΩ" />
      <Wire points={[[C, 190], [C, 360], [400, 360]]} />
      {/* cross-coupling capacitors: + to the collector */}
      <Wire points={[[A, 255], [270, 255]]} />
      <Capacitor x={300} y={255} polarized label="C1" value="10 µF" />
      <Wire points={[[330, 255], [C, 255]]} />
      <Wire points={[[D, 305], [330, 305]]} />
      <Capacitor x={300} y={305} angle={180} polarized label="C2" value="10 µF" labelSide="b" />
      <Wire points={[[270, 305], [B, 305]]} />
      {[[A, top], [B, top], [C, top], [A, 255], [C, 255], [D, 305], [B, 305], [A, gnd], [D, gnd]].map(([x, y]) => (
        <Node key={`${x}-${y}`} x={x} y={y} />
      ))}
      {/* transistor names */}
      <Label x={150} y={416} size={20} anchor="start">Q1 BC547</Label>
      <Label x={450} y={416} size={20} anchor="end">Q2 BC547</Label>
      {/* test points */}
      <TP x={300} y={top} label="TP1" lx={300} ly={32} />
      <TP x={300} y={gnd} label="TP2" lx={300} ly={466} />
      <TP x={A} y={290} label="TP3" lx={122} ly={290} anchor="end" />
      <TP x={B} y={360} label="TP4" lx={B} ly={390} />
      <TP x={C} y={360} label="TP5" lx={C} ly={390} />
      <TP x={D} y={280} label="TP6" lx={478} ly={280} anchor="start" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Board geometry (component-side coordinates, viewBox 600×400)
// ---------------------------------------------------------------------------
const TRACES: string[] = [
  "M 50 110 L 50 40 L 500 40", // VCC bus from S1
  "M 100 40 L 100 65",
  "M 210 40 L 210 65",
  "M 390 40 L 390 65",
  "M 500 40 L 500 65",
  "M 50 160 L 50 220", // S1 → J1+
  "M 50 270 L 50 365 L 410 365", // GND bus
  "M 130 290 L 130 365",
  "M 410 290 L 410 365",
  "M 210 135 L 210 165", // R1 → LED1 A
  "M 500 135 L 500 165", // R4 → LED2 A
  "M 210 195 L 210 250 L 190 270 L 190 290", // N1: LED1 K → Q1 C
  "M 210 220 L 270 220", // N1 → C1 +
  "M 100 135 L 100 335", // N2: R2 → W1a
  "M 100 255 L 160 255 L 160 290", // N2 → Q1 B
  "M 390 135 L 390 255 L 440 255 L 440 290", // N4: R3 → Q2 B
  "M 310 220 L 390 220", // C1 − → N4
  "M 500 195 L 500 250 L 470 270 L 470 290", // N3: LED2 K → Q2 C
  "M 530 335 L 560 335 L 560 250 L 500 250", // C2 + → N3
  "M 440 335 L 490 335", // W1b → C2 −
];

const PADS: Pt[] = [
  [50, 110], [50, 160], // S1
  [50, 220], [50, 270], // J1 + / −
  [100, 65], [100, 135], // R2
  [210, 65], [210, 135], // R1
  [390, 65], [390, 135], // R3
  [500, 65], [500, 135], // R4
  [210, 165], [210, 195], // LED1 A K
  [500, 165], [500, 195], // LED2 A K
  [130, 290], [160, 290], [190, 290], // Q1 E B C
  [410, 290], [440, 290], [470, 290], // Q2 E B C
  [270, 220], [310, 220], // C1 + −
  [490, 335], [530, 335], // C2 − +
  [100, 335], [440, 335], // W1 a b
];

function Board({ children, h = 400 }: { children?: ReactNode; h?: number }) {
  return (
    <g>
      <rect x={20} y={20} width={560} height={h - 40} rx={14} fill={PANEL} stroke={INK} strokeWidth={3} />
      {children}
    </g>
  );
}

/** Copper traces + pads in component-side coordinates. */
function Copper({ holes = true, skipTrace }: { holes?: boolean; skipTrace?: number }) {
  return (
    <g>
      {TRACES.map((d, i) =>
        i === skipTrace ? null : (
          <path key={i} d={d} fill="none" stroke={CU} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        ),
      )}
      {PADS.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={11} fill={CU} />
          {holes ? <circle cx={x} cy={y} r={3.5} fill={BG} /> : null}
        </g>
      ))}
    </g>
  );
}

/** Silkscreen part outlines; flags let some parts be drawn "inserted wrong". */
function SilkOutline() {
  const s = { fill: "none", stroke: INK, strokeWidth: 2 } as const;
  return (
    <g>
      {/* resistors */}
      {[100, 210, 390, 500].map((x) => (
        <rect key={x} x={x - 9} y={78} width={18} height={44} rx={4} {...s} />
      ))}
      {/* LEDs with flat on cathode side (bottom) */}
      {[210, 500].map((x) => (
        <path key={x} d={`M ${x - 16.6} 200 A 26 26 0 1 1 ${x + 16.6} 200 Z`} {...s} />
      ))}
      {/* electrolytic outlines + "+" marks */}
      <circle cx={290} cy={220} r={28} {...s} />
      <circle cx={510} cy={335} r={28} {...s} />
      {/* transistors: D shape, flat edge on top */}
      {[160, 440].map((x) => (
        <path key={x} d={`M ${x - 42} 276 L ${x + 42} 276 A 44 34 0 0 1 ${x - 42} 276 Z`} {...s} />
      ))}
      {/* S1, J1 */}
      <rect x={34} y={94} width={32} height={82} rx={4} {...s} />
      <rect x={34} y={204} width={32} height={82} rx={4} {...s} />
      {/* jumper W1 */}
      <line x1={100} y1={335} x2={440} y2={335} stroke={MUTED} strokeWidth={4} strokeDasharray="10 6" />
    </g>
  );
}

function SilkText() {
  return (
    <g>
      <Label x={122} y={100} size={20} anchor="start">R2</Label>
      <Label x={232} y={100} size={20} anchor="start">R1</Label>
      <Label x={412} y={100} size={20} anchor="start">R3</Label>
      <Label x={522} y={100} size={20} anchor="start">R4</Label>
      <Label x={178} y={172} size={20} anchor="end">LED1</Label>
      <Label x={468} y={172} size={20} anchor="end">LED2</Label>
      <Label x={290} y={178} size={20}>C1</Label>
      <Label x={252} y={196} size={20} weight={700}>+</Label>
      <Label x={546} y={300} size={20} anchor="start">C2</Label>
      <Label x={548} y={335} size={20} weight={700} anchor="start">+</Label>
      <Label x={110} y={298} size={20} anchor="end">Q1</Label>
      <Label x={490} y={262} size={20} anchor="start">Q2</Label>
      <Label x={270} y={318} size={20}>W1</Label>
      <Label x={50} y={135} size={20}>S1</Label>
      <Label x={50} y={245} size={20}>J1</Label>
      <Label x={74} y={220} size={20} weight={700} anchor="start">+</Label>
      <Label x={74} y={270} size={20} weight={700} anchor="start">−</Label>
    </g>
  );
}

function Holes() {
  return (
    <g>
      {PADS.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={7} fill={BG} stroke={MUTED} strokeWidth={2} />
          <circle cx={x} cy={y} r={2.5} fill={INK} />
        </g>
      ))}
    </g>
  );
}

// F02 Component side (silkscreen)
function ComponentSide() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Board>
        <SilkOutline />
        <Holes />
        <SilkText />
      </Board>
    </svg>
  );
}

// F03 Copper side (mirrored) — clean board ready to assemble
function CopperSide() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <rect x={20} y={20} width={560} height={360} rx={14} fill={CU_SOFT} stroke={INK} strokeWidth={3} />
      <g transform="translate(600 0) scale(-1 1)">
        <Copper />
      </g>
      <Label x={440} y={322} size={20} weight={700}>Q1</Label>
      <Label x={232} y={318} size={20} weight={700}>Q2</Label>
      <Label x={300} y={190} size={20} weight={700}>C1</Label>
      <Label x={300} y={404} size={20} muted>มองจากด้านทองแดง: ซ้าย ↔ ขวา สลับจากด้านอุปกรณ์</Label>
    </svg>
  );
}

// F08 Copper side after etching, with defects to find (no holes yet)
function EtchDefects() {
  // Broken trace: skip N4 vertical trace and redraw it with a gap.
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <rect x={20} y={20} width={560} height={360} rx={14} fill={CU_SOFT} stroke={INK} strokeWidth={3} />
      <g transform="translate(600 0) scale(-1 1)">
        <Copper holes={false} skipTrace={15} />
        {/* N4 trace redrawn with a break near y = 180 */}
        <path d="M 390 135 L 390 172" fill="none" stroke={CU} strokeWidth={10} strokeLinecap="butt" />
        <path d="M 390 186 L 390 255 L 440 255 L 440 290" fill="none" stroke={CU} strokeWidth={10} strokeLinecap="butt" strokeLinejoin="round" />
        {/* copper web left un-etched between J1 column and N2 column */}
        <path d="M 50 196 C 62 188, 78 206, 100 198 L 100 210 C 80 218, 62 202, 50 210 Z" fill={CU} />
      </g>
      {[[210, 179], [525, 204], [300, 40], [160, 290]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={20} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="5 4" />
          <Label x={x + 26} y={i === 2 ? y + 30 : y - 20} size={20} weight={700} anchor="start">{i + 1}</Label>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Assembled board drawings (component side) — parts drawn on top of silkscreen
// ---------------------------------------------------------------------------
function PartLED({ x, flatDown = true }: { x: number; flatDown?: boolean }) {
  // 5 mm LED seen from above, body slightly smaller than silkscreen.
  const d = flatDown
    ? `M ${x - 11} 195 A 19 19 0 1 1 ${x + 11} 195 Z`
    : `M ${x - 11} 165 A 19 19 0 1 0 ${x + 11} 165 Z`;
  return <path d={d} fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={3} />;
}
function PartCap({ x, y, stripeLeft }: { x: number; y: number; stripeLeft: boolean }) {
  // stripe = band on the "−" side of the can
  const sx = stripeLeft ? -1 : 1;
  return (
    <g>
      <circle cx={x} cy={y} r={25} fill={BG} stroke={INK} strokeWidth={3} />
      <path
        d={`M ${x + sx * 12} ${y - 22} A 25 25 0 0 ${sx > 0 ? 1 : 0} ${x + sx * 12} ${y + 22} Z`}
        fill={MUTED}
      />
      <Label x={x + sx * 18} y={y + 1} size={20} weight={700} color={BG}>−</Label>
    </g>
  );
}
function PartTO92({ x, flatTop }: { x: number; flatTop: boolean }) {
  const d = flatTop
    ? `M ${x - 38} 278 L ${x + 38} 278 A 40 30 0 0 1 ${x - 38} 278 Z`
    : `M ${x - 38} 302 L ${x + 38} 302 A 40 30 0 0 0 ${x - 38} 302 Z`;
  return <path d={d} fill={INK} stroke={INK} strokeWidth={2} />;
}
function PartRes({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 8} y={80} width={16} height={40} rx={6} fill={CU_SOFT} stroke={INK} strokeWidth={2.5} />
      <line x1={x - 8} y1={90} x2={x + 8} y2={90} stroke={INK} strokeWidth={3} />
      <line x1={x - 8} y1={98} x2={x + 8} y2={98} stroke={INK} strokeWidth={3} />
      <line x1={x - 8} y1={106} x2={x + 8} y2={106} stroke={INK} strokeWidth={3} />
    </g>
  );
}

// F09 Assembled board, component side — polarity faults to find
function AssembledFaults() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <Board>
        <SilkOutline />
        <Holes />
        <SilkText />
        {[100, 210, 390, 500].map((x) => (
          <PartRes key={x} x={x} />
        ))}
        <PartLED x={210} />
        <PartLED x={500} flatDown={false} />
        <PartCap x={290} y={220} stripeLeft />
        <PartCap x={510} y={335} stripeLeft />
        <PartTO92 x={160} flatTop />
        <PartTO92 x={440} flatTop={false} />
        <line x1={100} y1={335} x2={440} y2={335} stroke={INK} strokeWidth={4} />
      </Board>
    </svg>
  );
}

// F10 Solder side after assembly — joint faults to find
function SolderSideFaults() {
  const m = (x: number) => 600 - x;
  const good = (x: number, y: number, k: number) => (
    <g key={k}>
      <circle cx={x} cy={y} r={11} fill={SOLDER} stroke={INK} strokeWidth={1.5} />
      <circle cx={x} cy={y} r={3} fill={MUTED} />
      <path d={`M ${x - 6} ${y - 5} A 8 8 0 0 1 ${x + 2} ${y - 8}`} fill="none" stroke={BG} strokeWidth={2} />
    </g>
  );
  // all pads soldered except the C1 − pad (unsoldered), R3 bottom (cold) and Q1 B–C (bridge)
  const special = new Set(["310,220", "390,135"]);
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <rect x={20} y={20} width={560} height={360} rx={14} fill={CU_SOFT} stroke={INK} strokeWidth={3} />
      <g transform="translate(600 0) scale(-1 1)">
        <Copper />
      </g>
      {PADS.map(([x, y], i) => (special.has(`${x},${y}`) ? null : good(m(x), y, i)))}
      {/* unsoldered lead: bare pad, lead visible in hole */}
      <circle cx={m(310)} cy={220} r={11} fill={CU} />
      <circle cx={m(310)} cy={220} r={5} fill={BG} />
      <circle cx={m(310)} cy={220} r={2.5} fill={MUTED} />
      {/* cold joint: dull, lumpy, does not wet the pad */}
      <path d={`M ${m(390) - 9} 129 l 6 -6 l 7 3 l 5 -2 l 3 8 l -3 7 l 4 6 l -8 4 l -6 -3 l -6 2 l -3 -8 z`} fill={MUTED} stroke={INK} strokeWidth={1.5} />
      {/* bridge between Q1 B and Q1 C (mirrored x 440 and 410) */}
      <rect x={m(190) - 4} y={282} width={38} height={16} rx={8} fill={SOLDER} stroke={INK} strokeWidth={1.5} />
      {[[m(390), 135], [m(310), 220], [425, 290], [100, 195], [390, 65], [190, 290]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={24} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="5 4" />
          <Label x={x + 28} y={y - 22} size={20} weight={700} anchor="start">{["ก", "ข", "ค", "ง", "จ", "ฉ"][i]}</Label>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 Etching station (teacher-only zone)
// ---------------------------------------------------------------------------
function EtchStation() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* teacher zone */}
      <rect x={14} y={14} width={572} height={270} rx={12} fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={3} strokeDasharray="12 8" />
      <Label x={30} y={40} size={22} weight={700} anchor="start" color={DANGER}>เขตงานกัดลาย — ครูเท่านั้น</Label>
      {/* table */}
      <rect x={40} y={220} width={520} height={14} fill={MUTED} />
      {/* plastic tray with etchant */}
      <path d="M 70 170 L 250 170 L 236 220 L 84 220 Z" fill={PANEL} stroke={INK} strokeWidth={3} />
      <path d="M 78 186 L 242 186 L 236 214 L 84 214 Z" fill="var(--fig-copper)" opacity={0.75} />
      <rect x={120} y={192} width={80} height={8} fill={CU_SOFT} stroke={INK} strokeWidth={1.5} />
      <Label x={60} y={110} size={20} weight={700} anchor="start">ถาดพลาสติก + FeCl₃</Label>
      {/* plastic tongs */}
      <path d="M 252 148 L 214 196 M 264 152 L 222 198" stroke={ACCENT} strokeWidth={5} strokeLinecap="round" />
      <Label x={220} y={258} size={20} color={ACCENT}>คีมพลาสติก</Label>
      {/* corrosive pictogram (GHS05 style, simplified) */}
      <g transform="translate(345 112)">
        <path d="M 0 -52 L 52 0 L 0 52 L -52 0 Z" fill={BG} stroke={DANGER} strokeWidth={6} strokeLinejoin="round" />
        {/* simplified corrosive symbol: tilted tube pouring a drop that eats into a bar */}
        <rect x={-6} y={-40} width={12} height={34} rx={4} fill={INK} transform="rotate(50 0 -23)" />
        <path d="M 6 -2 q 6 9 0 13 q -6 -4 0 -13 z" fill={INK} />
        <path d="M -28 18 L 28 18 L 28 30 L 14 30 Q 6 22 -2 30 L -28 30 Z" fill={INK} />
      </g>
      <Label x={345} y={190} size={20} weight={700} color={DANGER}>กรด กัดกร่อน</Label>
      {/* eye wash */}
      <rect x={418} y={120} width={36} height={100} rx={8} fill={PANEL} stroke={OK} strokeWidth={3} />
      <rect x={428} y={102} width={16} height={18} fill={OK} />
      <Label x={436} y={88} size={20} weight={700} color={OK}>ล้างตา</Label>
      {/* waste container */}
      <rect x={474} y={140} width={96} height={80} rx={6} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={470} y={130} width={104} height={12} rx={3} fill={INK} />
      <Label x={522} y={170} size={20} weight={700}>ของเสีย</Label>
      <Label x={522} y={196} size={20} weight={700}>อันตราย</Label>
      <Label x={514} y={258} size={20} muted>ปิดฝา ติดฉลาก</Label>
      {/* students line */}
      <line x1={14} y1={310} x2={586} y2={310} stroke={WARN} strokeWidth={6} strokeDasharray="18 10" />
      <Label x={300} y={340} size={22} weight={700}>นักเรียนสังเกตหลังเส้น สวมแว่นตา</Label>
      <Label x={300} y={376} size={20} muted>ห้ามเทน้ำยาลงท่อ · ห้ามใช้ภาชนะโลหะ</Label>
      <Label x={300} y={404} size={20} muted>ครู: แว่นครอบตา ถุงมือไนไตรล์ ผ้ากันเปื้อน</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 Lead forming and spacing (side views)
// ---------------------------------------------------------------------------
function LeadForming() {
  const board = (x: number, w: number) => (
    <g>
      <rect x={x} y={220} width={w} height={22} fill={PANEL} stroke={INK} strokeWidth={2.5} />
      <line x1={x} y1={242} x2={x + w} y2={242} stroke={CU} strokeWidth={5} />
    </g>
  );
  const fillet = (x: number) => <path d={`M ${x - 12} 245 Q ${x} 245 ${x - 2} 262 L ${x + 2} 262 Q ${x} 245 ${x + 12} 245 Z`} fill={SOLDER} stroke={INK} strokeWidth={1.5} />;
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      {/* (a) resistor lying flat */}
      {board(14, 200)}
      <rect x={74} y={196} width={80} height={24} rx={10} fill={CU_SOFT} stroke={INK} strokeWidth={3} />
      <path d="M 74 208 L 56 208 Q 46 208 46 218 L 46 264" fill="none" stroke={MUTED} strokeWidth={4} />
      <path d="M 154 208 L 172 208 Q 182 208 182 218 L 182 264" fill="none" stroke={MUTED} strokeWidth={4} />
      {fillet(46)}
      {fillet(182)}
      <Arrow from={[154, 176]} to={[184, 176]} color={ACCENT} head={8} />
      <Arrow from={[184, 176]} to={[154, 176]} color={ACCENT} head={8} />
      <Label x={169} y={150} size={20} weight={700} color={ACCENT}>≥ 1.5–2 mm</Label>
      <Label x={114} y={300} size={22} weight={700}>ตัวต้านทาน</Label>
      <Label x={114} y={328} size={20} muted>วางราบ ดัดห่างตัว</Label>
      {/* (b) transistor raised */}
      {board(228, 150)}
      <path d="M 278 130 L 328 130 L 328 170 Q 303 182 278 170 Z" fill={INK} />
      {[288, 303, 318].map((x) => (
        <line key={x} x1={x} y1={170} x2={x} y2={264} stroke={MUTED} strokeWidth={4} />
      ))}
      {[288, 303, 318].map((x) => (
        <rect key={`f${x}`} x={x - 5} y={244} width={10} height={14} rx={4} fill={SOLDER} stroke={INK} strokeWidth={1} />
      ))}
      <Arrow from={[352, 176]} to={[352, 218]} color={ACCENT} head={8} />
      <Arrow from={[352, 218]} to={[352, 176]} color={ACCENT} head={8} />
      <Label x={360} y={152} size={20} weight={700} color={ACCENT} anchor="start">3–5 mm</Label>
      <Label x={303} y={300} size={22} weight={700}>ทรานซิสเตอร์</Label>
      <Label x={303} y={328} size={20} muted>ยกเหนือแผ่น</Label>
      {/* (c) electrolytic upright */}
      {board(392, 194)}
      <rect x={452} y={110} width={64} height={110} rx={10} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={496} y={112} width={18} height={106} fill={MUTED} />
      <Label x={505} y={164} size={20} weight={700} color={BG}>−</Label>
      <line x1={470} y1={220} x2={470} y2={264} stroke={MUTED} strokeWidth={4} />
      <line x1={500} y1={220} x2={500} y2={264} stroke={MUTED} strokeWidth={4} />
      {fillet(470)}
      {fillet(500)}
      <Label x={484} y={300} size={22} weight={700}>อิเล็กโทรไลต์</Label>
      <Label x={484} y={328} size={20} muted>ตั้งชิดแผ่น</Label>
      {/* lead cut note */}
      <line x1={14} y1={270} x2={586} y2={270} stroke={MUTED} strokeWidth={1.5} strokeDasharray="6 5" />
      <Label x={300} y={374} size={20}>ด้านบัดกรี: ตัดขาเหลือ 1–1.5 mm เหนือรอยต่อ (สวมแว่นตา)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 Assembly order: low → high
// ---------------------------------------------------------------------------
const ORDER: [string, number][] = [
  ["จัมเปอร์ (W1)", 1],
  ["ตัวต้านทาน / ไดโอด", 2],
  ["ซ็อกเก็ต IC", 3],
  ["C เซรามิก / ฟิล์ม", 4],
  ["ทรานซิสเตอร์ / LED", 5.5],
  ["C อิเล็กโทรไลต์", 7],
  ["ขั้วต่อ / สวิตช์", 8],
  ["สายไฟออกนอกแผ่น", 9],
];
function AssemblyOrder() {
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      <Label x={20} y={22} size={22} weight={700} anchor="start">ลงอุปกรณ์ตามลำดับ เตี้ย → สูง</Label>
      {ORDER.map(([t, h], i) => {
        const y = 56 + i * 44;
        return (
          <g key={t}>
            <circle cx={36} cy={y} r={16} fill={INK} />
            <Label x={36} y={y + 1} size={20} weight={700} color={BG}>{i + 1}</Label>
            <Label x={62} y={y} size={20} anchor="start">{t}</Label>
            <rect x={300} y={y - 12} width={h * 30} height={24} rx={4} fill={i === 5 ? CU_SOFT : PANEL} stroke={INK} strokeWidth={2} />
          </g>
        );
      })}
      <Arrow from={[300, 416]} to={[580, 416]} color={MUTED} head={10} />
      <Label x={440} y={396} size={20} muted>ความสูงเหนือแผ่น (เปรียบเทียบ)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 Polarity checklist (5 part types)
// ---------------------------------------------------------------------------
function Tile({ x, y, title, l1, l2, children }: { x: number; y: number; title: string; l1: string; l2: string; children: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={186} height={206} rx={10} fill={PANEL} stroke={INK} strokeWidth={2} />
      <Label x={x + 93} y={y + 22} size={22} weight={700}>{title}</Label>
      {children}
      <Label x={x + 93} y={y + 166} size={20}>{l1}</Label>
      <Label x={x + 93} y={y + 190} size={20} muted>{l2}</Label>
    </g>
  );
}
function PolarityChecklist() {
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      {/* diode */}
      <Tile x={8} y={8} title="ไดโอด" l1="แถบ = แคโทด (K)" l2="= ขีดในสัญลักษณ์">
        <line x1={30} y1={90} x2={60} y2={90} stroke={MUTED} strokeWidth={4} />
        <line x1={134} y1={90} x2={164} y2={90} stroke={MUTED} strokeWidth={4} />
        <rect x={60} y={74} width={74} height={32} rx={6} fill={INK} />
        <rect x={116} y={74} width={12} height={32} fill={BG} />
        <Label x={40} y={124} size={20} weight={700}>A</Label>
        <Label x={152} y={124} size={20} weight={700}>K</Label>
      </Tile>
      {/* LED */}
      <Tile x={207} y={8} title="LED" l1="ขายาว = แอโนด (A)" l2="ด้านแบน = K">
        <path d="M 278 98 L 278 66 A 22 22 0 0 1 322 66 L 322 98 Z" fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={3} />
        <rect x={272} y={98} width={56} height={8} fill="var(--fig-danger-soft)" stroke={DANGER} strokeWidth={2} />
        <line x1={322} y1={92} x2={328} y2={92} stroke={DANGER} strokeWidth={3} />
        <line x1={290} y1={106} x2={290} y2={146} stroke={MUTED} strokeWidth={4} />
        <line x1={310} y1={106} x2={310} y2={132} stroke={MUTED} strokeWidth={4} />
        <Label x={268} y={136} size={20} weight={700}>A</Label>
        <Label x={340} y={124} size={20} weight={700}>K</Label>
        <Label x={354} y={88} size={20} muted>แบน</Label>
      </Tile>
      {/* electrolytic */}
      <Tile x={406} y={8} title="C อิเล็กโทรไลต์" l1="แถบ “−” = ขั้วลบ" l2="ขายาว = ขั้วบวก">
        <rect x={470} y={44} width={58} height={74} rx={8} fill={BG} stroke={INK} strokeWidth={3} />
        <rect x={506} y={46} width={20} height={70} fill={MUTED} />
        <Label x={516} y={82} size={20} weight={700} color={BG}>−</Label>
        <line x1={486} y1={118} x2={486} y2={152} stroke={MUTED} strokeWidth={4} />
        <line x1={512} y1={118} x2={512} y2={138} stroke={MUTED} strokeWidth={4} />
        <Label x={460} y={140} size={20} weight={700} color="var(--fig-plus)">+</Label>
      </Tile>
      {/* IC */}
      <Tile x={106} y={226} title="IC (DIP-8)" l1="รอยบาก/จุด = ขา 1" l2="นับทวนเข็มฯ">
        <rect x={150} y={276} width={100} height={62} rx={4} fill={INK} />
        <path d="M 150 297 A 10 10 0 0 1 150 317" fill={BG} />
        <circle cx={164} cy={326} r={5} fill={BG} />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={160 + i * 24} y={338} width={8} height={12} fill={MUTED} />
            <rect x={160 + i * 24} y={264} width={8} height={12} fill={MUTED} />
          </g>
        ))}
        <Label x={140} y={354} size={20} weight={700}>1</Label>
      </Tile>
      {/* BC547 */}
      <Tile x={305} y={226} title="BC547 (TO-92)" l1="ด้านแบนหันหาเรา" l2="ขาเรียง C B E">
        <path d="M 366 264 L 434 264 L 434 304 Q 400 316 366 304 Z" fill={INK} />
        {[378, 400, 422].map((x) => (
          <line key={x} x1={x} y1={310} x2={x} y2={338} stroke={MUTED} strokeWidth={4} />
        ))}
        <Label x={378} y={352} size={20} weight={700} color={DANGER}>C</Label>
        <Label x={400} y={352} size={20} weight={700} color={DANGER}>B</Label>
        <Label x={422} y={352} size={20} weight={700} color={DANGER}>E</Label>
      </Tile>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 Pre-power resistance check VCC–GND
// ---------------------------------------------------------------------------
function Dmm({ x, y, text, tone }: { x: number; y: number; text: string; tone?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={150} height={190} rx={16} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={x + 14} y={y + 14} width={122} height={50} rx={6} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={x + 75} y={y + 40} size={26} weight={700} color={tone}>{text}</Label>
      <circle cx={x + 75} cy={y + 112} r={34} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={x + 75} y1={y + 112} x2={x + 52} y2={y + 92} stroke={INK} strokeWidth={4} />
      <Label x={x + 40} y={y + 82} size={20} weight={700}>Ω</Label>
      <circle cx={x + 45} cy={y + 168} r={8} fill={INK} />
      <circle cx={x + 105} cy={y + 168} r={8} fill="var(--fig-plus)" />
    </g>
  );
}
function OhmCheck() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* simplified board with TP1/TP2 and battery removed */}
      <rect x={20} y={40} width={250} height={150} rx={12} fill={PANEL} stroke={INK} strokeWidth={3} />
      <Label x={145} y={70} size={20} weight={700}>แผ่นคิต (ถอดแบตแล้ว)</Label>
      <circle cx={238} cy={118} r={10} fill={BG} stroke={ACCENT} strokeWidth={3} />
      <circle cx={238} cy={160} r={10} fill={BG} stroke={ACCENT} strokeWidth={3} />
      <Label x={220} y={118} size={20} anchor="end" weight={700} color={ACCENT}>TP1 (+9 V)</Label>
      <Label x={220} y={160} size={20} anchor="end" weight={700} color={ACCENT}>TP2 (0 V)</Label>
      <Dmm x={420} y={20} text="0.2 Ω" tone={DANGER} />
      <Wire d="M 525 188 C 525 236, 330 120, 244 118" color="var(--fig-plus)" width={3} />
      <Wire d="M 465 188 C 465 230, 330 170, 244 160" color={INK} width={3} />
      <Label x={345} y={226} size={20} muted>ย่าน Ω · ไม่มีไฟเลี้ยง</Label>
      {/* interpretations */}
      <Callout x={20} y={262} w={270} h={140} tone="danger">
        <Label x={155} y={292} size={22} weight={700} color={DANGER}>✗ ≈ 0 Ω</Label>
        <Label x={155} y={326} size={20}>ลัดวงจร VCC–GND</Label>
        <Label x={155} y={356} size={20}>ห้ามจ่ายไฟ</Label>
        <Label x={155} y={384} size={20} muted>หาสะพานตะกั่ว/เศษขา</Label>
      </Callout>
      <Callout x={310} y={262} w={270} h={140} tone="ok">
        <Label x={445} y={292} size={22} weight={700} color={OK}>✓ หลาย kΩ ขึ้นไป</Label>
        <Label x={445} y={326} size={20}>ค่าอาจค่อย ๆ เพิ่ม</Label>
        <Label x={445} y={356} size={20}>(C กำลังประจุ) ปกติ</Label>
        <Label x={445} y={384} size={20} muted>สลับสายแล้วค่าต่าง = ปกติ</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 First power-up with a current-limited bench supply
// ---------------------------------------------------------------------------
function PowerUp() {
  const steps: [string, string][] = [
    ["1 ตั้งก่อนต่อ", "9.0 V · จำกัด 100 mA"],
    ["2 OUTPUT OFF แล้วต่อสาย", "แดง → +   ดำ → −"],
    ["3 OUTPUT ON ดู 10 วินาที", "กระแส · ความร้อน · กลิ่น"],
    ["4 ถ้าไฟ CC ติดทันที", "มีลัดวงจร → ปิด OUTPUT"],
  ];
  return (
    <svg viewBox="0 0 600 440" aria-hidden="true">
      {/* supply front panel */}
      <rect x={20} y={16} width={560} height={176} rx={14} fill={PANEL} stroke={INK} strokeWidth={3} />
      <rect x={40} y={36} width={150} height={56} rx={6} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={115} y={65} size={26} weight={700}>9.00 V</Label>
      <rect x={210} y={36} width={150} height={56} rx={6} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={285} y={65} size={26} weight={700}>0.015 A</Label>
      <circle cx={115} cy={140} r={28} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={115} y1={140} x2={115} y2={116} stroke={INK} strokeWidth={4} />
      <Label x={115} y={182} size={20}>VOLTAGE</Label>
      <circle cx={285} cy={140} r={28} fill={BG} stroke={INK} strokeWidth={3} />
      <line x1={285} y1={140} x2={268} y2={122} stroke={INK} strokeWidth={4} />
      <Label x={285} y={182} size={20}>CURRENT</Label>
      <circle cx={398} cy={52} r={9} fill={OK} />
      <Label x={414} y={52} size={20} anchor="start" weight={700} color={OK}>CV ติด</Label>
      <circle cx={398} cy={84} r={9} fill={BG} stroke={MUTED} strokeWidth={2} />
      <Label x={414} y={84} size={20} anchor="start" muted>CC</Label>
      <rect x={390} y={116} width={90} height={36} rx={6} fill={INK} />
      <Label x={435} y={135} size={20} weight={700} color={BG}>OUTPUT</Label>
      <circle cx={512} cy={134} r={13} fill="var(--fig-plus)" />
      <circle cx={552} cy={134} r={13} fill={INK} />
      <Label x={512} y={170} size={20} weight={700} color="var(--fig-plus)">+</Label>
      <Label x={552} y={170} size={20} weight={700}>−</Label>
      {/* steps */}
      {steps.map(([t, s], i) => {
        const x = i % 2 === 0 ? 20 : 310;
        const y = 210 + Math.floor(i / 2) * 112;
        const bad = i === 3;
        return (
          <g key={t}>
            <rect x={x} y={y} width={270} height={96} rx={10} fill={bad ? "var(--fig-danger-soft)" : BG} stroke={bad ? DANGER : INK} strokeWidth={bad ? 3 : 2} />
            <Label x={x + 135} y={y + 32} size={20} weight={700} color={bad ? DANGER : undefined}>{t}</Label>
            <Label x={x + 135} y={y + 66} size={20} muted={!bad}>{s}</Label>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 Waveforms at TP3, TP5, TP6 (approximate)
// ---------------------------------------------------------------------------
function Waveforms() {
  const x0 = 150;
  const W = 420; // 0 … 1.30 s
  const tx = (t: number) => x0 + (t / 1.3) * W;
  const h = 0.3257;
  // collector trace: low when its transistor ON; y(high)=top, y(low)=bottom
  const coll = (y: number, startLow: boolean) => {
    const lo = y + 44;
    let d = `M ${tx(0)} ${startLow ? lo : y}`;
    let low = startLow;
    for (let k = 0; k < 4; k++) {
      const a = tx(k * h);
      const b = tx((k + 1) * h);
      if (k > 0) {
        // falling edge is sharp; rising edge is slightly rounded (C recharges through R_C + LED)
        d += low ? ` L ${a} ${lo}` : ` Q ${a} ${y} ${a + 10} ${y}`;
      }
      d += ` L ${b} ${low ? lo : y}`;
      low = !low;
    }
    return d;
  };
  // base of Q2 (TP5): 0.7 V while ON; when OFF jumps to −6.4 V then recovers toward +9 V
  const yB = (v: number) => 296 - v * 9; // 0 V at y=296
  const base = () => {
    let d = `M ${tx(0)} ${yB(-6.4)}`;
    for (let k = 0; k < 4; k++) {
      const a = k * h;
      if (k % 2 === 0) {
        // OFF interval: exponential recovery
        for (let i = 1; i <= 20; i++) {
          const t = (i / 20) * h;
          const v = 9 - (9 + 6.4) * Math.exp(-t / (h / Math.log(15.4 / 8.3)));
          d += ` L ${tx(a + t).toFixed(1)} ${yB(Math.min(v, 0.7)).toFixed(1)}`;
        }
      } else {
        d += ` L ${tx(a + h).toFixed(1)} ${yB(0.7)}`;
        if (k < 3) d += ` L ${tx(a + h).toFixed(1)} ${yB(-6.4)}`;
      }
    }
    return d;
  };
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* grid lines at switching instants */}
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1={tx(k * h)} y1={40} x2={tx(k * h)} y2={360} stroke="var(--fig-grid)" strokeWidth={2} />
      ))}
      <Label x={20} y={70} size={20} anchor="start" weight={700}>TP3</Label>
      <Label x={20} y={94} size={20} anchor="start" muted>C ของ Q1</Label>
      <path d={coll(56, true)} fill="none" stroke={ACCENT} strokeWidth={3} />
      <Label x={20} y={170} size={20} anchor="start" weight={700}>TP6</Label>
      <Label x={20} y={194} size={20} anchor="start" muted>C ของ Q2</Label>
      <path d={coll(156, false)} fill="none" stroke="var(--fig-accent-2)" strokeWidth={3} />
      <Label x={20} y={276} size={20} anchor="start" weight={700}>TP5</Label>
      <Label x={20} y={300} size={20} anchor="start" muted>B ของ Q2</Label>
      <line x1={x0} y1={yB(0)} x2={x0 + W} y2={yB(0)} stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 5" />
      <path d={base()} fill="none" stroke={CU} strokeWidth={3} />
      <Label x={582} y={yB(0.7) - 14} size={20} anchor="end" muted>0.7 V</Label>
      <Label x={tx(2 * h) + 10} y={yB(-6.4) + 2} size={20} anchor="start" muted>≈ −6 V</Label>
      <Label x={582} y={32} size={20} anchor="end" muted>สูง ≈ 7 V · ต่ำ ≈ 0.1 V</Label>
      {/* time axis */}
      <Arrow from={[x0, 372]} to={[x0 + W + 18, 372]} color={INK} head={10} />
      {[0, 1, 2, 3, 4].map((k) => (
        <Label key={k} x={tx(k * h)} y={394} size={20} muted>{(k * h).toFixed(2)}</Label>
      ))}
      <Label x={20} y={394} size={20} muted anchor="start">t (s)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F14 Troubleshooting flowchart (6 steps, power state badges)
// ---------------------------------------------------------------------------
const TS: [string, string, "off" | "on" | "any"][] = [
  ["1 สังเกตอาการ", "ควรทำงานอย่างไร · เสียแบบไหน", "any"],
  ["2 ตรวจด้วยสายตา", "ขั้ว · รอยต่อ · สะพาน · ลายขาด", "off"],
  ["3 วัด Ω / ความต่อเนื่อง", "VCC–GND · ลาย · สวิตช์ · ขา→ลาย", "off"],
  ["4 วัดแรงดัน (COM ที่ GND)", "แหล่งจ่าย → TP1 → TP3…TP6", "on"],
  ["5 ไล่สัญญาณ / เทียบซีกดี", "หาจุดที่ค่าเริ่มผิดจากคาด", "on"],
  ["6 แก้ไข → ทดสอบซ้ำ → บันทึก", "อาการ · ค่าวัด · สาเหตุ · วิธีแก้", "any"],
];
function TroubleFlow() {
  return (
    <svg viewBox="0 0 600 450" aria-hidden="true">
      {TS.map(([t, s, p], i) => {
        const y = 10 + i * 73;
        const badge = p === "off" ? "ปลดไฟ" : p === "on" ? "จ่ายไฟ ≤ 12 V" : "";
        const tone = p === "off" ? ACCENT : p === "on" ? WARN : MUTED;
        return (
          <g key={t}>
            <rect x={20} y={y} width={420} height={60} rx={10} fill={PANEL} stroke={INK} strokeWidth={2} />
            <Label x={36} y={y + 20} size={20} weight={700} anchor="start">{t}</Label>
            <Label x={36} y={y + 44} size={20} anchor="start" muted>{s}</Label>
            {badge ? (
              <g>
                <rect x={452} y={y + 12} width={136} height={36} rx={18} fill={BG} stroke={tone} strokeWidth={3} strokeDasharray={p === "on" ? "8 4" : undefined} />
                <Label x={520} y={y + 31} size={20} weight={700} color={tone}>{badge}</Label>
              </g>
            ) : null}
            {i < TS.length - 1 ? <Arrow from={[230, y + 60]} to={[230, y + 73]} color={MUTED} head={9} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F15 THT vs SMD size comparison + hand-soldering a 2-terminal SMD
// ---------------------------------------------------------------------------
function ThtVsSmd() {
  const k = 20; // px per mm
  return (
    <svg viewBox="0 0 600 430" aria-hidden="true">
      <Label x={20} y={24} size={22} weight={700} anchor="start">ขนาดเทียบกันตามสัดส่วน (มาตราส่วนเดียวกัน)</Label>
      {/* axial 1/4 W resistor 6.3 × 2.4 mm */}
      <line x1={30} y1={90} x2={60} y2={90} stroke={MUTED} strokeWidth={4} />
      <rect x={60} y={90 - 1.2 * k} width={6.3 * k} height={2.4 * k} rx={14} fill={CU_SOFT} stroke={INK} strokeWidth={3} />
      <line x1={60 + 6.3 * k} y1={90} x2={60 + 6.3 * k + 30} y2={90} stroke={MUTED} strokeWidth={4} />
      <Label x={124} y={140} size={20}>THT ¼ W</Label>
      {/* SMD chips */}
      {[
        ["1206", 3.2, 1.6, 300],
        ["0805", 2.0, 1.25, 400],
        ["0603", 1.6, 0.8, 480],
      ].map(([n, l, w, x]) => (
        <g key={n as string}>
          <rect x={(x as number) - ((l as number) * k) / 2} y={90 - ((w as number) * k) / 2} width={(l as number) * k} height={(w as number) * k} fill={INK} />
          <rect x={(x as number) - ((l as number) * k) / 2} y={90 - ((w as number) * k) / 2} width={0.5 * k} height={(w as number) * k} fill={SOLDER} />
          <rect x={(x as number) + ((l as number) * k) / 2 - 0.5 * k} y={90 - ((w as number) * k) / 2} width={0.5 * k} height={(w as number) * k} fill={SOLDER} />
          <Label x={x as number} y={140} size={20}>{n as string}</Label>
        </g>
      ))}
      <Label x={390} y={170} size={20} muted>SMD ตัวต้านทานชิป</Label>
      <line x1={20} y1={198} x2={580} y2={198} stroke="var(--fig-grid)" strokeWidth={2} />
      <Label x={20} y={226} size={22} weight={700} anchor="start">บัดกรี SMD 2 ขาด้วยมือ</Label>
      {[0, 1, 2].map((i) => {
        const x = 20 + i * 192;
        return (
          <g key={i}>
            <rect x={x} y={244} width={176} height={130} rx={10} fill={PANEL} stroke={INK} strokeWidth={2} />
            <rect x={x + 36} y={290} width={30} height={34} fill={CU} />
            <rect x={x + 110} y={290} width={30} height={34} fill={CU} />
            {i === 0 ? <path d={`M ${x + 38} 300 q 13 -12 26 0 l 0 20 l -26 0 z`} fill={SOLDER} stroke={INK} strokeWidth={1.5} /> : null}
            {i >= 1 ? (
              <g>
                <path d={`M ${x + 38} 300 q 13 -12 26 0 l 0 20 l -26 0 z`} fill={SOLDER} stroke={INK} strokeWidth={1.5} />
                <rect x={x + 52} y={296} width={72} height={22} fill={INK} />
              </g>
            ) : null}
            {i === 2 ? <path d={`M ${x + 112} 300 q 13 -12 26 0 l 0 20 l -26 0 z`} fill={SOLDER} stroke={INK} strokeWidth={1.5} /> : null}
            <Label x={x + 88} y={264} size={20} weight={700}>{["1 เติมตะกั่ว 1 pad", "2 วางชิ้น หลอมยึด", "3 บัดกรีขาที่สอง"][i]}</Label>
          </g>
        );
      })}
      <Label x={300} y={404} size={20} muted>จากนั้นกลับไปเติม/แต่งขาแรกให้รอยต่อสมบูรณ์</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F16 From drawing to a working kit (intro pipeline)
// ---------------------------------------------------------------------------
const PIPE: [string, string][] = [
  ["อ่านแบบ + BOM", "schematic · ผังวาง"],
  ["เตรียมแผ่น PCB", "ครูกัดลาย · ตรวจลาย"],
  ["ตรวจรับอุปกรณ์", "วัดก่อนลง"],
  ["ประกอบ", "เตี้ย → สูง · ขั้ว"],
  ["ตรวจก่อนจ่ายไฟ", "ตา + Ω"],
  ["จ่ายไฟครั้งแรก", "9 V · 100 mA"],
  ["วัดจุดทดสอบ", "เทียบค่าคาด"],
  ["หาข้อบกพร่อง", "เป็นระบบ"],
];
function Pipeline() {
  return (
    <svg viewBox="0 0 600 410" aria-hidden="true">
      {PIPE.map(([t, s], i) => {
        const col = i < 4 ? 0 : 1;
        const row = i % 4;
        const x = 10 + col * 300;
        const y = 12 + row * 96;
        return (
          <g key={t}>
            <rect x={x} y={y} width={270} height={78} rx={12} fill={i >= 4 ? "var(--fig-accent-soft)" : PANEL} stroke={INK} strokeWidth={2} />
            <circle cx={x + 28} cy={y + 39} r={17} fill={INK} />
            <Label x={x + 28} y={y + 40} size={20} weight={700} color={BG}>{i + 1}</Label>
            <Label x={x + 58} y={y + 26} size={22} weight={700} anchor="start">{t}</Label>
            <Label x={x + 58} y={y + 54} size={20} anchor="start" muted>{s}</Label>
            {row < 3 ? <Arrow from={[x + 135, y + 78]} to={[x + 135, y + 96]} color={MUTED} head={9} /> : null}
          </g>
        );
      })}
      <path d="M 280 339 C 296 339, 294 51, 310 51" fill="none" stroke={MUTED} strokeWidth={2.5} strokeDasharray="6 5" />
      <Label x={300} y={398} size={20} muted>ขั้น 5–8 คือหัวใจของสัปดาห์นี้: ตรวจ วัด และแก้ไข</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W15-F01": KitSchematic,
  "W15-F02": ComponentSide,
  "W15-F03": CopperSide,
  "W15-F04": EtchStation,
  "W15-F05": LeadForming,
  "W15-F06": AssemblyOrder,
  "W15-F07": PolarityChecklist,
  "W15-F08": EtchDefects,
  "W15-F09": AssembledFaults,
  "W15-F10": SolderSideFaults,
  "W15-F11": OhmCheck,
  "W15-F12": PowerUp,
  "W15-F13": Waveforms,
  "W15-F14": TroubleFlow,
  "W15-F15": ThtVsSmd,
  "W15-F16": Pipeline,
};
export default figures;
