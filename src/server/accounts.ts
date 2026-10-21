/**
 * Account helpers shared by staff actions, the seed script and better-auth hooks.
 * (No "server-only" import: also used by tsx scripts.)
 *
 * Username accounts mirror better-auth's own sign-up (see
 * node_modules/better-auth/dist/api/routes/sign-up.mjs): a `user` row plus a
 * `credential` account whose accountId = user.id and password = hashPassword(pw).
 */
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Role } from "./contracts";
import type { Tx } from "@/lib/db";
import { account, allowedEmail, enrollment, session, user } from "@/lib/db/schema";

export const SYNTHETIC_EMAIL_DOMAIN = "accounts.local";

export const USERNAME_RE = /^[a-z0-9_.]{3,32}$/;

export function syntheticEmail(username: string): string {
  return `${username.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function newId(): string {
  return randomUUID().replace(/-/g, "");
}

/** Readable temporary password, e.g. "Volt-4821-kq" (no ambiguous characters). */
export function generateTempPassword(): string {
  const words = ["Volt", "Ohm", "Watt", "Amp", "Coil", "Diode", "Relay", "Fuse", "Probe", "Lamp"];
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const w = words[randomInt(words.length)];
  const num = String(randomInt(1000, 10000));
  const tail = letters[randomInt(letters.length)] + letters[randomInt(letters.length)];
  return `${w}-${num}-${tail}`;
}

export function randomCode(len = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Match an e-mail against the allowlist: exact row first, then `*@domain`. */
export async function findAllowlistMatch(tx: Tx, email: string) {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return null;
  const domainPattern = `*@${e.slice(at + 1)}`;
  const rows = await tx
    .select()
    .from(allowedEmail)
    .where(sql`lower(${allowedEmail.pattern}) in (${e}, ${domainPattern})`);
  return rows.find((r) => r.pattern.toLowerCase() === e) ?? rows[0] ?? null;
}

export function normaliseAllowPattern(input: string): string | null {
  const p = input.trim().toLowerCase();
  if (/^\*@[a-z0-9.-]+\.[a-z]{2,}$/.test(p)) return p;
  if (/^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(p)) return p;
  return null;
}

export interface NewAccount {
  username: string;
  name: string;
  password: string;
  role: Role;
  studentNo?: string | null;
  mustChangePassword?: boolean;
  classroomId?: string | null;
}

export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export async function createUsernameAccount(tx: Tx, a: NewAccount): Promise<CreateResult> {
  const uname = a.username.trim().toLowerCase();
  if (!USERNAME_RE.test(uname)) return { ok: false, error: `ชื่อผู้ใช้ “${a.username}” ใช้ได้เฉพาะ a–z, 0–9, _ และ . ยาว 3–32 ตัวอักษร` };
  const name = a.name.trim();
  if (!name) return { ok: false, error: `กรุณาใส่ชื่อ-นามสกุลของ ${uname}` };
  if (a.password.length < 8) return { ok: false, error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" };
  const exists = await tx.select({ id: user.id }).from(user).where(eq(user.username, uname));
  if (exists.length) return { ok: false, error: `ชื่อผู้ใช้ “${uname}” มีอยู่แล้ว` };
  const id = newId();
  const hash = await hashPassword(a.password);
  await tx.insert(user).values({
    id,
    name: name.slice(0, 120),
    email: syntheticEmail(uname),
    emailVerified: false,
    username: uname,
    displayUsername: uname,
    role: a.role,
    studentNo: a.studentNo?.trim().slice(0, 32) || null,
    mustChangePassword: a.mustChangePassword ?? true,
  });
  await tx.insert(account).values({ id: newId(), accountId: id, providerId: "credential", userId: id, password: hash });
  if (a.classroomId) await tx.insert(enrollment).values({ classroomId: a.classroomId, userId: id }).onConflictDoNothing();
  return { ok: true, id };
}

/** Set a new password (temporary → must change at next sign-in). Revokes existing sessions. */
export async function setPassword(tx: Tx, userId: string, password: string, mustChange: boolean): Promise<boolean> {
  const hash = await hashPassword(password);
  const rows = await tx
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .returning({ id: account.id });
  if (!rows.length) {
    const [u] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId));
    if (!u) return false;
    await tx.insert(account).values({ id: newId(), accountId: userId, providerId: "credential", userId, password: hash });
  }
  await tx.update(user).set({ mustChangePassword: mustChange, updatedAt: new Date() }).where(eq(user.id, userId));
  await tx.delete(session).where(eq(session.userId, userId));
  return true;
}

/** Parse bulk lines `username,ชื่อ-นามสกุล,เลขประจำตัว` (tab or comma separated). */
export function parseBulkLines(text: string): { username: string; name: string; studentNo: string | null; line: number }[] {
  return text
    .split(/\r?\n/)
    .map((raw, i) => ({ raw: raw.trim(), line: i + 1 }))
    .filter((l) => l.raw && !l.raw.startsWith("#"))
    .map(({ raw, line }) => {
      const parts = raw.split(/\t|,/).map((p) => p.trim());
      return { username: (parts[0] ?? "").toLowerCase(), name: parts[1] ?? "", studentNo: parts[2] || null, line };
    });
}
