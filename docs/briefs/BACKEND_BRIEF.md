# Backend & Staff-Area Brief

Role: senior full-stack engineer. Build the server side of the learning platform plus the student dashboard, teacher area and admin area. Project: `/home/claude/eelearn` (Next.js 16.4 App Router, React 19, TypeScript, Tailwind 4, Drizzle ORM + PostgreSQL, better-auth 1.7).

## Read first
1. `/home/claude/eelearn/AGENTS.md` and the bundled Next docs it points to. **This Next version differs from your training data**: `cacheComponents: true` is on (reading cookies/headers/session must happen inside `<Suspense>` or a route with `loading.tsx`; no `Date.now()/Math.random()` during prerender; `dynamic`/`revalidate` segment configs are errors; `export const instant = false` opts a segment out of instant-navigation validation), `middleware` is now `proxy`, request APIs are async. Read at least: `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`, `.../authentication.md`, `.../data-security.md`, `.../server-actions.md`, `.../forms.md`, `.../migrating-to-cache-components.md` (sections on cookies/headers/params/route handlers), `03-api-reference/03-file-conventions/route.md`, `.../loading.md`, `03-api-reference/04-functions/redirect.md`, `forbidden.md`, `unauthorized.md`.
2. Contracts you MUST implement exactly (signatures fixed, bodies are stubs): `src/server/contracts.ts`, `src/server/auth.ts`, `src/server/queries.ts`, `src/server/actions/learning.ts`.
3. DB schema: `src/lib/db/schema.ts` (you may make additive changes; keep existing names).
4. Content types & registry: `src/content/types.ts`, `src/content/course.ts`, `src/content/index.ts` (week files are being authored in parallel by others — stubs now, real data later; your code must work with any valid `Week`).
5. UI primitives to use for all pages: `src/components/ui/index.tsx` (+ design tokens in `src/app/globals.css`). Follow the existing visual language; no new colour hard-coding.
6. The client brief sections relevant to you: `/home/claude/eelearn/docs/briefs/CLIENT_BRIEF.md` §6, §7, §9, §10, §11.

