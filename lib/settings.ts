import { q } from "./db";

export type PublishMode = "manuale" | "semiautomatica" | "automatica";

export interface Settings {
  fetch_interval_min: number;
  publish_mode: PublishMode;
  auto_rules_approved: boolean; // finché false nessun articolo esce senza approvazione
  auto_categories: string[]; // categorie autopubblicabili in modalità semiautomatica
  min_priority: number; // soglia di priorità per generare un articolo
  min_independent_sources: number;
  max_articles_per_run: number;
  max_articles_per_day: number;
  monthly_budget_usd: number;
  max_tokens_per_article: number;
  similarity_max: number; // quota massima di sequenze di 8 parole condivise con una fonte
  territory_weights: Record<string, number>;
  category_weights: Record<string, number>;
  cluster_threshold: number;
  run_requested: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  fetch_interval_min: 15,
  publish_mode: "semiautomatica",
  auto_rules_approved: false,
  auto_categories: ["economia", "sostenibilita", "tecnologia"],
  min_priority: 55,
  min_independent_sources: 2,
  max_articles_per_run: 3,
  max_articles_per_day: 30,
  monthly_budget_usd: 40,
  max_tokens_per_article: 8000,
  similarity_max: 0.08,
  territory_weights: {
    "trentino-alto-adige": 1,
    veneto: 1,
    "friuli-venezia-giulia": 1,
    "emilia-romagna": 0.9,
    italia: 0.6,
    europa: 0.6,
    mondo: 0.4,
  },
  category_weights: { politica: 1, economia: 1, attualita: 0.8, sostenibilita: 1, tecnologia: 1 },
  cluster_threshold: 0.32,
  run_requested: false,
};

export async function getSettings(): Promise<Settings> {
  const rows = await q<{ key: string; value: unknown }>("SELECT key, value FROM settings");
  const s: any = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in s) s[r.key] = r.value;
  return s as Settings;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await q(
    "INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [key, JSON.stringify(value)],
  );
}
