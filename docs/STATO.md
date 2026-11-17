# Stato di avanzamento — TRIVENETO.NEWS

_Aggiornato: 17/11/2026 06:50 (sessione 1)_

Situazione alle 06:50: 6 articoli online, 6 da approvare nel CRM, nessun errore. Dominio non ancora verificato (DNS da inserire).

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
| 8 | Generazione articoli con Claude | ✅ attiva dal 17/11 03:20 (modello claude-sonnet-5-5, tool_choice auto) |
| 9 | Revisione articoli | ✅ |
| 10 | Immagini con licenza | ✅ verificato: foto Wikimedia con autore e licenza in didascalia |
| 11 | Pubblicazione | ✅ primo articolo autopubblicato 17/11 03:27 |
| 12 | Sito pubblico navigabile | ✅ |
| 13 | Controllo ogni 15 minuti | ✅ worker attivo |
| 14 | Prevenzione duplicati | ✅ |
| 15 | Test principali | ✅ unit + integrazione in CI (nessun test end-to-end con browser) |
| 16 | Costi ed errori monitorabili | ✅ dashboard, statistiche, log worker |
| 17 | Deploy Railway verificato | ✅ healthcheck `/api/health` superato |

## Funzioni aggiunte (17/11 notte)
- Pubblicità dal CRM (`/admin/pubblicita`): 8 posizioni, immagini/GIF/video caricati (salvati in Postgres, tabella `media`) o link YouTube/MP4, rotazione pesata, date di inizio/fine, visualizzazioni e clic (`/api/ad/[id]/click`), riquadri «Spazio disponibile» attivabili
- Gestione articoli (`/admin/articoli`): schede per stato, selezione multipla, pubblica/togli/elimina in blocco o per riga
- Sito: colonna laterale negli articoli, annuncio dentro il testo, tempi relativi, tempo di lettura, ricerca nel menu
- Parole chiave sensibili ampliate (minacce, bombe, attentati, feriti, scomparse…): sempre in revisione

- Aggiornamento notizie: alle 06, 12 e 18 (ora italiana), modificabile in Impostazioni; prezzi AI per la stima costi aggiornati a 2/10 $ per milione di token

- Notizie importanti da una sola fonte ANSA (affidabilità 5): vengono scritte ma restano sempre in revisione; se l'AI non scrive il testo, l'evento va «in attesa» di altre fonti

## Problemi aperti / da fare
- Repository da rendere privato (impostazione GitHub non modificabile da Claude in questo ambiente)
- Dominio: `triveneto.news` e `www.triveneto.news` aggiunti su Railway (17/11). In attesa dei record DNS presso il registrar:
  - CNAME `triveneto.news` → `ctodb0kb.up.railway.app` (se il registrar non ammette CNAME sulla radice: ALIAS/ANAME/flattening)
  - TXT `_railway-verify` → `railway-verify=b373bcc6c39005ef52bba829d690f24ce771aaf111d8da47a00a3ec97c01fd09`
  - CNAME `www` → `qwhlcsma.up.railway.app`
  - TXT `_railway-verify.www` → `railway-verify=7f93f8c016ce750e82df16a894c3a21094142ea011f66c473eb3db8d71f7b9df`
  - Dopo l'attivazione: impostare `SITE_URL=https://triveneto.news` su web e worker
- Chiave Anthropic inserita dal proprietario sul worker; il web la legge per riferimento `${{worker.ANTHROPIC_API_KEY}}`
- Autopubblicazione attiva (migrazione 005): semiautomatica su economia, sostenibilità, tecnologia, attualità. Politica e temi sensibili sempre in revisione
- GDELT disattivato (migrazione 009): rispondeva sempre 429 o andava in timeout da Railway
- `PUBLISHER_INFO` (editore, direttore responsabile, registrazione) da fornire
- Fonti disattivate: Il Piccolo (404), Parlamento europeo (403, blocca i bot). GDELT a volte risponde lentamente o con 429
- Backup: affidati ai backup del servizio Postgres di Railway (verificare il piano); nessun backup applicativo separato
- Google Analytics 4 (`NEXT_PUBLIC_GA_ID`) e Search Console da collegare dopo il dominio definitivo
