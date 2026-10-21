/**
 * Gamification rules. XP is only awarded for demonstrated learning and every
 * award is idempotent by `ref` (primary key userId+ref in xp_event).
 * Pure rules are unit-tested (tests/unit/gamification.test.ts); `awardXp`
 * and `grantAchievements` take a db/transaction handle.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { LabId } from "@/content/types";
import type { Tx } from "./db";
import { achievement, xpEvent } from "./db/schema";

export const XP = {
  interactionFirstTry: 5,
  practiceStage: 20,
  labTask: 10,
  labStage: 30,
  quizPass: 50,
  quizHighBonus: 20,
  challenge: 40,
  assignmentGood: 30,
  weekComplete: 25,
} as const;

export const xpRef = {
  interaction: (id: string) => `interaction:${id}`,
  stage: (week: number, stage: string) => `stage:W${pad(week)}:${stage}`,
  labTask: (id: string) => `lab-task:${id}`,
  quizPass: (week: number) => `quiz-pass:W${pad(week)}`,
  quizHigh: (week: number) => `quiz-high:W${pad(week)}`,
  challenge: (week: number) => `challenge:W${pad(week)}`,
  assignment: (activityId: string) => `assignment:${activityId}`,
  week: (week: number) => `week:W${pad(week)}`,
};

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export const LEVELS: { level: number; name: string; minXp: number }[] = [
  { level: 1, name: "ช่างฝึกหัด", minXp: 0 },
  { level: 2, name: "ช่างผู้ช่วย", minXp: 400 },
  { level: 3, name: "ช่างเทคนิค", minXp: 1200 },
  { level: 4, name: "ช่างชำนาญการ", minXp: 2600 },
  { level: 5, name: "ผู้เชี่ยวชาญ", minXp: 4200 },
];

export function levelFor(xp: number): { level: number; levelName: string; xpIntoLevel: number; xpForNextLevel: number } {
  const v = Math.max(0, Math.floor(xp));
  let i = 0;
  while (i + 1 < LEVELS.length && v >= LEVELS[i + 1].minXp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const into = v - cur.minXp;
  return {
    level: cur.level,
    levelName: cur.name,
    xpIntoLevel: into,
    // Top level: the bar is shown full.
    xpForNextLevel: next ? next.minXp - cur.minXp : Math.max(into, 1),
  };
}

/** Rubric average ≥ 3 earns assignment XP. */
export function assignmentEarnsXp(rubricLevels: number[]): boolean {
  if (!rubricLevels.length) return false;
  return rubricLevels.reduce((a, b) => a + b, 0) / rubricLevels.length >= 3;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface AchievementFacts {
  /** Weeks with the "complete" stage done. */
  completedWeeks: ReadonlySet<number>;
  /** Weeks with the "lab" stage done. */
  labStageWeeks: ReadonlySet<number>;
  /** Best submitted post-quiz percent per week. */
  bestPostQuiz: Readonly<Record<number, number>>;
  /** Any submitted post quiz with 100 %. */
  anyPerfect: boolean;
  /** Passed a post quiz in some week after a failed post attempt in that week. */
  growth: boolean;
  /** Lab id used in each week (from content / course metadata). */
  labByWeek: Readonly<Record<number, LabId | null | undefined>>;
}

export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  /** How to earn it (shown while locked). */
  how: string;
  check: (f: AchievementFacts) => boolean;
}

const quizAtLeast = (f: AchievementFacts, weeks: number[], pct: number) => weeks.every((w) => (f.bestPostQuiz[w] ?? -1) >= pct);
const completed = (f: AchievementFacts, weeks: number[]) => weeks.every((w) => f.completedWeeks.has(w));
const labDone = (f: AchievementFacts, lab: LabId) =>
  Object.entries(f.labByWeek).some(([w, l]) => l === lab && f.labStageWeeks.has(Number(w)));

