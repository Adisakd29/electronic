/**
 * Quiz selection & grading (pure — tests in tests/unit/quiz.test.ts).
 * Randomness comes from an injected `rng` so callers decide when it runs
 * (Server Actions at request time; tests with a seeded generator).
 */
import type { Bloom } from "@/content/types";

export type Rng = () => number;

export interface BankQuestion {
  id: string;
  type: "mcq" | "tf" | "numeric";
  bloom: Bloom;
  stem: string;
  figure: { figure: string; caption: string; alt: string } | null;
  choices: { id: string; text: string }[] | null;
  answer: string;
  tolerance: number | null;
  unit: string | null;
  explanation: string;
  feedback: Record<string, string> | null;
}

export const BLOOMS: Bloom[] = ["remember", "understand", "apply", "analyze", "evaluate"];
export const PRETEST_COUNT = 5;
export const CHALLENGE_COUNT = 5;
/** Default relative tolerance for numeric quiz answers. */
export const QUIZ_TOLERANCE = 0.02;
/** Default relative tolerance for numeric lab tasks. */
export const LAB_TOLERANCE = 0.03;

/** Mulberry32 — small deterministic PRNG for tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

/**
 * Draw `count` questions honouring `mix` (per-Bloom counts) where the bank
 * allows; shortfalls are filled at random from the rest of the bank. If the
 * draw equals `previous` (as a set) and the bank is larger than `count`, one
 * question is swapped for one not in `previous`.
 */
export function selectQuestions(
  bank: readonly Pick<BankQuestion, "id" | "bloom">[],
  count: number,
  mix: Partial<Record<Bloom, number>> | undefined,
  previous: readonly string[] | null,
  rng: Rng,
): string[] {
  const n = Math.min(count, bank.length);
  if (n <= 0) return [];
  const chosen: string[] = [];
  const used = new Set<string>();
  if (mix) {
    for (const b of BLOOMS) {
      const want = Math.max(0, Math.floor(mix[b] ?? 0));
      const pool = shuffle(
        bank.filter((q) => q.bloom === b && !used.has(q.id)),
        rng,
      );
      for (const q of pool.slice(0, Math.min(want, n - chosen.length))) {
        chosen.push(q.id);
        used.add(q.id);
      }
    }
  }
  if (chosen.length < n) {
    for (const q of shuffle(
      bank.filter((x) => !used.has(x.id)),
      rng,
    )) {
      if (chosen.length >= n) break;
      chosen.push(q.id);
      used.add(q.id);
    }
  }
  if (previous && previous.length && bank.length > n && sameSet(chosen, previous)) {
    const prev = new Set(previous);
    const outsiders = bank.filter((q) => !prev.has(q.id));
    if (outsiders.length) {
      // Prefer swapping within the same Bloom level to keep the mix.
      const idx = Math.floor(rng() * chosen.length);
      const removed = bank.find((q) => q.id === chosen[idx])!;
      const sameBloom = outsiders.filter((q) => q.bloom === removed.bloom);
      const pick = (sameBloom.length ? sameBloom : outsiders)[Math.floor(rng() * (sameBloom.length || outsiders.length))];
      chosen[idx] = pick.id;
    }
  }
  return shuffle(chosen, rng);
}

/** Pre-test: 5 questions from remember/understand (filled from other levels if short). */
export function selectPretest(bank: readonly Pick<BankQuestion, "id" | "bloom">[], rng: Rng): string[] {
  const low = bank.filter((q) => q.bloom === "remember" || q.bloom === "understand");
  const picked = shuffle(low, rng).slice(0, PRETEST_COUNT).map((q) => q.id);
  if (picked.length < PRETEST_COUNT) {
    const rest = shuffle(
      bank.filter((q) => !picked.includes(q.id)),
      rng,
    );
    for (const q of rest) {
      if (picked.length >= PRETEST_COUNT) break;
      picked.push(q.id);
    }
  }
  return picked;
}

/** Weekly challenge set: 5 higher-order questions (apply/analyze/evaluate first). */
export function selectChallenge(
  bank: readonly Pick<BankQuestion, "id" | "bloom">[],
  previous: readonly string[] | null,
  rng: Rng,
): string[] {
  return selectQuestions(
    bank.filter((q) => q.bloom === "apply" || q.bloom === "analyze" || q.bloom === "evaluate").length >= CHALLENGE_COUNT
      ? bank.filter((q) => q.bloom === "apply" || q.bloom === "analyze" || q.bloom === "evaluate")
      : bank,
    CHALLENGE_COUNT,
    { evaluate: 1, analyze: 2, apply: 2 },
    previous,
    rng,
  );
}

