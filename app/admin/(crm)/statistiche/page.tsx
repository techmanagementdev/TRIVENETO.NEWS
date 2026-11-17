import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { categoryName } from "@/lib/taxonomy";

export default async function StatsPage() {
  const [tot, daily, top, cats, ai, aiDaily] = await Promise.all([
    q1<any>(`SELECT coalesce(sum(views),0)::int v, coalesce(sum(referrer_search),0)::int s FROM page_views WHERE day > current_date - 30`),
    q<any>(`SELECT day, sum(views)::int v FROM page_views WHERE day > current_date - 30 GROUP BY day ORDER BY day`),
    q<any>(`SELECT a.title, a.event_id, sum(p.views)::int v FROM page_views p JOIN articles a ON a.id=p.article_id WHERE p.day > current_date - 30 GROUP BY a.id ORDER BY v DESC LIMIT 15`),
    q<any>(`SELECT a.category, count(DISTINCT a.id)::int n, coalesce(sum(p.views),0)::int v FROM articles a LEFT JOIN page_views p ON p.article_id=a.id AND p.day > current_date - 30
            WHERE a.status='pubblicato' GROUP BY a.category ORDER BY v DESC`),
    q1<any>(`SELECT coalesce(sum(cost_usd),0)::float c, count(*)::int n, coalesce(sum(input_tokens),0)::int i, coalesce(sum(output_tokens),0)::int o FROM ai_usage WHERE at >= date_trunc('month', now())`),
    q<any>(`SELECT date(at) d, sum(cost_usd)::float c, count(*)::int n FROM ai_usage WHERE at > now() - interval '30 days' GROUP BY 1 ORDER BY 1`),
  ]);
  const maxV = Math.max(1, ...daily.map((d: any) => d.v));
  return (
    <>
      <h1>Statistiche (ultimi 30 giorni)</h1>
      <div className="kpis">
        <div className="kpi"><b>{tot.v}</b><span>letture</span></div>
        <div className="kpi"><b>{tot.v ? Math.round((tot.s / tot.v) * 100) : 0}%</b><span>da motori di ricerca</span></div>
        <div className="kpi"><b>${ai.c.toFixed(2)}</b><span>costo AI del mese ({ai.n} chiamate)</span></div>
        <div className="kpi"><b>{Math.round((ai.i + ai.o) / 1000)}k</b><span>token usati nel mese</span></div>
      </div>
      <p className="small">Le letture sono conteggiate in modo anonimo, una per articolo per sessione di navigazione. Lettori unici e traffico Google dettagliato sono disponibili in Google Analytics 4 e Search Console, se collegati.</p>
      <div className="panel">
        <h2>Letture al giorno</h2>
        {daily.length ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140 }}>
            {daily.map((d: any) => (
              <div key={String(d.day)} title={`${new Date(d.day).toLocaleDateString("it-IT")}: ${d.v}`} style={{ flex: 1, background: "var(--blue)", height: `${(d.v / maxV) * 100}%`, minHeight: 2, borderRadius: 2 }} />
            ))}
          </div>
        ) : <p className="small">Ancora nessuna lettura registrata.</p>}
      </div>
      <div className="grid2">
        <div className="panel">
          <h2>Articoli più letti</h2>
          <table className="t"><tbody>{top.map((t: any, i: number) => <tr key={i}><td><Link href={`/admin/notizie/${t.event_id}`}>{t.title}</Link></td><td><b>{t.v}</b></td></tr>)}</tbody></table>
          {!top.length && <p className="small">—</p>}
        </div>
        <div className="panel">
          <h2>Prestazioni delle categorie</h2>
          <table className="t">
            <thead><tr><th>Categoria</th><th>Articoli</th><th>Letture</th><th>Media</th></tr></thead>
            <tbody>{cats.map((c: any) => <tr key={c.category}><td>{categoryName(c.category)}</td><td>{c.n}</td><td>{c.v}</td><td>{c.n ? Math.round(c.v / c.n) : 0}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <h2>Costi AI per giorno</h2>
        <table className="t"><thead><tr><th>Giorno</th><th>Chiamate</th><th>Costo stimato</th></tr></thead>
          <tbody>{aiDaily.map((d: any) => <tr key={String(d.d)}><td>{new Date(d.d).toLocaleDateString("it-IT")}</td><td>{d.n}</td><td>${d.c.toFixed(3)}</td></tr>)}</tbody>
        </table>
        <p className="small">Costi stimati sulla base dei prezzi per token configurati (LLM_PRICE_INPUT_PER_MTOK / LLM_PRICE_OUTPUT_PER_MTOK). Il dato ufficiale è nella console Anthropic.</p>
      </div>
    </>
  );
}
