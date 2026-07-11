# Build Plan
## Scorecard by Outbuild — Bruntsfield Links

**Version:** 1.1
**Last updated:** 8 July 2026
**Stack:** Vite + React · Tailwind CSS · localStorage · Cloudflare Pages

Each chunk should be built, reviewed, tested, and committed before moving to the next.
No chunk depends on unverified work from a previous chunk.

**Status key:** Done · In progress · Not started

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
    - Two-state scoring: empty (null/—) or scored (1+) — no zero state
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
**Status: Not started**

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
**Status: Not started**

**Goal:** Explicit pass to catch everything not covered above.

- Review every user interaction for unhandled error states
- Local storage failure (quota exceeded, private browsing restrictions)
- Unexpected data states (corrupted active game, empty completed game)
- Graceful degradation — app should never show a blank screen or raw error

**Verify:** All error states handled. App degrades gracefully. User always sees a meaningful message, never a crash.

---

## Chunk 10 — Security & pre-launch
**Status: Not started**

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
**Status: Not started**

**Goal:** Players can share or save the completed scorecard after a game. (Originally backlog item 1.)

- On the summary / podium screen, offer a share option:
  - Generate a branded scorecard image (canvas or html-to-image)
  - Trigger native browser share sheet on mobile (Web Share API)
  - Fallback: download as PNG if share API unavailable
- Scorecard image should look like a branded Outbuild scorecard — not a screenshot of the UI

**Verify:** Share sheet opens on mobile. Image downloads correctly on desktop. Scorecard image is readable and on-brand.

---

## Chunk 15 — Analytics
**Status: Not started**

**Goal:** Track meaningful usage without cookie consent requirements. (Originally backlog item 5.)

- Confirm Cloudflare Pages built-in analytics are active for basic traffic data
- Evaluate and integrate a privacy-friendly product analytics tool (Plausible, Fathom, or PostHog)
- Track in-app events already instrumented: New Game Started, Game Completed (with player count and holes played)
- Confirm: no cookie consent banner required

**Verify:** Events fire correctly in production. No PII collected. No consent banner needed. Cloudflare analytics active.

---

## Chunk order summary

| Chunk | What | Depends on | Status |
|-------|------|------------|--------|
| 1 | Scaffold + design tokens | Nothing | Done |
| 2 | Local storage service | 1 | Done |
| 3 | Home screen | 2 | Done |
| 4 | New game setup | 2, 3 | Done |
| 5 | Scorecard | 2, 4 | Done |
| 6 | Game summary | 5 | Done |
| 7 | History screen | 2, 6 | Done |
| 8 | Polish & edge cases | 3–7 | Not started |
| 9 | Error handling | 8 | Not started |
| 10 | Security & pre-launch | 9 | Not started |
| 11 | Podium screen | 5 | Done |
| 12 | Course map | 3, 5 | Done |
| 13 | Outbuild attribution mark | 3 | Done |
| 14 | Share scorecard | 6, 11 | Not started |
| 15 | Analytics | 10 | Not started |
