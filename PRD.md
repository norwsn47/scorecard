# Product Requirements Document
## Scorecard by Outbuild — Bruntsfield Links

**Version:** 2.0
**Last updated:** 12 July 2026

---

## 1. Goal

A web app by Outbuild that lets anyone create and track a golf scorecard for Bruntsfield Links — no login required, as few taps as possible, designed to feel like a physical scorecard on your phone. Built for use on the course, in the sun, by anyone.

---

## 2. Brand

- **Built by:** Outbuild
- **Tone:** Warm, Scottish, restrained — rooted in place. Not corporate, not generic.
- **Course:** Bruntsfield Links — one of Scotland's oldest public golf courses, Edinburgh

### Visual direction
Outbuild palette applied for outdoor sunlight legibility on a phone:
- **Background:** Cream / ivory (warm, not clinical white)
- **Primary text:** Deep charcoal / near-black
- **Accent:** Terracotta / rust — single brand colour, does all decorative and interactive work
- **Typography:** Cormorant Garamond italic for editorial moments (app name, headings); Inter for all UI labels and data
- **Overall feel:** Warm, grounded, purposeful — designed for use outdoors, one hand, in sunlight

---

## 3. Users

**Quick-play (logged-out):**
- Golfers playing Bruntsfield Links who want to score a round immediately with no setup
- No account required — scores saved locally to the device
- Accessed via mobile browser on the course

**Scorecard Plus (logged-in):**
- Users who want history that persists across devices and browsers
- Authenticated via magic link (email only — no password)
- Can create and name custom courses, with Bruntsfield Links pre-loaded as the default

---

## 4. Core features

### 4.1 Home screen
- Two options only: **New Game** and **History**
- Scorecard by Outbuild branding and Bruntsfield Links course name displayed prominently
- A small **ⓘ** icon sits in the top-right corner — tapping it opens the information page (see 4.8)
- A **Rules** text link sits below the main New Game and History buttons — tapping it opens the course rules (see 4.9)
- If a game is in progress and the user navigates to the home screen mid-game, a **Resume Game** prompt appears between the two buttons
- Note: reopening the app with a game in progress bypasses the home screen and goes directly to the scorecard — see 4.3

### 4.2 Start a new game
- User taps **New Game**
- A **game name** field appears at the top of the setup screen, above the player name fields
  - Pre-populated with the current day and date: e.g. "Saturday 11 July"
  - A subtle hint makes clear the field is optional — user can edit or leave it unchanged
  - If the field is cleared entirely, the game saves without a name
  - The game name appears in four places: the scorecard header during play, the History list, the Resume Game prompt on the home screen, and the share image
- Adds players dynamically (1–6) — tap **Add Player** to add, tap **✕** to remove; names can be typed or selected from suggestions
- Each player enters or selects a name
  - Names previously used are suggested from local browser storage
  - **Duplicate names are not allowed** — the app blocks starting if two players share the same name
  - No login required — names are stored locally on the device
- Taps **Start** — scorecard is created (no hole pre-selection required)

### 4.3 The scorecard
- Resembles a physical scorecard — clean, full-width grid layout; no horizontal scrolling
- Rows = holes (numbered); columns = players; all columns share available width equally
- **Holes are added dynamically** — only the current hole row is shown; a new row appears automatically once all players have scored the current hole
- **Active-cell model** — exactly one cell is focused at all times:
  - Highlighted with the terracotta/rust accent background
  - Active row gets a subtle warm tint across the full row
  - Any cell can be tapped directly to jump to it
- Scores are entered via a **floating control bar** fixed to the bottom of the screen (never scrolls away):
  - **Map** button (left) · large **−** button · large **+** button · **→** advance button — spread across the bar
  - A hole score has two states: **empty (—)** and **scored (1 or above)** — there is no zero
  - Tapping **+** on an empty cell sets it to 1; tapping **+** on a scored cell increments by 1
  - Tapping **−** on a cell showing 1 returns it to empty (—); tapping **−** on a cell showing 2+ decrements by 1
  - The **−** button is visually disabled when the active cell is empty
  - **Maximum score per hole: 14 strokes.** The **+** button is disabled once 14 is reached. Note: the official Bruntsfield Links stroke limit is 7 per hole (see 4.9); the app uses a higher practical cap of 14 to accommodate casual play without being as restrictive as the official rule.
  - The **→** button advances focus to the next player on the same hole, or the next hole's first player
