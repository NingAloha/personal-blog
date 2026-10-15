CREATE TABLE IF NOT EXISTS stats_counters (
  scope TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stats_visit_dedupe (
  scope TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (scope, visitor_hash)
);

CREATE INDEX IF NOT EXISTS stats_visit_dedupe_expiry_idx
  ON stats_visit_dedupe(last_seen_at);

INSERT OR IGNORE INTO stats_counters (scope, value, updated_at)
VALUES ('site', 0, 0);
