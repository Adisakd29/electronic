// Student02 completes ALL of week 1 through the UI, then checks unlocks, dashboard, locks and resume.
import { week } from "../../src/content/weeks/w01.ts";
import { BASE, assert, check, finish, launch, login, mdSignature, newPage, settle, sql, squash } from "./lib.mjs";
import { answerWrong, solve } from "./interactions.mjs";
import { answerAll, submit } from "./quiz.mjs";

const SUITE = "01-student-week";
console.log(`# ${SUITE} (${BASE})`);
const byId = Object.fromEntries(week.interactions.map((i) => [i.id, i]));
const browser = await launch();
const { page, errors } = await newPage(browser);
const db = sql();
const [s02] = await db`select id from "user" where username = 'student02'`;

/** Map each visible interaction section to its definition by prompt text. */
async function sectionsWithDefs(scope, candidates) {
  const secs = scope.locator("section.ee-interaction");
  const n = await secs.count();
  const out = [];
  for (let i = 0; i < n; i++) {
    const sec = secs.nth(i);
    if (!(await sec.isVisible())) continue;
    const t = squash(await sec.innerText());
    const def = candidates.find((c) => t.includes(mdSignature(c.prompt)));
    if (def) out.push({ sec, def });
  }
  return out;
}

await login(page, "student02");

await check("stage order: the lab and quiz are closed until earlier stages are done", async () => {
  await page.goto("/learn/1/lab");
  await page.getByRole("heading", { name: "ขั้นห้องทดลองเสมือนยังไม่เปิด" }).waitFor();
  await page.getByText(/บทนำ → เรียนรู้ → ฝึกปฏิบัติเชิงโต้ตอบ/).first().waitFor();
  // the lab is reachable only through the earlier stages: the stepper has no link to it
  assert.equal(await page.locator("nav[aria-label='ขั้นตอนการเรียนสัปดาห์นี้'] a[href$='/lab']").count(), 0);
  await page.goto("/learn/1/quiz");
  await page.getByRole("heading", { name: "ขั้นแบบทดสอบยังไม่เปิด" }).waitFor();
  await page.getByRole("link", { name: "ไปทำขั้นบทนำ" }).click();
  await page.waitForURL(/\/learn\/1\/intro/);
}, page);

await check("intro: warm-ups + pre-test result shown", async () => {
  await page.goto("/learn/1");
  await page.waitForURL(/\/learn\/1\/intro/);
  await page.getByRole("heading", { name: "จุดประสงค์การเรียนรู้" }).waitFor();
  // warm-ups (not graded, but must work)
  const warm = await sectionsWithDefs(page.locator("#stage-content"), (week.intro.warmup ?? []).map((id) => byId[id]));
  assert.equal(warm.length, (week.intro.warmup ?? []).length, "warm-up interactions rendered");
  for (const { sec, def } of warm) await solve(page, sec, def);
  // pre-test (5 questions, once)
  await page.getByRole("button", { name: "เริ่มแบบทดสอบก่อนเรียน" }).click();
  const n = await answerAll(page, 1, "correct");
  assert.ok(n >= 1 && n <= 10, `pretest has ${n} questions`);
  const h = await submit(page);
  assert.match(h, /ผลแบบทดสอบก่อนเรียน/);
  await page.locator('section[aria-labelledby="quiz-review-h"]').waitFor();
}, page);

await check("intro: start learning", async () => {
  if (!/\/learn\/1\/intro/.test(page.url())) await page.goto("/learn/1/intro");
  await page.reload();
  await page.getByText(/ทำแบบทดสอบก่อนเรียนแล้ว ได้ \d+%/).waitFor();
  await page.getByRole("button", { name: "เริ่มเรียน" }).click();
  await page.waitForURL(/\/learn\/1\/learn/);
}, page);

const steps = week.steps;
const stepHeading = () => page.locator("#step-title");

