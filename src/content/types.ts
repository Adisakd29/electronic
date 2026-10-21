/**
 * Content schema for the 18-week course.
 *
 * Every week lives in `src/content/weeks/wNN.ts` and exports
 * `const week: Week` (default export as well). Figures for that week live in
 * `src/content/figures/wNN.tsx` and are referenced by key (e.g. "W03-F05").
 *
 * All data here must be JSON-serialisable (no functions, no JSX) so it can be
 * passed from Server Components to Client Components and seeded into the DB.
 *
 * `Md` strings are GitHub-flavoured Markdown rendered with KaTeX:
 *   inline math  $V = I \times R$      display math  $$P = \frac{V^2}{R}$$
 * Use Thai as the main language with English technical terms in parentheses
 * the first time they appear, e.g. "ความต้านทาน (resistance, R)".
 */

export type Md = string;

/** Key of a figure component in the week's figure module, e.g. "W07-F03". */
export type FigureKey = string;

export type LabId =
  | "circuit"
  | "ohms"
  | "color-code"
  | "capacitor"
  | "inductor-transformer"
  | "relay"
  | "semiconductor"
  | "motor"
  | "multimeter"
  | "oscilloscope";

export type Category =
  | "safety"
  | "circuits"
  | "protection"
  | "passive"
  | "magnetic"
  | "semiconductor"
  | "assembly"
  | "motor"
  | "instrument";

export type Bloom = "remember" | "understand" | "apply" | "analyze" | "evaluate";

/** S0 student-safe (no supply or ≤12 V DC current-limited) · S1 student work,
 *  teacher checks before power (≤24 V) · S2 close teacher supervision (heat,
 *  chemicals, enclosed mains appliances) · S3 teacher demonstration only (exposed 230/400 V). */
export type SafetyLevel = "S0" | "S1" | "S2" | "S3";

// ---------------------------------------------------------------------------
// Blocks (the body of a learning step)
// ---------------------------------------------------------------------------

export interface FigureRef {
  figure: FigureKey;
  caption: string;
  /** Full text alternative describing what the figure shows (for screen readers). */
  alt: string;
  /** Allow a wider layout (figure may scroll horizontally on small phones). */
  wide?: boolean;
}

export type CalloutVariant =
  | "info"          // general note
  | "tip"           // practical hint
  | "warning"       // caution
  | "danger"        // hazard to life or equipment
  | "safety"        // safety rule (yellow sign style)
  | "standard"      // a standard / regulation (มอก., วสท., IEC …)
  | "misconception" // common misunderstanding and its correction
  | "realworld";    // real-world application

/**
 * Trade the learner comes from. This course is a common subject for many
 * vocational trades, so lessons can carry examples from each trade's own work.
 * Content, competencies and assessment are the SAME for every trade; only the
 * `track` blocks and `intro.trackHooks` differ. No track = general examples.
 */
export type TrackId = "auto" | "mech" | "build" | "power" | "hvac" | "comp";

export type Block =
  | { type: "md"; md: Md }
  | { type: "callout"; variant: CalloutVariant; title?: string; md: Md }
  | {
      type: "formula";
      tex: string; // KaTeX, no surrounding $$
      label?: string; // e.g. "กฎของโอห์ม (Ohm's law)"
      vars?: { sym: string; th: string; unit?: string }[]; // sym is KaTeX
      note?: Md;
    }
  | ({ type: "figure" } & FigureRef)
  | { type: "table"; caption?: string; headers: string[]; rows: string[][]; note?: Md } // cells are Md
  | { type: "procedure"; title?: string; items: Md[] } // ordered steps of a work procedure
  | {
      type: "compare";
      title?: string;
      columns: { title: string; tone?: "good" | "bad" | "neutral"; points: Md[] }[];
    }
  | { type: "interaction"; ref: string } // id from Week.interactions
  | { type: "example"; ref: string } // id from Week.examples
  | { type: "lab"; lab: LabId; preset?: string; md?: Md } // embedded mini-lab
  | { type: "keyterms"; terms: VocabEntry[] }
  /** "เข้าใจแบบง่าย ๆ ก่อน": the idea in everyday words / an analogy, no formulas, for learners new to electronics. */
  | { type: "plain"; title?: string; md: Md }
  /** "ลงลึก (อ่านเพิ่ม)": collapsed by default. Only for material that NO practice, lab or quiz item depends on.
   *  May hold md, callout, formula, figure, table, compare, keyterms, procedure — never interactions, examples or labs. */
  | { type: "deeper"; title: string; blocks: Block[] }
  /** "ในงานแผนกของคุณ": one note per trade; the learner sees the note of their trade (others on demand). */
  | { type: "track"; title?: string; notes: Partial<Record<TrackId, Md>> };

