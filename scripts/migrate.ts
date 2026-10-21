/**
 * Apply pending SQL migrations from ./drizzle.
 *   npm run db:migrate            (uses DATABASE_URL from env / .env.local)
 * Railway: run as the pre-deploy / release command before `npm start`.
 */
import { config } from "dotenv";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: path.resolve(__dirname, "../drizzle") });
    console.log("Migrations applied.");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
