import Link from "next/link";
import { articlePath, fmtDate, imageUrl, type ArticleCard } from "@/lib/content";
import { categoryName } from "@/lib/taxonomy";

export function Thumb({ a, eager = false }: { a: ArticleCard; eager?: boolean }) {
  return (
    <div className="thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl(a)} alt={a.image?.alt ?? a.title} loading={eager ? "eager" : "lazy"} />
    </div>
  );
}

export function Card({ a }: { a: ArticleCard }) {
  return (
    <article className="card">
      <Link href={articlePath(a.slug)}>
        <Thumb a={a} />
        <div className="kicker" style={{ marginTop: 10 }}>{categoryName(a.category)}</div>
        <h3>{a.title}</h3>
      </Link>
      <p>{a.summary}</p>
    </article>
  );
}

export function Row({ a }: { a: ArticleCard }) {
  return (
    <article className="list-row">
      <Link href={articlePath(a.slug)}><Thumb a={a} /></Link>
      <div>
        <div className="kicker">{categoryName(a.category)}</div>
        <h2><Link href={articlePath(a.slug)}>{a.title}</Link></h2>
        <p>{a.summary}</p>
        <div className="meta"><time dateTime={new Date(a.published_at).toISOString()}>{fmtDate(a.published_at)}</time></div>
      </div>
    </article>
  );
}

export function Empty({ children }: { children?: React.ReactNode }) {
  return <div className="empty">{children ?? "Non ci sono ancora articoli in questa sezione."}</div>;
}

export function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-title">
        <span>{title}</span>
        {href && <Link href={href}>Tutte →</Link>}
      </h2>
      {children}
    </section>
  );
}
