import pg from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
}

function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL non impostata");
  const needsSsl = /sslmode=require/.test(url) || process.env.PGSSL === "1";
  return new pg.Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX || 5),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export function pool(): pg.Pool {
  if (!globalThis.__pgPool) globalThis.__pgPool = makePool();
  return globalThis.__pgPool;
}

export async function q<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params as any[]);
  return res.rows;
}

export async function q1<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
