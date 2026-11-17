-- 17/11/2026: aggiornamento notizie ogni 6 ore solo di giorno (06, 12, 18 ora italiana), su richiesta del proprietario
INSERT INTO settings (key, value) VALUES ('schedule_hours', '[6,12,18]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
