/**
 * Virtual oscilloscope + function generator model (pure, deterministic, SI units).
 *
 * Screen: 10 horizontal × 8 vertical divisions. Screen coordinates are in
 * divisions: x ∈ [0, 10] (left → right), y ∈ [−4, +4] (centre line = 0).
 *
 *   displayed volts  v_d(t) = (v_raw(t) − [AC ? mean : 0]) × probeMenu / probeSwitch   (GND → 0)
 *   screen y         y = pos + v_d / VOLTS_DIV
 *   screen x         t = t_trig + (x − 5 − hpos) × TIME_DIV       (trigger point at the centre + hpos)
 *
 * Probe: the physical switch ×10 divides the voltage reaching the scope by 10;
 * the menu setting ×10 multiplies the displayed value by 10. Matched → true volts.
 * Switch ×10 with menu ×1 → trace & readings 10× too small; switch ×1 with menu ×10 → 10× too large.
 *
 * Trigger: the trigger channel's displayed waveform must actually cross the
 * level (min < level < max, strictly). Otherwise the scope free-runs (AUTO):
 * `triggered = false`, the trace rolls and the screen shows "Trig?".
 *
 * Ch2 extra sources (weeks 10/13): 12 V rms 50 Hz transformer secondary and its
 * rectified output (half-wave: 1 diode drop 0.7 V; bridge: 2 drops = 1.4 V;
 * bridge + 470 µF ‖ 1 kΩ: ideal-diode peak charging, exponential discharge).
 */
import { oneTwoFive } from "../shared/format";

export type Wave = "sine" | "square" | "triangle" | "dc";
export type Coupling = "AC" | "DC" | "GND";
export type ProbeX = 1 | 10;
/** Signal connected to a channel. `gen` = the built-in function generator. */
export type Source = "gen" | "transformer" | "halfwave" | "bridge" | "bridge-cap";
export type Ch2Source = Source | "off";
export type Edge = "rising" | "falling";

export interface GenSettings {
  wave: Wave;
  /** Hz */
  freq: number;
  /** peak-to-peak V (ignored for `dc`) */
  vpp: number;
  /** DC offset V (for `dc` this is the output voltage) */
  offset: number;
}

export interface ChannelSettings<S extends string = Source> {
  /** V per division (as displayed, i.e. after the menu probe factor). */
  voltsDiv: number;
  /** Vertical position of the channel's 0 V (ground) marker, in divisions (−4…+4). */
  pos: number;
  coupling: Coupling;
  probeMenu: ProbeX;
  probeSwitch: ProbeX;
  source: S;
}

export interface TriggerSettings {
  /** V (displayed volts of the trigger source channel). */
  level: number;
  edge: Edge;
  source: 1 | 2;
}

export interface CursorSettings {
  on: boolean;
  ch: 1 | 2;
  /** time cursors, divisions from the left edge (0…10) */
  x1: number;
  x2: number;
  /** voltage cursors, divisions from the centre line (−4…+4) */
  y1: number;
  y2: number;
}

export interface OscInputs {
  gen: GenSettings;
  ch1: ChannelSettings<Source>;
  ch2: ChannelSettings<Ch2Source>;
  /** s per division */
  timeDiv: number;
  /** horizontal position of the trigger point, divisions (−5…+5) */
  hpos: number;
  trigger: TriggerSettings;
  cursors: CursorSettings;
  measureVisible: boolean;
  mystery: boolean;
  /** PRNG seed used to draw the mystery generator settings. */
  seed: number;
}

export interface Measurement {
  /** all values are DISPLAYED volts (probe factor & coupling applied) */
  vpp: number;
  vmax: number;
  vmin: number;
  vmean: number;
  /** true RMS over one period (includes DC in DC coupling) */
  vrms: number;
  /** Hz; NaN when the trace is flat (no period to measure) */
  freq: number;
  period: number;
  /** waveform runs off the top/bottom of the graticule → readings unreliable */
  clipped: boolean;
  /** peak-to-peak height in divisions */
  divs: number;
}

