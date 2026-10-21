/**
 * better-auth server instance.
 *
 * - Username + password sign-in (accounts are created by teachers/admins; public sign-up is disabled).
 * - Google sign-in only when GOOGLE_CLIENT_ID/SECRET are set, and only for
 *   e-mails matching an `allowed_email` row (exact or `*@domain`).
 * - Disabled users cannot create sessions.
 */
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "./db";
import * as schema from "./db/schema";
import { env } from "./env";
import { findAllowlistMatch, SYNTHETIC_EMAIL_DOMAIN } from "@/server/accounts";

export const GOOGLE_NOT_ALLOWED = "GOOGLE_NOT_ALLOWED";
export const ACCOUNT_DISABLED = "ACCOUNT_DISABLED";

function build() {
  const e = env();
  const trusted = [e.appUrl, ...(e.TRUSTED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [])];
  return betterAuth({
    appName: "EE Learn 20100-1005",
    secret: e.BETTER_AUTH_SECRET,
    baseURL: e.appUrl,
    trustedOrigins: trusted,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8, maxPasswordLength: 128 },
    socialProviders: e.googleEnabled
      ? {
          google: {
            clientId: e.GOOGLE_CLIENT_ID!,
            clientSecret: e.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : {},
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "student" },
        studentNo: { type: "string", input: false, required: false },
        disabled: { type: "boolean", input: false, defaultValue: false },
        mustChangePassword: { type: "boolean", input: false, defaultValue: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 days
      updateAge: 60 * 60 * 24, // refresh daily
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/username": { window: 60, max: 10 },
        "/sign-in/social": { window: 60, max: 20 },
        "/change-password": { window: 60, max: 10 },
      },
    },
    advanced: {
      useSecureCookies: e.NODE_ENV === "production",
      cookiePrefix: "eelearn",
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const email = String(user.email ?? "").toLowerCase();
            // Accounts created by staff never go through better-auth; anything else is Google.
            if (email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)) return;
            const match = await findAllowlistMatch(db, email);
            if (!match) {
              throw APIError.from("FORBIDDEN", { code: GOOGLE_NOT_ALLOWED, message: "Google account not allowed" });
            }
            return { data: { ...user, role: match.role, mustChangePassword: false, disabled: false } };
          },
          after: async (user) => {
            const match = await findAllowlistMatch(db, String(user.email ?? ""));
            if (match?.classroomId && match.role === "student") {
              await db
                .insert(schema.enrollment)
                .values({ classroomId: match.classroomId, userId: user.id })
                .onConflictDoNothing();
            }
          },
        },
      },
      session: {
        create: {
          before: async (session, ctx) => {
            const [u] = await db
              .select({ disabled: schema.user.disabled, email: schema.user.email, role: schema.user.role })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId));
            if (!u || u.disabled) {
              throw APIError.from("FORBIDDEN", { code: ACCOUNT_DISABLED, message: "Account disabled" });
            }
            // Google sign-in of an existing user: the allowlist must still match.
            const path = ctx?.path ?? "";
            if (path.includes("/callback/") && !u.email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)) {
              const match = await findAllowlistMatch(db, u.email);
              if (!match && u.role === "student") {
                throw APIError.from("FORBIDDEN", { code: GOOGLE_NOT_ALLOWED, message: "Google account not allowed" });
              }
            }
          },
        },
      },
    },
    plugins: [username({ minUsernameLength: 3, maxUsernameLength: 32 }), nextCookies()],
  });
}

type Auth = ReturnType<typeof build>;
const g = globalThis as unknown as { __eelearnAuth?: Auth };

/** Lazily-built auth instance (env is validated on first use, not at import/build time). */
export function getAuth(): Auth {
  if (!g.__eelearnAuth) g.__eelearnAuth = build();
  return g.__eelearnAuth;
}
