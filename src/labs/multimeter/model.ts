/**
 * Virtual 4000-count autoranging digital multimeter (pure, deterministic).
 *
 * DISPLAY RULE (4000 counts): every range shows at most 3999 counts
 * (3.999 · 39.99 · 399.9 · 3999 …). The reading is first rounded to the
 * range resolution; AUTO picks the smallest range whose count ≤ maxCounts.
 * Above the largest range (or above a manually locked range) → "OL".
 * The sign "-" is shown for negative DC readings; a reading that rounds to
 * zero never shows "-". Dial `off` → blank. Ω/continuity/diode on a live item
 * → "----" (no reading) plus a warning.
 *
 * Example: 9.37 V → 4 V range would need 9370 counts → 40 V range → "9.37".
 *          12 mA → 40 mA range → "12.00"; 4.68 kΩ → 40 kΩ range → "4.68".
 */

export type Dial = "off" | "VDC" | "VAC" | "mV" | "ohm" | "continuity" | "diode" | "mA" | "A";
export type Jack = "VΩ" | "mA" | "10A";
export type ItemId =
  | "battery-9v"
  | "aa"
  | "aa-flat"
  | "resistor-unknown"
  | "resistor-board"
  | "diode-1n4007"
  | "led-red"
  | "wire-good"
  | "wire-broken"
  | "fuse-good"
  | "fuse-blown"
  | "outlet-230"
  | "series-circuit-current"
  | "capacitor-charged";
/** series-circuit-current only: where the meter is connected. */
export type Placement = "series" | "across-supply" | "across-resistor";
export type BoardPoint = "A" | "B" | "C" | "D";

export const DIALS: Dial[] = ["off", "VDC", "VAC", "mV", "ohm", "continuity", "diode", "mA", "A"];
export const JACKS: Jack[] = ["VΩ", "mA", "10A"];
export const BOARD_POINTS: BoardPoint[] = ["A", "B", "C", "D"];

/** Continuity beeper threshold. */
export const BEEP_OHMS = 30;
/** Fuse ratings (shown in UI / assumptions). */
export const FUSE_MA_RATING = 0.4;
export const FUSE_10A_RATING = 10;
/** Voltmeter input resistance. */
export const R_IN_V = 10e6;
/** Diode-test source: ~1 mA constant current, open-circuit ≈ 3 V. */
export const DIODE_TEST_I = 1e-3;
export const DIODE_TEST_VOC = 3.0;
/** Default "unknown" resistor: nominal 4.7 kΩ (E12, ±5 %), actual 4.68 kΩ. */
export const UNKNOWN_DEFAULT = { nominal: 4700, actual: 4680 };
export const BOARD_R: [number, number, number] = [1000, 2200, 3300];
export const SERIES_V = 12;
export const SERIES_R = 1000;
export const CAP_V = 12;
export const CAP_F = 470e-6;

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

