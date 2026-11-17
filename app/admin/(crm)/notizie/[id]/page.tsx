import Link from "next/link";
import { notFound } from "next/navigation";
import { ago, Badge, Cat, Terr } from "@/components/Crm";
import { imageUrl, renderMarkdown } from "@/lib/content";
import { q, q1 } from "@/lib/db";
import { CATEGORIES, TERRITORIES } from "@/lib/taxonomy";
import { changeSlug, discardEvent, generateEvent, newImage, publishArticle, saveArticle, searchMoreSources, unpublishArticle } from "../../../actions";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const ev = await q1<any>(`SELECT * FROM events WHERE id=$1`, [id]);
  if (!ev) notFound();
  const [items, art] = await Promise.all([
    q<any>(
      `SELECT i.*, s.name AS source_name, s.reliability, s.is_primary FROM items i LEFT JOIN sources s ON s.id=i.source_id WHERE i.event_id=$1 ORDER BY i.published_at ASC`,
      [id],
    ),
    q1<any>(`SELECT * FROM articles WHERE event_id=$1`, [id]),
  ]);
  const an = ev.analysis ?? null;
  return (
    <>
      <p className="small"><Link href="/admin/notizie">← Notizie</Link></p>
      <h1>{ev.title}</h1>
      <div className="actions" style={{ marginBottom: 14, alignItems: "center" }}>
        <Badge s={ev.status} /> <Cat c={ev.category} /> <Terr t={ev.territories} />
        <span className="badge">priorità {ev.priority}</span>
        <span className="badge">{ev.source_count} fonti · {ev.independent_count} indipendenti</span>
        {ev.has_primary && <span className="badge">fonte primaria</span>}
        {ev.sensitive && <span className="badge sens">tema sensibile</span>}
        <span className="small">prima notizia {ago(ev.first_seen)} · ultima {ago(ev.last_seen)}</span>
      </div>
      {ev.status_note && <div className="notice" style={{ marginBottom: 14 }}>{ev.status_note}</div>}

      <div className="actions" style={{ marginBottom: 16 }}>
        {!art && (
          <form action={generateEvent}><input type="hidden" name="event_id" value={id} /><button type="submit">Genera articolo con AI</button></form>
        )}
        {art && (
          <form action={generateEvent}>
            <input type="hidden" name="event_id" value={id} /><input type="hidden" name="update" value="1" />
            <button className="secondary" type="submit">{ev.has_update ? "Aggiorna con le nuove fonti" : "Rigenera articolo"}</button>
          </form>
        )}
        {art && art.status !== "pubblicato" && (
          <form action={publishArticle}><input type="hidden" name="id" value={art.id} /><button className="ok" type="submit">Pubblica</button></form>
        )}
        {art && art.status === "pubblicato" && (
          <>
            <Link className="btn secondary" href={`/notizie/${art.slug}`} target="_blank">Vedi online ↗</Link>
            <form action={unpublishArticle}><input type="hidden" name="id" value={art.id} /><button className="danger" type="submit">Ritira</button></form>
          </>
        )}
        <form action={searchMoreSources}><input type="hidden" name="event_id" value={id} /><button className="secondary" type="submit">🔎 Cerca altre testate</button></form>
        {ev.status !== "scartato" && (
          <form action={discardEvent}><input type="hidden" name="event_id" value={id} /><button className="danger" type="submit">Scarta evento</button></form>
        )}
      </div>

      <div className="panel">
        <h2>Fonti ({items.length}) <span className="small" style={{ fontWeight: 400 }}>· {ev.independent_count} indipendenti</span></h2>
        {ev.enrich_note && <p className="small">{ev.enrich_note}{ev.enriched_at ? ` · ${ago(ev.enriched_at)}` : ""}</p>}
        {items.length < 3 && !ev.enrich_note && <p className="small">Con «Cerca altre testate» il sistema cerca sul web altri giornali che riportano la stessa notizia e li aggiunge qui: l'articolo verrà scritto unendo tutte le fonti.</p>}
        <table className="t">
          <thead><tr><th>Testata</th><th>Titolo</th><th>Ora</th><th>Testo</th></tr></thead>
          <tbody>
            {items.map((i: any) => (
              <tr key={i.id}>
                <td>{i.publisher || i.domain}<div className="small">{i.source_name === "Ricerca web (altre testate)" ? "🔎 trovata con ricerca web" : i.source_name}{i.is_primary ? " · primaria" : ""}{i.reliability ? ` · affidabilità ${i.reliability}/5` : ""}</div></td>
                <td><a href={i.url} target="_blank" rel="noopener nofollow" style={{ color: "var(--blue)" }}>{i.title}</a>{i.summary && <div className="small">{String(i.summary).slice(0, 220)}</div>}</td>
                <td className="small">{ago(i.published_at)}</td>
                <td className="small">{i.content_status === "ok" ? <span className="ok-text">scaricato</span> : i.content_status === "robots" ? "non consentito (robots)" : i.content_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {an && (
        <div className="grid2">
          <div className="panel">
            <h2>Informazioni verificate</h2>
            {an.fatti_confermati?.length ? <ul>{an.fatti_confermati.map((f: any, i: number) => <li key={i}>{f.fatto} <span className="small">[fonti {f.fonti.join(", ")}]</span></li>)}</ul> : <p className="small">Nessun fatto confermato.</p>}
            <p className="small">Impatto sul Triveneto: <b>{an.impatto}</b> — {an.motivazione_impatto}</p>
          </div>
          <div className="panel">
            <h2>Contraddizioni e ipotesi</h2>
            {an.discrepanze?.length ? <ul className="reasons">{an.discrepanze.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul> : <p className="small ok-text">Nessuna discrepanza rilevata.</p>}
            {an.ipotesi?.length > 0 && <><p className="small"><b>Non verificato:</b></p><ul>{an.ipotesi.map((d: string, i: number) => <li key={i} className="small">{d}</li>)}</ul></>}
            {an.sensibile && <p className="err-text small">Sensibile: {an.motivo_sensibile}</p>}
            <p className="small">Somiglianza massima con una fonte: {Math.round((an.similarita ?? 0) * 100)}%</p>
          </div>
        </div>
      )}

      {art && (
        <>
          <div className="panel">
            <h2>Articolo <Badge s={art.status} /></h2>
            {art.review_reasons?.length > 0 && <ul className="reasons">{art.review_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>}
            <div className="grid2">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(art)} alt={art.image?.alt ?? ""} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6 }} />
                <p className="small">{art.image?.kind === "photo" ? `${art.image.provider} · ${art.image.author} · ${art.image.license}` : "Grafica neutra"}</p>
                <form action={newImage} className="filters">
                  <input type="hidden" name="id" value={art.id} />
                  <input name="query" placeholder="Cerca foto su Wikimedia (o scrivi: grafica)" />
                  <button className="secondary" type="submit">Cambia immagine</button>
                </form>
              </div>
              <div>
                <div className="small">Anteprima</div>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: 24 }}>{art.title}</h2>
                <p><i>{art.summary}</i></p>
                <div className="prose" style={{ fontSize: 16 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(art.body_md) }} />
                <p className="small"><b>Social:</b> {art.social_text}</p>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Modifica</h2>
            <form action={saveArticle} className="stack">
              <input type="hidden" name="id" value={art.id} />
              <label>Titolo<input name="title" defaultValue={art.title} maxLength={200} /></label>
              <label>Sommario<textarea name="summary" defaultValue={art.summary} style={{ minHeight: 70 }} /></label>
              <label>Testo (Markdown)<textarea name="body_md" defaultValue={art.body_md} style={{ minHeight: 320, fontFamily: "monospace", fontSize: 13 }} /></label>
              <div className="grid2">
                <label>Categoria
                  <select name="category" defaultValue={art.category}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
                </label>
                <label>Tag (separati da virgola)<input name="tags" defaultValue={art.tags.join(", ")} /></label>
              </div>
              <fieldset className="filters" style={{ border: "1px solid var(--line)", borderRadius: 6 }}>
                <legend className="small">Territori</legend>
                {TERRITORIES.map((t) => (
                  <label key={t.slug} style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 400 }}>
                    <input type="checkbox" name="territories" value={t.slug} defaultChecked={art.territories.includes(t.slug)} style={{ width: "auto" }} />{t.name}
                  </label>
                ))}
              </fieldset>
              <div className="grid2">
                <label>Meta title<input name="meta_title" defaultValue={art.meta_title ?? ""} maxLength={80} /></label>
                <label>Meta description<input name="meta_description" defaultValue={art.meta_description ?? ""} maxLength={180} /></label>
              </div>
              <div><button type="submit">Salva modifiche</button></div>
            </form>
            {art.status !== "pubblicato" && (
              <form action={changeSlug} className="filters" style={{ marginTop: 12 }}>
                <input type="hidden" name="id" value={art.id} />
                <input name="slug" defaultValue={art.slug} />
                <button className="secondary" type="submit">Cambia slug</button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
