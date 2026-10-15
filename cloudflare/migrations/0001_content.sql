PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('projects', 'essays', 'tech-blogs')),
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (type, slug)
);

CREATE TABLE IF NOT EXISTS article_variants (
  article_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh', 'en')),
  metadata_json TEXT NOT NULL,
  markdown_body TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  sort_date TEXT NOT NULL DEFAULT '',
  source_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (article_id, locale),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS articles_type_slug_idx
  ON articles(type, slug);

CREATE INDEX IF NOT EXISTS article_variants_listing_idx
  ON article_variants(featured DESC, sort_date DESC, article_id);
