import { aiConfigured, generateArticle, monthSpendUsd, PROMPT_VERSION, type ArticleDraft, type SourceForAI } from "./ai";
import { clusterNewItems } from "./cluster";
import { q, q1 } from "./db";
import { fetchEventContents } from "./extract";
import { pickImage } from "./images";
import { ingestSource, type SourceRow } from "./ingest";
import { getSettings, setSetting, type Settings } from "./settings";
import { LOCAL_TERRITORIES, territoryName } from "./taxonomy";
import { cosine, overlapRatio, slugify, termVector, truncate } from "./text";

const log = (...a: unknown[]) => console.log(new Date().toISOString(), "[pipeline]", ...a);

// ---------------- Raccolta ----------------

export async function ingestAll(): Promise<{ sources: number; newItems: number; errors: number }> {
  const sources = await q<SourceRow>(`SELECT * FROM sources WHERE active ORDER BY kind DESC, id`);
  let newItems = 0,
    errors = 0;
  // fonti RSS in parallelo (a gruppi), GDELT in sequenza (limite di frequenza)
  const rss = sources.filter((s) => s.kind === "rss");
  // GDELT limita molto la frequenza: al massimo una consultazione all'ora per query
  const gd = sources.filter(
    (s: any) => s.kind === "gdelt" && (!s.last_fetched_at || Date.now() - new Date(s.last_fetched_at).getTime() > 55 * 60_000),
  );
  const run = async (s: SourceRow) => {
    try {
      const ids = await ingestSource(s);
      newItems += ids.length;
      await q(`UPDATE sources SET last_fetched_at=now(), last_ok_at=now(), last_error=NULL, error_count=0, items_found=items_found+$2 WHERE id=$1`, [s.id, ids.length]);
    } catch (e: any) {
      errors++;
      await q(`UPDATE sources SET last_fetched_at=now(), last_error=$2, error_count=error_count+1 WHERE id=$1`, [s.id, String(e?.message ?? e).slice(0, 300)]);
    }
  };
  for (let i = 0; i < rss.length; i += 6) await Promise.all(rss.slice(i, i + 6).map(run));
  for (const s of gd) await run(s);
  return { sources: sources.length, newItems, errors };
}

// ---------------- Generazione ----------------

interface EventRow {
  id: number;
  title: string;
  category: string;
  territories: string[];
  priority: number;
  independent_count: number;
  has_primary: boolean;
  sensitive: boolean;
  status: string;
}

async function buildSources(eventId: number): Promise<{ list: SourceForAI[]; fullTexts: string[]; okCount: number }> {
  const rows = await q<{
    title: string; summary: string | null; content: string | null; content_status: string; url: string;
    publisher: string | null; domain: string | null; published_at: Date | null; is_primary: boolean | null; reliability: number | null; source_name: string | null;
  }>(
    `SELECT i.title, i.summary, i.content, i.content_status, i.url, i.publisher, i.domain, i.published_at, s.is_primary, s.reliability, s.name AS source_name
     FROM items i LEFT JOIN sources s ON s.id=i.source_id WHERE i.event_id=$1
     ORDER BY (i.content_status='ok') DESC, s.is_primary DESC NULLS LAST, s.reliability DESC NULLS LAST, i.published_at ASC`,
    [eventId],
  );
  const seen = new Set<string>();
  const list: SourceForAI[] = [];
  const fullTexts: string[] = [];
  let okCount = 0;
  for (const r of rows) {
    const key = r.domain || r.publisher || r.url;
    if (seen.has(key)) continue;
    seen.add(key);
    const ok = r.content_status === "ok" && r.content;
    if (ok) okCount++;
    const text = ok ? truncate(r.content!, 3500) : (r.summary ?? "(solo titolo disponibile)");
    if (ok) fullTexts.push(r.content!);
    else if (r.summary) fullTexts.push(r.summary);
    list.push({
      n: list.length + 1,
      publisher: r.source_name && !/^GDELT/.test(r.source_name) ? r.source_name : (r.publisher || r.domain || "Fonte"),
      title: r.title,
      date: (r.published_at ?? new Date()).toISOString(),
      url: r.url,
      text,
      primary: Boolean(r.is_primary),
    });
    if (list.length >= 6) break;
  }
  return { list, fullTexts, okCount };
}

