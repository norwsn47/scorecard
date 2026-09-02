-- Adds per-hole par (§5.1). Par is a display / derived-stats attribute only —
-- it never affects totals, the winner, DNF or the draw rule, which all stay
-- raw-stroke. This is the enabling data for the score-vs-par indicator (#38)
-- and the end-of-round tally (#39).
--
-- `hole_pars` is a JSON array of integers stored as TEXT, consistent with
-- `games.player_data`:
--   - courses.hole_pars — length = courses.holes (36); the per-hole par for
--     the course. Set on creation, defaults to all 3s, editable per hole
--     (§11.7).
--   - games.hole_pars   — length = games.holes_played; a snapshot of the
--     course's par as it stood when the round was saved, so later edits to the
--     course (or its deletion) never rewrite a saved round's vs-par maths
--     (§11.3).
--
-- Both columns are nullable with NO backfill. Any course or round created
-- before this migration keeps hole_pars = NULL; every reader treats a missing
-- or null array as par 3 for every hole (correct for Bruntsfield, the only
-- real course to date). No migration of saved rounds.
--
-- Applied with `wrangler d1 execute scorecard-plus --file=migrations/003_add_hole_pars.sql`
-- (add --local for the local dev DB, --remote for production), matching 001/002.

ALTER TABLE courses ADD COLUMN hole_pars TEXT;
ALTER TABLE games ADD COLUMN hole_pars TEXT;
