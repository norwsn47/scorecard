# Build Plan
## Scorecard by Outbuild — Bruntsfield Links

> Phase 1–3 work (Chunks 1–20) is complete and archived in BUILDPLAN-ARCHIVE.md.
> This file now tracks Phase 4 — Scorecard Plus (v2.0).

**Version:** 2.0
**Last updated:** 12 July 2026
**Stack:** Vite + React · Tailwind CSS · localStorage · Cloudflare Pages · Cloudflare D1 · Cloudflare Pages Functions · Resend

---

## Phase 4 — Scorecard Plus

Nine chunks, built in sequence. Each chunk is one deliverable unit with a clear verify step. The order is fixed — later chunks depend on earlier ones.

**Prerequisites before any chunk starts:**
- `RESEND_API_KEY` — created and ready (confirmed 12 July 2026). Add to Cloudflare Pages env vars before Chunk 23
- `RESEND_FROM_EMAIL` — `scorecard@outbuild.uk` (confirmed). DNS verification in Resend dashboard must complete before Chunk 23 sends a real email
- `APP_URL` — `https://scorecard.outbuild.uk` (confirmed). Add to Cloudflare Pages env vars before Chunk 23
- All three confirmed before Chunk 23 starts. Chunks 21 and 22 can proceed without them

---

## Chunk 21 — D1 database setup + schema
**Status: Not started**
**Depends on: Nothing (infrastructure)**

**Goal:** A working Cloudflare D1 database with the full v2.0 schema applied and verified locally.

- Create the D1 database via `wrangler d1 create scorecard-plus`
- Update `wrangler.toml` to add the D1 binding: name `DB`, database name and ID from the create command
- Write the initial SQL migration file covering all five tables:
  - `users` — id (UUID PK), email (unique, not null), created_at
  - `magic_tokens` — id (UUID PK), email (not null), token (unique, not null), expires_at, used (boolean, default false)
  - `sessions` — id (UUID PK), user_id (FK → users.id), created_at, expires_at
  - `games` — id (UUID PK), user_id (FK → users.id), game_name (nullable), played_at, holes_played (integer), player_data (JSON text, not null), course_id (FK → courses.id, nullable), created_at
  - `courses` — id (UUID PK), user_id (FK → users.id, nullable for system courses), name (not null), holes (integer, default 36), is_default (boolean, default false), created_at
- Apply migration locally: `wrangler d1 execute DB --local --file=migrations/001_initial.sql`
- Verify schema is correct with a local query

**Note:** The `courses` table is created before `games` so the FK reference is valid. The migration must run in a single file or in the correct order.

**Verify:** `wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table'"` returns all five table names. No migration errors. `wrangler.toml` binding confirmed correct.

---

## Chunk 22 — Pages Functions API scaffold
**Status: Not started**
**Depends on: 21**

**Goal:** A working Cloudflare Pages Functions structure with the D1 binding confirmed live, a health check endpoint, and local dev running cleanly.

- Create `/functions` directory in the project root
- Set up the directory structure:
  - `/functions/api/health.js` — GET endpoint, returns `{ ok: true, db: "connected" }` after running a trivial D1 query
  - `/functions/api/auth/` — directory for auth endpoints (files created in Chunk 23)
  - `/functions/api/games/` — directory for games endpoints (files created in Chunk 28)
- Confirm `wrangler.toml` Pages Functions configuration is correct (the `/functions` directory is picked up automatically by Cloudflare Pages — verify this is configured correctly for the local dev setup)
- Start local dev with `wrangler pages dev dist --d1=DB` (or equivalent) and confirm:
  - The existing Vite-built frontend is served correctly
  - `GET /api/health` returns the expected JSON
  - The D1 binding is accessible from the function context
- Add a utility helper: `src/lib/api.js` — a thin fetch wrapper the frontend will use to call Pages Functions endpoints (handles JSON parse, error response normalisation)

