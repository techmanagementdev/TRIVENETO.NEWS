-- 17/11/2026: il proprietario ha chiesto di mettere il giornale "in definitivo" senza attese di approvazione.
-- Autopubblicazione semiautomatica: escono da sole solo le categorie non politiche e solo se TUTTI i controlli sono superati
-- (≥2 fonti indipendenti o fonte primaria, tema non sensibile, nessuna discrepanza essenziale, testo originale, niente duplicati).
-- Politica e temi sensibili restano sempre in revisione. Si disattiva da CRM → Impostazioni.
INSERT INTO settings (key, value) VALUES
  ('publish_mode', '"semiautomatica"'::jsonb),
  ('auto_rules_approved', 'true'::jsonb),
  ('auto_categories', '["economia","sostenibilita","tecnologia","attualita"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
