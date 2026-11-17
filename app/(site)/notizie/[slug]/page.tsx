import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ArticleBits";
import ViewTracker from "@/components/ViewTracker";
import { absoluteImageUrl, articlePath, fmtDate, getArticle, imageUrl, related, renderMarkdown, siteUrl } from "@/lib/content";
import { categoryName, territoryName } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "Articolo non trovato" };
  const url = siteUrl() + articlePath(a.slug);
  return {
    title: a.meta_title || a.title,
    description: a.meta_description || a.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: a.title,
      description: a.summary,
      images: [{ url: absoluteImageUrl(a), alt: a.image?.alt ?? a.title }],
      publishedTime: new Date(a.published_at).toISOString(),
      modifiedTime: new Date(a.updated_at).toISOString(),
      section: categoryName(a.category),
      tags: a.tags,
    },
    twitter: { card: "summary_large_image", title: a.title, description: a.summary, images: [absoluteImageUrl(a)] },
  };
}

export default async function ArticlePage({ params }: P) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  const rel = await related(a, 4);
  const url = siteUrl() + articlePath(a.slug);
  const updated = new Date(a.updated_at).getTime() - new Date(a.published_at).getTime() > 10 * 60_000;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: a.title,
      description: a.summary,
      image: [absoluteImageUrl(a)],
      datePublished: new Date(a.published_at).toISOString(),
      dateModified: new Date(a.updated_at).toISOString(),
      mainEntityOfPage: url,
      articleSection: categoryName(a.category),
      keywords: a.tags.join(", "),
      inLanguage: "it-IT",
      author: { "@type": "Organization", name: "Redazione TRIVENETO.NEWS", url: siteUrl() + "/chi-siamo" },
      publisher: { "@type": "Organization", name: "TRIVENETO.NEWS", url: siteUrl(), logo: { "@type": "ImageObject", url: siteUrl() + "/icon.svg" } },
      isBasedOn: a.sources.map((s) => s.url),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
        { "@type": "ListItem", position: 2, name: categoryName(a.category), item: `${siteUrl()}/categoria/${a.category}` },
        { "@type": "ListItem", position: 3, name: a.title, item: url },
      ],
    },
  ];
  const share = encodeURIComponent(url);
  return (
    <>
      <article className="article">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <nav className="meta" aria-label="Percorso">
          <Link href="/">Home</Link> › <Link href={`/categoria/${a.category}`}>{categoryName(a.category)}</Link>
          {a.territories.slice(0, 2).map((t) => (
            <span key={t}> · <Link href={`/territorio/${t}`}>{territoryName(t)}</Link></span>
          ))}
        </nav>
        <h1>{a.title}</h1>
        <p className="standfirst">{a.summary}</p>
        <div className="meta">
          Redazione TRIVENETO.NEWS · <time dateTime={new Date(a.published_at).toISOString()}>{fmtDate(a.published_at)}</time>
          {updated && <> · aggiornato {fmtDate(a.updated_at)}</>}
        </div>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(a)} alt={a.image?.alt ?? a.title} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
          {a.image?.kind === "photo" && (
            <figcaption>
              Foto di repertorio · {a.image.author} ·{" "}
              {a.image.license_url ? <a href={a.image.license_url} rel="nofollow noopener" target="_blank">{a.image.license}</a> : a.image.license}
              {a.image.source_url && <> · <a href={a.image.source_url} rel="nofollow noopener" target="_blank">{a.image.provider}</a></>}
            </figcaption>
          )}
        </figure>
        {a.update_note && updated && <div className="update-note">{a.update_note} — {fmtDate(a.updated_at)}</div>}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body_md) }} />
        <section className="sources-box">
          <h2>Fonti</h2>
          <ol>
            {a.sources.map((s) => (
              <li key={s.n}>
                {s.publisher}: <a href={s.url} rel="nofollow noopener" target="_blank">{s.title}</a>
              </li>
            ))}
          </ol>
        </section>
        {a.tags.length > 0 && (
          <div className="tags">{a.tags.map((t) => <Link key={t} href={`/tag/${encodeURIComponent(t)}`}>#{t}</Link>)}</div>
        )}
        <p className="share">
          Condividi:{" "}
          <a href={`https://wa.me/?text=${share}`} target="_blank" rel="noopener">WhatsApp</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${share}`} target="_blank" rel="noopener">Facebook</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${share}`} target="_blank" rel="noopener">LinkedIn</a>
          <a href={`https://x.com/intent/post?url=${share}`} target="_blank" rel="noopener">X</a>
        </p>
        <p className="ai-note">
          Articolo elaborato dalla redazione con il supporto dell'intelligenza artificiale, sulla base delle fonti indicate. Hai notato un errore?{" "}
          <Link href={`/rettifiche?url=${share}`} style={{ textDecoration: "underline" }}>Segnala una rettifica</Link>.
        </p>
        <ViewTracker id={a.id} />
      </article>
      {rel.length > 0 && (
        <section className="section">
          <h2 className="section-title"><span>Leggi anche</span></h2>
          <div className="cards">{rel.map((r) => <Card key={r.id} a={r} />)}</div>
        </section>
      )}
    </>
  );
}
