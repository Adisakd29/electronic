/**
 * Database schema (PostgreSQL, Drizzle ORM).
 *
 * Auth tables (user/session/account/verification) follow better-auth's
 * expected shape (with the username plugin and our `role` field).
 *
 * Privacy: we store only what the course needs — display name, username or
 * school e-mail, optional student number and class membership. No phone,
 * address, birth date or ID-card number.
 */
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["student", "teacher", "admin"]);
export const stageEnum = pgEnum("stage", ["intro", "learn", "practice", "lab", "quiz", "complete"]);
export const quizKindEnum = pgEnum("quiz_kind", ["pre", "post", "challenge", "final"]);
export const submissionStatusEnum = pgEnum("submission_status", ["submitted", "returned", "graded"]);
export const questionTypeEnum = pgEnum("question_type", ["mcq", "tf", "numeric"]);
export const bloomEnum = pgEnum("bloom", ["remember", "understand", "apply", "analyze", "evaluate"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const now = (name: string) => ts(name).notNull().defaultNow();

// ---------------------------------------------------------------------------
// better-auth core tables
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Google e-mail, or a synthetic non-deliverable address for username accounts
   *  (`<username>@accounts.local`). */
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: roleEnum("role").notNull().default("student"),
  /** Optional school student number (เลขประจำตัวนักเรียน) for reports. */
  studentNo: text("student_no"),
  disabled: boolean("disabled").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  /** Trade chosen by the learner for lesson examples (TrackId; null = class default / general). */
  track: text("track"),
  createdAt: now("created_at"),
  updatedAt: now("updated_at"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: now("created_at"),
    updatedAt: now("updated_at"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: now("created_at"),
    updatedAt: now("updated_at"),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: now("created_at"),
  updatedAt: now("updated_at"),
});

// ---------------------------------------------------------------------------
// Access control: who may sign in with Google
// ---------------------------------------------------------------------------

/** Individual e-mails (or whole domains with `*@domain`) allowed to sign in
 *  with Google. Optionally pre-assigns a role and classroom. */
export const allowedEmail = pgTable("allowed_email", {
  id: text("id").primaryKey(),
  pattern: text("pattern").notNull().unique(), // "somchai@school.ac.th" | "*@school.ac.th"
  role: roleEnum("role").notNull().default("student"),
  classroomId: text("classroom_id").references(() => classroom.id, { onDelete: "set null" }),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: now("created_at"),
});

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export const classroom = pgTable("classroom", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // e.g. "ชฟ.1/2"
  /** Semester label, e.g. "1/2569". */
  term: text("term").notNull(),
  /** Short code students can type to join (optional). */
  joinCode: text("join_code").unique(),
  /** Default trade of the class (TrackId), e.g. "auto" for a ช่างยนต์ class; learners may override. */
  track: text("track"),
  archived: boolean("archived").notNull().default(false),
  createdAt: now("created_at"),
});

export const classroomTeacher = pgTable(
  "classroom_teacher",
  {
    classroomId: text("classroom_id")
      .notNull()
      .references(() => classroom.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.classroomId, t.userId] })],
);

