import type { Metadata } from "next";
import { Empty, Row } from "@/components/ArticleBits";
import { search } from "@/lib/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cerca", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const term = ((await searchParams).q ?? "").trim().slice(0, 120);
  const items = term ? await search(term) : [];
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <h1>Cerca</h1>
      <form className="searchbar" action="/cerca">
        <input name="q" defaultValue={term} placeholder="Es. energia Trentino, porto di Trieste…" aria-label="Termini di ricerca" />
        <button type="submit">Cerca</button>
      </form>
      {term && (items.length ? items.map((a) => <Row key={a.id} a={a} />) : <Empty>Nessun risultato per “{term}”.</Empty>)}
    </div>
  );
}
