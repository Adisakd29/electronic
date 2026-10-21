// Admin: create user, disable/enable (incl. login effect), create classroom, enrol, audit log, backup JSON.
import fs from "node:fs";
import path from "node:path";
import { OUT, assert, check, finish, launch, login, newPage, sql } from "./lib.mjs";

const SUITE = "04-admin";
console.log(`# ${SUITE}`);
const db = sql();
const stamp = Date.now().toString(36).slice(-5);
const uname = `e2e_${stamp}`;
const cname = `e2e-ห้อง${stamp}`;
await db`delete from "user" where username like 'e2e%'`;
await db`delete from classroom where name like 'e2e-%'`;

const browser = await launch();
const { page, errors } = await newPage(browser);
page.on("dialog", (d) => d.accept()); // confirm() on disable

async function submitForm(form, label) {
  await form.getByRole("button", { name: label }).click();
  const live = form.locator('div[aria-live="polite"]');
  await live.locator("*").first().waitFor({ timeout: 15000 });
  return live.innerText();
}
const formWith = (scope, btn) => scope.locator("form", { has: page.getByRole("button", { name: btn, exact: true }) });

await login(page, "admin");
let tempPassword;

await check("create a user (temporary password shown once)", async () => {
  await page.goto("/admin/users");
  const form = formWith(page, "สร้างบัญชี");
  await form.locator("#nu-username").fill(uname);
  await form.locator("#nu-name").fill("นักเรียน ทดสอบอีทูอี");
  await form.locator("#nu-role").selectOption("student");
  await form.locator("#nu-no").fill("99999");
  await submitForm(form, "สร้างบัญชี");
  await form.getByText(/^แสดงเพียงครั้งเดียว/).waitFor();
  tempPassword = (await form.locator("code").first().innerText()).trim();
  assert.ok(tempPassword.length >= 8, "temporary password");
  const [u] = await db`select role, must_change_password, disabled from "user" where username = ${uname}`;
  assert.equal(u.role, "student");
  assert.equal(u.must_change_password, true);
}, page);

await check("new user must change password on first login", async () => {
  const s = await newPage(browser);
  await s.page.goto("/login");
  await s.page.fill("#username", uname);
  await s.page.fill("#password", tempPassword);
  await s.page.click("button[type=submit]");
  await s.page.waitForURL(/\/change-password/);
  await s.ctx.close();
}, page);

const userRow = () => page.getByRole("table", { name: "ผู้ใช้" }).locator("tr", { hasText: uname });

await check("disable the user → login refused in Thai; enable again", async () => {
  await page.goto(`/admin/users?q=${uname}`);
  await submitForm(userRow().locator("form", { has: page.getByRole("button", { name: "ปิดใช้งาน" }) }), "ปิดใช้งาน");
  let [u] = await db`select disabled from "user" where username = ${uname}`;
  assert.equal(u.disabled, true);
  await page.reload();
  await userRow().getByText("ปิดใช้งาน", { exact: true }).first().waitFor();
  const s = await newPage(browser);
  await s.page.goto("/login");
  await s.page.fill("#username", uname);
  await s.page.fill("#password", tempPassword);
  await s.page.click("button[type=submit]");
  await s.page.waitForTimeout(1500);
  assert.match(new URL(s.page.url()).pathname, /^\/login/);
  const msg = await s.page.getByRole("alert").filter({ hasText: "เข้าสู่ระบบไม่สำเร็จ" }).innerText();
  assert.match(msg, /[฀-๿]/);
  console.log("    disabled-login message:", msg.replace(/\s+/g, " ").slice(-120));
  await s.ctx.close();
  await userRow().getByRole("button", { name: "เปิดใช้งาน", exact: true }).click();
  await userRow().getByText("ใช้งาน", { exact: true }).waitFor();
  [u] = await db`select disabled from "user" where username = ${uname}`;
  assert.equal(u.disabled, false);
}, page);

await check("create classroom and enrol the student", async () => {
  await page.goto("/admin/classrooms");
  const form = formWith(page, "สร้างห้องเรียน");
  await form.locator("#c-name").fill(cname);
  await form.locator("#c-term").fill("2/2569");
  await submitForm(form, "สร้างห้องเรียน");
  const [c] = await db`select id from classroom where name = ${cname}`;
  assert.ok(c, "classroom row");
  await page.reload();
  const panel = page.locator("section, div").filter({ has: page.getByText(cname, { exact: false }) }).filter({ has: page.getByRole("button", { name: "เพิ่มเข้าห้อง" }) }).last();
  const enrol = formWith(panel, "เพิ่มเข้าห้อง");
  await enrol.locator('textarea[name="usernames"]').fill(uname);
  await submitForm(enrol, "เพิ่มเข้าห้อง");
  const r = await db`select 1 from enrollment e join "user" u on u.id = e.user_id where e.classroom_id = ${c.id} and u.username = ${uname}`;
  assert.equal(r.length, 1, "enrolled");
  await page.reload();
  await page.getByText(new RegExp(`${cname}`)).first().waitFor();
}, page);

await check("audit log lists the admin actions", async () => {
  await page.goto("/admin/audit");
  const t = await page.getByRole("table", { name: "บันทึกการใช้งาน" }).innerText();
  for (const label of ["ปิดใช้งานบัญชี", "เปิดใช้งานบัญชี", "สร้างห้องเรียน", "เพิ่มนักเรียนเข้าห้อง"]) assert.ok(t.includes(label), `audit has ${label}`);
}, page);

await check("download backup JSON", async () => {
  await page.goto("/admin/backup");
  const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /ดาวน์โหลดไฟล์สำรอง/ }).click()]);
  const f = path.join(OUT, d.suggestedFilename());
  await d.saveAs(f);
  assert.match(d.suggestedFilename(), /\.json$/);
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  const s = JSON.stringify(j);
  assert.ok(s.includes(uname), "backup contains the new user");
  assert.ok(!/"password"\s*:\s*"[^"]+"/.test(s) || !s.includes("scrypt"), "no password hashes");
  console.log("    backup keys:", Object.keys(j).slice(0, 12).join(", "));
}, page);

await check("no client-side errors", async () => assert.deepEqual(errors, []));
await finish(SUITE, browser);
