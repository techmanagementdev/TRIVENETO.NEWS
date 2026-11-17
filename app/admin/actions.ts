"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ALLOWED_MIME, PLACEMENT_SLUGS, youtubeId } from "@/lib/ads";
import { checkCredentials, loginAllowed, loginFailed, loginOk, requireAdmin } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { pickImage } from "@/lib/images";
import { assertPublicUrl } from "@/lib/net";
import { generateForEvent } from "@/lib/pipeline";
import { DEFAULT_SETTINGS, getSettings, setSetting, type PublishMode } from "@/lib/settings";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { CATEGORY_SLUGS, TERRITORY_SLUGS } from "@/lib/taxonomy";
import { slugify } from "@/lib/text";

const num = (f: FormData, k: string) => Number(f.get(k));
const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);

// ---------- Accesso ----------
export async function login(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (!loginAllowed(ip)) return { error: "Troppi tentativi. Riprova tra 15 minuti." };
  if (!checkCredentials(str(form, "email"), String(form.get("password") ?? ""))) {
    loginFailed(ip);
    return { error: "Credenziali non valide." };
  }
  loginOk(ip);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(str(form, "email")), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ---------- Articoli ed eventi ----------
function refresh(eventId?: number) {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  if (eventId) revalidatePath(`/admin/notizie/${eventId}`);
}

export async function publishArticle(form: FormData) {
  await requireAdmin();
  const id = num(form, "id");
  const r = await q1<{ event_id: number }>(
    `UPDATE articles SET status='pubblicato', needs_review=false, published_at=COALESCE(published_at, now()), updated_at=now() WHERE id=$1 RETURNING event_id`,
    [id],
  );
  refresh(r?.event_id);
}

export async function unpublishArticle(form: FormData) {
  await requireAdmin();
  const r = await q1<{ event_id: number }>(`UPDATE articles SET status='ritirato', updated_at=now() WHERE id=$1 RETURNING event_id`, [num(form, "id")]);
  refresh(r?.event_id);
}

export async function saveArticle(form: FormData) {
  await requireAdmin();
  const id = num(form, "id");
  const category = str(form, "category");
  const territories = form.getAll("territories").map(String).filter((t) => TERRITORY_SLUGS.includes(t as any));
  const tags = str(form, "tags", 300).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
  const title = str(form, "title", 200);
  const body = String(form.get("body_md") ?? "").slice(0, 20000);
  if (!title || body.length < 50 || !CATEGORY_SLUGS.includes(category as any)) return;
  const r = await q1<{ event_id: number }>(
    `UPDATE articles SET title=$2, summary=$3, body_md=$4, category=$5, territories=$6, tags=$7, meta_title=$8, meta_description=$9, updated_at=now()
     WHERE id=$1 RETURNING event_id`,
    [id, title, str(form, "summary", 500), body, category, territories.length ? territories : ["italia"], tags, str(form, "meta_title", 80), str(form, "meta_description", 180)],
  );
  refresh(r?.event_id);
}

export async function changeSlug(form: FormData) {
  await requireAdmin();
  const slug = slugify(str(form, "slug", 120));
  if (!slug) return;
  const r = await q1<{ event_id: number }>(`UPDATE articles SET slug=$2 WHERE id=$1 AND status<>'pubblicato' RETURNING event_id`, [num(form, "id"), slug]).catch(() => null);
  refresh(r?.event_id);
}

export async function newImage(form: FormData) {
  await requireAdmin();
  const id = num(form, "id");
  const a = await q1<{ title: string; event_id: number }>(`SELECT title, event_id FROM articles WHERE id=$1`, [id]);
  if (!a) return;
  const query = str(form, "query", 80);
  const img = query === "grafica" ? { kind: "card", alt: a.title } : await pickImage(query, "", a.title);
  await q(`UPDATE articles SET image=$2::jsonb, updated_at=now() WHERE id=$1`, [id, JSON.stringify(img)]);
  refresh(a.event_id);
}

export async function generateEvent(form: FormData) {
  await requireAdmin();
  const id = num(form, "event_id");
  const update = form.get("update") === "1";
  await q(`UPDATE events SET status='nuovo' WHERE id=$1 AND status IN ('scartato','errore','in_attesa')`, [id]);
  try {
    const r = await generateForEvent(id, await getSettings(), { update });
    if (r.outcome === "saltato" || r.outcome === "in_attesa") {
      await q(`UPDATE events SET status_note=$2 WHERE id=$1`, [id, `Generazione non eseguita: ${r.note}`]);
    }
  } catch (e: any) {
    await q(`UPDATE events SET status='errore', status_note=$2 WHERE id=$1`, [id, String(e?.message ?? e).slice(0, 300)]);
  }
  refresh(id);
}

export async function discardEvent(form: FormData) {
  await requireAdmin();
  const id = num(form, "event_id");
  await q(`UPDATE events SET status='scartato', status_note='Scartato dalla redazione', updated_at=now() WHERE id=$1`, [id]);
  await q(`UPDATE articles SET status='ritirato' WHERE event_id=$1 AND status<>'pubblicato'`, [id]);
  refresh(id);
}

// ---------- Fonti ----------
export async function addSource(_: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const url = str(form, "url", 1000);
  try {
    await assertPublicUrl(url);
  } catch (e: any) {
    return { error: e.message };
  }
  const kind = form.get("kind") === "gdelt" ? "gdelt" : "rss";
  const territory = TERRITORY_SLUGS.includes(str(form, "territory") as any) ? str(form, "territory") : "italia";
  const category = CATEGORY_SLUGS.includes(str(form, "category") as any) ? str(form, "category") : null;
  const reliability = Math.min(5, Math.max(1, num(form, "reliability") || 3));
  const name = str(form, "name", 120) || new URL(url).hostname;
  try {
    await q(`INSERT INTO sources (name, url, kind, territory, category, reliability, is_primary) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
      name, url, kind, territory, category, reliability, form.get("is_primary") === "on",
    ]);
  } catch {
    return { error: "Fonte già presente." };
  }
  revalidatePath("/admin/fonti");
  return { ok: true };
}

export async function updateSource(form: FormData) {
  await requireAdmin();
  const id = num(form, "id");
  const action = str(form, "action");
  if (action === "toggle") await q(`UPDATE sources SET active = NOT active WHERE id=$1`, [id]);
  else if (action === "delete") await q(`DELETE FROM sources WHERE id=$1`, [id]);
  else if (action === "save") {
    await q(`UPDATE sources SET name=$2, reliability=$3, territory=$4, category=$5, is_primary=$6 WHERE id=$1`, [
      id,
      str(form, "name", 120),
      Math.min(5, Math.max(1, num(form, "reliability") || 3)),
      TERRITORY_SLUGS.includes(str(form, "territory") as any) ? str(form, "territory") : "italia",
      CATEGORY_SLUGS.includes(str(form, "category") as any) ? str(form, "category") : null,
      form.get("is_primary") === "on",
    ]);
  }
  revalidatePath("/admin/fonti");
}

// ---------- Impostazioni ----------
export async function saveSettings(form: FormData) {
  await requireAdmin();
  const clamp = (v: number, lo: number, hi: number, d: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const mode = str(form, "publish_mode") as PublishMode;
  await setSetting("publish_mode", ["manuale", "semiautomatica", "automatica"].includes(mode) ? mode : "semiautomatica");
  await setSetting("auto_rules_approved", form.get("auto_rules_approved") === "on");
  await setSetting("auto_categories", form.getAll("auto_categories").map(String).filter((c) => CATEGORY_SLUGS.includes(c as any)));
  await setSetting("fetch_interval_min", clamp(num(form, "fetch_interval_min"), 5, 240, 15));
  await setSetting("min_priority", clamp(num(form, "min_priority"), 0, 100, DEFAULT_SETTINGS.min_priority));
  await setSetting("min_independent_sources", clamp(num(form, "min_independent_sources"), 1, 5, 2));
  await setSetting("max_articles_per_run", clamp(num(form, "max_articles_per_run"), 0, 20, 3));
  await setSetting("max_articles_per_day", clamp(num(form, "max_articles_per_day"), 0, 300, 30));
  await setSetting("monthly_budget_usd", clamp(num(form, "monthly_budget_usd"), 0, 10000, 40));
  await setSetting("max_tokens_per_article", clamp(num(form, "max_tokens_per_article"), 2000, 16000, 8000));
  const tw: Record<string, number> = {};
  for (const t of TERRITORY_SLUGS) tw[t] = clamp(num(form, `tw_${t}`), 0, 2, 1);
  await setSetting("territory_weights", tw);
  const cw: Record<string, number> = {};
  for (const c of CATEGORY_SLUGS) cw[c] = clamp(num(form, `cw_${c}`), 0, 2, 1);
  await setSetting("category_weights", cw);
  revalidatePath("/admin", "layout");
  redirect("/admin/impostazioni?salvato=1");
}

export async function requestRun() {
  await requireAdmin();
  await setSetting("run_requested", true);
  revalidatePath("/admin");
}

// ---------- Messaggi ----------
export async function markMessage(form: FormData) {
  await requireAdmin();
  await q(`UPDATE messages SET status=$2 WHERE id=$1`, [num(form, "id"), str(form, "status") === "gestito" ? "gestito" : "nuovo"]);
  revalidatePath("/admin/messaggi");
}

// ---------- Gestione rapida articoli ----------
export async function articlesAction(form: FormData) {
  await requireAdmin();
  // pulsante su una singola riga: "op" = "publish:ID" | "unpublish:ID" | "delete:ID"
  // pulsanti di gruppo: "bulk" = publish | unpublish | delete, con ids selezionati
  const one = String(form.get("op") ?? "");
  let op = String(form.get("bulk") ?? "");
  let ids = form.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (one) {
    const [o, id] = one.split(":");
    op = o;
    ids = [Number(id)];
  }
  if (!ids.length) return;
  if (op === "publish") {
    await q(`UPDATE articles SET status='pubblicato', needs_review=false, published_at=COALESCE(published_at, now()), updated_at=now() WHERE id = ANY($1)`, [ids]);
  } else if (op === "unpublish") {
    await q(`UPDATE articles SET status='ritirato', updated_at=now() WHERE id = ANY($1)`, [ids]);
  } else if (op === "delete") {
    const ev = await q<{ event_id: number }>(`DELETE FROM articles WHERE id = ANY($1) RETURNING event_id`, [ids]);
    const evIds = ev.map((e) => e.event_id).filter(Boolean);
    if (evIds.length) await q(`UPDATE events SET status='scartato', status_note='Articolo eliminato dalla redazione' WHERE id = ANY($1)`, [evIds]);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

// ---------- Pubblicità ----------

function sniffOk(mime: string, b: Buffer) {
  const hex = b.subarray(0, 12).toString("hex");
  if (mime === "image/png") return hex.startsWith("89504e47");
  if (mime === "image/jpeg") return hex.startsWith("ffd8ff");
  if (mime === "image/gif") return hex.startsWith("474946");
  if (mime === "image/webp") return hex.startsWith("52494646") && b.subarray(8, 12).toString() === "WEBP";
  if (mime === "video/mp4") return b.subarray(4, 8).toString() === "ftyp";
  if (mime === "video/webm") return hex.startsWith("1a45dfa3");
  return false;
}

export interface AdFormState { error?: string; ok?: boolean }

export async function saveAd(_: AdFormState, form: FormData): Promise<AdFormState> {
  await requireAdmin();
  const id = num(form, "id") || null;
  const file0 = form.get("file");
  const title = str(form, "title", 120) || str(form, "advertiser", 120) ||
    (file0 && typeof file0 !== "string" && file0.name ? file0.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120) : "") || "Annuncio";
  const placement = str(form, "placement");
  const link = str(form, "link_url", 1000);
  const videoUrl = str(form, "video_url", 1000);
  if (!PLACEMENT_SLUGS.includes(placement)) return { error: "Scegli una posizione." };
  if (link && !/^https?:\/\/\S+$/.test(link)) return { error: "Il link deve iniziare con https://" };

  let mediaId: number | null = null;
  let kind: "image" | "video" | "youtube" | null = null;
  const file = form.get("file");
  if (file && typeof file !== "string" && file.size > 0) {
    const mime = file.type;
    const max = ALLOWED_MIME[mime];
    if (!max) return { error: "Formato non supportato. Usa PNG, JPG, WEBP, GIF, MP4 o WEBM." };
    if (file.size > max) return { error: `File troppo grande (massimo ${Math.round(max / 1_000_000)} MB per questo formato).` };
    const buf = Buffer.from(await file.arrayBuffer());
    if (!sniffOk(mime, buf)) return { error: "Il contenuto del file non corrisponde al formato dichiarato." };
    const r = await q<{ id: number }>(`INSERT INTO media (filename, mime, size, data) VALUES ($1,$2,$3,$4) RETURNING id`, [
      file.name.slice(0, 200), mime, buf.length, buf,
    ]);
    mediaId = r[0].id;
    kind = mime.startsWith("video/") ? "video" : "image";
  } else if (videoUrl) {
    if (youtubeId(videoUrl)) kind = "youtube";
    else if (/^https:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(videoUrl)) kind = "video";
    else return { error: "Link video non valido: usa un link YouTube o un file .mp4/.webm." };
  }

  const startsAt = str(form, "starts_at") || null;
  const endsAt = str(form, "ends_at") || null;
  const weight = Math.min(10, Math.max(1, num(form, "weight") || 1));
  const vals = [title, str(form, "advertiser", 120) || null, placement, link || null, str(form, "alt", 200) || null, weight, startsAt, endsAt, form.get("active") === "on"];

  if (id) {
    await q(
      `UPDATE ads SET title=$2, advertiser=$3, placement=$4, link_url=$5, alt=$6, weight=$7, starts_at=$8, ends_at=$9, active=$10, updated_at=now()
         ${kind ? ", kind=$11, media_id=$12, video_url=$13" : ""} WHERE id=$1`,
      kind ? [id, ...vals, kind, mediaId, mediaId ? null : videoUrl] : [id, ...vals],
    );
  } else {
    if (!kind) return { error: "Scegli prima un file da caricare (o un video YouTube nelle altre opzioni)." };
    await q(
      `INSERT INTO ads (title, advertiser, placement, link_url, alt, weight, starts_at, ends_at, active, kind, media_id, video_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [...vals, kind, mediaId, mediaId ? null : videoUrl],
    );
  }
  await q(`DELETE FROM media m WHERE NOT EXISTS (SELECT 1 FROM ads a WHERE a.media_id = m.id) AND created_at < now() - interval '1 hour'`);
  revalidatePath("/admin/pubblicita");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adAction(form: FormData) {
  await requireAdmin();
  const [op, idStr] = String(form.get("op") ?? "").split(":");
  const id = Number(idStr);
  if (!id) return;
  if (op === "toggle") await q(`UPDATE ads SET active = NOT active, updated_at=now() WHERE id=$1`, [id]);
  if (op === "delete") {
    const r = await q1<{ media_id: number | null }>(`DELETE FROM ads WHERE id=$1 RETURNING media_id`, [id]);
    if (r?.media_id) await q(`DELETE FROM media WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM ads WHERE media_id=$1)`, [r.media_id]);
  }
  revalidatePath("/admin/pubblicita");
  revalidatePath("/", "layout");
}

export async function togglePlaceholders() {
  await requireAdmin();
  const s = await getSettings();
  await setSetting("show_ad_placeholders", !s.show_ad_placeholders);
  revalidatePath("/admin/pubblicita");
  revalidatePath("/", "layout");
}
