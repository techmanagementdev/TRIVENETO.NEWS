import AdEdit from "@/components/AdEdit";
import AdForm from "@/components/AdForm";
import ConfirmButton from "@/components/ConfirmButton";
import { PLACEMENTS, youtubeId } from "@/lib/ads";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { adAction, togglePlaceholders } from "../../actions";

const iso = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);

export default async function AdsPage() {
  const [ads, settings] = await Promise.all([
    q<any>(`SELECT a.*, m.mime, m.size FROM ads a LEFT JOIN media m ON m.id=a.media_id ORDER BY a.placement, a.active DESC, a.created_at DESC`),
    getSettings(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <h1>Pubblicità</h1>
      <p className="small">Carica loghi, banner, GIF o video e scegli dove mostrarli. Se in una posizione ci sono più annunci attivi, si alternano a ogni visita. Ogni annuncio è contrassegnato come «Pubblicità», come richiesto dalla legge.</p>

      <div className="panel">
        <h2>Nuovo annuncio</h2>
        <AdForm />
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Posizioni</h2>
          <form action={togglePlaceholders}>
            <button className="secondary" type="submit">
              {settings.show_ad_placeholders ? "Nascondi i riquadri «Spazio disponibile»" : "Mostra i riquadri «Spazio disponibile»"}
            </button>
          </form>
        </div>
        <p className="small">Nelle posizioni senza annunci attivi il sito {settings.show_ad_placeholders ? "mostra un riquadro «Spazio pubblicitario disponibile» che porta alla pagina contatti" : "non mostra nulla"}.</p>
        <table className="t">
          <thead><tr><th>Posizione</th><th>Dove</th><th>Formato consigliato</th><th>Annunci attivi</th></tr></thead>
          <tbody>
            {PLACEMENTS.map((p) => {
              const n = ads.filter((a: any) => a.placement === p.slug && a.active).length;
              return <tr key={p.slug}><td><b>{p.name}</b></td><td className="small">{p.where}</td><td className="small">{p.size}</td><td>{n ? <span className="badge pubblicato">{n}</span> : <span className="small">libera</span>}</td></tr>;
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Annunci ({ads.length})</h2>
        {!ads.length && <p className="small">Nessun annuncio caricato.</p>}
        <form action={adAction}>
          <div className="ad-grid">
            {ads.map((a: any) => {
              const yt = a.kind === "youtube" ? youtubeId(a.video_url) : null;
              const expired = a.ends_at && iso(a.ends_at)! < today;
              const ctr = a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0.0";
              return (
                <div key={a.id} className="ad-card" style={{ opacity: a.active && !expired ? 1 : 0.6 }}>
                  <div className="ad-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {yt ? <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" />
                      : a.kind === "video" ? <video src={a.media_id ? `/api/media/${a.media_id}` : a.video_url} muted loop autoPlay playsInline />
                      : <img src={`/api/media/${a.media_id}`} alt="" />}
                  </div>
                  <div style={{ padding: 10 }}>
                    <b>{a.title}</b> {a.active && !expired ? <span className="badge pubblicato">attivo</span> : <span className="badge ritirato">{expired ? "scaduto" : "spento"}</span>}
                    <div className="small">{PLACEMENTS.find((p) => p.slug === a.placement)?.name}{a.advertiser ? ` · ${a.advertiser}` : ""}</div>
                    <div className="small">{a.starts_at || a.ends_at ? `Dal ${iso(a.starts_at) ?? "—"} al ${iso(a.ends_at) ?? "—"}` : "Sempre"} · peso {a.weight}</div>
                    <div className="small">{a.impressions} visualizzazioni · {a.clicks} clic · CTR {ctr}%</div>
                    <div className="actions" style={{ marginTop: 8 }}>
                      <button type="submit" name="op" value={`toggle:${a.id}`} className="secondary">{a.active ? "Spegni" : "Accendi"}</button>
                      <AdEdit initial={{ id: a.id, title: a.title, advertiser: a.advertiser, placement: a.placement, link_url: a.link_url, alt: a.alt, weight: a.weight, starts_at: iso(a.starts_at), ends_at: iso(a.ends_at), active: a.active }} />
                      <ConfirmButton message={`Eliminare definitivamente l'annuncio «${a.title}»?`} name="op" value={`delete:${a.id}`} className="danger">Elimina</ConfirmButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      </div>
    </>
  );
}
