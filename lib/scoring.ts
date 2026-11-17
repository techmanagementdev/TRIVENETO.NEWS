import { CATEGORY_KEYWORDS, CATEGORY_SLUGS, LOCAL_TERRITORIES, SENSITIVE_KEYWORDS, TERRITORY_KEYWORDS, type CategorySlug } from "./taxonomy";
import { containsKeyword, normalize } from "./text";
import type { Settings } from "./settings";

export interface ScoreInput {
  text: string; // titoli + sommari dell'evento
  sourceTerritories: string[];
  sourceCategories: (string | null)[];
  maxReliability: number;
  independent: number;
  hasPrimary: boolean;
  lastSeen: Date;
  now?: Date;
}

export interface ScoreResult {
  priority: number;
  territories: string[];
  category: CategorySlug;
  sensitive: boolean;
}

export function detectTerritories(normText: string, sourceTerritories: string[]): string[] {
  const found = new Set<string>();
  for (const [t, kws] of Object.entries(TERRITORY_KEYWORDS)) {
    if (kws.some((k) => containsKeyword(normText, k))) found.add(t);
  }
  for (const t of sourceTerritories) if (LOCAL_TERRITORIES.includes(t as any)) found.add(t);
  if (![...found].some((t) => LOCAL_TERRITORIES.includes(t as any))) {
    for (const t of sourceTerritories) found.add(t);
  }
  if (!found.size) found.add("italia");
  return [...found];
}

export function detectCategory(normText: string, hints: (string | null)[]): CategorySlug {
  const scores: Record<string, number> = {};
  for (const c of CATEGORY_SLUGS) {
    scores[c] = CATEGORY_KEYWORDS[c].filter((k) => containsKeyword(normText, k)).length;
  }
  for (const h of hints) if (h && h in scores) scores[h] += 1;
  let best: CategorySlug = "attualita";
  let bestScore = 0;
  for (const c of CATEGORY_SLUGS) {
    if (scores[c] > bestScore) {
      best = c;
      bestScore = scores[c];
    }
  }
  return best;
}

export function isSensitive(normText: string) {
  return SENSITIVE_KEYWORDS.some((k) => containsKeyword(normText, k));
}

export function scoreEvent(input: ScoreInput, settings: Pick<Settings, "territory_weights" | "category_weights">): ScoreResult {
  const norm = normalize(input.text);
  const territories = detectTerritories(norm, input.sourceTerritories);
  const category = detectCategory(norm, input.sourceCategories);
  const sensitive = isSensitive(norm);

  const tw = (t: string) => settings.territory_weights[t] ?? 0.5;
  const local = territories.filter((t) => LOCAL_TERRITORIES.includes(t as any));
  let score = 0;
  if (local.length) score += 40 * Math.max(...local.map(tw));
  else score += 20 * Math.max(...territories.map(tw));

  const cw = settings.category_weights[category] ?? 1;
  score += (category === "attualita" ? 5 : 10) * cw;
  score += Math.min(input.independent, 4) * 8;
  if (input.hasPrimary) score += 8;
  if (input.maxReliability >= 5) score += 5;

  const hours = ((input.now ?? new Date()).getTime() - input.lastSeen.getTime()) / 3600_000;
  if (hours > 24) score -= 25;
  else if (hours > 12) score -= 10;

  return { priority: Math.max(0, Math.min(100, Math.round(score))), territories, category, sensitive };
}