- Running totals shown above the control bar, always visible
- The scorecard header displays the game name if one was set
- Progress is **auto-saved to local storage continuously**
  - **On reopening the app with a game in progress:** the user is taken directly to the scorecard, bypassing the home screen. Focus is restored to the exact cell — the specific player and hole — that was active when the app was closed or the browser was shut.
  - If the user navigates back to the home screen during an active game, the Resume Game prompt appears there (see 4.1)

### 4.4 Finishing a game
- User taps **Finish Game**
- A **confirmation dialog** appears — user must confirm before the game ends (prevents accidental taps)
- Final scores shown in a summary view (all players, all holes, totals)
- **Players who did not complete all holes are excluded from the winner calculation** — marked as DNF
- Winner = player with the lowest total among those who finished
- A **Share** button appears on the summary screen — tapping it generates the share image and triggers the native device share sheet (see 4.7)
- Completed game saved to local browser storage with:
  - Game name (if set)
  - Date and time
  - Player names and scores per hole
  - Number of holes played
  - DNF status where applicable

### 4.5 Game history
- Accessible from the home screen via **History**
- Lists all previously saved games, each showing: game name (if set), date, players, number of holes, winner
  - Games without a name — whether saved before the game naming feature or left intentionally blank — display the date as their primary identifier in History
- Tapping a game shows the full scorecard for that game
- Tapping a player name filters to all games that player has appeared in

### 4.6 Player profiles (lightweight)
- Name-based recall only — not a login system
- Previously used names suggested when starting a new game
- Tapping a name in History filters to that player's game history
- Stored entirely in local browser storage (no database in MVP)
- History is device-specific — known MVP limitation, resolved when database is added post-MVP

### 4.7 Share scorecard

A **Share** button appears on the end-of-game summary screen (see 4.4). Tapping it generates a PNG and triggers the native device share sheet (iOS/Android share API).

**Share image layout (top to bottom):**
- "Bruntsfield Links" — main heading in bold
- Outbuild logo mark — directly below the heading
- Game name — shown below the logo mark, only if the user set one
- Winner callout:
  - Single winner: "Winner: [Name] — [X] strokes"
  - Tied: "Tied: [Name] and [Name] — [X] strokes" (or "[Name], [Name], and [Name]" for three-way ties)
  - All players DNF: "No winner — all players DNF"
- Full hole-by-hole scorecard table:
  - Columns = players; rows = holes; cells = stroke count for that hole
  - Totals row at the bottom of each column
  - Average strokes per hole shown in brackets next to the total — calculated over each player's completed holes only
  - DNF players are marked as DNF in their totals row
- No maximum height — the image extends to fit all holes played

**Sizing and layout:**
- Image width targets 390px — fills a standard phone screen when opened as an image
- Font sizes scaled for legibility as a standalone image on a mobile screen
- Column count and font size adapt to the number of players so content is always readable, never squashed

**OG preview image:**
- `public/og-image.png` is replaced with a static branded card in the app's cream and terracotta palette
- Text reads "Scorecard by Outbuild — Bruntsfield Links"
- Not a scorecard screenshot — a clean brand card only

### 4.8 Information page

Accessed via the **ⓘ** icon in the top-right corner of the home screen (see 4.1). No first-launch prompt — passive access only.

**Contents:**
- Plain-English data explanation, written for golfers:
  - Player names, game scores, and dates are stored locally on the user's device in browser local storage
  - No data is ever sent to a server
  - No tracking, no analytics, and no third-party services are used in this version of the app
- Course section:
  - Short description: "One of the world's oldest golf links, Bruntsfield Short Hole Golf Club has been a fixture in Edinburgh since 1895. The 36-hole course features par-3 holes of 45–90 yards – unique to world golf."
  - "Find out more" external link to https://www.bruntsfieldshortholegolfclub.co.uk/history/
  - "Course rules" link (navigates to the rules page)
  - Permission line: "The course map is reproduced with permission from Bruntsfield Short Hole Golf Club."
