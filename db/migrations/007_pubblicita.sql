-- Spazi pubblicitari gestiti dal CRM
CREATE TABLE IF NOT EXISTS media (
  id         BIGSERIAL PRIMARY KEY,
  filename   TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INT NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ads (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  advertiser  TEXT,
  placement   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('image','video','youtube')),
  media_id    BIGINT REFERENCES media(id) ON DELETE SET NULL,
  video_url   TEXT,
  link_url    TEXT,
  alt         TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  weight      INT NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 10),
  starts_at   DATE,
  ends_at     DATE,
  impressions INT NOT NULL DEFAULT 0,
  clicks      INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ads_placement_idx ON ads (placement) WHERE active;

INSERT INTO settings (key, value) VALUES ('show_ad_placeholders', 'true'::jsonb) ON CONFLICT (key) DO NOTHING;