async function doStep(i) {
  await stepHeading().filter({ hasText: steps[i].title }).waitFor();
  const refs = steps[i].blocks.filter((b) => b.type === "interaction").map((b) => byId[b.ref]).filter(Boolean);
  if (refs.length) {
    const found = await sectionsWithDefs(page.locator("article"), refs);
    assert.equal(found.length, refs.length, `step ${i + 1}: inline interactions rendered`);
    for (const { sec, def } of found) await solve(page, sec, def);
  }
  await page.getByRole("button", { name: "ทำขั้นนี้เสร็จแล้ว" }).click();
  await page.getByText("ทำขั้นนี้แล้ว").first().waitFor().catch(() => {});
}

await check("learn: steps 1–2 done, resume /learn goes to step 3", async () => {
  await doStep(0);
  await doStep(1);
  await stepHeading().filter({ hasText: steps[2].title }).waitFor();
  assert.match(page.url(), /step=3/);
  await page.waitForTimeout(1200); // position autosave (debounced)
  await page.goto("/learn");
  await page.waitForURL(/\/learn\/1\/learn\?step=3/);
  await stepHeading().filter({ hasText: steps[2].title }).waitFor();
}, page);

await check("learn: ?step=N restores that step", async () => {
  await page.goto("/learn/1/learn?step=5");
  await stepHeading().filter({ hasText: steps[4].title }).waitFor();
  await page.reload();
  await stepHeading().filter({ hasText: steps[4].title }).waitFor();
  await page.goto("/learn/1/learn?step=3");
  await stepHeading().filter({ hasText: steps[2].title }).waitFor();
}, page);

await check(`learn: complete all ${steps.length} steps (incl. inline interactions)`, async () => {
  for (let i = 2; i < steps.length; i++) {
    await doStep(i);
  }
  await page.getByText("เรียนครบทุกขั้นแล้ว").waitFor();
  const r = await db`select count(*)::int n from step_progress where user_id = ${s02.id} and week = 1`;
  assert.equal(r[0].n, steps.length);
}, page);

await check("practice: wrong answer shows Thai reason, then all correct", async () => {
  await page.goto("/learn/1/practice");
  await page.getByRole("heading", { name: "ฝึกปฏิบัติเชิงโต้ตอบ" }).waitFor();
  const ids = week.practice;
  let wrongDone = false;
  for (let k = 0; k < ids.length; k++) {
    await page.getByRole("navigation", { name: "เลือกข้อแบบฝึก" }).getByRole("button").nth(k).click();
    await page.getByText(`ข้อ ${k + 1} จาก ${ids.length}`).waitFor();
    const def = byId[ids[k]];
    const sec = page.locator("#stage-content section.ee-interaction").first();
    await sec.getByText(mdSignature(def.prompt).slice(0, 12), { exact: false }).first().waitFor().catch(() => {});
    if (!wrongDone && (def.kind === "mcq" || def.kind === "predict")) {
      await answerWrong(page, sec, def);
      await sec.getByRole("button", { name: /ลองอีกครั้ง|ทำนายใหม่/ }).click();
      wrongDone = true;
    }
    await solve(page, sec, def);
  }
  assert.ok(wrongDone, "exercised a wrong answer");
  await page.getByText("ทำแบบฝึกถูกครบทุกข้อแล้ว").waitFor();
  await settle(page);
  const r = await db`select count(*)::int n from stage_progress where user_id = ${s02.id} and week = 1 and stage = 'practice'`;
  assert.equal(r[0].n, 1, "practice stage recorded");
}, page);

