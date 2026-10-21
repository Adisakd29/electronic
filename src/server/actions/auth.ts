"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getAuth, ACCOUNT_DISABLED } from "@/lib/auth";
import { googleEnabled } from "@/lib/env";
import { homeFor, getSessionUser, safeNext } from "../auth";
import type { Role } from "../contracts";
import { hit } from "../rate-limit";

export interface AuthFormState {
  error?: string;
  values?: { username?: string };
}

function errorCode(e: unknown): string {
  const body = (e as { body?: { code?: string } })?.body;
  return body?.code ?? "";
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

function allowedNext(role: Role, next: string | null): string {
  const n = safeNext(next);
  if (!n) return homeFor(role);
  if ((n.startsWith("/teacher") && role === "student") || (n.startsWith("/admin") && role !== "admin")) return homeFor(role);
  return n;
}

/** Username + password sign-in (Thai errors; redirects by role). */
export async function signInWithUsername(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || null;
  if (!username || !password) return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน", values: { username } };
  const ip = await clientIp();
  if (!hit(`login:${ip}:${username}`, 8, 5 * 60_000) || !hit(`login-ip:${ip}`, 40, 5 * 60_000)) {
    return { error: "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 5 นาทีแล้วลองใหม่ หรือติดต่อครูผู้สอนเพื่อรีเซ็ตรหัสผ่าน", values: { username } };
  }
  let role: Role = "student";
  let mustChange = false;
  try {
    const r = await getAuth().api.signInUsername({ body: { username, password, rememberMe: true }, headers: await headers() });
    const [u] = await db.select({ role: user.role, mustChangePassword: user.mustChangePassword }).from(user).where(eq(user.id, r.user.id));
    role = u?.role ?? "student";
    mustChange = Boolean(u?.mustChangePassword);
  } catch (e) {
    const code = errorCode(e);
    if (code === ACCOUNT_DISABLED) return { error: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อครูผู้สอนหรือผู้ดูแลระบบ", values: { username } };
    if (code === "USERNAME_TOO_SHORT" || code === "USERNAME_TOO_LONG" || code === "INVALID_USERNAME") {
      return { error: "ชื่อผู้ใช้ไม่ถูกต้อง (ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข _ หรือ . ยาว 3–32 ตัว)", values: { username } };
    }
    if (code === "INVALID_USERNAME_OR_PASSWORD" || code === "") {
      return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง ตรวจสอบแป้นพิมพ์ภาษา (EN) และ Caps Lock แล้วลองใหม่", values: { username } };
    }
    console.error("[signIn]", code);
    return { error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", values: { username } };
  }
  redirect(mustChange ? "/change-password" : allowedNext(role, next));
}

/** Start Google OAuth (only when configured). */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  if (!googleEnabled()) redirect("/login?error=GOOGLE_DISABLED");
  const next = safeNext(String(formData.get("next") ?? "")) ?? "";
  let url: string | undefined;
  try {
    const r = await getAuth().api.signInSocial({
      body: {
        provider: "google",
        callbackURL: `/after-login${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        errorCallbackURL: "/login",
      },
      headers: await headers(),
    });
    url = r?.url;
  } catch (e) {
    console.error("[google]", errorCode(e));
  }
  redirect(url ?? "/login?error=GOOGLE_FAILED");
}

export async function signOut(): Promise<void> {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch {
    /* already signed out */
  }
  redirect("/login?signedOut=1");
}

const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร")
  .max(128, "รหัสผ่านยาวเกินไป")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "รหัสผ่านใหม่ต้องมีทั้งตัวอักษรและตัวเลข");

export async function changePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const me = await getSessionUser();
  if (!me) redirect("/login?next=/change-password");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const p = passwordSchema.safeParse(next);
  if (!p.success) return { error: p.error.issues[0].message };
  if (next !== confirm) return { error: "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน" };
  if (next === current) return { error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" };
  if (!hit(`chpw:${me.id}`, 10, 10 * 60_000)) return { error: "ลองเปลี่ยนรหัสผ่านหลายครั้งเกินไป กรุณารอสักครู่" };
  try {
    await getAuth().api.changePassword({ body: { currentPassword: current, newPassword: next, revokeOtherSessions: true }, headers: await headers() });
  } catch (e) {
    const code = errorCode(e);
    if (code === "INVALID_PASSWORD") return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง (ถ้าครูเพิ่งรีเซ็ต ให้ใช้รหัสผ่านชั่วคราวที่ได้รับ)" };
    if (code === "CREDENTIAL_ACCOUNT_NOT_FOUND") return { error: "บัญชีนี้เข้าสู่ระบบด้วย Google จึงไม่มีรหัสผ่านให้เปลี่ยน" };
    console.error("[changePassword]", code);
    return { error: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่" };
  }
  await db.update(user).set({ mustChangePassword: false, updatedAt: new Date() }).where(eq(user.id, me.id));
  redirect(`${homeFor(me.role)}?passwordChanged=1`);
}
