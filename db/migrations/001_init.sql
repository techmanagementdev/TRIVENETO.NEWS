-- TRIVENETO.NEWS — schema iniziale

CREATE TABLE IF NOT EXISTS sources (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL UNIQUE,
  kind            TEXT NOT NULL DEFAULT 'rss' CHECK (kind IN ('rss','gdelt')),
  territory       TEXT NOT NULL DEFAULT 'italia',
  category        TEXT,
  reliability     INT  NOT NULL DEFAULT 3 CHECK (reliability BETWEEN 1 AND 5),
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  last_ok_at      TIMESTAMPTZ,
  last_error      TEXT,
  error_count     INT NOT NULL DEFAULT 0,
  items_found     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id                BIGSERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'attualita',
  territories       TEXT[] NOT NULL DEFAULT '{}',
  keywords          TEXT[] NOT NULL DEFAULT '{}',
  vector            JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority          INT NOT NULL DEFAULT 0,
  source_count      INT NOT NULL DEFAULT 0,
  independent_count INT NOT NULL DEFAULT 0,
  has_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  sensitive         BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'nuovo',
  status_note       TEXT,
  analysis          JSONB,
  has_update        BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_last_seen_idx ON events (last_seen DESC);
CREATE INDEX IF NOT EXISTS events_status_idx ON events (status);

CREATE TABLE IF NOT EXISTS items (
  id            BIGSERIAL PRIMARY KEY,
  source_id     INT REFERENCES sources(id) ON DELETE SET NULL,
  event_id      BIGINT REFERENCES events(id) ON DELETE SET NULL,
  url           TEXT NOT NULL,
  url_hash      TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  title_hash    TEXT NOT NULL,
  summary       TEXT,
  content       TEXT,
  content_status TEXT NOT NULL DEFAULT 'pending',
  publisher     TEXT,
  domain        TEXT,
  published_at  TIMESTAMPTZ,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_event_idx ON items (event_id);
CREATE INDEX IF NOT EXISTS items_fetched_idx ON items (fetched_at DESC);
CREATE INDEX IF NOT EXISTS items_title_hash_idx ON items (title_hash);

CREATE TABLE IF NOT EXISTS articles (
  id               BIGSERIAL PRIMARY KEY,
  event_id         BIGINT UNIQUE REFERENCES events(id) ON DELETE SET NULL,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  summary          TEXT NOT NULL,
  body_md          TEXT NOT NULL,
  category         TEXT NOT NULL,
  territories      TEXT[] NOT NULL DEFAULT '{}',
  tags             TEXT[] NOT NULL DEFAULT '{}',
  meta_title       TEXT,
  meta_description TEXT,
  social_text      TEXT,
  sources          JSONB NOT NULL DEFAULT '[]'::jsonb,
  image            JSONB,
  status           TEXT NOT NULL DEFAULT 'pronto' CHECK (status IN ('bozza','pronto','pubblicato','ritirato')),
  needs_review     BOOLEAN NOT NULL DEFAULT TRUE,
  review_reasons   TEXT[] NOT NULL DEFAULT '{}',
  similarity_max   REAL,
  update_note      TEXT,
  views            INT NOT NULL DEFAULT 0,
  published_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  search           tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('italian', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('italian', coalesce(summary,'')), 'B') ||
    setweight(to_tsvector('italian', coalesce(body_md,'')), 'C')
  ) STORED
);
CREATE INDEX IF NOT EXISTS articles_status_pub_idx ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_search_idx ON articles USING GIN (search);
CREATE INDEX IF NOT EXISTS articles_category_idx ON articles (category);
CREATE INDEX IF NOT EXISTS articles_territories_idx ON articles USING GIN (territories);

CREATE TABLE IF NOT EXISTS page_views (
  article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  views      INT NOT NULL DEFAULT 0,
  referrer_search INT NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, day)
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id            BIGSERIAL PRIMARY KEY,
  at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  model         TEXT NOT NULL,
  purpose       TEXT NOT NULL,
  event_id      BIGINT,
  input_tokens  INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10,5) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ai_usage_at_idx ON ai_usage (at DESC);

CREATE TABLE IF NOT EXISTS job_runs (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'running',
  stats       JSONB NOT NULL DEFAULT '{}'::jsonb,
  error       TEXT
);
CREATE INDEX IF NOT EXISTS job_runs_started_idx ON job_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('contatto','rettifica')),
  name        TEXT,
  email       TEXT,
  article_url TEXT,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'nuovo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
