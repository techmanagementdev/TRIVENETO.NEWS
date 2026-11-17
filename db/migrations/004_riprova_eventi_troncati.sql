-- Eventi falliti per risposte AI troncate (17/11/2026): si riprovano con il nuovo limite
UPDATE events SET status='nuovo', status_note=NULL WHERE status='errore';
DELETE FROM settings WHERE key='max_tokens_per_article';
