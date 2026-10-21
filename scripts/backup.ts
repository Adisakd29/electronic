/**
 * Full database backup with pg_dump (custom format, restorable with pg_restore).
 *   npx tsx scripts/backup.ts [outDir]        (default ./backups)
 *
 * Restore:
 *   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/eelearn-YYYY-MM-DD-HH-MM-SS.dump
 * Uploaded worksheets live in UPLOAD_DIR — back that folder/volume up as well (e.g. tar/rsync).
 * Railway: run from a machine with pg_dump ≥ the server version, with DATABASE_URL set
 * to the public connection string, or use Railway's own Postgres backups.
 */
import { config } from "dotenv";
import { spawn } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const outDir = path.resolve(process.argv[2] ?? "backups");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const file = path.join(outDir, `eelearn-${stamp}.dump`);

const child = spawn("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", `--file=${file}`, url], { stdio: ["ignore", "inherit", "inherit"] });
child.on("error", (e) => {
  console.error("Could not run pg_dump (is the PostgreSQL client installed?):", e.message);
  process.exit(1);
});
child.on("exit", (code) => {
  if (code !== 0) {
    console.error(`pg_dump failed with exit code ${code}`);
    process.exit(code ?? 1);
  }
  console.log(`Backup written: ${file} (${Math.round(statSync(file).size / 1024)} KB)`);
});
