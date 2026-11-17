import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

// Conta il clic e reindirizza al sito dell'inserzionista.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const ad = Number.isInteger(id) && id > 0
    ? await q1<{ link_url: string | null }>(`UPDATE ads SET clicks = clicks + 1 WHERE id=$1 RETURNING link_url`, [id])
    : null;
  const target = ad?.link_url && /^https?:\/\//.test(ad.link_url) ? ad.link_url : new URL("/", req.url).toString();
  return NextResponse.redirect(target, 302);
}
