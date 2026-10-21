// Trades (แผนก) for non-electronics learners: the learner's choice is stored on the account
// (survives another device), the class default applies when the learner has no own choice,
// and lessons show the note of that trade. Content and assessment stay the same.
import { assert, check, finish, launch, login, newPage, sql } from "./lib.mjs";

const SUITE = "10-trades";
console.log(`# ${SUITE}`);
const db = sql();
const browser = await launch();
const [s01] = await db`select id from "user" where username = 'student01'`;
const [cls] = await db`select c.id from classroom c join enrollment e on e.classroom_id = c.id where e.user_id = ${s01.id} and not c.archived limit 1`;
await db`update "user" set track = null where id = ${s01.id}`;
await db`update classroom set track = null where id = ${cls.id}`;

const noteOf = (page) => page.locator("aside.ee-track").filter({ visible: true }).first();

await check("student picks ช่างยนต์ on the dashboard; it is stored on the account", async () => {
  const { page, ctx } = await newPage(browser);
  await login(page, "student01");
  await page.goto("/dashboard");
  await page.getByLabel("ตัวอย่างจากงานแผนก").selectOption("auto");
  for (let i = 0; i < 20; i++) {
    const [u] = await db`select track from "user" where id = ${s01.id}`;
    if (u.track === "auto") break;
    await page.waitForTimeout(250);
  }
  const [u] = await db`select track from "user" where id = ${s01.id}`;
  assert.equal(u.track, "auto");
  await ctx.close();
});

await check("another device: the intro shows the ช่างยนต์ note without choosing again", async () => {
  const { page, ctx } = await newPage(browser);
  await login(page, "student01");
  await page.goto("/learn/1/intro");
  const note = noteOf(page);
  await note.waitFor();
  assert.match(await note.innerText(), /ช่างยนต์/);
  assert.equal(await page.getByLabel("ตัวอย่างจากงานแผนก").inputValue(), "auto");
  await ctx.close();
});

await check("teacher sets the class trade; a learner without an own choice follows it", async () => {
  const t = await newPage(browser);
  await login(t.page, "teacher");
  await t.page.goto(`/teacher/class?class=${cls.id}`);
  await t.page.getByLabel("แผนกของห้อง").selectOption("hvac");
  await t.page.getByRole("button", { name: "บันทึกแผนก" }).click();
  await t.page.getByText("บันทึกแผนกของห้องแล้ว").waitFor();
  await t.ctx.close();
  await db`update "user" set track = null where id = ${s01.id}`;
  const { page, ctx } = await newPage(browser);
  await login(page, "student01");
  await page.goto("/learn/1/intro");
  const note = noteOf(page);
  await note.waitFor();
  assert.match(await note.innerText(), /ช่างแอร์/);
  // the picker offers "ตามห้องเรียน (…)" as the default option
  assert.match(await page.getByLabel("ตัวอย่างจากงานแผนก").locator("option").first().innerText(), /ตามห้องเรียน/);
  await ctx.close();
});

await check("other trades' notes are one tap away", async () => {
  const { page, ctx } = await newPage(browser);
  await login(page, "student01");
  await page.goto("/learn/1/intro");
  const note = noteOf(page);
  await note.getByRole("button", { name: "ช่างคอมพิวเตอร์" }).click();
  assert.match(await note.innerText(), /ช่างคอมพิวเตอร์/);
  await ctx.close();
});

// leave the shared demo data as it was
await db`update "user" set track = null where id = ${s01.id}`;
await db`update classroom set track = null where id = ${cls.id}`;
await finish(SUITE, browser);
