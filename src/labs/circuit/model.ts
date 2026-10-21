/**
 * DC circuit model — pure and deterministic (no React).
 *
 * Network: ideal source V (bench supply with a 3 A current limit, internal
 * resistance 0) → switch S → ammeter → load network → back to source −.
 *
 *   single   : R1
 *   series   : R1 – R2 – R3
 *   parallel : R1 ‖ R2 ‖ R3
 *   mixed    : R1 in series with (R2 ‖ R3)
 *
 * Lamp mode replaces R1 with a 12 V / 6 W lamp of fixed hot resistance 24 Ω.
 * Faults: openN → RN = ∞ (removed), shortN → RN = 0.01 Ω. One fault at a time.
 *
 * Node potentials are referred to the source − terminal (G = 0 V).
 */

export type Topology = "single" | "series" | "parallel" | "mixed";
export const TOPOLOGIES: Topology[] = ["single", "series", "parallel", "mixed"];

export const FAULTS = ["none", "open1", "open2", "open3", "short1", "short2", "short3"] as const;
export type Fault = (typeof FAULTS)[number];

export const V_MIN = 0;
export const V_MAX = 24;
export const V_STEP = 0.5;
export const R_MIN = 1;
export const R_MAX = 100_000;
export const LAMP_R = 24; // Ω, fixed hot resistance
export const LAMP_RATED_P = 6; // W
export const LAMP_RATED_V = 12; // V
export const LAMP_OVERLOAD = 1.2; // × rated power
export const SHORT_R = 0.01; // Ω
export const CURRENT_LIMIT = 3; // A

export type Triple = [number, number, number];

export interface CircuitInput {
  topology: Topology;
  V: number;
  R: Triple;
  lamp: boolean;
  switchClosed: boolean;
  fault: string;
}

/** One entry of the troubleshooting measurement log (LAB_SPEC §1). */
export interface Measurement {
  kind: "V" | "I";
  /** Node pair "A–B" for the voltmeter, "ammeter" for the series ammeter. */
  where: string;
  value: number;
}

/** The learner's diagnosis of a hidden fault (null until "วินิจฉัย" is pressed). */
export interface Diagnosis {
  /** e.g. "open2" */
  guess: string;
  correct: boolean;
  /** Distinct measurements logged before the diagnosis was made. */
  measurementsBefore: number;
}

/** Observable state (the fixed contract in LAB_SPEC §1). */
export interface CircuitState extends CircuitInput {
  /** Equivalent resistance of the load network, Ω (Infinity when the network is open). */
  Req: number;
  /** Total current, A. */
  I: number;
  VR: Triple;
  IR: Triple;
  PR: Triple;
  /** Total power delivered by the source, W. */
  P: number;
  currentLimited: boolean;
  // --- troubleshooting mission (session state merged in by the Lab) ---
  /** The fault is present but not revealed to the learner. */
  faultHidden: boolean;
  /** Symptom line derived from the model while a fault is hidden; null otherwise. */
  symptom: string | null;
  measurements: Measurement[];
  diagnosis: Diagnosis | null;
}

export function isFault(f: string): f is Fault {
  return (FAULTS as readonly string[]).includes(f);
}

export function isTopology(t: string): t is Topology {
  return (TOPOLOGIES as string[]).includes(t);
}

/** Which resistor positions are part of the circuit for a topology. */
export function activeCount(t: Topology): 1 | 3 {
  return t === "single" ? 1 : 3;
}

export function clampV(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(V_MAX, Math.max(V_MIN, v));
}

export function clampR(r: number): number {
  if (!Number.isFinite(r)) return R_MIN;
  return Math.min(R_MAX, Math.max(R_MIN, r));
}

/** Effective resistance of each position after lamp substitution and faults. */
export function effectiveR(inp: Pick<CircuitInput, "R" | "lamp" | "fault">): Triple {
  const out: Triple = [clampR(inp.R[0]), clampR(inp.R[1]), clampR(inp.R[2])];
  if (inp.lamp) out[0] = LAMP_R;
  const f = isFault(inp.fault) ? inp.fault : "none";
  if (f !== "none") {
    const idx = Number(f.slice(-1)) - 1;
    out[idx] = f.startsWith("open") ? Infinity : SHORT_R;
  }
  return out;
}

