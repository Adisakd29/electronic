/**
 * Teacher/admin mutations (core). Each function authorises the acting user
 * itself and writes an audit log entry for changes to other users' data.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "@/lib/db";
import {
  allowedEmail,
  auditLog,
  certificate,
  classroom,
  classroomTeacher,
  competencyAssessment,
  enrollment,
  question,
  submission,
  unlockOverride,
  unlockPolicy,
  user,
  type UnlockRule,
} from "@/lib/db/schema";
import { viewerCanAccessStudent, viewerCanManageClass, type Viewer } from "@/lib/access";
import { assignmentEarnsXp, awardXp, XP, xpRef } from "@/lib/gamification";
import { validateQuestion } from "@/lib/quiz";
import { DEFAULT_RULE, normaliseRule } from "@/lib/unlock";
import { storage } from "@/lib/storage";
import type { Role } from "../contracts";
import {
  createUsernameAccount,
  generateTempPassword,
  newId,
  normaliseAllowPattern,
  parseBulkLines,
  randomCode,
  setPassword,
  USERNAME_RE,
} from "../accounts";
import { activityById, rubricScore, rubricMax, TOTAL_WEEKS, weekContent } from "../content";
import { loadUserState, weekStatuses } from "./progress";

export type Result<T = null> = { ok: true; data: T; message?: string } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });
const ok = <T>(data: T, message?: string) => ({ ok: true as const, data, message });

const NO_ACCESS = "คุณไม่มีสิทธิ์จัดการข้อมูลของนักเรียนคนนี้ (ต้องเป็นครูประจำห้องเรียนที่นักเรียนลงทะเบียน)";
const NO_CLASS = "คุณไม่มีสิทธิ์จัดการห้องเรียนนี้";

export async function audit(tx: Tx, actorId: string, action: string, target: string | null, detail?: Record<string, unknown>) {
  await tx.insert(auditLog).values({ id: randomUUID(), actorId, action, target, detail: detail ?? null });
}

const isStaff = (v: Viewer) => v.role === "teacher" || v.role === "admin";
const weekNum = z.coerce.number().int().min(1).max(TOTAL_WEEKS);

async function canTouchStudent(tx: Tx, viewer: Viewer, studentId: string): Promise<boolean> {
  if (!isStaff(viewer)) return false;
  return viewerCanAccessStudent(tx, viewer, studentId);
}

async function targetRole(tx: Tx, userId: string): Promise<Role | null> {
  const [u] = await tx.select({ role: user.role }).from(user).where(eq(user.id, userId));
  return u?.role ?? null;
}

// ---------------------------------------------------------------------------
// Students: overrides, password, certificate
// ---------------------------------------------------------------------------

export async function grantWeekOverride(tx: Tx, viewer: Viewer, studentId: string, weekInput: unknown, note?: string): Promise<Result> {
  const w = weekNum.safeParse(weekInput);
  if (!w.success) return fail("กรุณาเลือกสัปดาห์ 1–18");
  if (!(await canTouchStudent(tx, viewer, studentId))) return fail(NO_ACCESS);
  await tx
    .insert(unlockOverride)
    .values({ userId: studentId, week: w.data, grantedBy: viewer.id, note: note?.slice(0, 200) || null })
    .onConflictDoNothing();
  await audit(tx, viewer.id, "unlock.override.grant", studentId, { week: w.data });
  return ok(null, `ปลดล็อกสัปดาห์ที่ ${w.data} ให้นักเรียนแล้ว`);
}

export async function revokeWeekOverride(tx: Tx, viewer: Viewer, studentId: string, weekInput: unknown): Promise<Result> {
  const w = weekNum.safeParse(weekInput);
  if (!w.success) return fail("กรุณาเลือกสัปดาห์ 1–18");
  if (!(await canTouchStudent(tx, viewer, studentId))) return fail(NO_ACCESS);
  await tx.delete(unlockOverride).where(and(eq(unlockOverride.userId, studentId), eq(unlockOverride.week, w.data)));
  await audit(tx, viewer.id, "unlock.override.revoke", studentId, { week: w.data });
  return ok(null, `ยกเลิกการปลดล็อกรายบุคคลสัปดาห์ที่ ${w.data} แล้ว`);
}

/** Generates a temporary password (shown once). Teachers may reset only students of their classes. */
export async function resetPassword(tx: Tx, viewer: Viewer, userId: string): Promise<Result<{ password: string; username: string | null }>> {
  const role = await targetRole(tx, userId);
  if (!role) return fail("ไม่พบผู้ใช้");
  if (viewer.role !== "admin") {
    if (role !== "student" || !(await canTouchStudent(tx, viewer, userId))) return fail(NO_ACCESS);
  }
  const [u] = await tx.select({ username: user.username }).from(user).where(eq(user.id, userId));
  const pw = generateTempPassword();
  await setPassword(tx, userId, pw, true);
  await audit(tx, viewer.id, "user.password.reset", userId);
  return ok({ password: pw, username: u?.username ?? null }, "สร้างรหัสผ่านชั่วคราวแล้ว — แจ้งนักเรียน รหัสนี้จะแสดงเพียงครั้งเดียว");
}

