// Whole course through the UI with one fresh learner (student03): weeks 1–18 in order.
// Every learn step, warm-up / inline / try-it / practice / challenge interaction, every lab task
// (state tasks by driving the lab controls), every worksheet page (uploads where required),
// the pre-test and the post-test of each week; each week must unlock the next.
//
//   npm run test:e2e -- 07                 # all 18 weeks (~40 min)
//   npm run test:e2e -- 07 --weeks 5-7     # a range; the first week is opened by a teacher override
//   E2E_WEEKS=12 node --import tsx tests/e2e/07-full-course.mjs
import fs from "node:fs";
import path from "node:path";
import { OUT, assert, check, finish, launch, login, mdSignature, newPage, sql, squash } from "./lib.mjs";
import { solve } from "./interactions.mjs";
import { answerAll, submit } from "./quiz.mjs";
import { labApi, recipes } from "./labs.mjs";

const SUITE = "07-full-course";
const STUDENT = process.env.E2E_STUDENT ?? "student03";
const [from, to] = (() => {
  const raw = process.env.E2E_WEEKS ?? process.argv.find((a, i) => process.argv[i - 1] === "--weeks") ?? "1-18";
  const m = String(raw).match(/^(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`bad --weeks ${raw}`);
  return [Number(m[1]), Number(m[2] ?? m[1])];
})();
console.log(`# ${SUITE} weeks ${from}–${to} as ${STUDENT}`);
const t0 = Date.now();
const db = sql();
const totals = { steps: 0, interactions: 0, labTasks: 0, stateTasks: 0, quizzes: 0, pretests: 0, worksheets: 0, uploads: 0, challenges: 0 };

// ---- fresh learner + (for a range) a teacher override for the first week
const [stu] = await db`select id from "user" where username = ${STUDENT}`;
const [teacher] = await db`select id from "user" where username = 'teacher'`;
for (const t of ["stage_progress", "step_progress", "interaction_attempt", "quiz_attempt", "submission", "xp_event", "achievement", "learning_position", "lab_task_result", "lab_reflection", "unlock_override", "competency_assessment", "certificate"]) {
  await db`delete from ${db(t)} where user_id = ${stu.id}`;
}
if (from > 1) await db`insert into unlock_override (user_id, week, granted_by, note) values (${stu.id}, ${from}, ${teacher.id}, 'e2e range start')`;

const pdf = path.join(OUT, "worksheet.pdf");
if (!fs.existsSync(pdf)) fs.writeFileSync(pdf, "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");

const browser = await launch();
const { page, errors } = await newPage(browser);
page.setDefaultTimeout(15000);
await login(page, STUDENT);

/** Visible interaction sections in `scope`, matched to definitions by prompt text. */
async function sectionsWithDefs(scope, candidates) {
  const secs = scope.locator("section.ee-interaction");
  const n = await secs.count();
  const out = [];
  const cands = candidates.map((c) => ({ c, sig: mdSignature(c.prompt) }));
  for (let i = 0; i < n; i++) {
    const sec = secs.nth(i);
    if (!(await sec.isVisible())) continue;
    const t = squash(await sec.innerText());
    const hit = cands.filter((x) => x.sig.length >= 4 && t.includes(x.sig)).sort((a, b) => b.sig.length - a.sig.length)[0];
    if (hit) out.push({ sec, def: hit.c });
  }
  return out;
}
/** Navigate and let the page hydrate (a click on server HTML before hydration is lost). */
const go = async (url) => {
  await page.goto(url);
  await page.waitForLoadState("networkidle").catch(() => {});
};
/** Click until `done` shows (retries a click that landed before hydration). */
async function clickUntil(btn, done, tries = 4) {
  for (let i = 0; i < tries; i++) {
    if (await btn.isVisible().catch(() => false)) {
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 5000 }).catch(() => {});
    }
    if (await done.waitFor({ timeout: 5000 }).then(() => true, () => false)) return;
    await btn.page().waitForLoadState("networkidle").catch(() => {});
  }
  // Diagnose instead of a bare timeout: an inline alert (server refusal / network) or a still-pending button.
  const alert = await btn.page().locator('[role="alert"]').allInnerTexts().catch(() => []);
  throw new Error(`"${await btn.innerText().catch(() => "?")}" did not take effect after ${tries} tries${alert.length ? `; alerts: ${alert.join(" | ").slice(0, 300)}` : ""}`);
}
const revealExamples = async (scope) => {
  const btns = scope.getByRole("button", { name: "แสดงทุกขั้น" });
  for (let k = await btns.count(); k > 0; k--) await btns.first().click();
};

