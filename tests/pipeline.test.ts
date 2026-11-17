// Test di integrazione: richiede un Postgres di prova (TEST_DATABASE_URL). Le chiamate esterne sono simulate.
import { beforeAll, describe, expect, it, vi } from "vitest";

const DB = process.env.TEST_DATABASE_URL;
if (DB) process.env.DATABASE_URL = DB;
process.env.ANTHROPIC_API_KEY = "test";

vi.mock("@/lib/extract", () => ({
  fetchEventContents: async () => 2,
}));
vi.mock("@/lib/images", () => ({
  pickImage: async (_q: string, _t: string, alt: string) => ({ kind: "card", alt }),
}));
vi.mock("@/lib/ai", async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    aiConfigured: () => true,
    monthSpendUsd: async () => 0,
    generateArticle: async () => ({
      pubblicabile: true,
      motivo_non_pubblicabile: "",
      sensibile: false,
      motivo_sensibile: "",
      impatto_triveneto: 80,
      motivazione_impatto: "Riguarda direttamente il Trentino",
      categoria: "sostenibilita",
      territori: ["trentino-alto-adige"],
      tag: ["energia", "Trento"],
      fatti_confermati: [{ fatto: "Approvato il piano energetico", fonti: [1, 2] }],
      discrepanze: [],
      ipotesi_non_verificate: [],
      titolo: "Il Trentino vara un piano energetico da cento milioni",
      sommario: "La Provincia ha approvato un nuovo piano per l'energia. Le risorse saranno distribuite in tre anni.",
      corpo_markdown:
        "## Le misure\nLa Provincia autonoma ha dato il via libera a un programma triennale dedicato all'energia, con risorse destinate a impianti e reti.\n\n## Perché conta\nPer imprese e famiglie del territorio il piano rappresenta una cornice stabile per investire nella transizione energetica nei prossimi anni.",
      meta_title: "Trentino, piano energetico da 100 milioni",
      meta_description: "Approvato il piano triennale per l'energia in Trentino.",
      slug: "trentino-piano-energetico-100-milioni",
      testo_social: "Il Trentino approva il piano energetico.",
      query_immagine: "Trento",
    }),
  };
});

describe.skipIf(!DB)("pipeline (database)", () => {
  beforeAll(async () => {
    const { q } = await import("@/lib/db");
    await q("TRUNCATE articles, items, events, ai_usage, job_runs, settings RESTART IDENTITY CASCADE");
    const src = await q<{ id: number }>("SELECT id FROM sources WHERE territory='trentino-alto-adige' AND kind='rss' LIMIT 1");
    const now = new Date().toISOString();
    const add = (url: string, title: string, summary: string, domain: string) =>
      q(
        `INSERT INTO items (source_id, url, url_hash, title, title_hash, summary, content, content_status, publisher, domain, published_at)
         VALUES ($1,$2,md5($2),$3,md5($3),$4,$5,'ok',$6,$6,$7)`,
        [src[0].id, url, title, summary, summary.repeat(8), domain, now],
      );
    await add("https://a.it/1", "Trento, approvato il piano energetico provinciale da 100 milioni", "La giunta di Trento approva il piano energia con 100 milioni per fotovoltaico e reti nei prossimi anni.", "a.it");
    await add("https://b.it/2", "Piano energetico del Trentino: la giunta stanzia 100 milioni", "Cento milioni in tre anni: approvato a Trento il piano per l'energia, interventi su reti e impianti.", "b.it");
    await add("https://c.it/3", "Venezia, record di turisti a novembre in laguna", "Turismo in crescita a Venezia, numeri record per il mese.", "c.it");
  });

  it("raggruppa, valuta e genera un articolo in attesa di revisione", async () => {
    const { clusterNewItems } = await import("@/lib/cluster");
    const { generateBatch } = await import("@/lib/pipeline");
    const { getSettings } = await import("@/lib/settings");
    const { q } = await import("@/lib/db");
    const settings = await getSettings();
    const c = await clusterNewItems(settings);
    expect(c.created).toBe(2);
    const ev = await q("SELECT * FROM events ORDER BY source_count DESC");
    expect(ev[0].source_count).toBe(2);
    expect(ev[0].independent_count).toBe(2);
    expect(ev[0].territories).toContain("trentino-alto-adige");

    const g = await generateBatch(settings);
    expect(g.generated).toBe(1);
    const art = await q("SELECT * FROM articles");
    expect(art).toHaveLength(1);
    // all'avvio le regole di autopubblicazione non sono approvate: serve revisione
    expect(art[0].status).toBe("pronto");
    expect(art[0].sources).toHaveLength(2);

    // seconda esecuzione: nessun duplicato
    const g2 = await generateBatch(settings);
    expect(g2.generated).toBe(0);
  });
});
