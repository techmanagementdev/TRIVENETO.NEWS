import AdForm from "@/components/AdForm";
import ConfirmButton from "@/components/ConfirmButton";
import { PLACEMENTS, youtubeId } from "@/lib/ads";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { adAction, togglePlaceholders } from "../../actions";

export default async function AdsPage() {
  const [ads, settings] = await Promise.all([
    q<any>(`SELECT a.* FROM ads a ORDER BY a.active DESC, a.created_at DESC`),
    getSettings(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <h1>Pubblicità</h1>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="panel">
          <h2>Nuovo annuncio</h2>
          <AdForm />
        </div>
        <div className="panel">
          <h2>I tuoi annunci ({ads.length})</h2>
          {!ads.length && <p className="small">Nessun annuncio. Caricane uno a sinistra: comparirà subito sul sito.</p>}
          <form action={adAction} className="ad-list">
            {ads.map((a: any) => {
              const yt = a.kind === "youtube" ? youtubeId(a.video_url) : null;
              const expired = a.ends_at && new Date(a.ends_at).toISOString().slice(0, 10) < today;
              const on = a.active && !expired;
              return (
                <div key={a.id} className="ad-item" style={{ opacity: on ? 1 : 0.55 }}>
                  <div className="ad-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {yt ? <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" />
                      : a.kind === "video" ? <video src={a.media_id ? `/api/media/${a.media_id}` : a.video_url} muted loop autoPlay playsInline />
                      : <img src={`/api/media/${a.media_id}`} alt="" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <b>{PLACEMENTS.find((p) => p.slug === a.placement)?.name}</b>
                    <div className="small">{a.advertiser || a.title} · {a.impressions} viste · {a.clicks} clic{expired ? " · scaduto" : ""}</div>
                  </div>
                  <div className="actions">
                    <button type="submit" name="op" value={`toggle:${a.id}`} className={on ? "secondary" : "ok"}>{a.active ? "Spegni" : "Accendi"}</button>
                    <ConfirmButton message="Eliminare questo annuncio?" name="op" value={`delete:${a.id}`} className="danger">Elimina</ConfirmButton>
                  </div>
                </div>
              );
            })}
          </form>
          <form action={togglePlaceholders} style={{ marginTop: 14 }}>
            <button type="submit" className="link-btn">
              {settings.show_ad_placeholders ? "Nascondi i riquadri «Spazio disponibile» sul sito" : "Mostra i riquadri «Spazio disponibile» sul sito"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