export interface Step {
  id: string; // "W03-S01"
  title: string;
  /** Estimated minutes of reading/doing. */
  minutes: number;
  blocks: Block[];
}

// ---------------------------------------------------------------------------
// Interactions (checked in the browser; every wrong answer explains why)
// ---------------------------------------------------------------------------

export interface ChoiceOption {
  id: string; // "a" | "b" …
  text: Md;
  correct?: boolean;
  /** Shown after choosing this option. For wrong options: WHY it is wrong. */
  feedback: Md;
}

/** Difficulty of an exercise: พื้นฐาน (recall/one-step) · ประยุกต์ (apply a rule to a new case) · วิเคราะห์ (combine, diagnose, decide). */
export type Level = "basic" | "apply" | "analyze";

interface InteractionBase {
  id: string; // "W03-I01"
  /** Difficulty shown to the learner; every practice interaction should have one. */
  level?: Level;
  prompt: Md;
  /** Optional figure shown above the interaction. */
  figure?: FigureRef;
  /** Shown after the learner gets it right (or gives up). */
  explanation: Md;
  objective?: string; // objective id, e.g. "W03-K1"
}

export interface McqInteraction extends InteractionBase {
  kind: "mcq";
  options: ChoiceOption[];
  /** If true, more than one option is correct and all must be chosen. */
  multiple?: boolean;
}

export interface FillField {
  id: string;
  label: Md; // e.g. "$I$ ="
  answer: number; // in `unit`
  /** Relative tolerance (default 0.02 = 2 %). Use absTolerance for answers near 0. */
  tolerance?: number;
  absTolerance?: number;
  unit?: string; // canonical unit symbol shown/accepted, e.g. "mA"
  /** Alternative units accepted with conversion factor to canonical unit
   *  (value_in_canonical = value * factor). e.g. {unit:"A", factor:1000} when canonical is mA. */
  altUnits?: { unit: string; factor: number }[];
  hint?: Md;
  /** Anticipated wrong numeric answers with a targeted explanation.
   *  `formula` (optional) recomputes the wrong value when the exercise is randomised. */
  commonErrors?: { value: number; feedback: Md; formula?: string }[];
  /** Answer in `unit` as an expression over the interaction's `vars` (required when `vars` is set). */
  formula?: string;
}

/**
 * Randomisable variable for a fill exercise. The learner first sees the
 * `default` values (so `FillField.answer` stays the fixed, hand-checked answer);
 * "ลองโจทย์ใหม่" then draws `min..max` in steps of `step`.
 */
export interface FillVar {
  default: number;
  min: number;
  max: number;
  step: number;
  /** Decimal places shown in the prompt (default: as many as `step` needs). */
  decimals?: number;
}

export interface FillInteraction extends InteractionBase {
  kind: "fill";
  fields: FillField[];
  /**
   * Optional randomisation. Keys are variable names used as `{{V}}` in `prompt`,
   * field labels and hints; every field then needs a `formula` over those names
   * (see src/components/learn/lib/formula.ts for the expression syntax). The
   * validator checks that formula(defaults) equals the field's fixed `answer`.
   */
  vars?: Record<string, FillVar>;
}

export interface MatchInteraction extends InteractionBase {
  kind: "match";
  /** Learner drags/selects a right item for each left item. */
  pairs: { left: Md; leftFigure?: FigureKey; right: Md }[];
  /** Extra wrong right-hand items (distractors). */
  distractors?: Md[];
}

export interface OrderInteraction extends InteractionBase {
  kind: "order";
  /** Items in the CORRECT order; UI shuffles them. */
  items: Md[];
  /** Optional per-item note explaining its position. */
  reasons?: Md[];
}

export interface PredictInteraction extends InteractionBase {
  kind: "predict";
  options: ChoiceOption[];
  /** Revealed after committing to a prediction (what really happens and why). */
  reveal: Md;
  revealFigure?: FigureRef;
}

export interface HotspotSpot {
  id: string;
  /** Centre in the FIGURE's viewBox coordinates. */
  x: number;
  y: number;
  r?: number; // radius in viewBox units (default 24)
  label: string;
  md: Md; // explanation shown when opened
  /** For mode "find": is this one of the targets the learner must find? */
  target?: boolean;
}

