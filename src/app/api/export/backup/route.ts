import { connection } from "next/server";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";
import { attachment } from "@/lib/export";
import { getSessionUser } from "@/server/auth";
import { audit } from "@/server/core/staff-actions";

/**
 * Full JSON export of course data (admin only). Excludes secrets: password
 * hashes, OAuth tokens, sessions and verification tokens are never exported.
 * For a complete restorable backup use `scripts/backup.ts` (pg_dump).
 */
export async function GET() {
  await connection();
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return new Response("เฉพาะผู้ดูแลระบบเท่านั้น", { status: 403 });
  const [users, classrooms, classroomTeachers, enrollments, allowlist, policies, overrides, stages, steps, positions, interactions, labs, reflections, questions, attempts, responses, submissions, competencies, xp, achievements, certificates] =
    await Promise.all([
      db
        .select({ id: S.user.id, name: S.user.name, email: S.user.email, username: S.user.username, role: S.user.role, studentNo: S.user.studentNo, disabled: S.user.disabled, createdAt: S.user.createdAt })
        .from(S.user),
      db.select().from(S.classroom),
      db.select().from(S.classroomTeacher),
      db.select().from(S.enrollment),
      db.select().from(S.allowedEmail),
      db.select().from(S.unlockPolicy),
      db.select().from(S.unlockOverride),
      db.select().from(S.stageProgress),
      db.select().from(S.stepProgress),
      db.select().from(S.learningPosition),
      db.select().from(S.interactionAttempt),
      db.select().from(S.labTaskResult),
      db.select().from(S.labReflection),
      db.select().from(S.question),
      db.select().from(S.quizAttempt),
      db.select().from(S.questionResponse),
      db.select().from(S.submission),
      db.select().from(S.competencyAssessment),
      db.select().from(S.xpEvent),
      db.select().from(S.achievement),
      db.select().from(S.certificate),
    ]);
  await audit(db, user.id, "backup.export", null);
  const now = new Date();
  const body = JSON.stringify({
    format: "eelearn-backup",
    version: 1,
    exportedAt: now.toISOString(),
    note: "No password hashes, OAuth tokens or sessions are included. Uploaded files are stored separately in UPLOAD_DIR.",
    tables: { users, classrooms, classroomTeachers, enrollments, allowlist, policies, overrides, stages, steps, positions, interactions, labs, reflections, questions, attempts, responses, submissions, competencies, xp, achievements, certificates },
  });
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new Response(body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": attachment(`eelearn-backup-${stamp}.json`), "Cache-Control": "no-store" },
  });
}
