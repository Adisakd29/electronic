// Access control: student01 must not reach staff pages, other students' files or exports;
// signed-out visitors are sent to /login with ?next= for account-only pages.
import fs from "node:fs";
import path from "node:path";
import { OUT, assert, check, finish, launch, login, newPage, sql } from "./lib.mjs";

const SUITE = "05-security";
console.log(`# ${SUITE}`);
const db = sql();
const browser = await launch();
const { page, errors } = await newPage(browser);
const [cls] = await db`select id from classroom where not archived and name not like 'e2e-%' limit 1`;
const keyFile = path.join(OUT, "student02-file-key.txt");
const [sub] = await db`select s.file_key from submission s join "user" u on u.id = s.user_id where u.username = 'student02' and s.file_key is not null limit 1`;
const fileKey = sub?.file_key ?? (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8").trim() : null);
const [s02] = await db`select id from "user" where username = 'student02'`;

await login(page, "student01");
const before = await db`select (select count(*) from stage_progress sp join "user" u on u.id = sp.user_id where u.username='student01')::int n`;

for (const p of ["/teacher", `/teacher/students/${s02.id}`, "/teacher/exports", "/admin", "/admin/users", "/admin/backup"]) {
  await check(`student01 GET ${p} is refused`, async () => {
    const res = await page.goto(p, { waitUntil: "networkidle" });
    const final = new URL(page.url()).pathname;
    const text = await page.locator("body").innerText();
    const refused = final !== p.split("?")[0] || (res && res.status() >= 400);
    assert.ok(refused, `stayed on ${final} (status ${res?.status()})`);
    assert.ok(!text.includes("ภาพรวมห้องเรียน") && !text.includes("ผู้ใช้ทั้งหมด") && !/นางสาวพิมพ์ชนก/.test(text.replace(/นายกิตติ[^\n]*/g, "")), "staff data leaked");
    console.log(`    → ${final} (${res?.status()})`);
  }, page);
}

for (const [label, url] of [
  ["/api/files/<student02 file>", fileKey ? `/api/files/${fileKey}` : null],
  ["/api/export/gradebook", `/api/export/gradebook?class=${cls.id}&format=csv`],
  ["/api/export/gradebook (xlsx)", `/api/export/gradebook?class=${cls.id}&format=xlsx`],
  ["/api/export/items", `/api/export/items?class=${cls.id}&format=csv`],
  ["/api/export/backup", "/api/export/backup"],
]) {
  await check(`student01 ${label} is refused`, async () => {
    assert.ok(url, "no student02 file key (run 02-worksheet first)");
    const r = await page.request.get(url, { maxRedirects: 0 });
    assert.ok([401, 403, 404].includes(r.status()) || (r.status() >= 300 && r.status() < 400), `status ${r.status()}`);
    const body = (await r.body()).toString("latin1");
    assert.ok(!body.startsWith("%PDF") && !body.includes("PK\u0003\u0004") && !body.includes("student02"), "content leaked");
    console.log(`    → ${r.status()}`);
  }, page);
}

await check("student01 never receives the staff menu (raw HTML of /teacher, /admin)", async () => {
  for (const p of ["/teacher", "/admin/users"]) {
    const r = await page.request.get(p);
    const html = await r.text();
    assert.ok(!html.includes('href="/teacher/prepost"') && !html.includes('href="/teacher/exports"'), `${p} streamed the staff nav`);
  }
}, page);

await check("student01's progress untouched by this suite", async () => {
  const after = await db`select (select count(*) from stage_progress sp join "user" u on u.id = sp.user_id where u.username='student01')::int n`;
  assert.equal(after[0].n, before[0].n);
});

await check("signed-out /dashboard redirects to /login?next=… and returns after login", async () => {
  // (lessons are open to guests — see 08-guest; the dashboard is not)
  const s = await newPage(browser);
  await s.page.goto("/dashboard");
  await s.page.waitForURL(/\/login/);
  const u = new URL(s.page.url());
  assert.equal(u.searchParams.get("next"), "/dashboard");
  await s.page.fill("#username", "student03");
  await s.page.fill("#password", "Student1234!");
  await s.page.click("button[type=submit]");
  await s.page.waitForURL(/\/dashboard/);
  await s.ctx.close();
});

await check("signed-out API calls are refused", async () => {
  const s = await newPage(browser);
  for (const url of [fileKey && `/api/files/${fileKey}`, `/api/export/gradebook?class=${cls.id}`, "/api/export/backup"].filter(Boolean)) {
    const r = await s.page.request.get(url, { maxRedirects: 0 });
    assert.ok(r.status() === 401 || r.status() === 403 || (r.status() >= 300 && r.status() < 400), `${url} → ${r.status()}`);
  }
  await s.ctx.close();
});

await check("teacher cannot download the admin backup", async () => {
  const s = await newPage(browser);
  await login(s.page, "teacher");
  const r = await s.page.request.get("/api/export/backup");
  assert.equal(r.status(), 403);
  await s.ctx.close();
});

await check("teacher cannot open a student outside their classes", async () => {
  const [other] = await db`select u.id from "user" u where u.role = 'student' and not exists (
    select 1 from enrollment e join classroom_teacher t on t.classroom_id = e.classroom_id join "user" tu on tu.id = t.user_id
    where e.user_id = u.id and tu.username = 'teacher') limit 1`;
  assert.ok(other, "needs a student outside the teacher's class (04-admin creates one)");
  const s = await newPage(browser);
  await login(s.page, "teacher");
  await s.page.goto(`/teacher/students/${other.id}`);
  await s.page.getByText("ไม่พบนักเรียน หรือคุณไม่มีสิทธิ์ดูข้อมูลนักเรียนคนนี้").waitFor();
  await s.ctx.close();
});

await check("no client-side errors", async () => assert.deepEqual(errors, []));
await finish(SUITE, browser);
