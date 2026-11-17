import { q } from "./db";
import { scoreEvent } from "./scoring";
import type { Settings } from "./settings";
import { addVec, cosine, jaccard, sharedTerms, shingles, termVector, type Vec } from "./text";

export interface ClusterItem {
  id: number;
  title: string;
  summary: string;
}
export interface ClusterEvent {
  id: number | string; // string = nuovo evento temporaneo
  vector: Vec;
}

export function buildIdf(vectors: Vec[]) {
  const df = new Map<string, number>();
  for (const v of vectors) for (const k of Object.keys(v)) df.set(k, (df.get(k) ?? 0) + 1);
  const N = vectors.length;
  return (t: string) => Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 1;
}

/**
 * Assegna ogni voce all'evento più simile o crea un nuovo evento.
 * Funzione pura: restituisce le assegnazioni e i vettori aggiornati.
 */
export function assignItems(items: ClusterItem[], events: ClusterEvent[], threshold: number) {
  const evs = events.map((e) => ({ ...e, vector: { ...e.vector } }));
  const itemVecs = items.map((i) => termVector(i.title, i.summary));
  const idf = buildIdf([...evs.map((e) => e.vector), ...itemVecs]);
  const assignments: { itemId: number; eventId: number | string; score: number }[] = [];
  let tmp = 0;
  items.forEach((item, idx) => {
    const v = itemVecs[idx];
    let best: (typeof evs)[number] | null = null;
    let bestScore = 0;
    for (const e of evs) {
      if (sharedTerms(v, e.vector) < 2) continue;
      const s = cosine(v, e.vector, idf);
      if (s > bestScore) {
        bestScore = s;
        best = e;
      }
    }
    if (best && bestScore >= threshold) {
      best.vector = addVec(best.vector, v);
      assignments.push({ itemId: item.id, eventId: best.id, score: bestScore });
    } else {
      const id = `new-${tmp++}`;
      evs.push({ id, vector: v });
      assignments.push({ itemId: item.id, eventId: id, score: 1 });
    }
  });
  return { assignments, events: evs };
}

/** Conta le fonti indipendenti: testate diverse con testi non copiati dallo stesso lancio/comunicato. */
export function countIndependent(items: { publisher: string; text: string }[]): number {
  const byPub = new Map<string, string>();
  for (const it of items) {
    const key = it.publisher.toLowerCase().replace(/^www\./, "");
    byPub.set(key, (byPub.get(key) ?? "") + " " + it.text);
  }
  const pubs = [...byPub.entries()].map(([p, t]) => ({ p, sh: shingles(t, 5) }));
  const parent = pubs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < pubs.length; i++)
    for (let j = i + 1; j < pubs.length; j++) {
      if (pubs[i].sh.size >= 6 && pubs[j].sh.size >= 6 && jaccard(pubs[i].sh, pubs[j].sh) > 0.45) parent[find(i)] = find(j);
    }
  return new Set(pubs.map((_, i) => find(i))).size;
}

/** Raggruppa le voci nuove negli eventi e aggiorna punteggi e statistiche. */
export async function clusterNewItems(settings: Settings) {
  const items = await q<ClusterItem & { published_at: Date }>(
    `SELECT id, title, coalesce(summary,'') AS summary, published_at FROM items
     WHERE event_id IS NULL AND fetched_at > now() - interval '48 hours'
     ORDER BY published_at ASC NULLS LAST LIMIT 2000`,
  );
  if (!items.length) return { assigned: 0, created: 0, touched: 0 };
  const events = await q<{ id: number; vector: Vec }>(
    `SELECT id, vector FROM events WHERE last_seen > now() - interval '72 hours' AND status <> 'scartato'`,
  );
  const { assignments } = assignItems(items, events, settings.cluster_threshold);

  const tmpToReal = new Map<string, number>();
  const touched = new Set<number>();
  let created = 0;
  for (const a of assignments) {
    let eventId: number;
    if (typeof a.eventId === "string") {
      if (!tmpToReal.has(a.eventId)) {
        const it = items.find((i) => i.id === a.itemId)!;
        const r = await q<{ id: number }>(`INSERT INTO events (title) VALUES ($1) RETURNING id`, [it.title]);
        tmpToReal.set(a.eventId, r[0].id);
        created++;
      }
      eventId = tmpToReal.get(a.eventId)!;
    } else eventId = a.eventId;
    await q(`UPDATE items SET event_id=$1 WHERE id=$2`, [eventId, a.itemId]);
    touched.add(eventId);
  }
  for (const id of touched) await refreshEvent(id, settings);
  return { assigned: assignments.length, created, touched: touched.size };
}

export async function refreshEvent(eventId: number, settings: Settings) {
  const rows = await q<{
    title: string;
    summary: string | null;
    content: string | null;
    publisher: string | null;
    domain: string | null;
    published_at: Date | null;
    fetched_at: Date;
    territory: string | null;
    category: string | null;
    reliability: number | null;
    is_primary: boolean | null;
  }>(
    `SELECT i.title, i.summary, i.content, i.publisher, i.domain, i.published_at, i.fetched_at,
            s.territory, s.category, s.reliability, s.is_primary
     FROM items i LEFT JOIN sources s ON s.id = i.source_id WHERE i.event_id = $1`,
    [eventId],
  );
  if (!rows.length) return;
  let vector: Vec = {};
  for (const r of rows) vector = addVec(vector, termVector(r.title, r.summary ?? ""));
  const independent = countIndependent(
    rows.map((r) => ({ publisher: r.domain || r.publisher || "?", text: `${r.title} ${r.summary ?? ""} ${(r.content ?? "").slice(0, 1500)}` })),
  );
  const domains = new Set(rows.map((r) => r.domain || r.publisher || "?"));
  const lastSeen = new Date(Math.max(...rows.map((r) => (r.published_at ?? r.fetched_at).getTime())));
  const firstSeen = new Date(Math.min(...rows.map((r) => (r.published_at ?? r.fetched_at).getTime())));
  const best = [...rows].sort((a, b) => (b.reliability ?? 0) - (a.reliability ?? 0))[0];
  const score = scoreEvent(
    {
      text: rows.map((r) => `${r.title}. ${r.summary ?? ""}`).join(" "),
      sourceTerritories: [...new Set(rows.map((r) => r.territory).filter(Boolean) as string[])],
      sourceCategories: rows.map((r) => r.category),
      maxReliability: Math.max(...rows.map((r) => r.reliability ?? 0)),
      independent,
      hasPrimary: rows.some((r) => r.is_primary),
      lastSeen,
    },
    settings,
  );
  const keywords = Object.entries(vector).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);
  await q(
    `UPDATE events SET title=$2, vector=$3::jsonb, source_count=$4, independent_count=$5, has_primary=$6,
       territories=$7, category=$8, sensitive=$9, priority=$10, keywords=$11, last_seen=$12, first_seen=LEAST(first_seen,$13),
       has_update = (has_update OR EXISTS (SELECT 1 FROM articles a WHERE a.event_id=$1 AND a.status='pubblicato' AND $4 > COALESCE(jsonb_array_length(a.sources),0))),
       updated_at=now()
     WHERE id=$1`,
    [eventId, best.title, JSON.stringify(vector), domains.size, independent, rows.some((r) => r.is_primary), score.territories, score.category, score.sensitive, score.priority, keywords, lastSeen, firstSeen],
  );
}
