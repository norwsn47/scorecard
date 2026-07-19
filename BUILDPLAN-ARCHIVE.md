# Build Plan Archive
## Scorecard by Outbuild — Bruntsfield Links

Last updated: 19 July 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

This file contains the full detail blocks for all completed chunks, moved here from BUILDPLAN.md as each chunk was finished. The chunk order summary table is also here — it migrated from BUILDPLAN.md once all planned work was complete.

---

## Completed chunks
*Archived 11 July 2026*

---

## Chunk 1 — Project scaffold & design tokens
**Status: Done**

**Goal:** Empty project that builds cleanly, with brand baked in from day one.

- Initialise project with agreed stack (framework, dependencies)
- Set up folder structure: pages, components, hooks, utils, styles
- Define design tokens:
  - Colours: cream/ivory background, deep charcoal text, terracotta/rust accent
  - Typography: script display font (headings/logo), spaced serif/sans (UI labels)
  - Spacing scale, border radius, shadow values
- Apply tokens globally (CSS variables or equivalent)
- Render a single branded placeholder page — logo/name, Bruntsfield Links
- Confirm it builds without errors and displays correctly on mobile

**Verify:** Page renders on mobile, fonts load, colours match brand brief, no console errors.

---

## Chunk 2 — Local storage service
**Status: Done**

**Goal:** A single, tested utility that all other chunks use to read/write data. Build this once, use it everywhere.

- Design the data schema:
  - `players` — array of previously used names
  - `activeGame` — current in-progress game (or null)
  - `completedGames` — array of finished games
- Build a storage service with clear functions:
  - `getPlayers()` / `savePlayers()`
  - `getActiveGame()` / `saveActiveGame()` / `clearActiveGame()`
  - `getCompletedGames()` / `saveCompletedGame()`
- Handle edge cases: corrupted data, empty storage, storage quota errors
- Write unit tests for every function

**Verify:** All storage functions tested and passing. Data persists on page reload.

---

## Chunk 3 — Home screen
**Status: Done**

**Goal:** The entry point. Two buttons, branded, with resume logic.

- Build home screen layout:
  - Branding prominent (app name, "Bruntsfield Links", course sub-label)
  - **New Game** button
  - **History** button
  - **Resume Game** banner — shown only if an active game exists in local storage
  - "More courses coming soon" placeholder (subtle, footer area)
- Wire Resume Game to load the active game (scorecard built in Chunk 5)
- Wire New Game to game setup (built in Chunk 4)
- Wire History to history screen (built in Chunk 6)

**Verify:** Home screen renders correctly on mobile. Resume banner appears/disappears based on active game state. Navigation works.

---

## Chunk 4 — New game setup
**Status: Done**

**Goal:** Player name entry, duplicate prevention, start game. No hole pre-selection.

- Build game setup screen:
  - Player count selector (1–4)
  - Name input per player
    - Suggests previously used names from local storage
    - Blocks duplicate names — show inline error, prevent proceeding
  - **Start** button — disabled until all players named
- On Start:
  - Create active game object (always 24 slots) and save to local storage
  - Navigate to scorecard
- Write tests for:
  - Duplicate name blocking
  - Start button disabled state
  - Active game correctly initialised in storage

**Verify:** Can't start with duplicate names. Can't start with no names. Active game saved to storage on Start. Navigates to scorecard.

---

## Chunk 5 — Scorecard
**Status: Done**

**Goal:** The core of the app. Active-cell interaction, dynamic rows, live totals, auto-save.

- Build scorecard screen:
  - Full-width fixed grid (`table-fixed`): rows = holes, columns = players — no horizontal scroll
  - **Active-cell model** — exactly one cell is focused at all times:
    - Highlighted with terracotta accent background
    - Active row gets a subtle warm tint
    - Any cell can be tapped directly to make it active
    - On load: Hole 1, Player 1 is active
  - Floating control bar (fixed to bottom, never scrolls away):
    - Large **−** · large **+** · **→** advance button, right-aligned
    - Two-state scoring: empty (null/–) or scored (1+) — no zero state
    - **+** on empty → 1; **+** on scored → increment
    - **−** on 1 → empty (null); **−** on 2+ → decrement; **−** disabled when empty
    - **→** advances active cell to next player / next hole
  - **Dynamic row growth** — holes appear one at a time: a new row is added automatically once all players have scored the current hole
  - Running totals bar above the control bar, always visible
  - **Finish Game** button in header
