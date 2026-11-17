// Posizioni pubblicitarie e formati: modulo senza dipendenze dal database (usabile anche nel browser).

export const PLACEMENTS = [
  { slug: "header", name: "Testata (sotto il menu)", where: "Tutte le pagine, in alto", size: "970×90 o 728×90 (orizzontale)" },
  { slug: "home_top", name: "Home — dopo l'apertura", where: "Home, sotto la notizia principale", size: "970×250 o 728×90" },
  { slug: "home_sidebar", name: "Home — colonna laterale", where: "Home, sotto le ultime notizie", size: "300×250 o 300×600" },
  { slug: "home_middle", name: "Home — tra le sezioni", where: "Home, a metà pagina", size: "970×250 o 728×90" },
  { slug: "article_sidebar", name: "Articolo — colonna laterale", where: "Pagine articolo, a destra (su mobile in fondo)", size: "300×250 o 300×600" },
  { slug: "article_inline", name: "Articolo — dentro il testo", where: "Pagine articolo, dopo il secondo paragrafo", size: "728×90 o 300×250" },
  { slug: "article_bottom", name: "Articolo — fine pezzo", where: "Pagine articolo, prima delle fonti", size: "728×90 o 970×250" },
  { slug: "footer", name: "Piè di pagina", where: "Tutte le pagine, prima del piè di pagina", size: "970×90 o 728×90" },
] as const;
export type Placement = (typeof PLACEMENTS)[number]["slug"];
export const PLACEMENT_SLUGS = PLACEMENTS.map((p) => p.slug) as string[];

export const ALLOWED_MIME: Record<string, number> = {
  "image/png": 5_000_000,
  "image/jpeg": 5_000_000,
  "image/webp": 5_000_000,
  "image/gif": 8_000_000,
  "video/mp4": 20_000_000,
  "video/webm": 20_000_000,
};

/** Estrae l'ID di un video YouTube da un URL (watch, youtu.be, shorts, embed). */
export function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
