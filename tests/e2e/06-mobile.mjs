// 360×760 phone: week-1 learn stage (every step) and quiz must not overflow horizontally.
import { week } from "../../src/content/weeks/w01.ts";
import { MOBILE, assert, check, finish, hOverflow, launch, login, newPage, sql } from "./lib.mjs";
import { answerAll, submit } from "./quiz.mjs";

const SUITE = "06-mobile";
console.log(`# ${SUITE}`);
const browser = await launch();
const { page, errors } = await newPage(browser, MOBILE);
// Stages open in order: give student03 the first four stages of week 1 so the learn steps and the quiz are reachable.
const db = sql();
const [s03] = await db`select id from "user" where username = 'student03'`;
for (const stage of ["intro", "learn", "practice", "lab"]) {
  await db`insert into stage_progress (user_id, week, stage) values (${s03.id}, 1, ${stage}) on conflict do nothing`;
}
await login(page, "student03");

/** Elements that stick out past the right edge of the viewport (for diagnostics). */
const culprits = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(e).position !== "fixed";
      })
      .slice(0, 5)
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)} → ${Math.round(e.getBoundingClientRect().right)}px`),
  );

for (let i = 0; i < week.steps.length; i++) {
  await check(`learn step ${i + 1} at 360px has no horizontal overflow`, async () => {
    await page.goto(`/learn/1/learn?step=${i + 1}`);
    await page.locator("#step-title").filter({ hasText: week.steps[i].title }).waitFor();
    await page.waitForTimeout(300);
    const o = await hOverflow(page);
    assert.ok(o <= 1, `overflow ${o}px: ${(await culprits()).join(" | ")}`);
  }, page);
}

await check("scenario option buttons wrap on a phone (no overflow, clickable)", async () => {
  // W01-S06 holds scenario W01-I10 whose options are full sentences.
  await page.goto("/learn/1/learn?step=6");
  const sec = page.locator("section.ee-interaction").filter({ hasText: "ไล่ 5 สถานการณ์" }).first();
  await sec.scrollIntoViewIfNeeded();
  const opts = sec.getByRole("button");
  await opts.first().waitFor();
  // Regression: the base button style is nowrap; scenario options must wrap (W17-I35 has sentence-long options).
  for (const b of await opts.all()) {
    assert.equal(await b.evaluate((e) => getComputedStyle(e).whiteSpace), "normal", "option button wraps");
    const box = await b.boundingBox();
    assert.ok(box.x + box.width <= 361, `option button right edge ${Math.round(box.x + box.width)}px`);
  }
  const o = await hOverflow(page);
  assert.ok(o <= 1, `overflow ${o}px: ${(await culprits()).join(" | ")}`);
}, page);

await check("step list disclosure works on mobile", async () => {
  await page.getByText(/ขั้นที่ \d+ จาก \d+/).first().click();
  await page.getByRole("button", { name: new RegExp(week.steps[0].title.slice(0, 10)) }).first().click();
  await page.locator("#step-title").filter({ hasText: week.steps[0].title }).waitFor();
}, page);

await check("quiz at 360px (one-by-one, all, result) has no horizontal overflow", async () => {
  await page.goto("/learn/1/quiz");
  await page.getByRole("button", { name: /เริ่มทำแบบทดสอบ|ทำต่อจากที่ค้างไว้|ทำแบบทดสอบอีกครั้ง/ }).click();
  await page.locator("fieldset.ee-quiz-q").first().waitFor();
  let o = await hOverflow(page);
  assert.ok(o <= 1, `quiz overflow ${o}px: ${(await culprits()).join(" | ")}`);
  await answerAll(page, 1, "correct");
  o = await hOverflow(page);
  assert.ok(o <= 1, `quiz (all) overflow ${o}px: ${(await culprits()).join(" | ")}`);
  const h = await submit(page);
  assert.match(h, /ผ่านแบบทดสอบ|ยังไม่ผ่านเกณฑ์/);
  o = await hOverflow(page);
  assert.ok(o <= 1, `quiz result overflow ${o}px: ${(await culprits()).join(" | ")}`);
}, page);

await check("no client-side errors", async () => assert.deepEqual(errors, []));
await finish(SUITE, browser);
