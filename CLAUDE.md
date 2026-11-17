# TRIVENETO.NEWS — istruzioni persistenti per Claude Code

Quotidiano digitale automatizzato sul Nord-Est (Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia, Emilia-Romagna) con CRM editoriale.
Il proprietario non è uno sviluppatore: Claude esegue tutto il lavoro tecnico (codice, test, commit, deploy Railway) e chiede solo autorizzazioni e decisioni con conseguenze economiche o editoriali.

## Architettura
- **Un solo repository, due servizi Railway** dallo stesso codice:
  - `web` → Next.js 15 (sito pubblico + CRM `/admin` + API). Avvio: `npm start` (esegue prima le migrazioni).
  - `worker` → `npm run worker` (`worker/index.ts`): ogni `fetch_interval_min` minuti (default 15) esegue il ciclo, con lock Postgres (`pg_try_advisory_lock`) contro esecuzioni concorrenti. Il CRM può chiedere un ciclo immediato (`settings.run_requested`).
  - `Postgres` Railway (`DATABASE_URL`).
- **Ciclo** (`lib/pipeline.ts → runCycle`): `ingestAll` (RSS + GDELT, `lib/ingest.ts`) → `clusterNewItems` (raggruppamento per similarità di termini con IDF, `lib/cluster.ts`) → punteggio senza AI (`lib/scoring.ts`) → `generateBatch` (solo eventi sopra soglia, con ≥2 fonti indipendenti o una primaria, entro budget e limiti) → `generateForEvent`: scarica i testi rispettando robots.txt (`lib/extract.ts`), chiama Claude con output strutturato (`lib/ai.ts`), controllo di somiglianza con le fonti (8-grammi), immagine con licenza da Wikimedia Commons o grafica neutra (`lib/images.ts`, `/api/card/[id]`), decide lo stato.
- **Pubblicazione**: `settings.publish_mode` (manuale / semiautomatica / automatica) + `settings.auto_rules_approved`. Finché `auto_rules_approved=false` nessun articolo esce senza approvazione dal CRM. Temi sensibili, discrepanze, testo troppo simile, possibili duplicati → sempre revisione.
- **DB**: schema in `db/migrations/*.sql`, applicate da `scripts/migrate.ts` (idempotente, con lock). Nuove modifiche = nuovo file `00N_nome.sql`, mai modificare quelli già applicati.
- **Tassonomia**: `lib/taxonomy.ts` (categorie, territori, parole chiave). **Impostazioni** runtime: tabella `settings`, default in `lib/settings.ts`.

## Regole
- Rispettare copyright, licenze, robots.txt e limiti di accesso; niente aggiramento di paywall o anti-bot. GDELT: max 1 richiesta ogni 5 s.
- Niente immagini di altre testate; niente immagini generate che simulino foto di eventi reali.
- Non inventare dati editoriali (editore, direttore, registrazione): si leggono da `PUBLISHER_INFO`.
- Nessun segreto nel repository. Variabili in `.env.example`.
- Ogni chiamata AI va registrata in `ai_usage`; rispettare `monthly_budget_usd`.
- Codice e testi dell'interfaccia in italiano.

## Comandi
- `npm run lint` (typecheck) · `npm test` (unit; integrazione se `TEST_DATABASE_URL`) · `npm run build`
- `npm run migrate` · `npm run worker:once` (un ciclo singolo)

## Stato del progetto
Vedi `docs/STATO.md` (aggiornarlo a fine di ogni sessione di lavoro).