interface ItemDef {
  label: string;
  /** names of the two test points [point 1 (red, normal), point 2 (black, normal)] */
  points: [string, string];
  /** DC open-circuit voltage between point1 and point2 (V). */
  vdc?: number;
  /** AC rms voltage. */
  vac?: number;
  /** Resistance between the two points (Ω), Infinity = open. */
  r?: number;
  /** Diode-like: forward drop when point1 positive. */
  vf?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  "battery-9v": { label: "แบตเตอรี่ 9 V (battery, ใหม่)", points: ["+", "−"], vdc: 9.37 },
  aa: { label: "ถ่าน AA ใหม่ (1.5 V)", points: ["+", "−"], vdc: 1.52 },
  "aa-flat": { label: "ถ่าน AA ใช้แล้ว (aa-flat)", points: ["+", "−"], vdc: 1.12 },
  "resistor-unknown": { label: "ตัวต้านทานไม่ทราบค่า (resistor-unknown)", points: ["ขา 1", "ขา 2"] },
  "resistor-board": { label: "แผงตัวต้านทานอนุกรม 3 ตัว (จุด A–D)", points: ["A", "D"] },
  "diode-1n4007": { label: "ไดโอด 1N4007 (diode)", points: ["A", "K"], vf: 0.572 },
  "led-red": { label: "LED สีแดง (led-red)", points: ["A", "K"], vf: 1.812 },
  "wire-good": { label: "สายบัดกรีดี (wire-good)", points: ["ปลาย 1", "ปลาย 2"], r: 0.2 },
  "wire-broken": { label: "สายรอยต่อขาด (wire-broken)", points: ["ปลาย 1", "ปลาย 2"], r: Infinity },
  "fuse-good": { label: "ฟิวส์ดี (fuse-good)", points: ["ขั้ว 1", "ขั้ว 2"], r: 0.1 },
  "fuse-blown": { label: "ฟิวส์ขาด (fuse-blown)", points: ["ขั้ว 1", "ขั้ว 2"], r: Infinity },
  "outlet-230": { label: "เต้ารับ 230 V (ครูสาธิตเท่านั้น)", points: ["L", "N"], vac: 229.6 },
  "series-circuit-current": { label: "วงจรอนุกรม 12 V / 1 kΩ (วัดกระแส)", points: ["X", "Y"] },
  "capacitor-charged": { label: "ตัวเก็บประจุ 470 µF มีประจุค้าง", points: ["+", "−"] },
};
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export const isItem = (x: unknown): x is ItemId => typeof x === "string" && x in ITEMS;

// ---------------------------------------------------------------------------
// Ranges
// ---------------------------------------------------------------------------

export interface Range {
  label: string;
  /** resolution in base unit (one count) */
  res: number;
  /** display unit and its size in base unit */
  unit: string;
  scale: number;
  maxCounts: number;
}

const r = (label: string, res: number, unit: string, scale: number, maxCounts = 3999): Range => ({ label, res, unit, scale, maxCounts });

export const RANGES: Record<Exclude<Dial, "off">, Range[]> = {
  VDC: [r("4 V", 0.001, "V", 1), r("40 V", 0.01, "V", 1), r("400 V", 0.1, "V", 1), r("1000 V", 1, "V", 1, 1000)],
  VAC: [r("4 V", 0.001, "V", 1), r("40 V", 0.01, "V", 1), r("400 V", 0.1, "V", 1), r("750 V", 1, "V", 1, 750)],
  mV: [r("400 mV", 1e-4, "mV", 1e-3)],
  ohm: [
    r("400 Ω", 0.1, "Ω", 1),
    r("4 kΩ", 1, "kΩ", 1e3),
    r("40 kΩ", 10, "kΩ", 1e3),
    r("400 kΩ", 100, "kΩ", 1e3),
    r("4 MΩ", 1e3, "MΩ", 1e6),
    r("40 MΩ", 1e4, "MΩ", 1e6),
  ],
  continuity: [r("400 Ω", 0.1, "Ω", 1)],
  diode: [r("ไดโอด 4 V", 0.001, "V", 1)],
  mA: [r("40 mA", 1e-5, "mA", 1e-3), r("400 mA", 1e-4, "mA", 1e-3)],
  A: [r("4 A", 0.001, "A", 1), r("10 A", 0.01, "A", 1, 1000)],
};

export const BASE_UNIT: Record<Dial, string> = { off: "", VDC: "V", VAC: "V", mV: "V", ohm: "Ω", continuity: "Ω", diode: "V", mA: "A", A: "A" };

/** The jack the red lead must be in for each dial position. */
export function requiredJack(d: Dial): Jack | null {
  if (d === "off") return null;
  if (d === "mA") return "mA";
  if (d === "A") return "10A";
  return "VΩ";
}

const decimalsOf = (rg: Range) => Math.max(0, Math.round(-Math.log10(rg.res / rg.scale)));

