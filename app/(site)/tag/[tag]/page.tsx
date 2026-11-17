import type { Metadata } from "next";
import { Empty, Row } from "@/components/ArticleBits";
import { byTag } from "@/lib/content";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const tag = decodeURIComponent((await params).tag);
  return { title: `#${tag}`, robots: { index: false, follow: true } };
}

export default async function TagPage({ params }: P) {
  const tag = decodeURIComponent((await params).tag);
  const items = await byTag(tag);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="section-title" style={{ marginTop: 30, fontSize: 16 }}><span>#{tag}</span></h1>
      {items.length ? items.map((a) => <Row key={a.id} a={a} />) : <Empty />}
    </div>
  );
}