- Credit line: "Scorecard is made by Outbuild, a small design collective based in Edinburgh."
- A contact link (mailto:) — tapping opens an email to williamadamgriffiths@gmail.com
  - This is a placeholder pending setup of hello@outbuild.co via Resend (see Backlog)

**Note for maintainers:** When analytics (Chunk 15) is added, both this PRD section and the in-app disclaimer text must be updated to reflect what data is collected and by whom.

### 4.9 Course rules

The official rules of Bruntsfield Links are accessible in two places:
- A **Rules** text link on the home screen, positioned below the New Game and History buttons — for pre-game reference (see 4.1)
- A **Rules** tab within the course Map overlay — accessible mid-game without leaving the scorecard

The rules content is displayed verbatim as provided by the course. It must not be rephrased or restructured — typography and visual styling are the only permitted adaptations.

**Enforcement policy:**
- Rule 3 (maximum group size: 4 players) is displayed as information only. The app permits 1–6 players (see 4.2) and does not enforce the official group size limit.
- Rule 4 (stroke limit: 7 per hole) is displayed verbatim in the rules view. The app enforces its own practical cap of 14 strokes per hole in the scoring UI (see 4.3) — intentionally higher than the official limit to accommodate casual play. The two values are distinct and must both be noted wherever relevant.

---

IMPORTANT INFORMATION
1) ALL players are liable for their actions on the course, including injury to third parties and all damage to public property.
2) RULES OF PLAY:
   a) Play each hole only from the designated Teeing areas
   b) Do not strike balls over footpaths (Out of Bounds)
   c) Do not strike balls from on the greens
   d) Replace any displaced turf (divots), all over the course, particularly on the teeing areas
   e) Repair all golf ball plugmarks on the putting greens
3) MAXIMUM GROUP SIZE: Foursome – no more than 4 players per group
4) STROKE LIMIT: Maximum of 7 strokes per hole per player
5) COURTESY: Please, a) allow faster playing groups to play through; b) keep the course clean and tidy – place all trash in the proper refuse containers

MANY THANKS FOR YOUR CO-OPERATION — ENJOY YOUR GAME

---

---

## 5. Scoring

- Raw strokes only — no par, no handicap, no course rating
- Lower total = better score
- Winner = player with the lowest total among players who completed all holes
- Players who drop out mid-round are marked DNF and excluded from winner calculation
- No complex scoring modes in MVP

---

## 6. Course

- Single course: **Bruntsfield Links**, Edinburgh
- Up to **36 holes**
- UI includes a **"More courses coming soon"** placeholder where course selection will eventually live
- No hole-level metadata (no par, no yardage, no difficulty rating) in MVP

---

## 7. Out of scope

The following are out of scope for both the MVP (v1.x) and the Scorecard Plus release (v2.0):

- Par values or handicap calculations
- Leaderboards or social features
- Push notifications
- Native mobile app (web only)
- Admin tools or course management

The following were out of scope in v1.x and are now addressed in v2.0:
- User accounts and authentication → magic link auth (Section 11)
- Backend database → Cloudflare D1 (Section 11)
- Cross-device history sync → DB-backed history for logged-in users (Section 11)
- Custom course names → user-created courses (Section 11)

---

## 8. Future considerations (post v2.0)

- Par values and scoring modes (stableford, etc.)
- Leaderboards or social features (requires account foundation — now built in v2.0)
- All-time personal leaderboard per user (lowest round, most wins, etc.)
- Quick-play history import — allow users to migrate existing localStorage games to their new DB account after signing in
- Multiple holes / course configuration beyond the default (e.g. 9-hole or 18-hole variants)
- hello@outbuild.co as the contact email once configured via Resend

---

## 9. Success metrics (MVP)

- Any golfer at Bruntsfield Links can pick it up and use it without explanation
- A group can complete a full round and save it without confusion
- Returning users can see their previous games on the same device
- Closing and reopening the browser mid-round resumes the game correctly
- Feels like a Scorecard by Outbuild product — not a generic app