/** Parallel combination; ∞ branches contribute nothing; all-∞ → ∞. */
export function par(...rs: number[]): number {
  let g = 0;
  for (const r of rs) if (Number.isFinite(r)) g += 1 / r;
  return g === 0 ? Infinity : 1 / g;
}

export function equivalentR(t: Topology, r: Triple): number {
  switch (t) {
    case "single":
      return r[0];
    case "series":
      return r[0] + r[1] + r[2];
    case "parallel":
      return par(r[0], r[1], r[2]);
    case "mixed":
      return r[0] + par(r[1], r[2]);
  }
}

/** Node names drawn on the stage. P = source + (before S), A = after S/ammeter, G = source −. */
export type NodeId = "P" | "A" | "B" | "C" | "G";

export function nodesFor(t: Topology): NodeId[] {
  switch (t) {
    case "single":
    case "parallel":
      return ["P", "A", "G"];
    case "series":
      return ["P", "A", "B", "C", "G"];
    case "mixed":
      return ["P", "A", "B", "G"];
  }
}

export interface Solution {
  state: CircuitState;
  /** Supply terminal voltage (= V unless current-limited). */
  Vt: number;
  /** Node potentials (V). Floating nodes are listed in `floating` (value 0). */
  node: Partial<Record<NodeId, number>>;
  floating: NodeId[];
  /** Source is effectively shorted (network ≈ 0 Ω) and current-limited. */
  shorted: boolean;
}

const z3 = (): Triple => [0, 0, 0];

export function solve(input: CircuitInput): Solution {
  const topology: Topology = isTopology(input.topology) ? input.topology : "series";
  const V = clampV(input.V);
  const fault = isFault(input.fault) ? input.fault : "none";
  const R: Triple = [clampR(input.R[0]), clampR(input.R[1]), clampR(input.R[2])];
  const base: CircuitInput = { topology, V, R, lamp: !!input.lamp, switchClosed: !!input.switchClosed, fault };
  const re = effectiveR(base);
  const Req = equivalentR(topology, re);
  const closed = base.switchClosed;

  let I = 0;
  let Vt = V;
  let currentLimited = false;
  if (closed && Number.isFinite(Req)) {
    const Iun = V / Req;
    if (Iun > CURRENT_LIMIT * (1 + 1e-12)) {
      currentLimited = true;
      I = CURRENT_LIMIT;
      Vt = CURRENT_LIMIT * Req;
    } else {
      I = Iun;
    }
  }

  const VR = z3();
  const IR = z3();
  const node: Partial<Record<NodeId, number>> = { P: V, G: 0 };
  const floating: NodeId[] = [];
  // When the switch is open, the source + terminal still sits at V (no load).
  if (closed) node.P = Vt;
  const openIdx = fault.startsWith("open") ? Number(fault.slice(-1)) - 1 : -1;

  switch (topology) {
    case "single": {
      if (closed) {
        node.A = Vt;
        VR[0] = Vt; // across R1 (or across the gap if R1 is open)
        IR[0] = I;
      } else if (openIdx === 0) {
        node.A = 0;
        floating.push("A");
      } else node.A = 0;
      break;
    }
    case "series": {
      if (closed && Number.isFinite(Req)) {
        node.A = Vt;
        node.B = Vt - I * re[0];
        node.C = node.B - I * re[1];
        for (let i = 0; i < 3; i++) {
          VR[i] = I * re[i];
          IR[i] = I;
        }
      } else if (closed) {
        // one open element in the loop: no current, full Vt across the gap
        const pot = (k: number) => (k <= openIdx ? Vt : 0); // node after resistor k-1
        node.A = Vt;
        node.B = pot(1);
        node.C = pot(2);
        VR[openIdx] = Vt;
      } else {
        node.A = node.B = node.C = 0;
        if (openIdx >= 0) {
          // nodes between S and the open element have no DC path: floating
          const seg: NodeId[] = (["A", "B", "C"] as NodeId[]).slice(0, openIdx + 1);
          floating.push(...seg);
        }
      }
      break;
    }
    case "parallel": {
      if (closed) {
        node.A = Vt;
        for (let i = 0; i < 3; i++) {
          VR[i] = Vt;
          IR[i] = Number.isFinite(re[i]) ? Vt / re[i] : 0;
        }
        if (Number.isFinite(Req)) {
          // keep the total exactly equal to the branch sum (KCL)
          I = IR[0] + IR[1] + IR[2];
        }
      } else node.A = 0;
      break;
    }
    case "mixed": {
      const rp = par(re[1], re[2]);
      if (closed && Number.isFinite(Req)) {
        node.A = Vt;
        const vb = I * rp;
        node.B = vb;
        VR[0] = I * re[0];
        IR[0] = I;
        VR[1] = VR[2] = vb;
        IR[1] = Number.isFinite(re[1]) ? vb / re[1] : 0;
        IR[2] = Number.isFinite(re[2]) ? vb / re[2] : 0;
      } else if (closed) {
        // only R1 open can make the network open
        node.A = Vt;
        node.B = 0;
        VR[0] = Vt;
      } else {
        node.A = node.B = 0;
        if (openIdx === 0) floating.push("A");
      }
      break;
    }
  }

  const PR: Triple = [VR[0] * IR[0], VR[1] * IR[1], VR[2] * IR[2]];
  const P = Vt * I;
  const shorted = currentLimited && Req < 0.1;
  return {
    state: { ...base, Req, I, VR, IR, PR, P, currentLimited, faultHidden: false, symptom: null, measurements: [], diagnosis: null },
    Vt,
    node,
    floating,
    shorted,
  };
}

