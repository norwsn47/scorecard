# Product Requirements Document
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

**Version:** 2.0
**Last updated:** 11 September 2026

> The rationale and section-by-section history of past updates lives in `CHANGELOG.md`, not here. This line is just a date.

---

## 1. Goal

A web app by Outbuild that lets anyone create and track a golf scorecard for Bruntsfield Short Hole Golf Course — no login required, as few taps as possible, designed to feel like a physical scorecard on your phone. Built for use on the course, in the sun, by anyone.

---

## 2. Brand

- **Built by:** Outbuild
- **Tone:** Warm, Scottish, restrained — rooted in place. Not corporate, not generic.
- **Course:** Bruntsfield Short Hole Golf Course — one of Scotland's oldest public golf courses, Edinburgh

### Visual direction
Outbuild palette applied for outdoor sunlight legibility on a phone:
- **Background:** Cream / ivory (warm, not clinical white)
- **Primary text:** Deep charcoal / near-black
- **Accent:** Deep historic Scottish green — the single brand colour; does all decorative and interactive work (exact token in DESIGN.md). The only exceptions are the two score-vs-par **delta** colours (§5.3): a green for under par and a terracotta for over par, fenced to delta figures only and never used for chrome or interaction
- **Typography:** Cormorant Garamond italic for editorial moments (app name, headings); Inter for all UI labels and data
- **Overall feel:** Warm, grounded, purposeful — designed for use outdoors, one hand, in sunlight

---

## 3. Users

**Quick-play (logged-out):**
- Golfers playing Bruntsfield Short Hole Golf Course who want to score a round immediately with no setup
- No account required — scores saved locally to the device
- Accessed via mobile browser on the course

**Scorecard Plus (logged-in):**
- Users who want history that persists across devices and browsers
- Authenticated via magic link (email only — no password)
- Can create and name custom courses, with Bruntsfield Short Hole Golf Course pre-loaded as the default

---

## 4. Core features

### 4.1 Home screen
- Two options only: **New Game** and **History**
- Scorecard by Outbuild branding and Bruntsfield Short Hole Golf Course course name displayed prominently
- A small **ⓘ** icon sits in the top-right corner — tapping it opens the information page (see 4.8)
- When signed in, a **settings** affordance is shown on the home screen (not shown to signed-out users) — tapping it opens the Settings panel (§11.14). Home also carries a clearer signed-in/signed-out indicator (§11.6). Exact placement and form are a DESIGN.md / frontend call
- A **Rules** text link sits below the main New Game and History buttons — tapping it opens the course rules (see 4.9)
- If a game is in progress and the user navigates to the home screen mid-game, a **Resume Game** prompt appears between the two buttons
- Note: reopening the app with a game in progress bypasses the home screen and goes directly to the scorecard — see 4.3

### 4.2 Start a new game
- User taps **New Game**
- The setup screen opens straight at the player name fields (for logged-in users a course selector sits above them — see §11.7)
- Adds players dynamically (1–6) — tap **Add Player** to add, tap **✕** to remove; names can be typed or selected from suggestions
- Each player enters or selects a name
  - Names previously used are suggested from local browser storage
  - **Duplicate names are not allowed** — the app blocks starting if two players share the same name
  - No login required — names are stored locally on the device
- Taps **Start** — scorecard is created (no hole pre-selection required)

> **Game naming (removed):** an earlier design had an optional "game name" field on this screen that appeared on the scorecard, in History and on the share image. It was removed from the UI before the v2.0 release — no screen shows a game name. The `games.game_name` column is retained but unused (§11.3, §11.8).

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
  - **Maximum score per hole: 14 strokes.** The **+** button is disabled once 14 is reached. Note: the official Bruntsfield Short Hole Golf Club stroke limit is 7 per hole (see 4.9); the app uses a higher practical cap of 14 to accommodate casual play without being as restrictive as the official rule.
  - The **→** button advances focus to the next player on the same hole, or the next hole's first player
- Each scored cell shows its result against the hole's par as a small superscript (`+1` / `-1` / `E`), live as the score changes — see §5.3.1
- Running totals shown above the control bar, always visible — each total also shows the player's round score-to-par in brackets, e.g. `41 (+5)` (§5.3.2)
- Progress is **auto-saved to local storage continuously**
  - **On reopening the app with a game in progress:** the user is taken directly to the scorecard, bypassing the home screen. Focus is restored to the exact cell — the specific player and hole — that was active when the app was closed or the browser was shut.
  - If the user navigates back to the home screen during an active game, the Resume Game prompt appears there (see 4.1)

### 4.4 Finishing a game
- User taps **Finish Game**
- A **confirmation dialog** appears — user must confirm before the game ends (prevents accidental taps). Each player's line shows their total and round score-to-par, e.g. `41 (+5)` (§5.3.2)
- Final scores shown in a summary view (all players, all holes, totals), with each total showing the round score-to-par (§5.3.2)
- **DNF (did not finish):** a player is DNF when they completed fewer holes than the furthest player in that round, and is excluded from the result. If every player stopped at the same hole, nobody is DNF. A solo round is never DNF once at least one hole is scored.
- **The result:**
  - **Outright winner** — a single finisher has the lowest total
  - **Tied** — two or more finishers are level on the lowest total. The round is a draw (joint first). There is no tie-break and no countback. The Summary shows "Tied - [Name] & [Name] - [X] strokes"; for four or more level it falls back to "Tied - N players level on [X] strokes"
  - **No winner** — every player is DNF (all dropped out). The round is saved with no winner
  - **Solo rounds** (one player) — winner and draw concepts do not apply; nothing is highlighted as a result on any screen
- The result is derived from the per-hole scores by one shared `calculateResult` helper, returning `{ winners, dnf, isDraw, winningTotal }` plus a `winner = winners[0] ?? null` convenience field. It is **re-derived on read** for saved rounds (via the `deriveResult` wrapper) — the stored `game.winner` string on legacy localStorage rounds and the legacy single winner on D1 rounds are not authoritative and are not migrated
- A **Share** button appears on the summary screen — tapping it generates the share image and triggers the native device share sheet (see 4.7)
- Completed game saved to local browser storage with:
  - Date and time
  - Player names and scores per hole
  - Number of holes played
  - DNF status where applicable
  - `hole_pars` — the par array for the round (par 3 per hole for quick-play; see §5.1)

### 4.5 Game history
- Accessible from the home screen via **History**
- Lists all previously saved games, each showing: course name (where one is recorded), date, players, number of holes, and a **result label line** — "Winner: X - N strokes" / "Tied: X & Y - N strokes" / "No winner" (four or more level: "Tied: N players level on X strokes"). Two or three level winners are named; " - " (spaced hyphen) is the separator, matching the Summary and share image. Solo rounds show no result label, matching the Summary
  - The result label is re-derived from the stored scores on every History load (see 4.4) — it is not read from a stored winner field
  - Each round is identified by its date; there is no game-name field (see §4.2)
