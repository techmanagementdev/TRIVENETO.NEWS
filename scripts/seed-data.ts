import type pg from "pg";

// Fonti iniziali. Tutte modificabili dal CRM (sezione Fonti).
// kind=rss: feed RSS/Atom pubblici. kind=gdelt: GDELT DOC API (aperta, gratuita) per la scoperta multifonte.
export interface SeedSource {
  name: string;
  url: string;
  kind: "rss" | "gdelt";
  territory: string;
  category?: string;
  reliability: number;
  is_primary?: boolean;
}

const gdelt = (query: string) =>
  "https://api.gdeltproject.org/api/v2/doc/doc?" +
  new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: "75",
    timespan: "3h",
    sort: "datedesc",
  }).toString();

export const SEED_SOURCES: SeedSource[] = [
  // Agenzia ANSA — regionali
  { name: "ANSA Trentino-Alto Adige", url: "https://www.ansa.it/trentino/notizie/trentino_rss.xml", kind: "rss", territory: "trentino-alto-adige", reliability: 5 },
  { name: "ANSA Veneto", url: "https://www.ansa.it/veneto/notizie/veneto_rss.xml", kind: "rss", territory: "veneto", reliability: 5 },
  { name: "ANSA Friuli Venezia Giulia", url: "https://www.ansa.it/friuliveneziagiulia/notizie/friuliveneziagiulia_rss.xml", kind: "rss", territory: "friuli-venezia-giulia", reliability: 5 },
  { name: "ANSA Emilia-Romagna", url: "https://www.ansa.it/emiliaromagna/notizie/emiliaromagna_rss.xml", kind: "rss", territory: "emilia-romagna", reliability: 5 },
  // ANSA — nazionali / Europa
  { name: "ANSA Politica", url: "https://www.ansa.it/sito/notizie/politica/politica_rss.xml", kind: "rss", territory: "italia", category: "politica", reliability: 5 },
  { name: "ANSA Economia", url: "https://www.ansa.it/sito/notizie/economia/economia_rss.xml", kind: "rss", territory: "italia", category: "economia", reliability: 5 },
  { name: "ANSA Mondo", url: "https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml", kind: "rss", territory: "mondo", reliability: 5 },
  { name: "ANSA Tecnologia", url: "https://www.ansa.it/sito/notizie/tecnologia/tecnologia_rss.xml", kind: "rss", territory: "italia", category: "tecnologia", reliability: 5 },
  { name: "ANSA Europa", url: "https://www.ansa.it/europa/notizie/europa_rss.xml", kind: "rss", territory: "europa", reliability: 5 },
  // Testate locali
  { name: "il Dolomiti", url: "https://www.ildolomiti.it/rss.xml", kind: "rss", territory: "trentino-alto-adige", reliability: 4 },
  { name: "Salto.bz", url: "https://salto.bz/it/rss.xml", kind: "rss", territory: "trentino-alto-adige", reliability: 4 },
  { name: "Il Gazzettino", url: "https://www.ilgazzettino.it/rss/home.xml", kind: "rss", territory: "veneto", reliability: 4 },
  { name: "Il Piccolo", url: "https://ilpiccolo.gelocal.it/rss", kind: "rss", territory: "friuli-venezia-giulia", reliability: 4 },
  { name: "Il Resto del Carlino Bologna", url: "https://www.ilrestodelcarlino.it/bologna/rss", kind: "rss", territory: "emilia-romagna", reliability: 4 },
  // Nazionali / internazionali
  { name: "Il Sole 24 Ore Economia", url: "https://www.ilsole24ore.com/rss/economia.xml", kind: "rss", territory: "italia", category: "economia", reliability: 5 },
  { name: "Euronews Italiano", url: "https://it.euronews.com/rss", kind: "rss", territory: "europa", reliability: 4 },
  { name: "Rainews", url: "https://www.rainews.it/rss/tutti", kind: "rss", territory: "italia", reliability: 5 },
  // Fonti istituzionali (primarie)
  { name: "Commissione europea — comunicati", url: "https://ec.europa.eu/commission/presscorner/api/rss?language=it", kind: "rss", territory: "europa", reliability: 5, is_primary: true },
  { name: "Parlamento europeo — notizie", url: "https://www.europarl.europa.eu/rss/doc/top-stories/it.xml", kind: "rss", territory: "europa", reliability: 5, is_primary: true },
  // Scoperta multifonte via GDELT
  { name: "GDELT · Trentino-Alto Adige", url: gdelt('(Trentino OR "Alto Adige" OR Trento OR Bolzano) sourcelang:italian'), kind: "gdelt", territory: "trentino-alto-adige", reliability: 3 },
  { name: "GDELT · Veneto", url: gdelt("(Veneto OR Venezia OR Verona OR Padova OR Vicenza OR Treviso) sourcelang:italian"), kind: "gdelt", territory: "veneto", reliability: 3 },
  { name: "GDELT · Friuli Venezia Giulia", url: gdelt('("Friuli Venezia Giulia" OR Trieste OR Udine OR Pordenone) sourcelang:italian'), kind: "gdelt", territory: "friuli-venezia-giulia", reliability: 3 },
  { name: "GDELT · Emilia-Romagna", url: gdelt('("Emilia-Romagna" OR Bologna OR Modena OR Parma OR Ravenna) sourcelang:italian'), kind: "gdelt", territory: "emilia-romagna", reliability: 3 },
  { name: "GDELT · Nordest economia", url: gdelt('(Nordest OR "Nord Est") (imprese OR export OR economia OR lavoro) sourcelang:italian'), kind: "gdelt", territory: "italia", category: "economia", reliability: 3 },
  { name: "GDELT · UE e Italia", url: gdelt('("Commissione europea" OR "Unione europea") Italia sourcelang:italian'), kind: "gdelt", territory: "europa", reliability: 3 },
];

export async function seedSources(client: pg.PoolClient | pg.Pool) {
  let n = 0;
  for (const s of SEED_SOURCES) {
    const r = await client.query(
      `INSERT INTO sources (name, url, kind, territory, category, reliability, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (url) DO NOTHING`,
      [s.name, s.url, s.kind, s.territory, s.category ?? null, s.reliability, s.is_primary ?? false],
    );
    n += r.rowCount ?? 0;
  }
  return n;
}
