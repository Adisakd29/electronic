// Teacher workflows: overview counts, student detail, grading, override, unlock policy,
// question bank edit, exports (CSV/XLSX), item analysis; then student02 sees the grade.
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { week } from "../../src/content/weeks/w01.ts";
import { OUT, assert, check, finish, launch, login, newPage, sql } from "./lib.mjs";

const SUITE = "03-teacher";
console.log(`# ${SUITE}`);
const db = sql();
const browser = await launch();
const { page, errors } = await newPage(browser);
const [s02] = await db`select id, name from "user" where username = 'student02'`;
const [s03] = await db`select id, name from "user" where username = 'student03'`;
const [cls] = await db`select c.id from classroom c join classroom_teacher t on t.classroom_id = c.id join "user" u on u.id = t.user_id where u.username = 'teacher' and not c.archived limit 1`;
const act = week.activities.find((a) => a.submit);

/** Submit an ActionForm (by its submit button) and wait for its live region; returns the message text. */
async function submitForm(form, label) {
  await form.getByRole("button", { name: label }).click();
  const live = form.locator('div[aria-live="polite"]');
  await live.locator("*").first().waitFor({ timeout: 15000 });
  const t = await live.innerText();
  assert.ok(!/ไม่สำเร็จ|ไม่ได้|ผิดพลาด/.test(t) || /แล้ว/.test(t), `form error: ${t}`);
  return t;
}
const formWith = (btn) => page.locator("form", { has: page.getByRole("button", { name: btn }) });

await login(page, "teacher");

await check("overview counts reflect student02", async () => {
  await page.goto(`/teacher?class=${cls.id}`);
  await page.getByRole("heading", { name: "ภาพรวมห้องเรียน" }).waitFor();
  const [{ n }] = await db`select count(*)::int n from enrollment where classroom_id = ${cls.id}`;
  const statText = await page.locator("main").innerText();
  assert.match(statText, new RegExp(`นักเรียน\\s+${n}\\b`));
  await page.getByText("ดูเป็นตาราง").click();
  const row = page.getByRole("table", { name: "จำนวนนักเรียนรายสัปดาห์" }).locator("tbody tr").first();
  const cells = await row.locator("td").allInnerTexts();
  assert.equal(cells[0], "1");
  assert.ok(Number(cells[1]) >= 1, `week 1 started ${cells[1]}`);
  assert.ok(Number(cells[2]) >= 1, `week 1 completed ${cells[2]}`);
}, page);

await check("student02 detail page", async () => {
  await page.goto(`/teacher/students?class=${cls.id}`);
  await page.getByRole("link", { name: s02.name }).click();
  await page.waitForURL(new RegExp(`/teacher/students/${s02.id}`));
  await page.getByRole("heading", { name: s02.name }).waitFor();
  await page.getByRole("table", { name: "สถานะรายสัปดาห์" }).waitFor();
  const t = await page.locator("main").innerText();
  assert.match(t, /เรียนจบ\s+1\/18/);
  assert.match(t, /ก้าวแรกของช่าง/);
  assert.match(t, /W01-L01/);
  const wk1 = page.getByRole("table", { name: "สถานะรายสัปดาห์" }).locator("tbody tr").first();
  await wk1.getByText("จบแล้ว").waitFor();
}, page);