export interface Formatted {
  display: string;
  /** displayed value in base unit; null for OL */
  value: number | null;
  displayUnit: string;
  rangeIndex: number;
  ol: boolean;
}

/**
 * Format a reading (base unit) for a dial on a 4000-count meter.
 * `manual` = locked range index, or null for AUTO.
 */
export function formatReading(v: number, dial: Exclude<Dial, "off">, manual: number | null = null): Formatted {
  const ranges = RANGES[dial];
  const fits = (i: number) => Number.isFinite(v) && Math.round(Math.abs(v) / ranges[i].res) <= ranges[i].maxCounts;
  let idx: number;
  if (manual !== null && ranges.length > 1) idx = Math.min(Math.max(0, manual), ranges.length - 1);
  else {
    idx = ranges.findIndex((_, i) => fits(i));
    if (idx < 0) {
      const top = ranges.length - 1;
      return { display: "OL", value: null, displayUnit: ranges[top].unit, rangeIndex: top, ol: true };
    }
  }
  const rg = ranges[idx];
  if (!fits(idx)) return { display: "OL", value: null, displayUnit: rg.unit, rangeIndex: idx, ol: true };
  const counts = Math.round(Math.abs(v) / rg.res);
  const sign = v < 0 && counts > 0 ? -1 : 1;
  const shown = (counts * rg.res) / rg.scale;
  const text = (sign < 0 ? "-" : "") + shown.toFixed(decimalsOf(rg));
  const value = Number((sign * counts * rg.res).toPrecision(12));
  return { display: text, value, displayUnit: rg.unit, rangeIndex: idx, ol: false };
}

// ---------------------------------------------------------------------------
// Deterministic "random" unknown resistor
// ---------------------------------------------------------------------------

const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

/** mulberry32 PRNG – deterministic for a given seed. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed 0 → the default 4.7 kΩ part. Other seeds: E12 100 Ω – 820 kΩ, actual within ±4 %. */
export function unknownResistor(seed: number): { nominal: number; actual: number } {
  if (seed === 0) return { ...UNKNOWN_DEFAULT };
  const g = rng(seed);
  const decade = 10 ** (2 + Math.floor(g() * 4)); // 100 .. 100k
  const nominal = Number((E12[Math.floor(g() * 12)] * decade).toPrecision(3));
  const dev = Math.round((g() * 8 - 4) * 10) / 1000; // −4.0 % .. +4.0 % in 0.1 % steps
  return { nominal, actual: Number((nominal * (1 + dev)).toPrecision(4)) };
}

/** Colour bands (4-band) for an E12 nominal value ≥ 10 Ω. */
export function bandsFor(nominal: number): [number, number, number] {
  const exp = Math.floor(Math.log10(nominal)) - 1;
  const sig = Math.round(nominal / 10 ** exp);
  return [Math.floor(sig / 10), sig % 10, exp];
}

// ---------------------------------------------------------------------------
// Inputs, transitions
// ---------------------------------------------------------------------------

export interface MeterInputs {
  dial: Dial;
  /** jack of the red lead (black is always in COM) */
  jack: Jack;
  item: ItemId;
  probesOn: boolean;
  /** red/black swapped relative to point1/point2 */
  reversed: boolean;
  placement: Placement;
  redPoint: BoardPoint;
  blackPoint: BoardPoint;
  /** null = AUTO */
  rangeIndex: number | null;
  blownMA: boolean;
  blown10A: boolean;
  blowCause: string | null;
  capDischarged: boolean;
  unknownSeed: number;
  /** resistor-board: index (0..2) of an open resistor, or null */
  openResistor: number | null;
}