export function compute(input: CircuitInput): CircuitState {
  return solve(input).state;
}

// ---------------------------------------------------------------------------
// Troubleshooting mission (hidden fault → symptom → measure → diagnose → repair)
// ---------------------------------------------------------------------------

/** Fault position (0-based) or −1 for "none"/unknown. */
export function faultIndex(fault: string): number {
  return isFault(fault) && fault !== "none" ? Number(fault.slice(-1)) - 1 : -1;
}

/** True when the fault sits on a resistor that is part of the current topology. */
export function faultActive(topology: Topology, fault: string): boolean {
  const i = faultIndex(fault);
  return i >= 0 && i < activeCount(topology);
}

/**
 * Symptom the learner would observe on the bench, derived by comparing the
 * faulty circuit with the same circuit without a fault. Never names the
 * component or the kind of fault. Null when no (active) fault exists or the
 * switch is open (nothing to observe).
 */
export function symptomFor(input: CircuitInput): string | null {
  const topology: Topology = isTopology(input.topology) ? input.topology : "series";
  if (!faultActive(topology, input.fault)) return null;
  if (!input.switchClosed) return "สวิตช์ยังเปิดอยู่ (OFF) — ปิดสวิตช์ก่อนจึงจะสังเกตอาการได้";
  const bad = solve(input);
  const good = solve({ ...input, fault: "none" });
  const loadName = input.lamp ? "หลอด" : "โหลด";
  const parts: string[] = [];
  if (bad.shorted) parts.push("แหล่งจ่ายเข้าโหมดจำกัดกระแส 3 A และแรงดันที่ขั้วตกเกือบเป็นศูนย์");
  else if (bad.state.I === 0) parts.push(input.lamp ? "หลอดไม่ติด กระแสรวมเป็นศูนย์" : "กระแสรวมเป็นศูนย์ ทั้งที่สวิตช์ ON");
  else if (bad.state.I > good.state.I * 1.02)
    parts.push(input.lamp ? "หลอดสว่างผิดปกติ กระแสรวมสูงกว่าที่คำนวณ" : "กระแสรวมสูงกว่าที่คำนวณจากค่า R ที่ติดฉลาก");
  else if (bad.state.I < good.state.I * 0.98)
    parts.push(input.lamp ? "หลอดหรี่กว่าปกติ กระแสรวมต่ำกว่าที่คำนวณ" : "กระแสรวมต่ำกว่าที่คำนวณจากค่า R ที่ติดฉลาก");
  else parts.push(`กระแสรวมใกล้ค่าปกติ แต่แรงดันคร่อม${loadName}บางตัวผิดจากที่คำนวณ`);
  if (bad.state.currentLimited && !bad.shorted) parts.push("แหล่งจ่ายเข้าโหมดจำกัดกระแส");
  return parts.join(" · ");
}

