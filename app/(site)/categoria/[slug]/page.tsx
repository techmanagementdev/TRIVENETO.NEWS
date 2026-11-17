import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, Row } from "@/components/ArticleBits";
import { byCategory } from "@/lib/content";
import { CATEGORIES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ p?: string }> };
const PER = 20;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  return c ? { title: c.name, description: `Le notizie di ${c.name.toLowerCase()} dal Nord-Est: Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia, Emilia-Romagna.`, alternates: { canonical: `/categoria/${c.slug}` } } : {};
}

export default async function CategoryPage({ params, searchParams }: P) {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  if (!c) notFound();
  const page = Math.max(1, Number((await searchParams).p) || 1);
  const items = await byCategory(slug, PER + 1, (page - 1) * PER);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="section-title" style={{ marginTop: 30, fontSize: 16 }}><span>{c.name}</span></h1>
      {items.length ? items.slice(0, PER).map((a) => <Row key={a.id} a={a} />) : <Empty />}
      <div className="pager">
        {page > 1 ? <Link href={`?p=${page - 1}`}>← Più recenti</Link> : <span />}
        {items.length > PER && <Link href={`?p=${page + 1}`}>Meno recenti →</Link>}
      </div>
    </div>
  );
}
