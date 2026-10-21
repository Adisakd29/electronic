/**
 * Seed the database (idempotent).
 *   npm run db:seed
 *
 * Always: upsert the question bank from src/content/weeks/wNN.ts
 *   - rows edited by a teacher (`edited_at` set) are never overwritten
 *   - content questions removed from content are deactivated
 *   - a week whose module fails to import is skipped and reported
 * Development (or SEED_DEMO=1): demo admin/teacher/students + classroom "ชฟ.1/1" (2/2569).
 * Production: optional first admin from ADMIN_USERNAME / ADMIN_PASSWORD.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import type { Week } from "../src/content/types";
import { createDb, type Db } from "../src/lib/db";
import { classroom, classroomTeacher, enrollment, question, unlockPolicy, user } from "../src/lib/db/schema";
import { DEFAULT_RULE } from "../src/lib/unlock";
import { createUsernameAccount, newId } from "../src/server/accounts";

const pad = (n: number) => String(n).padStart(2, "0");

async function loadWeek(n: number): Promise<{ week: Week | null; error?: string }> {
  try {
    const mod = (await import(`../src/content/weeks/w${pad(n)}`)) as { default?: Week; week?: Week };
    const w = mod.default ?? mod.week ?? null;
    if (!w || typeof w !== "object" || !Array.isArray(w.quiz?.questions)) return { week: null, error: "module has no valid Week export" };
    return { week: w };
  } catch (e) {
    return { week: null, error: e instanceof Error ? e.message.split("\n")[0] : String(e) };
  }
}

async function seedQuestions(db: Db) {
  const report: string[] = [];
  let total = 0;
  for (let n = 1; n <= 18; n++) {
    const { week, error } = await loadWeek(n);
    if (!week) {
      report.push(`  W${pad(n)}: SKIPPED (${error})`);
      continue;
    }
    if (week.week !== n) {
      report.push(`  W${pad(n)}: SKIPPED (week number in file is ${week.week})`);
      continue;
    }
    const qs = week.quiz.questions;
    let upserted = 0;
    for (const q of qs) {
      const row = {
        id: q.id,
        week: n,
        type: q.type,
        bloom: q.bloom,
        objective: q.objective ?? null,
        stem: q.stem,
        figure: q.figure ? { figure: q.figure.figure, caption: q.figure.caption, alt: q.figure.alt } : null,
        choices: q.type === "mcq" ? (q.choices ?? []).map((c) => ({ id: c.id, text: c.text })) : null,
        answer: String(q.answer),
        tolerance: q.type === "numeric" ? q.tolerance ?? null : null,
        unit: q.unit ?? null,
        explanation: q.explanation,
        feedback: q.feedback ? (Object.fromEntries(Object.entries(q.feedback).filter(([, v]) => v)) as Record<string, string>) : null,
        active: true,
        source: "content",
      };
      const res = await db
        .insert(question)
        .values(row)
        .onConflictDoUpdate({
          target: question.id,
          set: { ...row, id: undefined },
          setWhere: isNull(question.editedAt),
        })
        .returning({ id: question.id });
      upserted += res.length;
    }
    const ids = qs.map((q) => q.id);
    const deactivated = await db
      .update(question)
      .set({ active: false })
      .where(
        and(
          eq(question.week, n),
          eq(question.source, "content"),
          isNull(question.editedAt),
          eq(question.active, true),
          ids.length ? notInArray(question.id, ids) : sql`true`,
        ),
      )
      .returning({ id: question.id });
    total += upserted;
    const stub = week.steps.length === 0 ? " [stub content]" : "";
    report.push(`  W${pad(n)}: ${qs.length} in content, ${upserted} upserted, ${qs.length - upserted} kept (teacher-edited), ${deactivated.length} deactivated${stub}`);
  }
  console.log(`Question bank (${total} upserted):\n${report.join("\n")}`);
}

async function ensureAccount(db: Db, a: Parameters<typeof createUsernameAccount>[1]): Promise<string> {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.username, a.username));
  if (u) return u.id;
  const r = await createUsernameAccount(db, a);
  if (!r.ok) throw new Error(r.error);
  return r.id;
}

async function seedDemo(db: Db) {
  const adminId = await ensureAccount(db, { username: "admin", name: "ผู้ดูแลระบบ", password: "Admin1234!", role: "admin", mustChangePassword: false });
  const teacherId = await ensureAccount(db, { username: "teacher", name: "ครูสมชาย ใจดี", password: "Teacher1234!", role: "teacher", mustChangePassword: false });
  let [cls] = await db.select().from(classroom).where(and(eq(classroom.name, "ชฟ.1/1"), eq(classroom.term, "2/2569")));
  if (!cls) {
    [cls] = await db.insert(classroom).values({ id: newId(), name: "ชฟ.1/1", term: "2/2569", joinCode: "EE11-2569" }).returning();
  }
  await db.insert(classroomTeacher).values({ classroomId: cls.id, userId: teacherId }).onConflictDoNothing();
  await db.insert(unlockPolicy).values({ classroomId: cls.id, enabled: true, defaultRule: DEFAULT_RULE, updatedBy: adminId }).onConflictDoNothing();
  const names = ["นายกิตติ ศรีสุข", "นางสาวพิมพ์ชนก แสงทอง", "นายธนวัฒน์ มีชัย"];
  for (let i = 1; i <= 3; i++) {
    const id = await ensureAccount(db, {
      username: `student${pad(i)}`,
      name: names[i - 1],
      password: "Student1234!",
      role: "student",
      studentNo: `6900${i}`,
      mustChangePassword: false,
    });
    await db.insert(enrollment).values({ classroomId: cls.id, userId: id }).onConflictDoNothing();
  }
  console.log(
    [
      "Demo accounts (development only — change or delete before going live):",
      "  admin      / Admin1234!    (ผู้ดูแลระบบ)",
      "  teacher    / Teacher1234!  (ครูผู้สอน ห้อง ชฟ.1/1 ภาคเรียน 2/2569)",
      "  student01  / Student1234!",
      "  student02  / Student1234!",
      "  student03  / Student1234!",
    ].join("\n"),
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, sql: conn } = createDb(url, 2);
  try {
    await seedQuestions(db);
    const prod = process.env.NODE_ENV === "production";
    if (!prod || process.env.SEED_DEMO === "1") {
      await seedDemo(db);
    } else if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      await ensureAccount(db, {
        username: process.env.ADMIN_USERNAME,
        name: "ผู้ดูแลระบบ",
        password: process.env.ADMIN_PASSWORD,
        role: "admin",
        mustChangePassword: false,
      });
      console.log(`Admin account "${process.env.ADMIN_USERNAME}" ensured (password from ADMIN_PASSWORD).`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("Seed failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
