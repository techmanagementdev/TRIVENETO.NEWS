// Categorie e territori del giornale. Unica fonte di verità per sito, CRM e motore.

export const CATEGORIES = [
  { slug: "politica", name: "Politica" },
  { slug: "economia", name: "Economia" },
  { slug: "attualita", name: "Attualità" },
  { slug: "sostenibilita", name: "Sostenibilità" },
  { slug: "tecnologia", name: "Tecnologia e innovazione" },
] as const;
export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as CategorySlug[];

export const TERRITORIES = [
  { slug: "trentino-alto-adige", name: "Trentino-Alto Adige", local: true },
  { slug: "veneto", name: "Veneto", local: true },
  { slug: "friuli-venezia-giulia", name: "Friuli-Venezia Giulia", local: true },
  { slug: "emilia-romagna", name: "Emilia-Romagna", local: true },
  { slug: "italia", name: "Italia", local: false },
  { slug: "europa", name: "Europa", local: false },
  { slug: "mondo", name: "Mondo", local: false },
] as const;
export type TerritorySlug = (typeof TERRITORIES)[number]["slug"];
export const TERRITORY_SLUGS = TERRITORIES.map((t) => t.slug) as TerritorySlug[];
export const LOCAL_TERRITORIES = TERRITORIES.filter((t) => t.local).map((t) => t.slug) as TerritorySlug[];

export function categoryName(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}
export function territoryName(slug: string) {
  return TERRITORIES.find((t) => t.slug === slug)?.name ?? slug;
}

// Parole chiave (senza accenti, minuscole) usate dal punteggio senza AI.
export const TERRITORY_KEYWORDS: Record<string, string[]> = {
  "trentino-alto-adige": [
    "trentino", "trento", "rovereto", "riva del garda", "arco", "pergine", "alto adige", "sudtirol", "suedtirol",
    "bolzano", "bozen", "merano", "bressanone", "brunico", "dolomiti", "provincia autonoma", "val di fiemme",
    "val di non", "valsugana", "fugatti", "kompatscher", "ianeselli", "autobrennero", "a22",
  ],
  veneto: [
    "veneto", "venezia", "mestre", "verona", "padova", "vicenza", "treviso", "belluno", "rovigo", "chioggia",
    "jesolo", "cortina", "bassano", "castelfranco", "conegliano", "lago di garda", "laguna", "marghera", "zaia",
    "palazzo balbi", "regione veneto",
  ],
  "friuli-venezia-giulia": [
    "friuli", "venezia giulia", "fvg", "trieste", "udine", "pordenone", "gorizia", "monfalcone", "lignano",
    "gemona", "tolmezzo", "fedriga", "carnia",
  ],
  "emilia-romagna": [
    "emilia", "romagna", "bologna", "modena", "parma", "reggio emilia", "ferrara", "ravenna", "rimini", "forli",
    "cesena", "piacenza", "imola", "carpi", "de pascale",
  ],
  europa: [
    "unione europea", "commissione europea", "parlamento europeo", "bruxelles", "strasburgo", "bce",
    "consiglio europeo", "eurozona", "austria", "slovenia", "germania", "baviera", "tirolo", "croazia", "svizzera",
    "von der leyen", "pnrr",
  ],
};

export const CATEGORY_KEYWORDS: Record<CategorySlug, string[]> = {
  politica: [
    "regione", "consiglio regionale", "giunta", "sindaco", "elezioni", "governo", "parlamento", "ministro", "partito",
    "assessore", "presidente della provincia", "legge", "decreto", "opposizione", "maggioranza", "voto", "consiglio comunale",
  ],
  economia: [
    "economia", "pil", "imprese", "impresa", "export", "lavoro", "occupazione", "banca", "inflazione", "dazi",
    "fatturato", "industria", "turismo", "investimenti", "mercato", "aziende", "azienda", "confindustria", "sindacati",
    "crisi aziendale", "bilancio", "fondi", "credito", "prezzi", "salari", "infrastrutture", "porto", "logistica",
  ],
  sostenibilita: [
    "energia", "clima", "rinnovabili", "fotovoltaico", "idrogeno", "emissioni", "ambiente", "rifiuti", "acqua",
    "siccita", "decarbonizzazione", "transizione ecologica", "biodiversita", "inquinamento", "mobilita sostenibile",
    "ghiacciai", "alluvione", "efficienza energetica", "comunita energetiche",
  ],
  tecnologia: [
    "intelligenza artificiale", "digitale", "startup", "innovazione", "ricerca", "universita", "tecnologia", "5g",
    "cyber", "software", "data center", "robot", "brevetto", "fondazione bruno kessler", "fbk", "semiconduttori",
    "spazio", "satellite", "quantistic",
  ],
  attualita: [],
};

// Temi che richiedono sempre revisione umana.
export const SENSITIVE_KEYWORDS = [
  "arrest", "indagat", "accusat", "accusa", "process", "condann", "omicid", "violenz", "abus", "stupr", "morto",
  "morta", "morti", "vittim", "tragedi", "denunc", "scandal", "corruzion", "tangent", "inchiesta", "procura",
  "sequestr", "suicid", "minor", "femminicid", "aggression", "rapina", "spaccio", "sentenza", "querela", "diffamazion",
];
