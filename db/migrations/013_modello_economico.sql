-- 17/11/2026: per contenere i costi la scrittura passa a Claude Haiku 5.5 (modificabile in Impostazioni)
INSERT INTO settings (key, value) VALUES ('writer_model', '"claude-haiku-5-5"'::jsonb), ('max_enrich_per_run', '4'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