function certificateCode(): string {
  const c = randomCode(8);
  return `EE-${c.slice(0, 4)}-${c.slice(4)}`;
}

export async function certificateEligibility(tx: Tx, studentId: string) {
  const s = await loadUserState(tx, studentId);
  const weeks = weekStatuses(s);
  const done = weeks.filter((w) => w.completed).length;
  const [fin] = await tx
    .select({ id: competencyAssessment.id })
    .from(competencyAssessment)
    .where(and(eq(competencyAssessment.userId, studentId), eq(competencyAssessment.competency, 0), eq(competencyAssessment.passed, true)));
  return { allComplete: done === TOTAL_WEEKS, weeksCompleted: done, finalPassed: Boolean(fin) };
}

export async function issueCertificate(tx: Tx, viewer: Viewer, studentId: string): Promise<Result<{ code: string }>> {
  if (!(await canTouchStudent(tx, viewer, studentId))) return fail(NO_ACCESS);
  const [existing] = await tx.select().from(certificate).where(eq(certificate.userId, studentId));
  if (existing && !existing.revoked) return ok({ code: existing.code }, "นักเรียนคนนี้ได้รับเกียรติบัตรแล้ว");
  const e = await certificateEligibility(tx, studentId);
  if (!e.allComplete || !e.finalPassed) {
    const miss = [!e.allComplete ? `เรียนจบครบ 18 สัปดาห์ (ตอนนี้ ${e.weeksCompleted}/18)` : null, !e.finalPassed ? "ผ่านการประเมินสมรรถนะปลายภาค" : null].filter(Boolean);
    return fail(`ยังออกเกียรติบัตรไม่ได้ — นักเรียนต้อง${miss.join(" และ ")}`);
  }
  const [u] = await tx.select({ name: user.name }).from(user).where(eq(user.id, studentId));
  const code = certificateCode();
  if (existing) {
    await tx.update(certificate).set({ code, revoked: false, issuedAt: new Date(), issuedBy: viewer.id, nameOnCertificate: u.name }).where(eq(certificate.id, existing.id));
  } else {
    await tx.insert(certificate).values({ id: randomUUID(), code, userId: studentId, nameOnCertificate: u.name, issuedBy: viewer.id });
  }
  await audit(tx, viewer.id, "certificate.issue", studentId, { code });
  return ok({ code }, `ออกเกียรติบัตรแล้ว รหัสตรวจสอบ ${code}`);
}

