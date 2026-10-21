/**
 * DC motor control — pure model (no React).
 *
 * Permanent-magnet DC motor, steady state:
 *   T_motor = k·I,   E = k·ω,   V_eff = E + I·Ra
 *   running:  I = (T_L + T_f)/k,  ω = (V_eff − I·Ra)/k
 *   stall:    if V_eff ≤ (T_L + T_f)·Ra/k the torque k·V_eff/Ra cannot
 *             overcome friction + load → ω = 0, I = V_eff/Ra.
 * PWM is modelled by its average V_eff = duty × V.
 *
 * Tabs:
 *   pwm       — supply V, duty, load torque (+ "locked rotor" toggle).
 *   hbridge   — S1 high-left, S2 low-left, S3 high-right, S4 low-right.
 *   contactor — 24 V control rung STOP(NC) → START(NO) ∥ K1 13–14 → coil K1
 *               → OL 95–96 (NC); main contact K1 1–2 + OL heater feed the
 *               same 12 V DC motor.
 *
 * Speeds are magnitudes (rpm, omega ≥ 0); the sense of rotation is in
 * `direction`.
 */

export type MotorTab = "pwm" | "hbridge" | "contactor";
export type Direction = "cw" | "ccw" | "stop";
export type BridgeMode = "forward" | "reverse" | "brake-low" | "brake-high" | "coast" | "shoot-through";
/** How the rotor speed approaches its steady state (animation only). */
export type Motion = "drive" | "coast" | "brake";
export type Switches = [boolean, boolean, boolean, boolean];

export const V_RATED = 12;
export const V_MAX = 12;
export const RA = 2; // Ω
export const K = 0.02; // V·s/rad = N·m/A
export const T_FRICTION = 0.005; // N·m
export const LOAD_MAX = 0.05; // N·m
/** Small rotor + load inertia (kg·m²) → mechanical time constant J·Ra/k² = 0.15 s. */
export const J = 3e-5;
export const TAU_M = (J * RA) / (K * K);
/** Above this the winding overheats if sustained (warning). */
export const OVERHEAT_I = 3;
export const CONTROL_V = 24;

export const RAD_TO_RPM = 60 / (2 * Math.PI);
export const toRpm = (omega: number) => omega * RAD_TO_RPM;

export interface MotorInputs {
  tab: MotorTab;
  V: number;
  /** 0…1 */
  duty: number;
  /** Load torque, N·m. */
  load: number;
  /** PWM frequency, Hz (display only). */
  pwmFreq: number;
  /** Rotor mechanically jammed (demonstrates stall current). */
  locked: boolean;
  switches: Switches;
  /** Bridge fuse blown (latched until reset). */
  fuseBlown: boolean;
  startPressed: boolean;
  stopPressed: boolean;
  /** Overload relay tripped: 95–96 open (latched until OL reset). */
  olTripped: boolean;
}

export interface ContactorState {
  coil: boolean;
  /** Holding (seal-in) contact K1 13–14 closed. */
  holding: boolean;
  running: boolean;
  overloadTripped: boolean;
  // extras
  startPressed: boolean;
  stopPressed: boolean;
  /** K1 1–2 main contact closed. */
  mainClosed: boolean;
}

export interface MotorState {
  tab: MotorTab;
  V: number;
  duty: number;
  load: number;
  rpm: number;
  omega: number;
  current: number;
  backEmf: number;
  direction: Direction;
  stalled: boolean;
  switches: Switches;
  shortCircuit: boolean;
  braking: boolean;
  contactor: ContactorState;
  // --- extras (not part of the check contract) ---
  /** Average voltage applied to the motor terminals (magnitude). */
  vEff: number;
  pIn: number;
  pOut: number;
  pCopper: number;
  pFriction: number;
  /** 0…1 */
  efficiency: number;
  overheat: boolean;
  locked: boolean;
  pwmFreq: number;
  fuseBlown: boolean;
  bridgeMode: BridgeMode;
  motion: Motion;
}

export interface OperatingPoint {
  omega: number;
  current: number;
  backEmf: number;
  stalled: boolean;
}

/** Steady-state operating point for an applied average voltage ≥ 0. */
export function operatingPoint(vEff: number, load: number, locked = false): OperatingPoint {
  const v = Math.max(0, vEff);
  if (v <= 0) return { omega: 0, current: 0, backEmf: 0, stalled: false };
  const iRun = (Math.max(0, load) + T_FRICTION) / K;
  if (locked || v <= iRun * RA) return { omega: 0, current: v / RA, backEmf: 0, stalled: true };
  const omega = (v - iRun * RA) / K;
  return { omega, current: iRun, backEmf: K * omega, stalled: false };
}

/** Lowest V_eff at which the motor starts turning against T_L + T_f. */
export function startVoltage(load: number): number {
  return ((Math.max(0, load) + T_FRICTION) / K) * RA;
}