let gradedScore;
await check("grade the submission with the rubric", async () => {
  await page.getByRole("table", { name: "ใบงานที่ส่ง" }).getByRole("link", { name: "ตรวจ" }).first().click();
  await page.waitForURL(/\/teacher\/submissions\//);
  await page.getByText("หมายเหตุจากนักเรียน: ส่งงานครับ (e2e)").waitFor();
  await page.locator('iframe[title="ไฟล์ PDF ที่ส่ง"]').waitFor();
  const form = formWith("บันทึกคะแนน");
  // first criterion: level 3, others level 4
  for (let i = 0; i < act.rubric.length; i++) await form.locator(`input[name="level-${i}"][value="${i === 0 ? 3 : 4}"]`).check();
  await form.locator('textarea[name="feedback"]').fill("ดีมาก ตรวจสายดินครบ (e2e)");
  await submitForm(form, "บันทึกคะแนน");
  const max = act.rubric.reduce((a, r) => a + r.weight, 0);
  const expect = act.rubric.reduce((a, r, i) => a + (r.weight * (i === 0 ? 3 : 4)) / 4, 0);
  const [row] = await db`select status, score, max_score, feedback from submission where user_id = ${s02.id} and activity_id = ${act.id}`;
  assert.equal(row.status, "graded");
  assert.equal(row.max_score, max);
  assert.ok(Math.abs(row.score - expect) < 0.01, `score ${row.score} expected ${expect}`);
  gradedScore = row.score;
  await page.reload();
  await page.getByText("ให้คะแนนแล้ว").first().waitFor();
}, page);

await check("per-student week override for student03", async () => {
  await page.goto(`/teacher/students/${s03.id}?class=${cls.id}`);
  const form = formWith("ปลดล็อก");
  await form.locator('select[name="week"]').selectOption("2");
  await form.locator('input[name="note"]').fill("ลาป่วย (e2e)");
  await submitForm(form, "ปลดล็อก");
  const r = await db`select week from unlock_override where user_id = ${s03.id}`;
  assert.deepEqual(r.map((x) => x.week), [2]);
  await page.reload();
  await page.getByText("ลาป่วย (e2e)").waitFor();
}, page);

await check("student03 can open week 2 thanks to the override; week 3 still locked", async () => {
  const s = await newPage(browser);
  await login(s.page, "student03");
  await s.page.goto("/learn/2/intro");
  await s.page.getByRole("heading", { name: "จุดประสงค์การเรียนรู้" }).waitFor();
  await s.page.goto("/learn/3/intro");
  await s.page.locator("#locked-h").waitFor();
  await s.ctx.close();
}, page);

const [policyBefore] = await db`select enabled, default_rule from unlock_policy where classroom_id = ${cls.id}`;
await check("change unlock policy (require assignments) → student02 week 2 locks with a Thai reason; restore", async () => {
  await page.goto(`/teacher/unlock?class=${cls.id}`);
  const form = formWith("บันทึกเกณฑ์");
  await form.locator('input[name="d-requireAssignments"]').check();
  await form.locator('input[name="d-minQuizPercent"]').fill("70");
  await submitForm(form, "บันทึกเกณฑ์");
  const [p] = await db`select default_rule from unlock_policy where classroom_id = ${cls.id}`;
  assert.equal(p.default_rule.requireAssignments, true);
  assert.equal(p.default_rule.minQuizPercent, 70);
  const s = await newPage(browser);
  await login(s.page, "student02");
  await s.page.goto("/learn/2/intro");
  await s.page.locator("#locked-h").waitFor();
  const reason = await s.page.locator('section[aria-labelledby="locked-h"]').innerText();
  assert.match(reason, /ใบงาน/);
  await s.ctx.close();
  // restore through the UI
  await page.reload();
  const f2 = formWith("บันทึกเกณฑ์");
  await f2.locator('input[name="d-requireAssignments"]').setChecked(Boolean(policyBefore.default_rule.requireAssignments));
  await f2.locator('input[name="d-minQuizPercent"]').fill(String(policyBefore.default_rule.minQuizPercent));
  await submitForm(f2, "บันทึกเกณฑ์");
  const [p2] = await db`select default_rule from unlock_policy where classroom_id = ${cls.id}`;
  assert.deepEqual(p2.default_rule, policyBefore.default_rule);
}, page);

await check("edit a question in the bank and verify; then revert", async () => {
  const [q] = await db`select id, stem from question where week = 1 and type = 'mcq' and active order by id limit 1`;
  await page.goto(`/teacher/questions/${q.id}`, { waitUntil: "networkidle" });
  const stem = page.locator("#stem");
  await stem.waitFor();
  try {
  assert.equal(await stem.inputValue(), q.stem);
  const edited = `${q.stem} (แก้ไขโดย e2e)`;
  await stem.fill(edited);
  assert.equal(await stem.inputValue(), edited);
  // live preview updates
  await page.getByRole("region", { name: "ตัวอย่างที่นักเรียนเห็น" }).getByText("(แก้ไขโดย e2e)").waitFor();
  await submitForm(formWith("บันทึกการแก้ไข"), "บันทึกการแก้ไข");
  const [after] = await db`select stem, edited_at from question where id = ${q.id}`;
  assert.equal(after.stem, edited);
  assert.ok(after.edited_at);
  await page.goto(`/teacher/questions?week=1`);
  await page.getByText("(แก้ไขโดย e2e)").first().waitFor();
  // revert
  await page.goto(`/teacher/questions/${q.id}`, { waitUntil: "networkidle" });
  await page.locator("#stem").fill(q.stem);
  assert.equal(await page.locator("#stem").inputValue(), q.stem);
  await submitForm(formWith("บันทึกการแก้ไข"), "บันทึกการแก้ไข");
  const [back] = await db`select stem from question where id = ${q.id}`;
  assert.equal(back.stem, q.stem);
  } finally {
    await db`update question set stem = ${q.stem}, edited_at = null, edited_by = null where id = ${q.id}`;
  }
}, page);

async function download(linkName) {
  const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: linkName }).first().click()]);
  const f = path.join(OUT, d.suggestedFilename());
  await d.saveAs(f);
  return f;
}

