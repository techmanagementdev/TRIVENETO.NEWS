import { pool, q } from "../lib/db";
import { runCycle } from "../lib/pipeline";
import { getSettings, setSetting } from "../lib/settings";

function romeNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: Number(g("hour")) };
}

const LOCK_ID = 424242;
const log = (...a: unknown[]) => console.log(new Date().toISOString(), "[worker]", ...a);

/** Esegue un ciclo solo se nessun altro processo lo sta già eseguendo (lock Postgres). */
async function guardedCycle(trigger: "scheduler" | "manuale") {
  const client = await pool().connect();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS ok", [LOCK_ID]);
    if (!rows[0].ok) {
      log("ciclo già in esecuzione altrove: salto");
      return;
    }
    try {
      await runCycle(trigger);
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

async function maintenance() {
  // cicli rimasti "running" per un riavvio improvviso
  await q(`UPDATE job_runs SET status='interrotto', finished_at=now() WHERE status='running' AND started_at < now() - interval '45 minutes'`);
  // contenuti integrali delle fonti: conservati 21 giorni, poi si tengono solo titolo e link
  await q(`UPDATE items SET content=NULL WHERE content IS NOT NULL AND fetched_at < now() - interval '21 days'`);
  // voci mai raggruppate e vecchie
  await q(`DELETE FROM items WHERE event_id IS NULL AND fetched_at < now() - interval '7 days'`);
  await q(`DELETE FROM job_runs WHERE started_at < now() - interval '60 days'`);
}

async function main() {
  const once = process.argv.includes("--once");
  log("avvio worker", once ? "(una sola esecuzione)" : "");
  await maintenance();
  if (once) {
    await guardedCycle("manuale");
    await pool().end();
    return;
  }
  let lastRun = 0;
  let lastMaintenance = Date.now();
  // controlla ogni 30 secondi se è ora di eseguire (o se il CRM ha chiesto un'esecuzione immediata)
  for (;;) {
    try {
      const s = await getSettings();
      let due = false;
      if (s.schedule_hours?.length) {
        // orari fissi (ora italiana): un solo ciclo per fascia oraria, anche dopo un riavvio
        const { date, hour } = romeNow();
        const slot = `${date}-${hour}`;
        if (s.schedule_hours.includes(hour) && s.last_scheduled_slot !== slot) {
          await setSetting("last_scheduled_slot", slot);
          due = true;
        }
      } else {
        due = Date.now() - lastRun >= Math.max(5, s.fetch_interval_min) * 60_000;
      }
      if (due || s.run_requested) {
        lastRun = Date.now();
        await guardedCycle(due ? "scheduler" : "manuale");
      }
      if (Date.now() - lastMaintenance > 6 * 3600_000) {
        lastMaintenance = Date.now();
        await maintenance();
      }
    } catch (e) {
      log("errore nel ciclo del worker", e);
    }
    await new Promise((r) => setTimeout(r, 30_000));
  }
}

process.on("unhandledRejection", (e) => log("unhandledRejection", e));
main().catch((e) => {
  log("errore fatale", e);
  process.exit(1);
});
