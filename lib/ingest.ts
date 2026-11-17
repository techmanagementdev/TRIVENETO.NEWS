import Parser from "rss-parser";
import { q } from "./db";
import { safeFetchText } from "./net";
import { canonicalUrl, domainOf, normalize, sha1, stripHtml, truncate } from "./text";

export interface SourceRow {
  id: number;
  name: string;
  url: string;
  kind: "rss" | "gdelt";
  territory: string;
  category: string | null;
  reliability: number;
  is_primary: boolean;
}

export interface FeedEntry {
  url: string;
  title: string;
  summary: string;
  publishedAt: Date | null;
  publisher: string | null;
}

const parser = new Parser({ timeout: 15000 });

export async function readRss(url: string): Promise<FeedEntry[]> {
  const res = await safeFetchText(url, { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" });
  if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
  const feed = await parser.parseString(res.text);
  return (feed.items ?? [])
    .filter((i) => i.link && i.title)
    .map((i) => ({
      url: i.link!.trim(),
      title: stripHtml(i.title!),
      summary: truncate(stripHtml(i.contentSnippet || i.content || i.summary || ""), 1200),
      publishedAt: i.isoDate ? new Date(i.isoDate) : i.pubDate ? new Date(i.pubDate) : null,
      publisher: null,
    }));
}

export async function readGdelt(url: string): Promise<FeedEntry[]> {
  // GDELT chiede al massimo una richiesta ogni 5 secondi
  let res = await safeFetchText(url, { accept: "application/json", minGapMs: 10000, timeoutMs: 40000 });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 20000));
    res = await safeFetchText(url, { accept: "application/json", minGapMs: 10000, timeoutMs: 40000 });
  }
  if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
  let data: any;
  try {
    data = JSON.parse(res.text || "{}");
  } catch {
    throw new Error("Risposta GDELT non valida: " + truncate(res.text, 120));
  }
  const arts: any[] = data.articles ?? [];
  return arts
    .filter((a) => a.url && a.title)
    .map((a) => ({
      url: a.url,
      title: stripHtml(a.title),
      summary: "",
      publishedAt: parseGdeltDate(a.seendate),
      publisher: a.domain ?? null,
    }));
}

function parseGdeltDate(s?: string): Date | null {
  const m = s?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])) : null;
}

/** Scarica una fonte e salva le voci nuove. Restituisce gli id delle voci inserite. */
export async function ingestSource(src: SourceRow): Promise<number[]> {
  const entries = src.kind === "gdelt" ? await readGdelt(src.url) : await readRss(src.url);
  const maxAgeMs = 48 * 3600_000;
  const ids: number[] = [];
  for (const e of entries.slice(0, 100)) {
    if (e.publishedAt && Date.now() - e.publishedAt.getTime() > maxAgeMs) continue;
    if (e.publishedAt && e.publishedAt.getTime() > Date.now() + 3600_000) e.publishedAt = new Date();
    const canon = canonicalUrl(e.url);
    const domain = domainOf(e.url);
    const titleHash = sha1(normalize(e.title));
    const rows = await q<{ id: number }>(
      `INSERT INTO items (source_id, url, url_hash, title, title_hash, summary, publisher, domain, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (url_hash) DO NOTHING RETURNING id`,
      [src.id, e.url, sha1(canon), truncate(e.title, 400), titleHash, e.summary || null, e.publisher ?? src.name, domain, e.publishedAt ?? new Date()],
    );
    if (rows[0]) ids.push(rows[0].id);
  }
  return ids;
}
