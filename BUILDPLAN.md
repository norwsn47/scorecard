# Build Plan
## The Golf Tavern — Bruntsfield Links Scorecard App

**Version:** 1.0
**Last updated:** June 2026
**Stack:** Vite + React · Tailwind CSS · localStorage · Cloudflare Pages

Each chunk should be built, reviewed, tested, and committed before moving to the next.
No chunk depends on unverified work from a previous chunk.

---

## Chunk 1 — Project scaffold & design tokens

**Goal:** Empty project that builds cleanly, with Golf Tavern brand baked in from day one.

- Initialise project with agreed stack (framework, dependencies)
- Set up folder structure: pages, components, hooks, utils, styles
- Define design tokens:
  - Colours: cream/ivory background, deep charcoal text, terracotta/rust accent
  - Typography: script display font (headings/logo), spaced serif/sans (UI labels)
  - Spacing scale, border radius, shadow values
- Apply tokens globally (CSS variables or equivalent)
- Render a single branded placeholder page — Golf Tavern logo/name, Bruntsfield Links, "Est 1456"
- Confirm it builds without errors and displays correctly on mobile

**Verify:** Page renders on mobile, fonts load, colours match brand brief, no console errors.

---

## Chunk 2 — Local storage service

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

**Goal:** The entry point. Two buttons, branded, with resume logic.

- Build home screen layout:
  - Golf Tavern branding prominent (logo/name, "Bruntsfield Links", "Est 1456")
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

**Goal:** Player name entry, duplicate prevention, hole selection, start game.

- Build game setup screen:
  - Player count selector (1–4)
  - Name input per player
    - Suggests previously used names from local storage
    - Blocks duplicate names — show inline error, prevent proceeding
  - Hole count selector (1–24)
  - **Start** button — disabled until all players named and holes selected
- On Start:
  - Create active game object and save to local storage
  - Navigate to scorecard
- Write tests for:
  - Duplicate name blocking
  - Start button disabled state
  - Active game correctly initialised in storage

**Verify:** Can't start with duplicate names. Can't start with no names. Active game saved to storage on Start. Navigates to scorecard.

---

## Chunk 5 — Scorecard

**Goal:** The core of the app. Physical scorecard feel, + / − controls, live totals, auto-save.

- Build scorecard screen:
  - Grid layout: rows = holes, columns = players
  - Each cell: current score (blank until first tap), **+** and **−** buttons
    - Minimum score per hole: 1 (− disabled at 1)
    - No maximum
  - Running totals row at the bottom, updating live
  - **Finish Game** button (sticky, always visible)
- Auto-save to local storage on every score change
- Build confirmation dialog for Finish Game:
  - Shows player names and current totals
  - Confirm / Cancel buttons
- On confirm:
  - Determine winner (lowest total among players with scores on all holes)
  - Mark any incomplete players as DNF
  - Save completed game to local storage
  - Clear active game from storage
  - Navigate to game summary
- Write tests for:
  - Score increment / decrement logic
  - Minimum score enforcement
  - Auto-save on every change
  - Winner calculation (including DNF logic)
  - Confirmation dialog behaviour

**Verify:** Scores update correctly. Totals update live. Auto-save works (reload mid-game and resume). Finish Game confirmation works. Winner calculated correctly. DNF handled correctly.

---

## Chunk 6 — Game summary screen

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

**Verify:** App feels cohesive and on-brand across all screens. No layout breaks on small screens. Edge cases handled gracefully.

---

## Chunk 9 — Error handling pass

**Goal:** Explicit pass to catch everything not covered above.

- Review every user interaction for unhandled error states
- Local storage failure (quota exceeded, private browsing restrictions)
- Unexpected data states (corrupted active game, empty completed game)
- Graceful degradation — app should never show a blank screen or raw error

**Verify:** All error states handled. App degrades gracefully. User always sees a meaningful message, never a crash.

---

## Chunk 10 — Security & pre-launch

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
  - Golf Tavern branding correct throughout

**Verify:** Clean bill of health. Ready to share the URL.

---

## Chunk order summary

| Chunk | What | Depends on |
|-------|------|------------|
| 1 | Scaffold + design tokens | Nothing |
| 2 | Local storage service | 1 |
| 3 | Home screen | 2 |
| 4 | New game setup | 2, 3 |
| 5 | Scorecard | 2, 4 |
| 6 | Game summary | 5 |
| 7 | History screen | 2, 6 |
| 8 | Polish & edge cases | 3–7 |
| 9 | Error handling | 8 |
| 10 | Security & pre-launch | 9 |