export const PRESETS: Record<string, { label: string; description: string }> = {
  default: { label: "เริ่มต้น: แบตเตอรี่ 9 V", description: "แบตเตอรี่ 9 V บนโต๊ะ สวิตช์อยู่ที่ OFF สายแดงที่ VΩ ยังไม่วางโพรบ" },
  resistance: { label: "วัดความต้านทาน", description: "ตัวต้านทานไม่ทราบค่า (4.7 kΩ) ตั้งย่าน Ω และเสียบสายเอง ลองปุ่ม RANGE" },
  diode: { label: "ทดสอบไดโอด/LED", description: "ไดโอด 1N4007 และ LED สีแดง วัดด้วยย่านไดโอดทั้งสองทิศ" },
  continuity: { label: "ความต่อเนื่อง (continuity)", description: "สายบัดกรีดี/ขาด และฟิวส์ ตรวจด้วยย่านความต่อเนื่อง (มีเสียงบี๊บเมื่อ < 30 Ω)" },
  current: { label: "วัดกระแสแบบอนุกรม", description: "วงจร 12 V / 1 kΩ ต้องย้ายสายแดงไปช่อง mA และตัดวงจรต่อมิเตอร์อนุกรม" },
  "mains-demo": { label: "สาธิตเต้ารับ 230 V (ครูเท่านั้น)", description: "การจำลองการวัดไฟบ้าน V~ พร้อมป้าย CAT II/CAT III — ครูสาธิตเท่านั้น" },
  troubleshoot: { label: "หาตัวต้านทานที่ขาด", description: "แผงตัวต้านทานอนุกรม 3 ตัว มีหนึ่งตัวขาด วัด Ω ระหว่างจุด A–D เพื่อหาตำแหน่ง" },
};

const BASE: MeterInputs = {
  dial: "off",
  jack: "VΩ",
  item: "battery-9v",
  probesOn: false,
  reversed: false,
  placement: "series",
  redPoint: "A",
  blackPoint: "B",
  rangeIndex: null,
  blownMA: false,
  blown10A: false,
  blowCause: null,
  capDischarged: false,
  unknownSeed: 0,
  openResistor: null,
};

export function presetInputs(preset?: string): MeterInputs {
  switch (preset) {
    case "resistance":
      return { ...BASE, item: "resistor-unknown" };
    case "diode":
      return { ...BASE, item: "diode-1n4007" };
    case "continuity":
      return { ...BASE, item: "wire-good" };
    case "current":
      return { ...BASE, item: "series-circuit-current", placement: "series" };
    case "mains-demo":
      return { ...BASE, item: "outlet-230", dial: "VAC", probesOn: true };
    case "troubleshoot":
      return { ...BASE, item: "resistor-board", dial: "ohm", openResistor: 1, redPoint: "A", blackPoint: "B" };
    default:
      return { ...BASE };
  }
}

/** Items offered first in each preset (all items stay selectable). */
export const PRESET_ITEMS: Record<string, ItemId[]> = {
  default: ["battery-9v", "aa", "aa-flat", "resistor-unknown", "series-circuit-current", "diode-1n4007"],
  resistance: ["resistor-unknown", "resistor-board", "capacitor-charged", "battery-9v"],
  diode: ["diode-1n4007", "led-red"],
  continuity: ["wire-good", "wire-broken", "fuse-good", "fuse-blown", "resistor-unknown"],
  current: ["series-circuit-current", "battery-9v", "aa"],
  "mains-demo": ["outlet-230", "battery-9v"],
  troubleshoot: ["resistor-board"],
};

/** Is the item (as connected) an energised source? */
export function isLive(inp: MeterInputs): boolean {
  const d = ITEMS[inp.item];
  if (inp.item === "series-circuit-current") return true;
  if (inp.item === "capacitor-charged") return !inp.capDischarged;
  return (d.vdc ?? 0) !== 0 || (d.vac ?? 0) !== 0;
}

/** Red lead in a current jack placed across a live source → short through the shunt. */
function shortsSource(inp: MeterInputs): boolean {
  if (!inp.probesOn || inp.jack === "VΩ") return false;
  if (inp.jack === "mA" && inp.blownMA) return false;
  if (inp.jack === "10A" && inp.blown10A) return false;
  if (inp.item === "series-circuit-current") return inp.placement !== "series";
  return isLive(inp);
}

