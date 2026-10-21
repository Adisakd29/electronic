// Worksheet: print button, valid PDF upload, fake PDF rejection (student02, week 1).
import fs from "node:fs";
import path from "node:path";
import { week } from "../../src/content/weeks/w01.ts";
import { OUT, assert, check, finish, launch, login, newPage, sql } from "./lib.mjs";

const SUITE = "02-worksheet";
console.log(`# ${SUITE}`);
const act = week.activities.find((a) => a.submit);
const browser = await launch();
const { page, errors } = await newPage(browser);

// A minimal, valid one-page PDF (with a correct xref table).
function makePdf() {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = "BT /F1 12 Tf 20 50 Td (e2e worksheet) Tj ET";
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n";
  const offs = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
const pdf = path.join(OUT, "worksheet.pdf");
fs.writeFileSync(pdf, makePdf());
const fake = path.join(OUT, "fake.pdf");
fs.writeFileSync(fake, "this is plain text pretending to be a PDF file, not a real one\n".repeat(4));

await login(page, "student02");
const url = `/learn/1/worksheet/${act.id}`;

await check("worksheet renders with print button (calls window.print)", async () => {
  await page.goto(url);
  await page.getByRole("heading", { name: new RegExp(act.title.slice(0, 15)) }).first().waitFor();
  await page.evaluate(() => {
    window.__printed = 0;
    window.print = () => window.__printed++;
  });
  await page.getByRole("button", { name: "พิมพ์ใบงาน" }).click();
  assert.equal(await page.evaluate(() => window.__printed), 1);
}, page);

await check("fake .pdf (text bytes) is rejected with a Thai message", async () => {
  await page.locator('input[type=file][name=file]').setInputFiles(fake);
  await page.getByRole("button", { name: /ส่งใบงาน|ส่งไฟล์ใหม่/ }).click();
  const alert = page.getByText("ส่งงานไม่สำเร็จ");
  await alert.waitFor();
  const msg = await alert.locator("..").innerText();
  assert.match(msg, /รองรับเฉพาะไฟล์ PDF/);
  const [r] = await sql()`select count(*)::int n from submission s join "user" u on u.id = s.user_id where u.username = 'student02' and activity_id = ${act.id}`;
  assert.equal(r.n, 0, "nothing stored for a fake file");
}, page);

await check("valid PDF upload → status 'ส่งแล้ว รอครูตรวจ'", async () => {
  await page.locator('input[type=file][name=file]').setInputFiles(pdf);
  await page.getByLabel("ข้อความถึงครู (ไม่บังคับ)").fill("ส่งงานครับ (e2e)");
  await page.getByRole("button", { name: /ส่งใบงาน|ส่งไฟล์ใหม่/ }).click();
  await page.getByText("ส่งใบงานเรียบร้อยแล้ว").waitFor();
  await page.getByText("ส่งแล้ว รอครูตรวจ").first().waitFor();
  await page.reload();
  await page.getByText("ส่งแล้ว รอครูตรวจ").first().waitFor();
  await page.getByText("worksheet.pdf").waitFor();
}, page);

await check("owner can open the stored file; it is the same PDF", async () => {
  const [row] = await sql()`select file_key, mime_type from submission s join "user" u on u.id = s.user_id where u.username = 'student02' and activity_id = ${act.id}`;
  assert.equal(row.mime_type, "application/pdf");
  const res = await page.request.get(`/api/files/${row.file_key}`);
  assert.equal(res.status(), 200);
  assert.equal((await res.body()).toString("latin1").slice(0, 5), "%PDF-");
  fs.writeFileSync(path.join(OUT, "student02-file-key.txt"), row.file_key);
}, page);

await check("lab page lists the submission status", async () => {
  await page.goto("/learn/1/lab");
  await page.getByRole("heading", { name: "ใบงานและกิจกรรมปฏิบัติจริง" }).waitFor();
  await page.getByText("ส่งแล้ว รอครูตรวจ").first().waitFor();
}, page);

await check("no client-side errors", async () => assert.deepEqual(errors, []));
await finish(SUITE, browser);
