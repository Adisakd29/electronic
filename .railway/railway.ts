/**
 * Railway Infrastructure as Code for the course platform.
 *
 *   npx railway config plan     # preview (read-only)
 *   npx railway config apply    # create/update the project
 *
 * Creates: PostgreSQL, the web service (Next.js) with a volume for uploaded
 * worksheets, and the variables the app needs. Things you still set by hand in
 * the Railway dashboard (see docs/DEPLOY.md): a public domain for "web",
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optional), ADMIN_USERNAME /
 * ADMIN_PASSWORD for the first admin (remove ADMIN_PASSWORD after first deploy).
 *
 * BETTER_AUTH_URL is not set here on purpose: the app uses
 * https://$RAILWAY_PUBLIC_DOMAIN when it is missing (src/lib/env.ts). Set it
 * explicitly when you use a custom domain.
 */
import { defineRailway, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway((ctx) => {
  const db = postgres("postgres");
  const uploads = volume("worksheet-uploads", { sizeMB: 5120 });

  const web = service("web", {
    build: "npm run build",
    start: "npm start",
    // Apply SQL migrations and sync the question bank (teacher edits are kept) before traffic switches.
    preDeploy: "npm run db:release",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    volumeMounts: { "/data": uploads },
    env: {
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL,
      BETTER_AUTH_SECRET: ctx.randomString("better-auth-secret", 32),
      UPLOAD_DIR: "/data/uploads",
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
      ADMIN_USERNAME: preserve(),
      ADMIN_PASSWORD: preserve(),
    },
  });

  return project("eelearn-20100-1005", { resources: [web, db, uploads] });
});