export interface OscilloscopeState extends OscInputs {
  triggered: boolean;
  /** CH1 Vpp in divisions as shown on the screen */
  divsVertical: number;
  /** CH1 cycles across the 10 horizontal divisions */
  cyclesOnScreen: number;
  /** whole CH1 waveform inside the 8 vertical divisions */
  fullyOnScreen: boolean;
  /** generator output hit its ±10 V limit (vpp/2 + |offset| > 10 V) */
  genClipped: boolean;
  meas1: Measurement;
  meas2: Measurement | null;
  /** absolute time (s) at the trigger point; meaningful when triggered */
  tTrig: number;
  cursor: { dt: number; invDt: number; dV: number; v1: number; v2: number };
}

// ---------------------------------------------------------------------------
// Ranges (1-2-5 sequences)
// ---------------------------------------------------------------------------

export const DIVS_X = 10;
export const DIVS_Y = 8;
export const MINOR_PER_DIV = 5;
export const VOLTS_DIV_STEPS = oneTwoFive(5e-3, 10); // 5 mV … 10 V
export const TIME_DIV_STEPS = oneTwoFive(1e-6, 0.5); // 1 µs … 500 ms
export const FREQ_STEPS = oneTwoFive(1, 1e5); // 1 Hz … 100 kHz
export const LIMITS = {
  freq: [1, 1e5] as const,
  vpp: [0.1, 20] as const,
  offset: [-5, 5] as const,
  pos: [-4, 4] as const,
  hpos: [-5, 5] as const,
};
/** Function generator output limit into a high-impedance load (±10 V). */
export const GEN_LIMIT_V = 10;

export const TRANSFORMER_VRMS = 12;
export const MAINS_F = 50;
export const DIODE_DROP = 0.7;
export const FILTER_C = 470e-6;
export const LOAD_R = 1000;

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const fin = (x: number, d: number) => (Number.isFinite(x) ? x : d);

