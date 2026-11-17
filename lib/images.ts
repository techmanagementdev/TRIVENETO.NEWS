import { safeFetchText } from "./net";
import { stripHtml, truncate } from "./text";

export interface ArticleImage {
  kind: "photo" | "card";
  url?: string;
  thumb?: string;
  width?: number;
  height?: number;
  author?: string;
  license?: string;
  license_url?: string;
  source_url?: string;
  provider?: string;
  alt: string;
  repertorio?: boolean;
}

const ALLOWED_LICENSE = /^(cc0|cc by(-sa)? ?\d(\.\d)?( [a-z]{2,})?|public domain|pd)/i;
const EXCLUDE_TITLE = /(logo|stemma|coat of arms|flag|bandiera|map|mappa|locator|diagram|chart|grafico|signature|firma|icon|\.svg|\.gif|\.tif)/i;

/** Cerca una foto di repertorio con licenza libera su Wikimedia Commons. */
export async function findCommonsImage(query: string, alt: string): Promise<ArticleImage | null> {
  if (!query.trim()) return null;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: "15",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: "1280",
    origin: "*",
  });
  const res = await safeFetchText(`https://commons.wikimedia.org/w/api.php?${params}`, { accept: "application/json", minGapMs: 1000 });
  if (res.status >= 400) return null;
  const data = JSON.parse(res.text || "{}");
  const pages: any[] = Object.values(data?.query?.pages ?? {}).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    if (EXCLUDE_TITLE.test(p.title ?? "")) continue;
    if (!/image\/(jpeg|png|webp)/.test(ii.mime ?? "")) continue;
    if ((ii.width ?? 0) < 900 || (ii.width ?? 0) < (ii.height ?? 0)) continue; // orizzontale e di qualità
    const md = ii.extmetadata ?? {};
    const license = stripHtml(md.LicenseShortName?.value ?? "");
    if (!ALLOWED_LICENSE.test(license)) continue;
    if (!md.Artist?.value && !/public domain|cc0|pd/i.test(license)) continue; // serve un autore da attribuire
    return {
      kind: "photo",
      url: ii.thumburl ?? ii.url,
      width: ii.thumbwidth ?? ii.width,
      height: ii.thumbheight ?? ii.height,
      author: truncate(stripHtml(md.Artist?.value ?? "Autore sconosciuto"), 120),
      license,
      license_url: md.LicenseUrl?.value ?? undefined,
      source_url: ii.descriptionurl,
      provider: "Wikimedia Commons",
      alt,
      repertorio: true,
    };
  }
  return null;
}

export async function pickImage(query: string, territoryHint: string, alt: string): Promise<ArticleImage> {
  try {
    const img = (await findCommonsImage(query, alt)) ?? (territoryHint ? await findCommonsImage(territoryHint, alt) : null);
    if (img) return img;
  } catch {
    /* si ripiega sulla grafica */
  }
  return { kind: "card", alt };
}
