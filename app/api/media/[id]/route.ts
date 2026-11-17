import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

// File caricati dal CRM (loghi, immagini, GIF, video). Supporta le richieste parziali (Range) necessarie ai video.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Non trovato", { status: 404 });
  const m = await q1<{ mime: string; data: Buffer }>(`SELECT mime, data FROM media WHERE id=$1`, [id]);
  if (!m) return new Response("Non trovato", { status: 404 });
  const total = m.data.length;
  const base = {
    "Content-Type": m.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=604800, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start >= total || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    return new Response(new Uint8Array(m.data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(m.data), { headers: { ...base, "Content-Length": String(total) } });
}