/**
 * Apply a user action. Changing dial resets to AUTO; changing item lifts the
 * probes. Any resulting short through a current jack blows that jack's fuse
 * (latched until `replaceFuse`).
 */
export function update(cur: MeterInputs, patch: Partial<MeterInputs>): MeterInputs {
  const next: MeterInputs = { ...cur, ...patch };
  if (patch.dial !== undefined && patch.dial !== cur.dial && patch.rangeIndex === undefined) next.rangeIndex = null;
  if (patch.item !== undefined && patch.item !== cur.item && patch.probesOn === undefined) next.probesOn = false;
  if (shortsSource(next)) {
    const where = next.item === "series-circuit-current" ? (next.placement === "across-supply" ? "คร่อมแหล่งจ่าย 12 V" : "คร่อมตัวต้านทาน (ลัดวงจรตัวต้านทาน)") : `คร่อม${ITEMS[next.item].label}`;
    const cause = `วางโพรบ${where} ขณะสายแดงอยู่ช่อง ${next.jack} — ช่องกระแสมีความต้านทานต่ำมาก จึงเท่ากับลัดวงจร`;
    if (next.jack === "mA") next.blownMA = true;
    else next.blown10A = true;
    next.blowCause = cause;
  }
  return next;
}

export const replaceFuse = (cur: MeterInputs): MeterInputs => update({ ...cur, blownMA: false, blown10A: false, blowCause: null }, {});

/** RANGE button: AUTO → lock current range → next range … wraps. */
export function pressRange(cur: MeterInputs): MeterInputs {
  if (cur.dial === "off") return cur;
  const ranges = RANGES[cur.dial];
  if (ranges.length < 2) return cur;
  const s = solve(cur);
  const idx = cur.rangeIndex === null ? s.rangeIndex : (cur.rangeIndex + 1) % ranges.length;
  return { ...cur, rangeIndex: idx };
}

// ---------------------------------------------------------------------------
// Solve
// ---------------------------------------------------------------------------

export type WarnCode =
  | "live-ohm"
  | "cap-charged"
  | "fuse-mA"
  | "fuse-10A"
  | "fuse-blew-mains"
  | "jack-current-needed"
  | "jack-mismatch-current"
  | "jack-current-on-v"
  | "ac-on-dc"
  | "dc-on-ac"
  | "over-range-manual"
  | "over-range-mV"
  | "series-open"
  | "cap-charging";

export interface MultimeterState {
  dial: Dial;
  jack: Jack;
  item: string;
  probesOn: boolean;
  /** exactly as shown on the LCD ("" when off) */
  display: string;
  /** displayed value in base unit (V, A, Ω); null when blank / OL / no reading */
  value: number | null;
  /** base unit of `value` */
  unit: string;
  fuseBlown: boolean;
  polarityReversed: boolean;
  warnings: string[];
  // --- extras ---
  codes: WarnCode[];
  /** unit shown on the LCD, e.g. "kΩ" */
  displayUnit: string;
  rangeIndex: number;
  rangeLabel: string;
  autoRange: boolean;
  ol: boolean;
  beep: boolean;
  ledGlow: boolean;
  demoOnly: boolean;
  placement: Placement;
  redPoint: BoardPoint;
  blackPoint: BoardPoint;
  blownMA: boolean;
  blown10A: boolean;
  jackOk: boolean;
  /** a valid reading is displayed (correct dial/jack, probes on, no blocking fault) */
  valid: boolean;
  live: boolean;
  capDischarged: boolean;
  /** series circuit: current actually flowing in the circuit (A) */
  circuitI: number;
}

