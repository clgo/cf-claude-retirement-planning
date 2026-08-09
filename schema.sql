-- D1 schema for saved retirement scenarios.
-- Run once against your D1 database (see README).
CREATE TABLE IF NOT EXISTS scenarios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  data       TEXT    NOT NULL,           -- JSON string of the input state
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scenarios_created ON scenarios (created_at DESC);
