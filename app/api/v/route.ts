import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { rateLimit } from "@/lib/auth";

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (!rateLimit(`v:${ip}`, 200, 3600_000)) return new NextResponse(null, { status: 204 });
  let body: any = {};
  try {
    body = JSON.parse((await req.text()).slice(0, 2000));
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return new NextResponse(null, { status: 204 });
  const fromSearch = /google\.|bing\.|duckduckgo\.|ecosia\./i.test(String(body.ref ?? "")) ? 1 : 0;
  const ok = await q(`UPDATE articles SET views=views+1 WHERE id=$1 AND status='pubblicato' RETURNING id`, [id]);
  if (ok.length) {
    await q(
      `INSERT INTO page_views (article_id, day, views, referrer_search) VALUES ($1, (now() AT TIME ZONE 'Europe/Rome')::date, 1, $2)
       ON CONFLICT (article_id, day) DO UPDATE SET views=page_views.views+1, referrer_search=page_views.referrer_search+$2`,
      [id, fromSearch],
    );
  }
  return new NextResponse(null, { status: 204 });
}
