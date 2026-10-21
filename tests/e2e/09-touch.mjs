// Touch input on a 360 px phone: drag-and-drop (long-press + move), tap-to-place alternative,
// a lab slider and a hotspot, all through real touch events (CDP Input.dispatchTouchEvent).
import { MOBILE, assert, check, finish, launch, newPage } from "./lib.mjs";

const SUITE = "09-touch";
console.log(`# ${SUITE}`);
const browser = await launch();
const { page, errors, ctx } = await newPage(browser, MOBILE);
const cdp = await ctx.newCDPSession(page);

async function touch(type, x, y) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
}
/** Long-press, then move in small steps (dnd-kit TouchSensor: 150 ms delay, 6 px tolerance). */
async function touchDrag(from, to) {
  await touch("touchStart", from.x, from.y);
  await page.waitForTimeout(260);
  const n = 12;
  for (let i = 1; i <= n; i++) {
    await touch("touchMove", from.x + ((to.x - from.x) * i) / n, from.y + ((to.y - from.y) * i) / n);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(120);
  await touch("touchEnd", 0, 0);
}
const center = async (loc) => {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

// Guest mode: no account needed. Week 1 step 1 holds a classify (drag) interaction.
await check("guest reaches week-1 learn step 1 by touch", async () => {
  await page.goto("/learn/1/intro");
  await page.getByText("กำลังเรียนแบบผู้เยี่ยมชม").filter({ visible: true }).first().waitFor();
  const start = page.getByRole("button", { name: "เริ่มเรียน" });
  const c = await center(start);
  await page.touchscreen.tap(c.x, c.y);
  await page.waitForURL(/\/learn\/1\/learn/);
  await page.locator("#step-title").waitFor();
}, page);

const section = () => page.locator("section.ee-interaction").filter({ hasText: "จัดเหตุการณ์ต่อไปนี้เข้ากลุ่มอันตรายหลัก" }).first();

await check("classify: long-press touch drag moves an item into a bin", async () => {
  const sec = section();
  await sec.scrollIntoViewIfNeeded();
  const handle = sec.getByLabel(/^ลาก /).first();
  const itemText = (await handle.getAttribute("aria-label")).replace(/^ลาก /, "");
  const pool = sec.getByText(/ยังไม่จัดกลุ่ม \((\d+)\)/).first();
  const before = Number((await pool.innerText()).match(/\((\d+)\)/)[1]);
  // target: the title of the first category bin ("ไฟฟ้าดูด"), dropped a little below the title inside the bin
  const binTitle = sec.locator("p.font-semibold", { hasText: "ไฟฟ้าดูด" }).first();
  const from = await center(handle);
  const to = await center(binTitle);
  await touchDrag(from, { x: to.x, y: to.y + 40 });
  await page.waitForTimeout(400);
  const after = Number((await pool.innerText()).match(/\((\d+)\)/)[1]);
  assert.equal(after, before - 1, `pool count ${before} → ${after} (item "${itemText.slice(0, 20)}")`);
  await sec.getByRole("button", { name: /ย้าย .* กลับไปรายการเดิม/ }).first().waitFor();
}, page);

await check("classify: tap item then tap 'วางที่นี่' places it (touch alternative to dragging)", async () => {
  const sec = section();
  const item = sec.locator("button[aria-pressed='false']").first();
  const c = await center(item);
  await page.touchscreen.tap(c.x, c.y);
  const place = sec.getByRole("button", { name: "วางที่นี่" }).first();
  await place.waitFor({ timeout: 5000 });
  const p = await center(place);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(300);
  await sec.getByRole("button", { name: /ย้าย .* กลับไปรายการเดิม/ }).first().waitFor();
}, page);

await check("lab slider responds to touch (free-play Ohm's-law lab)", async () => {
  await page.goto("/labs/ohms");
  const slider = page.locator('input[type="range"]').first();
  await slider.waitFor({ timeout: 30000 });
  await slider.scrollIntoViewIfNeeded();
  const before = await slider.inputValue();
  const b = await slider.boundingBox();
  await page.touchscreen.tap(b.x + b.width * 0.9, b.y + b.height / 2);
  await page.waitForTimeout(200);
  const after = await slider.inputValue();
  assert.notEqual(after, before, "slider value changed by touch");
  // the slider's accessible value text follows it (readout as text, not only graphics)
  assert.ok((await slider.getAttribute("aria-valuetext")) !== null, "aria-valuetext present");
}, page);

await check("no horizontal overflow on the lab page at 360 px", async () => {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(o <= 1, `overflow ${o}px`);
}, page);

await check("no client-side errors", async () => assert.deepEqual(errors, []));
await finish(SUITE, browser);