**Verify:** `GET /api/health` returns `{ ok: true, db: "connected" }` in local dev. No binding errors. D1 executes a test query without error. Frontend still loads and works normally.

---

## Chunk 23 — Magic link auth backend
**Status: Not started**
**Depends on: 21, 22**
**Requires: RESEND_API_KEY and RESEND_FROM_EMAIL set in environment**

**Goal:** The two auth endpoints that power magic link sign-in — request a link and verify it. No frontend yet.

**`POST /api/auth/request-link`:**
- Accepts `{ email }` in the request body
- Validates email format — returns 400 if invalid
- Generates a secure random token (crypto.randomUUID or equivalent)
- Inserts a row into `magic_tokens`: email, token, expires_at (now + 15 minutes), used = false
- Sends the magic link email via Resend:
  - From: `RESEND_FROM_EMAIL`
  - To: the provided email
  - Subject: "Your Scorecard Plus sign-in link"
  - Body: simple HTML with a CTA button — "Sign in to Scorecard Plus" — linking to `{APP_URL}/api/auth/verify?token={token}`
  - Plain-text fallback with the full URL below
  - Outbuild sign-off at the bottom
- Returns 200 `{ sent: true }` regardless of whether the email address already exists — never reveal whether an account exists
- Rate limiting note: no rate limiting in v2.0 — log to backlog for post-launch

**`GET /api/auth/verify?token=<token>`:**
- Looks up the token in `magic_tokens`
- Returns 400 if: token not found, token expired, token already used
- Marks the token as used (used = true)
- Looks up user by email — creates a new user record if none exists
- On new user creation: inserts a Bruntsfield Links record into `courses` for that user (name = "Bruntsfield Links", holes = 36, is_default = true)
- Creates a session: inserts into `sessions` with id = new UUID, user_id, created_at = now, expires_at = now + 30 days
- Sets cookie: `session=<session_id>; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/`
- Redirects to `{APP_URL}/?verified=true` (the frontend picks up the query param to show a welcome message)

**Verify:** `POST /api/auth/request-link` with a valid email returns 200 and an email arrives in the inbox. The magic link URL in the email is correct. `GET /api/auth/verify?token=<valid_token>` sets the session cookie and redirects. A user row is created in D1. A Bruntsfield Links course row is created for the new user. The token is marked as used. A second attempt with the same token returns 400.

---

## Chunk 24 — Session middleware
**Status: Not started**
**Depends on: 23**

**Goal:** Session validation infrastructure used by all protected API routes, plus the `me` and `logout` endpoints.

**Session validation helper** (`functions/_middleware.js` or a shared utility):
- A reusable function: `validateSession(request, env)` — reads the `session` cookie, queries D1 for a matching unexpired session, returns `{ user }` or null
- Used by all protected endpoints — if null, they return 401

**`GET /api/auth/me`:**
- Calls `validateSession` — returns 401 if no valid session
- Returns `{ user: { id, email } }` if valid
- The frontend calls this on every app load to determine auth state

**`POST /api/auth/logout`:**
- Calls `validateSession` — returns 401 if no valid session
- Deletes the session row from D1
- Returns a `Set-Cookie` header that clears the cookie (expires in the past, same name and path)
- Returns 200 `{ loggedOut: true }`

**Frontend session context:**
- Add a `useAuth` hook (`src/hooks/useAuth.js`) that calls `/api/auth/me` on mount and exposes `{ user, loading, logout }`
- The `logout` function calls `POST /api/auth/logout` then clears local user state
- This hook is called once at the top level (e.g. in `App.jsx`) and its result passed via context or prop — not called multiple times per page
- The hook result is available throughout the app for conditional rendering

**Verify:** `GET /api/auth/me` with a valid session cookie returns the correct user. Without a session cookie, returns 401. `POST /api/auth/logout` deletes the session from D1 and the cookie is cleared in the browser. After logout, `/api/auth/me` returns 401. The `useAuth` hook reflects the correct state on load.

---

## Chunk 25 — Auth UI
**Status: Not started**
**Depends on: 23, 24**

