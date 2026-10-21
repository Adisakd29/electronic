/**
 * Week unlocking rules (pure — no I/O; see tests in tests/unit/unlock.test.ts).
 *
 * Week 1 is always unlocked. Week n (n ≥ 2) is unlocked when, for ANY class
 * policy that applies to the learner:
 *   - the policy is disabled, or
 *   - n is in `openedWeeks`, or
 *   - week n−1 satisfies the rule `weekRules[n]` (fallback `defaultRule`);
 * or when an individual override for week n exists.
 * A learner without a class uses DEFAULT_POLICY.
 */
import type { UnlockRule } from "./db/schema";

export type { UnlockRule };

export interface UnlockPolicyLike {
  enabled: boolean;
  defaultRule: UnlockRule;
  weekRules: Record<string, UnlockRule>;
  openedWeeks: number[];
}

/** What the learner has achieved in one week. */
export interface WeekFacts {
  learnDone: boolean;
  practiceDone: boolean;
  labDone: boolean;
  /** Every `submit: true` activity of the week has a submission (true if none). */
  assignmentsDone: boolean;
  /** Best submitted post-quiz percent, null if none. */
  quizBestPercent: number | null;
}

export const DEFAULT_RULE: UnlockRule = {
  requireLearn: true,
  requirePractice: true,
  requireLab: true,
  requireAssignments: false,
  minQuizPercent: 60,
  requireStageOrder: true,
};

export const DEFAULT_POLICY: UnlockPolicyLike = {
  enabled: true,
  defaultRule: DEFAULT_RULE,
  weekRules: {},
  openedWeeks: [],
};

export const EMPTY_FACTS: WeekFacts = {
  learnDone: false,
  practiceDone: false,
  labDone: false,
  assignmentsDone: false,
  quizBestPercent: null,
};

export function ruleFor(policy: UnlockPolicyLike, week: number): UnlockRule {
  return policy.weekRules[String(week)] ?? policy.defaultRule;
}

/** Thai descriptions of what is still missing in the previous week for `rule`. */
export function missingRequirements(rule: UnlockRule, facts: WeekFacts): string[] {
  const missing: string[] = [];
  if (rule.requireLearn && !facts.learnDone) missing.push("เรียนเนื้อหาให้ครบทุกหัวข้อ");
  if (rule.requirePractice && !facts.practiceDone) missing.push("ทำแบบฝึกเชิงโต้ตอบให้ถูกครบทุกข้อ");
  if (rule.requireLab && !facts.labDone) missing.push("ทำภารกิจห้องทดลองเสมือนให้ครบ");
  if (rule.requireAssignments && !facts.assignmentsDone) missing.push("ส่งใบงานให้ครบทุกชิ้น");
  if (rule.minQuizPercent > 0 && (facts.quizBestPercent ?? -1) < rule.minQuizPercent) {
    const now = facts.quizBestPercent == null ? "ยังไม่ได้ทำ" : `ตอนนี้ได้สูงสุด ${Math.round(facts.quizBestPercent)} %`;
    missing.push(`ผ่านแบบทดสอบหลังเรียนอย่างน้อย ${rule.minQuizPercent} % (${now})`);
  }
  return missing;
}

export interface UnlockInput {
  week: number;
  /** Policies of all classes the learner is enrolled in (empty → DEFAULT_POLICY). */
  policies: UnlockPolicyLike[];
  /** Weeks individually unlocked for this learner. */
  overrides: ReadonlySet<number> | number[];
  /** Facts for week n−1. */
  previous: WeekFacts;
}

export interface UnlockState {
  unlocked: boolean;
  lockReason: string | null;
}

export function evaluateUnlock(input: UnlockInput): UnlockState {
  const { week } = input;
  if (week <= 1) return { unlocked: true, lockReason: null };
  const overrides = input.overrides instanceof Set ? input.overrides : new Set(input.overrides as number[]);
  if (overrides.has(week)) return { unlocked: true, lockReason: null };
  const policies = input.policies.length ? input.policies : [DEFAULT_POLICY];
  let best: string[] | null = null;
  for (const p of policies) {
    if (!p.enabled || p.openedWeeks.includes(week)) return { unlocked: true, lockReason: null };
    const missing = missingRequirements(ruleFor(p, week), input.previous);
    if (missing.length === 0) return { unlocked: true, lockReason: null };
    if (!best || missing.length < best.length) best = missing;
  }
  return {
    unlocked: false,
    lockReason: `ปลดล็อกเมื่อทำสัปดาห์ที่ ${week - 1} ครบ: ${(best ?? []).join(", ")}`,
  };
}

/** Unlock state for weeks 1..total. `facts[w]` = facts of week w (missing → EMPTY_FACTS). */
export function computeUnlocks(
  policies: UnlockPolicyLike[],
  overrides: ReadonlySet<number> | number[],
  facts: Record<number, WeekFacts | undefined>,
  total = 18,
): UnlockState[] {
  const ov = overrides instanceof Set ? overrides : new Set(overrides as number[]);
  return Array.from({ length: total }, (_, i) =>
    evaluateUnlock({ week: i + 1, policies, overrides: ov, previous: facts[i] ?? EMPTY_FACTS }),
  );
}

/** Validate/normalise a rule coming from a form or JSON. */
export function normaliseRule(r: Partial<UnlockRule> | undefined): UnlockRule {
  const pct = Number(r?.minQuizPercent ?? DEFAULT_RULE.minQuizPercent);
  return {
    requireLearn: Boolean(r?.requireLearn),
    requirePractice: Boolean(r?.requirePractice),
    requireLab: Boolean(r?.requireLab),
    requireAssignments: Boolean(r?.requireAssignments),
    minQuizPercent: Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : DEFAULT_RULE.minQuizPercent,
    // Old stored rules have no field: keep the order requirement on.
    requireStageOrder: r?.requireStageOrder === undefined ? true : Boolean(r.requireStageOrder),
  };
}

/**
 * Must the learner take the stages of `week` in order? Mirrors evaluateUnlock:
 * ANY applicable policy that is disabled or whose rule for this week switches the
 * order off relaxes it. No class → DEFAULT_POLICY (order on).
 */
export function stageOrderRequired(policies: UnlockPolicyLike[], week: number): boolean {
  const ps = policies.length ? policies : [DEFAULT_POLICY];
  return ps.every((p) => p.enabled && ruleFor(p, week).requireStageOrder !== false);
}
