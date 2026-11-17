import Link from "next/link";
import { ago, Badge, Cat, Terr } from "@/components/Crm";
import { q } from "@/lib/db";

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ stato?: string }> }) {
  const stato = (await searchParams).stato;
  const rows = await q<any>(
    `SELECT id, event_id, slug, title, category, territories, status, views, published_at, created_at FROM articles
     WHERE ($1::text IS NULL OR status=$1) ORDER BY created_at DESC LIMIT 200`,
    [stato ?? null],
  );
  return (
    <>
      <h1>Articoli</h1>
      <div className="filters">
        {[["", "Tutti"], ["pronto", "Da approvare"], ["pubblicato", "Pubblicati"], ["bozza", "Bozze"], ["ritirato", "Ritirati"]].map(([v, l]) => (
          <Link key={v} className={`btn ${stato === v || (!stato && !v) ? "" : "secondary"}`} href={v ? `?stato=${v}` : "?"}>{l}</Link>
        ))}
      </div>
      <div className="panel">
        <table className="t">
          <thead><tr><th>Titolo</th><th>Categoria</th><th>Territorio</th><th>Stato</th><th>Letture</th><th>Data</th></tr></thead>
          <tbody>
            {rows.map((a: any) => (
              <tr key={a.id}>
                <td><Link href={`/admin/notizie/${a.event_id}`}><b>{a.title}</b></Link></td>
                <td><Cat c={a.category} /></td>
                <td><Terr t={a.territories} /></td>
                <td><Badge s={a.status} /></td>
                <td>{a.views}</td>
                <td className="small">{ago(a.published_at ?? a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="small">Nessun articolo.</p>}
      </div>
    </>
  );
}
