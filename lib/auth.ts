import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

function sha(s: string) {
  return crypto.createHash("sha256").update(s).digest();
}

export function checkCredentials(email: string, password: string) {
  const e = process.env.ADMIN_EMAIL ?? "";
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (!e || !p) return false;
  const okEmail = crypto.timingSafeEqual(sha(email.trim().toLowerCase()), sha(e.trim().toLowerCase()));
  const okPass = crypto.timingSafeEqual(sha(password), sha(p));
  return okEmail && okPass;
}

export async function currentAdmin(): Promise<string | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<string> {
  const who = await currentAdmin();
  if (!who) redirect("/admin/login");
  return who;
}

// Limite tentativi di accesso (in memoria, per IP)
const attempts = new Map<string, { n: number; until: number }>();
export function loginAllowed(ip: string) {
  const a = attempts.get(ip);
  return !a || a.until < Date.now() || a.n < 5;
}
export function loginFailed(ip: string) {
  const a = attempts.get(ip);
  if (!a || a.until < Date.now()) attempts.set(ip, { n: 1, until: Date.now() + 15 * 60_000 });
  else a.n++;
}
export function loginOk(ip: string) {
  attempts.delete(ip);
}

// Limite generico per i moduli pubblici
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(key, arr);
  return true;
}
