CREATE TYPE "public"."bloom" AS ENUM('remember', 'understand', 'apply', 'analyze', 'evaluate');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('mcq', 'tf', 'numeric');--> statement-breakpoint
CREATE TYPE "public"."quiz_kind" AS ENUM('pre', 'post', 'challenge', 'final');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'teacher', 'admin');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('intro', 'learn', 'practice', 'lab', 'quiz', 'complete');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('submitted', 'returned', 'graded');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement" (
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievement_user_id_code_pk" PRIMARY KEY("user_id","code")
);
--> statement-breakpoint
CREATE TABLE "allowed_email" (
	"id" text PRIMARY KEY NOT NULL,
	"pattern" text NOT NULL,
	"role" "role" DEFAULT 'student' NOT NULL,
	"classroom_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allowed_email_pattern_unique" UNIQUE("pattern")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificate" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"name_on_certificate" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by" text,
	"revoked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "certificate_code_unique" UNIQUE("code"),
	CONSTRAINT "certificate_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "classroom" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"term" text NOT NULL,
	"join_code" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classroom_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "classroom_teacher" (
	"classroom_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "classroom_teacher_classroom_id_user_id_pk" PRIMARY KEY("classroom_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "competency_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"classroom_id" text,
	"competency" integer NOT NULL,
	"week" integer,
	"level" integer NOT NULL,
	"score" real,
	"max_score" real,
	"passed" boolean NOT NULL,
	"note" text,
	"assessed_by" text,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment" (
	"classroom_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_classroom_id_user_id_pk" PRIMARY KEY("classroom_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "interaction_attempt" (
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"interaction_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"wrong_attempts" integer DEFAULT 0 NOT NULL,
	"correct" boolean DEFAULT false NOT NULL,
	"first_try_correct" boolean,
	"last_wrong" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interaction_attempt_user_id_interaction_id_pk" PRIMARY KEY("user_id","interaction_id")
);
--> statement-breakpoint
CREATE TABLE "lab_reflection" (
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_reflection_user_id_week_pk" PRIMARY KEY("user_id","week")
);
--> statement-breakpoint
CREATE TABLE "lab_task_result" (
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"task_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" boolean DEFAULT false NOT NULL,
	"value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_task_result_user_id_task_id_pk" PRIMARY KEY("user_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "learning_position" (
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"stage" "stage" NOT NULL,
	"step_index" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_position_user_id_week_pk" PRIMARY KEY("user_id","week")
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" text PRIMARY KEY NOT NULL,
	"week" integer NOT NULL,
	"type" "question_type" NOT NULL,
	"bloom" "bloom" NOT NULL,
	"objective" text,
	"stem" text NOT NULL,
	"figure" jsonb,
	"choices" jsonb,
	"answer" text NOT NULL,
	"tolerance" real,
	"unit" text,
	"explanation" text NOT NULL,
	"feedback" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'content' NOT NULL,
	"edited_at" timestamp with time zone,
	"edited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_response" (
	"attempt_id" text NOT NULL,
	"question_id" text NOT NULL,
	"week" integer NOT NULL,
	"answer" text,
	"correct" boolean NOT NULL,
	CONSTRAINT "question_response_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"kind" "quiz_kind" NOT NULL,
	"question_ids" jsonb NOT NULL,
	"choice_order" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"answers" jsonb,
	"score" integer,
	"max_score" integer NOT NULL,
	"percent" real,
	"passed" boolean,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stage_progress" (
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"stage" "stage" NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_progress_user_id_week_stage_pk" PRIMARY KEY("user_id","week","stage")
);
--> statement-breakpoint
CREATE TABLE "step_progress" (
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"step_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "step_progress_user_id_step_id_pk" PRIMARY KEY("user_id","step_id")
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"activity_id" text NOT NULL,
	"file_key" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"note" text,
	"status" "submission_status" DEFAULT 'submitted' NOT NULL,
	"rubric_scores" jsonb,
	"score" real,
	"max_score" real,
	"feedback" text,
	"graded_by" text,
	"graded_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unlock_override" (
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"granted_by" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unlock_override_user_id_week_pk" PRIMARY KEY("user_id","week")
);
--> statement-breakpoint
CREATE TABLE "unlock_policy" (
	"classroom_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"default_rule" jsonb NOT NULL,
	"week_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opened_weeks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"display_username" text,
	"role" "role" DEFAULT 'student' NOT NULL,
	"student_no" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_event" (
	"user_id" text NOT NULL,
	"ref" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xp_event_user_id_ref_pk" PRIMARY KEY("user_id","ref")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement" ADD CONSTRAINT "achievement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowed_email" ADD CONSTRAINT "allowed_email_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowed_email" ADD CONSTRAINT "allowed_email_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_teacher" ADD CONSTRAINT "classroom_teacher_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_teacher" ADD CONSTRAINT "classroom_teacher_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_assessment" ADD CONSTRAINT "competency_assessment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_assessment" ADD CONSTRAINT "competency_assessment_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_assessment" ADD CONSTRAINT "competency_assessment_assessed_by_user_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_attempt" ADD CONSTRAINT "interaction_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_reflection" ADD CONSTRAINT "lab_reflection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_task_result" ADD CONSTRAINT "lab_task_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_position" ADD CONSTRAINT "learning_position_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_edited_by_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_response" ADD CONSTRAINT "question_response_attempt_id_quiz_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_graded_by_user_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_override" ADD CONSTRAINT "unlock_override_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_override" ADD CONSTRAINT "unlock_override_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_policy" ADD CONSTRAINT "unlock_policy_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_policy" ADD CONSTRAINT "unlock_policy_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_event" ADD CONSTRAINT "xp_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "competency_user_comp_idx" ON "competency_assessment" USING btree ("user_id","competency","week");--> statement-breakpoint
CREATE INDEX "enrollment_user_idx" ON "enrollment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interaction_week_idx" ON "interaction_attempt" USING btree ("week","interaction_id");--> statement-breakpoint
CREATE INDEX "lab_task_week_idx" ON "lab_task_result" USING btree ("week");--> statement-breakpoint
CREATE INDEX "question_week_idx" ON "question" USING btree ("week","active");--> statement-breakpoint
CREATE INDEX "question_response_q_idx" ON "question_response" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "quiz_attempt_user_idx" ON "quiz_attempt" USING btree ("user_id","week","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempt_open_idx" ON "quiz_attempt" USING btree ("user_id","week","kind") WHERE "quiz_attempt"."submitted_at" is null;--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "step_progress_week_idx" ON "step_progress" USING btree ("user_id","week");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_user_activity_idx" ON "submission" USING btree ("user_id","activity_id");--> statement-breakpoint
CREATE INDEX "submission_week_idx" ON "submission" USING btree ("week","status");