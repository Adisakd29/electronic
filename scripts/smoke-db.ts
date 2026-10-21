/**
 * Database smoke test of the main server code paths against the TEST database.
 *   npx tsx --conditions=react-server scripts/smoke-db.ts
 * (the react-server condition lets it import the better-auth instance, which is "server-only")
 *
 * Uses TEST_DATABASE_URL (default postgres://eelearn:eelearn@localhost:5432/eelearn_test).
 * WIPES all data in that database, applies migrations, then exercises:
 * accounts + sign-in, unlock rules, steps/stages, interactions, lab re-checking,
 * quiz start/resume/submit, pre-test once, assignments, grading, competency,
 * certificate, access control and staff no-op previews.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgres://eelearn:eelearn@localhost:5432/eelearn_test";
if (!/_test\b|test/.test(TEST_URL)) throw new Error("Refusing to run: TEST_DATABASE_URL must point to a test database");
process.env.DATABASE_URL = TEST_URL;
const uploadDir = mkdtempSync(path.join(tmpdir(), "eel-smoke-"));
process.env.UPLOAD_DIR = uploadDir;

let failures = 0;
let passes = 0;
function check(name: string, cond: unknown, extra?: unknown) {
  if (cond) {
    passes++;
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}`, extra ?? "");
  }
}

async function main() {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const postgres = (await import("postgres")).default;
  const { eq, sql } = await import("drizzle-orm");

  // Reset & migrate
  const admin = postgres(TEST_URL, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`);
  await migrate(drizzle(admin), { migrationsFolder: path.resolve(__dirname, "../drizzle") });
  await admin.end();

  const { db } = await import("../src/lib/db");
  const S = await import("../src/lib/db/schema");
  const acc = await import("../src/server/accounts");
  const L = await import("../src/server/core/learning");
  const P = await import("../src/server/core/progress");
  const O = await import("../src/server/core/overview");
  const ST = await import("../src/server/core/staff");
  const SA = await import("../src/server/core/staff-actions");
  const { viewerCanAccessStudent } = await import("../src/lib/access");
  const { getWeek } = await import("../src/content");
  const { seededRng } = await import("../src/lib/quiz");

  const week1 = getWeek(1)!;
  if (!week1.steps.length) throw new Error("Week 1 content is a stub; smoke test needs real week-1 content");

  // Seed week-1 questions (same mapping as scripts/seed.ts)
  await db.insert(S.question).values(
    week1.quiz.questions.map((q) => ({
      id: q.id,
      week: 1,
      type: q.type,
      bloom: q.bloom,
      objective: q.objective,
      stem: q.stem,
      figure: q.figure ? { figure: q.figure.figure, caption: q.figure.caption, alt: q.figure.alt } : null,
      choices: q.type === "mcq" ? q.choices!.map((c) => ({ id: c.id, text: c.text })) : null,
      answer: String(q.answer),
      tolerance: q.tolerance ?? null,
      unit: q.unit ?? null,
      explanation: q.explanation,
      feedback: (q.feedback as Record<string, string>) ?? null,
    })),
  );

  console.log("Accounts & auth");
  const mk = async (username: string, role: "student" | "teacher" | "admin", classroomId?: string) => {
    const r = await acc.createUsernameAccount(db, { username, name: `ผู้ใช้ ${username}`, password: "Passw0rd!x", role, mustChangePassword: false, classroomId });
    if (!r.ok) throw new Error(r.error);
    return r.id;
  };
  const classId = acc.newId();
  await db.insert(S.classroom).values({ id: classId, name: "ชฟ.1/9", term: "2/2569" });
  const teacherId = await mk("t_smoke", "teacher");
  await db.insert(S.classroomTeacher).values({ classroomId: classId, userId: teacherId });
  const otherTeacher = await mk("t_other", "teacher");
  const aId = await mk("s_alice", "student", classId);
  const bId = await mk("s_bob", "student"); // not in the class
  const adminId = await mk("a_smoke", "admin");
  const dup = await acc.createUsernameAccount(db, { username: "s_alice", name: "x", password: "Passw0rd!x", role: "student" });
  check("duplicate username rejected", !dup.ok);

  const { getAuth } = await import("../src/lib/auth");
  const auth = getAuth();
  const signIn = await auth.api.signInUsername({ body: { username: "s_alice", password: "Passw0rd!x" }, headers: new Headers() });
  check("username sign-in works with seeded credential account", Boolean(signIn?.token));
  let wrongPwRejected = false;
  try {
    await auth.api.signInUsername({ body: { username: "s_alice", password: "nope-nope" }, headers: new Headers() });
  } catch {
    wrongPwRejected = true;
  }
  check("wrong password rejected", wrongPwRejected);
  const sessionCheck = await auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${signIn.token}`, cookie: `eelearn.session_token=${signIn.token}` }) }).catch(() => null);
  void sessionCheck;
  await db.update(S.user).set({ disabled: true }).where(eq(S.user.id, bId));
  let disabledBlocked = false;
  try {
    await auth.api.signInUsername({ body: { username: "s_bob", password: "Passw0rd!x" }, headers: new Headers() });
  } catch {
    disabledBlocked = true;
  }
  check("disabled user cannot sign in", disabledBlocked);
  await db.update(S.user).set({ disabled: false }).where(eq(S.user.id, bId));
  const tmp = await SA.resetPassword(db, { id: teacherId, role: "teacher" }, aId);
  check("teacher resets own student's password", tmp.ok && tmp.data.password.length >= 8);
  const tmpOk = tmp.ok ? await auth.api.signInUsername({ body: { username: "s_alice", password: tmp.data.password }, headers: new Headers() }).then(() => true, () => false) : false;
  check("temporary password signs in", tmpOk);
  const [aliceRow] = await db.select().from(S.user).where(eq(S.user.id, aId));
  check("temporary password sets mustChangePassword", aliceRow.mustChangePassword);
  check("teacher cannot reset password of student outside class", !(await SA.resetPassword(db, { id: teacherId, role: "teacher" }, bId)).ok);

  const alice = { id: aId, role: "student" as const };
  const bob = { id: bId, role: "student" as const };
  const teacher = { id: teacherId, role: "teacher" as const };

  console.log("Unlock & learning flow (week 1)");
  let u = await P.isWeekUnlocked(db, aId, 2);
  check("week 2 locked at start with Thai reason", !u.unlocked && /สัปดาห์ที่ 1/.test(u.lockReason ?? ""), u);
  check("action in locked week rejected", !(await L.markStepComplete(db, alice, 2, "W02-S01")).ok);
  check("unknown step rejected", !(await L.markStepComplete(db, alice, 1, "W01-S99")).ok);
  check("learn stage refused before steps done", !(await L.completeStage(db, alice, 1, "learn")).ok);
  // Stage order (server-side): nothing beyond the intro is writable until the earlier stages are done.
  const early = await L.markStepComplete(db, alice, 1, week1.steps[0].id);
  check("stage order: step refused before the intro is done (Thai reason)", !early.ok && /บทนำ/.test(early.ok ? "" : early.error), early);
  check("stage order: practice interaction refused before learn", !(await L.recordInteraction(db, alice, 1, week1.practice[0], true)).ok);
  check("stage order: lab task refused before practice", !(await L.recordLabTask(db, alice, 1, week1.lab.tasks[0].id, true, "1")).ok);
  const earlyQuiz = await L.startQuiz(db, alice, 1, "post", Math.random);
  check("stage order: post-quiz refused before the lab (Thai reason lists the stages)", !earlyQuiz.ok && /ห้องทดลองเสมือน/.test(earlyQuiz.ok ? "" : earlyQuiz.error), earlyQuiz);
  const wp0 = await (await import("../src/server/core/overview")).weekProgress(db, aId, 1);
  check("weekProgress.stagesOpen = [intro] at start", JSON.stringify(wp0.stagesOpen) === JSON.stringify(["intro"]), wp0.stagesOpen);
  check("intro stage", (await L.completeStage(db, alice, 1, "intro")).ok);
  for (const s of week1.steps) await L.markStepComplete(db, alice, 1, s.id);
  check("position saved", (await L.savePosition(db, alice, 1, "learn", 3)).ok);
  check("learn stage after all steps", (await L.completeStage(db, alice, 1, "learn")).ok);

  const firstI = week1.practice[0];
  const r1 = await L.recordInteraction(db, alice, 1, firstI, false, "a");
  const r2 = await L.recordInteraction(db, alice, 1, firstI, true, "b");
  check("no first-try XP after a wrong answer", r1.ok && r2.ok && r2.data.xpAwarded === 0);
  const [ia] = await db.select().from(S.interactionAttempt).where(eq(S.interactionAttempt.interactionId, firstI));
  check("interaction counters", ia.attempts === 2 && ia.wrongAttempts === 1 && ia.correct && ia.firstTryCorrect === false && ia.lastWrong === "a", ia);
  let firstTryXp = 0;
  for (const id of week1.practice.slice(1)) {
    const r = await L.recordInteraction(db, alice, 1, id, true);
    if (r.ok) firstTryXp += r.data.xpAwarded;
  }
  check("first-try XP 5 each", firstTryXp === 5 * (week1.practice.length - 1), firstTryXp);
  const pr = await L.completeStage(db, alice, 1, "practice");
  check("practice stage awards 20 XP", pr.ok && pr.data.xpAwarded === 20, pr);
  const pr2 = await L.completeStage(db, alice, 1, "practice");
  check("practice XP idempotent", pr2.ok && pr2.data.xpAwarded === 0);

  for (const t of week1.lab.tasks) {
    if (t.kind === "numeric") {
      const bad = await L.recordLabTask(db, alice, 1, t.id, true, String(t.answer * 1.5 + 1));
      check(`lab numeric ${t.id}: client "correct" overridden by server`, bad.ok && !bad.data.correct);
      const good = await L.recordLabTask(db, alice, 1, t.id, false, String(t.answer * 1.01));
      check(`lab numeric ${t.id}: within 3 % accepted`, good.ok && good.data.correct && good.data.xpAwarded === 10);
    } else if (t.kind === "mcq") {
      const wrong = t.options.find((o) => !o.correct)!;
      const right = t.options.find((o) => o.correct)!;
      check(`lab mcq ${t.id}: wrong option`, (await L.recordLabTask(db, alice, 1, t.id, true, wrong.id)).ok);
      const g = await L.recordLabTask(db, alice, 1, t.id, false, right.id);
      check(`lab mcq ${t.id}: right option`, g.ok && g.data.correct);
    } else {
      const g = await L.recordLabTask(db, alice, 1, t.id, true);
      check(`lab state ${t.id}`, g.ok && g.data.correct);
    }
  }
  check("lab stage", (await L.completeStage(db, alice, 1, "lab")).ok);
  check("reflection saved", (await L.saveLabReflection(db, alice, 1, ["ทดสอบ"])).ok);

  console.log("Lab notebook (saveLabNotes)");
  const note = (i: number) => ({ at: "2026-01-01T00:00:00.000Z", label: `ครั้งที่ ${i}`, values: [{ k: "V", v: `${i} V` }] });
  check("notes saved", (await L.saveLabNotes(db, alice, 1, [note(1), note(2)])).ok);
  let wp = await O.weekProgress(db, aId, 1);
  check("notes round-trip (reflection kept)", wp.labNotes.length === 2 && wp.labNotes[1].label === "ครั้งที่ 2" && wp.labReflection?.[0] === "ทดสอบ", wp.labNotes);
  check("notes replaced on save", (await L.saveLabNotes(db, alice, 1, [note(3)])).ok && (await O.weekProgress(db, aId, 1)).labNotes.length === 1);
  check("max 60 rows", (await L.saveLabNotes(db, alice, 1, Array.from({ length: 60 }, (_, i) => note(i)))).ok && !(await L.saveLabNotes(db, alice, 1, Array.from({ length: 61 }, (_, i) => note(i)))).ok);
  check("malformed notes rejected", !(await L.saveLabNotes(db, alice, 1, [{ at: "x", label: "y", values: "nope" }])).ok);
  check("staff saveLabNotes is a no-op", (await L.saveLabNotes(db, teacher, 1, [note(9)])).ok && (await db.select().from(S.labReflection).where(eq(S.labReflection.userId, teacherId))).length === 0);
  check("other user sees no notes", (await O.weekProgress(db, bId, 1)).labNotes.length === 0);
  wp = await O.weekProgress(db, aId, 1);
  check("alice notes isolated", wp.labNotes.length === 60);

  console.log("Quiz");
  const pre = await L.startQuiz(db, alice, 1, "pre", seededRng(1));
  check("pre-test has 5 questions", pre.ok && pre.data.questions.length === 5);
  if (pre.ok) await L.submitQuiz(db, alice, pre.data.attemptId, {});
  check("pre-test only once", !(await L.startQuiz(db, alice, 1, "pre", seededRng(2))).ok);

  const s1 = await L.startQuiz(db, alice, 1, "post", seededRng(3));
  check("post quiz draws drawCount", s1.ok && s1.data.questions.length === Math.min(week1.quiz.drawCount, week1.quiz.questions.length));
  check("answers are not sent to the client", s1.ok && !JSON.stringify(s1.data).includes('"answer"') && !JSON.stringify(s1.data).includes("explanation"));
  const s1b = await L.startQuiz(db, alice, 1, "post", seededRng(4));
  check("open attempt is resumed", s1.ok && s1b.ok && s1.data.attemptId === s1b.data.attemptId);
  if (!s1.ok) throw new Error("quiz failed to start");
  const bank = new Map(week1.quiz.questions.map((q) => [q.id, q]));
  const wrongAnswers: Record<string, string> = {};
  for (const q of s1.data.questions) wrongAnswers[q.id] = q.type === "numeric" ? "-999999" : q.type === "tf" ? (String(bank.get(q.id)!.answer) === "true" ? "false" : "true") : (["a", "b", "c", "d"].find((c) => c !== bank.get(q.id)!.answer) as string);
  check("other student cannot save into this attempt", !(await L.saveQuizAnswers(db, bob, s1.data.attemptId, wrongAnswers)).ok);
  check("other student cannot submit this attempt", !(await L.submitQuiz(db, bob, s1.data.attemptId, wrongAnswers)).ok);
  check("autosave", (await L.saveQuizAnswers(db, alice, s1.data.attemptId, wrongAnswers)).ok);
  const failRes = await L.submitQuiz(db, alice, s1.data.attemptId, {});
  check("failed attempt graded from saved answers", failRes.ok && !failRes.data.passed && failRes.data.score === 0, failRes.ok ? failRes.data.percent : failRes);
  check("feedback for chosen wrong mcq option", failRes.ok && failRes.data.items.some((i) => i.feedback));
  check("double submit rejected", !(await L.submitQuiz(db, alice, s1.data.attemptId, {})).ok);
  check("quiz stage refused before passing", !(await L.completeStage(db, alice, 1, "quiz")).ok);

  const s2 = await L.startQuiz(db, alice, 1, "post", seededRng(5));
  if (!s2.ok) throw new Error("second attempt failed");
  check("new attempt differs from previous set", JSON.stringify([...s2.data.questions.map((q) => q.id)].sort()) !== JSON.stringify(s1.data.questions.map((q) => q.id).sort()) || week1.quiz.questions.length <= week1.quiz.drawCount);
  const right: Record<string, string> = {};
  for (const q of s2.data.questions) right[q.id] = String(bank.get(q.id)!.answer);
  const passRes = await L.submitQuiz(db, alice, s2.data.attemptId, right);
  check("passing attempt: 100 %, XP 50+20", passRes.ok && passRes.data.passed && passRes.data.percent === 100 && passRes.data.xpAwarded === 70, passRes.ok ? passRes.data : passRes);
  check("achievements perfect-score + growth-mindset", passRes.ok && passRes.data.newAchievements.length >= 2, passRes.ok ? passRes.data.newAchievements : null);

  const comp = await L.completeStage(db, alice, 1, "complete");
  check("week complete → week 2 unlocked, first-week achievement", comp.ok && comp.data.weekCompleted && comp.data.nextWeekUnlocked && comp.data.newAchievements.length >= 1, comp);
  u = await P.isWeekUnlocked(db, aId, 2);
  check("week 2 now unlocked", u.unlocked);
  check("week 3 still locked", !(await P.isWeekUnlocked(db, aId, 3)).unlocked);

  console.log("Unlock policy & overrides");
  check("teacher opens week 5 for class", (await SA.setWeekOpen(db, teacher, classId, 5, true)).ok);
  check("week 5 unlocked via class", (await P.isWeekUnlocked(db, aId, 5)).unlocked);
  check("other teacher cannot change this class", !(await SA.setWeekOpen(db, { id: otherTeacher, role: "teacher" }, classId, 6, true)).ok);
  check("teacher grants individual override", (await SA.grantWeekOverride(db, teacher, aId, 9)).ok);
  check("week 9 unlocked by override", (await P.isWeekUnlocked(db, aId, 9)).unlocked);
  check("teacher cannot override student outside class", !(await SA.grantWeekOverride(db, teacher, bId, 9)).ok);
  check(
    "disable locking",
    (await SA.saveUnlockPolicy(db, teacher, classId, { enabled: false, defaultRule: {}, weekRules: {} })).ok && (await P.isWeekUnlocked(db, aId, 18)).unlocked,
  );
  await SA.saveUnlockPolicy(db, teacher, classId, { enabled: true, defaultRule: { requireLearn: true, requirePractice: true, requireLab: true, minQuizPercent: 60 }, weekRules: {} });
  check("bob (no class) uses default policy", !(await P.isWeekUnlocked(db, bId, 2)).unlocked);

  console.log("Assignments & grading");
  const act = week1.activities.find((a) => a.submit);
  if (act) {
    const fd = new FormData();
    fd.set("week", "1");
    fd.set("activityId", act.id);
    fd.set("file", new File([new TextEncoder().encode("<html>not a pdf, definitely not</html>")], "x.pdf", { type: "application/pdf" }));
    check("fake PDF rejected by magic bytes", !(await L.submitAssignment(db, alice, fd)).ok);
    fd.set("file", new File([new TextEncoder().encode("%PDF-1.7\n%smoke test file\n")], "ใบงาน.pdf", { type: "application/pdf" }));
    check("PDF accepted", (await L.submitAssignment(db, alice, fd)).ok);
    check("resubmission replaces file", (await L.submitAssignment(db, alice, fd)).ok);
    const subs = await db.select().from(S.submission).where(eq(S.submission.userId, aId));
    check("one submission row per activity", subs.length === 1 && subs[0].fileName === "ใบงาน.pdf");
    check("other teacher cannot grade", !(await SA.gradeSubmission(db, { id: otherTeacher, role: "teacher" }, subs[0].id, act.rubric.map(() => 4), "", "grade")).ok);
    check("return requires feedback", !(await SA.gradeSubmission(db, teacher, subs[0].id, [], "", "return")).ok);
    const gr = await SA.gradeSubmission(db, teacher, subs[0].id, act.rubric.map(() => 3), "ดีมาก", "grade");
    check("grade with rubric", gr.ok && gr.data.score === Math.round(act.rubric.reduce((a, r) => a + (r.weight * 3) / 4, 0) * 10) / 10, gr);
    const ov = await O.studentOverview(db, { id: aId, name: "", role: "student", username: null, email: null, image: null, mustChangePassword: false });
    check("dashboard shows graded assignment", ov.assignments.some((x) => x.activityId === act.id && x.status === "graded"));
    check("XP for good assignment", ov.gamification.xp >= 30);
    check("recent history non-empty", ov.recent.length > 0);
  } else {
    console.log("  (week 1 has no submit activity — skipped)");
  }

  console.log("Access control & staff preview");
  check("teacher can access enrolled student", await viewerCanAccessStudent(db, teacher, aId));
  check("teacher cannot access non-enrolled student", !(await viewerCanAccessStudent(db, teacher, bId)));
  check("student cannot access other student", !(await viewerCanAccessStudent(db, bob, aId)));
  check("studentDetail null for other teacher", (await ST.studentDetail(db, { id: otherTeacher, role: "teacher" }, aId)) === null);
  check("studentDetail for own teacher", (await ST.studentDetail(db, teacher, aId)) !== null);
  const before = await db.select({ n: sql<number>`count(*)::int` }).from(S.stepProgress);
  const prev = await L.markStepComplete(db, teacher, 3, getWeek(3)?.steps[0]?.id ?? "x");
  const after = await db.select({ n: sql<number>`count(*)::int` }).from(S.stepProgress);
  check("staff preview: ok without writes", (prev.ok || !getWeek(3)?.steps.length) && before[0].n === after[0].n);
  const pq = await L.startQuiz(db, teacher, 1, "post", seededRng(9));
  check("staff quiz preview", pq.ok && pq.data.attemptId === "preview");

  console.log("Teacher reports");
  const ovw = await ST.classOverview(db, classId, new Date());
  check("class overview counts", ovw.perWeek[0].completed === 1 && ovw.students.length === 1);
  const ia2 = await ST.itemAnalysis(db, classId, 1);
  check("item analysis has responses", ia2.questions.some((q) => q.attempts > 0));
  const pp = await ST.prePost(db, classId);
  check("pre vs post", pp.weeks[0].preN === 1 && pp.weeks[0].postMean === 100);
  const gb = await ST.gradebook(db, classId);
  check("gradebook rows", gb.length === 2);
  const gbHeader = gb[0] as string[];
  check("gradebook separates simulated vs practical columns", gbHeader.filter((h) => h.startsWith("จำลอง:")).length === 4 && gbHeader.filter((h) => h.startsWith("ปฏิบัติจริง:")).length === 6, gbHeader.slice(-12));
  const d1Col = gbHeader.indexOf("จำลอง: ด้าน 1 ความรู้และความเข้าใจ %");
  check("gradebook D1 % filled for alice", typeof gb[1][d1Col] === "number", gb[1][d1Col]);

  console.log("Competency profile (4 domains)");
  const CP = await import("../src/server/core/competency");
  const { computeCompetencyProfile, weekEvidenceSpec } = await import("../src/lib/competency-domains");
  const prof = await CP.competencyProfile(db, aId);
  const spec1 = weekEvidenceSpec(week1);
  const d1Items = spec1.interactions.filter((i) => i.domains.includes("d1")).length;
  // D1: 100 % quiz (weight drawCount) + practice d1 interactions: all first-try except the first practice id.
  const firstIsD1 = spec1.interactions.find((i) => i.id === firstI)?.domains.includes("d1") ?? false;
  const practiceD1 = week1.practice.filter((id) => spec1.interactions.find((i) => i.id === id)?.domains.includes("d1")).length;
  const expectedD1 = ((week1.quiz.drawCount + practiceD1 - (firstIsD1 ? 1 : 0)) / (week1.quiz.drawCount + practiceD1)) * 100;
  check("D1 percent matches hand computation", prof.simulation.d1.percent === Math.round(expectedD1 * 10) / 10 && prof.simulation.d1.evidence === week1.quiz.drawCount + practiceD1, { got: prof.simulation.d1, expectedD1, d1Items });
  const numericLab = week1.lab.tasks.filter((t) => t.kind === "numeric").length;
  check("D2 counts solved numeric lab tasks", numericLab === 0 || (prof.simulation.d2.percent != null && prof.simulation.d2.evidence >= numericLab), prof.simulation.d2);
  const stateLab = week1.lab.tasks.filter((t) => t.kind === "state").length;
  check("D3 counts state lab tasks", stateLab === 0 || prof.simulation.d3.evidence >= stateLab, prof.simulation.d3);
  check("profile matches pure computation on loaded evidence", JSON.stringify((await CP.competencyProfiles(db, [aId])).get(aId)) === JSON.stringify(prof));
  check("practical: nothing teacher-recorded yet; safety rubric from graded worksheet", prof.practical.final === null && prof.practical.competencies.every((c) => c.level === null) && (act ? prof.practical.rubricPercent === 75 : prof.practical.rubricPercent === null), prof.practical);
  check("gaps: no objective flagged (all practice answered correctly)", prof.gaps.objectives.length === 0, prof.gaps);
  const week2c = getWeek(2);
  const w2i = week2c?.interactions.find((i) => i.objective && !week2c.practice.includes(i.id) && !week2c.intro.warmup?.includes(i.id) && week2c.challenge?.interaction !== i.id);
  if (w2i) {
    check("week 2 intro (stage order) before inline interaction", (await L.completeStage(db, alice, 2, "intro")).ok);
    await L.recordInteraction(db, alice, 2, w2i.id, false, "a");
    await L.recordInteraction(db, alice, 2, w2i.id, false, "b");
    const p2 = await CP.competencyProfile(db, aId);
    check("gaps: objective flagged after 2 wrong answers without a correct one", p2.gaps.objectives.some((o) => o.week === 2 && o.objectiveId === w2i.objective && o.interactionIds.includes(w2i.id)), p2.gaps.objectives);
    await L.recordInteraction(db, alice, 2, w2i.id, true, "c");
    check("gaps: cleared after a correct answer", !(await CP.competencyProfile(db, aId)).gaps.objectives.some((o) => o.objectiveId === w2i.objective));
  }
  const empty = await CP.competencyProfile(db, bId);
  check("empty profile for a learner without evidence", Object.values(empty.simulation).every((d) => d.percent === null && d.evidence === 0) && empty.practical.rubricPercent === null);
  const bogus = computeCompetencyProfile([], { interactions: [], labTasks: [], quizBest: {}, questionResponses: [], challengeWeeks: [], submissions: [], competencies: [] });
  check("pure profile with no weeks", bogus.perWeek.length === 0);
  const detail = await ST.studentDetail(db, teacher, aId);
  check("studentDetail includes competencyProfile", JSON.stringify(detail?.competencyProfile) === JSON.stringify(await CP.competencyProfile(db, aId)));
  const ovw2 = await ST.classOverview(db, classId, new Date());
  check("classOverview has 4 domain rows", ovw2.domains.length === 4 && ovw2.domains[0].withEvidence === 1, ovw2.domains);
  const lr = await ST.labReport(db, classId, 1);
  check("labReport exposes attempts per student", lr.students[0].attempts > 0 && Object.keys(lr.students[0].attemptsByTask).length === week1.lab.tasks.length, lr.students[0]);

  console.log("Competency & certificate");
  const simBefore = JSON.stringify((await CP.competencyProfile(db, aId)).simulation);
  const c1 = await SA.saveCompetency(db, teacher, { studentId: aId, classroomId: classId, competency: 0, level: 4, score: 90, maxScore: 100, passed: true, note: null });
  check("final assessment saved (no cert yet: not all weeks done)", c1.ok && c1.data.certificate === null);
  check("issue refused while ineligible", !(await SA.issueCertificate(db, teacher, aId)).ok);
  for (let w = 1; w <= 18; w++) await db.insert(S.stageProgress).values({ userId: aId, week: w, stage: "complete" }).onConflictDoNothing();
  const c2 = await SA.saveCompetency(db, teacher, { studentId: aId, classroomId: classId, competency: 0, level: 4, score: 95, maxScore: 100, passed: true, note: "ดี" });
  check("auto-issue certificate on passing final", c2.ok && Boolean(c2.data.certificate), c2);
  const comps = await db.select().from(S.competencyAssessment).where(eq(S.competencyAssessment.userId, aId));
  check("competency upsert (one row)", comps.length === 1);
  const profAfter = await CP.competencyProfile(db, aId);
  check("profile: final assessment under practical; simulation unchanged", profAfter.practical.final?.level === 4 && profAfter.practical.final.passed === true && JSON.stringify(profAfter.simulation) === simBefore, profAfter.practical);

  console.log("Trade (แผนก) for lesson examples");
  const TR = await import("../src/server/core/track");
  check("no trade at start", JSON.stringify(await TR.trackInfo(db, aId)) === JSON.stringify({ track: null, own: null, classTrack: null }));
  check("invalid trade rejected", !(await TR.setOwnTrack(db, aId, "space")).ok);
  check("other teacher cannot set the class trade", !(await TR.setClassTrack(db, { id: otherTeacher, role: "teacher" }, classId, "auto")).ok);
  check("class teacher sets class trade", (await TR.setClassTrack(db, teacher, classId, "auto")).ok);
  check("learner follows the class trade", (await TR.trackInfo(db, aId)).track === "auto");
  check("student outside the class unaffected", (await TR.trackInfo(db, bId)).track === null);
  const own = await TR.setOwnTrack(db, aId, "hvac");
  check("own choice overrides the class", own.ok && own.data.track === "hvac" && own.data.classTrack === "auto");
  const back = await TR.setOwnTrack(db, aId, null);
  check("clearing returns to the class trade", back.ok && back.data.track === "auto" && back.data.own === null);
  check("class trade can be cleared", (await TR.setClassTrack(db, teacher, classId, "")).ok && (await TR.trackInfo(db, aId)).track === null);

  console.log("Public certificate lookup");
  const CERT = await import("../src/server/core/certificate");
  // queries.getCertificateByCode = normalizeCertificateCode + certificateByCode(db, …); queries.ts itself
  // pulls in next/navigation (via auth.ts), which does not load outside Next, so test the core directly.
  const Q = { getCertificateByCode: (c: string) => (CERT.normalizeCertificateCode(c) ? CERT.certificateByCode(db, c) : Promise.resolve(null)) };
  const certCode = c2.ok ? c2.data.certificate! : "";
  const pub = await Q.getCertificateByCode(certCode);
  check("getCertificateByCode finds issued certificate", pub?.code === certCode && pub.name === "ผู้ใช้ s_alice" && !Number.isNaN(Date.parse(pub.issuedAt)), pub);
  check("public certificate exposes only name/date/code", pub !== null && Object.keys(pub).sort().join(",") === "code,issuedAt,name", pub && Object.keys(pub));
  check("lookup tolerates lower case / spaces", (await Q.getCertificateByCode(` ${certCode.toLowerCase()} `))?.code === certCode);
  check("lookup accepts code without dashes", (await Q.getCertificateByCode(certCode.replace(/-/g, "")))?.code === certCode);
  check("malformed code rejected before query", CERT.normalizeCertificateCode("'; drop table certificate;--") === null && (await Q.getCertificateByCode("not-a-code")) === null);
  check("unknown well-formed code → null", (await Q.getCertificateByCode(certCode === "EE-AAAA-AAAA" ? "EE-BBBB-BBBB" : "EE-AAAA-AAAA")) === null);
  await db.update(S.certificate).set({ revoked: true }).where(eq(S.certificate.code, certCode));
  check("revoked certificate → null", (await Q.getCertificateByCode(certCode)) === null);
  await db.update(S.certificate).set({ revoked: false }).where(eq(S.certificate.code, certCode));

  console.log("Bulk create & allowlist");
  const bulk = await SA.bulkCreateStudents(db, teacher, classId, "s_c01,นายหนึ่ง ทดสอบ,1001\ns_c02,นางสาวสอง ทดสอบ,1002\nBAD NAME,x,1\ns_c01,dup,1");
  check("bulk create with errors reported", bulk.ok && bulk.data.created.length === 2 && bulk.data.errors.length === 2, bulk);
  check("teacher cannot add domain pattern", !(await SA.addAllowlist(db, teacher, "*@school.ac.th", "student", classId)).ok);
  check("teacher adds e-mail for own class", (await SA.addAllowlist(db, teacher, "kid@school.ac.th", "student", classId)).ok);
  check("admin adds domain", (await SA.addAllowlist(db, { id: adminId, role: "admin" }, "*@school.ac.th", "student", null)).ok);
  const m = await acc.findAllowlistMatch(db, "KID@school.ac.th");
  check("allowlist exact match preferred", m?.pattern === "kid@school.ac.th" && m.classroomId === classId);
  check("allowlist domain match", (await acc.findAllowlistMatch(db, "other@school.ac.th"))?.pattern === "*@school.ac.th");
  check("allowlist no match", (await acc.findAllowlistMatch(db, "x@gmail.com")) === null);

  console.log(`\n${passes} passed, ${failures} failed`);
  rmSync(uploadDir, { recursive: true, force: true });
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  rmSync(uploadDir, { recursive: true, force: true });
  process.exit(1);
});