/** Snap to the nearest value of a 1-2-5 list (log distance). */
export function snapStep(list: number[], v: number): number {
  let best = list[0];
  let bd = Infinity;
  for (const s of list) {
    const d = Math.abs(Math.log(s) - Math.log(Math.max(v, 1e-12)));
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

/** Next/previous 1-2-5 value from v (dir = +1 / −1). */
export function stepValue(list: number[], v: number, dir: 1 | -1): number {
  if (dir > 0) return list.find((s) => s > v * 1.0001) ?? list[list.length - 1];
  for (let i = list.length - 1; i >= 0; i--) if (list[i] < v * 0.9999) return list[i];
  return list[0];
}

// ---------------------------------------------------------------------------
// Signal sources
// ---------------------------------------------------------------------------

const frac = (x: number) => x - Math.floor(x);

/** Unit waveform shapes, phase φ ∈ [0,1): zero crossing rising at φ = 0 (square: rising edge at 0). */
export function shape(wave: Wave, phi: number): number {
  const p = frac(phi);
  switch (wave) {
    case "sine":
      return Math.sin(2 * Math.PI * p);
    case "square":
      return p < 0.5 ? 1 : -1;
    case "triangle":
      return p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4;
    case "dc":
      return 0;
  }
}

/** Generator output voltage at time t (V), limited to ±10 V. */
export function genVoltage(g: GenSettings, t: number): number {
  const a = g.wave === "dc" ? 0 : g.vpp / 2;
  return clamp(g.offset + a * shape(g.wave, g.freq * t), -GEN_LIMIT_V, GEN_LIMIT_V);
}

export function genClipped(g: GenSettings): boolean {
  const a = g.wave === "dc" ? 0 : g.vpp / 2;
  return a + Math.abs(g.offset) > GEN_LIMIT_V + 1e-9;
}

const VPK = TRANSFORMER_VRMS * Math.SQRT2;

/** Transformer secondary 12 V rms 50 Hz. */
export function transformerV(t: number): number {
  return VPK * Math.sin(2 * Math.PI * MAINS_F * t);
}

/** Half-wave rectifier (1 diode, 0.7 V) across the 1 kΩ load. */
export function halfwaveV(t: number): number {
  return Math.max(0, transformerV(t) - DIODE_DROP);
}

/** Bridge rectifier (2 diodes conduct per half cycle → 1.4 V) across the load. */
export function bridgeV(t: number): number {
  return Math.max(0, Math.abs(transformerV(t)) - 2 * DIODE_DROP);
}

/**
 * Bridge + C ‖ R_L, steady state, ideal (zero-resistance) diodes: the capacitor
 * follows the rectified voltage up to each peak, then discharges as
 * Vm·e^(−(t − t_pk)/RC) until the rising rectified voltage catches up again.
 */
export function bridgeCapV(t: number): number {
  const half = 1 / (2 * MAINS_F);
  const quarter = half / 2;
  const vm = VPK - 2 * DIODE_DROP;
  const tpk = quarter + Math.floor((t - quarter) / half) * half; // last peak ≤ t
  const decay = vm * Math.exp(-(t - tpk) / (LOAD_R * FILTER_C));
  return Math.max(bridgeV(t), decay);
}

export function sourceVoltage(src: Source, g: GenSettings, t: number): number {
  switch (src) {
    case "gen":
      return genVoltage(g, t);
    case "transformer":
      return transformerV(t);
    case "halfwave":
      return halfwaveV(t);
    case "bridge":
      return bridgeV(t);
    case "bridge-cap":
      return bridgeCapV(t);
  }
}

/** Fundamental period (s); Infinity for a constant (DC) source. */
export function sourcePeriod(src: Source, g: GenSettings): number {
  if (src === "gen") return g.wave === "dc" ? Infinity : 1 / g.freq;
  if (src === "transformer" || src === "halfwave") return 1 / MAINS_F;
  return 1 / (2 * MAINS_F);
}

// ---------------------------------------------------------------------------
// Channel signal path
// ---------------------------------------------------------------------------

/** Display factor of the probe: menu / switch (1 when matched). */
export function probeFactor(ch: { probeMenu: ProbeX; probeSwitch: ProbeX }): number {
  return ch.probeMenu / ch.probeSwitch;
}

const N_PERIOD = 4096;

/** Raw one-period statistics (V) of a source. */
function rawStats(src: Source, g: GenSettings) {
  const T = sourcePeriod(src, g);
  if (!Number.isFinite(T)) {
    const v = sourceVoltage(src, g, 0);
    return { T, min: v, max: v, mean: v, ms: v * v };
  }
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sq = 0;
  for (let k = 0; k < N_PERIOD; k++) {
    const v = sourceVoltage(src, g, (k / N_PERIOD) * T);
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    sq += v * v;
  }
  return { T, min, max, mean: sum / N_PERIOD, ms: sq / N_PERIOD };
}

export interface ChannelPath {
  /** displayed volts at absolute time t */
  v: (t: number) => number;
  period: number;
  min: number;
  max: number;
  mean: number;
  rms: number;
}

/** Build the displayed-voltage function of a channel (probe factor, coupling). */
export function channelPath(ch: ChannelSettings<Source>, g: GenSettings): ChannelPath {
  if (ch.coupling === "GND") return { v: () => 0, period: Infinity, min: 0, max: 0, mean: 0, rms: 0 };
  const k = probeFactor(ch);
  const st = rawStats(ch.source, g);
  const dc = ch.coupling === "AC" ? st.mean : 0;
  // AC coupling: subtract the mean → variance; DC: raw mean square
  const ms = ch.coupling === "AC" ? Math.max(0, st.ms - st.mean * st.mean) : st.ms;
  const flat = st.max - st.min < 1e-12;
  return {
    v: (t) => (sourceVoltage(ch.source, g, t) - dc) * k,
    period: flat ? Infinity : st.T,
    min: (st.min - dc) * k,
    max: (st.max - dc) * k,
    mean: (st.mean - dc) * k,
    rms: Math.sqrt(ms) * Math.abs(k),
  };
}

/** Screen y (divisions) for a displayed voltage. */
export function screenY(v: number, ch: { voltsDiv: number; pos: number }): number {
  return ch.pos + v / ch.voltsDiv;
}

/** Absolute time at screen x (divisions). */
export function timeAtX(x: number, tTrig: number, timeDiv: number, hpos: number): number {
  return tTrig + (x - DIVS_X / 2 - hpos) * timeDiv;
}

const CLIP_TOL = 0.02; // div

export function measure(ch: ChannelSettings<Source>, g: GenSettings): Measurement {
  const p = channelPath(ch, g);
  const vpp = p.max - p.min;
  const top = screenY(p.max, ch);
  const bot = screenY(p.min, ch);
  return {
    vpp,
    vmax: p.max,
    vmin: p.min,
    vmean: p.mean,
    vrms: p.rms,
    period: p.period,
    freq: Number.isFinite(p.period) ? 1 / p.period : NaN,
    clipped: top > DIVS_Y / 2 + CLIP_TOL || bot < -DIVS_Y / 2 - CLIP_TOL,
    divs: vpp / ch.voltsDiv,
  };
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/**
 * Find a trigger point within one period: the time where the displayed
 * waveform crosses `level` with the requested edge. `triggered` is false when
 * the level is not strictly inside (min, max) of the waveform or it is flat.
 */
export function findTrigger(p: ChannelPath, level: number, edge: Edge): { triggered: boolean; t0: number } {
  if (!Number.isFinite(p.period) || !(level > p.min + 1e-9 && level < p.max - 1e-9)) return { triggered: false, t0: 0 };
  const T = p.period;
  const s = new Float64Array(N_PERIOD + 1);
  for (let k = 0; k <= N_PERIOD; k++) s[k] = p.v(((k + 0.5) / N_PERIOD) * T); // half-sample offset avoids exact-zero ties
  for (let k = 0; k < N_PERIOD; k++) {
    const a = s[k];
    const b = s[k + 1];
    const hit = edge === "rising" ? a < level && b >= level : a > level && b <= level;
    if (hit) {
      const f = b === a ? 0 : (level - a) / (b - a);
      return { triggered: true, t0: ((k + 0.5 + f) / N_PERIOD) * T };
    }
  }
  return { triggered: false, t0: 0 };
}

/** True when two periods are harmonically related (one is an integer multiple of the other). */
function commensurate(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  const r = a > b ? a / b : b / a;
  return Math.abs(r - Math.round(r)) < 1e-6;
}

// ---------------------------------------------------------------------------
// Solve
// ---------------------------------------------------------------------------

export function sanitize(inp: OscInputs): OscInputs {
  const ch = <S extends string>(c: ChannelSettings<S>): ChannelSettings<S> => ({
    ...c,
    voltsDiv: snapStep(VOLTS_DIV_STEPS, fin(c.voltsDiv, 1)),
    pos: clamp(fin(c.pos, 0), LIMITS.pos[0], LIMITS.pos[1]),
    probeMenu: c.probeMenu === 10 ? 10 : 1,
    probeSwitch: c.probeSwitch === 10 ? 10 : 1,
  });
  return {
    ...inp,
    gen: {
      wave: inp.gen.wave,
      freq: clamp(fin(inp.gen.freq, 1000), LIMITS.freq[0], LIMITS.freq[1]),
      vpp: clamp(fin(inp.gen.vpp, 4), LIMITS.vpp[0], LIMITS.vpp[1]),
      offset: clamp(fin(inp.gen.offset, 0), LIMITS.offset[0], LIMITS.offset[1]),
    },
    ch1: ch(inp.ch1),
    ch2: ch(inp.ch2),
    timeDiv: snapStep(TIME_DIV_STEPS, fin(inp.timeDiv, 2e-4)),
    hpos: clamp(fin(inp.hpos, 0), LIMITS.hpos[0], LIMITS.hpos[1]),
    trigger: { ...inp.trigger, level: fin(inp.trigger.level, 0), source: inp.trigger.source === 2 ? 2 : 1 },
    cursors: {
      ...inp.cursors,
      x1: clamp(fin(inp.cursors.x1, 3), 0, DIVS_X),
      x2: clamp(fin(inp.cursors.x2, 7), 0, DIVS_X),
      y1: clamp(fin(inp.cursors.y1, -1), -DIVS_Y / 2, DIVS_Y / 2),
      y2: clamp(fin(inp.cursors.y2, 1), -DIVS_Y / 2, DIVS_Y / 2),
    },
  };
}

const ch2Active = (c: ChannelSettings<Ch2Source>): c is ChannelSettings<Source> => c.source !== "off";

export function solve(raw: OscInputs): OscilloscopeState {
  const inp = sanitize(raw);
  const g = inp.gen;
  const meas1 = measure(inp.ch1, g);
  const meas2 = ch2Active(inp.ch2) ? measure(inp.ch2, g) : null;
  const trigCh = inp.trigger.source === 2 && ch2Active(inp.ch2) ? inp.ch2 : inp.trigger.source === 1 ? inp.ch1 : null;
  const trig = trigCh ? findTrigger(channelPath(trigCh, g), inp.trigger.level, inp.trigger.edge) : { triggered: false, t0: 0 };
  const T1 = sourcePeriod(inp.ch1.source, g);
  const cyc = Number.isFinite(T1) ? (DIVS_X * inp.timeDiv) / T1 : 0;
  const c = inp.cursors;
  const cvd = c.ch === 2 && ch2Active(inp.ch2) ? inp.ch2 : inp.ch1;
  const dt = Math.abs(c.x2 - c.x1) * inp.timeDiv;
  const v1 = (c.y1 - cvd.pos) * cvd.voltsDiv;
  const v2 = (c.y2 - cvd.pos) * cvd.voltsDiv;
  return {
    ...inp,
    triggered: trig.triggered,
    tTrig: trig.t0,
    divsVertical: meas1.divs,
    cyclesOnScreen: cyc,
    fullyOnScreen: !meas1.clipped,
    genClipped: genClipped(g),
    meas1,
    meas2,
    cursor: { dt, invDt: dt > 0 ? 1 / dt : Infinity, dV: v2 - v1, v1, v2 },
  };
}

// ---------------------------------------------------------------------------
// Traces for the screen
// ---------------------------------------------------------------------------

export interface TraceLine {
  pts: [number, number][];
  /** 1 = main sweep; lower values = earlier free-running sweeps (untriggered ghosting) */
  opacity: number;
}

export interface Trace {
  ch: 1 | 2;
  lines: TraceLine[];
  /** Signal too fast for TIME/DIV: drawn as a band between these screen y's. */
  band: { top: number; bottom: number } | null;
  /** trace synchronised (stable) on screen */
  stable: boolean;
  /** y of the ground (0 V) marker, divisions */
  ground: number;
}

/** Above this many cycles across the screen the trace is drawn as a solid band (like peak-detect). */
export const BAND_CYCLES = 60;
export const TRACE_POINTS = 1001;
const GHOST_PHASES = [0, 0.37, 0.71];

function channelTrace(
  n: 1 | 2,
  ch: ChannelSettings<Source>,
  s: OscilloscopeState,
  synced: boolean,
  rollPhase: number,
): Trace {
  const p = channelPath(ch, s.gen);
  const ground = ch.pos;
  const cycles = Number.isFinite(p.period) ? (DIVS_X * s.timeDiv) / p.period : 0;
  if (cycles > BAND_CYCLES) {
    return { ch: n, lines: [], band: { top: screenY(p.max, ch), bottom: screenY(p.min, ch) }, stable: synced, ground };
  }
  const sweep = (t0: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i < TRACE_POINTS; i++) {
      const x = (i / (TRACE_POINTS - 1)) * DIVS_X;
      out.push([x, screenY(p.v(timeAtX(x, t0, s.timeDiv, s.hpos)), ch)]);
    }
    return out;
  };
  if (synced) return { ch: n, lines: [{ pts: sweep(s.tTrig), opacity: 1 }], band: null, stable: true, ground };
  const T = Number.isFinite(p.period) ? p.period : 1;
  const lines = GHOST_PHASES.map((g, i) => ({ pts: sweep((rollPhase + g) * T), opacity: i === 0 ? 1 : 0.35 / i }));
  // a flat trace looks the same on every sweep → one line is enough
  return { ch: n, lines: Number.isFinite(p.period) ? lines : lines.slice(0, 1), band: null, stable: !Number.isFinite(p.period), ground };
}

/**
 * Screen traces computed from the model. `rollPhase` (0…1) moves untriggered
 * sweeps so they roll; triggered sweeps ignore it.
 */
export function computeTraces(s: OscilloscopeState, rollPhase = 0.2): Trace[] {
  const out: Trace[] = [];
  const trigSrc = s.trigger.source === 2 && s.ch2.source !== "off" ? s.ch2 : s.ch1;
  const Ttrig = channelPath(trigSrc as ChannelSettings<Source>, s.gen).period;
  const sync = (ch: ChannelSettings<Source>) => s.triggered && commensurate(channelPath(ch, s.gen).period, Ttrig);
  out.push(channelTrace(1, s.ch1, s, sync(s.ch1), rollPhase));
  if (ch2Active(s.ch2)) out.push(channelTrace(2, s.ch2, s, sync(s.ch2), frac(rollPhase + 0.5)));
  return out;
}

// ---------------------------------------------------------------------------
// Mystery mode (seeded PRNG → reproducible)
// ---------------------------------------------------------------------------

/** mulberry32: small deterministic PRNG returning floats in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MYSTERY_WAVES: Wave[] = ["sine", "square", "triangle"];
export const MYSTERY_FREQS = [100, 200, 250, 400, 500, 800, 1000, 1250, 2000, 2500, 4000, 5000, 10000];
export const MYSTERY_VPP = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12];

export function mysteryGen(seed: number): GenSettings {
  const r = mulberry32(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  return { wave: pick(MYSTERY_WAVES), freq: pick(MYSTERY_FREQS), vpp: pick(MYSTERY_VPP), offset: 0 };
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const MYSTERY_SEED = 18;

function base(): OscInputs {
  return {
    gen: { wave: "sine", freq: 1000, vpp: 4, offset: 0 },
    ch1: { voltsDiv: 1, pos: 0, coupling: "DC", probeMenu: 1, probeSwitch: 1, source: "gen" },
    ch2: { voltsDiv: 5, pos: -2, coupling: "DC", probeMenu: 1, probeSwitch: 1, source: "off" },
    timeDiv: 2e-4,
    hpos: 0,
    trigger: { level: 0, edge: "rising", source: 1 },
    cursors: { on: false, ch: 1, x1: 3, x2: 7, y1: -1, y2: 1 },
    measureVisible: true,
    mystery: false,
    seed: MYSTERY_SEED,
  };
}

export const PRESETS = ["default", "mystery", "probe-trap", "square", "rectifier", "setup"] as const;

export function presetInputs(preset?: string): OscInputs {
  const b = base();
  switch (preset) {
    case "mystery":
      return { ...b, gen: mysteryGen(MYSTERY_SEED), mystery: true, measureVisible: false, timeDiv: 5e-4 };
    case "probe-trap":
      return { ...b, ch1: { ...b.ch1, probeSwitch: 10, probeMenu: 1 } };
    case "square":
      return { ...b, gen: { ...b.gen, wave: "square" } };
    case "setup":
      // A bench left mis-set by the previous user: every setting needs adjusting (W18 tasks L01–L05).
      return {
        ...b,
        gen: { wave: "square", freq: 200, vpp: 1, offset: 0 },
        ch1: { ...b.ch1, voltsDiv: 5, probeSwitch: 10, probeMenu: 1 },
        timeDiv: 5e-2,
        trigger: { ...b.trigger, level: 3 },
      };
    case "rectifier":
      return {
        ...b,
        ch1: { ...b.ch1, source: "transformer", voltsDiv: 10, pos: 2 },
        ch2: { ...b.ch2, source: "bridge", voltsDiv: 5, pos: -3.5 },
        timeDiv: 5e-3,
      };
    default:
      return b;
  }
}
