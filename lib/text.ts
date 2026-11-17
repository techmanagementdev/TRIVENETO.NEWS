import crypto from "node:crypto";

export function sha1(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#8217;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(
  (
    "il lo la i gli le un uno una di a da in con su per tra fra e ed o od ma se che chi cui non piu meno come anche " +
    "del dello della dei degli delle al allo alla ai agli alle dal dallo dalla dai dagli dalle nel nello nella nei negli " +
    "nelle sul sullo sulla sui sugli sulle col coi questo questa questi queste quello quella quelli quelle suo sua suoi " +
    "sue loro nostro nostra essere stato stata stati sono sara sarebbe era erano ha hanno avere aveva fatto fare dopo " +
    "prima oggi ieri domani ora anni anno mese giorno giorni nuovo nuova nuovi nuove grande primo prima secondo tutto " +
    "tutti tutte molto ancora gia solo sempre mai dove quando perche cosa due tre quattro cinque dice detto via ecco " +
    "video foto news notizie ultime ultima ora live diretta aggiornamento the of and to for on with at by from is are " +
    "was were be has have this that will its it as an or not new after over says said ansa"
  ).split(" "),
);

export function stem(t: string) {
  // stemming leggero: tronca a 6 caratteri (gestisce plurali e suffissi comuni in italiano)
  return t.length > 6 ? t.slice(0, 6) : t;
}

export function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t))
    .map(stem);
}

export type Vec = Record<string, number>;

export function termVector(title: string, summary = ""): Vec {
  const v: Vec = {};
  for (const t of tokens(title)) v[t] = (v[t] ?? 0) + 2;
  for (const t of tokens(summary).slice(0, 60)) v[t] = (v[t] ?? 0) + 1;
  return v;
}

export function addVec(a: Vec, b: Vec, cap = 80): Vec {
  const out: Vec = { ...a };
  for (const [k, w] of Object.entries(b)) out[k] = (out[k] ?? 0) + w;
  const entries = Object.entries(out).sort((x, y) => y[1] - x[1]).slice(0, cap);
  return Object.fromEntries(entries);
}

export function cosine(a: Vec, b: Vec, idf?: (t: string) => number): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const w = (t: string) => (idf ? idf(t) : 1);
  for (const [k, x] of Object.entries(a)) {
    const wx = x * w(k);
    na += wx * wx;
    const y = b[k];
    if (y) dot += wx * y * w(k);
  }
  for (const [k, y] of Object.entries(b)) {
    const wy = y * w(k);
    nb += wy * wy;
  }
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

export function sharedTerms(a: Vec, b: Vec) {
  let n = 0;
  for (const k of Object.keys(a)) if (b[k]) n++;
  return n;
}

export function shingles(text: string, n = 8): Set<string> {
  const words = normalize(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

/** Quota delle sequenze di n parole del testo generato presenti anche nella fonte (0..1). */
export function overlapRatio(generated: string, source: string, n = 8): number {
  const g = shingles(generated, n);
  if (!g.size) return 0;
  const s = shingles(source, n);
  let shared = 0;
  for (const x of g) if (s.has(x)) shared++;
  return shared / g.size;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function slugify(s: string, max = 80): string {
  const base = normalize(s).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (base.length <= max) return base;
  return base.slice(0, max).replace(/-[^-]*$/, "");
}

export function containsKeyword(normText: string, kw: string): boolean {
  // confronto su testo normalizzato, con limite di parola all'inizio
  const k = normalize(kw);
  if (!k) return false;
  return (" " + normText + " ").includes(" " + k);
}

export function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    for (const p of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|refresh_ce|cmpid|ito|xtor)/i.test(p)) u.searchParams.delete(p);
    }
    u.hostname = u.hostname.replace(/^www\./, "");
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

export function domainOf(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
