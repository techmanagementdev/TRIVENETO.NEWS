import Link from "next/link";
import { articlePath, byFocus, FOCUS, fmtRelative, type FocusKind } from "@/lib/content";

const ICON: Record<FocusKind, string> = { innovazione: "◆", greentech: "❖", bandi: "€" };

// Riquadro di approfondimento: riempie gli spazi liberi della home con un tema coerente.
export default async function FocusBox({ kind, exclude = [], limit = 4 }: { kind: FocusKind; exclude?: number[]; limit?: number }) {
  const f = FOCUS[kind];
  const items = await byFocus(kind, exclude, limit).catch(() => []);
  return (
    <aside className={`focus focus-${kind}`}>
      <div className="focus-head">
        <span className="focus-icon" aria-hidden="true">{ICON[kind]}</span>
        <div>
          <div className="focus-label">Focus</div>
          <h3>{f.title}</h3>
        </div>
      </div>
      <p className="focus-intro">{f.intro}</p>
      {items.length ? (
        <ul>
          {items.map((a) => (
            <li key={a.id}>
              <Link href={articlePath(a.slug)}>{a.title}</Link>
              <time>{fmtRelative(a.published_at)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="focus-empty">
          {kind === "bandi"
            ? "Stiamo raccogliendo i nuovi bandi per il Nord-Est. Hai un bando o un'opportunità da segnalare?"
            : "I primi approfondimenti arrivano a breve."}
        </p>
      )}
      <div className="focus-foot">
        {items.length > 0 && <Link href={f.link}>Tutto il focus →</Link>}
        {kind === "bandi" && <Link href="/contatti">Segnala un bando</Link>}
      </div>
    </aside>
  );
}
