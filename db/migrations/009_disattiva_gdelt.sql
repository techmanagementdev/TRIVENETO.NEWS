-- 17/11/2026: GDELT risponde sempre 429 (limite di frequenza) o va in timeout dai server Railway: disattivato.
-- Si può riattivare da CRM → Fonti se in futuro risponde.
UPDATE sources SET active=false WHERE kind='gdelt';
