-- Articoli bloccati solo da discrepanze minori secondo le regole precedenti: si rigenerano con le nuove regole
WITH old AS (
  SELECT id, event_id FROM articles
  WHERE status = 'pronto' AND cardinality(review_reasons) > 0
    AND NOT EXISTS (SELECT 1 FROM unnest(review_reasons) r WHERE r NOT LIKE 'Discrepanze tra fonti (%')
)
, del AS (DELETE FROM articles a USING old WHERE a.id = old.id RETURNING old.event_id)
UPDATE events SET status='nuovo', status_note=NULL WHERE id IN (SELECT event_id FROM del);
