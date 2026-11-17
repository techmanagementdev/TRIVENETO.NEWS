-- Ricerca attiva di altre testate sulla stessa notizia
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_kind_check;
ALTER TABLE sources ADD CONSTRAINT sources_kind_check CHECK (kind IN ('rss','gdelt','search'));
INSERT INTO sources (name, url, kind, territory, reliability, active)
VALUES ('Ricerca web (altre testate)', 'internal://ricerca-web', 'search', 'italia', 3, true)
ON CONFLICT (url) DO NOTHING;
ALTER TABLE events ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS enrich_note TEXT;
INSERT INTO settings (key, value) VALUES ('run_requested', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