export function bridgeMode(sw: Switches): BridgeMode {
  const [s1, s2, s3, s4] = sw;
  if ((s1 && s2) || (s3 && s4)) return "shoot-through";
  if (s1 && s4) return "forward";
  if (s3 && s2) return "reverse";
  if (s2 && s4) return "brake-low";
  if (s1 && s3) return "brake-high";
  return "coast";
}

/** Settle input side effects: shoot-through blows the fuse (latched). */
export function settle(inp: MotorInputs): MotorInputs {
  if (inp.tab === "hbridge" && bridgeMode(inp.switches) === "shoot-through" && !inp.fuseBlown) return { ...inp, fuseBlown: true };
  return inp;
}

/** Replace the fuse: all switches are opened first (safe procedure). */
export function resetFuse(inp: MotorInputs): MotorInputs {
  return { ...inp, fuseBlown: false, switches: [false, false, false, false] };
}

/** "จำลองโหลดเกิน": the thermal overload only trips when motor current flows. */
export function simulateOverload(inp: MotorInputs, s: MotorState): MotorInputs {
  return s.contactor.running ? { ...inp, olTripped: true } : inp;
}

const OFF_CONTACTOR = (inp: MotorInputs): ContactorState => ({
  coil: false,
  holding: false,
  running: false,
  overloadTripped: inp.tab === "contactor" && inp.olTripped,
  startPressed: inp.tab === "contactor" && inp.startPressed,
  stopPressed: inp.tab === "contactor" && inp.stopPressed,
  mainClosed: false,
});

/**
 * Solve the lab for the inputs. `prev` carries the contactor armature (for
 * the self-holding contact). Pass `undefined` for a fresh board.
 */
export function solve(raw: MotorInputs, prev?: MotorState): MotorState {
  const inp = settle(raw);
  const V = Math.min(V_MAX, Math.max(0, inp.V));
  const duty = Math.min(1, Math.max(0, inp.duty));
  const load = Math.min(LOAD_MAX, Math.max(0, inp.load));

  let vEff = 0;
  let sense: 1 | -1 = 1;
  let shortCircuit = false;
  let braking = false;
  let motion: Motion = "coast";
  let mode: BridgeMode = "coast";
  let contactor = OFF_CONTACTOR(inp);

  if (inp.tab === "pwm") {
    vEff = duty * V;
    motion = "drive";
  } else if (inp.tab === "hbridge") {
    mode = bridgeMode(inp.switches);
    if (inp.fuseBlown || mode === "shoot-through") {
      shortCircuit = true;
      motion = "coast";
    } else if (mode === "forward" || mode === "reverse") {
      vEff = duty * V;
      sense = mode === "forward" ? 1 : -1;
      motion = "drive";
    } else if (mode === "brake-low" || mode === "brake-high") {
      braking = true;
      motion = "brake";
    }
  } else {
    const wasOn = prev?.tab === "contactor" ? prev.contactor.coil : false;
    const coil = !inp.stopPressed && !inp.olTripped && (inp.startPressed || wasOn);
    contactor = { ...contactor, coil, holding: coil, running: coil && V > 0, mainClosed: coil };
    vEff = coil ? V : 0;
    motion = coil ? "drive" : "coast";
  }

  const op = operatingPoint(vEff, load, inp.locked);
  const omega = op.omega;
  const direction: Direction = omega > 0 ? (sense === 1 ? "cw" : "ccw") : "stop";
  const pIn = vEff * op.current;
  const pOut = load * omega;

  return {
    tab: inp.tab,
    V,
    duty,
    load,
    rpm: toRpm(omega),
    omega,
    current: op.current,
    backEmf: op.backEmf,
    direction,
    stalled: op.stalled,
    switches: [...inp.switches] as Switches,
    shortCircuit,
    braking,
    contactor,
    vEff,
    pIn,
    pOut,
    pCopper: op.current * op.current * RA,
    pFriction: T_FRICTION * omega,
    efficiency: pIn > 0 ? pOut / pIn : 0,
    overheat: op.current > OVERHEAT_I,
    locked: inp.locked,
    pwmFreq: inp.pwmFreq,
    fuseBlown: inp.tab === "hbridge" && inp.fuseBlown,
    bridgeMode: inp.tab === "hbridge" ? mode : "coast",
    motion,
  };
}

/** Signed steady-state speed (+ = cw) used as the animation target. */
export function signedOmega(s: MotorState): number {
  return s.direction === "ccw" ? -s.omega : s.omega;
}

/**
 * Advance the displayed (signed) speed by dt seconds toward the target.
 *  drive — first-order lag with τ = J·Ra/k² (exact for this linear model).
 *  brake — terminals shorted: same τ toward 0 plus friction deceleration.
 *  coast — terminals open: only friction + load decelerate the rotor.
 */
