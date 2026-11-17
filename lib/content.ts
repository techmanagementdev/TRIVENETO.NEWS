import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { q, q1 } from "./db";
import type { ArticleImage } from "./images";

export interface ArticleRow {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body_md: string;
  category: string;
  territories: string[];
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  social_text: string | null;
  sources: { n: number; publisher: string; title: string; url: string; date: string }[];
  image: ArticleImage | null;
  status: string;
  update_note: string | null;
  views: number;
  published_at: Date;
  updated_at: Date;
  created_at: Date;
}

const COLS = `id, slug, title, summary, category, territories, tags, image, published_at, updated_at, views`;
export type ArticleCard = Pick<ArticleRow, "id" | "slug" | "title" | "summary" | "category" | "territories" | "tags" | "image" | "published_at" | "updated_at" | "views">;

export const siteUrl = () => (process.env.SITE_URL || "https://triveneto.news").replace(/\/$/, "");

export function imageUrl(a: { id: number; image: ArticleImage | null }) {
  return a.image?.kind === "photo" && a.image.url ? a.image.url : `/api/card/${a.id}`;
}
export function absoluteImageUrl(a: { id: number; image: ArticleImage | null }) {
  const u = imageUrl(a);
  return u.startsWith("http") ? u : siteUrl() + u;
}

export async function latest(limit = 20, offset = 0) {
  return q<ArticleCard>(`SELECT ${COLS} FROM articles WHERE status='pubblicato' ORDER BY published_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
}
export async function byCategory(cat: string, limit = 20, offset = 0) {
  return q<ArticleCard>(`SELECT ${COLS} FROM articles WHERE status='pubblicato' AND category=$1 ORDER BY published_at DESC LIMIT $2 OFFSET $3`, [cat, limit, offset]);
}
export async function byTerritory(t: string | string[], limit = 20, offset = 0) {
  const arr = Array.isArray(t) ? t : [t];
  return q<ArticleCard>(`SELECT ${COLS} FROM articles WHERE status='pubblicato' AND territories && $1 ORDER BY published_at DESC LIMIT $2 OFFSET $3`, [arr, limit, offset]);
}
export async function byTag(tag: string, limit = 30) {
  return q<ArticleCard>(`SELECT ${COLS} FROM articles WHERE status='pubblicato' AND $1 = ANY(tags) ORDER BY published_at DESC LIMIT $2`, [tag, limit]);
}
export async function mostRead(days = 7, limit = 6) {
  return q<ArticleCard>(
    `SELECT ${COLS.split(", ").map((c) => "a." + c).join(", ")} FROM articles a
     JOIN (SELECT article_id, sum(views) v FROM page_views WHERE day > current_date - $1::int GROUP BY article_id) pv ON pv.article_id=a.id
     WHERE a.status='pubblicato' ORDER BY pv.v DESC LIMIT $2`,
    [days, limit],
  );
}
export async function search(term: string, limit = 30) {
  return q<ArticleCard>(
    `SELECT ${COLS} FROM articles WHERE status='pubblicato' AND search @@ websearch_to_tsquery('italian', $1)
     ORDER BY ts_rank(search, websearch_to_tsquery('italian', $1)) DESC, published_at DESC LIMIT $2`,
    [term, limit],
  );
}
export async function getArticle(slug: string) {
  return q1<ArticleRow>(`SELECT * FROM articles WHERE slug=$1 AND status='pubblicato'`, [slug]);
}
export async function related(a: ArticleRow, limit = 4) {
  return q<ArticleCard>(
    `SELECT ${COLS} FROM articles WHERE status='pubblicato' AND id<>$1 AND (category=$2 OR territories && $3)
     ORDER BY (tags && $4) DESC, published_at DESC LIMIT $5`,
    [a.id, a.category, a.territories, a.tags, limit],
  );
}

marked.setOptions({ gfm: true, breaks: false });
export function renderMarkdown(md: string) {
  const html = marked.parse(md, { async: false }) as string;
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "ul", "ol", "li", "strong", "em", "blockquote", "a", "br"],
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ["https", "http"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener", target: "_blank" }) },
  });
}

const tz = "Europe/Rome";
export function fmtDate(d: Date | string, withTime = true) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(d));
}
export function fmtTime(d: Date | string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}
export function articlePath(slug: string) {
  return `/notizie/${slug}`;
}

export function fmtRelative(d: Date | string) {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "adesso";
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 ora fa" : `${h} ore fa`;
  return fmtDate(d, false);
}
export function readingMinutes(md: string) {
  return Math.max(1, Math.round(md.split(/\s+/).length / 200));
}
/** Divide l'HTML dopo il paragrafo n-esimo (per inserire un annuncio nel testo). */
export function splitAfterParagraph(html: string, n: number): [string, string] {
  let idx = -1;
  for (let i = 0; i < n; i++) {
    idx = html.indexOf("</p>", idx + 1);
    if (idx === -1) return [html, ""];
  }
  return [html.slice(0, idx + 4), html.slice(idx + 4)];
}

// Aree di approfondimento della home
export const FOCUS = {
  innovazione: {
    title: "Tecnologie innovative",
    intro: "Intelligenza artificiale, digitale, ricerca e startup che cambiano il Nord-Est.",
    where: `category = 'tecnologia'`,
    link: "/categoria/tecnologia",
  },
  greentech: {
    title: "Greentech",
    intro: "Energia pulita, efficienza, mobilità e economia circolare sul territorio.",
    where: `category = 'sostenibilita'`,
    link: "/categoria/sostenibilita",
  },
  bandi: {
    title: "Bandi e contributi",
    intro: "Finanziamenti, incentivi e opportunità per imprese, enti e cittadini.",
    where: `('bandi' = ANY(tags) OR title ~* '(bando|bandi|contribut|incentiv|finanziament|pnrr|fondi europei|voucher|agevolazion)')`,
    link: "/tag/bandi",
  },
} as const;
export type FocusKind = keyof typeof FOCUS;

export async function byFocus(kind: FocusKind, exclude: number[] = [], limit = 4) {
  return q<ArticleCard>(
    `SELECT ${COLS} FROM articles WHERE status='pubblicato' AND ${FOCUS[kind].where} AND NOT (id = ANY($1)) ORDER BY published_at DESC LIMIT $2`,
    [exclude, limit],
  );
}
