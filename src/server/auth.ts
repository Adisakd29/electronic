import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import type { Role, SessionUser } from "./contracts";
import { SYNTHETIC_EMAIL_DOMAIN } from "./accounts";

/**
 * Session helpers. With Cache Components, call these only inside a <Suspense>
 * boundary (or a page that has a loading.tsx).
 */

const ROLES: Role[] = ["student", "teacher", "admin"];

/** Current user or null when signed out (or disabled). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const h = await headers();
  let s: Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>;
  try {
    s = await getAuth().api.getSession({ headers: h });
  } catch {
    return null;
  }
  if (!s?.user) return null;
  const u = s.user as typeof s.user & {
    role?: string;
    username?: string | null;
    disabled?: boolean;
    mustChangePassword?: boolean;
  };
  if (u.disabled) return null;
  const role = (ROLES.includes(u.role as Role) ? u.role : "student") as Role;
  return {
    id: u.id,
    name: u.name,
    role,
    username: u.username ?? null,
    email: u.email && !u.email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`) ? u.email : null,
    image: u.image ?? null,
    mustChangePassword: Boolean(u.mustChangePassword),
  };
}

/** Where a user lands after signing in. */
export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/learn";
}

/**
 * Current user; redirects to /login when signed out, to /change-password when a
 * temporary password must be changed, and to /forbidden when the role is not allowed.
 */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    let next = "/";
    try {
      const h = await headers();
      next = h.get("x-pathname") ?? h.get("next-url") ?? "/";
    } catch {
      /* ignore */
    }
    redirect(`/login?next=${encodeURIComponent(safeNext(next) ?? "/")}`);
  }
  if (user.mustChangePassword) redirect("/change-password");
  if (roles && !roles.includes(user.role)) redirect("/forbidden");
  return user;
}

/** Only allow same-site relative paths as post-login targets. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next.startsWith("/api/") || next.startsWith("/login")) return null;
  return next.slice(0, 300);
}
