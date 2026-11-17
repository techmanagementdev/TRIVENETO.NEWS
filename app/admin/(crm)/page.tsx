import Link from "next/link";
import { ago, Badge, Cat } from "@/components/Crm";
import { aiConfigured, monthSpendUsd } from "@/lib/ai";
import { q, q1 } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { articlesAction, requestRun } from "../actions";

export default async function Dashboard() {
  const [k, last, runs, toReview, settings, spend, srcErr] = await Promise.all([
    q1<any>(`SELECT
      (SELECT count(*) FROM items WHERE fetched_at > now() - interval '24 hours')::int AS items24,
      (SELECT count(*) FROM events WHERE first_seen > now() - interval '24 hours')::int AS events24,
      (SELECT count(*) FROM events WHERE first_seen > now() - interval '24 hours' AND source_count > 1)::int AS multi24,
      (SELECT count(*) FROM articles WHERE status='pronto')::int AS ready,
      (SELECT count(*) FROM articles WHERE status='pubblicato' AND published_at > date_trunc('day', now()))::int AS pubToday,
      (SELECT count(*) FROM articles WHERE status='pubblicato')::int AS pubTotal,
      (SELECT count(*) FROM job_runs WHERE status IN ('errore','interrotto') AND started_at > now() - interval '24 hours')::int AS runErr,
      (SELECT count(*) FROM events WHERE status='errore')::int AS evErr,
      (SELECT count(*) FROM messages WHERE status='nuovo')::int AS msgs`),
    q1<any>(`SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 1`),
    q<any>(`SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 8`),
    q<any>(`SELECT a.id, a.title, a.category, a.status, a.review_reasons, a.created_at, a.event_id FROM articles a WHERE a.status IN ('pronto','bozza') ORDER BY a.created_at DESC LIMIT 15`),
    getSettings(),
    monthSpendUsd(),
    q1<{ n: number }>(`SELECT count(*)::int AS n FROM sources WHERE active AND error_count > 0`),
  ]);
  const pct = settings.monthly_budget_usd ? Math.min(100, (spend / settings.monthly_budget_usd) * 100) : 0;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1>Dashboard</h1>
        <form action={requestRun}>
          <button type="submit" disabled={settings.run_requested}>{settings.run_requested ? "Controllo richiesto…" : "Controlla le fonti ora"}</button>
        </form>
      </div>
      {!aiConfigured() && <div className="notice" style={{ marginBottom: 14 }}>La chiave Claude API (ANTHROPIC_API_KEY) non è configurata: il sistema raccoglie e raggruppa le notizie, ma non genera articoli.</div>}
      {!settings.auto_rules_approved && (
        <div className="notice" style={{ marginBottom: 14 }}>
          Revisione obbligatoria attiva: nessun articolo viene pubblicato senza la tua approvazione. Puoi abilitare l'autopubblicazione in <Link href="/admin/impostazioni" style={{ textDecoration: "underline" }}>Impostazioni</Link>.
        </div>
      )}
      <div className="kpis">
        <div className="kpi"><b>{k.items24}</b><span>notizie trovate (24 h)</span></div>
        <div className="kpi"><b>{k.events24}</b><span>eventi raggruppati (24 h)</span></div>
        <div className="kpi"><b>{k.multi24}</b><span>eventi con più fonti</span></div>
        <div className="kpi"><b>{k.ready}</b><span>articoli da approvare</span></div>
        <div className="kpi"><b>{k.pubToday}</b><span>pubblicati oggi ({k.pubTotal} totali)</span></div>
        <div className="kpi"><b className={k.runErr + k.evErr + (srcErr?.n ?? 0) ? "err-text" : ""}>{k.runErr + k.evErr}</b><span>errori · {srcErr?.n ?? 0} fonti con problemi</span></div>
        <div className="kpi"><b style={{ fontSize: 18 }}>{last ? ago(last.started_at) : "mai"}</b><span>ultimo controllo{settings.schedule_hours.length ? ` · orari ${settings.schedule_hours.map((h) => String(h).padStart(2, "0") + ":00").join(", ")}` : ""} {last && <Badge s={last.status === "ok" ? "pubblicato" : last.status === "running" ? "nuovo" : "errore"} />}</span></div>
        <div className="kpi"><b style={{ fontSize: 18 }}>${spend.toFixed(2)} / ${settings.monthly_budget_usd}</b><span>costo AI del mese</span><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${pct}%` }} /></div></div>
      </div>

      <div className="panel">
        <h2 style={{ display: "flex", justifyContent: "space-between" }}><span>Da revisionare</span><Link className="small" href="/admin/articoli?stato=pronto">Gestisci tutti →</Link></h2>
        {toReview.length === 0 ? <p className="small">Nessun articolo in attesa.</p> : (
          <table className="t">
            <thead><tr><th>Articolo</th><th>Categoria</th><th>Stato</th><th>Motivi</th><th></th></tr></thead>
            <tbody>
              {toReview.map((a: any) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/notizie/${a.event_id}`}><b>{a.title}</b></Link><div className="small">{ago(a.created_at)}</div></td>
                  <td><Cat c={a.category} /></td>
                  <td><Badge s={a.status} /></td>
                  <td className="small">{a.review_reasons.length ? a.review_reasons.join(" · ") : "Controlli superati"}</td>
                  <td>
                    <form action={articlesAction} className="actions">
                      <button type="submit" name="op" value={`publish:${a.id}`} className="ok">Pubblica</button>
                      <Link className="btn secondary" href={`/admin/notizie/${a.event_id}`}>Apri</Link>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Ultimi controlli</h2>
        <table className="t">
          <thead><tr><th>Inizio</th><th>Esito</th><th>Fonti</th><th>Nuove notizie</th><th>Eventi</th><th>Articoli</th><th>Note</th></tr></thead>
          <tbody>
            {runs.map((r: any) => (
              <tr key={r.id}>
                <td>{ago(r.started_at)}</td>
                <td><Badge s={r.status === "ok" ? "pubblicato" : r.status === "running" ? "nuovo" : "errore"} /> <span className="small">{r.stats?.trigger}</span></td>
                <td>{r.stats?.ingest ? `${r.stats.ingest.sources} (${r.stats.ingest.errors} errori)` : "—"}</td>
                <td>{r.stats?.ingest?.newItems ?? "—"}</td>
                <td>{r.stats?.cluster ? `${r.stats.cluster.created} nuovi / ${r.stats.cluster.touched} aggiornati` : "—"}</td>
                <td>{r.stats?.generate?.generated ?? "—"}</td>
                <td className="small">{r.error ? <span className="err-text">{String(r.error).slice(0, 120)}</span> : r.stats?.generate?.skipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {k.msgs > 0 && <div className="panel"><Link href="/admin/messaggi"><b>{k.msgs}</b> messaggi o richieste di rettifica da leggere →</Link></div>}
    </>
  );
}
