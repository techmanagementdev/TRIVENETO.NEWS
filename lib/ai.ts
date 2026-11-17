import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { q, q1 } from "./db";
import { CATEGORY_SLUGS, TERRITORY_SLUGS } from "./taxonomy";

export const PROMPT_VERSION = "articolo-v1";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function model() {
  return process.env.LLM_MODEL || "claude-sonnet-5-5";
}

export function costUsd(inTok: number, outTok: number) {
  const pin = Number(process.env.LLM_PRICE_INPUT_PER_MTOK || 3);
  const pout = Number(process.env.LLM_PRICE_OUTPUT_PER_MTOK || 15);
  return (inTok * pin + outTok * pout) / 1_000_000;
}

export async function monthSpendUsd(): Promise<number> {
  const r = await q1<{ s: string }>(`SELECT coalesce(sum(cost_usd),0) AS s FROM ai_usage WHERE at >= date_trunc('month', now())`);
  return Number(r?.s ?? 0);
}

export const ArticleSchema = z.object({
  pubblicabile: z.boolean(),
  motivo_non_pubblicabile: z.string().optional().default(""),
  sensibile: z.boolean(),
  motivo_sensibile: z.string().optional().default(""),
  impatto_triveneto: z.number().min(0).max(100),
  motivazione_impatto: z.string(),
  categoria: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  territori: z.array(z.enum(TERRITORY_SLUGS as [string, ...string[]])).min(1),
  tag: z.array(z.string()).transform((t) => t.slice(0, 8)),
  fatti_confermati: z.array(z.object({ fatto: z.string(), fonti: z.array(z.number()) })),
  discrepanze: z.array(z.string()),
  ipotesi_non_verificate: z.array(z.string()),
  titolo: z.string().min(10),
  sommario: z.string().min(20),
  corpo_markdown: z.string().min(200),
  meta_title: z.string().optional().default(""),
  meta_description: z.string().optional().default(""),
  slug: z.string().optional().default(""),
  testo_social: z.string().optional().default(""),
  query_immagine: z.string().optional().default(""),
});

/** Completa i campi accessori mancanti o troppo lunghi senza nuove chiamate AI. */
function finalize(d: ArticleDraft): ArticleDraft {
  const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");
  return {
    ...d,
    titolo: cut(d.titolo, 120),
    meta_title: cut(d.meta_title || d.titolo, 70),
    meta_description: cut(d.meta_description || d.sommario, 165),
    slug: (d.slug || d.titolo).slice(0, 90),
    testo_social: cut(d.testo_social || d.sommario, 280),
    query_immagine: (d.query_immagine || d.tag.slice(0, 2).join(" ")).slice(0, 80),
  };
}
export type ArticleDraft = z.infer<typeof ArticleSchema>;

const TOOL: Anthropic.Tool = {
  name: "salva_articolo",
  description: "Salva l'analisi delle fonti e l'articolo originale.",
  input_schema: {
    type: "object",
    properties: {
      pubblicabile: { type: "boolean", description: "false se i fatti essenziali non sono confermati o le fonti non bastano" },
      motivo_non_pubblicabile: { type: "string" },
      sensibile: { type: "boolean", description: "true per accuse, indagini, vicende giudiziarie, cronaca nera, persone private, salute, minori o temi reputazionali" },
      motivo_sensibile: { type: "string" },
      impatto_triveneto: { type: "number", description: "0-100: impatto concreto e documentabile su Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia, Emilia-Romagna" },
      motivazione_impatto: { type: "string" },
      categoria: { type: "string", enum: CATEGORY_SLUGS },
      territori: { type: "array", items: { type: "string", enum: TERRITORY_SLUGS } },
      tag: { type: "array", items: { type: "string" }, description: "massimo 6 tag brevi in italiano" },
      fatti_confermati: {
        type: "array",
        items: { type: "object", properties: { fatto: { type: "string" }, fonti: { type: "array", items: { type: "number" } } }, required: ["fatto", "fonti"] },
      },
      discrepanze: { type: "array", items: { type: "string" } },
      ipotesi_non_verificate: { type: "array", items: { type: "string" } },
      titolo: { type: "string", description: "titolo originale, informativo, massimo 100 caratteri, niente clickbait" },
      sommario: { type: "string", description: "2 frasi" },
      corpo_markdown: { type: "string", description: "articolo originale 300-550 parole in Markdown, con 2-3 sottotitoli ##, nessun titolo H1" },
      meta_title: { type: "string" },
      meta_description: { type: "string" },
      slug: { type: "string" },
      testo_social: { type: "string" },
      query_immagine: { type: "string", description: "2-4 parole per cercare su Wikimedia Commons una foto di repertorio del luogo o del tema (es. 'Trento Piazza Duomo', 'solar panels Alps')" },
    },
    required: [
      "pubblicabile", "sensibile", "impatto_triveneto", "motivazione_impatto", "categoria", "territori", "tag", "fatti_confermati",
      "discrepanze", "ipotesi_non_verificate", "titolo", "sommario", "corpo_markdown", "meta_title", "meta_description", "slug",
      "testo_social", "query_immagine",
    ],
  },
};

