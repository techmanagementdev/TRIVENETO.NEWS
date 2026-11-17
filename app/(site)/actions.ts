"use server";
import { headers } from "next/headers";
import { q } from "@/lib/db";
import { rateLimit } from "@/lib/auth";

export interface FormState { ok?: boolean; error?: string }

export async function submitMessage(_: FormState, form: FormData): Promise<FormState> {
  if (String(form.get("website") ?? "")) return { ok: true }; // campo trappola anti-spam
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (!rateLimit(`msg:${ip}`, 5, 60 * 60_000)) return { error: "Troppi invii, riprova più tardi." };
  const kind = form.get("kind") === "rettifica" ? "rettifica" : "contatto";
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  const url = String(form.get("article_url") ?? "").trim().slice(0, 500);
  const body = String(form.get("body") ?? "").trim().slice(0, 5000);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Inserisci un indirizzo email valido." };
  if (body.length < 10) return { error: "Il messaggio è troppo breve." };
  if (kind === "rettifica" && url && !/^https?:\/\//.test(url)) return { error: "Indica il link dell'articolo." };
  await q(`INSERT INTO messages (kind, name, email, article_url, body) VALUES ($1,$2,$3,$4,$5)`, [kind, name || null, email, url || null, body]);
  return { ok: true };
}
