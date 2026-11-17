# Stato di avanzamento — TRIVENETO.NEWS

_Aggiornato: 17/11/2026 (sessione 1)_

## Infrastruttura
- GitHub: `techmanagementdev/TRIVENETO.NEWS` (branch `main`, CI GitHub Actions verde)
- Railway: progetto `triveneto-news` (workspace techmanagementdev), servizi `web`, `worker`, `Postgres`; deploy automatico a ogni push su `main`
- URL provvisorio: https://web-production-111d700e.up.railway.app (CRM: `/admin`)

## Criteri di completamento
| # | Punto | Stato |
|---|---|---|
| 1 | Codice su GitHub | ✅ |
| 2 | Database funzionante | ✅ migrazioni applicate su Railway |
| 3 | CRM accessibile | ✅ (credenziali nelle variabili del servizio `web`) — accesso con login verificato solo in locale |
| 4 | Gestione fonti | ✅ |
| 5 | Rilevamento notizie reali | ✅ primo ciclo: 433 notizie da 25 fonti |
| 6 | Raggruppamento | ✅ |
| 7 | Fonti consultabili | ✅ scheda evento |
| 8 | Generazione articoli con Claude | ⏳ manca `ANTHROPIC_API_KEY` (testato con AI simulata) |
| 9 | Revisione articoli | ✅ |
| 10 | Immagini con licenza | ✅ Wikimedia Commons / grafica neutra (verifica reale dopo chiave AI) |
| 11 | Pubblicazione | ✅ (test integrazione) |
| 12 | Sito pubblico navigabile | ✅ |
| 13 | Controllo ogni 15 minuti | ✅ worker attivo |
| 14 | Prevenzione duplicati | ✅ |
| 15 | Test principali | ✅ unit + integrazione in CI (nessun test end-to-end con browser) |
| 16 | Costi ed errori monitorabili | ✅ dashboard, statistiche, log worker |
| 17 | Deploy Railway verificato | ✅ healthcheck `/api/health` superato |

## Problemi aperti / da fare
- Chiave Claude API da configurare sul servizio `worker` e `web` (`ANTHROPIC_API_KEY`)
- Repository da rendere privato (impostazione GitHub non modificabile da Claude in questo ambiente)
- Dominio `triveneto.news`: aggiungere su Railway e impostare i record DNS (serve l'ok del proprietario), poi aggiornare `SITE_URL`
- `PUBLISHER_INFO` (editore, direttore responsabile, registrazione) da fornire
- Fonti disattivate: Il Piccolo (404), Parlamento europeo (403, blocca i bot). GDELT a volte risponde lentamente o con 429
- Backup: affidati ai backup del servizio Postgres di Railway (verificare il piano); nessun backup applicativo separato
- Google Analytics 4 (`NEXT_PUBLIC_GA_ID`) e Search Console da collegare dopo il dominio definitivo
