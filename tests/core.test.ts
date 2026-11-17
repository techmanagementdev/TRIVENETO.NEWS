import { describe, expect, it } from "vitest";
import { assignItems, countIndependent } from "@/lib/cluster";
import { isPrivateIp, assertPublicUrl } from "@/lib/net";
import { detectCategory, detectTerritories, scoreEvent } from "@/lib/scoring";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { canonicalUrl, normalize, overlapRatio, slugify } from "@/lib/text";

describe("testo", () => {
  it("slug SEO", () => {
    expect(slugify("Trento, la Giunta approva il bilancio 2027: più fondi all'energia!")).toBe(
      "trento-la-giunta-approva-il-bilancio-2027-piu-fondi-all-energia",
    );
  });
  it("URL canonico senza parametri di tracciamento", () => {
    expect(canonicalUrl("https://www.ansa.it/a/b.html?utm_source=x&id=3#top")).toBe("https://ansa.it/a/b.html?id=3");
  });
  it("misura la sovrapposizione testuale", () => {
    const src = "La giunta provinciale di Trento ha approvato oggi il nuovo piano energetico che prevede investimenti per cento milioni di euro";
    expect(overlapRatio(src, src)).toBe(1);
    expect(overlapRatio("Un testo completamente diverso che parla di altro argomento nella regione del Veneto e di altre cose", src)).toBe(0);
  });
});

describe("raggruppamento", () => {
  const items = [
    { id: 1, title: "Trento, approvato il piano energetico provinciale da 100 milioni", summary: "La giunta di Trento approva il piano energia" },
    { id: 2, title: "Piano energetico del Trentino: la giunta stanzia 100 milioni", summary: "Approvato a Trento il piano per l'energia" },
    { id: 3, title: "Venezia, record di turisti a novembre in laguna", summary: "Turismo in crescita a Venezia" },
    { id: 4, title: "Udine, nuova linea ferroviaria verso Trieste", summary: "Treni regionali Friuli" },
  ];
  it("unisce notizie sullo stesso evento e separa le altre", () => {
    const { assignments } = assignItems(items, [], DEFAULT_SETTINGS.cluster_threshold);
    const ev = Object.fromEntries(assignments.map((a) => [a.itemId, a.eventId]));
    expect(ev[1]).toBe(ev[2]);
    expect(ev[3]).not.toBe(ev[1]);
    expect(ev[4]).not.toBe(ev[3]);
  });
  it("non conta come indipendenti le testate che copiano lo stesso lancio", () => {
    const lancio = "La giunta provinciale di Trento ha approvato oggi il nuovo piano energetico che prevede investimenti per cento milioni di euro nei prossimi tre anni";
    expect(countIndependent([
      { publisher: "ansa.it", text: lancio },
      { publisher: "giornale-a.it", text: lancio + " fonte ANSA" },
      { publisher: "giornale-b.it", text: "Cento milioni in tre anni per l'energia: il Trentino vara il suo piano, con fondi per fotovoltaico e reti" },
    ])).toBe(2);
  });
});

describe("punteggio", () => {
  it("riconosce territori e categorie", () => {
    const t = normalize("A Bolzano e Verona crescono le imprese dell'export");
    expect(detectTerritories(t, [])).toEqual(expect.arrayContaining(["trentino-alto-adige", "veneto"]));
    expect(detectCategory(t, [])).toBe("economia");
  });
  it("premia notizie locali con più fonti", () => {
    const base = { sourceTerritories: [], sourceCategories: [], maxReliability: 4, hasPrimary: false, lastSeen: new Date() };
    const local = scoreEvent({ ...base, text: "Trento, investimenti delle imprese in crescita", independent: 3 }, DEFAULT_SETTINGS);
    const far = scoreEvent({ ...base, text: "Elezioni in Argentina, vince il candidato", independent: 1, sourceTerritories: ["mondo"] }, DEFAULT_SETTINGS);
    expect(local.priority).toBeGreaterThan(DEFAULT_SETTINGS.min_priority);
    expect(far.priority).toBeLessThan(DEFAULT_SETTINGS.min_priority);
  });
  it("segnala i temi sensibili", () => {
    expect(scoreEvent({ text: "Padova, arrestato assessore per corruzione", sourceTerritories: [], sourceCategories: [], maxReliability: 5, independent: 3, hasPrimary: false, lastSeen: new Date() }, DEFAULT_SETTINGS).sensitive).toBe(true);
  });
});

describe("sicurezza di rete", () => {
  it("blocca indirizzi privati", async () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.2.3.4")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    await expect(assertPublicUrl("http://127.0.0.1/admin")).rejects.toThrow();
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(assertPublicUrl("http://localhost:5432")).rejects.toThrow();
  });
});