async function uniqueSlug(base: string, eventId: number, articleId?: number) {
  let slug = slugify(base) || `notizia-${eventId}`;
  const clash = await q1(`SELECT id FROM articles WHERE slug=$1 AND ($2::bigint IS NULL OR id<>$2)`, [slug, articleId ?? null]);
  if (clash) slug = `${slug}-${eventId}`;
  return slug;
}

async function possibleDuplicate(title: string, body: string, eventId: number): Promise<string | null> {
  const recent = await q<{ title: string; summary: string; slug: string }>(
    `SELECT title, summary, slug FROM articles WHERE status IN ('pubblicato','pronto') AND (event_id IS NULL OR event_id<>$1) AND created_at > now() - interval '72 hours'`,
    [eventId],
  );
  const v = termVector(title, body.slice(0, 600));
  for (const r of recent) if (cosine(v, termVector(r.title, r.summary)) > 0.55) return r.slug;
  return null;
}

export interface GenerateResult {
  outcome: "creato" | "aggiornato" | "scartato" | "in_attesa" | "saltato";
  note?: string;
  articleId?: number;
}

export async function generateForEvent(eventId: number, settings: Settings, opts: { update?: boolean } = {}): Promise<GenerateResult> {
  if (!aiConfigured()) return { outcome: "saltato", note: "ANTHROPIC_API_KEY non configurata" };
  const ev = await q1<EventRow>(`SELECT * FROM events WHERE id=$1`, [eventId]);
  if (!ev) return { outcome: "saltato", note: "evento inesistente" };
  const existing = await q1<{ id: number; slug: string; title: string; body_md: string; status: string; published_at: Date | null }>(
    `SELECT id, slug, title, body_md, status, published_at FROM articles WHERE event_id=$1`,
    [eventId],
  );
  if (existing && !opts.update) return { outcome: "saltato", note: "articolo già presente" };

  await fetchEventContents(eventId, 4);
  const { list, fullTexts, okCount } = await buildSources(eventId);
  const totalChars = list.reduce((a, s) => a + s.text.length, 0);
  if ((okCount === 0 && !ev.has_primary) || totalChars < 700) {
    await q(`UPDATE events SET status='in_attesa', status_note=$2, updated_at=now() WHERE id=$1`, [eventId, "Testi delle fonti insufficienti: si attendono altre fonti"]);
    return { outcome: "in_attesa", note: "testi insufficienti" };
  }

  const maxTokens = settings.max_tokens_per_article;
  let draft: ArticleDraft = await generateArticle(list, {
    eventId,
    maxTokens,
    previous: existing && opts.update ? { title: existing.title, body: existing.body_md } : undefined,
  });
  // l'AI non ha scritto un articolo completo (di solito: fonti insufficienti): si attendono altre fonti
  if (draft.corpo_markdown.length < 200 || draft.titolo.length < 10 || draft.sommario.length < 20) {
    await q(`UPDATE events SET status='in_attesa', status_note=$2, updated_at=now() WHERE id=$1`, [
      eventId,
      `In attesa di altre fonti: ${draft.motivo_non_pubblicabile || "informazioni insufficienti per un articolo completo"}`.slice(0, 500),
    ]);
    return { outcome: "in_attesa", note: "testo non generato" };
  }
  let sim = Math.max(0, ...fullTexts.map((t) => overlapRatio(draft.corpo_markdown, t)));
  if (sim > settings.similarity_max) {
    draft = await generateArticle(list, {
      eventId,
      maxTokens,
      feedback: `La bozza precedente riprendeva troppe frasi delle fonti (${Math.round(sim * 100)}% di sequenze in comune). Riscrivi con struttura e parole completamente nuove.`,
    });
    sim = Math.max(0, ...fullTexts.map((t) => overlapRatio(draft.corpo_markdown, t)));
  }

  const isLocal = draft.territori.some((t) => LOCAL_TERRITORIES.includes(t as any)) || ev.territories.some((t) => LOCAL_TERRITORIES.includes(t as any));
  const analysis = {
    prompt: PROMPT_VERSION,
    impatto: draft.impatto_triveneto,
    motivazione_impatto: draft.motivazione_impatto,
    fatti_confermati: draft.fatti_confermati,
    discrepanze: draft.discrepanze,
    discrepanze_essenziali: draft.discrepanze_essenziali,
    ipotesi: draft.ipotesi_non_verificate,
    sensibile: draft.sensibile,
    motivo_sensibile: draft.motivo_sensibile,
    pubblicabile: draft.pubblicabile,
    motivo_non_pubblicabile: draft.motivo_non_pubblicabile,
    similarita: sim,
  };

  if (!existing && !isLocal && draft.impatto_triveneto < 45) {
    await q(`UPDATE events SET status='scartato', status_note=$2, analysis=$3::jsonb, updated_at=now() WHERE id=$1`, [
      eventId,
      `Impatto sul Triveneto basso (${draft.impatto_triveneto}): ${draft.motivazione_impatto}`,
      JSON.stringify(analysis),
    ]);
    return { outcome: "scartato", note: "impatto basso" };
  }

  const reasons: string[] = [];
  if (!draft.pubblicabile) reasons.push(`Non pubblicabile secondo l'analisi: ${draft.motivo_non_pubblicabile || "fatti non confermati"}`);
  if (draft.sensibile || ev.sensitive) reasons.push(`Tema sensibile: ${draft.motivo_sensibile || "parole chiave sensibili"}`);
  if (draft.discrepanze_essenziali) reasons.push(`Discrepanze tra fonti su fatti essenziali (${draft.discrepanze.length})`);
  if (sim > settings.similarity_max) reasons.push(`Testo troppo simile a una fonte (${Math.round(sim * 100)}%)`);
  if (ev.independent_count < settings.min_independent_sources && !ev.has_primary) reasons.push(`Solo ${ev.independent_count} fonte indipendente`);
  const dup = await possibleDuplicate(draft.titolo, draft.corpo_markdown, eventId);
  if (dup) reasons.push(`Possibile duplicato di /notizie/${dup}`);
  if (!isLocal && draft.impatto_triveneto < 60) reasons.push(`Impatto sul Triveneto da valutare (${draft.impatto_triveneto})`);

  const canAuto =
    settings.publish_mode !== "manuale" &&
    settings.auto_rules_approved &&
    reasons.length === 0 &&
    (settings.publish_mode === "automatica" || settings.auto_categories.includes(draft.categoria));

  const firstTerritory = draft.territori.find((t) => LOCAL_TERRITORIES.includes(t as any));
  const image = await pickImage(draft.query_immagine, firstTerritory ? territoryName(firstTerritory).split("-")[0] : "", draft.titolo);
  const sources = list.map((s) => ({ n: s.n, publisher: s.publisher, title: s.title, url: s.url, date: s.date }));

  if (existing) {
    const slug = existing.slug;
    await q(
      `UPDATE articles SET title=$2, summary=$3, body_md=$4, category=$5, territories=$6, tags=$7, meta_title=$8, meta_description=$9,
         social_text=$10, sources=$11::jsonb, review_reasons=$12, similarity_max=$13, update_note=$14, updated_at=now(),
         image = CASE WHEN image IS NULL OR image->>'kind'='card' THEN $15::jsonb ELSE image END
       WHERE id=$1`,
      [existing.id, draft.titolo, draft.sommario, draft.corpo_markdown, draft.categoria, draft.territori, draft.tag.slice(0, 6), draft.meta_title,
        draft.meta_description, draft.testo_social, JSON.stringify(sources), reasons, sim, "Articolo aggiornato con nuove informazioni", JSON.stringify(image)],
    );
    await q(`UPDATE events SET has_update=false, status='generato', analysis=$2::jsonb, updated_at=now() WHERE id=$1`, [eventId, JSON.stringify(analysis)]);
    log("articolo aggiornato", slug);
    return { outcome: "aggiornato", articleId: existing.id };
  }

  const slug = await uniqueSlug(draft.slug || draft.titolo, eventId);
  const status = !draft.pubblicabile ? "bozza" : canAuto ? "pubblicato" : "pronto";
  const r = await q<{ id: number }>(
    `INSERT INTO articles (event_id, slug, title, summary, body_md, category, territories, tags, meta_title, meta_description, social_text,
       sources, image, status, needs_review, review_reasons, similarity_max, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18) RETURNING id`,
    [eventId, slug, draft.titolo, draft.sommario, draft.corpo_markdown, draft.categoria, draft.territori, draft.tag.slice(0, 6), draft.meta_title,
      draft.meta_description, draft.testo_social, JSON.stringify(sources), JSON.stringify(image), status, status !== "pubblicato", reasons, sim,
      status === "pubblicato" ? new Date() : null],
  );
  await q(`UPDATE events SET status='generato', status_note=NULL, analysis=$2::jsonb, updated_at=now() WHERE id=$1`, [eventId, JSON.stringify(analysis)]);
  log(`articolo ${status}`, slug, reasons.length ? `(${reasons.join("; ")})` : "");
  log(`  ↳ ${draft.categoria} | ${draft.territori.join(",")} | fonti ${list.length} | somiglianza ${Math.round(sim * 100)}% | immagine ${image.kind} | ${draft.titolo} — ${draft.sommario.slice(0, 200)}`);
  return { outcome: "creato", articleId: r[0].id, note: status };
}

