import Link from "next/link";
import { ago } from "@/components/Crm";
import { q, q1 } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { requestRun } from "../../actions";

// Area raccolta (scraping): tutto ciò che arriva dalle fonti, in ordine di arrivo
export default async function RaccoltaPage({ searchParams }: { searchParams: Promise<{ fonte?: string; q?: string }> }) {
  const sp = await searchParams;
  const [k, sources, items, settings] = await Promise.all([
    q1<any>(`SELECT
      (SELECT count(*) FROM items WHERE fetched_at > now() - interval '24 hours')::int AS d24,
      (SELECT count(*) FROM items WHERE fetched_at > now() - interval '24 hours' AND content_status='ok')::int AS testi,
      (SELECT count(*) FROM sources WHERE active)::int AS fonti,
      (SELECT max(started_at) FROM job_runs) AS ultimo`),
    q<any>(`SELECT s.id, s.name, s.kind, count(i.id) FILTER (WHERE i.fetched_at > now() - interval '24 hours')::int AS n, s.last_error
            FROM sources s LEFT JOIN items i ON i.source_id=s.id WHERE s.active GROUP BY s.id ORDER BY n DESC, s.name`),
    q<any>(`SELECT i.id, i.title, i.url, i.publisher, i.domain, i.fetched_at, i.published_at, i.content_status, i.event_id, s.name AS source_name, s.kind,
              e.source_count, e.status AS ev_status
            FROM items i LEFT JOIN sources s ON s.id=i.source_id LEFT JOIN events e ON e.id=i.event_id
            WHERE ($1::int IS NULL OR i.source_id=$1) AND ($2::text IS NULL OR i.title ILIKE '%'||$2||'%')
            ORDER BY i.fetched_at DESC, i.id DESC LIMIT 200`, [sp.fonte ? Number(sp.fonte) : null, sp.q || null]),
    getSettings(),
  ]);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h1>Raccolta notizie</h1>
        <form action={requestRun}><button type="submit">Raccogli ora</button></form>
      </div>
      <p className="small">Tutte le notizie scaricate dalle fonti e dalla ricerca web, in ordine di arrivo. Aggiornamenti automatici alle {settings.schedule_hours.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ") || `ogni ${settings.fetch_interval_min} minuti`}.</p>
      <div className="kpis">
        <div className="kpi"><b>{k.d24}</b><span>notizie raccolte (24 h)</span></div>
        <div className="kpi"><b>{k.testi}</b><span>testi completi scaricati</span></div>
        <div className="kpi"><b>{k.fonti}</b><span>fonti attive</span></div>
        <div className="kpi"><b style={{ fontSize: 18 }}>{ago(k.ultimo)}</b><span>ultima raccolta</span></div>
      </div>
      <form className="filters">
        <select name="fonte" defaultValue={sp.fonte ?? ""}>
          <option value="">Tutte le fonti</option>
          {sources.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.n})</option>)}
        </select>
        <input name="q" placeholder="Cerca nel titolo" defaultValue={sp.q} />
        <button className="secondary" type="submit">Filtra</button>
      </form>
      <div className="panel">
        <table className="t">
          <thead><tr><th>Arrivata</th><th>Testata</th><th>Titolo</th><th>Testo</th><th>Raggruppata in</th></tr></thead>
          <tbody>
            {items.map((i: any) => (
              <tr key={i.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{ago(i.fetched_at)}</td>
                <td className="small">{i.publisher || i.domain}{i.kind === "search" && <div>🔎 ricerca web</div>}</td>
                <td><a href={i.url} target="_blank" rel="noopener nofollow" style={{ color: "var(--blue)" }}>{i.title}</a></td>
                <td className="small">{i.content_status === "ok" ? <span className="ok-text">completo</span> : i.content_status === "pending" ? "solo titolo" : i.content_status === "robots" ? "non consentito" : i.content_status}</td>
                <td className="small">{i.event_id ? <Link href={`/admin/notizie/${i.event_id}`} style={{ color: "var(--blue)" }}>evento · {i.source_count} fonti</Link> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="small">Nessuna notizia.</p>}
      </div>
    </>
  );
}
