import { db } from "@/lib/db";
import { submitAssignment } from "@/server/core/learning";
import { getActor, sameOrigin, unexpected } from "@/server/session";

/**
 * Worksheet upload (multipart: week, activityId, file, note).
 * Same logic as the `submitAssignment` Server Action; useful because Server
 * Action bodies are limited to 1 MB unless `serverActions.bodySizeLimit` is raised.
 */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return Response.json({ ok: false, error: "คำขอไม่ถูกต้อง" }, { status: 403 });
    const a = await getActor();
    if (!a.ok) return Response.json(a, { status: 401 });
    const len = Number(request.headers.get("content-length") ?? 0);
    if (len > 11 * 1024 * 1024) return Response.json({ ok: false, error: "ไฟล์มีขนาดเกิน 10 MB กรุณาลดขนาดไฟล์แล้วส่งใหม่" }, { status: 413 });
    const form = await request.formData();
    const r = await db.transaction((tx) => submitAssignment(tx, a.actor, form));
    return Response.json(r, { status: r.ok ? 200 : 400 });
  } catch (e) {
    return Response.json(unexpected(e, "api/files POST"), { status: 500 });
  }
}
