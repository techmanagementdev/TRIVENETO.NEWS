import type { Metadata } from "next";
import Link from "next/link";
import { Empty, Row } from "@/components/ArticleBits";
import { latest } from "@/lib/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Archivio", alternates: { canonical: "/archivio" } };
const PER = 30;

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const page = Math.max(1, Number((await searchParams).p) || 1);
  const items = await latest(PER + 1, (page - 1) * PER);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="section-title" style={{ marginTop: 30, fontSize: 16 }}><span>Archivio</span></h1>
      {items.length ? items.slice(0, PER).map((a) => <Row key={a.id} a={a} />) : <Empty />}
      <div className="pager">
        {page > 1 ? <Link href={`?p=${page - 1}`}>← Più recenti</Link> : <span />}
        {items.length > PER && <Link href={`?p=${page + 1}`}>Meno recenti →</Link>}
      </div>
    </div>
  );
}
