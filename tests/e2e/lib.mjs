// Shared helpers for the UI end-to-end scripts (plain Node ESM, run with `node --import tsx`).
import { chromium } from "@playwright/test";
import postgres from "postgres";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export const BASE = process.env.BASE ?? "http://localhost:3000";
export const DB_URL = process.env.DATABASE_URL ?? "postgres://eelearn:eelearn@localhost:5432/eelearn";
export const OUT = process.env.E2E_OUT ?? path.resolve("tests/e2e/.out");
fs.mkdirSync(OUT, { recursive: true });

export const USERS = {
  admin: ["admin", "Admin1234!"],
  teacher: ["teacher", "Teacher1234!"],
  student01: ["student01", "Student1234!"],
  student02: ["student02", "Student1234!"],
  student03: ["student03", "Student1234!"],
};

let _sql;
export function sql() {
  _sql ??= postgres(DB_URL, { max: 2, onnotice: () => {} });
  return _sql;
}

export async function launch() {
  return chromium.launch({ executablePath: process.env.PW_CHROME ?? "/opt/pw-browsers/chromium" });
}

export const MOBILE = { viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
export const DESKTOP = { viewport: { width: 1366, height: 900 } };

/** New context + page; collects page errors (fail the test at the end via `errors`). */
export async function newPage(browser, opts = DESKTOP) {
  const ctx = await browser.newContext({ ...opts, acceptDownloads: true, baseURL: BASE, locale: "th-TH", timezoneId: "Asia/Bangkok" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource|Failed to fetch|network error/.test(m.text())) errors.push(m.text().slice(0, 300));
  });
  return { ctx, page, errors };
}

export async function login(page, who) {
  const [u, p] = USERS[who] ?? who;
  await page.goto("/login");
  await page.fill("#username", u);
  await page.fill("#password", p);
  await Promise.all([page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 }), page.click("button[type=submit]")]);
}

// ---------------------------------------------------------------------------
// Tiny test runner: named checks, screenshots on failure, summary.
// ---------------------------------------------------------------------------
const results = [];
export async function check(name, fn, page) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t0, error: String(e?.message ?? e).split("\n").slice(0, 6).join("\n") });
    console.log(`  ✗ ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, 6).join("\n    ")}`);
    if (page) await page.screenshot({ path: path.join(OUT, `fail-${name.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}.png`), fullPage: true }).catch(() => {});
    if (process.env.E2E_BAIL) throw e;
  }
}

export function summary(suite) {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${suite}: ${results.length - failed.length}/${results.length} passed`);
  fs.writeFileSync(path.join(OUT, `${suite}.json`), JSON.stringify(results, null, 1));
  return failed.length;
}

export async function finish(suite, browser) {
  const n = summary(suite);
  await browser?.close().catch(() => {});
  await _sql?.end({ timeout: 2 }).catch(() => {});
  process.exitCode = n ? 1 : 0;
}

export { assert };

/** Thai text present? */
export const hasThai = (s) => /[฀-๿]/.test(s);

/** Max horizontal overflow of the document in px. */
export async function hOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** Plain-text signature of a Markdown string: longest run without math/markup, whitespace removed. */
export function mdPieces(md) {
  return md
    .replace(/\$\$[\s\S]*?\$\$/g, "\u0000")
    .replace(/\$[^$]*\$/g, "\u0000")
    .replace(/\{\{[^}]*\}\}/g, "\u0000") // randomised-exercise placeholders render as numbers
    .split(/[\u0000*_`#>\\[\]()|\n"“”]/)
    .map((s) => s.replace(/\s+/g, ""))
    .filter((s) => s.length >= 3);
}

export function mdSignature(md) {
  const pieces = md
    .replace(/\$\$[\s\S]*?\$\$/g, "\u0000")
    .replace(/\$[^$]*\$/g, "\u0000")
    .replace(/\{\{[^}]*\}\}/g, "\u0000") // randomised-exercise placeholders render as numbers
    .split(/[\u0000*_`#>\\[\]()|\n"“”]/)
    .map((s) => s.replace(/\s+/g, ""))
    .sort((a, b) => b.length - a.length);
  return pieces[0] ?? "";
}

export const squash = (s) => s.replace(/\s+/g, "");

/** Wait until a server action round-trip settles (no pending fetches for a bit). */
export async function settle(page, ms = 400) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}
