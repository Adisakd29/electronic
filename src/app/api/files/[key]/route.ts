import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { submission } from "@/lib/db/schema";
import { viewerCanAccessStudent } from "@/lib/access";
import { isValidKey, storage } from "@/lib/storage";
import { attachment } from "@/lib/export";
import { getSessionUser } from "@/server/auth";

const INLINE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function text(status: number, msg: string) {
  return new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Download an uploaded worksheet. Allowed: the owner, a teacher of the owner's class, an admin. */
export async function GET(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const viewer = await getSessionUser();
  if (!viewer) return text(401, "กรุณาเข้าสู่ระบบก่อนเปิดไฟล์");
  if (!isValidKey(key)) return text(404, "ไม่พบไฟล์");
  const [row] = await db
    .select({ userId: submission.userId, fileName: submission.fileName, mimeType: submission.mimeType })
    .from(submission)
    .where(eq(submission.fileKey, key));
  // Same 404 for "not found" and "not allowed" so keys cannot be probed.
  if (!row || !(await viewerCanAccessStudent(db, { id: viewer.id, role: viewer.role }, row.userId))) return text(404, "ไม่พบไฟล์ หรือคุณไม่มีสิทธิ์เปิดไฟล์นี้");
  const data = await storage().get(key);
  if (!data) return text(404, "ไม่พบไฟล์ในที่จัดเก็บ");
  const mime = row.mimeType ?? "application/octet-stream";
  const download = new URL(request.url).searchParams.has("download") || !INLINE.has(mime);
  const name = row.fileName ?? key;
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": download ? attachment(name) : `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Chrome's PDF viewer does not run under a sandbox CSP; other types never execute anyway.
      ...(mime === "application/pdf" ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
    },
  });
}
