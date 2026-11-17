import Link from "next/link";
import { Card, Empty, Section, Thumb } from "@/components/ArticleBits";
import { articlePath, byCategory, byTerritory, fmtTime, latest, mostRead } from "@/lib/content";
import { CATEGORIES, categoryName, TERRITORIES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const news = await latest(12);
  if (!news.length) {
    return <div style={{ margin: "40px 0" }}><Empty>Il giornale è in avvio: i primi articoli verificati compariranno qui a breve.</Empty></div>;
  }
  const [lead, ...rest] = news;
  const [cats, regions, europe, popular] = await Promise.all([
    Promise.all(CATEGORIES.map(async (c) => ({ c, items: await byCategory(c.slug, 4) }))),
    Promise.all(TERRITORIES.filter((t) => t.local).map(async (t) => ({ t, items: await byTerritory(t.slug, 3) }))),
    byTerritory(["europa", "mondo"], 4),
    mostRead(7, 6),
  ]);
  return (
    <>
      <div className="lead-grid">
        <article className="lead">
          <Link href={articlePath(lead.slug)}>
            <Thumb a={lead} eager />
            <div className="kicker" style={{ marginTop: 14 }}>{categoryName(lead.category)}</div>
            <h1>{lead.title}</h1>
          </Link>
          <p>{lead.summary}</p>
        </article>
        <aside className="latest">
          <h2 className="section-title"><span>Ultime notizie</span></h2>
          <ul>
            {rest.slice(0, 9).map((a) => (
              <li key={a.id}>
                <time>{fmtTime(a.published_at)}</time>
                <Link href={articlePath(a.slug)}>{a.title}</Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {cats.filter((x) => x.items.length).map(({ c, items }) => (
        <Section key={c.slug} title={c.name} href={`/categoria/${c.slug}`}>
          <div className="cards">{items.map((a) => <Card key={a.id} a={a} />)}</div>
        </Section>
      ))}

      <div className="two-col">
        {regions.filter((x) => x.items.length).map(({ t, items }) => (
          <Section key={t.slug} title={t.name} href={`/territorio/${t.slug}`}>
            <div className="latest"><ul>{items.map((a) => <li key={a.id}><Link href={articlePath(a.slug)}>{a.title}</Link></li>)}</ul></div>
          </Section>
        ))}
      </div>

      {europe.length > 0 && (
        <Section title="Europa e mondo" href="/territorio/europa">
          <div className="cards">{europe.map((a) => <Card key={a.id} a={a} />)}</div>
        </Section>
      )}

      {popular.length > 0 && (
        <Section title="I più letti">
          <div className="mostread"><ol>{popular.map((a) => <li key={a.id}><Link href={articlePath(a.slug)}>{a.title}</Link></li>)}</ol></div>
        </Section>
      )}
    </>
  );
}
