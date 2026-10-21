// Runs every e2e suite in order against BASE (default http://localhost:3000).
// Usage: npm run test:e2e                      all suites (07 = whole course, ~15 min)
//        npm run test:e2e -- 03 05            only suites whose file name starts with 03 / 05
//        npm run test:e2e -- 07 --weeks 5-7   full-course suite for a week range
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const suites = ["reset.mjs", "01-student-week.mjs", "02-worksheet.mjs", "03-teacher.mjs", "04-admin.mjs", "05-security.mjs", "06-mobile.mjs", "07-full-course.mjs", "08-guest.mjs", "09-touch.mjs", "10-trades.mjs"];
const args = process.argv.slice(2);
const wi = args.indexOf("--weeks");
const env = { ...process.env };
if (wi >= 0) {
  env.E2E_WEEKS = args[wi + 1];
  args.splice(wi, 2);
}
const only = args;
const pick = only.length ? suites.filter((s) => s === "reset.mjs" || only.some((o) => s.startsWith(o))) : suites;
const failed = [];
for (const s of pick) {
  const r = spawnSync(process.execPath, ["--import", "tsx", path.join(dir, s)], { stdio: "inherit", env });
  if (r.status !== 0) failed.push(s);
}
console.log(failed.length ? `\nFAILED: ${failed.join(", ")}` : "\nALL E2E SUITES PASSED");
process.exit(failed.length ? 1 : 0);
