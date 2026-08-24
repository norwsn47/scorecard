-- Adds an idempotency key so a given locally-created round can only ever
-- produce one row in `games`, even if the client POSTs it more than once
-- (e.g. the user taps "Done" again after navigating back to an already-saved
-- Summary screen, a double-tap, or a retried network request).
--
-- Existing rows all get NULL here, which is safe: SQLite does not treat NULL
-- as equal to NULL in a UNIQUE index, so historical rows never collide with
-- each other or with future rows. No backfill or cleanup required before
-- applying this migration.

ALTER TABLE games ADD COLUMN client_round_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_games_user_client_round_id
  ON games(user_id, client_round_id);