export interface HotspotInteraction extends InteractionBase {
  kind: "hotspot";
  figure: FigureRef; // required
  /** viewBox of the figure: [width, height] — must match the SVG exactly. */
  viewBox: [number, number];
  /** explore: open every spot to finish · find: locate all `target` spots. */
  mode: "explore" | "find";
  spots: HotspotSpot[];
}

export interface FindFaultInteraction extends InteractionBase {
  kind: "findFault";
  figure: FigureRef;
  viewBox: [number, number];
  spots: (HotspotSpot & { fault: boolean; feedback: Md })[];
}

export interface ClassifyInteraction extends InteractionBase {
  kind: "classify";
  categories: string[];
  items: { text: Md; category: number; feedback?: Md }[];
}

export interface ScenarioNode {
  md: Md;
  figure?: FigureRef;
  choices?: { text: Md; next: string; tone?: "good" | "bad" | "neutral" }[];
  /** Terminal node outcome (no choices). */
  end?: "good" | "bad" | "neutral";
}

export interface ScenarioInteraction extends InteractionBase {
  kind: "scenario";
  title: string;
  start: string;
  nodes: Record<string, ScenarioNode>;
}

export type Interaction =
  | McqInteraction
  | FillInteraction
  | MatchInteraction
  | OrderInteraction
  | PredictInteraction
  | HotspotInteraction
  | FindFaultInteraction
  | ClassifyInteraction
  | ScenarioInteraction;

// ---------------------------------------------------------------------------
// Worked examples
// ---------------------------------------------------------------------------

export interface WorkedExample {
  id: string; // "W03-E01"
  title: string;
  level: "basic" | "intermediate" | "advanced";
  problem: Md;
  figure?: FigureRef;
  given?: Md[];
  find?: Md;
  steps: { title?: string; md: Md }[]; // formula → substitution with units → result
  answer: Md;
  /** Reasonableness / unit check. */
  check?: Md;
  /** Optional "try it yourself" follow-up (id of a fill interaction). */
  tryIt?: string;
}

// ---------------------------------------------------------------------------
// Virtual lab binding (see docs/authoring/LAB_SPEC.md for presets & checks)
// ---------------------------------------------------------------------------

/** Mission tier: 1 เรียนรู้เครื่องมือ · 2 ทดลองตามขั้นตอน · 3 แก้โจทย์ที่กำหนด · 4 Challenge Mission. */
export type LabTaskLevel = 1 | 2 | 3 | 4;

export type LabTask =
  | {
      id: string;
      level?: LabTaskLevel;
      kind: "numeric";
      prompt: Md;
      answer: number;
      tolerance?: number; // relative, default 0.03
      absTolerance?: number;
      unit?: string;
      hint?: Md;
      explanation: Md;
    }
  | {
      id: string;
      level?: LabTaskLevel;
      kind: "mcq";
      prompt: Md;
      options: ChoiceOption[];
      explanation: Md;
    }
  | {
      id: string;
      level?: LabTaskLevel;
      kind: "state";
      prompt: Md;
      /** Check key implemented by the lab module (LAB_SPEC.md). */
      check: string;
      params?: Record<string, number | string | boolean>;
      hint?: Md;
      explanation: Md;
    };

export interface WeekLab {
  lab: LabId;
  title: string;
  objective: Md;
  preset?: string;
  /** Model assumptions & accuracy limits shown to the learner. */
  assumptions: Md[];
  instructions: Md[];
  tasks: LabTask[];
  /** Reflection questions answered in writing (not auto-graded). */
  reflection?: Md[];
}

// ---------------------------------------------------------------------------
// Practice activities (hands-on work / worksheets — ใบงาน)
// ---------------------------------------------------------------------------

export interface RubricCriterion {
  criterion: string;
  weight: number; // points
  /** Descriptors for levels 4 (ดีมาก), 3 (ดี), 2 (พอใช้), 1 (ปรับปรุง). */
  levels: [string, string, string, string];
}

export interface PracticeActivity {
  id: string; // "W03-A01"
  title: string;
  type: "worksheet" | "bench" | "project" | "demo" | "fieldwork";
  safety: SafetyLevel;
  minutes: number;
  objective: Md;
  equipment: string[];
  safetyNotes: Md[];
  procedure: Md[];
  /** Blank recording table printed on the worksheet. */
  record?: { title: string; headers: string[]; rows: number; firstColumn?: string[] };
  questions?: Md[];
  rubric: RubricCriterion[];
  expected: Md;
  /** Learner uploads a file (photo/PDF of worksheet) for teacher grading. */
  submit: boolean;
}

