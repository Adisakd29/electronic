/**
 * Environment validation (server only).
 *
 * Required in production:  DATABASE_URL, BETTER_AUTH_SECRET (≥ 32 chars), BETTER_AUTH_URL
 *                          (on Railway BETTER_AUTH_URL may be left unset: https://$RAILWAY_PUBLIC_DOMAIN is used)
 * Optional:                GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (enables Google sign-in),
 *                          UPLOAD_DIR (default ./.uploads — on Railway mount a volume and point here),
 *                          NEXT_PUBLIC_APP_URL, TRUSTED_ORIGINS (comma separated),
 *                          ADMIN_USERNAME / ADMIN_PASSWORD (first admin created by `npm run db:seed` in production),
 *                          SEED_DEMO=1 (create demo accounts even in production — do not use on a real site).
 *
 * Validation is lazy (first call of `env()`), so importing this module during
 * `next build` never fails; a misconfigured server fails on its first request
 * with a clear message instead of a cryptic database/auth error.
 */
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url("DATABASE_URL ต้องเป็น URL ของ PostgreSQL เช่น postgres://user:pass@host:5432/db"),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร (สร้างด้วย `openssl rand -base64 32`)"),
    BETTER_AUTH_URL: z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    TRUSTED_ORIGINS: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    UPLOAD_DIR: z.string().default("./.uploads"),
    ADMIN_USERNAME: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    SEED_DEMO: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === "production" && !v.BETTER_AUTH_URL && !v.NEXT_PUBLIC_APP_URL) {
      ctx.addIssue({ code: "custom", path: ["BETTER_AUTH_URL"], message: "ต้องตั้ง BETTER_AUTH_URL (URL สาธารณะของเว็บไซต์) ใน production" });
    }
    if (v.NODE_ENV === "production" && v.BETTER_AUTH_SECRET.startsWith("dev-secret")) {
      ctx.addIssue({ code: "custom", path: ["BETTER_AUTH_SECRET"], message: "ห้ามใช้ secret สำหรับพัฒนาใน production" });
    }
  });

export type Env = z.infer<typeof schema> & { googleEnabled: boolean; appUrl: string };

let cached: Env | null = null;

/** Read & validate env. Throws one readable error listing every problem. */
export function env(): Env {
  if (cached) return cached;
  const raw = { ...process.env };
  // Railway: fall back to the service's generated public domain when no explicit URL is set.
  if (!raw.BETTER_AUTH_URL && !raw.NEXT_PUBLIC_APP_URL && raw.RAILWAY_PUBLIC_DOMAIN) {
    raw.BETTER_AUTH_URL = `https://${raw.RAILWAY_PUBLIC_DOMAIN}`;
  }
  // Development/test convenience defaults (never in production).
  if (!isProd) {
    raw.DATABASE_URL ??= "postgres://eelearn:eelearn@localhost:5432/eelearn";
    raw.BETTER_AUTH_SECRET ??= "dev-secret-change-me-0123456789abcdef0123456789";
  }
  if (isBuild) {
    // `next build` imports server modules but never serves requests.
    raw.DATABASE_URL ??= "postgres://build:build@localhost:5432/build";
    raw.BETTER_AUTH_SECRET ??= "build-time-placeholder-secret-0123456789abcdef";
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  const v = parsed.data;
  cached = {
    ...v,
    googleEnabled: Boolean(v.GOOGLE_CLIENT_ID && v.GOOGLE_CLIENT_SECRET),
    appUrl: (v.BETTER_AUTH_URL ?? v.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  };
  return cached;
}

/** True when Google OAuth credentials are configured (safe to call anywhere on the server). */
export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Guest mode (learning without an account, progress in the browser only). On unless GUEST_MODE=off. */
export function guestModeEnabled(): boolean {
  return (process.env.GUEST_MODE ?? "on").trim().toLowerCase() !== "off";
}

/** Last week a guest may open (GUEST_MAX_WEEK, 1–18; default 18 = whole course). */
export function guestMaxWeek(): number {
  const n = Number(process.env.GUEST_MAX_WEEK ?? 18);
  return Number.isInteger(n) && n >= 1 && n <= 18 ? n : 18;
}
