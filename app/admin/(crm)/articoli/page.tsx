import Link from "next/link";
import ConfirmButton from "@/components/ConfirmButton";
import { ago, Badge, Cat, Terr } from "@/components/Crm";
import { imageUrl } from "@/lib/content";
import { q } from "@/lib/db";
import { CATEGORIES } from "@/lib/taxonomy";
import { articlesAction } from "../../actions";
import SelectAll from "@/components/SelectAll";

type SP = Promise<{ stato?: string; cat?: string; q?: string }>;

export default async function ArticlesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const rows = await q<any>(
    `SELECT id, event_id, slug, title, summary, category, territories, status, review_reasons, image, views, published_at, created_at
     FROM articles
     WHERE ($1::text IS NULL OR status=$1) AND ($2::text IS NULL OR category=$2) AND ($3::text IS NULL OR title ILIKE '%'||$3||'%')
     ORDER BY CASE status WHEN 'pronto' THEN 0 WHEN 'bozza' THEN 1 WHEN 'pubblicato' THEN 2 ELSE 3 END, created_at DESC LIMIT 300`,
    [sp.stato || null, sp.cat || null, sp.q || null],
  );
  const counts = await q<{ status: string; n: number }>(`SELECT status, count(*)::int n FROM articles GROUP BY status`);
  const c = (s: string) => counts.find((x) => x.status === s)?.n ?? 0;
  const tabs: [string, string][] = [["", `Tutti (${counts.reduce((a, x) => a + x.n, 0)})`], ["pronto", `Da approvare (${c("pronto")})`], ["pubblicato", `Online (${c("pubblicato")})`], ["bozza", `Bozze (${c("bozza")})`], ["ritirato", `Ritirati (${c("ritirato")})`]];
  const qs = (stato: string) => "?" + new URLSearchParams({ ...(stato ? { stato } : {}), ...(sp.cat ? { cat: sp.cat } : {}), ...(sp.q ? { q: sp.q } : {}) }).toString();
  return (
    <>
      <h1>Articoli</h1>
      <div className="tabs">
        {tabs.map(([v, l]) => <Link key={v} className={(sp.stato ?? "") === v ? "on" : ""} href={qs(v)}>{l}</Link>)}
      </div>
      <form className="filters">
        {sp.stato && <input type="hidden" name="stato" value={sp.stato} />}
        <input name="q" placeholder="Cerca nel titolo" defaultValue={sp.q} />
        <select name="cat" defaultValue={sp.cat ?? ""}>
          <option value="">Tutte le categorie</option>
          {CATEGORIES.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
        </select>
        <button type="submit" className="secondary">Filtra</button>
      </form>

      <form action={articlesAction}>
        <div className="bulkbar">
          <SelectAll />
          <span className="small">Con i selezionati:</span>
          <button type="submit" name="bulk" value="publish" className="ok">Pubblica</button>
          <button type="submit" name="bulk" value="unpublish" className="secondary">Togli dal sito</button>
          <ConfirmButton message="Eliminare definitivamente gli articoli selezionati? Non verranno rigenerati." name="bulk" value="delete" className="danger">Elimina</ConfirmButton>
        </div>
        <div className="art-list">
          {rows.map((a: any) => (
            <div key={a.id} className={`art-row st-${a.status}`}>
              <input type="checkbox" name="ids" value={a.id} aria-label={`Seleziona ${a.title}`} className="sel" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(a)} alt="" className="art-thumb" loading="lazy" />
              <div className="art-main">
                <Link href={`/admin/notizie/${a.event_id}`}><b>{a.title}</b></Link>
                <div className="small">
                  <Badge s={a.status} /> <Cat c={a.category} /> <Terr t={a.territories} /> · {ago(a.published_at ?? a.created_at)}
                  {a.status === "pubblicato" && <> · {a.views} letture</>}
                </div>
                {a.status !== "pubblicato" && a.review_reasons?.length > 0 && <div className="small" style={{ color: "var(--amber)" }}>{a.review_reasons.join(" · ")}</div>}
              </div>
              <div className="art-actions">
                {a.status === "pubblicato" ? (
                  <>
                    <Link className="btn secondary" href={`/notizie/${a.slug}`} target="_blank">Vedi ↗</Link>
                    <button type="submit" name="op" value={`unpublish:${a.id}`} className="secondary">Togli</button>
                  </>
                ) : (
                  <button type="submit" name="op" value={`publish:${a.id}`} className="ok">Pubblica</button>
                )}
                <Link className="btn secondary" href={`/admin/notizie/${a.event_id}`}>Modifica</Link>
                <ConfirmButton message={`Eliminare «${a.title}»?`} name="op" value={`delete:${a.id}`} className="danger">✕</ConfirmButton>
              </div>
            </div>
          ))}
          {!rows.length && <p className="small">Nessun articolo.</p>}
        </div>
      </form>
    </>
  );
}
