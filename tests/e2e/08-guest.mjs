// Guest mode: a visitor without an account can learn; progress stays in this browser;
// no Server Action is ever called; quiz, uploads and dashboard need an account.
import { assert, check, finish, launch, newPage, settle } from "./lib.mjs";

const SUITE = "08-guest";
console.log(`# ${SUITE}`);
const browser = await launch();
const { page, errors } = await newPage(browser);

// Every Server Action call carries a "next-action" header: a guest must never send one.
const actionCalls = [];
page.on("request", (r) => {
  if (r.method() === "POST" && r.headers()["next-action"]) actionCalls.push(r.url());
});
// Next keeps the previous route mounted but hidden, so only count visible matches.
const banner = () => page.getByText("กำลังเรียนแบบผู้เยี่ยมชม (ไม่ได้เข้าสู่ระบบ)").filter({ visible: true });

await check("home offers 'เริ่มเรียนเลย' and it opens week 1 as a guest", async () => {
  await page.goto("/");
  await page.getByRole("link", { name: "เริ่มเรียนเลย" }).click();
  await page.waitForURL(/\/learn\/1\/intro/);
  await banner().waitFor();
}, page);

await check("intro has no pre-test and 'เริ่มเรียน' moves to the learn stage", async () => {
  assert.equal(await page.getByText("แบบทดสอบก่อนเรียน").count(), 0);
  await settle(page);
  await page.getByRole("button", { name: "เริ่มเรียน" }).click();
  await page.waitForURL(/\/learn\/1\/learn/);
}, page);

await check("a finished step is remembered after reload", async () => {
  await banner().waitFor();
  await settle(page);
  await page.getByRole("button", { name: /ทำขั้นนี้เสร็จแล้ว/ }).click();
  await page.waitForURL(/step=2/);
  await page.goto("/learn/1/learn?step=1");
  await banner().waitFor();
  await page.getByText(/เสร็จแล้ว 1 (จาก \d+ )?ขั้น/).filter({ visible: true }).first().waitFor();
}, page);

await check("/learn resumes where this browser stopped", async () => {
  await page.goto("/learn/1/learn?step=4");
  await banner().waitFor();
  await page.waitForTimeout(1200); // position autosave is debounced
  await page.goto("/learn");
  await page.waitForURL(/\/learn\/1\/learn\?step=4/);
}, page);

await check("every week is open to guests (no week lock), but stages still go in order", async () => {
  await page.goto("/learn/12/intro");
  await banner().waitFor();
  assert.equal(await page.getByText("ยังล็อกอยู่").count(), 0);
  await page.goto("/learn/12/learn");
  await page.getByRole("heading", { name: "ขั้นเรียนรู้ยังไม่เปิด" }).waitFor();
  await page.getByRole("link", { name: "ไปทำขั้นบทนำ" }).waitFor();
}, page);

await check("quiz stage asks to sign in instead of starting a quiz", async () => {
  await page.goto("/learn/3/quiz");
  await page.getByRole("link", { name: "เข้าสู่ระบบเพื่อทำแบบทดสอบ" }).waitFor();
  assert.equal(await page.getByRole("button", { name: /เริ่มทำแบบทดสอบ/ }).count(), 0);
}, page);

await check("worksheet upload needs an account", async () => {
  await page.goto("/learn/1/worksheet/W01-A01");
  await page.getByRole("link", { name: "เข้าสู่ระบบเพื่อส่งงาน" }).waitFor();
}, page);

await check("dashboard still requires sign-in", async () => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/login\?next=%2Fdashboard|\/login\?next=\/dashboard/);
}, page);

await check("the guest never called a Server Action", async () => {
  assert.deepEqual(actionCalls, []);
});

await check("guest banner 'เข้าสู่ระบบเพื่อบันทึกผลการเรียน' leads to login and back to the lesson", async () => {
  await page.goto("/learn/2/intro");
  await banner().waitFor();
  await page.getByRole("link", { name: "เข้าสู่ระบบเพื่อบันทึกผลการเรียน" }).filter({ visible: true }).click();
  await page.waitForURL(/\/login/);
  await page.fill("#username", "student01");
  await page.fill("#password", "Student1234!");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/learn\/2\/intro/);
  assert.equal(await banner().count(), 0);
}, page);

await check("no client-side errors", async () => {
  assert.deepEqual(errors, []);
});

await finish(SUITE, browser);
