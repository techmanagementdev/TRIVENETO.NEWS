-- Correzioni dopo la prima verifica sul server (17/11/2026)
UPDATE sources SET url='https://www.ansa.it/europa/notizie/rss.xml', error_count=0, last_error=NULL WHERE name='ANSA Europa';
-- 404 / 403: disattivate (il Parlamento europeo blocca i bot: rispettiamo il blocco)
UPDATE sources SET active=false WHERE name IN ('Il Piccolo', 'Parlamento europeo — notizie');
-- GDELT limita le richieste: le 6 query vengono sostituite da 2 query aggregate
UPDATE sources SET active=false WHERE kind='gdelt';
INSERT INTO sources (name, url, kind, territory, reliability) VALUES
 ('GDELT · Nord-Est', 'https://api.gdeltproject.org/api/v2/doc/doc?query=%28Trentino+OR+%22Alto+Adige%22+OR+Veneto+OR+Venezia+OR+Verona+OR+Padova+OR+Trieste+OR+Udine+OR+%22Friuli+Venezia+Giulia%22+OR+%22Emilia-Romagna%22+OR+Bologna%29+sourcelang%3Aitalian&mode=artlist&format=json&maxrecords=150&timespan=3h&sort=datedesc', 'gdelt', 'italia', 3),
 ('GDELT · UE e Nord-Est', 'https://api.gdeltproject.org/api/v2/doc/doc?query=%28%22Commissione+europea%22+OR+%22Unione+europea%22+OR+Bruxelles%29+%28Italia+OR+Nordest+OR+Veneto+OR+Trentino%29+sourcelang%3Aitalian&mode=artlist&format=json&maxrecords=75&timespan=3h&sort=datedesc', 'gdelt', 'europa', 3)
ON CONFLICT (url) DO NOTHING;