**Goal:** The login screen, post-send confirmation, session-aware routing, and logout. The entry point for all Plus features.

**Login screen (`/login`):**
- Single email input field
- CTA button: "Send me a sign-in link"
- Subtext: "No password needed — we'll email you a link."
- Styled consistently with the rest of the app — cream background, terracotta CTA, Inter for UI text
- Submits to `POST /api/auth/request-link` — shows inline loading state on the button during the request
- On success: navigates to `/login/check-email` (or shows inline success state — decide during build)
- On API error: shows a brief inline error message

**Post-send screen:**
- "Check your email" heading
- "We've sent a sign-in link to [email]. It expires in 15 minutes."
- No resend button in v2.0 — log to backlog
- Back/home link

**Welcome state:**
- On redirect from `/api/auth/verify`, the app lands at `/?verified=true`
- The home screen detects the `verified` query param and shows a brief welcome message: "Welcome to Scorecard Plus"
- The param is removed from the URL after display (replace state)

**Session-aware routing:**
- If the user is logged in and navigates to `/login`, redirect to `/` (no point in showing login again)
- Protected routes (history, game save) check `useAuth` — if not logged in, they fall back to the logged-out behaviour rather than hard-redirecting (the app must still work for logged-out users)

**Home screen additions:**
- When logged in: show "Hi [email]" or a minimal user indicator in the header area — restrained, not prominent
- When logged in: show a "Sign out" link (small, muted) — calls `logout()` from `useAuth`
- When logged out: show a "Sign in to Scorecard Plus" link (small, below the main buttons) — navigates to `/login`

**Verify:** Login form submits correctly, loading state shows. Post-send screen shows the correct email. Welcome message appears after verification. Logged-in user sees their indicator on the home screen. Logout clears the session and the user indicator disappears. Navigating to `/login` while logged in redirects to `/`. App still works completely for a logged-out user.

---

## Chunk 26 — Scorecard Plus branding
**Status: Not started**
**Depends on: 25**

**Goal:** The "Plus" visual treatment in the logged-in header. One quiet change — not a redesign.

- When the user is authenticated, the app name in the header/logo area reads "Scorecard Plus" instead of "Scorecard"
- "Plus" is rendered in the terracotta accent colour — same weight and baseline as the rest of the wordmark
- The treatment must match the existing Cormorant Garamond italic heading style — "Plus" uses the same typeface, appended to the existing wordmark
- Logged-out users see exactly the existing wordmark — no change
- This change applies to the home screen header; on other screens (scorecard, history, etc.) the header may be simpler — apply consistently only where the full wordmark already appears
- No other branding changes in this chunk

**Verify:** Logged-in users see "Scorecard Plus" with "Plus" in terracotta. Logged-out users see "Scorecard" — no "Plus". The wordmark looks intentional, not bolted-on. Tested on both iOS Safari and a desktop browser.

---

## Chunk 27 — Course creation and selection UI
**Status: Not started**
**Depends on: 25**

**Goal:** Logged-in users can select from their courses or create a new one when starting a game.

**API endpoints:**
- `GET /api/courses` — returns the authenticated user's courses, ordered by created_at; requires session
- `POST /api/courses` — creates a new course: `{ name }` in body; name must be non-empty (max 100 chars); returns the created course; requires session
- Both return 401 if not authenticated

**New game setup screen (logged-in only):**
- A course selector appears above the player name fields
- Shows the user's existing courses as a list/dropdown — Bruntsfield Links is selected by default on first use (is_default = true)
- Below the list: a "Create new course" option — tapping it shows an inline text input for the course name
- Submitting the new course name calls `POST /api/courses` and selects the new course automatically
- The selected course is stored in component state for use when the game is saved (Chunk 28)
- If the API call to load courses fails (network error, etc.), the course selector shows an error state and the user can still start a game without a course selected

**Logged-out users:**
- No course selector shown — quick-play is hardcoded to Bruntsfield Links as before
- No change to logged-out new-game flow