const MESSAGES: Record<WarnCode, string> = {
  "live-ohm": "วงจร/ชิ้นงานมีไฟหรือมีแรงดันอยู่: ห้ามวัด Ω ความต่อเนื่อง หรือไดโอดขณะมีไฟ — ปลดไฟก่อน มิเตอร์จึงไม่แสดงค่า",
  "cap-charged": "ตัวเก็บประจุยังมีประจุค้าง (12 V): ต้องคายประจุผ่านตัวต้านทานก่อนวัด Ω — กดปุ่ม \"คายประจุ\"",
  "fuse-mA": "ฟิวส์ช่อง mA ขาด: ย่าน mA จะอ่านได้ 0 เสมอจนกว่าจะกด \"เปลี่ยนฟิวส์\"",
  "fuse-10A": "ฟิวส์ช่อง 10A ขาด: ย่าน A จะอ่านได้ 0 เสมอจนกว่าจะกด \"เปลี่ยนฟิวส์\"",
  "fuse-blew-mains": "อันตรายร้ายแรง: ในโลกจริงการแตะไฟบ้านขณะสายอยู่ช่องกระแสอาจเกิดอาร์กแฟลชและระเบิดได้ (นี่คือเหตุผลที่ต้องใช้มิเตอร์ CAT II/III และให้ครูสาธิตเท่านั้น)",
  "jack-current-needed": "ย่านกระแสต้องย้ายสายแดงไปช่อง mA (ย่าน mA) หรือ 10A (ย่าน A) — ช่อง VΩ ไม่ผ่านตัวต้านทานแบ่งกระแส จึงอ่านได้ 0",
  "jack-mismatch-current": "ช่องเสียบไม่ตรงกับย่าน: ย่าน mA ใช้ช่อง mA และย่าน A ใช้ช่อง 10A",
  "jack-current-on-v": "สายแดงยังอยู่ช่องกระแส (mA/10A) แต่สวิตช์อยู่ย่านแรงดัน/โอห์ม — ย้ายสายแดงกลับช่อง VΩ ก่อนวัด",
  "ac-on-dc": "ใช้ย่าน V~ (AC) วัดแหล่งจ่ายไฟตรง จึงอ่านได้ ≈ 0 — ใช้ย่าน V⎓",
  "dc-on-ac": "ใช้ย่าน DC วัดไฟสลับ จึงอ่านได้ ≈ 0 — ใช้ย่าน V~",
  "over-range-manual": "ค่าเกินย่านที่ล็อกไว้ (OL) — กด RANGE เพื่อเลือกย่านที่ใหญ่ขึ้น หรือกด AUTO",
  "over-range-mV": "แรงดันเกินย่าน 400 mV (OL) — หมุนไปย่าน V⎓",
  "series-open": "วงจรถูกตัดที่จุด X–Y แต่ยังไม่ได้ต่อมิเตอร์ จึงไม่มีกระแสไหล",
  "cap-charging": "มิเตอร์จ่ายกระแสทดสอบชาร์จตัวเก็บประจุ ค่าโอห์มจึงเพิ่มขึ้นจนเป็น OL (ไม่ใช่ตัวเก็บประจุลัดวงจร)",
};
export const warningText = (c: WarnCode) => MESSAGES[c];

type Raw = { kind: "num"; v: number } | { kind: "ol" } | { kind: "blocked" };

const idxOf = (p: BoardPoint) => BOARD_POINTS.indexOf(p);

/** Resistance between two board points (series chain A–R1–B–R2–C–R3–D). */
export function boardResistance(a: BoardPoint, b: BoardPoint, open: number | null): number {
  const [i, j] = [idxOf(a), idxOf(b)].sort((x, y) => x - y);
  let sum = 0;
  for (let k = i; k < j; k++) {
    if (k === open) return Infinity;
    sum += BOARD_R[k];
  }
  return sum;
}

function passiveResistance(inp: MeterInputs): number | "diode" {
  if (inp.item === "resistor-unknown") return unknownResistor(inp.unknownSeed).actual;
  if (inp.item === "resistor-board") return boardResistance(inp.redPoint, inp.blackPoint, inp.openResistor);
  if (inp.item === "capacitor-charged") return Infinity; // charged up by the test current → OL
  const d = ITEMS[inp.item];
  if (d.vf !== undefined) return "diode";
  return d.r ?? Infinity;
}

