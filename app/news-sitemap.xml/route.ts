import { q } from "@/lib/db";
import { articlePath, siteUrl } from "@/lib/content";

export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// News sitemap: solo articoli delle ultime 48 ore (requisito Google News).
export async function GET() {
  const base = siteUrl();
  const arts = await q<{ slug: string; title: string; published_at: Date }>(
    `SELECT slug, title, published_at FROM articles WHERE status='pubblicato' AND published_at > now() - interval '48 hours' ORDER BY published_at DESC LIMIT 1000`,
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${arts
  .map(
    (a) => `<url><loc>${esc(base + articlePath(a.slug))}</loc><news:news><news:publication><news:name>TRIVENETO.NEWS</news:name><news:language>it</news:language></news:publication><news:publication_date>${new Date(a.published_at).toISOString()}</news:publication_date><news:title>${esc(a.title)}</news:title></news:news></url>`,
  )
  .join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
