import { q } from "@/lib/db";
import { absoluteImageUrl, articlePath, siteUrl } from "@/lib/content";
import { categoryName } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(req: Request) {
  const cat = new URL(req.url).searchParams.get("categoria");
  const base = siteUrl();
  const arts = await q<any>(
    `SELECT id, slug, title, summary, category, image, published_at FROM articles WHERE status='pubblicato' AND ($1::text IS NULL OR category=$1) ORDER BY published_at DESC LIMIT 50`,
    [cat],
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>TRIVENETO.NEWS${cat ? " — " + esc(categoryName(cat)) : ""}</title>
<link>${base}</link>
<description>Notizie dal Nord-Est italiano</description>
<language>it</language>
<atom:link href="${base}/rss.xml${cat ? "?categoria=" + encodeURIComponent(cat) : ""}" rel="self" type="application/rss+xml"/>
${arts
  .map(
    (a: any) => `<item><title>${esc(a.title)}</title><link>${base}${articlePath(a.slug)}</link><guid isPermaLink="true">${base}${articlePath(a.slug)}</guid><pubDate>${new Date(a.published_at).toUTCString()}</pubDate><category>${esc(categoryName(a.category))}</category><description>${esc(a.summary)}</description><media:content url="${esc(absoluteImageUrl(a))}" medium="image"/></item>`,
  )
  .join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
