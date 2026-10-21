/**
 * Learner trade (แผนก) for lesson examples. Effective trade =
 *   the learner's own choice (user.track) → else the trade of an active class
 *   they are enrolled in (classroom.track) → else none (general examples).
 * Purely a presentation preference: it never changes content, assessment or unlocking.
 */
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { TrackId } from "@/content/types";
import { isTrackId } from "@/content/course";
import type { Tx } from "@/lib/db";
import { classroom, enrollment, user } from "@/lib/db/schema";
import { viewerCanManageClass, type Viewer } from "@/lib/access";
import type { ActionResult } from "../contracts";

export interface TrackInfo {
  /** Trade used for examples now. */
  track: TrackId | null;
  /** The learner's own choice (null = follows the class / general). */
  own: TrackId | null;
  /** Default trade of the learner's class, if any. */
  classTrack: TrackId | null;
}

export async function trackInfo(tx: Tx, userId: string): Promise<TrackInfo> {
  const [u] = await tx.select({ track: user.track }).from(user).where(eq(user.id, userId));
  const [c] = await tx
    .select({ track: classroom.track })
    .from(enrollment)
    .innerJoin(classroom, eq(classroom.id, enrollment.classroomId))
    .where(and(eq(enrollment.userId, userId), eq(classroom.archived, false), isNotNull(classroom.track)))
    .orderBy(asc(classroom.createdAt))
    .limit(1);
  const own = isTrackId(u?.track) ? u.track : null;
  const classTrack = isTrackId(c?.track) ? c.track : null;
  return { track: own ?? classTrack, own, classTrack };
}

/** Learner sets (or clears with null) their own trade. */
export async function setOwnTrack(tx: Tx, userId: string, input: unknown): Promise<ActionResult<TrackInfo>> {
  if (input !== null && !isTrackId(input)) return { ok: false, error: "ไม่พบแผนกที่เลือก กรุณาเลือกจากรายการ" };
  await tx.update(user).set({ track: input, updatedAt: new Date() }).where(eq(user.id, userId));
  return { ok: true, data: await trackInfo(tx, userId) };
}

/** Teacher of the class (or admin) sets the class default trade. */
export async function setClassTrack(tx: Tx, viewer: Viewer, classId: string, input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await viewerCanManageClass(tx, viewer, classId))) return { ok: false, error: "คุณไม่มีสิทธิ์จัดการห้องเรียนนี้" };
  const t = input === "" || input === null ? null : input;
  if (t !== null && !isTrackId(t)) return { ok: false, error: "ไม่พบแผนกที่เลือก" };
  await tx.update(classroom).set({ track: t }).where(eq(classroom.id, classId));
  return { ok: true };
}