- Tapping a game shows the full scorecard for that game
- Tapping a player name filters to all games that player has appeared in
- A saved game can be edited from its detail view — see §11.13 (applies to both quick-play and logged-in rounds)

### 4.6 Player profiles (lightweight)
- Name-based recall only — not a login system
- Previously used names suggested when starting a new game
- Tapping a name in History filters to that player's game history
- Stored entirely in local browser storage (no database in MVP)
- History is device-specific — known MVP limitation, resolved when database is added post-MVP

### 4.7 Share scorecard

A **Share** button appears on the end-of-game summary screen (see 4.4). Tapping it generates a PNG and triggers the native device share sheet (iOS/Android share API).

**Share image layout (top to bottom):**
- The course name (e.g. "Bruntsfield Short Hole Golf Course") — main heading in bold
- Outbuild logo mark — directly below the heading
- Result callout:
  - Single winner: "Winner: [Name] - [X] strokes"
  - Tied: "Tied: [Name] & [Name] - [X] strokes" (or "[Name], [Name] & [Name]" for three-way ties)
  - All players DNF: "No winner - all players DNF"
  - Solo rounds: no result callout is drawn at all
  - The term **"Tied"** and the " - " (spaced hyphen) separator are used here and on the Summary and History — one vocabulary across every surface. The share image renders the tied, all-DNF and solo cases from the recomputed result
- Full hole-by-hole scorecard table:
  - Columns = players; rows = holes; cells = stroke count for that hole
  - Each hole row shows the hole number in bold with its par immediately after in brackets (e.g. "3 (3)"), matching the live grid and the read-only Summary (§5.1)
  - Each scored cell shows its vs-par delta as a small superscript (`+1` / `-1` / `E`) trailing the stroke count, matching the live grid and the read-only Summary (§5.3.1)
  - Totals row at the bottom of each column. Each column's total shows the player's round score-to-par in brackets on the total's main line, e.g. `41 (+5)` (§5.3.2)
  - DNF players are marked as DNF in their totals row
  - The per-hole superscripts and the round-total-to-par figure follow the §5.3 semantic under / level / over colour set. The share image is a hand-drawn canvas (`src/utils/share.js`) with its own local colour constants — the §5.3 tokens are mirrored there so the image matches the app
- No maximum height — the image extends to fit all holes played

**Sizing and layout:**
- Image width targets 390px — fills a standard phone screen when opened as an image
- Font sizes scaled for legibility as a standalone image on a mobile screen
- Column count and font size adapt to the number of players so content is always readable, never squashed

**OG preview image:**
- `public/og-image.png` is replaced with a static branded card in the app's cream and terracotta palette
- Text reads "Scorecard by Outbuild — Bruntsfield Short Hole Golf Course"
- Not a scorecard screenshot — a clean brand card only

### 4.8 Information page

Accessed via the **ⓘ** icon in the top-right corner of the home screen (see 4.1). No first-launch prompt — passive access only.

**Scope split with the privacy page:** this section is the canonical source for what the Information page itself contains. §11.12 is the canonical source for what the linked "Your data" privacy page contains. The two are deliberately different documents doing different jobs — this page is a light, in-app "about the app / about the course" surface; the privacy page is the full data-handling statement. Detail belongs in whichever section owns it, not both — see the single data line below, which is this page's only data-handling content.

**Contents (as built):**
- "Why we made this" — a short editorial note
- Course section:
  - Short description: "One of the world's oldest golf links, Bruntsfield Short Hole Golf Club has been a fixture in Edinburgh since 1895. The 36-hole course features par-3 holes of 45–90 yards – unique to world golf."
  - "Find out more" external link to https://www.bruntsfieldshortholegolfclub.co.uk/history/
  - "Course rules" link (navigates to the rules page)
  - Permission line: "The course map is reproduced with permission from Bruntsfield Short Hole Golf Club."
- "About Outbuild" credit
- Account section: when signed in, shows the user's name (if set) and email, with a "Sign out" action and a link into the Settings panel (§11.14) for editing name, changing email or deleting the account; when signed out, a "Sign in or create account" prompt. The Settings entry point also lives on Home (§4.1, §11.14)
- Data line: "Your data is handled under UK GDPR." with a "Read our privacy policy" link to the "Your data" page — this one line is the full extent of this page's data-handling content; everything else about what is stored, who processes it and for how long is owned by §11.12, not repeated here

The original v1.x plan for this page carried an inline "stored locally, nothing sent to a server, no third-party services" explanation. That is only true for quick-play; once accounts and the D1 database landed (§11), the detail moved to the dedicated privacy page rather than an inline disclaimer — this page deliberately stayed light-touch rather than growing a second, competing data explanation of its own.

**Note for maintainers:** If analytics is ever added (see BACKLOG.md), this data line, the privacy page (§11.12), and any in-app disclaimer text must all be updated to reflect what data is collected and by whom.

### 4.9 Course rules

The official rules of Bruntsfield Short Hole Golf Club are accessible in two places:
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

- Raw strokes only — totals, the winner, DNF and the draw rule are **all computed from raw strokes**. Par (§5.1) is display and derived-stats only; it never affects who wins. No handicap, no course rating
- Lower total = better score
- **Outright winner** = the single lowest total among players who completed all holes
- **Tied (joint first)** = two or more finishers level on the lowest total — a draw, with no tie-break and no countback (see 4.4)
- **No winner** = every player is DNF
- Players who drop out mid-round are marked DNF and excluded from the result
- One shared `calculateResult` helper produces the result for both live finishes and saved rounds (re-derived on read) — see 4.4
- No par-based or alternative scoring modes (stableford, match play) in v2.0 — see §7

### 5.1 Par

Par is a **per-hole** attribute of a course, used for display and derived stats only. It has no effect on totals, the winner, DNF or the draw rule (§5) — scoring stays raw-stroke throughout. It also enables the live score-vs-par displays (§5.3 — the per-hole indicator and the round total-to-par).

**Where par is shown:** the hole number renders in **bold** with the hole's par immediately after it in brackets — same font size, not bold, and with no semantic colour (e.g. "3 (3)"). The bracketed par inherits the cell's text colour but never takes bold or its own accent. This treatment is identical on the live Scorecard grid, the read-only Summary scorecard table (both the post-finish view and the History detail view), and the **share image** (§4.7) — a finished card and a shared card both read the same way as a live one. It replaces the raised `(N)` superscript that the first per-hole-par implementation shipped. The §5.3 semantic under / level / over colour applies to vs-par **deltas** only — this bracketed par label is not a delta and is unaffected by that decision; it stays uncoloured. The live per-hole vs-par indicator and the round total-to-par follow the shared display standard in §5.3.

