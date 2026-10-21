// Crawl every page as a given user; report console errors, page errors, failed requests,
// broken images, empty figures and horizontal overflow. Usage: node tests/e2e/crawl.mjs <user> <pass> <outdir> [mobile]
import { chromium } from "@playwright/test";
import fs from "node:fs";
const [user, pass, out, mobile] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext(mobile ? { viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
const issues = [];
let current = "";
page.on("console", (m) => { if (m.type() === "error") issues.push({ url: current, kind: "console", text: m.text().slice(0, 300) }); });
page.on("pageerror", (e) => issues.push({ url: current, kind: "pageerror", text: String(e).slice(0, 300) }));
page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("favicon")) issues.push({ url: current, kind: "http" + r.status(), text: r.url() }); });
if (user !== "-") {
  await page.goto(BASE + "/login");
  await page.fill("#username", user); await page.fill("#password", pass);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }), page.click("button[type=submit]")]);
}
const urls = JSON.parse(fs.readFileSync(process.env.URLS, "utf8"));
for (const u of urls) {
  current = u;
  try {
    const resp = await page.goto(BASE + u, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(400);
    const st = resp?.status();
    if (st && st >= 400) issues.push({ url: u, kind: "status", text: String(st) });
    const info = await page.evaluate(() => {
      const brokenImg = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
      const figs = [...document.querySelectorAll("figure")];
      const emptyFig = figs.filter((f) => !f.querySelector("svg,img,canvas") ).length;
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const text = document.body.innerText;
      const errBox = /เกิดข้อผิดพลาด|Application error|Something went wrong|lab not built|TODO|Lorem|placeholder/i.test(text) ? text.match(/.{0,60}(เกิดข้อผิดพลาด|Application error|Something went wrong|lab not built|TODO|Lorem|placeholder).{0,60}/i)?.[0] : null;
      return { brokenImg, emptyFig, figs: figs.length, overflow, errBox, h1: document.querySelector("h1")?.innerText ?? null, final: location.pathname + location.search };
    });
    if (info.brokenImg.length) issues.push({ url: u, kind: "brokenImg", text: info.brokenImg.join(" ") });
    if (info.emptyFig) issues.push({ url: u, kind: "emptyFigure", text: `${info.emptyFig}/${info.figs}` });
    if (info.overflow > 2) issues.push({ url: u, kind: "hOverflow", text: `${info.overflow}px` });
    if (info.errBox) issues.push({ url: u, kind: "errorText", text: info.errBox });
    if (!info.h1) issues.push({ url: u, kind: "noH1", text: info.final });
    if (process.env.SHOTS && new RegExp(process.env.SHOTS).test(u)) await page.screenshot({ path: `${out}/${u.replace(/[^a-z0-9]+/gi, "_")}.png`, fullPage: true });
    console.log("ok", u, "→", info.final, "figs", info.figs);
  } catch (e) { issues.push({ url: u, kind: "exception", text: String(e).slice(0, 200) }); console.log("EXC", u); }
}
fs.writeFileSync(`${out}/issues.json`, JSON.stringify(issues, null, 1));
console.log("ISSUES", issues.length);
await browser.close();
