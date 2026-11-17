import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { q } from "./db";
import { robotsAllowed, safeFetchText } from "./net";
import { truncate } from "./text";

/** Estrae il testo principale di una pagina, rispettando robots.txt. Nessun aggiramento di paywall. */
export async function extractArticle(url: string): Promise<{ status: "ok" | "robots" | "error" | "short"; text?: string; error?: string }> {
  if (/news\.google\.com/.test(url)) return { status: "error", error: "link aggregatore" };
  try {
    if (!(await robotsAllowed(url))) return { status: "robots" };
    const res = await safeFetchText(url, { accept: "text/html,application/xhtml+xml", maxBytes: 4_000_000 });
    if (res.status >= 400) return { status: "error", error: `HTTP ${res.status}` };
    if (!/html/i.test(res.contentType)) return { status: "error", error: "non HTML" };
    const { document } = parseHTML(res.text);
    const art = new Readability(document as any, { charThreshold: 300 }).parse();
    const text = (art?.textContent ?? "").replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 400) return { status: "short", text };
    return { status: "ok", text: truncate(text, 12000) };
  } catch (e: any) {
    return { status: "error", error: String(e?.message ?? e).slice(0, 200) };
  }
}

/** Scarica i testi completi delle migliori voci di un evento (massimo `limit`). */
export async function fetchEventContents(eventId: number, limit = 4) {
  const rows = await q<{ id: number; url: string; content_status: string }>(
    `SELECT i.id, i.url, i.content_status FROM items i LEFT JOIN sources s ON s.id=i.source_id
     WHERE i.event_id=$1 ORDER BY (i.content_status='ok') DESC, s.is_primary DESC NULLS LAST, s.reliability DESC NULLS LAST, i.published_at DESC
     LIMIT 8`,
    [eventId],
  );
  let ok = rows.filter((r) => r.content_status === "ok").length;
  const seenDomains = new Set<string>();
  for (const r of rows) {
    if (ok >= limit) break;
    if (r.content_status !== "pending") continue;
    const d = new URL(r.url).hostname;
    if (seenDomains.has(d)) continue;
    seenDomains.add(d);
    const res = await extractArticle(r.url);
    await q(`UPDATE items SET content=$2, content_status=$3 WHERE id=$1`, [r.id, res.text ?? null, res.status]);
    if (res.status === "ok") ok++;
  }
  return ok;
}
