import Link from "next/link";
import { pickAd, PLACEMENTS, youtubeId } from "@/lib/ads";
import { getSettings } from "@/lib/settings";

const TALL = ["home_sidebar", "article_sidebar"];

export default async function AdSlot({ placement }: { placement: string }) {
  const [ad, settings] = await Promise.all([pickAd(placement).catch(() => null), getSettings().catch(() => null)]);
  const tall = TALL.includes(placement);
  if (!ad) {
    if (!settings?.show_ad_placeholders) return null;
    const p = PLACEMENTS.find((x) => x.slug === placement);
    return (
      <div className={`ad ad-${placement}`}>
        <Link href="/contatti" className={`ad-placeholder${tall ? " tall" : ""}`}>
          <b>Spazio pubblicitario disponibile</b>
          <span>{p?.size} · Contattaci</span>
        </Link>
      </div>
    );
  }
  const href = ad.link_url ? `/api/ad/${ad.id}/click` : undefined;
  const yt = ad.kind === "youtube" ? youtubeId(ad.video_url) : null;
  let media: React.ReactNode = null;
  if (yt) {
    media = (
      <div className="ad-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt}?mute=1&autoplay=1&loop=1&playlist=${yt}&controls=0&modestbranding=1&rel=0`}
          title={ad.alt || ad.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
        />
      </div>
    );
  } else if (ad.kind === "video" && (ad.media_id || ad.video_url)) {
    const src = ad.media_id ? `/api/media/${ad.media_id}` : ad.video_url!;
    media = <video src={src} autoPlay muted loop playsInline preload="metadata" aria-label={ad.alt || ad.title} />;
  } else if (ad.media_id) {
    // eslint-disable-next-line @next/next/no-img-element
    media = <img src={`/api/media/${ad.media_id}`} alt={ad.alt || ad.advertiser || ad.title} loading="lazy" />;
  }
  if (!media) return null;
  return (
    <aside className={`ad ad-${placement}`} aria-label="Pubblicità">
      <div className="ad-label">Pubblicità{ad.advertiser ? ` · ${ad.advertiser}` : ""}</div>
      {href && !yt ? (
        <a href={href} target="_blank" rel="sponsored noopener" className="ad-media">{media}</a>
      ) : (
        <div className="ad-media">
          {media}
          {href && <a href={href} target="_blank" rel="sponsored noopener" className="ad-cta">Scopri di più →</a>}
        </div>
      )}
    </aside>
  );
}
