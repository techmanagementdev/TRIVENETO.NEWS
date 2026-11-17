"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
