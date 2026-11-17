import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, Row } from "@/components/ArticleBits";
import { byTerritory } from "@/lib/content";
import { TERRITORIES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ p?: string }> };
const PER = 20;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const t = TERRITORIES.find((x) => x.slug === slug);
  if (!t) return {};
  const name = t.slug === "europa" ? "Europa e mondo" : t.name;
  return { title: `Notizie ${name}`, description: `Ultime notizie ${name}: politica, economia, attualità, sostenibilità e innovazione.`, alternates: { canonical: `/territorio/${t.slug}` } };
}

export default async function TerritoryPage({ params, searchParams }: P) {
  const { slug } = await params;
  const t = TERRITORIES.find((x) => x.slug === slug);
  if (!t) notFound();
  const page = Math.max(1, Number((await searchParams).p) || 1);
  const keys = slug === "europa" ? ["europa", "mondo"] : [slug];
  const items = await byTerritory(keys, PER + 1, (page - 1) * PER);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="section-title" style={{ marginTop: 30, fontSize: 16 }}><span>{slug === "europa" ? "Europa e mondo" : t.name}</span></h1>
      {items.length ? items.slice(0, PER).map((a) => <Row key={a.id} a={a} />) : <Empty />}
      <div className="pager">
        {page > 1 ? <Link href={`?p=${page - 1}`}>← Più recenti</Link> : <span />}
        {items.length > PER && <Link href={`?p=${page + 1}`}>Meno recenti →</Link>}
      </div>
    </div>
  );
}
