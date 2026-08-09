-- D1 schema for saved retirement scenarios.
-- Run once against your D1 database (see README).
--
-- Every row belongs to exactly one Google account. `user_sub` is the `sub`
-- claim from Google's id_token: a stable, opaque per-user id. We key on it
-- rather than on the email address, because an email can be changed or
-- reassigned while `sub` never changes.
CREATE TABLE IF NOT EXISTS scenarios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_sub   TEXT    NOT NULL,           -- Google account id (owner)
  user_email TEXT    NOT NULL DEFAULT '',-- for display only; never used to authorise
  name       TEXT    NOT NULL,
  data       TEXT    NOT NULL,           -- JSON string of the input state
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Every query filters by owner first, so this is the index that matters.
CREATE INDEX IF NOT EXISTS idx_scenarios_user
  ON scenarios (user_sub, created_at DESC);