export function solve(inp: MeterInputs): MultimeterState {
  const item = ITEMS[inp.item];
  const live = isLive(inp);
  const dial = inp.dial;
  const codes: WarnCode[] = [];
  const dir = inp.reversed ? -1 : 1;
  const need = requiredJack(dial);
  const jackOk = need === null || need === inp.jack;
  const currentDial = dial === "mA" || dial === "A";
  const ohmish = dial === "ohm" || dial === "continuity" || dial === "diode";
  const fuseForJack = inp.jack === "mA" ? inp.blownMA : inp.jack === "10A" ? inp.blown10A : false;

  if (inp.blownMA) codes.push("fuse-mA");
  if (inp.blown10A) codes.push("fuse-10A");
  if ((inp.blownMA || inp.blown10A) && inp.item === "outlet-230" && inp.blowCause?.includes("230")) codes.push("fuse-blew-mains");

  // Series circuit: current that actually flows.
  let circuitI = 0;
  if (inp.item === "series-circuit-current") {
    if (inp.placement !== "series") circuitI = SERIES_V / SERIES_R;
    else if (inp.probesOn) {
      if (inp.jack === "VΩ") circuitI = SERIES_V / (SERIES_R + R_IN_V);
      else circuitI = fuseForJack ? 0 : SERIES_V / SERIES_R;
    }
  }

  let raw: Raw = { kind: "num", v: 0 };
  let ledGlow = false;

  if (dial !== "off") {
    if (!inp.probesOn) {
      raw = ohmish ? { kind: "ol" } : { kind: "num", v: 0 };
      if (inp.item === "series-circuit-current" && inp.placement === "series" && currentDial) codes.push("series-open");
    } else if (ohmish) {
      if (live) {
        raw = { kind: "blocked" };
        codes.push(inp.item === "capacitor-charged" ? "cap-charged" : "live-ohm");
      } else if (inp.jack !== "VΩ") {
        raw = { kind: "ol" };
      } else {
        const pr = passiveResistance(inp);
        if (inp.item === "capacitor-charged") codes.push("cap-charging");
        if (pr === "diode") {
          const forward = !inp.reversed;
          if (dial === "diode" && forward) {
            raw = { kind: "num", v: item.vf! };
            ledGlow = inp.item === "led-red";
          } else raw = { kind: "ol" }; // reverse, or Ω test voltage below the knee
        } else if (dial === "diode") {
          const v = pr * DIODE_TEST_I;
          raw = v >= DIODE_TEST_VOC ? { kind: "ol" } : { kind: "num", v };
        } else raw = Number.isFinite(pr) ? { kind: "num", v: pr } : { kind: "ol" };
      }
    } else if (currentDial) {
      // only a current jack carries current; VΩ jack → 0
      if (!jackOk) raw = { kind: "num", v: 0 };
      else if (fuseForJack) raw = { kind: "num", v: 0 };
      else if (inp.item === "series-circuit-current" && inp.placement === "series") raw = { kind: "num", v: dir * circuitI };
      else raw = { kind: "num", v: 0 };
    } else {
      // voltage dials
      if (inp.jack !== "VΩ") raw = { kind: "num", v: 0 };
      else {
        let vdc = 0;
        let vac = 0;
        if (inp.item === "series-circuit-current") {
          vdc = inp.placement === "series" ? (SERIES_V * R_IN_V) / (R_IN_V + SERIES_R) : SERIES_V;
        } else if (inp.item === "capacitor-charged") vdc = inp.capDischarged ? 0 : CAP_V;
        else {
          vdc = item.vdc ?? 0;
          vac = item.vac ?? 0;
        }
        if (dial === "VAC") {
          raw = { kind: "num", v: vac };
          if (vdc !== 0 && vac === 0) codes.push("ac-on-dc");
        } else {
          raw = { kind: "num", v: dir * vdc };
          if (vac !== 0 && vdc === 0) codes.push("dc-on-ac");
        }
      }
    }
    if (inp.probesOn) {
      if (currentDial && inp.jack === "VΩ") codes.push("jack-current-needed");
      else if (currentDial && !jackOk) codes.push("jack-mismatch-current");
      else if (!currentDial && inp.jack !== "VΩ") codes.push("jack-current-on-v");
    }
  }

  // Format
  let display = "";
  let value: number | null = null;
  let displayUnit = "";
  let rangeIndex = 0;
  let ol = false;
  let overRange = false;
  if (dial !== "off") {
    const ranges = RANGES[dial];
    if (raw.kind === "blocked") {
      display = "----";
      rangeIndex = inp.rangeIndex ?? 0;
      displayUnit = ranges[Math.min(rangeIndex, ranges.length - 1)].unit;
    } else if (raw.kind === "ol") {
      ol = true;
      display = "OL";
      rangeIndex = inp.rangeIndex === null ? ranges.length - 1 : Math.min(inp.rangeIndex, ranges.length - 1);
      displayUnit = ranges[rangeIndex].unit;
    } else {
      const f = formatReading(raw.v, dial, inp.rangeIndex);
      display = f.display;
      value = f.value;
      displayUnit = f.displayUnit;
      rangeIndex = f.rangeIndex;
      ol = f.ol;
      overRange = f.ol;
      if (ol && inp.probesOn) {
        if (dial === "mV") codes.push("over-range-mV");
        else if (inp.rangeIndex !== null) codes.push("over-range-manual");
      }
    }
  }

  const beep = dial === "continuity" && inp.probesOn && value !== null && value < BEEP_OHMS;
  const blocking = codes.some((c) => c === "live-ohm" || c === "cap-charged");
  const valid =
    dial !== "off" &&
    inp.probesOn &&
    jackOk &&
    !blocking &&
    display !== "----" &&
    !(currentDial && fuseForJack) &&
    !overRange &&
    !(inp.item === "series-circuit-current" && currentDial && inp.placement !== "series");

  const ranges = dial === "off" ? null : RANGES[dial];
  return {
    dial,
    jack: inp.jack,
    item: inp.item,
    probesOn: inp.probesOn,
    display,
    value,
    unit: BASE_UNIT[dial],
    fuseBlown: inp.blownMA || inp.blown10A,
    polarityReversed: inp.reversed,
    warnings: codes.map((c) => MESSAGES[c]),
    codes,
    displayUnit,
    rangeIndex,
    rangeLabel: ranges ? ranges[Math.min(rangeIndex, ranges.length - 1)].label : "",
    autoRange: inp.rangeIndex === null || (ranges?.length ?? 0) < 2,
    ol,
    beep,
    ledGlow,
    demoOnly: inp.item === "outlet-230",
    placement: inp.placement,
    redPoint: inp.redPoint,
    blackPoint: inp.blackPoint,
    blownMA: inp.blownMA,
    blown10A: inp.blown10A,
    jackOk,
    valid,
    live,
    capDischarged: inp.capDischarged,
    circuitI,
  };
}

// ---------------------------------------------------------------------------
// Checks (pure, also used by index.ts)
// ---------------------------------------------------------------------------

export function checkMeasured(s: MultimeterState, item: string, dial: string): boolean {
  return s.probesOn && s.item === item && s.dial === dial && s.jackOk && s.valid && s.display !== "";
}

export function checkCurrentInSeries(s: MultimeterState): boolean {
  return (
    s.item === "series-circuit-current" &&
    s.probesOn &&
    s.placement === "series" &&
    s.dial === "mA" &&
    s.jack === "mA" &&
    !s.blownMA &&
    !s.polarityReversed &&
    s.value !== null &&
    Math.abs(s.value - SERIES_V / SERIES_R) <= 0.03 * (SERIES_V / SERIES_R)
  );
}