**Model:**
- Every course carries a par value for each of its holes — a `hole_pars` array of integers, length = the course's hole count
- On course creation the array defaults to **par 3 for every hole** (the Bruntsfield reality), with one entry per hole for the course's chosen length (9 or 18 — see §11.7). The user adjusts each hole individually with a −/+ stepper (band 2–7). There is no "set every hole to N" control
- Quick-play (logged-out) assumes **par 3 for all 36 holes** with no UI. A `BRUNTSFIELD_HOLE_PARS` constant (a length-36 array of 3s) in `src/constants.js` is the single source of this value
- A round stores **its own copy of par** at completion (`games.hole_pars`, and the same field on completed localStorage records) so later edits to the course's par — or deleting the course — never rewrite the vs-par maths of a saved round (§11.3)

**Shared helper:**
- `scoreToPar(score, par)` returns the signed difference for a scored hole (`score - par`), or `null` when the hole is unscored. Callers own the presentation (`E`, `+1`, `-2`, etc.). Every score-vs-par surface goes through this one helper
- Par must be threaded to **every surface that renders scores**: the active game object, the completed localStorage record, the D1 `games` row, and `normalizeDbGame` output — so the score-vs-par displays can rely on it always being present

**Existing data:** `003` adds `hole_pars` as nullable with no backfill. Any course or round created before this migration has `hole_pars = null`; every reader treats a missing or null array as **par 3 for every hole** (correct for Bruntsfield, the only real-world course to date). No migration of saved rounds.

**Wiring note:** an earlier schema addition (`courses.holes`) sat unused for a while — a column with nothing reading it. Per-hole par was wired through properly instead of repeating that: `hole_pars` reaches the active game object, the completed localStorage record, the D1 `games` row, and `normalizeDbGame` output. (`courses.holes` itself is read now too — it drives user-course length, §11.7.)

### 5.2 End-of-round tally — removed

An end-of-round eagle / birdie / par / bogey tally was built and removed the same day: it added little to a solo round and crowded the scorecard. The round total-to-par (§5.3.2) and the per-hole indicator (§5.3.1) cover the vs-par story. Section numbering is unchanged — §5.3 keeps its number.

### 5.3 Score vs par — display standard

> **Status:** notation, placement and colour are locked; this section is the spec. Colour is a **semantic under / level / over set** (see "Colour" below). The exact tokens, their sunlight-contrast values, and the override rule for a delta sitting in an already-accent (winner) or already-inverted (active cell) context live in DESIGN.md. Shipped as the per-hole indicator (§5.3.1) and the round total-to-par (§5.3.2).

**Purpose.** One convention for how a score and its par render together, everywhere the two appear: the bracketed par on the hole number (§5.1), the live per-hole indicator (§5.3.1), and the round total-to-par (§5.3.2). All of these must read as one system.

**Scope.** Display only. Every figure is derived from raw strokes and the round's `hole_pars` snapshot via `scoreToPar()` (§5.1). Par never affects totals, the winner, DNF or the draw rule (§5). No schema, API or migration change — `scoreToPar()` and the `hole_pars` snapshot are already threaded to every score surface (§5.1, §11.3).

**Notation.**
- Level par: `E` — never `+0` or `-0`.
- Over par: `+N` — always a leading `+` (`+1`, `+5`).
- Under par: `-N` — leading `-` (`-1`, `-3`).
- A hole not yet scored: **nothing is shown** — no placeholder, no `E`. The indicator appears only once that hole has a stroke count.
- Round total-to-par renders in brackets after the total: `41 (+5)`, `38 (E)`, `35 (-3)`. Before a player has scored any hole the bracket is omitted entirely (the total already shows as `–`).
- **One shared formatter** (e.g. `formatToPar(delta)` in `src/utils/scores.js`) produces this string for every surface — no surface formats its own, so they cannot drift.

**Colour.**
Score-vs-par **deltas** carry a **semantic three-state colour**. This is the standard for every surface that renders a vs-par delta (§5.3.1, §5.3.2):

- **Under par** — a green
- **Level par (`E`)** — neutral: the figure inherits its context's text colour
- **Over par** — a warm terracotta / red

