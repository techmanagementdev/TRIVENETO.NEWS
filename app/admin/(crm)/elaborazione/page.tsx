import Link from "next/link";
import { ago, Badge } from "@/components/Crm";
import { q, q1 } from "@/lib/db";
import { getSettings } from "@/lib/settings";

// Area elaborazione: ogni lavoro dell'AI (ricerca di altre testate, scrittura, aggiornamenti) con esito e costo
export default async function ElaborazionePage() {
  const [tot, perTipo, rows, settings] = await Promise.all([
    q1<any>(`SELECT
      coalesce(sum(cost_usd) FILTER (WHERE at >= date_trunc('day', now())),0)::float AS oggi,
      coalesce(sum(cost_usd) FILTER (WHERE at >= date_trunc('month', now())),0)::float AS mese,
      count(*) FILTER (WHERE at >= date_trunc('month', now()) AND purpose IN ('articolo','riscrittura','aggiornamento'))::int AS articoli
      FROM ai_usage`),
    q<any>(`SELECT purpose, count(*)::int n, sum(cost_usd)::float c FROM ai_usage WHERE at >= date_trunc('month', now()) GROUP BY purpose ORDER BY c DESC`),
    q<any>(`SELECT u.id, u.at, u.model, u.purpose, u.input_tokens, u.output_tokens, u.cost_usd::float AS cost, u.event_id,
              e.title, e.source_count, e.independent_count, e.status AS ev_status, e.enrich_note, a.status AS art_status, a.slug
            FROM ai_usage u LEFT JOIN events e ON e.id=u.event_id LEFT JOIN articles a ON a.event_id=u.event_id
            ORDER BY u.at DESC LIMIT 150`),
    getSettings(),
  ]);
  const label: Record<string, string> = { "ricerca fonti": "🔎 Ricerca altre testate", articolo: "✍️ Scrittura articolo", riscrittura: "✍️ Riscrittura (testo troppo simile)", aggiornamento: "🔄 Aggiornamento" };
  return (
    <>
      <h1>Elaborazione AI</h1>
      <p className="small">Ogni notizia passa da: raccolta → comparazione delle fonti → ricerca di altre testate (se ne ha poche) → scrittura del testo unico → controlli → pubblicazione o revisione. Qui vedi ogni lavoro dell'AI e quanto è costato. Modello di scrittura: <b>{settings.writer_model}</b>.</p>
      <div className="kpis">
        <div className="kpi"><b>${tot.oggi.toFixed(3)}</b><span>speso oggi</span></div>
        <div className="kpi"><b>${tot.mese.toFixed(2)} / ${settings.monthly_budget_usd}</b><span>speso nel mese</span></div>
        <div className="kpi"><b>{tot.articoli}</b><span>testi scritti nel mese</span></div>
        <div className="kpi"><b>${tot.articoli ? (tot.mese / tot.articoli).toFixed(3) : "0"}</b><span>costo medio per articolo</span></div>
      </div>
      <div className="panel">
        <h2>Questo mese per tipo di lavoro</h2>
        <table className="t"><tbody>{perTipo.map((p: any) => <tr key={p.purpose}><td>{label[p.purpose] ?? p.purpose}</td><td>{p.n} volte</td><td><b>${p.c.toFixed(3)}</b></td></tr>)}</tbody></table>
      </div>
      <div className="panel">
        <h2>Ultimi lavori</h2>
        <table className="t">
          <thead><tr><th>Quando</th><th>Lavoro</th><th>Notizia</th><th>Fonti</th><th>Esito</th><th>Costo</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{ago(r.at)}</td>
                <td className="small">{label[r.purpose] ?? r.purpose}<div>{r.model.replace("claude-", "")}</div></td>
                <td>{r.event_id ? <Link href={`/admin/notizie/${r.event_id}`} style={{ color: "var(--blue)" }}>{r.title}</Link> : "—"}
                  {r.purpose === "ricerca fonti" && r.enrich_note && <div className="small">{r.enrich_note}</div>}</td>
                <td className="small">{r.source_count ?? "—"} ({r.independent_count ?? 0} indip.)</td>
                <td>{r.art_status ? <Badge s={r.art_status} /> : r.ev_status ? <Badge s={r.ev_status} /> : "—"}</td>
                <td className="small">${r.cost.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
