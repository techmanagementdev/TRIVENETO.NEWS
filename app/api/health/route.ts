import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await q1("SELECT 1");
    const last = await q1<{ started_at: Date; status: string }>(`SELECT started_at, status FROM job_runs ORDER BY started_at DESC LIMIT 1`);
    return NextResponse.json({ ok: true, db: true, last_cycle: last?.started_at ?? null, last_status: last?.status ?? null });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