---

## 10. Design principles

- **Mobile-first** — designed for use on a phone, on a golf course, in sunlight
- **Light and legible** — high contrast, readable outdoors; aesthetics serve usability
- **Fewest taps possible** — every interaction obvious and minimal
- **Physical scorecard feel** — familiar grid layout, nothing unfamiliar
- **Outbuild character** — restrained, warm, Scottish — not generic or corporate
- **No friction** — no login, no setup, no onboarding required

---

## 11. Scorecard Plus (v2.0)

This section defines everything added in v2.0. The MVP (v1.x) remains fully functional for logged-out users — nothing in this section removes or degrades existing quick-play behaviour.

---

### 11.1 Overview

Scorecard Plus is the logged-in layer of the app. It adds persistent history, custom course creation, and cross-device sync for users who want more than quick-play offers. The two modes coexist: the app detects whether a user is authenticated and adapts accordingly.

---

### 11.2 Technology stack additions

- **API layer:** Cloudflare Pages Functions — serverless functions co-deployed with the Cloudflare Pages site, living in the `/functions` directory
- **Database:** Cloudflare D1 — SQLite-compatible database, bound to the Pages project via wrangler
- **Email:** Resend — transactional email for magic link delivery (account exists; API key to be created as part of this work)
- **Session management:** D1 sessions table + HttpOnly cookie — a UUID session token is stored in D1; the browser receives it as a `Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Strict` header on verification

---

### 11.3 Database schema

Four tables in Cloudflare D1:

**users**
- `id` — UUID, primary key
- `email` — text, unique, not null
- `created_at` — timestamp

**magic_tokens**
- `id` — UUID, primary key
- `email` — text, not null
- `token` — text, unique, not null
- `expires_at` — timestamp
- `used` — boolean, default false

**sessions**
- `id` — UUID, primary key (this is the session token stored in the cookie)
- `user_id` — UUID, foreign key → users.id
- `created_at` — timestamp
- `expires_at` — timestamp

**games**
- `id` — UUID, primary key
- `user_id` — UUID, foreign key → users.id
- `game_name` — text, nullable
- `played_at` — timestamp
- `holes_played` — integer
- `player_data` — JSON blob (array of players with name, per-hole scores, total, DNF flag)
- `course_id` — UUID, foreign key → courses.id, nullable
- `created_at` — timestamp

**courses**
- `id` — UUID, primary key
- `user_id` — UUID, foreign key → users.id (null for system-provided courses)
- `name` — text, not null
- `holes` — integer, default 36
- `is_default` — boolean, default false
- `created_at` — timestamp

**Seed data:** On new account creation, Bruntsfield Links is inserted into `courses` for that user as their default course (`is_default = true`, `holes = 36`).

---

### 11.4 Authentication — magic link via Resend

No passwords. Users authenticate with their email address only.

**Flow:**
1. User enters email address on the login screen
2. `POST /api/auth/request-link` — validates email format, creates a magic_token record in D1 (expires in 15 minutes), sends the magic link email via Resend
3. User sees a confirmation screen: "Check your email — we've sent a link to [email]"
4. User taps the link in their email
5. `GET /api/auth/verify?token=<token>` — validates the token (exists, not expired, not used), marks it as used, creates or finds the user record, creates a session, sets the HttpOnly session cookie, redirects to the app
6. On first-time sign-in (new user), Bruntsfield Links is seeded as the user's default course
7. User is now in the logged-in state

**Session expiry:** Sessions last 30 days. A new session is created on each successful verification.

**Email content:** Simple, branded. Subject: "Your Scorecard Plus sign-in link". Body: a single CTA button — "Sign in to Scorecard Plus" — with a plain-text fallback URL below. Signed off with Outbuild branding.

**From address:** To be confirmed — either `hello@outbuild.co` or a Resend-verified sending domain. This is determined when the Resend API key is created as part of this work.

---

### 11.5 Session management

