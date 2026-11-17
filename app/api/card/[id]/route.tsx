import { ImageResponse } from "next/og";
import { q1 } from "@/lib/db";
import { categoryName, territoryName } from "@/lib/taxonomy";

// Grafica neutra (non fotografica) usata quando non c'è una foto con licenza adatta.
const COLORS: Record<string, string> = {
  politica: "#0b3a7e",
  economia: "#124e66",
  attualita: "#3a3f4b",
  sostenibilita: "#1f6b45",
  tecnologia: "#3b2f80",
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await q1<{ title: string; category: string; territories: string[] }>(
    `SELECT title, category, territories FROM articles WHERE id=$1`,
    [Number(id) || 0],
  );
  const title = a?.title ?? "TRIVENETO.NEWS";
  const bg = COLORS[a?.category ?? ""] ?? "#0b3a7e";
  const label = a ? `${categoryName(a.category)}${a.territories[0] ? " · " + territoryName(a.territories[0]) : ""}` : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: bg, padding: 64, color: "white" }}>
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85 }}>{label}</div>
        <div style={{ fontSize: title.length > 90 ? 50 : 60, lineHeight: 1.15, fontWeight: 700, fontFamily: "serif" }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 2 }}>TRIVENETO.NEWS</div>
          <div style={{ width: 160, height: 8, background: "white", opacity: 0.6 }} />
        </div>
      </div>
    ),
    { width: 1200, height: 675, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