await check("lab: numeric/mcq/state tasks via lab controls", async () => {
  await page.goto("/learn/1/lab");
  const V = page.getByLabel("แรงดัน V (Voltage) (พิมพ์ค่า)");
  const R = page.getByLabel(/ความต้านทานร่างกาย R.*\(พิมพ์ค่า\)/);
  await V.waitFor({ timeout: 30000 });
  const set = async (loc, v) => {
    await loc.click();
    await loc.fill(String(v));
    await loc.press("Enter");
    await page.waitForTimeout(250); // lab emits state debounced (150 ms)
  };
  // tasks are grouped by mission tier, so select them by id, not by position
  const taskLi = (id) => page.locator(`section[aria-labelledby="tasks-h"] li[data-task-id="${id}"]`);
  const verify = async (id) => {
    const li = taskLi(id);
    await page.waitForTimeout(400); // lab state reaches the runner debounced
    await li.getByRole("button", { name: "ตรวจสอบจากห้องทดลอง" }).click();
    await li.getByText("ทำสำเร็จ", { exact: true }).waitFor();
  };
  const numeric = async (t, v = t.answer) => {
    const li = taskLi(t.id);
    await li.locator("input").fill(String(v));
    await li.getByRole("button", { name: "ตรวจคำตอบ" }).click();
  };
  const record = () => page.getByRole("button", { name: "บันทึกจุด" }).click();

  // a state task that is NOT met must be rejected
  await set(V, 12);
  await page.waitForTimeout(400);
  const l1 = taskLi("W01-L01");
  await l1.getByRole("button", { name: "ตรวจสอบจากห้องทดลอง" }).click();
  await l1.getByText("ค่าที่ตั้งในห้องทดลองยังไม่ตรงตามภารกิจ").waitFor();

  await set(V, 230);
  await set(R, 1000);
  await verify("W01-L01");
  for (const r of [1000, 4000, 100000, 1000000]) {
    await set(R, r);
    await record();
  }
  await page.getByText("ค่า R ต่างกัน 4 ค่า").waitFor();
  await verify("W01-L03");
  // lock R = 1 kΩ and solve V for 30 mA
  await set(R, 1000);
  await page.getByText("ล็อก R → หา V").click();
  await page.getByLabel("กระแสที่ต้องการ I (mA)").fill("30");
  await page.getByRole("button", { name: "หา V" }).click();
  await page.waitForTimeout(300);
  await verify("W01-L07");
  await page.getByText("ไม่ล็อก", { exact: true }).click();
  await set(V, 230);
  await set(R, 1000000);
  await verify("W01-L09");
  // numeric: one wrong first
  const l2 = week.lab.tasks.find((t) => t.id === "W01-L02");
  await numeric(l2, 23);
  await taskLi("W01-L02").getByText("ตัวเลขยังไม่ตรง").waitFor();
  for (const t of week.lab.tasks) {
    if (t.kind === "numeric") {
      await numeric(t);
      await taskLi(t.id).getByText("ทำสำเร็จ", { exact: true }).waitFor();
    } else if (t.kind === "mcq") {
      const li = taskLi(t.id);
      await li.locator(`input[value="${t.options.find((o) => o.correct).id}"]`).check();
      await li.getByRole("button", { name: "ตรวจคำตอบ" }).click();
      await li.getByText("ทำสำเร็จ", { exact: true }).waitFor();
    }
  }
  await page.getByText(`สำเร็จ ${week.lab.tasks.length}/${week.lab.tasks.length}`).waitFor();
  await page.getByText("ทำภารกิจในห้องทดลองครบแล้ว").waitFor();
  // reflection
  await page.locator("#refl-0").fill("ความต้านทานผิวหนังลดลงเมื่อแรงดันสูง");
  await page.getByRole("button", { name: "บันทึกคำตอบ" }).click();
  await page.getByText("บันทึกคำตอบแล้ว").waitFor();
}, page);

await check("quiz: fail once (Thai feedback), then pass", async () => {
  await page.goto("/learn/1/quiz");
  await page.getByRole("button", { name: /เริ่มทำแบบทดสอบ|ทำต่อจากที่ค้างไว้/ }).click();
  await answerAll(page, 1, "wrong");
  assert.match(await submit(page), /ยังไม่ผ่านเกณฑ์/);
  const review = await page.locator('section[aria-labelledby="quiz-review-h"]').innerText();
  assert.match(review, /ตอบผิด/);
  assert.match(review, /คำตอบที่ถูก/);
  await page.getByRole("button", { name: /ทำแบบทดสอบอีกครั้ง/ }).click();
  const n = await answerAll(page, 1, "correct");
  assert.equal(n, week.quiz.drawCount);
  assert.match(await submit(page), /ผ่านแบบทดสอบ/);
  await page.getByRole("link", { name: "ไปสรุปและจบบท" }).waitFor();
}, page);