- Auto-save to local storage on every score change
- Build confirmation dialog for Finish Game:
  - Shows player names and current totals
  - Confirm / Cancel buttons
- On confirm:
  - Determine winner (lowest total, trailing unplayed holes ignored)
  - Mark any incomplete players as DNF
  - Stamp `holesPlayed` (last hole where any player scored)
  - Save completed game to local storage
  - Clear active game from storage
  - Navigate to game summary
- Write tests for:
  - Score increment / decrement logic (two-state: empty ↔ scored)
  - Auto-save on every change
  - `computeDisplayedHoles` — dynamic row count
  - Winner calculation (trailing-null-aware, DNF logic)
  - `finishGame` stamps correct `holesPlayed`

**Verify:** Scores update correctly (+ sets empty→1, − returns 1→empty). Totals ignore empty cells. Active cell highlights correctly. → advance button moves focus correctly. New rows appear after each completed hole. Auto-save works (reload mid-game and resume). Finish Game confirmation works. Empty cells on active holes count as DNF. Winner calculated correctly.

---

## Chunk 6 — Game summary screen
**Status: Done**

**Goal:** Clear end-of-game view, shown immediately after finishing.

- Build summary screen:
  - Full scorecard grid (read-only)
  - Winner highlighted
  - DNF players clearly marked
  - Date and number of holes played
  - **Back to Home** button

**Verify:** Summary shows correct scores, correct winner, correct DNF states. Back to Home navigates correctly.

---

## Chunk 7 — History screen
**Status: Done**

**Goal:** List of all completed games, with player filtering.

- Build history screen:
  - List of completed games, most recent first
  - Each entry: date, player names, holes played, winner
  - Tapping a game → full scorecard view (read-only, reuse summary layout)
  - Tapping a player name → filters list to games that player appeared in
  - Empty state if no games saved yet
- Wire back navigation to home screen

**Verify:** All saved games appear. Game detail view shows correct data. Player filter works correctly. Empty state displays correctly.

---

## Chunk 8 — Polish & edge cases
**Status: Done**

**Goal:** Tighten everything up before pre-launch checks.

