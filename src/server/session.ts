import "server-only";
import type { Actor } from "./core/learning";
import type { Role } from "./contracts";
import { getSessionUser } from "./auth";

export const SIGNED_OUT = "กรุณาเข้าสู่ระบบอีกครั้ง (เซสชันหมดอายุหรือบัญชีถูกปิดใช้งาน)";
export const NOT_ALLOWED = "คุณไม่มีสิทธิ์ทำรายการนี้";

/** Resolve the acting user for a Server Action / route handler. */
export async function getActor(roles?: Role[]): Promise<{ ok: true; actor: Actor; name: string } | { ok: false; error: string }> {
  const u = await getSessionUser();
  if (!u) return { ok: false, error: SIGNED_OUT };
  if (roles && !roles.includes(u.role)) return { ok: false, error: NOT_ALLOWED };
  return { ok: true, actor: { id: u.id, role: u.role }, name: u.name };
}

/** Thai message for unexpected failures (details go to the server log only). */
export function unexpected(e: unknown, where: string): { ok: false; error: string } {
  console.error(`[${where}]`, e instanceof Error ? e.message : e);
  return { ok: false, error: "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งครูผู้สอน" };
}

/** CSRF guard for POST route handlers: the Origin (when sent) must match the Host. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin form posts from old browsers / non-browser clients with cookies are SameSite=Lax protected
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
