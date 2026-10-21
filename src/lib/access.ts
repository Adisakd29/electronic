/**
 * Authorisation helpers.
 *
 * Pure predicates (unit-tested in tests/unit/access.test.ts) plus small DB
 * loaders that feed them. Every teacher/admin read or write of another user's
 * data must pass through `canViewStudent` / `canManageClass`.
 *
 *   student → only their own rows
 *   teacher → students enrolled in a class they teach; only those classes
 *   admin   → everything
 */
import { and, eq, inArray } from "drizzle-orm";
import type { Role } from "@/server/contracts";
import type { Tx } from "./db";
import { classroomTeacher, enrollment } from "./db/schema";

export interface Viewer {
  id: string;
  role: Role;
}

export function isStaff(v: Viewer | null | undefined): boolean {
  return v?.role === "teacher" || v?.role === "admin";
}

/** May `viewer` read/modify data belonging to `studentId`? */
export function canViewStudent(
  viewer: Viewer,
  studentId: string,
  viewerTaughtClassIds: readonly string[],
  studentClassIds: readonly string[],
): boolean {
  if (viewer.id === studentId) return true;
  if (viewer.role === "admin") return true;
  if (viewer.role !== "teacher") return false;
  const taught = new Set(viewerTaughtClassIds);
  return studentClassIds.some((c) => taught.has(c));
}

/** Staff-only variant: teachers/admins acting on a student (never students on others). */
export function canManageStudent(
  viewer: Viewer,
  studentId: string,
  viewerTaughtClassIds: readonly string[],
  studentClassIds: readonly string[],
): boolean {
  if (!isStaff(viewer)) return false;
  return canViewStudent(viewer, studentId, viewerTaughtClassIds, studentClassIds);
}

export function canManageClass(viewer: Viewer, classId: string, viewerTaughtClassIds: readonly string[]): boolean {
  if (viewer.role === "admin") return true;
  return viewer.role === "teacher" && viewerTaughtClassIds.includes(classId);
}

/** File download rule: owner, a teacher of one of the owner's classes, or admin. */
export const canReadFile = canViewStudent;

// ---------------------------------------------------------------------------
// DB loaders
// ---------------------------------------------------------------------------

export async function taughtClassIds(tx: Tx, teacherId: string): Promise<string[]> {
  const rows = await tx.select({ id: classroomTeacher.classroomId }).from(classroomTeacher).where(eq(classroomTeacher.userId, teacherId));
  return rows.map((r) => r.id);
}

export async function enrolledClassIds(tx: Tx, userId: string): Promise<string[]> {
  const rows = await tx.select({ id: enrollment.classroomId }).from(enrollment).where(eq(enrollment.userId, userId));
  return rows.map((r) => r.id);
}

/** DB-backed check used by staff pages, actions and the file route. */
export async function viewerCanAccessStudent(tx: Tx, viewer: Viewer, studentId: string): Promise<boolean> {
  if (viewer.id === studentId || viewer.role === "admin") return true;
  if (viewer.role !== "teacher") return false;
  const [taught, enrolled] = await Promise.all([taughtClassIds(tx, viewer.id), enrolledClassIds(tx, studentId)]);
  return canViewStudent(viewer, studentId, taught, enrolled);
}

export async function viewerCanManageClass(tx: Tx, viewer: Viewer, classId: string): Promise<boolean> {
  if (viewer.role === "admin") return true;
  if (viewer.role !== "teacher") return false;
  const rows = await tx
    .select({ id: classroomTeacher.classroomId })
    .from(classroomTeacher)
    .where(and(eq(classroomTeacher.userId, viewer.id), eq(classroomTeacher.classroomId, classId)));
  return rows.length > 0;
}

/** Filter a list of student ids to those the viewer may see. */
export async function filterAccessibleStudents(tx: Tx, viewer: Viewer, studentIds: string[]): Promise<string[]> {
  if (viewer.role === "admin") return studentIds;
  if (viewer.role !== "teacher" || !studentIds.length) return studentIds.filter((id) => id === viewer.id);
  const taught = await taughtClassIds(tx, viewer.id);
  if (!taught.length) return [];
  const rows = await tx
    .select({ userId: enrollment.userId })
    .from(enrollment)
    .where(and(inArray(enrollment.userId, studentIds), inArray(enrollment.classroomId, taught)));
  const ok = new Set(rows.map((r) => r.userId));
  return studentIds.filter((id) => ok.has(id));
}
