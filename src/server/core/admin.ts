/** Admin read models (callers must ensure role = admin). */
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { Tx } from "@/lib/db";
import { allowedEmail, auditLog, certificate, classroom, classroomTeacher, enrollment, question, quizAttempt, submission, user } from "@/lib/db/schema";
import { isStubWeek, TOTAL_WEEKS, weekContent } from "../content";

export async function searchUsers(tx: Tx, q: string | null, role: string | null) {
  const conds = [];
  if (q) conds.push(or(ilike(user.name, `%${q}%`), ilike(user.username, `%${q}%`), ilike(user.email, `%${q}%`), ilike(user.studentNo, `%${q}%`)));
  if (role && ["student", "teacher", "admin"].includes(role)) conds.push(eq(user.role, role as "student"));
  return tx
    .select({ id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, studentNo: user.studentNo, disabled: user.disabled, createdAt: user.createdAt })
    .from(user)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(user.role), asc(user.name))
    .limit(200);
}

export async function classroomsWithPeople(tx: Tx) {
  const classes = await tx.select().from(classroom).orderBy(asc(classroom.archived), desc(classroom.term), asc(classroom.name));
  const teachers = await tx
    .select({ classroomId: classroomTeacher.classroomId, name: user.name, username: user.username })
    .from(classroomTeacher)
    .innerJoin(user, eq(user.id, classroomTeacher.userId));
  const counts = await tx.select({ classroomId: enrollment.classroomId, n: sql<number>`count(*)::int` }).from(enrollment).groupBy(enrollment.classroomId);
  return classes.map((c) => ({
    ...c,
    teachers: teachers.filter((t) => t.classroomId === c.id),
    students: counts.find((x) => x.classroomId === c.id)?.n ?? 0,
  }));
}

export async function allowlistAll(tx: Tx) {
  return tx
    .select({ id: allowedEmail.id, pattern: allowedEmail.pattern, role: allowedEmail.role, classroomId: allowedEmail.classroomId, className: classroom.name, term: classroom.term, createdAt: allowedEmail.createdAt })
    .from(allowedEmail)
    .leftJoin(classroom, eq(classroom.id, allowedEmail.classroomId))
    .orderBy(asc(allowedEmail.pattern));
}

export async function auditRecent(tx: Tx, limit = 200) {
  return tx
    .select({ id: auditLog.id, action: auditLog.action, target: auditLog.target, detail: auditLog.detail, createdAt: auditLog.createdAt, actor: user.name, actorUsername: user.username })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function systemInfo(tx: Tx) {
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const count = sql<number>`count(*)::int`;
  const [students, teachers, admins, classes, questions, attempts, submissions, certificates] = await Promise.all([
    one(tx.select({ n: count }).from(user).where(eq(user.role, "student"))),
    one(tx.select({ n: count }).from(user).where(eq(user.role, "teacher"))),
    one(tx.select({ n: count }).from(user).where(eq(user.role, "admin"))),
    one(tx.select({ n: count }).from(classroom).where(eq(classroom.archived, false))),
    one(tx.select({ n: count }).from(question).where(eq(question.active, true))),
    one(tx.select({ n: count }).from(quizAttempt)),
    one(tx.select({ n: count }).from(submission)),
    one(tx.select({ n: count }).from(certificate).where(eq(certificate.revoked, false))),
  ]);
  const bank = await tx.select({ week: question.week, n: sql<number>`count(*) filter (where ${question.active})::int` }).from(question).groupBy(question.week);
  const weeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const n = i + 1;
    const w = weekContent(n);
    return {
      week: n,
      title: w?.title ?? `สัปดาห์ที่ ${n}`,
      loaded: Boolean(w),
      stub: isStubWeek(w),
      steps: w?.steps.length ?? 0,
      interactions: w?.interactions.length ?? 0,
      labTasks: w?.lab.tasks.length ?? 0,
      contentQuestions: w?.quiz.questions.length ?? 0,
      bankActive: bank.find((b) => b.week === n)?.n ?? 0,
    };
  });
  return { counts: { students, teachers, admins, classes, questions, attempts, submissions, certificates }, weeks };
}