await check("complete: challenge + finish week", async () => {
  await page.goto("/learn/1/complete");
  await page.getByRole("heading", { name: /สรุปบทเรียนสัปดาห์ที่ 1/ }).waitFor();
  const ch = byId[week.challenge.interaction];
  const [{ sec }] = await sectionsWithDefs(page.locator("#stage-content"), [ch]);
  await solve(page, sec, ch);
  await page.getByText("ทำภารกิจท้าทายสำเร็จแล้ว").waitFor();
  await page.getByRole("button", { name: "จบบทเรียนสัปดาห์นี้" }).click();
  await page.getByText("เรียนจบสัปดาห์ที่ 1 แล้ว").waitFor();
  await page.getByRole("link", { name: /เรียนต่อ สัปดาห์ที่ 2/ }).waitFor();
}, page);

await check("sidebar: week 2 unlocked, week 3 locked", async () => {
  await page.goto("/learn/1/complete");
  const nav = page.getByRole("navigation", { name: "บทเรียนรายสัปดาห์" });
  await nav.getByRole("button", { name: "สัปดาห์ที่ 3 ล็อกอยู่" }).waitFor(); // sidebar data streams in
  assert.equal(await nav.getByRole("button", { name: "สัปดาห์ที่ 2 ล็อกอยู่" }).count(), 0, "week 2 still locked");
  await nav.getByRole("img", { name: "เรียนจบแล้ว" }).first().waitFor();
}, page);

await check("dashboard: progress, XP, achievement first-week", async () => {
  await page.goto("/dashboard");
  await page.getByText("ระดับของฉัน").waitFor();
  const text = await page.locator("main").innerText();
  const xp = Number((text.match(/([\d,]+)\s*XP/) ?? [])[1]?.replace(/,/g, ""));
  assert.ok(xp > 0, `XP shown: ${xp}`);
  assert.match(text, /จบแล้ว 1 จาก 18 สัปดาห์/);
  assert.match(text, /สัปดาห์ปัจจุบัน: สัปดาห์ที่ 2/);
  assert.match(text, /สัปดาห์ที่ 1\s+ระบบความปลอดภัย[^\n]*\s+เรียนจบแล้ว\s+6\/6 ขั้น/);
  // the main call-to-action continues with the current week, not the finished one
  await page.getByRole("link", { name: /เรียนต่อ สัปดาห์ที่ 2|เริ่มเรียน สัปดาห์ที่ 2/ }).waitFor();
  assert.match(text, /ก้าวแรกของช่าง/);
  const got = page.locator("h3", { hasText: "ได้รับแล้ว" }).locator("..");
  await got.getByText("ก้าวแรกของช่าง").waitFor();
  const ach = await db`select code from achievement where user_id = ${s02.id}`;
  assert.ok(ach.some((a) => a.code === "first-week"));
  const xpDb = await db`select coalesce(sum(amount),0)::int xp from xp_event where user_id = ${s02.id}`;
  assert.equal(xp, xpDb[0].xp, "dashboard XP equals DB");
}, page);

await check("week 2 opens; week 3 shows Thai lock reason", async () => {
  await page.goto("/learn/2/intro");
  await page.getByRole("heading", { name: "จุดประสงค์การเรียนรู้" }).waitFor();
  await page.goto("/learn/3/intro");
  await page.locator("#locked-h").waitFor();
  const t = await page.locator('section[aria-labelledby="locked-h"]').innerText();
  assert.match(t, /สัปดาห์ที่ 3 ยังล็อกอยู่/);
  assert.match(t.split("\n").slice(1).join(" "), /[฀-๿]{6,}/);
  console.log("    lock reason:", t.replace(/\s+/g, " ").slice(0, 160));
}, page);

await check("resume after finishing week 1: /learn goes to week 2", async () => {
  await page.goto("/learn");
  await page.waitForURL(/\/learn\/2\//);
}, page);

await check("no client-side errors", async () => {
  assert.deepEqual(errors, []);
});

await finish(SUITE, browser);