async function runWeek(n) {
  const { week } = await import(`../../src/content/weeks/w${String(n).padStart(2, "0")}.ts`);
  const byId = Object.fromEntries(week.interactions.map((i) => [i.id, i]));
  const exById = Object.fromEntries(week.examples.map((e) => [e.id, e]));
  const solved = new Set();
  const W = `W${String(n).padStart(2, "0")}`;
  const solveAll = async (scope, defs) => {
    for (const { sec, def } of await sectionsWithDefs(scope, defs)) {
      await solve(page, sec, def);
      solved.add(def.id);
    }
  };

  await check(`${W} intro: unlocked, warm-ups, pre-test`, async () => {
    await go(`/learn/${n}/intro`);
    await page.getByRole("heading", { name: "จุดประสงค์การเรียนรู้" }).waitFor();
    const warm = (week.intro.warmup ?? []).map((id) => byId[id]).filter(Boolean);
    await solveAll(page.locator("#stage-content"), warm);
    for (const w of warm) assert.ok(solved.has(w.id), `warm-up ${w.id} not solved`);
    await page.getByRole("button", { name: "เริ่มแบบทดสอบก่อนเรียน" }).click();
    await answerAll(page, n, "correct");
    assert.match(await submit(page), /ผลแบบทดสอบก่อนเรียน/);
    totals.pretests++;
    await page.getByRole("button", { name: "เริ่มเรียน" }).click();
    await page.waitForURL(new RegExp(`/learn/${n}/learn`));
  }, page);

  await check(`${W} learn: ${week.steps.length} steps + inline interactions`, async () => {
    for (let i = 0; i < week.steps.length; i++) {
      const st = week.steps[i];
      await go(`/learn/${n}/learn?step=${i + 1}`);
      await page.locator("#step-title").filter({ hasText: st.title }).waitFor();
      const art = page.locator("article");
      await revealExamples(art);
      const refs = st.blocks.filter((b) => b.type === "interaction").map((b) => byId[b.ref]);
      const tries = st.blocks.filter((b) => b.type === "example").map((b) => exById[b.ref]?.tryIt).filter(Boolean).map((id) => byId[id]);
      await solveAll(art, [...refs, ...tries]);
      for (const r of [...refs, ...tries]) assert.ok(solved.has(r.id), `step ${i + 1}: ${r.id} (${r.kind}) not found/solved`);
      const done = page.getByRole("button", { name: "ทำขั้นนี้เสร็จแล้ว" });
      if (await done.isVisible()) await clickUntil(done, page.getByText("ทำขั้นนี้แล้ว").first());
      totals.steps++;
    }
    await page.getByText("เรียนครบทุกขั้นแล้ว").waitFor();
  }, page);

  await check(`${W} practice: ${week.practice.length} items + worked-example try-its`, async () => {
    await go(`/learn/${n}/practice`);
    await page.getByRole("heading", { name: "ฝึกปฏิบัติเชิงโต้ตอบ" }).waitFor();
    const nav = page.getByRole("navigation", { name: "เลือกข้อแบบฝึก" });
    for (let k = 0; k < week.practice.length; k++) {
      await nav.getByRole("button").nth(k).click();
      await page.getByText(`ข้อ ${k + 1} จาก ${week.practice.length}`).waitFor();
      const def = byId[week.practice[k]];
      await solve(page, page.locator("#stage-content section.ee-interaction").first(), def);
      solved.add(def.id);
    }
    await page.getByText("ทำแบบฝึกถูกครบทุกข้อแล้ว").waitFor();
    // worked examples with "try it yourself"
    const exSec = page.locator('section[aria-labelledby="examples-h"]');
    const tryIts = week.examples.filter((e) => e.tryIt && byId[e.tryIt]);
    if (tryIts.length) {
      const sums = exSec.locator("button[aria-expanded]");
      for (let k = 0; k < (await sums.count()); k++) if ((await sums.nth(k).getAttribute("aria-expanded")) === "false") await sums.nth(k).click();
      await revealExamples(exSec);
      await solveAll(exSec, tryIts.map((e) => byId[e.tryIt]).filter((d) => !solved.has(d.id)));
    }
  }, page);

  await check(`${W} lab: ${week.lab.tasks.length} tasks (${week.lab.lab}/${week.lab.preset ?? "default"})`, async () => {
    await go(`/learn/${n}/lab`);
    const tasks = page.locator('section[aria-labelledby="tasks-h"] li[data-task-id]');
    await tasks.first().waitFor();
    const L = labApi(page);
    await L.root.waitFor({ timeout: 30000 });
    await page.waitForTimeout(300);
    const failed = [];
    const ok = async (li) => li.getByText("ทำสำเร็จ", { exact: true }).waitFor({ timeout: 4000 }).then(() => true, () => false);
    for (let i = 0; i < week.lab.tasks.length; i++) {
      const t = week.lab.tasks[i];
      const li = page.locator(`section[aria-labelledby="tasks-h"] li[data-task-id="${t.id}"]`);
      try {
        if (t.kind === "state") {
          const r = recipes[t.id];
          if (!r) throw new Error("no recipe");
          await r(L);
          await page.waitForTimeout(350); // lab state reaches the runner debounced
          await li.getByRole("button", { name: "ตรวจสอบจากห้องทดลอง" }).click();
          totals.stateTasks++;
        } else if (t.kind === "numeric") {
          await li.locator("input").fill(String(t.answer));
          await li.getByRole("button", { name: "ตรวจคำตอบ" }).click();
        } else {
          for (const o of t.options.filter((o) => o.correct)) await li.locator(`input[value="${o.id}"]`).check();
          await li.getByRole("button", { name: "ตรวจคำตอบ" }).click();
        }
        if (!(await ok(li))) throw new Error("not accepted");
        totals.labTasks++;
      } catch (e) {
        failed.push(`${t.id} [${t.kind}${t.kind === "state" ? ` ${t.check} ${JSON.stringify(t.params ?? {})}` : ""}]: ${String(e.message).split("\n")[0]}`);
      }
    }
    assert.deepEqual(failed, [], `lab tasks failed:\n      ${failed.join("\n      ")}`);
    await page.getByText("ทำภารกิจในห้องทดลองครบแล้ว").waitFor();
    if (week.lab.reflection?.length) {
      await page.locator("#refl-0").fill("บันทึกสะท้อนคิดจากการทดลอง (e2e)");
      await page.getByRole("button", { name: "บันทึกคำตอบ" }).click();
      await page.getByText("บันทึกคำตอบแล้ว").waitFor();
    }
  }, page);

  await check(`${W} worksheets: ${week.activities.length} pages`, async () => {
    for (const a of week.activities) {
      await go(`/learn/${n}/worksheet/${encodeURIComponent(a.id)}`);
      await page.getByRole("button", { name: "พิมพ์ใบงาน" }).waitFor();
      const text = await page.locator("main").innerText();
      assert.ok(text.includes(a.title.slice(0, 12)), `${a.id} title`);
      totals.worksheets++;
      if (a.submit) {
        await page.locator("input[type=file][name=file]").setInputFiles(pdf);
        await page.getByRole("button", { name: /ส่งใบงาน|ส่งไฟล์ใหม่/ }).click();
        await page.getByText("ส่งใบงานเรียบร้อยแล้ว").waitFor();
        totals.uploads++;
      } else {
        await page.getByText("ใบงานนี้ไม่ต้องส่งไฟล์").first().waitFor();
      }
    }
  }, page);

  await check(`${W} quiz: post-test passed`, async () => {
    await go(`/learn/${n}/quiz`);
    await page.getByRole("button", { name: /เริ่มทำแบบทดสอบ|ทำต่อจากที่ค้างไว้|ทำแบบทดสอบอีกครั้ง/ }).click();
    const k = await answerAll(page, n, "correct");
    assert.equal(k, week.quiz.drawCount);
    const h = await submit(page);
    const score = await page.locator('section[aria-labelledby="quiz-result-h"]').innerText();
    assert.match(h, /ผ่านแบบทดสอบ/, score.replace(/\s+/g, " ").slice(0, 120));
    assert.match(score, /100%/, `not 100%: ${score.replace(/\s+/g, " ").slice(0, 80)}`);
    totals.quizzes++;
  }, page);

  await check(`${W} complete: challenge + finish`, async () => {
    await go(`/learn/${n}/complete`);
    await page.getByRole("heading", { name: new RegExp(`สรุปบทเรียนสัปดาห์ที่ ${n}`) }).waitFor();
    const ch = byId[week.challenge.interaction];
    await solveAll(page.locator("#stage-content"), [ch]);
    assert.ok(solved.has(ch.id), "challenge interaction not rendered");
    await page.getByText("ทำภารกิจท้าทายสำเร็จแล้ว").waitFor();
    totals.challenges++;
    await clickUntil(page.getByRole("button", { name: "จบบทเรียนสัปดาห์นี้" }), page.getByText(`เรียนจบสัปดาห์ที่ ${n} แล้ว`));
  }, page);

  await check(`${W} every interaction exercised (${week.interactions.length})`, async () => {
    const missing = week.interactions.filter((i) => !solved.has(i.id)).map((i) => `${i.id}(${i.kind})`);
    totals.interactions += solved.size;
    assert.deepEqual(missing, []);
  });

  if (n < 18) {
    await check(`${W} → week ${n + 1} unlocked`, async () => {
      await go(`/learn/${n + 1}/intro`);
      await page.getByRole("heading", { name: "จุดประสงค์การเรียนรู้" }).waitFor();
    }, page);
  } else {
    await check(`${W} last week: course-complete message`, async () => {
      await page.goto(`/learn/18/complete`);
      await page.getByText("นี่คือสัปดาห์สุดท้ายของรายวิชา").waitFor();
    }, page);
  }
}

for (let n = from; n <= to; n++) {
  const w0 = Date.now();
  await runWeek(n);
  console.log(`  — week ${n} took ${Math.round((Date.now() - w0) / 1000)} s`);
}

await check("dashboard reflects the weeks completed", async () => {
  await page.goto("/dashboard");
  await page.getByText("ระดับของฉัน").waitFor();
  const t = await page.locator("main").innerText();
  const m = t.match(/จบแล้ว (\d+) จาก 18 สัปดาห์/);
  assert.ok(m && Number(m[1]) >= to - from + 1, `dashboard: ${m?.[0]}`);
}, page);

await check("no client-side errors", async () => assert.deepEqual(errors, []));
console.log(`  totals: ${JSON.stringify(totals)}  runtime ${Math.round((Date.now() - t0) / 60000)} min`);
fs.writeFileSync(path.join(OUT, `${SUITE}-totals.json`), JSON.stringify({ from, to, ...totals, ms: Date.now() - t0 }, null, 1));
await finish(SUITE, browser);
