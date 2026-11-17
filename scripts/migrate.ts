import fs from "node:fs";
import path from "node:path";
import { pool } from "../lib/db";
import { seedSources } from "./seed-data";

async function main() {
  const p = pool();
  const client = await p.connect();
  try {
    await client.query("SELECT pg_advisory_lock(777001)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())");
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      const done = await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [f]);
      if (done.rowCount) continue;
      const sql = fs.readFileSync(path.join(dir, f), "utf8");
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      console.log(`[migrate] applicata ${f}`);
    }
    const { rows } = await client.query("SELECT count(*)::int AS n FROM sources");
    if (rows[0].n === 0) {
      const n = await seedSources(client);
      console.log(`[migrate] inserite ${n} fonti iniziali`);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(777001)").catch(() => {});
    client.release();
    await p.end();
  }
}

main().catch((e) => {
  console.error("[migrate] errore", e);
  process.exit(1);
});