await check("gradebook CSV: BOM + Thai + student02 row", async () => {
  await page.goto(`/teacher/exports?class=${cls.id}`);
  const f = await download("CSV (UTF-8)");
  const buf = fs.readFileSync(f);
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf], "UTF-8 BOM");
  const text = buf.toString("utf8").slice(1);
  assert.match(text, /[฀-๿]/);
  const lines = text.split(/\r?\n/).filter(Boolean);
  assert.ok(lines.length >= 2);
  const row = lines.find((l) => l.includes(s02.name));
  assert.ok(row, "student02 row");
  assert.ok(row.includes(String(gradedScore ?? "")), "graded score in row");
  const cols = lines[0].split(",").length;
  assert.ok(cols > 5, `columns ${cols}`);
}, page);

await check("gradebook XLSX opens with exceljs", async () => {
  const f = await download("Excel (.xlsx)");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(f);
  const ws = wb.worksheets[0];
  assert.ok(ws && ws.rowCount >= 2, "rows");
  let found = false;
  ws.eachRow((r) => {
    if (JSON.stringify(r.values).includes(s02.name)) found = true;
  });
  assert.ok(found, "student02 in xlsx");
}, page);

await check("item analysis page shows week-1 questions and interactions", async () => {
  await page.goto(`/teacher/items?class=${cls.id}&week=1`);
  const qt = page.getByRole("table", { name: "สถิติรายข้อ" });
  await qt.waitFor();
  assert.ok((await qt.locator("tbody tr").count()) >= 5);
  const it = page.getByRole("table", { name: "สถิติกิจกรรมโต้ตอบ" });
  await it.waitFor();
  assert.ok((await it.locator("tbody tr").count()) >= week.practice.length);
  await page.getByText(/W01-I2\d/).first().waitFor();
  const f = await download("ส่งออก Excel (ทุกสัปดาห์)");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(f);
  assert.ok(wb.worksheets.length >= 1);
}, page);

await check("student02 sees grade on dashboard and feedback on worksheet", async () => {
  const s = await newPage(browser);
  await login(s.page, "student02");
  await s.page.goto("/dashboard");
  await s.page.getByText("ระดับของฉัน").waitFor();
  const max = act.rubric.reduce((a, r) => a + r.weight, 0);
  await s.page.getByText(`${gradedScore}/${max} คะแนน`).first().waitFor();
  await s.page.getByText(/ครูให้คะแนนใบงาน/).first().waitFor();
  await s.page.goto(`/learn/1/worksheet/${act.id}`);
  await s.page.getByText("ความเห็นจากครู").waitFor();
  await s.page.getByText("ดีมาก ตรวจสายดินครบ (e2e)").waitFor();
  await s.page.getByText("ระดับ 3 จาก 4").first().waitFor();
  await s.page.getByText("ครูให้คะแนนใบงานนี้แล้ว").waitFor();
  assert.deepEqual(s.errors, []);
  await s.ctx.close();
}, page);

await check("no client-side errors", async () => assert.deepEqual(errors, []));
await finish(SUITE, browser);