// ---------------------------------------------------------------------------
// Quiz bank
// ---------------------------------------------------------------------------

export interface QuizChoice {
  id: "a" | "b" | "c" | "d";
  text: Md;
}

export interface QuizQuestion {
  id: string; // "W03-Q01"
  bloom: Bloom;
  objective: string; // "W03-K1"
  type: "mcq" | "tf" | "numeric";
  stem: Md;
  figure?: FigureRef;
  /** mcq: exactly 4 choices; tf: omit (choices are fixed ถูก/ผิด). */
  choices?: QuizChoice[];
  /** mcq: choice id · tf: "true" | "false" · numeric: number in `unit`. */
  answer: string | number;
  tolerance?: number; // numeric, relative (default 0.02)
  unit?: string; // numeric
  explanation: Md; // why the answer is right (≤ 60 words)
  /** Why each wrong choice is wrong (mcq). */
  feedback?: Partial<Record<"a" | "b" | "c" | "d", Md>>;
}

// ---------------------------------------------------------------------------
// Week
// ---------------------------------------------------------------------------

export interface Objective {
  id: string; // "W03-K1" | "W03-S1" | "W03-A1"
  text: string; // measurable behaviour: "คำนวณ…ได้", "วัด…ได้ถูกต้อง"
}

export interface VocabEntry {
  th: string;
  en: string;
  def: Md;
}

export interface Resource {
  title: string;
  publisher: string;
  /** Real, stable URL only. Omit if unsure — never invent a URL. */
  url?: string;
  description: string;
  lang: "th" | "en";
}

export interface SourceCorrection {
  original: string; // short quote/paraphrase of the source text
  corrected: string;
  reason: string;
  safety?: boolean;
}

export interface Week {
  week: number; // 1..18
  title: string; // Thai
  titleEn: string;
  category: Category;
  /** Source unit in the original plan (หน่วยที่). */
  unit: { no: number; title: string; part?: string };
  hours: { theory: number; practice: number };
  /** Unit competency (สมรรถนะประจำหน่วย). */
  competency: string;
  /** Course competencies (1–4) supported this week. */
  courseCompetencies: number[];
  objectives: { knowledge: Objective[]; skill: Objective[]; attitude: Objective[] };

  intro: {
    hook: Md; // 1 short paragraph that links to real life
    scenario: Md; // a concrete situation the week will help solve
    figure?: FigureRef;
    whyItMatters: Md[]; // 2–4 bullet points
    prior?: Md; // what learners should already know (links to earlier weeks)
    /** Why this week matters in each trade (2–4 sentences, concrete). */
    trackHooks?: Partial<Record<TrackId, Md>>;
    /** Interaction ids used as a warm-up / pre-check on the intro page. */
    warmup?: string[];
  };

  steps: Step[]; // Learn stage (6–10 steps)
  interactions: Interaction[]; // registry for inline + practice interactions
  practice: string[]; // interaction ids for the Interactive Practice stage (≥ 6)
  examples: WorkedExample[]; // ≥ 3
  lab: WeekLab;
  activities: PracticeActivity[]; // hands-on activities / worksheets (≥ 2)

  quiz: {
    /** Bank of ≥ 25 questions; each attempt draws `drawCount` at random. */
    questions: QuizQuestion[];
    drawCount: number; // 10–15
    passPercent: number; // default 60
    /** Bloom mix per attempt, e.g. {remember:3, understand:4, apply:4, analyze:2, evaluate:1}. */
    mix?: Partial<Record<Bloom, number>>;
  };

  challenge: {
    title: string;
    md: Md;
    /** Interaction id (in `interactions`) that completes the challenge. */
    interaction: string;
  };

  safety: Md[]; // safety review box for the week
  summary: {
    keyPoints: Md[];
    mindmap: { center: string; branches: { label: string; items: string[] }[] };
    formulas: { tex: string; label: string }[];
    vocab: VocabEntry[];
  };
  resources: Resource[];
  teacherNotes: Md[];
  sourceNotes: { lessons: number[]; corrections: SourceCorrection[] };
}

/** Figure module contract: `export const figures: FigureMap = {...}` */
export type FigureMap = Record<FigureKey, React.ComponentType>;