export const enrollment = pgTable(
  "enrollment",
  {
    classroomId: text("classroom_id")
      .notNull()
      .references(() => classroom.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: now("created_at"),
  },
  (t) => [primaryKey({ columns: [t.classroomId, t.userId] }), index("enrollment_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Unlock policy (per classroom) and individual overrides
// ---------------------------------------------------------------------------

export interface UnlockRule {
  requireLearn: boolean; // all Learn steps completed
  requirePractice: boolean; // practice stage completed
  requireLab: boolean; // lab stage completed
  requireAssignments: boolean; // all `submit: true` activities submitted
  minQuizPercent: number; // 0 = quiz not required
  /** Stages inside a week must be done in order (intro → … → complete). Missing in old rows = true. */
  requireStageOrder?: boolean;
}

export const unlockPolicy = pgTable("unlock_policy", {
  classroomId: text("classroom_id")
    .primaryKey()
    .references(() => classroom.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  /** Default rule applied to every week's prerequisite (week n−1). */
  defaultRule: jsonb("default_rule").$type<UnlockRule>().notNull(),
  /** Optional per-week override: key = week number that is being unlocked. */
  weekRules: jsonb("week_rules").$type<Record<string, UnlockRule>>().notNull().default({}),
  /** Weeks the teacher opened for everyone regardless of rules. */
  openedWeeks: jsonb("opened_weeks").$type<number[]>().notNull().default([]),
  updatedAt: now("updated_at"),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
});

export const unlockOverride = pgTable(
  "unlock_override",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: now("created_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.week] })],
);

// ---------------------------------------------------------------------------
// Learning progress
// ---------------------------------------------------------------------------

export const stageProgress = pgTable(
  "stage_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    stage: stageEnum("stage").notNull(),
    completedAt: now("completed_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.week, t.stage] })],
);

export const stepProgress = pgTable(
  "step_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    stepId: text("step_id").notNull(),
    completedAt: now("completed_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.stepId] }), index("step_progress_week_idx").on(t.userId, t.week)],
);

/** "Continue where you left off" — one row per user per week + last week. */
export const learningPosition = pgTable(
  "learning_position",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    stage: stageEnum("stage").notNull(),
    stepIndex: integer("step_index").notNull().default(0),
    updatedAt: now("updated_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.week] })],
);

/** Every check of an in-lesson interaction (for "frequently wrong" analytics). */
export const interactionAttempt = pgTable(
  "interaction_attempt",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    interactionId: text("interaction_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    wrongAttempts: integer("wrong_attempts").notNull().default(0),
    correct: boolean("correct").notNull().default(false),
    firstTryCorrect: boolean("first_try_correct"),
    /** Last wrong answer key (option id / value) for item analysis. */
    lastWrong: text("last_wrong"),
    updatedAt: now("updated_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.interactionId] }), index("interaction_week_idx").on(t.week, t.interactionId)],
);

export const labTaskResult = pgTable(
  "lab_task_result",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    taskId: text("task_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correct: boolean("correct").notNull().default(false),
    value: text("value"),
    updatedAt: now("updated_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.taskId] }), index("lab_task_week_idx").on(t.week)],
);

/** One row of the lab notebook. */
export interface LabNote {
  at: string; // ISO
  label: string; // learner's caption, e.g. "ครั้งที่ 1 R = 100 Ω"
  values: { k: string; v: string }[]; // readout name → formatted value
}

/** Free-text lab reflections (not auto-graded) and the lab notebook. */
export const labReflection = pgTable(
  "lab_reflection",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    answers: jsonb("answers").$type<string[]>().notNull(),
    /** Lab notebook: readout snapshots the learner recorded ("บันทึกผลการทดลอง"). */
    notes: jsonb("notes").$type<LabNote[]>().notNull().default([]),
    updatedAt: now("updated_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.week] })],
);

// ---------------------------------------------------------------------------
// Question bank & quizzes
// ---------------------------------------------------------------------------

export interface QuestionChoice {
  id: "a" | "b" | "c" | "d";
  text: string;
}

/** Seeded from content files (source = "content"); teachers can edit or add
 *  (source = "teacher"). Content re-seeding never overwrites teacher edits
 *  (rows with `editedAt` set are skipped). */
export const question = pgTable(
  "question",
  {
    id: text("id").primaryKey(), // "W03-Q01" or "W03-T<random>" for teacher-made
    week: integer("week").notNull(),
    type: questionTypeEnum("type").notNull(),
    bloom: bloomEnum("bloom").notNull(),
    objective: text("objective"),
    stem: text("stem").notNull(),
    figure: jsonb("figure").$type<{ figure: string; caption: string; alt: string } | null>(),
    choices: jsonb("choices").$type<QuestionChoice[] | null>(),
    answer: text("answer").notNull(), // choice id | "true"/"false" | number as string
    tolerance: real("tolerance"),
    unit: text("unit"),
    explanation: text("explanation").notNull(),
    feedback: jsonb("feedback").$type<Record<string, string> | null>(),
    active: boolean("active").notNull().default(true),
    source: text("source").notNull().default("content"),
    editedAt: ts("edited_at"),
    editedBy: text("edited_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: now("created_at"),
  },
  (t) => [index("question_week_idx").on(t.week, t.active)],
);

export const quizAttempt = pgTable(
  "quiz_attempt",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(), // 0 = final assessment across weeks
    kind: quizKindEnum("kind").notNull(),
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    /** Per-question choice order shown to the learner (shuffled). */
    choiceOrder: jsonb("choice_order").$type<Record<string, string[]>>().notNull().default({}),
    answers: jsonb("answers").$type<Record<string, string>>(),
    score: integer("score"),
    maxScore: integer("max_score").notNull(),
    percent: real("percent"),
    passed: boolean("passed"),
    startedAt: now("started_at"),
    submittedAt: ts("submitted_at"),
  },
  (t) => [
    index("quiz_attempt_user_idx").on(t.userId, t.week, t.kind),
    /** At most one open (unsubmitted) attempt per learner, week and kind. */
    uniqueIndex("quiz_attempt_open_idx").on(t.userId, t.week, t.kind).where(sql`${t.submittedAt} is null`),
  ],
);

export const questionResponse = pgTable(
  "question_response",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => quizAttempt.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    week: integer("week").notNull(),
    answer: text("answer"),
    correct: boolean("correct").notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] }), index("question_response_q_idx").on(t.questionId)],
);

// ---------------------------------------------------------------------------
// Assignments (worksheet uploads) & grading
// ---------------------------------------------------------------------------

export const submission = pgTable(
  "submission",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    activityId: text("activity_id").notNull(), // "W03-A01"
    fileKey: text("file_key"), // storage key (see src/lib/storage.ts)
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    note: text("note"),
    status: submissionStatusEnum("status").notNull().default("submitted"),
    /** Rubric scores keyed by criterion index, levels 1–4. */
    rubricScores: jsonb("rubric_scores").$type<number[] | null>(),
    score: real("score"),
    maxScore: real("max_score"),
    feedback: text("feedback"),
    gradedBy: text("graded_by").references(() => user.id, { onDelete: "set null" }),
    gradedAt: ts("graded_at"),
    submittedAt: now("submitted_at"),
  },
  (t) => [
    uniqueIndex("submission_user_activity_idx").on(t.userId, t.activityId),
    index("submission_week_idx").on(t.week, t.status),
  ],
);

// ---------------------------------------------------------------------------
// Competency assessment (teacher-entered, incl. final W18 assessment)
// ---------------------------------------------------------------------------

export const competencyAssessment = pgTable(
  "competency_assessment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    classroomId: text("classroom_id").references(() => classroom.id, { onDelete: "set null" }),
    /** Course competency 1–4, or 0 for the overall final assessment. */
    competency: integer("competency").notNull(),
    week: integer("week"), // week the evidence comes from (optional)
    level: integer("level").notNull(), // 1–4 (ปรับปรุง … ดีมาก)
    score: real("score"),
    maxScore: real("max_score"),
    passed: boolean("passed").notNull(),
    note: text("note"),
    assessedBy: text("assessed_by").references(() => user.id, { onDelete: "set null" }),
    assessedAt: now("assessed_at"),
  },
  (t) => [uniqueIndex("competency_user_comp_idx").on(t.userId, t.competency, t.week)],
);

// ---------------------------------------------------------------------------
// Gamification
// ---------------------------------------------------------------------------

/** XP is only awarded for demonstrated learning. `ref` makes awards
 *  idempotent (e.g. "quiz-pass:W03", "lab-task:W07-L02"). */
export const xpEvent = pgTable(
  "xp_event",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ref: text("ref").notNull(),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    createdAt: now("created_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.ref] })],
);

export const achievement = pgTable(
  "achievement",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // see src/lib/gamification.ts
    earnedAt: now("earned_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.code] })],
);

export const certificate = pgTable("certificate", {
  id: text("id").primaryKey(),
  /** Public verification code printed on the certificate. */
  code: text("code").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  nameOnCertificate: text("name_on_certificate").notNull(),
  issuedAt: now("issued_at"),
  issuedBy: text("issued_by").references(() => user.id, { onDelete: "set null" }),
  revoked: boolean("revoked").notNull().default(false),
});

// ---------------------------------------------------------------------------
// Audit log (teacher/admin actions that change other users' data)
// ---------------------------------------------------------------------------

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    target: text("target"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: now("created_at"),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);