/** Per-question shuffled choice order (mcq only). */
export function shuffleChoices(questions: readonly BankQuestion[], rng: Rng): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const q of questions) {
    if (q.type === "mcq" && q.choices) out[q.id] = shuffle(q.choices.map((c) => c.id), rng);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Numbers & tolerance
// ---------------------------------------------------------------------------

/** Parse a learner-typed number: accepts "1.5", "1,5", "1 000", "1,000.5", "2e-3", "−3". */
export function parseNumber(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).trim().replace(/−/g, "-").replace(/\s+/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/,/g, "");
  else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** |value − answer| ≤ max(rel·|answer|, abs). For answer 0 without abs, 1e-9. */
export function withinTolerance(value: number, answer: number, rel: number, abs?: number): boolean {
  const allowed = Math.max(Math.abs(answer) * rel, abs ?? 0, answer === 0 ? 1e-9 : 0);
  return Math.abs(value - answer) <= allowed + 1e-12;
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export function isCorrect(q: Pick<BankQuestion, "type" | "answer" | "tolerance" | "choices">, given: string | null | undefined): boolean {
  if (given == null || given === "") return false;
  if (q.type === "numeric") {
    const v = parseNumber(given);
    const a = Number(q.answer);
    return v != null && Number.isFinite(a) && withinTolerance(v, a, q.tolerance ?? QUIZ_TOLERANCE);
  }
  if (q.type === "tf") return given.trim().toLowerCase() === q.answer.trim().toLowerCase();
  return given.trim() === q.answer.trim();
}

export function answerText(q: Pick<BankQuestion, "type" | "answer" | "unit" | "choices">): string {
  if (q.type === "tf") return q.answer === "true" ? "ถูก" : "ผิด";
  if (q.type === "numeric") return q.unit ? `${q.answer} ${q.unit}` : q.answer;
  return q.choices?.find((c) => c.id === q.answer)?.text ?? q.answer;
}

export interface GradedItem {
  questionId: string;
  correct: boolean;
  given: string | null;
  answer: string;
  answerText: string;
  explanation: string;
  feedback: string | null;
}

export interface GradeResult {
  items: GradedItem[];
  score: number;
  maxScore: number;
  percent: number;
}

export function gradeAttempt(questions: readonly BankQuestion[], answers: Record<string, string | undefined>): GradeResult {
  const items: GradedItem[] = questions.map((q) => {
    const raw = answers[q.id];
    const given = raw == null || raw === "" ? null : String(raw).slice(0, 64);
    const correct = isCorrect(q, given);
    const feedback = !correct && given && q.type === "mcq" ? q.feedback?.[given] ?? null : null;
    return {
      questionId: q.id,
      correct,
      given,
      answer: q.answer,
      answerText: answerText(q),
      explanation: q.explanation,
      feedback,
    };
  });
  const score = items.filter((i) => i.correct).length;
  const maxScore = questions.length;
  return { items, score, maxScore, percent: maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0 };
}

export function isPassed(percent: number, passPercent: number): boolean {
  return percent >= passPercent;
}

/** Choices shown to the learner (shuffled order for mcq, fixed ถูก/ผิด for tf). */
export function publicChoices(q: BankQuestion, order: string[] | undefined): { id: string; text: string }[] | null {
  if (q.type === "tf") return [
    { id: "true", text: "ถูก" },
    { id: "false", text: "ผิด" },
  ];
  if (q.type !== "mcq" || !q.choices) return null;
  const byId = new Map(q.choices.map((c) => [c.id, c]));
  const ids = order && order.length === q.choices.length ? order : q.choices.map((c) => c.id);
  return ids.map((id) => byId.get(id)).filter((c): c is { id: string; text: string } => Boolean(c)).map((c) => ({ id: c.id, text: c.text }));
}

/** Validate a question coming from the teacher editor. Returns Thai error or null. */
export function validateQuestion(q: {
  type: "mcq" | "tf" | "numeric";
  stem: string;
  choices: { id: string; text: string }[] | null;
  answer: string;
  explanation: string;
}): string | null {
  if (!q.stem.trim()) return "กรุณาใส่โจทย์คำถาม";
  if (!q.explanation.trim()) return "กรุณาใส่คำอธิบายเฉลย";
  if (q.type === "mcq") {
    const cs = q.choices ?? [];
    if (cs.length !== 4 || cs.some((c) => !c.text.trim())) return "ข้อสอบแบบเลือกตอบต้องมีตัวเลือกครบ 4 ข้อ (ก–ง) และไม่เว้นว่าง";
    if (!cs.some((c) => c.id === q.answer)) return "กรุณาเลือกคำตอบที่ถูกต้องจากตัวเลือก a–d";
  } else if (q.type === "tf") {
    if (q.answer !== "true" && q.answer !== "false") return "ข้อสอบถูก/ผิด ต้องกำหนดคำตอบเป็น ถูก หรือ ผิด";
  } else if (parseNumber(q.answer) == null) {
    return "ข้อสอบแบบตัวเลขต้องใส่คำตอบเป็นตัวเลข";
  }
  return null;
}
