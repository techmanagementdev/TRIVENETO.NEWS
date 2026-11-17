-- Eventi in errore per testo AI mancante (fonte unica): si riprovano con la nuova gestione "in attesa"
UPDATE events SET status='nuovo', status_note=NULL WHERE status='errore';
INSERT INTO settings (key, value) VALUES ('run_requested', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
