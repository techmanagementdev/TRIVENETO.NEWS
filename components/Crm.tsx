import { categoryName, territoryName } from "@/lib/taxonomy";

export function Badge({ s }: { s: string }) {
  const label: Record<string, string> = {
    nuovo: "nuovo", in_attesa: "in attesa", generato: "articolo creato", scartato: "scartato", errore: "errore",
    bozza: "bozza", pronto: "da approvare", pubblicato: "pubblicato", ritirato: "ritirato",
  };
  return <span className={`badge ${s}`}>{label[s] ?? s}</span>;
}

export function Cat({ c }: { c: string }) {
  return <span className="badge">{categoryName(c)}</span>;
}

export function Terr({ t }: { t: string[] }) {
  return <span className="small">{t.slice(0, 2).map(territoryName).join(", ")}</span>;
}

export function ago(d: Date | string | null) {
  if (!d) return "—";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "ora";
  if (m < 60) return `${m} min fa`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h fa`;
  return `${Math.round(h / 24)} g fa`;
}
