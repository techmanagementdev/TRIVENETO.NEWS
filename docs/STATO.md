# Stato di avanzamento — TRIVENETO.NEWS

_Aggiornato: 17/11/2026 (sessione 1)_

## Completato
- Schema database, migrazioni, fonti iniziali (25)
- Motore: raccolta RSS/GDELT, deduplica, raggruppamento eventi, fonti indipendenti, punteggio, generazione con Claude, controllo somiglianza, immagini con licenza, regole di pubblicazione, budget
- Worker con scheduler ogni 15 minuti e lock contro esecuzioni concorrenti
- CRM: login, dashboard, notizie, scheda evento, articoli, fonti, statistiche, messaggi, impostazioni
- Sito pubblico: home, categorie, territori, articolo, tag, ricerca, archivio, pagine istituzionali, rettifiche/contatti, sitemap, news sitemap, RSS, robots, JSON-LD, Open Graph
- Test unitari e di integrazione, CI GitHub Actions

## In corso
- Deploy Railway e verifica sul campo

## Problemi aperti
- Gli URL delle fonti iniziali vanno verificati sul server: quelle in errore compaiono nel CRM (Fonti)