The exact tokens, their sunlight-contrast values, and the override rule for when a delta sits in an already-accent context (a winner's column) or an already-inverted context (the active cell, white-on-accent) are defined in DESIGN.md.

This is a deliberate, scoped exception to the app-wide rule that par "carries no colour of its own" (§5.1, DESIGN.md): the exception covers vs-par **deltas only**. The bracketed par *label* on the hole number (§5.1) is not a delta — it stays uncoloured, inheriting the cell's text colour and never taking an accent. §5.1 is unaffected by this decision.

**Placement and size.**
- Follows §5.1's "modifier trails the primary number" ordering — the vs-par figure comes immediately after the score it qualifies, just as `(par)` comes after the hole number.
- **Per-hole indicator (§5.3.1):** a superscript delta immediately trailing the score digit in the grid cell (`3` then a small raised `+1`), at the smallest legible size, non-bold. A superscript rather than the full-size inline bracket used for the hole-number par, because the player columns are far narrower than the hole column (up to six players share a row) and `3 (+1)` will not fit. This is the one deliberate divergence from §5.1's inline treatment and is justified by column width.
- **Round total-to-par (§5.3.2):** in brackets, on the same line as the total number (`41 (+5)`). Full size on the Summary totals row, the finish dialog and the share image; **on the live Scorecard totals bar it drops to `text-sm`** (documented DESIGN.md size exception) because at 390px with 5–6 players a full-size bracket wraps to a second line. `DNF` stays as the existing sub-label beneath where it applies. (Summary and History previously also showed an `Av. X` average-strokes sub-line here — dropped, as it duplicated the same total-to-par figure the bracket already shows.)

#### 5.3.1 Live per-hole vs-par indicator

As a score is entered on the live Scorecard grid (§4.3), each **scored** cell shows its result against that hole's par using the §5.3 notation — a superscript `+1` / `-1` / `E` trailing the number, updating live as `+` / `−` change the score. An unscored cell shows only the em dash, no indicator.

- **Surfaces:** the live Scorecard grid (primary), the read-only Summary / History scorecard table (§4.4, §11.9), and the **share image** (§4.7) — a finished card and a shared card both read the same way as a live one.
- The active cell keeps its inverted colours (white on accent); the indicator follows the §5.3 semantic colour rule, including the design-director's override for accent / inverted contexts.
- On the share image the superscript is drawn by the hand-rolled canvas renderer (`src/utils/share.js`), which carries its own local colour constants — the §5.3 semantic colour tokens are mirrored there so the shared image matches the in-app grid.

#### 5.3.2 Round total-to-par

Beside each player's round total, in brackets, their score-to-par for the round: the sum of `scoreToPar(score, par)` over the holes that player has scored, formatted per §5.3 (`41 (+5)` / `38 (E)` / `35 (-3)`).

- **Surfaces:**
  - the live **Scorecard totals bar** (§4.3) — updates as scores change;
  - the read-only **Summary** table and **History** detail view (§4.4, §11.9);
  - the **"Finish Game?" confirmation dialog** (§4.4) — each player's line becomes `Name … 41 (+5)`;
  - the **share image** (§4.7) — in brackets on the totals row, alongside the per-hole superscripts (§5.3.1). Same §5.3 colour set, mirrored into the canvas renderer's local constants (`src/utils/share.js`).
- Computed over **scored holes only**, so a mid-round or DNF player's figure reflects what they have actually played. A player with no scored holes shows just the total dash, no bracket.
- Likely wants a small aggregate helper (e.g. `roundToPar(playerScores, holePars)`) alongside `scoreToPar` in `src/utils/scores.js`.

**Touchpoints:** §4.3 (live grid + totals bar), §4.4 (finish dialog + post-finish Summary), §4.7 (share image), §11.9 (History read-only detail). §5.1 references this standard rather than restate it.

---

## 6. Course

- Single course: **Bruntsfield Short Hole Golf Course**, Edinburgh
- **Bruntsfield is 36 holes** — both in quick-play and as the seeded default course for signed-in users
- Signed-in users can create their own courses at **9 or 18 holes** (default 9). 36 holes is not offered for user-created courses (§11.7)
- UI includes a **"More courses coming soon"** placeholder where course selection will eventually live
- Per-hole par is stored per course and per saved round (see §5.1); it is display only. No other hole-level metadata (no yardage, no difficulty rating)
- A signed-in user can **edit** a course they created after the fact — its **name** and **per-hole pars**, but never its hole count, which is fixed for the life of the course. A signed-in user can also **delete** a course they created; deletion **cascades** and removes every round recorded on it too. Full detail in §11.7

---

## 7. Out of scope

The following are out of scope for both the MVP (v1.x) and the Scorecard Plus release (v2.0):

- Handicap calculations, course rating or slope
- Par-based and alternative scoring modes — stableford, match play, points-based (raw strokes only; **per-hole par as a display concept is in scope — see §5.1**)
- Leaderboards or social features
- Push notifications
- Native mobile app (web only)
- Admin tools or course management
- Full sign-up / onboarding journey — name, home course and per-hole par captured at account creation (BACKLOG #10). Lightweight name capture via the Settings panel (§11.14) does **not** introduce onboarding: `users.name` is optional, set only from Settings, with no sign-in-time prompt (§10)

The following were out of scope in v1.x and are now addressed in v2.0:
- User accounts and authentication → magic link auth (Section 11)
- Backend database → Cloudflare D1 (Section 11)
- Cross-device history sync → DB-backed history for logged-in users (Section 11)
- Custom course names → user-created courses (Section 11)

---

## 8. Future considerations (post v2.0)

- Par-based and alternative scoring modes (stableford, match play, etc.) — per-hole par itself now exists as a display concept (§5.1); this covers scoring that consumes it
- Leaderboards or social features (requires account foundation — now built in v2.0)
- All-time personal leaderboard per user (lowest round, most wins, etc.)
- Quick-play history import — allow users to migrate existing localStorage games to their new DB account after signing in
- Signed-in identity in gameplay — own-name pre-fill on New Game, a one-time name prompt, and styling the user's own score as primary across the scorecard, summary and history (BACKLOG #5). Builds on the `users.name` field added in §11.14
- Full onboarding journey (name + home course + par) — BACKLOG #10; needs a decision on how par interacts with the raw-stroke scoring model (§5) before any build
- Multiple holes / course configuration beyond the default — **partially delivered:** signed-in users can now create courses at 9 or 18 holes (§11.7). Arbitrary hole counts and structured per-course hole data remain future (BACKLOG #11)
- hello@outbuild.co as the contact email once configured via Resend

---

## 9. Success metrics (MVP)

- Any golfer at Bruntsfield Short Hole Golf Course can pick it up and use it without explanation
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

**"Scorecard Plus" is an internal name for the logged-in feature set only.** It is not shown anywhere in the UI — the app is "Scorecard by Outbuild" for everyone, signed in or not (§11.6). Where this PRD uses "Scorecard Plus" it means "the logged-in experience", never a label a user sees.

---

### 11.2 Technology stack additions

- **API layer:** Cloudflare Pages Functions — serverless functions co-deployed with the Cloudflare Pages site, living in the `/functions` directory
- **Database:** Cloudflare D1 — SQLite-compatible database, bound to the Pages project via wrangler
- **Email:** Resend — transactional email for magic link delivery. Configured via the `RESEND_API_KEY` environment variable (§11.11)
- **Session management:** D1 sessions table + HttpOnly cookie — a UUID session token is stored in D1; the browser receives it as a `Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Lax` header on verification. `Lax` (not `Strict`) so the cookie is still sent when a user arrives via an external link (e.g. the magic-link email itself), which `Strict` would block on first navigation

---

### 11.3 Database schema

Four tables in Cloudflare D1:

**users**
- `id` — UUID, primary key
- `email` — text, unique, not null
- `name` — text, nullable — the user's own display name (§11.14). Added in migration `004_add_user_profile.sql`, 8 September 2026, with **no backfill**: every existing user reads `name = null` and is not forced to re-authenticate. Trimmed to 1–60 characters on write (the same length band as a player name in `functions/_lib/game-input.js`); an empty string clears it back to null.
- `pending_email` — text, nullable — a new email address awaiting magic-link confirmation (§11.4.1, §11.14). `email` itself never changes until the confirmation link is clicked. Normally null; at most one pending change per user — a second email-change request overwrites it. Added in the same migration `004`.
- `created_at` — timestamp

**magic_tokens**
- `id` — UUID, primary key
- `email` — text, not null
- `token` — text, unique, not null
- `expires_at` — timestamp
- `used` — boolean, default false
- Rows are pruned opportunistically by `POST /api/auth/request-link` once their expiry is >24h in the past (§11.4).

**sessions**
- `id` — UUID, primary key (this is the session token stored in the cookie)
- `user_id` — UUID, foreign key → users.id
- `created_at` — timestamp
- `expires_at` — timestamp

**games**
- `id` — UUID, primary key
- `user_id` — UUID, foreign key → users.id
- `game_name` — text, nullable — unused; game-naming was removed from the UI and no API path writes it (column retained to avoid a table rebuild)
- `played_at` — timestamp
- `holes_played` — integer
- `player_data` — JSON blob (array of players with name, per-hole scores, total, DNF flag)
- `course_id` — UUID, foreign key → courses.id, nullable
- `hole_pars` — TEXT, JSON array of integers, length = `holes_played` — the course's par **as it stood when the round was saved**. Stored on the round so that later edits to the course's par, or deletion of the course, never change a saved round's score-vs-par figures. Completed localStorage records carry the same field. Added in migration `003_add_hole_pars.sql`, 2 September 2026
- `client_round_id` — text, nullable — the local (client-side) game's own id, sent by the client as an idempotency key on save so a given round can only ever produce one row, even if `POST /api/games` is called more than once for it (e.g. back-navigation to an already-saved Summary screen). Unique per `(user_id, client_round_id)`; added in migration `002_add_client_round_id.sql`, 24 August 2026.
- `notes` — text, nullable — an optional free-text note (up to 300 characters, enforced client-side) attached to a round. Present since the initial schema (`001_initial.sql`). Captured on the immediate post-finish Summary screen; shown read-only (and hidden entirely if blank) when the same round is later reopened from History, consistent with History's read-only scorecard view (§11.9). Editing notes on an already-saved round is done through the "Edit a past round" flow (§11.13), not a standalone update-notes endpoint.
- `created_at` — timestamp

**courses**
- `id` — UUID, primary key
- `user_id` — UUID, foreign key → users.id (null for system-provided courses)
- `name` — text, not null
- `holes` — integer, default 36. The seeded Bruntsfield course is 36; user-created courses are 9 or 18 (§11.7). `hole_pars` length always tracks this value
- `hole_pars` — TEXT, JSON array of integers, length = `holes` — the per-hole par for the course (§5.1). Set on creation, defaults to all 3s, editable per hole in the course-creation form and, after creation, via the course-edit screen (§11.7). Added in migration `003_add_hole_pars.sql`, 2 September 2026
- `is_default` — boolean, default false
- `created_at` — timestamp

**Seed data:** On new account creation, Bruntsfield Short Hole Golf Course is inserted into `courses` for that user as their default course (`is_default = true`, `holes = 36`, `hole_pars` = a length-36 array of 3s).

**Course edit and delete:** `name` and `hole_pars` are editable in place after creation via `PATCH /api/courses/[id]`; `holes` is never editable post-creation (§11.7). `DELETE /api/courses/[id]` removes the course row and **cascades to delete every `games` row with that `course_id`** — course deletion is destructive to its round history by design, matching the existing single-round delete in `History.jsx` (§11.7). Both routes are gated by session and ownership. Every course row has a real `user_id` owner — including each user's own seeded Bruntsfield copy — so a course belonging to another user reads as "not found"; a user *can* edit or delete their own seeded copy (their call — the course selector then degrades to an honest empty state, §11.7).

**Migration 004:** `004_add_user_profile.sql` adds `users.name` and `users.pending_email`, both nullable, no backfill. Must be applied to production D1 before the deploy that ships §11.14 (as with `002`/`003`).

**Why `hole_pars` is a JSON column, not a `course_holes` table:** par is always read and written as a whole array alongside its course or round — there is no query that needs a single hole's par in isolation, no per-hole row identity, and no other per-hole attributes planned for v2.0. A JSON TEXT column is consistent with `player_data` and keeps `003` a single additive migration with no joins. If structured per-course/per-hole data lands later (BACKLOG #11), a `course_holes` table can be introduced then.

---

### 11.4 Authentication — magic link via Resend

No passwords. Users authenticate with their email address only.

**Flow:**
1. User enters email address on the login screen
2. `POST /api/auth/request-link` — validates email format, then (per-email throttle) rejects with `429` if the address already has 5 or more unclaimed links issued in the last 15 minutes, so an inbox can't be flooded; otherwise creates a magic_token record in D1 (expires in 15 minutes) and sends the magic link email via Resend. The same call also prunes any magic_token rows whose expiry is more than 24 hours in the past — best-effort, after the response, so it can't affect sign-in — so abandoned sign-in attempts don't retain email addresses indefinitely (§11.12). Residual-abuse follow-ups are tracked in BACKLOG.md (#79).
3. User sees a confirmation screen: "Check your email — we've sent a link to [email]"
4. User taps the link in their email
5. `GET /api/auth/verify?token=<token>` — validates the token (exists, not expired, not used), marks it as used, creates or finds the user record, creates a session, sets the HttpOnly session cookie, redirects to the app
6. On first-time sign-in (new user), Bruntsfield Short Hole Golf Course is seeded as the user's default course
7. User is now in the logged-in state

**Session expiry:** Sessions last 30 days. A new session is created on each successful verification.

**Email content:** Simple, branded. Subject: "Sign in to Scorecard by Outbuild". A "Scorecard by Outbuild" wordmark, a "Sign in to your account" heading, a single "Sign in to Scorecard" CTA button, and the plain-text fallback URL below it. The plain-text alternative carries the same link. Footer: "Built by Outbuild." (Wording last revised 1 September 2026 — see CHANGELOG.md.)

**From address:** Set via the `RESEND_FROM_EMAIL` environment variable (§11.11). The exact address and its inbox sender-name display format are tracked in BACKLOG.md (#2b, #12).

---

### 11.4.1 Email change re-verification

Changing the email on an account reuses the magic-link machinery (§11.4) — the change only takes effect once the person proves they control the new address.

**Flow:**
1. A signed-in user submits a new email via `PATCH /api/users` (§11.14). The endpoint validates format and lowercases it, then **rejects it as a `400` with a clear message if it equals the user's current email** (not a silent success), rejects it as a `409` if it is already registered to another user, and rejects it as a `429` if the new address is over the per-email cap (step 2). Only past all of those does it set `users.pending_email` to the new address and issue a `magic_tokens` row for it (same table, same 15-minute expiry, `used = 0`).
2. The per-email cap from §11.4 / BACKLOG #14 applies to the new address — 5 unclaimed links per 15 minutes — so `PATCH /api/users` can't be used to flood an inbox. Lower risk than `request-link` since it needs a valid session.
3. A confirmation email is sent to the **new** address via Resend — layout mirrors the sign-in email, CTA reads "Confirm your email", subject "Confirm your email for Scorecard by Outbuild". If Resend fails the endpoint returns `500`; `users.email` is untouched and `pending_email` is left set (harmless — it does nothing until the link is clicked); the user retries.
4. Best-effort and non-blocking (`context.waitUntil`), sent from `PATCH /api/users` at request time: a short security notice to the **old** address, subject "Email change requested on your Scorecard account" — "a request was made to change the email on your Scorecard account; if this wasn't you, contact scorecard@outbuild.uk". It does **not** contain the new address (avoids leaking a mistyped address) and carries no action link.
5. The user clicks the link in the new inbox → `GET /api/auth/confirm-email?token=<token>` — a **new** endpoint, not an extension of `/api/auth/verify`. `verify` finds-or-creates a user and opens a session; neither is wanted here, and running it would create a second account for the pending address. `confirm-email` instead: validates the token (exists, `used = 0`, not expired); finds the user whose `pending_email` matches the token's email; re-checks the address is still free; then atomically (`DB.batch`) sets `users.email` to the pending value, clears `pending_email`, and marks the token used.
6. Redirects to `APP_URL` with a status flag for the frontend to surface: `?email=changed` on success, `?email=taken` when the address was claimed by someone else in the meantime, and `?email=expired` for **any** dead link — token missing or malformed, genuinely expired, already used, or superseded by a later change request (`pending_email` no longer matches). The dead-link cases are deliberately collapsed into the one `expired` flag: they all mean "this link no longer works, start the change again", and a separate "superseded" flag would add UI copy for no user benefit.

**No re-login.** Sessions key on the session id, not the email, so the current session and every other device's session stay valid — the email changes underneath them.

**Superseded requests:** issuing a new change request overwrites `pending_email`; any earlier outstanding confirmation link is then dead, because step 5's `pending_email` match no longer succeeds — it redirects `?email=expired` (see step 6).

---

### 11.5 Session management

- Session ID (UUID) stored in D1 `sessions` table
- Browser receives the session ID as a `session` HttpOnly cookie — never accessible to JavaScript
- `GET /api/auth/me` — reads the session cookie, validates against D1, returns `{ user: { id, email, name, pending_email } }` or 401. `name` is `null` for any user who hasn't set one (§11.14); `pending_email` is `null` unless an email change is awaiting confirmation (§11.4.1) and is returned so the Settings panel can show a "confirmation pending" state. `me.js` carries its own inline session query (it does not use `functions/_lib/session.js`) — that query gains `name` and `pending_email`; `getSessionUser` in `session.js`, used by the course and game endpoints, is unchanged
- All logged-in API routes read and validate the session cookie before executing
- `POST /api/auth/logout` — deletes the session from D1, clears the cookie, returns 200
- On app load, the frontend calls `/api/auth/me` to determine whether the user is authenticated — this sets a global `user` context used throughout the app

---

### 11.6 Branding of the logged-in layer

As built, the logged-in layer carries **no separate brand in the UI**. The app is "Scorecard by Outbuild" for everyone — there is no "Plus" suffix, wordmark treatment, or accent-coloured badge in the header. The original spec here called for a "Scorecard Plus" wordmark; it was not shipped, and the app settled on a single "Scorecard by Outbuild" identity throughout.

"Scorecard Plus" survives only as an internal shorthand for the logged-in feature set (see §11.1) — it is never shown to users and is not a header label, wordmark, or badge.

The signed-in state is shown functionally, not through branding: a "Past Rounds" button on Home, and the "Want to save your scores? Sign in" nudge is hidden. A clearer signed-in vs signed-out indicator on Home ships with the Settings panel (§11.14), alongside the settings entry point.

---

### 11.7 Course creation, editing, selection and deletion

**For logged-in users:**
- When starting a new game, a course selector appears above the player setup
- Default selected: the user's default course (Bruntsfield Short Hole Golf Course on first use)
- User can select from their existing courses or create a new one
- Creating a course: a text input for the course name — any name the user types is valid
- **Hole count:** creating a course picks its length — **9 or 18 holes, default 9**. 36 holes is not an option for user-created courses; quick-play Bruntsfield and the seeded default course stay 36 (§6, §11.3). **Hole count is fixed for the life of the course** — it cannot be changed after creation, including via the course-edit flow below. The par editor renders exactly the chosen number of holes
- **Par:** the course-creation form includes a per-hole par editor — a two-column list of the course's holes, each row a −/+ stepper. Every hole defaults to par 3, adjustable within a 2–7 band. There is no "set every hole to N" control. Par is stored as `courses.hole_pars` (§5.1, §11.3). Editing a course's par later (via the course-edit screen below) does not alter rounds already saved against it — each round keeps its own `games.hole_pars` snapshot
- **API (create):** `POST /api/courses` takes a `holes` field alongside `name` and `hole_pars`. It rejects any value that is not exactly 9 or 18 with a 400, validates that `hole_pars` length matches `holes`, and returns `holes` in the response. No new migration — `courses.holes` and `courses.hole_pars` already exist; only the written value and the validation around it change
- The selected course is stored on the game record when the game is saved to D1, along with a copy of its `hole_pars`
- Course names appear in the game history list

**Editing a course (name and par only):**
- A signed-in user can edit an existing course's **name** and **per-hole pars** from a dedicated course-edit screen, reusing the same −/+ stepper pattern (2–7 band) as course creation
- **Hole count stays fixed for the life of the course.** The edit screen never offers a control for it, and the API rejects any attempt to change it
- **API:** `PATCH /api/courses/[id]` — accepts `name` and/or `hole_pars` in the request body. **Rejects a `holes` field in the body with a 400** (hole count is immutable post-creation). If `hole_pars` is supplied, validates its length matches the course's existing `holes` value. Gated by the session cookie and by ownership — the course must belong to the requesting user (every course row, including each user's seeded Bruntsfield copy, has a real `user_id` owner, so a course belonging to someone else reads as "not found")
- Editing a course's par is **forward-looking only** — it changes the course's own definition for rounds played from that point on. It does **not** retroactively change the par shown on rounds already saved against that course, because each round stores its own `hole_pars` snapshot at play time (`games.hole_pars`, §11.3, §5.1). Correcting the par recorded on one specific already-played round is a separate, distinct capability handled by the past-round edit flow instead (§11.13) — the two are not the same feature and must not be confused for each other in the UI

**Deleting a course:**
- A signed-in user can delete a course via `DELETE /api/courses/[id]`, gated by the session cookie and by ownership (a course owned by another user reads as "not found"). Deleting one's own seeded Bruntsfield copy or last remaining course is allowed — the course selector then shows an honest empty state (§11.7)
- **Deletion cascades:** every round (`games` row) recorded on that course is deleted along with it — matching the destructive nature of the single-round delete already in `History.jsx`
- The frontend must show a clear warning before the delete happens, **stating how many rounds will also be deleted** — not a generic "delete this course?" prompt
- **Deleting the default course, or a user's only remaining course, is explicitly allowed.** There is no blocking and no auto-promotion of another course to default. If a user deletes their way down to zero courses, the Setup course selector degrades to an explicit empty state (e.g. "No courses yet" plus the "+ New course" action) rather than an accidentally-blank dropdown. No "set default course" feature exists or is planned as part of this — a user who deletes their default is simply left to choose from whatever courses remain, or create a new one

**For logged-out users:**
- Quick-play remains hardcoded to Bruntsfield Short Hole Golf Course — no course selection, editing or deletion UI
- No change to the logged-out experience

**Backlog:** Allow quick-play games (localStorage) to be imported into the user's DB after sign-in — logged in BACKLOG.md as a future item, not in v2.0.

---

### 11.8 Logged-in game flow

When a user is authenticated, the game save behaviour changes:

- On game completion, the completed round is written to D1 via `POST /api/games`. It is also retained in localStorage (a synced round is not deleted locally, so a failed POST can be retried on the next Summary visit), but the logged-in history view reads only from D1 — the two histories stay cleanly separate (§11.9)
- The game record includes: user_id, played_at, holes_played, player_data (JSON), course_id, hole_pars (JSON, copied from the course — see §5.1), notes, client_round_id (see §11.3). (The schema also has a nullable `game_name` column, unused since game-naming was removed from the UI.)
- Both `POST /api/games` and `PATCH /api/games/[id]` validate the client-supplied fields before writing: `played_at` must parse as a date, `player_data` must be a non-empty array (≤12) of `{ name, scores[, total, dnf] }` entries with the right types, `holes_played` an integer 1–36, and `hole_pars` (when present) a par array of the right length. Malformed input is rejected with a 400 (`functions/_lib/game-input.js`, `hole-pars.js`).
- The existing finish-game flow (summary screen, share) is unchanged — only the save destination changes

**Active game state:** While a game is in progress, the active game is still tracked in localStorage (same as the quick-play flow). On game completion, the final record is written to D1.

---

### 11.9 Logged-in history

- Logged-in users see their DB-backed game history — not their localStorage history
- Logged-out users see their localStorage history — no change
- The two histories are kept strictly separate — no merging in v2.0
- Logged-in history screen shows: course name, date, player names, holes played, and the result label (Winner / Tied / No winner), consistent with §4.5. (Game naming was removed from the UI, so no game-name column is shown.)
- Tapping a game shows the full scorecard (read-only, same layout as the existing summary screen), including the per-hole vs-par indicator (§5.3.1) and the round total-to-par (§5.3.2)
- Tapping a player name filters to games that player appeared in
- Empty state if no games saved yet

---

### 11.10 Quick-play (unchanged)

The quick-play experience (logged-out mode) is not changed by v2.0. Everything in Sections 4–10 of this PRD remains in effect for logged-out users. The app detects auth state on load and adapts — but a logged-out user should not notice anything different from the MVP.

---

### 11.11 Environment variables and secrets

The following are configured in Cloudflare Pages (production and preview):

| Variable | Where | Notes |
|---|---|---|
| `RESEND_API_KEY` | Cloudflare Pages env (production + preview) | API key held in the Resend dashboard |
| `RESEND_FROM_EMAIL` | Cloudflare Pages env | Sending address (inbox sender-name display format tracked in BACKLOG #2b) |
| `APP_URL` | Cloudflare Pages env | Base URL for constructing magic link URLs (e.g. `https://scorecard.outbuild.uk`) |
| `ADMIN_NOTIFY_EMAIL` | Cloudflare Pages env (production + preview) | Recipient for the best-effort account-deletion notification (§11.14). Falls back to `williamadamgriffiths@gmail.com` in code if unset. Internal ops address — unrelated to the user-facing contact address (`scorecard@outbuild.uk`, BACKLOG #12). |
| D1 binding: `DB` | wrangler.toml | Not an env var — the `scorecard-plus` Cloudflare D1 database, bound in `wrangler.toml` |

Cookie name and session/token expiry are hardcoded in the API layer (not env vars).

---

### 11.12 Privacy policy ("Your data" page)

The full data-handling statement lives on a dedicated **"Your data"** privacy page (`Privacy.jsx`), reached from the single "Read our privacy policy" link on the information page (§4.8). This section is the canonical source for that page's content — §4.8 owns the Information page itself and does not restate any of this; see the "Scope split" note there.

It states that logged-in users' rounds and scores are stored in a Cloudflare D1 database, that Resend processes email addresses to deliver the sign-in link, that neither provider uses the data for its own purposes, retention (account data kept while in use; sessions expire after 30 days; sign-in link records are pruned within ~24h of expiry), and **self-serve account deletion** — a signed-in user can delete their account and all associated rounds and courses immediately from the Settings panel (§11.14); emailing `scorecard@outbuild.uk` remains a fallback for anyone who can't sign in. `Privacy.jsx`'s "How long we keep it" section is updated from the old "email us and we'll do it within 30 days" wording to describe the self-serve route with the email as a fallback. Deletion is immediate and irreversible; quick-play history stored locally on a device is not part of the account and is not affected (§11.14).

The contact address is `scorecard@outbuild.uk` on the privacy page. Whether the information page also needs its own contact link, and the final address, are tracked in BACKLOG.md (#12).

---

### 11.13 Edit a past round

Users can correct a previously saved round from its detail (Summary) view. Editing **overwrites the existing record in place** — no new row is created, no duplicate is produced. Scope decisions below were confirmed by the user on 29 August 2026.

**Applies to both round types:**
- Logged-in (D1-backed) rounds — Scorecard Plus
- Logged-out localStorage quick-play rounds

Quick-play edits are localStorage-only and device-specific, consistent with all other quick-play behaviour (§4.6, §11.10). A quick-play round can only be edited on the device that holds it.

**Entry point:**
- When a saved round is opened from History, the round-detail (Summary) view uses navigation chrome rather than the immediate post-finish layout: a **"← Rounds"** back button top-left and an **"Edit"** action top-right. There is no full-width "Done" button on this view, and the saved note (if any) is shown as small static text — notes are edited only in edit mode.
- The immediate post-finish Summary (shown right after finishing a round) is unchanged — it keeps its "Done" button and inline notes field (§4.4, §11.3).
- Editing is blocked while a game is in progress. In that state the Edit action does nothing and the user is told to finish their current round first.

**What can be edited in v1 (both round types unless noted):**
- **Round date** (`played_at`) — pre-filled with the existing date and re-stamped on save. Editable for both local/quick-play and logged-in D1 rounds.
- **Player names** — rename existing players.
- **Per-hole scores** — for existing players, using the same scoring grid and controls as normal play (§4.3), including the 14-stroke cap.
- **Notes** — a pre-filled free-text notes field on the edit screen (same 300-character client-side limit as §11.3), saved with the rest of the round. This is the only route to editing notes on an already-saved round.
- **Course** — logged-in D1 rounds only, via the existing course selector (§11.7). For local/quick-play rounds the course is fixed and not editable in v1.
- **This round's hole pars** — a **separate, distinct capability from editing the course itself (§11.7)** and from the "Course" field above. Applies to both round types (local/quick-play and logged-in D1). The user can correct the per-hole par values recorded on this one round (`games.hole_pars`, §11.3) — independent of, and without touching, the course's own par definition (`courses.hole_pars`). Editing a course's par (§11.7) is forward-looking only and never rewrites a round already saved against it; this field is how a user instead goes back and fixes the par on one specific already-played round. Uses the same −/+ stepper pattern (2–7 band) as the course par editor (§11.7), rendered for exactly the round's existing hole count — editing a round's par never changes `holes_played` and has no effect on totals, winner or DNF (par is display-only per §5). **On the edit screen this control must be presented as clearly separate from the course-name/course-selector control** — its own labelled section, not merged into or adjacent-looking to the course picker — so a user cannot confuse "I'm correcting this round's par" with "I'm changing which course this round is attached to".

**What is NOT editable in v1 (deferred — see BACKLOG.md):**
- Adding or removing players during an edit. v1 is renames and score changes only.
- Changing the course on a local/quick-play round.
- Holes played is not a directly editable field — it is derived from the edited scores (see recalculation below).

**Recalculation on save:**
- Winner, DNF status, and per-player totals are all recalculated from the edited scores, applying the same rules as finishing a game (§4.4, §5): a player who has not scored every hole is DNF and excluded from the winner calculation; the winner is the lowest total among those who finished; ties and all-DNF cases are handled exactly as in the normal finish flow and the share image (§4.7).

**Persistence and identity:**
- The round keeps its original identity — same row, same `id`. Only `id`, `client_round_id`, and `created_at` are guaranteed unchanged by an edit. `played_at` (the round date) may change because it is user-editable (see above); this is still a correction to an existing round, not a new round.
- Logged-in: a `PATCH` on `functions/api/games/[id].js` updates the existing row, gated by the session cookie and by ownership (the round must belong to the requesting user). Editable fields include `played_at`, `player_data`, `hole_pars` (the round-level par correction above), `notes` and `course_id`.
- Logged-out: an update path in `storage.js` overwrites the existing localStorage record in place, keyed on its existing id.

**Sharing:** unchanged. After an edit is saved, the Summary view reflects the recalculated result and the existing Share button (§4.7) generates the share image from the updated data.

---

### 11.14 User profile and account management

Lightweight profile data plus self-serve account controls for signed-in users. The backend (BACKLOG #3) and the Settings panel (BACKLOG #4) ship together on one branch. Signed-in identity in gameplay (BACKLOG #5) is a later, separate effort and is only forward-referenced here.

Requires migration `004_add_user_profile.sql` applied to production D1 before deploy.

**The `name` field**
- A single nullable `users.name` column (§11.3) — the user's own display name, 1–60 characters after trimming, empty clears to null.
- Set only via the Settings panel. There is no onboarding step and no prompt at sign-in (§7, §10). A user with no name is fully functional — `name` stays null.
- In v1 of this capability `name` is **not read anywhere** in gameplay, history or sharing. Pre-filling the user's own player slot and styling their score as primary is BACKLOG #5 and out of scope here. §4.2's player-name entry and duplicate-name blocking are unchanged.

**`PATCH /api/users`** — updates the current session's user; no id in the path, always acts on "me".
- The session cookie is the only authorisation. Returns `401` with no valid session.
- Accepts `name` and/or `email`, both optional. A body with neither is a `200` no-op (mirrors `PATCH /api/courses/[id]`).
- `name`: trimmed; 1–60 chars sets it; empty string sets it to null; over 60 is `400`.
- `email`: applied **asynchronously** via the re-verification flow (§11.4.1) — the response reports that a confirmation email has been sent; `users.email` is unchanged until the link is clicked.
- **Partial application rule:** a hard validation failure on the `email` half — `400` (bad format or same as the current address), `409` (already registered to another user) or `429` (over the per-email cap) — **rejects the whole request**; a `name` in the same body is **not** applied. A `name` is applied alongside a pending email change only once the email has passed all validation and merely the Resend send then failed (`500`).

**`DELETE /api/users`** — deletes the current session's user; no id in the path.
- The session cookie is the only server-side authorisation. The typed-`DELETE` confirmation (below) is client-side friction only, matching the delete-round bottom sheet in `History.jsx` — the server requires no confirmation token.
- Removes, in one atomic `DB.batch`: every `games` row for the user; every `courses` row for the user (their seeded Bruntsfield copy included); every `sessions` row for the user (signs the account out on all devices); every `magic_tokens` row whose `email` matches the user's `email` or `pending_email` (that table has no `user_id`); then the `users` row itself.
- Clears the session cookie on the response (identical header to `POST /api/auth/logout`).
- Sends a best-effort admin notification via Resend (`context.waitUntil`, failure swallowed — a mail failure never blocks or reverses the deletion), subject "Scorecard account deleted". The body is a **timestamp only**; it must not contain the deleted user's email address or any other identifying data. Sent from `RESEND_FROM_EMAIL` to `ADMIN_NOTIFY_EMAIL` (§11.11).
- **No** user-facing "your account has been deleted" email.
- **Quick-play localStorage history is deliberately left untouched** — it is device-local, was never tied to the account (§11.9), and the client does not clear it on account deletion.
- Irreversible: no soft-delete, no grace period, no export-first step.

**Settings panel (BACKLOG #4 — ships with this capability)**
- Entry point: a settings affordance on Home, shown only when signed in, paired with a clearer signed-in/signed-out indicator on Home. This delivers the indicator that §11.6 previously flagged as a backlog item. The signed-out Home is unchanged (§11.10).
- Contents: edit name (text field, 1–60, clear-to-empty allowed); change email (shows the current address; on submit, tells the user to check the new inbox and that the address changes only once confirmed; shows the pending address while `pending_email` is set); delete account.
- Delete account: a confirmation dialog matching `History.jsx`'s delete-round bottom sheet, plus the requirement to type `DELETE` to enable the destructive button. Copy states plainly that all rounds, courses and the account are removed, and that quick-play history on this device is not affected.

**Forward reference — signed-in identity in gameplay (BACKLOG #5, not in this capability):** pre-filling the first player slot with the user's `name`, a one-time name prompt when none is set, and styling the user's own score as primary across the scorecard, summary and history. Deferred; no schema or API groundwork for it is added here beyond the `name` column itself.