/** Canonical key for de-duplicating measurements: V across the same node pair (either way round) or the ammeter. */
export function measurementKey(m: Pick<Measurement, "kind" | "where">): string {
  if (m.kind === "I") return "I";
  const pair = m.where
    .split(/[–-]/)
    .map((s) => s.trim())
    .sort();
  return `V:${pair.join("–")}`;
}

/** Append a measurement unless the same node pair / ammeter has already been logged. Returns the same array when nothing was added. */
export function addMeasurement(log: readonly Measurement[], m: Measurement): Measurement[] {
  const key = measurementKey(m);
  if (log.some((x) => measurementKey(x) === key)) return log as Measurement[];
  return [...log, m];
}

/** Number of distinct measurements (node pairs + ammeter). */
export function distinctMeasurements(log: readonly Measurement[]): number {
  return new Set(log.map(measurementKey)).size;
}

/** Record the learner's diagnosis of the current fault. */
export function diagnose(fault: string, guess: string, log: readonly Measurement[]): Diagnosis {
  return { guess, correct: isFault(guess) && guess !== "none" && guess === fault, measurementsBefore: distinctMeasurements(log) };
}

/** mulberry32 — small deterministic PRNG for "สุ่มจุดเสียใหม่". */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick a new hidden fault for the topology, deterministically from `seed`.
 * Never returns "none" and never repeats `exclude` when another choice exists.
 */
