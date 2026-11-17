import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { Empty, Thumb } from "@/components/ArticleBits";
import { articlePath, byCategory, byTerritory, fmtRelative, latest, mostRead, type ArticleCard } from "@/lib/content";
import { CATEGORIES, categoryName, TERRITORIES, territoryName } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const geo = (a: ArticleCard) => (a.territories[0] ? territoryName(a.territories[0]) : "");

function Kicker({ a }: { a: ArticleCard }) {
  return (
    <div className={`kicker cat-${a.category}`}>
      {categoryName(a.category)}{geo(a) && <span className="kicker-geo"> · {geo(a)}</span>}
    </div>
  );
}

function Compact({ a }: { a: ArticleCard }) {
  return (
    <Link href={articlePath(a.slug)} className="compact">
      <Thumb a={a} />
      <span>
        <Kicker a={a} />
        <b>{a.title}</b>
        <time>{fmtRelative(a.published_at)}</time>
      </span>
    </Link>
  );
}

export default async function Home() {
  const news = await latest(14);
  if (!news.length) {
    return <div style={{ margin: "40px 0" }}><Empty>Il giornale è in avvio: i primi articoli verificati compariranno qui a breve.</Empty></div>;
  }
  const [lead, ...rest] = news;
  const second = rest.slice(0, 2);
  const timeline = (rest.length > 2 ? rest.slice(2) : news).slice(0, 8);
  const [cats, regions, europe, popular] = await Promise.all([
    Promise.all(CATEGORIES.map(async (c) => ({ c, items: await byCategory(c.slug, 7) }))),
    Promise.all(TERRITORIES.filter((t) => t.local).map(async (t) => ({ t, items: await byTerritory(t.slug, 4) }))),
    byTerritory(["europa", "mondo"], 4),
    mostRead(7, 5),
  ]);
  // evita di ripetere nelle sezioni le notizie già in apertura (se ce ne sono altre)
  const shown = new Set([lead.id, ...second.map((a) => a.id)]);
  const filledCats = cats
    .map(({ c, items }) => {
      const fresh = items.filter((a) => !shown.has(a.id));
      return { c, items: fresh.length ? fresh : items };
    })
    .filter((x) => x.items.length);

  return (
    <div className="home">
      {/* Ultim'ora */}
      <div className="breaking">
        <span className="breaking-label">Ultim&apos;ora</span>
        <div className="breaking-track">
          {news.slice(0, 6).map((a) => (
            <Link key={a.id} href={articlePath(a.slug)}><time>{fmtRelative(a.published_at)}</time> {a.title}</Link>
          ))}
        </div>
      </div>

      {/* Apertura: notizia principale + due secondarie + ultime notizie */}
      <section className="top-grid">
        <article className="lead">
          <Link href={articlePath(lead.slug)}>
            <Thumb a={lead} eager />
            <Kicker a={lead} />
            <h1>{lead.title}</h1>
          </Link>
          <p>{lead.summary}</p>
          <div className="meta">{fmtRelative(lead.published_at)}</div>
        </article>
        <div className="second">
          {second.map((a) => (
            <article key={a.id} className="card">
              <Link href={articlePath(a.slug)}>
                <Thumb a={a} />
                <Kicker a={a} />
                <h3>{a.title}</h3>
              </Link>
              <div className="meta">{fmtRelative(a.published_at)}</div>
            </article>
          ))}
        </div>
        <aside className="timeline">
          <h2 className="section-title"><span>Ultime notizie</span><Link href="/archivio">Tutte →</Link></h2>
          <ol>
            {timeline.map((a) => (
              <li key={a.id}>
                <time>{fmtRelative(a.published_at)}</time>
                <Link href={articlePath(a.slug)}>{a.title}</Link>
              </li>
            ))}
          </ol>
          <AdSlot placement="home_sidebar" />
        </aside>
      </section>

      {/* Scorciatoie territoriali */}
      <nav className="chips" aria-label="Territori">
        {TERRITORIES.filter((t) => t.local).map((t) => <Link key={t.slug} href={`/territorio/${t.slug}`}>{t.name}</Link>)}
        <Link href="/territorio/europa">Europa e mondo</Link>
        <Link href="/cerca">🔍 Cerca una notizia</Link>
      </nav>

      <AdSlot placement="home_top" />

      {/* Sezioni per categoria: una grande + elenco */}
      {filledCats.map(({ c, items }, i) => (
        <div key={c.slug}>
          <section className={`section cat-block cat-${c.slug}`}>
            <h2 className="section-title"><span>{c.name}</span><Link href={`/categoria/${c.slug}`}>Tutte →</Link></h2>
            <div className="cat-grid">
              <article className="card big">
                <Link href={articlePath(items[0].slug)}>
                  <Thumb a={items[0]} />
                  <h3>{items[0].title}</h3>
                </Link>
                <p>{items[0].summary}</p>
                <div className="meta">{geo(items[0])} · {fmtRelative(items[0].published_at)}</div>
              </article>
              <div className="cat-list">
                {items.slice(1, 4).map((a) => <Compact key={a.id} a={a} />)}
                {items.length === 1 && <p className="small">Altre notizie di {c.name.toLowerCase()} in arrivo.</p>}
              </div>
            </div>
          </section>
          {i === 1 && <AdSlot placement="home_middle" />}
        </div>
      ))}
      {filledCats.length < 2 && <AdSlot placement="home_middle" />}

      {/* Dai territori */}
      {regions.some((r) => r.items.length) && (
        <section className="section">
          <h2 className="section-title"><span>Dai territori</span></h2>
          <div className="regions">
            {regions.map(({ t, items }) => (
              <div key={t.slug} className="region-col">
                <Link href={`/territorio/${t.slug}`} className="region-head">{t.name} →</Link>
                {items.length ? (
                  <ul>{items.map((a) => <li key={a.id}><Link href={articlePath(a.slug)}>{a.title}</Link></li>)}</ul>
                ) : <p className="small">Nessuna notizia recente.</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="two-col">
        {europe.length > 0 && (
          <section className="section">
            <h2 className="section-title"><span>Europa e mondo</span><Link href="/territorio/europa">Tutte →</Link></h2>
            <div className="cat-list">{europe.map((a) => <Compact key={a.id} a={a} />)}</div>
          </section>
        )}
        {popular.length > 0 && (
          <section className="section">
            <h2 className="section-title"><span>I più letti</span></h2>
            <ol className="popular">{popular.map((a) => <li key={a.id}><Link href={articlePath(a.slug)}>{a.title}</Link></li>)}</ol>
          </section>
        )}
      </div>
    </div>
  );
}