- Session ID (UUID) stored in D1 `sessions` table
- Browser receives the session ID as a `session` HttpOnly cookie — never accessible to JavaScript
- `GET /api/auth/me` — reads the session cookie, validates against D1, returns `{ user: { id, email } }` or 401
- All logged-in API routes read and validate the session cookie before executing
- `POST /api/auth/logout` — deletes the session from D1, clears the cookie, returns 200
- On app load, the frontend calls `/api/auth/me` to determine whether the user is authenticated — this sets a global `user` context used throughout the app

---

### 11.6 Scorecard Plus branding

- The logged-in product is called **Scorecard Plus**
- The "Plus" suffix appears in the app header when the user is authenticated — once, in the top-level logo/wordmark area
- Visual treatment: logo similar to the existing watermark/wordmark, with "Plus" appended in the terracotta accent colour — same weight and baseline as the rest of the logo
- Logged-out users see the existing branding unchanged — no "Plus" anywhere
- The "Plus" branding must not be garish or promotional — it is a quiet identifier, not a marketing badge

---

### 11.7 Course creation and selection

**For logged-in users:**
- When starting a new game, a course selector appears above the player setup
- Default selected: the user's default course (Bruntsfield Links on first use)
- User can select from their existing courses or create a new one
- Creating a course: a single text input for the course name — any name the user types is valid
- New courses default to 36 holes — no per-hole configuration in v2.0
- The selected course is stored on the game record when the game is saved to D1
- Course names appear in the game history list

**For logged-out users:**
- Quick-play remains hardcoded to Bruntsfield Links — no course selection UI
- No change to the logged-out experience

**Backlog:** Allow quick-play games (localStorage) to be imported into the user's DB after sign-in — logged in BACKLOG.md as a future item, not in v2.0.

---

### 11.8 Logged-in game flow

When a user is authenticated, the game save behaviour changes:

- On game completion, the game is saved to D1 (via `POST /api/games`) in addition to (or instead of) localStorage — this is to be determined during implementation, but the preferred approach is DB only for logged-in users to keep the two histories cleanly separate
- The game record includes: user_id, game_name, played_at, holes_played, player_data (JSON), course_id
- The existing finish-game flow (podium screen, summary screen, share) is unchanged — only the save destination changes

**Active game state:** While a game is in progress, the active game is still tracked in localStorage (same as the quick-play flow). On game completion, the final record is written to D1.

---

### 11.9 Logged-in history

- Logged-in users see their DB-backed game history — not their localStorage history
- Logged-out users see their localStorage history — no change
- The two histories are kept strictly separate — no merging in v2.0
- Logged-in history screen shows: game name (if set), course name, date, player names, holes played, winner
- Tapping a game shows the full scorecard (read-only, same layout as the existing summary screen)
- Tapping a player name filters to games that player appeared in
- Empty state if no games saved yet

---

### 11.10 Quick-play (unchanged)

The quick-play experience (logged-out mode) is not changed by v2.0. Everything in Sections 4–10 of this PRD remains in effect for logged-out users. The app detects auth state on load and adapts — but a logged-out user should not notice anything different from the MVP.

---

### 11.11 Environment variables and secrets

The following must be configured before Phase 4 build starts:

| Variable | Where | Notes |
|---|---|---|
| `RESEND_API_KEY` | Cloudflare Pages env (production + preview) | API key to be created in Resend dashboard |
| `RESEND_FROM_EMAIL` | Cloudflare Pages env | Sending address — to be confirmed when Resend key is created |
| `APP_URL` | Cloudflare Pages env | Base URL for constructing magic link URLs (e.g. `https://scorecard.outbuild.uk`) |
| D1 binding: `DB` | wrangler.toml | Not an env var — a Cloudflare D1 binding. Database to be created via wrangler. |

Cookie name and session/token expiry can be hardcoded in the API layer (not env vars).

---

### 11.12 Information page update (v2.0)

When Scorecard Plus is live, the information page (PRD 4.8) must be updated to reflect:
- That logged-in users' data is stored in a Cloudflare D1 database, not only in local storage
- That email addresses are processed by Resend for authentication purposes
- The contact email should be updated to hello@outbuild.co once that address is configured via Resend (see BACKLOG.md)