const SYSTEM = `Sei il caporedattore di TRIVENETO.NEWS, quotidiano digitale del Nord-Est italiano (Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia, Emilia-Romagna).
Ricevi più fonti giornalistiche numerate sullo stesso evento. Il tuo compito:
1. Estrai i fatti. Un fatto è "confermato" solo se riportato da almeno due fonti indipendenti oppure da una fonte istituzionale primaria. Indica sempre i numeri delle fonti.
2. Segnala le discrepanze tra fonti e separa le ipotesi non verificate.
3. Scrivi un ARTICOLO ORIGINALE in italiano basato SOLO sui fatti confermati.

Regole tassative:
- Non copiare né parafrasare frase per frase i testi delle fonti: costruisci una nuova sintesi con struttura e parole tue.
- Non inventare dati, cifre, dichiarazioni, nomi, date o interpretazioni. Se un dato non è nelle fonti, non scriverlo.
- Citazioni dirette: al massimo una, brevissima (meno di 15 parole), tra virgolette e attribuita.
- Aggiungi contesto territoriale solo se ricavabile dalle fonti; spiega perché la notizia conta per il Nord-Est senza esagerare.
- Tono giornalistico, neutro, chiaro. Niente opinioni, niente sensazionalismo, niente clickbait.
- Usa il condizionale per ciò che non è accertato. Non attribuire colpe: per indagini usa "indagato", "secondo l'accusa".
- Non inserire link né la sezione fonti nel corpo: le fonti vengono aggiunte automaticamente.
- Se le informazioni non bastano per un articolo corretto, imposta pubblicabile=false.
Rispondi SEMPRE e SOLO chiamando lo strumento salva_articolo, senza testo prima o dopo.`;

export interface SourceForAI {
  n: number;
  publisher: string;
  title: string;
  date: string;
  url: string;
  text: string;
  primary: boolean;
}

export async function generateArticle(
  sources: SourceForAI[],
  opts: { eventId: number; maxTokens: number; feedback?: string; previous?: { title: string; body: string } },
): Promise<ArticleDraft> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sourceBlock = sources
    .map(
      (s) =>
        `<fonte n="${s.n}" testata="${s.publisher}"${s.primary ? ' primaria="si"' : ""} data="${s.date}">\nTITOLO: ${s.title}\nTESTO: ${s.text}\n</fonte>`,
    )
    .join("\n\n");
  let user = `Fonti sull'evento:\n\n${sourceBlock}`;
  if (opts.previous) {
    user += `\n\nQuesta è la versione già pubblicata dell'articolo. Aggiornala integrando i nuovi elementi, mantenendo la correttezza:\nTITOLO: ${opts.previous.title}\n${opts.previous.body}`;
  }
  if (opts.feedback) user += `\n\nATTENZIONE: ${opts.feedback}`;

  const res = await client.messages.create({
    model: model(),
    max_tokens: opts.maxTokens,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: user }],
  });
  const inTok = res.usage?.input_tokens ?? 0;
  const outTok = res.usage?.output_tokens ?? 0;
  await q(`INSERT INTO ai_usage (model, purpose, event_id, input_tokens, output_tokens, cost_usd) VALUES ($1,$2,$3,$4,$5,$6)`, [
    model(),
    opts.previous ? "aggiornamento" : opts.feedback ? "riscrittura" : "articolo",
    opts.eventId,
    inTok,
    outTok,
    costUsd(inTok, outTok),
  ]);
  const block = res.content.find((b) => b.type === "tool_use");
  if (res.stop_reason === "max_tokens") throw new Error(`Risposta AI troncata (limite di ${opts.maxTokens} token)`);
  if (block && block.type === "tool_use") return finalize(ArticleSchema.parse(block.input));
  // ripiego: JSON nel testo
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Risposta AI senza dati strutturati");
  return finalize(ArticleSchema.parse(JSON.parse(m[0])));
}
