-- Fonti per il focus: tecnologie innovative, greentech, bandi e contributi (17/11/2026)
INSERT INTO sources (name, url, kind, territory, category, reliability) VALUES
 ('Agenda Digitale', 'https://www.agendadigitale.eu/feed/', 'rss', 'italia', 'tecnologia', 4),
 ('EconomyUp', 'https://www.economyup.it/feed/', 'rss', 'italia', 'tecnologia', 4),
 ('StartupItalia', 'https://startupitalia.eu/feed', 'rss', 'italia', 'tecnologia', 3),
 ('Rinnovabili.it', 'https://www.rinnovabili.it/feed/', 'rss', 'italia', 'sostenibilita', 4),
 ('QualEnergia', 'https://www.qualenergia.it/feed/', 'rss', 'italia', 'sostenibilita', 4),
 ('ANSA Ambiente', 'https://www.ansa.it/canale_ambiente/notizie/ambiente_rss.xml', 'rss', 'italia', 'sostenibilita', 5),
 ('ANSA Tecnologia (canale)', 'https://www.ansa.it/canale_tecnologia/notizie/tecnologia_rss.xml', 'rss', 'italia', 'tecnologia', 5)
ON CONFLICT (url) DO NOTHING;