- Review all screens on multiple mobile sizes (small phones, larger phones)
- Check all touch targets are large enough for use with one hand outdoors
- Confirm fonts load correctly (no flash of unstyled text)
- Confirm brand tokens applied consistently across all screens
- Handle edge cases:
  - Only one player (no winner comparison needed)
  - All players DNF (no winner)
  - Very long player names (don't break layout)
  - 24 holes (ensure scorecard scrolls/handles correctly)
- Add any missing loading or empty states
- Remove any console.log statements
- Fix known token divergences from DESIGN.md:
  - Advance button: `bg-muted` → `bg-control-warm`
  - Active row tint: extract to named token `accent-tint`

**Verify:** App feels cohesive and on-brand across all screens. No layout breaks on small screens. Edge cases handled gracefully.

---

## Chunk 9 — Error handling pass
**Status: Done**

**Goal:** Explicit pass to catch everything not covered above.

- Review every user interaction for unhandled error states
- Local storage failure (quota exceeded, private browsing restrictions)
- Unexpected data states (corrupted active game, empty completed game)
- Graceful degradation — app should never show a blank screen or raw error

**Verify:** All error states handled. App degrades gracefully. User always sees a meaningful message, never a crash.

---

## Chunk 10 — Security & pre-launch
**Status: Done**

**Goal:** Final checks before the app goes live.

- Security audit:
  - No hardcoded values that should be configurable
  - No sensitive data stored beyond player names and scores
  - Input validation on all name fields (length limits, no injection risks)
- Pre-launch checklist:
  - All environment variables confirmed
  - No console.log statements remaining
  - Performance check — loads fast on a mobile connection
  - Tested on iOS Safari and Android Chrome (primary target browsers)
  - "More courses coming soon" placeholder in place
  - Branding correct throughout

**Verify:** Clean bill of health. Ready to share the URL.

---

## Chunk 11 — Podium screen
**Status: Done**

**Goal:** Celebratory end-of-game screen before the full scorecard summary. (Originally backlog item 3.)

- Build podium screen shown immediately after Finish Game confirmation:
  - Ranked list of finishers (1st, 2nd, 3rd...) with scores and per-hole average
  - 1st place card uses inverted terracotta fill — a visual moment of celebration
  - DNF players listed below, clearly marked and muted
  - CTA: "See Full Scorecard" navigates to the summary screen
- Wire scorecard → podium → summary navigation

**Verify:** Correct ranking order. 1st place card visually distinct. DNF players excluded from ranking. Navigation to summary works.

---

## Chunk 12 — Course map
**Status: Done**

**Goal:** Players can view the Bruntsfield Links course map before or during a round. (Originally backlog item 2.)

- Course map modal accessible from:
  - Home screen (View Course Map button)
  - Scorecard control bar (map icon button)
- Full-screen modal overlay with course image
- Vignette effect to blend image edges into app background
- Course info screen with additional course detail
- Close / dismiss to return to previous screen

**Verify:** Map opens from both entry points. Modal dismisses correctly. Image loads and displays correctly on mobile.

---

## Chunk 13 — Outbuild attribution mark
**Status: Done**

**Goal:** Outbuild credit on the home screen, per Outbuild brand requirements. (Originally backlog item 6.)

- Footer of home screen: `Scorecard  by Outbuild ↗`
  - "Scorecard" in bold
  - "by Outbuild ↗" in muted lighter weight, linking to https://outbuild.uk
  - Opens in new tab
- Subtle but present — does not compete with primary content

**Verify:** Mark visible on home screen. Link opens outbuild.uk in new tab. Styling matches DESIGN.md attribution spec.

---

## Chunk 14 — Share scorecard
**Status: Done**
**Depends on: Chunks 6, 11, 18 — game naming (Chunk 18) must be complete before this chunk starts.**

**Goal:** Generate a branded share image and trigger the native device share sheet at the end of a game. (PRD 4.7. Originally backlog item 1.)

**Share button:**
- Appears on the end-of-game summary screen (after the podium)
- Tapping generates a PNG and triggers the native Web Share API on mobile
- Fallback: download as PNG if the share API is unavailable (desktop browsers)

**Share image layout (top to bottom):**
- "Bruntsfield Links" — main heading in bold
- Outbuild logo mark — directly below the heading
- Game name — shown below the logo mark, only if one was set (Chunk 18); omitted if no name
- Winner callout:
  - Single winner: "Winner: [Name] — [X] strokes"
  - Tied: "Tied: [Name] and [Name] — [X] strokes" (three-way: "[Name], [Name], and [Name]")
  - All players DNF: "No winner — all players DNF"
- Full hole-by-hole scorecard table:
  - Columns = players; rows = holes; cells = stroke count
  - Totals row at the bottom of each column
  - Average strokes per hole in brackets next to each total (calculated over that player's completed holes only)
  - DNF players marked as DNF in their totals row
- No maximum height — image extends to fit all holes played

**Sizing and layout:**
- Image width targets 390px — fills a standard phone screen when opened as an image
- Font sizes scaled for legibility as a standalone image on mobile
- Column count and font size adapt to number of players (1–6) — content is always readable, never squashed

**OG preview image:**
- Replace `public/og-image.png` with a static branded card in the app's cream and terracotta palette
- Text reads "Scorecard by Outbuild — Bruntsfield Links"
- Not a scorecard screenshot — a clean brand card only

**Verify:** Share sheet opens on iOS Safari and Android Chrome. PNG downloads correctly on desktop. Image layout correct for 1, 2, 3, 4, 5, and 6 players. Winner callout handles all three states correctly. Game name shown when set, absent when not set. DNF players correctly marked. OG image replaced and correct.

---

## Wave 2 — New chunks (July 2026)

Added from PRD v1.5. The hotfix runs before everything else. Chunks 16–20 are independent of each other and can be built in any order, with one constraint: Chunk 18 must be complete before Chunk 14 starts. Chunk 8 (Polish) gates on all feature chunks being present — it runs after all of wave 2.

---

## Hotfix H1 — Golf Tavern copy fix
**Status: Done**
**Do this before any other wave 2 work.**

**Goal:** Remove a stale brand name from the live app.

- `src/pages/CourseInfo.jsx` line 8: user-facing copy reads "Golf Tavern" — correct it to the current brand name
- One-line change — does not require the full build cycle, but does go through the code review gate before being pushed
- Push immediately once the fix is confirmed

**Verify:** "Golf Tavern" no longer appears anywhere in the app. The correct name is displayed on the CourseInfo page on a real device.

---

## Chunk 16 — Stroke limit cap
**Status: Done**
**Depends on: Chunk 5**

**Goal:** Enforce the app's hard cap of 14 strokes per hole in the scoring UI. (PRD 4.3)

- The **+** button must be visually disabled and non-functional once a cell reaches 14 strokes
- This is the app's practical cap — intentionally higher than the official 7-stroke course rule, which is displayed verbatim in Course Rules (Chunk 20)
- Review current scoring logic: confirm no score above 14 can be entered via any code path (direct tap, rapid tap, value from storage, etc.)
- If the cap is already implemented, verify it works correctly and document that this chunk is confirmed — do not assume it was built correctly without testing it

**Verify:** Cannot score above 14 on any hole via any interaction. **+** button is visually disabled at 14. Decrement from 14 works normally. No way to write a value above 14 into local storage via the UI.

---

## Chunk 17 — App state on close
**Status: Done**
**Depends on: Chunks 2, 5**

**Goal:** Reopening the app with a game in progress bypasses the home screen and restores the exact previously-active cell. (PRD 4.3)

- On app load: check local storage for an active game
- If an active game exists: navigate directly to the scorecard, skipping the home screen entirely
- Restore focus to the exact cell that was active when the app was closed — this requires persisting the active cell (player index and hole index) to local storage on every change, not just the scores
- If no active game: show the home screen as normal
- Update local storage schema if needed: add `activeCellPlayer` and `activeCellHole` fields to the active game object in the storage service (Chunk 2)
- The home screen Resume Game prompt is a separate behaviour — it applies when the user navigates back to home mid-game, not on a fresh app open

**Verify:** Close the browser mid-game with a specific cell active. Reopen the app. Confirm it navigates directly to the scorecard. Confirm the correct cell is highlighted (not defaulting to Hole 1 / Player 1). Test with the browser fully closed, not just navigated away from the page.

---

## Chunk 18 — Game naming
**Status: Done**
**Depends on: Chunks 4, 5, 7**
**Must be complete before Chunk 14 (share scorecard) starts.**

**Goal:** Optional game name, pre-populated with the current day and date, visible throughout the app. (PRD 4.2)

**New game setup screen:**
- Add a game name field at the top of the setup screen, above the player name fields
- Pre-populate with the current day and date in the format "Saturday 11 July" (day name + day number + month, no year)
- A subtle hint makes clear the field is optional
- If the field is cleared entirely, the game saves without a name — no validation error, no placeholder name

**Scorecard header:**
- If a game name is set, display it in the scorecard header during play

**History list:**
- Named games: show the game name as the primary identifier
- Unnamed games (whether saved before this chunk or intentionally left blank): show the date as the primary identifier
- Old saved games that predate this chunk have no `gameName` field — they must not break the History screen

**Resume Game prompt:**
- If a game name is set, include it in the Resume Game prompt on the home screen

**Storage:**
- Add `gameName` field to the active game and completed game objects
- Must be backward-compatible: treat missing `gameName` as no name set

**Verify:** Game name pre-populated correctly on setup screen. Can edit or clear the name. Named game shows name in header, History list, and Resume prompt. Unnamed game shows date in History. Old saved games (no `gameName` field) do not break History. Name persists correctly through play, finish, and reload.

---

## Chunk 19 — Information page
**Status: Done**
**Depends on: Chunk 3**

**Goal:** Passive-access information page explaining local data use and crediting Outbuild. (PRD 4.8)

**Home screen change:**
- Add a small **ⓘ** icon to the top-right corner of the home screen
- Tapping it opens the information page
- No first-launch prompt — passive access only, always available

**Information page content (verbatim or close to it):**
- Plain-English data explanation:
  - Player names, game scores, and dates are stored locally on the user's device in browser local storage
  - No data is ever sent to a server
  - No tracking, no analytics, and no third-party services are used in this version of the app
- Credit line: "Scorecard is made by Outbuild, a small design collective based in Edinburgh."
- Contact link: `mailto:williamadamgriffiths@gmail.com` — tapping opens a pre-addressed email in the device's mail client

**Note for maintainers:** When Chunk 15 (Analytics) is added, both PRD 4.8 and this in-app disclaimer text must be updated to reflect what data is collected and by whom.

**Verify:** ⓘ icon visible on home screen. Tapping it opens the information page. All content matches PRD 4.8. Contact link opens the mail client with the correct address. Back navigation returns to home. Page styled consistently with the rest of the app.

---

## Chunk 20 — Course rules
**Status: Done**
**Depends on: Chunks 3, 12**

**Goal:** Verbatim course rules text, accessible from the home screen and from within the Map overlay mid-game. (PRD 4.9)

**Home screen change:**
- Add a **Rules** text link below the New Game and History buttons (and below the Resume Game prompt if one is showing)
- Tapping it opens the rules view

**Map overlay change:**
- Add a **Rules** tab to the existing Map overlay (Chunk 12), accessible mid-game without leaving the scorecard
- The rules content is the same regardless of which entry point is used

**Rules content:**
- Display the verbatim rules text from PRD 4.9 — do not rephrase or restructure
- Typography and visual styling are the only permitted adaptations
- The rules text includes: Rule 3 (max 4 players) and Rule 4 (stroke limit 7 per hole)
  - Rule 3: displayed as information only — the app permits 1–6 players and does not enforce this limit
  - Rule 4: displayed verbatim — the app's own scoring cap is 14 strokes (Chunk 16), intentionally higher than the official 7; both values are distinct and correct

**Verify:** Rules link visible on home screen, below New Game and History. Rules tab visible inside the Map overlay. Rules text matches PRD 4.9 verbatim. No enforcement logic added. Both entry points open the same rules content. Styling is readable and consistent with the rest of the app.

---

## Chunk order summary
*Migrated from BUILDPLAN.md on 11 July 2026 — all chunks complete.*

| Chunk | What | Depends on | Status |
|-------|------|------------|--------|
| 1 | Scaffold + design tokens | Nothing | Done |
| 2 | Local storage service | 1 | Done |
| 3 | Home screen | 2 | Done |
| 4 | New game setup | 2, 3 | Done |
| 5 | Scorecard | 2, 4 | Done |
| 6 | Game summary | 5 | Done |
| 7 | History screen | 2, 6 | Done |
| 11 | Podium screen | 5 | Done |
| 12 | Course map | 3, 5 | Done |
| 13 | Outbuild attribution mark | 3 | Done |
| HF-1 | Golf Tavern copy hotfix | — | Done |
| 16 | Stroke limit cap | 5 | Done |
| 17 | App state on close | 2, 5 | Done |
| 18 | Game naming | 4, 5, 7 | Done |
| 19 | Information page | 3 | Done |
| 20 | Course rules | 3, 12 | Done |
| 14 | Share scorecard | 6, 11, 18 | Done |
| 8 | Polish & edge cases | All features | Done |
| 9 | Error handling | 8 | Done |
| 10 | Security & pre-launch | 9 | Done |

---

## Phase 4 — Scorecard Plus (v2.0) + Wave 5
*Archived 19 July 2026*

**Stack:** Vite + React · Tailwind CSS · localStorage · Cloudflare Pages · Cloudflare D1 · Cloudflare Pages Functions · Resend

---

## Chunk 21 — D1 database setup + schema
**Status: Done**
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
- Apply migration locally
- Verify schema is correct with a local query

---

## Chunk 22 — Pages Functions API scaffold
**Status: Done**
**Depends on: 21**

**Goal:** A working Cloudflare Pages Functions structure with the D1 binding confirmed live, a health check endpoint, and local dev running cleanly.

- Create `/functions` directory in the project root
- Set up directory structure: `/functions/api/health.js`, `/functions/api/auth/`, `/functions/api/games/`
- Confirm `wrangler.toml` Pages Functions configuration is correct
- Start local dev and confirm health check and D1 binding work

---

## Chunk 23 — Magic link auth backend
**Status: Done**
**Depends on: 21, 22**

**Goal:** `POST /api/auth/request-link` and `GET /api/auth/verify` endpoints powering magic link sign-in via Resend.

- Request-link: validates email, generates token, inserts into `magic_tokens`, sends email via Resend
- Verify: looks up token, marks used, creates user if new, creates default course, creates session, sets HttpOnly cookie, redirects to `/?verified=true`

---

## Chunk 24 — Session middleware
**Status: Done**
**Depends on: 23**

**Goal:** Session validation infrastructure, `GET /api/auth/me`, `POST /api/auth/logout`, and `useAuth` hook.

---

## Chunk 25 — Auth UI
**Status: Done**
**Depends on: 23, 24**

**Goal:** Login screen, post-send confirmation, session-aware routing, logout, and home screen auth state display.

---

## Chunk 26 — Scorecard Plus branding
**Status: Done**
**Depends on: 25**

**Goal:** "Scorecard Plus" wordmark (with "Plus" in terracotta) for logged-in users on the home screen.

---

## Chunk 27 — Course creation and selection UI
**Status: Done**
**Depends on: 25**

**Goal:** Course selector and inline course creation in the new game setup screen for logged-in users. `GET /api/courses` and `POST /api/courses` endpoints.

---

## Chunk 28 — Logged-in game save to D1
**Status: Done**
**Depends on: 25, 27**

**Goal:** Completed games saved to D1 for logged-in users via `POST /api/games`. Logged-out users continue to use localStorage.

---

## Chunk 29 — Logged-in history
**Status: Done**
**Depends on: 25, 28**

**Goal:** History screen reads from D1 for logged-in users (`GET /api/games`, `GET /api/games/:id`). Logged-out users see localStorage history unchanged.

---

## Wave 5 — Generic home + Bruntsfield course page refactor
*Added and completed 19 July 2026*

---

## Chunk 30 — Rename "Bruntsfield Links" to "Bruntsfield Short Hole Golf Course"
**Status: Done**
**Depends on: 29**

**Goal:** Full codebase rename — UI text, `verify.js` new-user course default, share canvas, and all component labels updated to the correct full course name.

---

## Chunk 31 — Generic home screen + /bruntsfield-short-course page
**Status: Done**
**Depends on: 30**

**Goal:** Home (`/`) becomes generic with no Bruntsfield-specific content. New `BruntsfiledCoursePage` component at `/bruntsfield-short-course` with full course-specific actions. Page-key routing extended with `PAGE_PATHS` mapping. `public/_redirects` updated.

---

## Chunk 32 — Rules content update + context-aware setup/scorecard flow
**Status: Done**
**Depends on: 30, 31**

**Goal:** Updated rules copy in `RulesContent.jsx`. New Game from Bruntsfield page passes `{ bruntsfield: true }` through setup into the scorecard, showing the course map button and rules link only in that context. Generic home new game flow has no course-specific links.

---

## Chunk order summary (Phase 4 + Wave 5)

| Chunk | What | Depends on | Status |
|-------|------|------------|--------|
| 21 | D1 database setup + schema | Nothing | Done |
| 22 | Pages Functions API scaffold | 21 | Done |
| 23 | Magic link auth backend | 21, 22 | Done |
| 24 | Session middleware | 23 | Done |
| 25 | Auth UI | 23, 24 | Done |
| 26 | Scorecard Plus branding | 25 | Done |
| 27 | Course creation/selection UI | 25 | Done |
| 28 | Logged-in game save to D1 | 25, 27 | Done |
| 29 | Logged-in history | 25, 28 | Done |
| 30 | Rename "Bruntsfield Links" to full course name | 29 | Done |
| 31 | Generic home screen + /bruntsfield-short-course page | 30 | Done |
| 32 | Rules content update + context-aware flow | 30, 31 | Done |

**Verify:** Rules link visible on home screen, below New Game and History. Rules tab visible inside the Map overlay. Rules text matches PRD 4.9 verbatim. No enforcement logic added. Both entry points open the same rules content. Styling is readable and consistent with the rest of the app.