export function randomFault(seed: number, topology: Topology, exclude = "none"): Fault {
  const n = activeCount(topology);
  const pool: Fault[] = [];
  for (let i = 1; i <= n; i++) pool.push(`open${i}` as Fault, `short${i}` as Fault);
  const cand = pool.filter((f) => f !== exclude);
  const list = cand.length ? cand : pool;
  const r = seededRandom(seed)();
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

/**
 * Ideal high-impedance voltmeter between two nodes (red − black).
 * A floating node has no DC path to the source, so the meter closes no loop
 * and reads 0 V (flag `floating` so the UI can explain it).
 */
export function voltmeter(sol: Solution, red: NodeId, black: NodeId): { v: number; floating: boolean } {
  const fl = sol.floating.includes(red) || sol.floating.includes(black);
  if (fl || red === black) return { v: 0, floating: fl };
  const a = sol.node[red];
  const b = sol.node[black];
  if (a === undefined || b === undefined) return { v: 0, floating: false };
  return { v: a - b, floating: false };
}

/** Lamp brightness 0–1 (∝ P / rated P), overload flag (> 1.2 × rated). */
export function lampStatus(s: CircuitState): { brightness: number; overload: boolean; P: number } {
  // a short across the lamp position carries the current in the bypass → filament dark
  if (!s.lamp || s.fault === "short1") return { brightness: 0, overload: false, P: 0 };
  const P = s.PR[0];
  return { brightness: Math.min(1, P / LAMP_RATED_P), overload: P > LAMP_RATED_P * LAMP_OVERLOAD, P };
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface PresetDef {
  label: string;
  description: string;
  input: CircuitInput;
  /** Fault is present but not revealed to the learner. */
  hidden?: boolean;
}

const base = (o: Partial<CircuitInput>): CircuitInput => ({
  topology: "series",
  V: 12,
  R: [100, 220, 330],
  lamp: false,
  switchClosed: true,
  fault: "none",
  ...o,
});

export const PRESETS: Record<string, PresetDef> = {
  default: {
    label: "ค่าเริ่มต้น (อนุกรม 12 V)",
    description: "วงจรอนุกรม 12 V กับ R1 = 100 Ω, R2 = 220 Ω, R3 = 330 Ω",
    input: base({}),
  },
  "series-basic": {
    label: "วงจรอนุกรมพื้นฐาน (series)",
    description: "12 V อนุกรม 100 Ω + 200 Ω + 300 Ω → R รวม 600 Ω กระแส 20 mA แรงดันตกคร่อม 2 / 4 / 6 V",
    input: base({ R: [100, 200, 300] }),
  },
  "parallel-basic": {
    label: "วงจรขนานพื้นฐาน (parallel)",
    description: "12 V ขนาน 300 Ω ‖ 600 Ω ‖ 600 Ω → R รวม 150 Ω กระแสรวม 80 mA (40 + 20 + 20 mA)",
    input: base({ topology: "parallel", R: [300, 600, 600] }),
  },
  "mixed-basic": {
    label: "วงจรผสมพื้นฐาน (mixed)",
    description: "12 V, R1 = 100 Ω อนุกรมกับ R2 = R3 = 200 Ω ที่ขนานกัน → R รวม 200 Ω กระแส 60 mA",
    input: base({ topology: "mixed", R: [100, 200, 200] }),
  },
  lamp: {
    label: "หลอดไฟ 12 V (lamp)",
    description: "แหล่งจ่าย 12 V ต่อหลอด 12 V 6 W (24 Ω) ผ่านสวิตช์ทางเดียว",
    input: base({ topology: "single", lamp: true }),
  },
  "fault-open": {
    label: "หาจุดบกพร่อง: วงจรขาด (open)",
    description: "วงจรอนุกรม 12 V มีตัวต้านทานขาด 1 ตัว (ซ่อนอยู่) — วัดแรงดันเพื่อหาว่าตัวไหน",
    input: base({ fault: "open2" }),
    hidden: true,
  },
  "fault-short": {
    label: "หาจุดบกพร่อง: ลัดวงจร (short)",
    description: "วงจรอนุกรม 12 V มีตัวต้านทานลัดวงจร 1 ตัว (ซ่อนอยู่) — วัดแรงดันเพื่อหาว่าตัวไหน",
    input: base({ fault: "short3" }),
    hidden: true,
  },
  kvl: {
    label: "กฎแรงดันของเคียร์ชอฟฟ์ (KVL)",
    description: "อนุกรม 9 V กับ 1 kΩ, 2.2 kΩ, 3.3 kΩ — ผลรวมแรงดันตกคร่อมเท่ากับแรงดันแหล่งจ่าย",
    input: base({ V: 9, R: [1000, 2200, 3300] }),
  },
  kcl: {
    label: "กฎกระแสของเคียร์ชอฟฟ์ (KCL)",
    description: "ขนาน 12 V กับ 1 kΩ, 2 kΩ, 4 kΩ — กระแสรวมเท่ากับผลรวมกระแสแต่ละกิ่ง (12 + 6 + 3 = 21 mA)",
    input: base({ topology: "parallel", R: [1000, 2000, 4000] }),
  },
};

export function getPreset(key?: string): PresetDef {
  return (key && PRESETS[key]) || PRESETS.default;
}

/**
 * Speed for current-flow dots (viewBox units / s). Log-compressed between
 * settings (1 µA … 3 A) so small currents remain visible; within one circuit
 * every segment is scaled in exact proportion to its current.
 */
export function flowSpeed(I: number, Itotal: number): number {
  if (!(I > 1e-12) || !(Itotal > 1e-12)) return 0;
  const lo = Math.log10(1e-6);
  const hi = Math.log10(CURRENT_LIMIT);
  const t = Math.min(1, Math.max(0, (Math.log10(Itotal) - lo) / (hi - lo)));
  const totalSpeed = 10 + 150 * t;
  return totalSpeed * (I / Itotal);
}