**Verify:** Logged-in user sees the course selector on the new game setup screen. Bruntsfield Links is pre-selected. Can create a new course by name — it appears in the selector immediately. Can select a different course. Logged-out user sees no course selector. `GET /api/courses` returns 401 without a session.

---

## Chunk 28 — Logged-in game save to D1
**Status: Not started**
**Depends on: 25, 27**

**Goal:** Completed games are saved to D1 for logged-in users.

**API endpoint:**
- `POST /api/games` — saves a completed game; requires session
- Body: `{ game_name, played_at, holes_played, player_data, course_id }`
- `player_data` is a JSON array matching the existing game completion shape from localStorage
- Returns the created game record with its D1-assigned id
- Returns 401 if not authenticated

**Frontend game completion flow:**
- In `finishGame` (or wherever the game completion logic lives), check `useAuth` for the current user
- If logged in: call `POST /api/games` with the completed game data — alongside (or instead of) writing to localStorage
  - Preferred approach: for logged-in users, save to D1 only, not localStorage — this keeps the two histories cleanly separate (aligns with PRD 11.9)
  - The active game object in localStorage is still used during play (for resume state) — it is cleared after successful D1 save, same as the current logout behaviour
- If not logged in: save to localStorage only (existing behaviour, unchanged)
- If the API call fails (network error, etc.): fall back to localStorage save and flag the failure to the user with a brief inline message — "Game saved locally. Sign in to sync across devices."
- The `course_id` comes from the course selection made in Chunk 27 — pass it through the game state

**Verify:** Completing a game while logged in saves the record to D1. The D1 record contains the correct player_data, game_name, holes_played, course_id. The active game is cleared from localStorage after D1 save. Completing a game while logged out saves to localStorage only, as before. API returns 401 without a session.

---

## Chunk 29 — Logged-in history
**Status: Not started**
**Depends on: 25, 28**

**Goal:** Logged-in users see their DB-backed game history. Logged-out users see localStorage history. The two are kept separate.

**API endpoint:**
- `GET /api/games` — returns the authenticated user's games, most recent first; requires session
- Each record includes: id, game_name, played_at, holes_played, player_data (JSON), course name (joined from courses table)
- Returns 401 if not authenticated

**`GET /api/games/:id`:**
- Returns a single game record by ID for the authenticated user
- Returns 401 if not authenticated, 404 if not found or belongs to a different user

**History screen:**
- Detect auth state via `useAuth`
- If logged in: fetch from `GET /api/games` — show DB-backed history
- If logged out: read from localStorage — show local history (existing behaviour, unchanged)
- The logged-in history list shows: game name (or date if no name), course name (if set), date, player names, holes played, winner
- Tapping a game: fetch full record from `GET /api/games/:id` and show the read-only summary layout (reuse the existing summary screen component)
- Tapping a player name: filters the list to games containing that player (client-side filter on the returned data)
- Empty state: "No games saved yet. Finish a round to see it here."
- Loading state while the API fetch is in progress

**Verify:** Logged-in user sees their D1 games in the history list, most recent first. Logged-out user sees their localStorage games — unchanged. Tapping a game shows the full scorecard correctly. Player filter works. Empty state shows correctly. API returns 401 without a session.

---

## Chunk order summary (Phase 4)

| Chunk | What | Depends on | Status |
|-------|------|------------|--------|
| 21 | D1 database setup + schema | Nothing | Not started |
| 22 | Pages Functions API scaffold | 21 | Not started |
| 23 | Magic link auth backend | 21, 22 | Not started |
| 24 | Session middleware | 23 | Not started |
| 25 | Auth UI | 23, 24 | Not started |
| 26 | Scorecard Plus branding | 25 | Not started |
| 27 | Course creation/selection UI | 25 | Not started |
| 28 | Logged-in game save to D1 | 25, 27 | Not started |
| 29 | Logged-in history | 25, 28 | Not started |
