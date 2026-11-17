import { q } from "./db";
export * from "./ad-placements";

export interface AdRow {
  id: number;
  title: string;
  advertiser: string | null;
  placement: string;
  kind: "image" | "video" | "youtube";
  media_id: number | null;
  media_mime: string | null;
  video_url: string | null;
  link_url: string | null;
  alt: string | null;
  weight: number;
}

/** Sceglie un annuncio attivo per la posizione (rotazione pesata) e conta l'impressione. */
export async function pickAd(placement: string): Promise<AdRow | null> {
  const rows = await q<AdRow>(
    `SELECT a.id, a.title, a.advertiser, a.placement, a.kind, a.media_id, m.mime AS media_mime, a.video_url, a.link_url, a.alt, a.weight
     FROM ads a LEFT JOIN media m ON m.id = a.media_id
     WHERE a.active AND a.placement = $1
       AND (a.starts_at IS NULL OR a.starts_at <= (now() AT TIME ZONE 'Europe/Rome')::date)
       AND (a.ends_at IS NULL OR a.ends_at >= (now() AT TIME ZONE 'Europe/Rome')::date)`,
    [placement],
  );
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * total;
  const chosen = rows.find((r) => (n -= r.weight) < 0) ?? rows[0];
  q(`UPDATE ads SET impressions = impressions + 1 WHERE id = $1`, [chosen.id]).catch(() => {});
  return chosen;
}

