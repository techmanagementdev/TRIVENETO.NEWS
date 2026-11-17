import Link from "next/link";
import { articlePath, fmtRelative, latest } from "@/lib/content";
import TickerClose from "./TickerClose";

// Banda "Ultim'ora" con titoli che scorrono: in cima e (fissa) in fondo alla pagina.
export default async function Ticker({ position }: { position: "top" | "bottom" }) {
  const news = await latest(10).catch(() => []);
  if (!news.length) return null;
  const items = news.map((a) => (
    <Link key={a.id} href={articlePath(a.slug)} className="tk-item">
      <time>{fmtRelative(a.published_at)}</time>
      <span>{a.title}</span>
    </Link>
  ));
  // durata proporzionale alla lunghezza dei titoli, per una velocità di lettura costante
  const chars = news.reduce((n, a) => n + a.title.length + 12, 0);
  const duration = Math.max(30, Math.round(chars / 9));
  return (
    <div className={`ticker ticker-${position}`} role="region" aria-label="Ultim'ora">
      <span className="tk-label"><i className="tk-dot" />Ultim&apos;ora</span>
      <div className="tk-viewport">
        <div className="tk-track" style={{ animationDuration: `${duration}s` }}>
          <div className="tk-group">{items}</div>
          <div className="tk-group" aria-hidden="true">{items}</div>
        </div>
      </div>
      {position === "bottom" && <TickerClose />}
    </div>
  );
}
