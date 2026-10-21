/**
 * Database client (Drizzle + postgres-js). One pool per process; reused across
 * hot reloads in development. Connection is opened lazily on first query.
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "../env";

export type Db = PostgresJsDatabase<typeof schema>;
/** A transaction handle or the db itself. */
export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

const g = globalThis as unknown as { __eelearnSql?: ReturnType<typeof postgres>; __eelearnDb?: Db };

export function createDb(url: string, max = 10): { db: Db; sql: ReturnType<typeof postgres> } {
  const sql = postgres(url, { max, idle_timeout: 30, connect_timeout: 15, onnotice: () => {} });
  return { db: drizzle(sql, { schema }), sql };
}

function getDb(): Db {
  if (!g.__eelearnDb) {
    const { db, sql } = createDb(env().DATABASE_URL, Number(process.env.DB_POOL_MAX ?? 10));
    g.__eelearnSql = sql;
    g.__eelearnDb = db;
  }
  return g.__eelearnDb;
}

/** Lazily-initialised shared database instance. */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export { schema };