export async function generateBatch(settings: Settings) {
  const stats = { generated: 0, waiting: 0, discarded: 0, errors: 0, skipped: "" };
  if (!aiConfigured()) {
    stats.skipped = "ANTHROPIC_API_KEY non configurata";
    return stats;
  }
  const today = await q1<{ n: number }>(`SELECT count(*)::int AS n FROM articles WHERE created_at >= date_trunc('day', now())`);
  let remaining = Math.min(settings.max_articles_per_run, settings.max_articles_per_day - (today?.n ?? 0));
  if (remaining <= 0) {
    stats.skipped = "limite giornaliero raggiunto";
    return stats;
  }
  const candidates = await q<{ id: number }>(
    `SELECT e.id FROM events e
     WHERE e.status IN ('nuovo','in_attesa') AND e.priority >= $1
       AND (e.independent_count >= $2 OR e.has_primary
            OR (e.priority >= $1 + 5 AND EXISTS (SELECT 1 FROM items i JOIN sources s ON s.id=i.source_id WHERE i.event_id=e.id AND s.reliability >= 5)))
       AND e.last_seen > now() - interval '36 hours'
       AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.event_id=e.id)
       AND (e.status='nuovo' OR e.updated_at < now() - interval '30 minutes')
     ORDER BY e.priority DESC, e.independent_count DESC, e.last_seen DESC LIMIT 20`,
    [settings.min_priority, settings.min_independent_sources],
  );
  for (const c of candidates) {
    if (remaining <= 0) break;
    const spent = await monthSpendUsd();
    if (spent >= settings.monthly_budget_usd) {
      stats.skipped = `budget mensile raggiunto (${spent.toFixed(2)} USD)`;
      break;
    }
    try {
      const r = await generateForEvent(c.id, settings);
      if (r.outcome === "creato") {
        stats.generated++;
        remaining--;
      } else if (r.outcome === "in_attesa") stats.waiting++;
      else if (r.outcome === "scartato") stats.discarded++;
    } catch (e: any) {
      stats.errors++;
      await q(`UPDATE events SET status='errore', status_note=$2, updated_at=now() WHERE id=$1`, [c.id, String(e?.message ?? e).slice(0, 300)]);
      log("errore generazione evento", c.id, e?.message ?? e);
    }
  }
  return stats;
}

