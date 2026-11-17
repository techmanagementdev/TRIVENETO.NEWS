import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import CookieConsent from "@/components/CookieConsent";
import { CATEGORIES, TERRITORIES } from "@/lib/taxonomy";
import { fmtDate } from "@/lib/content";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const today = fmtDate(new Date(), false);
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span style={{ textTransform: "capitalize" }}>{today}</span>
          <span>
            <Link href="/cerca">Cerca</Link> · <Link href="/archivio">Archivio</Link> · <Link href="/rss.xml">RSS</Link>
          </span>
        </div>
      </div>
      <header className="masthead wrap">
        <Link href="/" aria-label="TRIVENETO.NEWS, home">
          <div className="logo">TRIVENETO<span>.NEWS</span></div>
        </Link>
        <div className="tagline">Notizie dal Nord-Est e da ciò che nel mondo conta per il Nord-Est</div>
      </header>
      <nav className="nav" aria-label="Sezioni">
        <div className="wrap">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/categoria/${c.slug}`}>{c.name}</Link>
          ))}
          <span className="sep" />
          {TERRITORIES.filter((t) => t.local).map((t) => (
            <Link key={t.slug} className="region" href={`/territorio/${t.slug}`}>{t.name}</Link>
          ))}
          <Link className="region" href="/territorio/europa">Europa e mondo</Link>
          <Link className="nav-search" href="/cerca" aria-label="Cerca">⌕ Cerca</Link>
        </div>
      </nav>
      <div className="wrap"><AdSlot placement="header" /></div>
      <main className="wrap">{children}</main>
      <div className="wrap"><AdSlot placement="footer" /></div>
      <footer className="footer">
        <div className="wrap cols">
          <div>
            <div className="logo">TRIVENETO.NEWS</div>
            <p>Notizie verificate su più fonti per Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia ed Emilia-Romagna.</p>
            <p className="small" style={{ color: "#b9c6dc" }}>
              Gli articoli sono elaborati con il supporto dell'intelligenza artificiale a partire da più fonti, citate in ogni pezzo. <Link href="/metodologia">Come lavoriamo</Link>.
            </p>
          </div>
          <div>
            <ul>
              {CATEGORIES.map((c) => (
                <li key={c.slug}><Link href={`/categoria/${c.slug}`}>{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <ul>
              <li><Link href="/chi-siamo">Chi siamo</Link></li>
              <li><Link href="/metodologia">Metodologia editoriale</Link></li>
              <li><Link href="/rettifiche">Rettifiche</Link></li>
              <li><Link href="/contatti">Contatti</Link></li>
              <li><Link href="/privacy">Privacy e cookie</Link></li>
              <li><Link href="/note-legali">Informazioni legali</Link></li>
            </ul>
          </div>
        </div>
      </footer>
      <CookieConsent gaId={process.env.NEXT_PUBLIC_GA_ID || undefined} />
    </>
  );
}
