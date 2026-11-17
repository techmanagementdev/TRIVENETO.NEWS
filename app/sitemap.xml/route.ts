import { q } from "@/lib/db";
import { articlePath, siteUrl } from "@/lib/content";
import { CATEGORIES, TERRITORIES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export async function GET() {
  const base = siteUrl();
  const arts = await q<{ slug: string; updated_at: Date }>(`SELECT slug, updated_at FROM articles WHERE status='pubblicato' ORDER BY published_at DESC LIMIT 45000`);
  const statics = ["", "/archivio", "/chi-siamo", "/metodologia", "/contatti", "/rettifiche", ...CATEGORIES.map((c) => `/categoria/${c.slug}`), ...TERRITORIES.filter((t) => t.slug !== "mondo").map((t) => `/territorio/${t.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${statics.map((p) => `<url><loc>${base}${p}</loc><changefreq>hourly</changefreq></url>`).join("\n")}
${arts.map((a) => `<url><loc>${esc(base + articlePath(a.slug))}</loc><lastmod>${new Date(a.updated_at).toISOString()}</lastmod></url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