export function stepOmega(w: number, target: number, motion: Motion, dt: number, load: number): number {
  if (!(dt > 0)) return w;
  const decel = ((T_FRICTION + Math.max(0, load)) / J) * dt;
  const toward0 = (x: number, d: number) => (Math.abs(x) <= d ? 0 : x - Math.sign(x) * d);
  if (motion === "drive") return target + (w - target) * Math.exp(-dt / TAU_M);
  if (motion === "brake") return toward0(w * Math.exp(-dt / TAU_M), decel);
  return toward0(w, decel);
}

/** Thai text state of the motor (colour is never the only signal). */
export function statusText(s: MotorState): string {
  if (s.shortCircuit) return "หยุด – ฟิวส์ขาด (ลัดวงจร)";
  if (s.braking) return "เบรก";
  if (s.direction === "cw") return "หมุนตามเข็ม (CW)";
  if (s.direction === "ccw") return "หมุนทวนเข็ม (CCW)";
  if (s.stalled) return s.locked ? "หยุด – เพลาถูกล็อก (stall)" : "หยุด – แรงดันไม่พอ (stall)";
  if (s.tab === "hbridge") return "หยุด – หมุนอิสระ (coast)";
  return "หยุด";
}

export function bridgeModeText(m: BridgeMode): string {
  switch (m) {
    case "forward":
      return "เดินหน้า S1 + S4";
    case "reverse":
      return "ถอยหลัง S3 + S2";
    case "brake-low":
      return "เบรก S2 + S4 (ลัดขั้วมอเตอร์ลง 0 V)";
    case "brake-high":
      return "เบรก S1 + S3 (ลัดขั้วมอเตอร์ที่ +V)";
    case "shoot-through":
      return "Shoot-through! บนและล่างขาเดียวกันต่อพร้อมกัน";
    default:
      return "หมุนอิสระ (coast) – ขั้วมอเตอร์ลอย";
  }
}

/** PWM waveform points for `periods` cycles; time in `unit` (s × scale). */
export function pwmWave(V: number, duty: number, freq: number, periods = 3): { points: [number, number][]; scale: number; unit: "ms" | "µs"; T: number } {
  const T = 1 / Math.max(1, freq);
  const scale = periods * T < 1e-3 ? 1e6 : 1e3;
  const unit = scale === 1e6 ? "µs" : "ms";
  const d = Math.min(1, Math.max(0, duty));
  const pts: [number, number][] = [];
  for (let n = 0; n < periods; n++) {
    const t0 = n * T * scale;
    const t1 = (n + d) * T * scale;
    const t2 = (n + 1) * T * scale;
    if (d <= 0) pts.push([t0, 0], [t2, 0]);
    else if (d >= 1) pts.push([t0, V], [t2, V]);
    else pts.push([t0, 0], [t0, V], [t1, V], [t1, 0], [t2, 0]);
  }
  return { points: pts, scale, unit, T };
}

/** Speed–torque line (rpm vs load N·m) at V_eff for the plot. */
export function speedTorqueCurve(vEff: number, n = 26): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const tl = (LOAD_MAX * i) / (n - 1);
    out.push([tl, toRpm(operatingPoint(vEff, tl).omega)]);
  }
  return out;
}

/**
 * Steady-state rpm and current against duty (0…1) at supply V and load torque.
 * Below the start voltage the motor stalls: rpm 0 and I = V_eff/Ra (rising
 * with duty); once running, I is set by the load alone while rpm rises linearly.
 */
export function dutyCurves(V: number, load: number, locked = false, n = 51): { rpm: [number, number][]; current: [number, number][] } {
  const rpm: [number, number][] = [];
  const current: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const d = i / (n - 1);
    const op = operatingPoint(d * V, load, locked);
    rpm.push([d * 100, toRpm(op.omega)]);
    current.push([d * 100, op.current]);
  }
  return { rpm, current };
}

export const DEFAULT_INPUTS: MotorInputs = {
  tab: "pwm",
  V: 12,
  duty: 1,
  load: 0,
  pwmFreq: 1000,
  locked: false,
  switches: [false, false, false, false],
  fuseBlown: false,
  startPressed: false,
  stopPressed: false,
  olTripped: false,
};

/** Initial inputs per preset (unknown → default). */
export function presetInputs(preset: string | undefined): MotorInputs {
  const base: MotorInputs = { ...DEFAULT_INPUTS, switches: [false, false, false, false] };
  switch (preset) {
    case "pwm":
      return { ...base, duty: 0.5 };
    case "hbridge":
      return { ...base, tab: "hbridge" };
    case "contactor":
      return { ...base, tab: "contactor" };
    default:
      return base;
  }
}
