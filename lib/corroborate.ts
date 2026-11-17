// Ricerca attiva di altre testate che riportano la stessa notizia (Claude API, strumento di ricerca web).
import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, costUsd } from "./ai";
import { refreshEvent } from "./cluster";
import { q, q1 } from "./db";
import { extractArticle } from "./extract";
import type { Settings } from "./settings";
import { canonicalUrl, domainOf, normalize, sha1, sharedTerms, termVector, truncate } from "./text";

const log = (...a: unknown[]) => console.log(new Date().toISOString(), "[ricerca]", ...a);

// Siti che non sono testate giornalistiche o aggregatori senza testo proprio
const EXCLUDED = [
  "news.google.com", "google.com", "msn.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com",
  "tiktok.com", "linkedin.com", "wikipedia.org", "reddit.com", "virgilio.it", "libero.it", "yahoo.com", "bing.com",
];
const SEARCH_PRICE_USD = 0.01; // costo per ricerca web (10 $ ogni 1000 ricerche)

export interface EnrichResult { found: number; added: number; note: string }

export async function enrichEvent(eventId: number, settings: Settings): Promise<EnrichResult> {
  if (!aiConfigured()) return { found: 0, added: 0, note: "chiave AI mancante" };
  const ev = await q1<{ title: string; vector: Record<string, number> }>(`SELECT title, vector FROM events WHERE id=$1`, [eventId]);
  if (!ev) return { found: 0, added: 0, note: "evento inesistente" };
  const items = await q<{ url: string; domain: string | null; summary: string | null }>(`SELECT url, domain, summary FROM items WHERE event_id=$1`, [eventId]);
  const known = new Set(items.map((i) => (i.domain || domainOf(i.url)).replace(/^www\./, "")));
  const src = await q1<{ id: number }>(`SELECT id FROM sources WHERE kind='search' LIMIT 1`);
  const summary = items.find((i) => i.summary)?.summary ?? "";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.LLM_SEARCH_MODEL || "claude-haiku-5-5";
  let res: Anthropic.Message;
  try {
    res = await client.messages.create({
      model,
      max_tokens: 600,
      tools: [{
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 2,
        blocked_domains: [...known, ...EXCLUDED].slice(0, 50),
        user_location: { type: "approximate", country: "IT", timezone: "Europe/Rome" },
      }],
      messages: [{
        role: "user",
        content: `Cerca articoli di altre testate giornalistiche (italiane o internazionali) pubblicati negli ultimi giorni che riportano questa stessa notizia. Fai al massimo due ricerche brevi in italiano con i nomi propri e i luoghi principali. Non serve rispondere con un testo.\n\nNOTIZIA: ${ev.title}\n${truncate(summary, 400)}`,
      }],
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 200);
    await q(`UPDATE events SET enriched_at=now(), enrich_note=$2 WHERE id=$1`, [eventId, `Ricerca non riuscita: ${msg}`]);
    log("errore ricerca evento", eventId, msg);
    return { found: 0, added: 0, note: msg };
  }
  const searches = (res.usage as any)?.server_tool_use?.web_search_requests ?? 0;
  await q(`INSERT INTO ai_usage (model, purpose, event_id, input_tokens, output_tokens, cost_usd) VALUES ($1,'ricerca fonti',$2,$3,$4,$5)`, [
    model, eventId, res.usage.input_tokens, res.usage.output_tokens, costUsd(res.usage.input_tokens, res.usage.output_tokens) + searches * SEARCH_PRICE_USD,
  ]);

  // risultati della ricerca
  const results: { url: string; title: string }[] = [];
  for (const b of res.content as any[]) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      for (const r of b.content) if (r.type === "web_search_result" && r.url) results.push({ url: r.url, title: r.title ?? "" });
    }
  }
  // solo risultati davvero sulla stessa notizia, da testate nuove, uno per testata
  const evVec = ev.vector && Object.keys(ev.vector).length ? ev.vector : termVector(ev.title);
  const seen = new Set(known);
  const picked = results.filter((r) => {
    const d = domainOf(r.url);
    if (!d || seen.has(d) || EXCLUDED.some((x) => d.endsWith(x))) return false;
    if (sharedTerms(termVector(r.title), evVec) < 2) return false;
    seen.add(d);
    return true;
  }).slice(0, 5);

  let added = 0;
  for (const r of picked) {
    const ex = await extractArticle(r.url);
    const title = truncate(r.title || ev.title, 400);
    const rows = await q<{ id: number }>(
      `INSERT INTO items (source_id, event_id, url, url_hash, title, title_hash, summary, content, content_status, publisher, domain, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()) ON CONFLICT (url_hash) DO NOTHING RETURNING id`,
      [src?.id ?? null, eventId, r.url, sha1(canonicalUrl(r.url)), title, sha1(normalize(title)),
        ex.text ? truncate(ex.text, 600) : null, ex.status === "ok" ? ex.text : null, ex.status, domainOf(r.url), domainOf(r.url)],
    );
    if (rows[0]) added++;
  }
  const note = `Ricerca web: ${results.length} risultati, ${picked.length} pertinenti, ${added} fonti aggiunte`;
  await q(`UPDATE events SET enriched_at=now(), enrich_note=$2 WHERE id=$1`, [eventId, note]);
  if (added) await refreshEvent(eventId, settings);
  log(`evento ${eventId}: ${note}`);
  return { found: results.length, added, note };
}

/** Cerca altre fonti per gli eventi più rilevanti che hanno poche fonti indipendenti. */
export async function enrichBatch(settings: Settings, limit = 6) {
  if (!aiConfigured()) return { enriched: 0, added: 0 };
  const evs = await q<{ id: number }>(
    `SELECT id FROM events
     WHERE status IN ('nuovo','in_attesa') AND priority >= $1 AND independent_count < 3
       AND last_seen > now() - interval '36 hours'
       AND (enriched_at IS NULL OR enriched_at < now() - interval '6 hours')
       AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.event_id = events.id)
     ORDER BY priority DESC, last_seen DESC LIMIT $2`,
    [settings.min_priority, limit],
  );
  let added = 0;
  for (const e of evs) added += (await enrichEvent(e.id, settings)).added;
  return { enriched: evs.length, added };
}
