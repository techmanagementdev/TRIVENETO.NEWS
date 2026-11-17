import { aiConfigured } from "@/lib/ai";
import { getSettings } from "@/lib/settings";
import { CATEGORIES, TERRITORIES } from "@/lib/taxonomy";
import { saveSettings } from "../../actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ salvato?: string }> }) {
  const s = await getSettings();
  const saved = (await searchParams).salvato;
  const num = (name: keyof typeof s, label: string, step = 1, hint?: string) => (
    <label>{label}<input type="number" name={name} defaultValue={s[name] as number} step={step} />{hint && <span className="small" style={{ fontWeight: 400 }}>{hint}</span>}</label>
  );
  return (
    <>
      <h1>Impostazioni</h1>
      {saved && <div className="flash">Impostazioni salvate.</div>}
      <form action={saveSettings}>
        <div className="panel">
          <h2>Pubblicazione</h2>
          <div className="stack" style={{ display: "grid", gap: 12 }}>
            <label>Modalità
              <select name="publish_mode" defaultValue={s.publish_mode}>
                <option value="manuale">Manuale — ogni articolo richiede approvazione</option>
                <option value="semiautomatica">Semiautomatica — autopubblica solo le categorie scelte, se tutti i controlli sono superati</option>
                <option value="automatica">Automatica controllata — autopubblica tutto ciò che supera i controlli</option>
              </select>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400 }}>
              <input type="checkbox" name="auto_rules_approved" defaultChecked={s.auto_rules_approved} style={{ width: "auto", marginTop: 4 }} />
              <span><b>Approvo le regole di autopubblicazione.</b> Un articolo esce da solo solo se: almeno {s.min_independent_sources} fonti indipendenti (o una fonte istituzionale), nessuna discrepanza tra fonti, tema non sensibile, testo originale (controllo di somiglianza superato), nessun possibile duplicato e impatto sul territorio adeguato. Finché questa casella è vuota, nessun articolo viene pubblicato senza la tua approvazione.</span>
            </label>
            <fieldset className="filters" style={{ border: "1px solid var(--line)", borderRadius: 6 }}>
              <legend className="small">Categorie autopubblicabili (modalità semiautomatica)</legend>
              {CATEGORIES.map((c) => (
                <label key={c.slug} style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 400 }}>
                  <input type="checkbox" name="auto_categories" value={c.slug} defaultChecked={s.auto_categories.includes(c.slug)} style={{ width: "auto" }} />{c.name}
                </label>
              ))}
            </fieldset>
          </div>
        </div>
        <div className="panel">
          <h2>Ricerca e selezione</h2>
          <div className="grid2">
            {num("fetch_interval_min", "Frequenza di ricerca (minuti)")}
            {num("min_priority", "Priorità minima per generare un articolo (0-100)")}
            {num("min_independent_sources", "Fonti indipendenti minime")}
            {num("max_articles_per_run", "Articoli massimi per controllo")}
            {num("max_articles_per_day", "Articoli massimi al giorno")}
          </div>
        </div>
        <div className="panel">
          <h2>Costi AI {aiConfigured() ? <span className="badge pubblicato">chiave configurata</span> : <span className="badge errore">chiave mancante</span>}</h2>
          <div className="grid2">
            {num("monthly_budget_usd", "Budget mensile massimo (USD)", 1, "Al raggiungimento la generazione si ferma fino al mese successivo.")}
            {num("max_tokens_per_article", "Token massimi per articolo")}
          </div>
        </div>
        <div className="grid2">
          <div className="panel">
            <h2>Priorità territoriali</h2>
            {TERRITORIES.map((t) => <label key={t.slug}>{t.name}<input type="number" step="0.1" min="0" max="2" name={`tw_${t.slug}`} defaultValue={s.territory_weights[t.slug] ?? 1} /></label>)}
          </div>
          <div className="panel">
            <h2>Priorità tematiche</h2>
            {CATEGORIES.map((c) => <label key={c.slug}>{c.name}<input type="number" step="0.1" min="0" max="2" name={`cw_${c.slug}`} defaultValue={s.category_weights[c.slug] ?? 1} /></label>)}
          </div>
        </div>
        <button type="submit">Salva impostazioni</button>
      </form>
    </>
  );
}
