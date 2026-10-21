/**
 * Contract between the learner UI and the server.
 *
 * Implemented in:
 *   src/server/auth.ts      – session helpers (server-only)
 *   src/server/queries.ts   – read functions for Server Components (server-only)
 *   src/server/actions/*.ts – Server Actions ("use server") called from Client Components
 *
 * Rules
 * - Every action re-reads the session and authorises itself; it never trusts
 *   a userId from the client. Students can only touch their own rows.
 * - Actions return ActionResult (never throw for expected errors). `error` is a
 *   Thai, user-facing sentence that says what went wrong and what to do.
 * - Dates cross the boundary as ISO strings.
 */
import type { StageKey } from "@/content/course";
import type { FigureRef } from "@/content/types";
import type { LabNote } from "@/lib/db/schema";

export type { LabNote };
export type { CompetencyProfile, DomainKey, DomainResult, ObjectiveGap } from "@/lib/competency-domains";

export type Role = "student" | "teacher" | "admin";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  username: string | null;
  email: string | null; // null for synthetic username accounts
  image: string | null;
  mustChangePassword: boolean;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface WeekStatus {
  week: number;
  unlocked: boolean;
  /** Thai explanation when locked, e.g. "ผ่านแบบทดสอบสัปดาห์ที่ 3 อย่างน้อย 60 %". */
  lockReason: string | null;
  started: boolean;
  completed: boolean; // "complete" stage done
  /** 0–100, share of the 6 stages done. */
  percent: number;
  stagesDone: StageKey[];
  /** Stages the learner may open now (see src/lib/stage-order.ts). */
  stagesOpen: StageKey[];
  quizBestPercent: number | null;
}

export interface GamificationSummary {
  xp: number;
  level: number;
  levelName: string;
  xpIntoLevel: number;
  xpForNextLevel: number; // XP span of the current level
  achievements: { code: string; title: string; description: string; earnedAt: string }[];
}

export interface PendingAssignment {
  week: number;
  activityId: string;
  title: string;
  status: "not-submitted" | "submitted" | "returned" | "graded";
  score: number | null;
  maxScore: number | null;
}

export interface SidebarData {
  user: SessionUser;
  weeks: WeekStatus[]; // 18 entries
  currentWeek: number; // first unlocked & not completed week, else last
  resume: { week: number; stage: StageKey; stepIndex: number } | null;
  overallPercent: number;
}

export interface StudentOverview extends SidebarData {
  classrooms: { id: string; name: string; term: string }[];
  gamification: GamificationSummary;
  assignments: PendingAssignment[];
  recent: { at: string; text: string }[]; // learning history, newest first (≤ 20)
  quizHistory: { week: number; kind: "pre" | "post"; percent: number; at: string }[];
  certificate: { code: string; issuedAt: string } | null;
}

/** What the public certificate page shows (minimal personal data). */
export interface PublicCertificate {
  code: string;
  name: string; // name printed on the certificate
  issuedAt: string; // ISO
}

export interface SubmissionInfo {
  activityId: string;
  status: "submitted" | "returned" | "graded";
  fileName: string | null;
  submittedAt: string;
  score: number | null;
  maxScore: number | null;
  rubricScores: number[] | null;
  feedback: string | null;
}

export interface WeekProgress {
  week: number;
  unlocked: boolean;
  lockReason: string | null;
  stagesDone: StageKey[];
  /** Stages open now: all six when the order rule is off or the week is finished. */
  stagesOpen: StageKey[];
  stepsDone: string[]; // step ids
  interactionsCorrect: string[]; // interaction ids answered correctly at least once
  labTasksDone: string[]; // lab task ids completed correctly
  labReflection: string[] | null;
  /** Recorded readout snapshots (lab notebook). */
  labNotes: LabNote[];
  position: { stage: StageKey; stepIndex: number } | null;
  pretest: { percent: number; at: string } | null;
  quiz: {
    attempts: number;
    bestPercent: number | null;
    passed: boolean;
    passPercent: number;
    /** An unfinished attempt the learner can resume. */
    openAttemptId: string | null;
  };
  challengeDone: boolean;
  submissions: Record<string, SubmissionInfo>; // by activity id
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export interface PublicQuestion {
  id: string;
  type: "mcq" | "tf" | "numeric";
  stem: string; // Md
  figure: FigureRef | null;
  /** Shuffled order for mcq; [{id:"true",text:"ถูก"},{id:"false",text:"ผิด"}] for tf; null for numeric. */
  choices: { id: string; text: string }[] | null;
  unit: string | null;
}

export interface QuizStart {
  attemptId: string;
  week: number;
  kind: "pre" | "post" | "challenge";
  questions: PublicQuestion[];
  passPercent: number;
  /** Answers already saved for a resumed attempt. */
  saved: Record<string, string>;
}

export interface QuizItemResult {
  questionId: string;
  correct: boolean;
  given: string | null;
  answer: string; // correct choice id / "true"|"false" / number as string
  answerText: string; // human-readable correct answer (choice text or "12 mA")
  explanation: string;
  feedback: string | null; // why the chosen wrong option is wrong
}

export interface QuizResult {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  items: QuizItemResult[];
  xpAwarded: number;
  newAchievements: string[]; // achievement titles
  nextWeekUnlocked: boolean;
}

// ---------------------------------------------------------------------------
// Stage completion
// ---------------------------------------------------------------------------

export interface StageCompletion {
  stagesDone: StageKey[];
  xpAwarded: number;
  newAchievements: string[];
  weekCompleted: boolean;
  nextWeekUnlocked: boolean;
}

/**
 * Server-side requirements to mark a stage complete:
 * - intro:    always allowed (visiting the intro page)
 * - learn:    every step id of the week in stepsDone
 * - practice: every id in week.practice answered correctly at least once
 * - lab:      every lab task (numeric/mcq/state) done correctly
 * - quiz:     a submitted "post" attempt with passed = true
 * - complete: intro, learn, practice, lab and quiz done
 * If not met, the action returns ok:false with a Thai message listing what is missing.
 */
export type StageRequirementNote = never;
