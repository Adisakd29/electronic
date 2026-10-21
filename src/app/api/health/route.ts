import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Health check for Railway / uptime monitors: 200 when the app can reach the
 * database, 503 otherwise. Never cached; reveals no configuration details.
 */
export async function GET() {
  await connection();
  const started = performance.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json(
      { status: "ok", db: "ok", latencyMs: Math.round(performance.now() - started), time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "error", db: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