export function distinctLabs(labByWeek: Readonly<Record<number, LabId | null | undefined>>): LabId[] {
  return [...new Set(Object.values(labByWeek).filter((l): l is LabId => Boolean(l)))];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: "first-week",
    title: "ก้าวแรกของช่าง",
    description: "เรียนจบสัปดาห์ที่ 1 ครบทุกขั้นตอน",
    how: "ทำสัปดาห์ที่ 1 ให้ครบทุกขั้นตอนจนถึง “สรุปและจบบท”",
    check: (f) => completed(f, [1]),
  },
  {
    code: "safety-champion",
    title: "แชมป์ความปลอดภัย",
    description: "ได้คะแนนแบบทดสอบสัปดาห์ที่ 1 และ 2 ตั้งแต่ 90 % ขึ้นไป",
    how: "ทำแบบทดสอบหลังเรียนสัปดาห์ที่ 1 และ 2 ให้ได้อย่างน้อย 90 %",
    check: (f) => quizAtLeast(f, [1, 2], 90),
  },
  {
    code: "circuit-analyst",
    title: "นักวิเคราะห์วงจร (Circuit Analyst)",
    description: "เรียนจบสัปดาห์ที่ 3–5 และได้คะแนนแบบทดสอบตั้งแต่ 80 % ทุกสัปดาห์",
    how: "เรียนจบสัปดาห์ที่ 3, 4, 5 และทำแบบทดสอบแต่ละสัปดาห์ให้ได้อย่างน้อย 80 %",
    check: (f) => completed(f, [3, 4, 5]) && quizAtLeast(f, [3, 4, 5], 80),
  },
  {
    code: "component-expert",
    title: "ผู้เชี่ยวชาญอุปกรณ์ (Component Expert)",
    description: "ได้คะแนนแบบทดสอบสัปดาห์ที่ 7–10 และ 13 ตั้งแต่ 80 %",
    how: "ทำแบบทดสอบสัปดาห์ที่ 7, 8, 9, 10 และ 13 ให้ได้อย่างน้อย 80 %",
    check: (f) => quizAtLeast(f, [7, 8, 9, 10, 13], 80),
  },
  {
    code: "measurement-specialist",
    title: "ผู้ชำนาญการวัด (Measurement Specialist)",
    description: "เรียนจบสัปดาห์ที่ 17–18 และทำห้องทดลองมัลติมิเตอร์และออสซิลโลสโคปครบ",
    how: "เรียนจบสัปดาห์ที่ 17 และ 18 และทำห้องทดลองมัลติมิเตอร์และออสซิลโลสโคปให้ครบ",
    check: (f) => completed(f, [17, 18]) && labDone(f, "multimeter") && labDone(f, "oscilloscope"),
  },
  {
    code: "electronics-explorer",
    title: "นักสำรวจอิเล็กทรอนิกส์ (Electronics Explorer)",
    description: "ทำห้องทดลองเสมือนครบทุกชนิดอย่างน้อยชนิดละ 1 ครั้ง",
    how: "ทำภารกิจห้องทดลองเสมือนให้ครบทุกชนิดที่มีในรายวิชา",
    check: (f) => {
      const labs = distinctLabs(f.labByWeek);
      return labs.length > 0 && labs.every((l) => labDone(f, l));
    },
  },
  {
    code: "troubleshooter",
    title: "นักแก้ปัญหาวงจร",
    description: "ทำห้องทดลองเสมือนสัปดาห์ที่ 15 (หาจุดบกพร่องของวงจร) ครบ",
    how: "ทำภารกิจห้องทดลองเสมือนสัปดาห์ที่ 15 ให้ครบ",
    check: (f) => f.labStageWeeks.has(15),
  },
  {
    code: "perfect-score",
    title: "คะแนนเต็ม",
    description: "ได้คะแนนเต็ม 100 % ในแบบทดสอบหลังเรียน",
    how: "ทำแบบทดสอบหลังเรียนสัปดาห์ใดก็ได้ให้ได้ 100 %",
    check: (f) => f.anyPerfect,
  },
  {
    code: "growth-mindset",
    title: "ไม่ยอมแพ้",
    description: "สอบผ่านหลังจากเคยสอบไม่ผ่านในสัปดาห์เดียวกัน",
    how: "หากสอบไม่ผ่าน ให้ทบทวนแล้วสอบใหม่จนผ่าน",
    check: (f) => f.growth,
  },
  {
    code: "course-graduate",
    title: "จบหลักสูตร",
    description: "เรียนจบครบทั้ง 18 สัปดาห์",
    how: "เรียนให้ครบทุกขั้นตอนทั้ง 18 สัปดาห์",
    check: (f) => completed(f, Array.from({ length: 18 }, (_, i) => i + 1)),
  },
];

export const achievementByCode = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));

export function evaluateAchievements(f: AchievementFacts): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(f)).map((a) => a.code);
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/** Insert an XP event once; returns the amount awarded now (0 if already awarded). */
export async function awardXp(tx: Tx, userId: string, ref: string, amount: number, reason: string): Promise<number> {
  const rows = await tx
    .insert(xpEvent)
    .values({ userId, ref, amount, reason })
    .onConflictDoNothing()
    .returning({ amount: xpEvent.amount });
  return rows.length ? amount : 0;
}

/** Insert newly earned achievements; returns titles of the ones earned now. */
export async function grantAchievements(tx: Tx, userId: string, codes: string[]): Promise<string[]> {
  if (!codes.length) return [];
  const existing = await tx
    .select({ code: achievement.code })
    .from(achievement)
    .where(and(eq(achievement.userId, userId), inArray(achievement.code, codes)));
  const have = new Set(existing.map((r) => r.code));
  const fresh = codes.filter((c) => !have.has(c));
  if (!fresh.length) return [];
  const inserted = await tx
    .insert(achievement)
    .values(fresh.map((code) => ({ userId, code })))
    .onConflictDoNothing()
    .returning({ code: achievement.code });
  return inserted.map((r) => achievementByCode.get(r.code)?.title ?? r.code);
}