// ---------------- Ciclo completo ----------------

export async function runCycle(trigger: "scheduler" | "manuale" = "scheduler") {
  const run = await q1<{ id: number }>(`INSERT INTO job_runs (kind, stats) VALUES ('ciclo', $1::jsonb) RETURNING id`, [JSON.stringify({ trigger })]);
  const stats: Record<string, unknown> = { trigger };
  try {
    const settings = await getSettings();
    if (settings.run_requested) await setSetting("run_requested", false);
    stats.ingest = await ingestAll();
    const failing = await q<{ name: string; last_error: string; error_count: number }>(
      `SELECT name, last_error, error_count FROM sources WHERE active AND error_count > 0 ORDER BY name`,
    );
    for (const f of failing) log(`fonte in errore: ${f.name} (${f.error_count}×) — ${f.last_error}`);
    stats.cluster = await clusterNewItems(settings);
    stats.generate = await generateBatch(settings);
    stats.articoli = await q1(`SELECT count(*) FILTER (WHERE status='pubblicato')::int AS pubblicati, count(*) FILTER (WHERE status='pronto')::int AS da_approvare FROM articles`);
    await q(`UPDATE job_runs SET finished_at=now(), status='ok', stats=$2::jsonb WHERE id=$1`, [run!.id, JSON.stringify(stats)]);
    log("ciclo completato", JSON.stringify(stats));
  } catch (e: any) {
    await q(`UPDATE job_runs SET finished_at=now(), status='errore', stats=$2::jsonb, error=$3 WHERE id=$1`, [run!.id, JSON.stringify(stats), String(e?.stack ?? e).slice(0, 2000)]);
    log("ciclo fallito", e);
  }
  return stats;
}