export async function revokeCertificate(tx: Tx, viewer: Viewer, studentId: string): Promise<Result> {
  if (!(await canTouchStudent(tx, viewer, studentId))) return fail(NO_ACCESS);
  await tx.update(certificate).set({ revoked: true }).where(eq(certificate.userId, studentId));
  await audit(tx, viewer.id, "certificate.revoke", studentId);
  return ok(null, "ยกเลิกเกียรติบัตรแล้ว");
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export async function gradeSubmission(
  tx: Tx,
  viewer: Viewer,
  submissionId: string,
  levels: number[],
  feedback: string,
  mode: "grade" | "return",
): Promise<Result<{ score: number | null; maxScore: number | null }>> {
  const [x] = await tx.select().from(submission).where(eq(submission.id, submissionId));
  if (!x) return fail("ไม่พบงานที่ส่ง");
  if (!(await canTouchStudent(tx, viewer, x.userId))) return fail(NO_ACCESS);
  const act = activityById(weekContent(x.week), x.activityId);
  const fb = feedback.trim().slice(0, 4000) || null;
  if (mode === "return") {
    if (!fb) return fail("กรุณาเขียนคำแนะนำให้นักเรียนว่าต้องแก้ไขอะไรก่อนส่งกลับ");
    await tx.update(submission).set({ status: "returned", feedback: fb, gradedBy: viewer.id, gradedAt: new Date() }).where(eq(submission.id, x.id));
    await audit(tx, viewer.id, "submission.return", x.userId, { submission: x.id });
    return ok({ score: null, maxScore: null }, "ส่งงานกลับให้นักเรียนแก้ไขแล้ว");
  }
  if (!act) return fail("ไม่พบเกณฑ์การให้คะแนนของใบงานนี้ในเนื้อหา");
  if (levels.length !== act.rubric.length || levels.some((l) => !Number.isInteger(l) || l < 1 || l > 4)) {
    return fail(`กรุณาเลือกระดับคะแนน 1–4 ให้ครบทั้ง ${act.rubric.length} เกณฑ์`);
  }
  const score = rubricScore(act, levels);
  const maxScore = rubricMax(act);
  await tx
    .update(submission)
    .set({ status: "graded", rubricScores: levels, score, maxScore, feedback: fb, gradedBy: viewer.id, gradedAt: new Date() })
    .where(eq(submission.id, x.id));
  if (assignmentEarnsXp(levels)) await awardXp(tx, x.userId, xpRef.assignment(x.activityId), XP.assignmentGood, "ใบงานได้ระดับดีขึ้นไป");
  await audit(tx, viewer.id, "submission.grade", x.userId, { submission: x.id, score });
  return ok({ score, maxScore }, `บันทึกคะแนน ${score}/${maxScore} แล้ว`);
}

// ---------------------------------------------------------------------------
// Competency
// ---------------------------------------------------------------------------

const competencySchema = z.object({
  studentId: z.string().min(1),
  classroomId: z.string().min(1).nullable(),
  competency: z.coerce.number().int().min(0).max(4),
  level: z.coerce.number().int().min(1).max(4),
  score: z.coerce.number().min(0).max(1000).nullable(),
  maxScore: z.coerce.number().min(0).max(1000).nullable(),
  passed: z.boolean(),
  note: z.string().max(1000).nullable(),
});

export async function saveCompetency(tx: Tx, viewer: Viewer, input: z.input<typeof competencySchema>): Promise<Result<{ certificate: string | null }>> {
  const p = competencySchema.safeParse(input);
  if (!p.success) return fail("ข้อมูลการประเมินไม่ถูกต้อง: ระดับต้องเป็น 1–4 และคะแนนต้องเป็นตัวเลข");
  const d = p.data;
  if (d.score != null && d.maxScore != null && d.score > d.maxScore) return fail("คะแนนที่ได้ต้องไม่เกินคะแนนเต็ม");
  if (!(await canTouchStudent(tx, viewer, d.studentId))) return fail(NO_ACCESS);
  if (d.classroomId && !(await viewerCanManageClass(tx, viewer, d.classroomId))) return fail(NO_CLASS);
  const values = {
    level: d.level,
    score: d.score,
    maxScore: d.maxScore,
    passed: d.passed,
    note: d.note?.trim() || null,
    classroomId: d.classroomId,
    assessedBy: viewer.id,
    assessedAt: new Date(),
  };
  // week 0 = course-level assessment (keeps the unique index usable).
  await tx
    .insert(competencyAssessment)
    .values({ id: randomUUID(), userId: d.studentId, competency: d.competency, week: d.competency === 0 ? 18 : 0, ...values })
    .onConflictDoUpdate({ target: [competencyAssessment.userId, competencyAssessment.competency, competencyAssessment.week], set: values });
  await audit(tx, viewer.id, "competency.save", d.studentId, { competency: d.competency, level: d.level, passed: d.passed });
  let cert: string | null = null;
  if (d.competency === 0 && d.passed) {
    const e = await certificateEligibility(tx, d.studentId);
    if (e.allComplete) {
      const r = await issueCertificate(tx, viewer, d.studentId);
      if (r.ok) cert = r.data.code;
    }
  }
  return ok({ certificate: cert }, cert ? `บันทึกผลแล้ว และออกเกียรติบัตรอัตโนมัติ (${cert})` : "บันทึกผลการประเมินแล้ว");
}

// ---------------------------------------------------------------------------
// Unlock policy
// ---------------------------------------------------------------------------

export async function saveUnlockPolicy(
  tx: Tx,
  viewer: Viewer,
  classId: string,
  input: { enabled: boolean; defaultRule: Partial<UnlockRule>; weekRules: Record<string, Partial<UnlockRule>> },
): Promise<Result> {
  if (!(await viewerCanManageClass(tx, viewer, classId))) return fail(NO_CLASS);
  const weekRules: Record<string, UnlockRule> = {};
  for (const [k, r] of Object.entries(input.weekRules)) {
    const w = Number(k);
    if (Number.isInteger(w) && w >= 2 && w <= TOTAL_WEEKS) weekRules[String(w)] = normaliseRule(r);
  }
  const values = { enabled: input.enabled, defaultRule: normaliseRule(input.defaultRule), weekRules, updatedAt: new Date(), updatedBy: viewer.id };
  await tx.insert(unlockPolicy).values({ classroomId: classId, ...values }).onConflictDoUpdate({ target: unlockPolicy.classroomId, set: values });
  await audit(tx, viewer.id, "unlock.policy.save", classId, { enabled: input.enabled });
  return ok(null, "บันทึกเกณฑ์การปลดล็อกแล้ว");
}

export async function setWeekOpen(tx: Tx, viewer: Viewer, classId: string, weekInput: unknown, open: boolean): Promise<Result> {
  const w = weekNum.safeParse(weekInput);
  if (!w.success) return fail("กรุณาเลือกสัปดาห์ 1–18");
  if (!(await viewerCanManageClass(tx, viewer, classId))) return fail(NO_CLASS);
  const [p] = await tx.select().from(unlockPolicy).where(eq(unlockPolicy.classroomId, classId));
  const opened = new Set(p?.openedWeeks ?? []);
  if (open) opened.add(w.data);
  else opened.delete(w.data);
  const openedWeeks = [...opened].sort((a, b) => a - b);
  await tx
    .insert(unlockPolicy)
    .values({ classroomId: classId, enabled: true, defaultRule: DEFAULT_RULE, openedWeeks, updatedBy: viewer.id })
    .onConflictDoUpdate({ target: unlockPolicy.classroomId, set: { openedWeeks, updatedAt: new Date(), updatedBy: viewer.id } });
  await audit(tx, viewer.id, open ? "unlock.week.open" : "unlock.week.close", classId, { week: w.data });
  return ok(null, open ? `เปิดสัปดาห์ที่ ${w.data} ให้ทั้งห้องแล้ว` : `ยกเลิกการเปิดสัปดาห์ที่ ${w.data} ให้ทั้งห้องแล้ว`);
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

const questionSchema = z.object({
  id: z.string().max(40).optional(),
  week: z.coerce.number().int().min(1).max(TOTAL_WEEKS),
  type: z.enum(["mcq", "tf", "numeric"]),
  bloom: z.enum(["remember", "understand", "apply", "analyze", "evaluate"]),
  objective: z.string().max(40).nullable(),
  stem: z.string().max(4000),
  choices: z.array(z.object({ id: z.enum(["a", "b", "c", "d"]), text: z.string().max(1000) })).nullable(),
  answer: z.string().max(64),
  tolerance: z.coerce.number().min(0).max(1).nullable(),
  unit: z.string().max(20).nullable(),
  explanation: z.string().max(4000),
  feedback: z.record(z.string(), z.string().max(1000)).nullable(),
  active: z.boolean(),
});

export async function saveQuestion(tx: Tx, viewer: Viewer, input: z.input<typeof questionSchema>): Promise<Result<{ id: string }>> {
  if (!isStaff(viewer)) return fail("เฉพาะครูหรือผู้ดูแลระบบเท่านั้นที่แก้ไขคลังข้อสอบได้");
  const p = questionSchema.safeParse(input);
  if (!p.success) return fail("ข้อมูลข้อสอบไม่ครบหรือยาวเกินไป กรุณาตรวจสอบอีกครั้ง");
  const d = p.data;
  const choices = d.type === "mcq" ? d.choices : null;
  const err = validateQuestion({ type: d.type, stem: d.stem, choices, answer: d.answer, explanation: d.explanation });
  if (err) return fail(err);
  const feedback = d.type === "mcq" && d.feedback ? Object.fromEntries(Object.entries(d.feedback).filter(([k, v]) => ["a", "b", "c", "d"].includes(k) && v.trim() && k !== d.answer)) : null;
  const values = {
    week: d.week,
    type: d.type,
    bloom: d.bloom,
    objective: d.objective?.trim() || null,
    stem: d.stem.trim(),
    choices: choices?.map((c) => ({ id: c.id, text: c.text.trim() })) ?? null,
    answer: d.answer.trim(),
    tolerance: d.type === "numeric" ? d.tolerance : null,
    unit: d.type === "numeric" ? d.unit?.trim() || null : null,
    explanation: d.explanation.trim(),
    feedback,
    active: d.active,
    editedAt: new Date(),
    editedBy: viewer.id,
  };
  if (d.id) {
    const [q] = await tx.select({ id: question.id }).from(question).where(eq(question.id, d.id));
    if (!q) return fail("ไม่พบข้อสอบนี้");
    await tx.update(question).set(values).where(eq(question.id, d.id));
    await audit(tx, viewer.id, "question.edit", d.id);
    return ok({ id: d.id }, "บันทึกการแก้ไขข้อสอบแล้ว (การ seed เนื้อหาใหม่จะไม่ทับข้อสอบที่แก้ไขแล้ว)");
  }
  const id = `W${String(d.week).padStart(2, "0")}-T${randomCode(6)}`;
  await tx.insert(question).values({ id, source: "teacher", ...values });
  await audit(tx, viewer.id, "question.create", id);
  return ok({ id }, `เพิ่มข้อสอบใหม่ ${id} แล้ว`);
}

// ---------------------------------------------------------------------------
// Class management (teachers & admins)
// ---------------------------------------------------------------------------

export interface Credential {
  username: string;
  name: string;
  studentNo: string | null;
  password: string;
}

export async function bulkCreateStudents(tx: Tx, viewer: Viewer, classId: string, text: string): Promise<Result<{ created: Credential[]; errors: string[] }>> {
  if (!(await viewerCanManageClass(tx, viewer, classId))) return fail(NO_CLASS);
  const lines = parseBulkLines(text);
  if (!lines.length) return fail("กรุณาวางรายชื่อ บรรทัดละ 1 คน ในรูปแบบ username,ชื่อ-นามสกุล,เลขประจำตัว");
  if (lines.length > 200) return fail("สร้างได้ครั้งละไม่เกิน 200 บัญชี");
  const created: Credential[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    if (seen.has(l.username)) {
      errors.push(`บรรทัด ${l.line}: ชื่อผู้ใช้ “${l.username}” ซ้ำในรายการ`);
      continue;
    }
    seen.add(l.username);
    if (!USERNAME_RE.test(l.username)) {
      errors.push(`บรรทัด ${l.line}: ชื่อผู้ใช้ “${l.username}” ใช้ได้เฉพาะ a–z, 0–9, _ และ . ยาว 3–32 ตัวอักษร`);
      continue;
    }
    const password = generateTempPassword();
    const r = await createUsernameAccount(tx, { username: l.username, name: l.name, studentNo: l.studentNo, password, role: "student", mustChangePassword: true, classroomId: classId });
    if (!r.ok) errors.push(`บรรทัด ${l.line}: ${r.error}`);
    else created.push({ username: l.username, name: l.name.trim(), studentNo: l.studentNo, password });
  }
  await audit(tx, viewer.id, "class.bulk-create", classId, { created: created.length, errors: errors.length });
  return ok({ created, errors }, `สร้างบัญชีนักเรียน ${created.length} บัญชี${errors.length ? ` (ข้าม ${errors.length} บรรทัด)` : ""}`);
}

export async function addAllowlist(tx: Tx, viewer: Viewer, patternInput: string, role: Role, classId: string | null): Promise<Result> {
  if (!isStaff(viewer)) return fail("คุณไม่มีสิทธิ์ทำรายการนี้");
  const pattern = normaliseAllowPattern(patternInput);
  if (!pattern) return fail("รูปแบบอีเมลไม่ถูกต้อง ใช้อีเมลเต็ม เช่น somchai@school.ac.th หรือทั้งโดเมน เช่น *@school.ac.th");
  if (viewer.role !== "admin") {
    if (pattern.startsWith("*@")) return fail("ครูเพิ่มได้เฉพาะอีเมลรายบุคคล การอนุญาตทั้งโดเมนต้องให้ผู้ดูแลระบบทำ");
    if (role !== "student") return fail("ครูเพิ่มได้เฉพาะอีเมลของนักเรียน");
    if (!classId || !(await viewerCanManageClass(tx, viewer, classId))) return fail(NO_CLASS);
  } else if (classId) {
    const [c] = await tx.select({ id: classroom.id }).from(classroom).where(eq(classroom.id, classId));
    if (!c) return fail("ไม่พบห้องเรียนที่เลือก");
  }
  const [dup] = await tx.select({ id: allowedEmail.id }).from(allowedEmail).where(eq(allowedEmail.pattern, pattern));
  if (dup) return fail(`“${pattern}” อยู่ในรายการแล้ว`);
  await tx.insert(allowedEmail).values({ id: randomUUID(), pattern, role, classroomId: classId, createdBy: viewer.id });
  // Existing Google user with this exact e-mail: enrol now.
  if (!pattern.startsWith("*@") && classId && role === "student") {
    const [u] = await tx.select({ id: user.id }).from(user).where(eq(user.email, pattern));
    if (u) await tx.insert(enrollment).values({ classroomId: classId, userId: u.id }).onConflictDoNothing();
  }
  await audit(tx, viewer.id, "allowlist.add", pattern, { role, classId });
  return ok(null, `อนุญาต ${pattern} ให้เข้าสู่ระบบด้วย Google แล้ว`);
}

export async function removeAllowlist(tx: Tx, viewer: Viewer, id: string): Promise<Result> {
  const [row] = await tx.select().from(allowedEmail).where(eq(allowedEmail.id, id));
  if (!row) return fail("ไม่พบรายการนี้");
  if (viewer.role !== "admin") {
    if (viewer.role !== "teacher" || !row.classroomId || row.role !== "student" || !(await viewerCanManageClass(tx, viewer, row.classroomId))) return fail("คุณไม่มีสิทธิ์ลบรายการนี้");
  }
  await tx.delete(allowedEmail).where(eq(allowedEmail.id, id));
  await audit(tx, viewer.id, "allowlist.remove", row.pattern);
  return ok(null, `ลบ ${row.pattern} ออกจากรายการแล้ว`);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const requireAdmin = (v: Viewer) => (v.role === "admin" ? null : fail("เฉพาะผู้ดูแลระบบเท่านั้น"));

export async function adminCreateUser(
  tx: Tx,
  viewer: Viewer,
  input: { username: string; name: string; role: Role; studentNo?: string | null; classroomId?: string | null },
): Promise<Result<Credential>> {
  const deny = requireAdmin(viewer);
  if (deny) return deny;
  if (!["student", "teacher", "admin"].includes(input.role)) return fail("บทบาทไม่ถูกต้อง");
  const password = generateTempPassword();
  const r = await createUsernameAccount(tx, { ...input, password, mustChangePassword: true, classroomId: input.role === "student" ? input.classroomId : null });
  if (!r.ok) return r;
  if (input.role === "teacher" && input.classroomId) await tx.insert(classroomTeacher).values({ classroomId: input.classroomId, userId: r.id }).onConflictDoNothing();
  await audit(tx, viewer.id, "user.create", r.id, { role: input.role });
  return ok({ username: input.username.toLowerCase(), name: input.name, studentNo: input.studentNo ?? null, password }, "สร้างบัญชีแล้ว — รหัสผ่านชั่วคราวจะแสดงเพียงครั้งเดียว");
}

export async function adminSetRole(tx: Tx, viewer: Viewer, userId: string, role: Role): Promise<Result> {
  const deny = requireAdmin(viewer);
  if (deny) return deny;
  if (!["student", "teacher", "admin"].includes(role)) return fail("บทบาทไม่ถูกต้อง");
  if (userId === viewer.id && role !== "admin") return fail("ไม่สามารถลดสิทธิ์บัญชีของตัวเองได้ ให้ผู้ดูแลระบบคนอื่นทำแทน");
  const rows = await tx.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId)).returning({ id: user.id });
  if (!rows.length) return fail("ไม่พบผู้ใช้");
  await audit(tx, viewer.id, "user.role", userId, { role });
  return ok(null, "เปลี่ยนบทบาทแล้ว");
}

export async function adminSetDisabled(tx: Tx, viewer: Viewer, userId: string, disabled: boolean): Promise<Result> {
  const deny = requireAdmin(viewer);
  if (deny) return deny;
  if (userId === viewer.id) return fail("ไม่สามารถปิดใช้งานบัญชีของตัวเองได้");
  const rows = await tx.update(user).set({ disabled, updatedAt: new Date() }).where(eq(user.id, userId)).returning({ id: user.id });
  if (!rows.length) return fail("ไม่พบผู้ใช้");
  if (disabled) await tx.execute(sql`delete from "session" where user_id = ${userId}`);
  await audit(tx, viewer.id, disabled ? "user.disable" : "user.enable", userId);
  return ok(null, disabled ? "ปิดใช้งานบัญชีแล้ว (ออกจากระบบทุกอุปกรณ์)" : "เปิดใช้งานบัญชีแล้ว");
}

export async function adminCreateClassroom(tx: Tx, viewer: Viewer, name: string, term: string): Promise<Result<{ id: string }>> {
  const deny = requireAdmin(viewer);
  if (deny) return deny;
  const n = name.trim().slice(0, 60);
  const t = term.trim().slice(0, 20);
  if (!n || !/^[12S3]\/\d{4}$/.test(t)) return fail("กรุณาใส่ชื่อห้อง และภาคเรียนในรูปแบบ 1/2569 หรือ 2/2569");
  const id = newId();
  await tx.insert(classroom).values({ id, name: n, term: t, joinCode: randomCode(6) });
  await tx.insert(unlockPolicy).values({ classroomId: id, enabled: true, defaultRule: DEFAULT_RULE, updatedBy: viewer.id });
  await audit(tx, viewer.id, "class.create", id, { name: n, term: t });
  return ok({ id }, `สร้างห้องเรียน ${n} (${t}) แล้ว`);
}

export async function adminArchiveClassroom(tx: Tx, viewer: Viewer, classId: string, archived: boolean): Promise<Result> {
  const deny = requireAdmin(viewer);
  if (deny) return deny;
  await tx.update(classroom).set({ archived }).where(eq(classroom.id, classId));
  await audit(tx, viewer.id, archived ? "class.archive" : "class.unarchive", classId);
  return ok(null, archived ? "เก็บห้องเรียนเข้าคลังแล้ว" : "นำห้องเรียนกลับมาใช้งานแล้ว");
}

export async function adminRegenerateJoinCode(tx: Tx, viewer: Viewer, classId: string): Promise<Result> {
  const deny = requireAdmin(viewer);
  if (deny) return deny;
  await tx.update(classroom).set({ joinCode: randomCode(6) }).where(eq(classroom.id, classId));
  return ok(null, "สร้างรหัสเข้าห้องใหม่แล้ว");
}

async function findUserByUsername(tx: Tx, username: string) {
  const [u] = await tx.select({ id: user.id, role: user.role }).from(user).where(eq(user.username, username.trim().toLowerCase()));
  return u ?? null;
}

export async function adminAssignTeacher(tx: Tx, viewer: Viewer, classId: string, username: string, assign: boolean): Promise<Result> {
  const deny = requireAdmin(viewer);
  if (deny) return deny;
  const u = await findUserByUsername(tx, username);
  if (!u || u.role === "student") return fail("ไม่พบบัญชีครู/ผู้ดูแลที่มีชื่อผู้ใช้นี้");
  if (assign) await tx.insert(classroomTeacher).values({ classroomId: classId, userId: u.id }).onConflictDoNothing();
  else await tx.delete(classroomTeacher).where(and(eq(classroomTeacher.classroomId, classId), eq(classroomTeacher.userId, u.id)));
  await audit(tx, viewer.id, assign ? "class.teacher.add" : "class.teacher.remove", classId, { user: u.id });
  return ok(null, assign ? "เพิ่มครูประจำห้องแล้ว" : "นำครูออกจากห้องแล้ว");
}

export async function enrolStudents(tx: Tx, viewer: Viewer, classId: string, usernames: string[], enrol: boolean): Promise<Result<{ changed: number; notFound: string[] }>> {
  if (!(await viewerCanManageClass(tx, viewer, classId))) return fail(NO_CLASS);
  if (viewer.role !== "admin" && enrol) return fail("ครูเพิ่มนักเรียนเข้าห้องได้ด้วยการสร้างบัญชีหรือเพิ่มอีเมล Google ของห้อง การย้ายนักเรียนที่มีอยู่ต้องให้ผู้ดูแลระบบทำ");
  const names = [...new Set(usernames.map((u) => u.trim().toLowerCase()).filter(Boolean))].slice(0, 300);
  if (!names.length) return fail("กรุณาใส่ชื่อผู้ใช้อย่างน้อย 1 คน");
  const users = await tx.select({ id: user.id, username: user.username }).from(user).where(and(inArray(user.username, names), eq(user.role, "student")));
  const found = new Set(users.map((u) => u.username));
  const notFound = names.filter((n) => !found.has(n));
  if (users.length) {
    if (enrol) await tx.insert(enrollment).values(users.map((u) => ({ classroomId: classId, userId: u.id }))).onConflictDoNothing();
    else await tx.delete(enrollment).where(and(eq(enrollment.classroomId, classId), inArray(enrollment.userId, users.map((u) => u.id))));
  }
  await audit(tx, viewer.id, enrol ? "class.enrol" : "class.unenrol", classId, { count: users.length });
  return ok({ changed: users.length, notFound }, `${enrol ? "เพิ่ม" : "นำออก"}นักเรียน ${users.length} คน${notFound.length ? ` — ไม่พบ: ${notFound.join(", ")}` : ""}`);
}

/** Remove a stored file when its submission is deleted (used by admin tooling). */
export async function deleteSubmissionFile(tx: Tx, viewer: Viewer, submissionId: string): Promise<Result> {
  const deny = requireAdmin(viewer);
  if (deny) return deny;
  const [x] = await tx.select().from(submission).where(eq(submission.id, submissionId));
  if (!x) return fail("ไม่พบงาน");
  if (x.fileKey) await storage().delete(x.fileKey);
  await tx.delete(submission).where(eq(submission.id, submissionId));
  await audit(tx, viewer.id, "submission.delete", x.userId, { submission: submissionId });
  return ok(null, "ลบงานที่ส่งแล้ว");
}

