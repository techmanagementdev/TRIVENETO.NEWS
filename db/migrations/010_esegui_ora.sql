-- Richiede un ciclo immediato dopo il deploy (criteri di generazione aggiornati il 17/11)
INSERT INTO settings (key, value) VALUES ('run_requested', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
