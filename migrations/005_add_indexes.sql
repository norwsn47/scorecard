-- Adds indexes for lookups that currently scan a whole table (BACKLOG #103, #82).
-- Index-only: no column, data or query changes, so it is safe to apply before or
-- after a deploy, and safe to re-run (IF NOT EXISTS).
--
--   games(course_id, user_id)  - the per-course round count in GET /api/courses,
--     and the count and delete by course in DELETE /api/courses/[id]. Without it
--     each of those reads every row in `games` (all users).
--   courses(user_id)           - GET /api/courses lists a user's courses.
--   sessions(user_id)          - account deletion removes a user's sessions.
--   magic_tokens(email)        - the per-address throttle count on every
--     POST /api/auth/request-link, and the clean-up on account deletion.
--   users(pending_email)       - GET /api/auth/confirm-email looks the owner up
--     by pending_email (BACKLOG #82).
--
-- Each index adds one extra row write per insert into its table; at this scale
-- that is negligible next to the full-table reads it removes.
--
-- Applied with `wrangler d1 execute scorecard-plus --file=migrations/005_add_indexes.sql`
-- (add --local for the local dev DB, --remote for production), matching 001-004.

CREATE INDEX IF NOT EXISTS idx_games_course_user ON games(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_email ON magic_tokens(email);
CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email);