## You own (create/modify only these)
- `drizzle.config.ts`, `drizzle/**` (generated SQL migrations), `scripts/migrate.ts`, `scripts/seed.ts`, `scripts/backup.ts`
- `src/lib/db/**`, `src/lib/auth.ts` (better-auth server instance), `src/lib/auth-client.ts`, `src/lib/storage.ts`, `src/lib/gamification.ts`, `src/lib/unlock.ts`, `src/lib/quiz.ts`, `src/lib/access.ts`, `src/lib/export.ts`, `src/lib/env.ts`
- `src/server/**` (implement stubs; add more action files e.g. `actions/teacher.ts`, `actions/admin.ts`)
- `src/app/api/auth/[...all]/route.ts`, `src/app/api/files/**`, `src/app/api/export/**`, `src/app/api/health/route.ts`
- `src/app/(auth)/**` (login, change-password), `src/app/(app)/dashboard/**` (student dashboard page only — the `(app)/layout.tsx` shell is owned by the UI engineer), `src/app/(staff)/**` (teacher & admin areas with their own `layout.tsx` + nav), `src/app/certificate/**`
- `src/components/staff/**`, `src/components/auth/**`
- `tests/unit/**` (vitest) and `src/lib/**/*.test.ts`
Do NOT edit: `src/content/**`, `src/labs/**`, `src/components/learn/**`, `src/components/lab/**`, `src/components/shell/**`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/learn/**`, `src/app/(app)/labs/**`, `src/app/globals.css`, `src/components/ui/index.tsx`, `package.json` (all needed deps are installed: drizzle-orm, postgres, better-auth, exceljs, zod, sonner, lucide-react, clsx, server-only; dev: drizzle-kit, tsx, vitest, dotenv). If you truly need another dependency, say so in your report instead of installing.

Others work in parallel (18 content authors, 10 lab builders, 1 learner-UI engineer). Type errors in files you don't own are not yours. **Do not run `next dev` or `next build`** (the integrator will). Verify with `npx tsc --noEmit` (filter to your paths), `npx vitest run`, and tsx scripts against the database.

## Environment
- Local Postgres running: `DATABASE_URL=postgres://eelearn:eelearn@localhost:5432/eelearn` (also `eelearn_test` for tests). `.env.local` exists (load with dotenv in scripts).
- Google OAuth credentials are empty locally: Google sign-in must be enabled only when `GOOGLE_CLIENT_ID/SECRET` are set; the login page hides the Google button otherwise.

## Requirements

### Auth & accounts (better-auth)
- `src/lib/auth.ts`: better-auth with drizzle adapter (`better-auth/adapters/drizzle`, provider "pg", map our tables), `emailAndPassword: { enabled: true, disableSignUp: true }`, `username` plugin (sign in with username + password), Google provider (conditional), `nextCookies()` plugin LAST (`better-auth/next-js`), user `additionalFields` for `role` (input: false), `studentNo`, `disabled`, `mustChangePassword`. Built-in rate limiting on. Session cookie secure in production.
- Google sign-in allowed only for e-mails matching `allowed_email` (exact or `*@domain`); new Google users get the role/classroom from the matching allowlist row. Block otherwise with a clear Thai error on the login page ("บัญชี Google นี้ยังไม่ได้รับอนุญาต กรุณาติดต่อครูผู้สอน"). Use `databaseHooks.user.create.before` (and check on sign-in for disabled users).
- Username accounts are created by teachers/admins (no public sign-up): insert user (synthetic email `<username>@accounts.local`, emailVerified false) + credential account (`providerId: "credential"`, `accountId: user.id`, `password: await hashPassword(pw)` from `better-auth/crypto`) — verify against `node_modules/better-auth/dist/api/routes/sign-up.mjs`. Temporary passwords set `mustChangePassword` → after login the user is sent to `/change-password`.
- Disabled users cannot sign in or use actions.
- `getSessionUser()` / `requireUser(roles?)`: `auth.api.getSession({ headers: await headers() })`; map to `SessionUser` (email null for `@accounts.local`). `requireUser` → `redirect("/login?next=…")` when signed out, `forbidden()` (or a Thai 403 page) when role not allowed.
- Login page: Thai, username + password form, Google button (when configured), clear errors, link "ลืมรหัสผ่าน? ติดต่อครูผู้สอนเพื่อรีเซ็ต". After login redirect by role: student → `/learn` (UI engineer builds it; it redirects to current week), teacher → `/teacher`, admin → `/admin`. Change-password page.

### Learning progress & server actions (implement contracts)
- Every action: resolve session, reject when signed out/disabled, validate inputs with zod (week 1–18, ids belong to that week's content), check the week is **unlocked** for the student (teachers/admins may preview without writes — actions return ok with no-op for staff), write only the caller's rows. Return Thai errors.
- Stage completion rules: see the doc comment in `contracts.ts`. `complete` when intro+learn+practice+lab+quiz done.
- `recordLabTask`: for `numeric`/`mcq` tasks re-check correctness on the server from content (tolerance default 0.03 relative); trust the client only for `state` tasks.
- Interactions: upsert attempts, wrongAttempts, firstTryCorrect, lastWrong.
- Positions: upsert on every `savePosition`.
- Quiz (`src/lib/quiz.ts`, pure + tested): load active questions for the week from the `question` table (seeded from content). `post`: draw `quiz.drawCount` honouring `quiz.mix` by Bloom where possible, never repeating the exact previous attempt's set when the bank allows, shuffle choice order (store in attempt). `pre`: 5 questions from remember/understand (pre-test, no pass/fail effect, once per week; may retake? no — one pre-test per week). Grade on the server (numeric with tolerance; tf; mcq). `passed = percent ≥ passPercent`. Return per-item explanation + feedback for the chosen wrong option. Resume an open (unsubmitted) attempt. Max 1 open attempt per kind/week. Randomness must happen in the action (request time), not during prerender.
- Unlock (`src/lib/unlock.ts`, pure + tested): week 1 always unlocked. Week n unlocked if policy disabled, or n in `openedWeeks`, or an individual override exists, or week n−1 satisfies the rule (`weekRules[n]` or `defaultRule`). A student in several classes: unlocked if any class policy unlocks. No class → built-in default (enabled; requireLearn, requirePractice true; requireLab true; requireAssignments false; minQuizPercent 60). `lockReason` explains in Thai exactly what is missing.
- Assignments: `submitAssignment` stores the file via `src/lib/storage.ts` (local disk under `UPLOAD_DIR`, random key, size ≤ 10 MB, allowed types pdf/jpg/png/webp/heic/docx — check magic bytes), replaces previous file for the same activity (keep status "submitted" again), only for activities with `submit: true`. Files served only through `/api/files/[key]` with authorization (owner, teacher of a class the owner is enrolled in, admin). Storage adapter interface so S3-compatible storage can be added later (document).
- Gamification (`src/lib/gamification.ts`, pure rules + DB award helper): XP only for demonstrated learning, idempotent by `ref`: interaction correct on first try 5 · practice stage 20 · lab task correct 10 · lab stage 30 · quiz passed 50 (+20 if ≥ 90%, only first pass per week) · weekly challenge 40 · assignment graded level ≥ 3 average 30 · week complete 25. No XP for page views/time/clicks. Levels with Thai names (e.g. ช่างฝึกหัด → ช่างผู้ช่วย → ช่างเทคนิค → ช่างชำนาญการ → ผู้เชี่ยวชาญ) by XP thresholds. Achievements (code, Thai title + description, condition): `first-week` (complete week 1), `safety-champion` (W1 & W2 quiz ≥ 90%), `circuit-analyst` (W3, W4, W5 complete with quiz ≥ 80%), `component-expert` (W7–W10 & W13 quiz ≥ 80%), `measurement-specialist` (W17 & W18 complete + multimeter & oscilloscope labs complete), `electronics-explorer` (complete all distinct labs at least once), `troubleshooter` (W15 lab complete), `perfect-score` (any post-quiz 100%), `growth-mindset` (pass a quiz after a failed attempt), `course-graduate` (all 18 weeks complete). Evaluate after relevant actions; return newly earned titles.
- Certificate of Completion: eligible when all 18 weeks complete **and** a final competency assessment (competency 0) passed. Teacher issues (button on student page) or auto-issue when the teacher records the passing final assessment. `/certificate/[code]`: public printable certificate page (A4 landscape print CSS) with course name/code, student name, date, verification code; plus `/certificate/verify` form. Students see their certificate link on the dashboard.

### Student dashboard `/dashboard` (inside the `(app)` shell)
Current week + continue button (resume position), overall progress, per-week status grid (18 weeks, unlocked/locked with reason, stages done, best quiz), XP/level/achievements (earned + locked with how to earn), assignments to submit/returned/graded with feedback, quiz history (pre vs post per week), recent learning history, certificate link. Empty states that tell the learner what to do next.

### Teacher area `/teacher` (role teacher or admin; teachers see ONLY classes they teach)
- Overview: class picker (classroom + term), counts started/completed per week (simple SVG bar chart using tokens), class average, students needing attention (inactive 7 days, failed quiz twice, overdue assignments).
- Students: table (name, student no., current week, progress %, avg quiz, last active) → student detail: per-week stages, quiz attempts (pre/post scores), lab task results, interaction errors, submissions, competency results, XP/achievements; actions: unlock week for this student (override), reset password (generates temporary password shown once), issue certificate.
- Item analysis per week: each quiz question (% correct, attempts, most common wrong choice) and each interaction (% wrong attempts, last wrong answers) sorted by difficulty — "คำถามที่นักเรียนตอบผิดบ่อย".
- Pre vs post: per week class mean pre-test vs post-test (best) and per student gain.
- Labs: per week lab task completion rates and per student status.
- Submissions: queue by week/status; view file; grade with the activity's rubric from content (levels 1–4 per criterion × weight → score), feedback text, return for revision.
- Competency assessment: matrix students × competencies 1–4 + final (0); enter level 1–4, score, pass, note (W18 final practical assessment uses this).
- Unlock settings per class: enable/disable locking, default rule editor, per-week rule overrides, "open week for whole class", individual overrides list.
- Question bank editor: list by week with filters; edit stem/choices/answer/explanation/feedback/bloom/active; add new question (source "teacher"); validation (4 choices, answer present); preview with KaTeX via a simple Markdown renderer (you may import `src/components/learn/Markdown.tsx` if it exists at integration time; otherwise render plain text and note it).
- Exports: CSV and Excel (exceljs) gradebook per class: student no., name, per-week completion, pre/post quiz %, lab completion, assignment scores, competency levels, XP; plus item-analysis export. UTF-8 with BOM for CSV so Excel shows Thai.
- Class management for teachers: create student accounts in bulk for their class (paste lines `username,ชื่อ-นามสกุล,เลขประจำตัว` → temporary passwords shown once + downloadable CSV), add allowlisted Google e-mails for their class.

### Admin area `/admin` (role admin)
Users (search, create teacher/student/admin, change role, disable/enable, reset password), classrooms (create/archive, term, assign teachers, enrol/unenrol students, join code), Google allowlist (emails and `*@domain`, role, default class), backup (download full JSON export of course data via route handler; restore instructions; `scripts/backup.ts` wraps `pg_dump` with a timestamped file), audit log view (last 200 actions), system info (counts, content validation summary: weeks with stub content).

### Seed (`npm run db:seed`, idempotent)
- Upsert questions from `src/content/index.ts` for every week (skip rows with `editedAt` set; deactivate content questions removed from content).
- Create in development only (or when `SEED_DEMO=1`): admin `admin`/`Admin1234!`, teacher `teacher`/`Teacher1234!`, classroom "ชฟ.1/1" term "2/2569", students `student01..03` / `Student1234!` (mustChangePassword false for demo), unlock policy default. Print the credentials. In production seed only questions + optional first admin from env (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).
- `scripts/migrate.ts` runs drizzle migrations (`drizzle-orm/postgres-js/migrator`). Generate the initial migration with `npx drizzle-kit generate`.

### Security & privacy checklist (must hold)
Students can never read/modify another student's data (verify in code paths + a unit test of `src/lib/access.ts`). Teachers only their classes. All mutations are Server Actions or POST route handlers that re-check the session. No secrets or PII in cache keys. File downloads authorised. Don't log passwords. Minimal PII. Thai, actionable error messages; a friendly 403/404.

### Tests
vitest unit tests for unlock rules, quiz selection/grading/mix/tolerance, gamification levels & achievements, access helpers, storage file-type sniffing. A script `scripts/smoke-db.ts` that exercises the main actions' DB functions against `eelearn_test` (create users, progress, quiz attempt, unlock) — run it.

## Report (≤ 20 lines)
What works, how you verified it, test results, any deviations from contracts (should be none), known gaps, and anything the integrator must do (e.g. env vars).
