import Link from "next/link";
import { ago, Badge, Cat, Terr } from "@/components/Crm";
import { q } from "@/lib/db";
import { CATEGORIES, TERRITORIES } from "@/lib/taxonomy";
import { discardEvent, generateEvent } from "../../actions";

type SP = Promise<{ stato?: string; cat?: string; terr?: string; q?: string; fonti?: string; p?: string }>;
const PER = 50;

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace("$?", `$${params.length}`)); };
  if (sp.stato) add("e.status = $?", sp.stato);
  else where.push("e.status <> 'scartato'");
  if (sp.cat) add("e.category = $?", sp.cat);
  if (sp.terr) add("$? = ANY(e.territories)", sp.terr);
  if (sp.q) add("e.title ILIKE $?", `%${sp.q}%`);
  if (sp.fonti) add("e.source_count >= $?", Number(sp.fonti) || 1);
  params.push(PER + 1, (page - 1) * PER);
  const rows = await q<any>(
    `SELECT e.*, a.id AS article_id, a.status AS article_status FROM events e LEFT JOIN articles a ON a.event_id=e.id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY e.last_seen > now() - interval '24 hours' DESC, e.priority DESC, e.last_seen DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const qs = (p: number) => "?" + new URLSearchParams({ ...(sp as any), p: String(p) }).toString();
  return (
    <>
      <h1>Comparazione notizie</h1>
      <p className="small">Ogni riga è un fatto: le notizie di testate diverse sullo stesso fatto sono raggruppate insieme. Apri un evento per vedere le fonti affiancate, i fatti confermati, le contraddizioni e il testo scritto dall'AI.</p>
      <form className="filters">
        <input name="q" placeholder="Cerca titolo" defaultValue={sp.q} />
        <select name="stato" defaultValue={sp.stato ?? ""}>
          <option value="">Tutti gli stati attivi</option>
          {["nuovo", "in_attesa", "generato", "errore", "scartato"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select name="cat" defaultValue={sp.cat ?? ""}>
          <option value="">Tutte le categorie</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="terr" defaultValue={sp.terr ?? ""}>
          <option value="">Tutti i territori</option>
          {TERRITORIES.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
        <select name="fonti" defaultValue={sp.fonti ?? ""}>
          <option value="">Qualsiasi n. fonti</option>
          <option value="2">2+ fonti</option>
          <option value="3">3+ fonti</option>
        </select>
        <button type="submit">Filtra</button>
      </form>
      <div className="panel">
        <table className="t">
          <thead><tr><th>Evento</th><th>Visto</th><th>Categoria</th><th>Territorio</th><th>Fonti</th><th>Priorità</th><th>Stato</th><th>Azioni</th></tr></thead>
          <tbody>
            {rows.slice(0, PER).map((e: any) => (
              <tr key={e.id}>
                <td>
                  <Link href={`/admin/notizie/${e.id}`}><b>{e.title}</b></Link>
                  {e.sensitive && <> <span className="badge sens">sensibile</span></>}
                  {e.has_update && <> <span className="badge nuovo">nuove fonti</span></>}
                  {e.status_note && <div className="small">{e.status_note}</div>}
                </td>
                <td className="small">{ago(e.last_seen)}</td>
                <td><Cat c={e.category} /></td>
                <td><Terr t={e.territories} /></td>
                <td>{e.source_count} <span className="small">({e.independent_count} indip.)</span></td>
                <td><b>{e.priority}</b></td>
                <td>{e.article_status ? <Badge s={e.article_status} /> : <Badge s={e.status} />}</td>
                <td>
                  <div className="actions">
                    {!e.article_id && e.status !== "scartato" && (
                      <form action={generateEvent}><input type="hidden" name="event_id" value={e.id} /><button className="secondary" type="submit">Genera</button></form>
                    )}
                    {e.status !== "scartato" && (
                      <form action={discardEvent}><input type="hidden" name="event_id" value={e.id} /><button className="danger" type="submit">Scarta</button></form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="small">Nessun evento con questi filtri.</p>}
      </div>
      <div className="pager">
        {page > 1 ? <Link href={qs(page - 1)}>← Precedenti</Link> : <span />}
        {rows.length > PER && <Link href={qs(page + 1)}>Successivi →</Link>}
      </div>
    </>
  );
}
