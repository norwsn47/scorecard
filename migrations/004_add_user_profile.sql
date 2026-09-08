-- Adds the lightweight user profile fields (§11.3, §11.14): the user's own
-- display name, and a staging column for an email change awaiting magic-link
-- confirmation.
--
--   users.name          — the user's own display name (§11.14). Trimmed to
--     1–60 characters on write (the same length band as a player name in
--     `functions/_lib/game-input.js`); an empty string clears it back to NULL.
--     Set only from the Settings panel — there is no onboarding step and no
--     sign-in prompt.
--   users.pending_email — a new email address awaiting magic-link confirmation
--     (§11.4.1). `users.email` itself never changes until the confirmation
--     link is clicked. Normally NULL; at most one pending change per user — a
--     second email-change request overwrites it. Cleared by
--     `GET /api/auth/confirm-email` once the change is applied.
--
-- Both columns are nullable with NO default and NO backfill. Every existing
-- user reads `name = NULL` / `pending_email = NULL` and is not forced to
-- re-authenticate. `me.js`'s inline session query gains both columns;
-- `functions/_lib/session.js` is unchanged.
--
-- Applied with `wrangler d1 execute scorecard-plus --file=migrations/004_add_user_profile.sql`
-- (add --local for the local dev DB, --remote for production), matching 001/002/003.
-- Must be applied to production D1 before the deploy that ships §11.14.

ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN pending_email TEXT;
