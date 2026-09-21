# Product Requirements Document
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

**Version:** 2.0
**Last updated:** 21 September 2026

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
- A small icon sits in the top-right corner. **Signed out:** an **ⓘ** icon that opens the information page (see 4.8). **Signed in:** a **settings gear** in the same place that opens the Settings panel (§11.14); the information page is then reached from an **About** row inside Settings (BACKLOG #83)
- When signed in, the header gear (above) is the way into Settings (§11.14); there is no separate Settings button. Home also carries a plain "Signed in as ..." line (§11.6), which is text only. Exact placement and form are a DESIGN.md / frontend call
- A **Rules** text link sits below the main New Game and History buttons — tapping it opens the course rules (see 4.9)
- If a game is in progress and the user navigates to the home screen mid-game, a **Resume Game** prompt appears between the two buttons
- Note: reopening the app with a game in progress bypasses the home screen and goes directly to the scorecard — see 4.3

### 4.2 Start a new game
- User taps **New Game**
- The setup screen opens straight at the player name fields (for logged-in users a course selector sits above them — see §11.7)
- For signed-in users, the first player slot is pre-filled with the user's own name if `users.name` (§11.3, §11.14) is set — editable like any other slot, same as any other player field (§11.15)
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
  - The **Map** button only shows when the active game's course is actually Bruntsfield, matched by the game itself rather than which route it was started from, and gated on sign-in state: a logged-out game is always Bruntsfield (quick-play has no course selector at all, so this covers it and a generic New Game alike); a signed-in game is matched by course name against the one canonical Bruntsfield name — which means a signed-in round with no course selected does **not** show the button, since a missing course there is a real, intentional state rather than Bruntsfield by default
  - A hole score has two states: **empty (—)** and **scored (1 or above)** — there is no zero
  - Tapping **+** on an empty cell sets it to 1; tapping **+** on a scored cell increments by 1
  - Tapping **−** on a cell showing 1 returns it to empty (—); tapping **−** on a cell showing 2+ decrements by 1
  - The **−** button is visually disabled when the active cell is empty
  - **Maximum score per hole: 14 strokes.** The **+** button is disabled once 14 is reached. Note: the official Bruntsfield Short Hole Golf Club stroke limit is 7 per hole (see 4.9); the app uses a higher practical cap of 14 to accommodate casual play without being as restrictive as the official rule.
  - The **→** button advances focus to the next player on the same hole, or the next hole's first player
- Each scored cell shows its result against the hole's par as a small superscript (`+1` / `-1` / `E`), live as the score changes — see §5.3.1
- A player's name carries a small star badge when it matches the signed-in user's own name (§11.15)
- Running totals shown above the control bar, always visible — each total also shows the player's round score-to-par in brackets, e.g. `41 (+5)` (§5.3.2)
- Progress is **auto-saved to local storage continuously**
  - **On reopening the app with a game in progress:** the user is taken directly to the scorecard, bypassing the home screen. Focus is restored to the exact cell — the specific player and hole — that was active when the app was closed or the browser was shut.
  - If the user navigates back to the home screen during an active game, the Resume Game prompt appears there (see 4.1)

### 4.4 Finishing a game
- User taps **Finish Game**
- A **confirmation dialog** appears — user must confirm before the game ends (prevents accidental taps). Each player's line shows their total and round score-to-par, e.g. `41 (+5)` (§5.3.2), and carries the same star badge as the live Scorecard for a name-match with the signed-in user (§11.15)
- Final scores shown in a summary view (all players, all holes, totals), with each total showing the round score-to-par (§5.3.2)
- Player names in the summary table carry the same star badge as the live Scorecard for a name-match with the signed-in user (§11.15). The winner/tied prose callout below does not carry the star (§11.15)
- **DNF (did not finish):** a player is DNF when they completed fewer holes than the furthest player in that round, and is excluded from the result. If every player stopped at the same hole, nobody is DNF. A solo round is never DNF once at least one hole is scored. These same DNF and solo-round rules also govern a roster changed via a past-round edit — a retroactively-added player left without early-hole scores, or a round edited down to one player — with no special-casing (§11.13.1)
- **The result:**
  - **Outright winner** — a single finisher has the lowest total
  - **Tied** — two or more finishers are level on the lowest total. The round is a draw (joint first). There is no tie-break and no countback. The Summary shows "Tied - [Name] & [Name] - [X] strokes"; for four or more level it falls back to "Tied - N players level on [X] strokes"
  - **No winner** — every player is DNF (all dropped out). The round is saved with no winner
  - **Solo rounds** (one player) — winner and draw concepts do not apply; nothing is highlighted as a result on any screen. This includes a round reduced to one player via an edit (§11.13.1), not just one started solo
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
  - Player names carry the star badge (§11.15) in the per-round player rows and the player filter chips, consistent with the live Scorecard and Summary. The result label line itself ("Winner: X - N strokes" etc.) does not carry the star — see §11.15's explicit scope note
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

Accessed via the **ⓘ** icon in the top-right corner of the home screen when signed out (see 4.1), or via the **About** row in Settings (§11.14) when signed in, since the signed-in header shows the settings gear instead. From Settings, the page's back button returns to Settings. No first-launch prompt — passive access only.

**Scope split with the privacy page:** this section is the canonical source for what the Information page itself contains. §11.12 is the canonical source for what the linked "Your data" privacy page contains. The two are deliberately different documents doing different jobs — this page is a light, in-app "about the app / about the course" surface; the privacy page is the full data-handling statement. Detail belongs in whichever section owns it, not both — see the single data line below, which is this page's only data-handling content.

**Contents (as built):**
- "Why we made this" — a short editorial note
- Course section:
  - Short description: "One of the world's oldest golf links, Bruntsfield Short Hole Golf Club has been a fixture in Edinburgh since 1895. The 36-hole course features par-3 holes of 45–90 yards – unique to world golf."
  - "Find out more" external link to https://www.bruntsfieldshortholegolfclub.co.uk/history/
  - "Course rules" link (navigates to the rules page)
  - Permission line: "The course map is reproduced with permission from Bruntsfield Short Hole Golf Club."
- "About Outbuild" credit, with a "Questions or feedback? Get in touch." line and a `mailto:` link to `scorecard@outbuild.uk` (the same address as the privacy page)
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
- Full onboarding journey (name + home course + par) — BACKLOG #10; needs a decision on how par interacts with the raw-stroke scoring model (§5) before any build
- Multiple holes / course configuration beyond the default — **partially delivered:** signed-in users can now create courses at 9 or 18 holes (§11.7). Arbitrary hole counts and structured per-course hole data remain future (BACKLOG #11)

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
- Rows are pruned opportunistically by `GET /api/auth/verify` at each sign-in: any row whose `expires_at` has passed is deleted (best-effort, after the response, so it can't affect sign-in). Mirrors the `magic_tokens` prune above; an expired session can never authenticate again, so this only stops the table growing.

**games**
- `id` — UUID, primary key
- `user_id` — UUID, foreign key → users.id
- `game_name` — text, nullable — unused; game-naming was removed from the UI and no API path writes it (column retained to avoid a table rebuild)
- `played_at` — timestamp
- `holes_played` — integer
- `player_data` — JSON blob (array of players with name, per-hole scores, total, DNF flag)
- `course_id` — UUID, foreign key → courses.id, nullable
- `hole_pars` — TEXT, JSON array of integers, length = `holes_played` — the course's par **as it stood when the round was saved**. Stored on the round so that later edits to the course's par, or deletion of the course, never change a saved round's score-vs-par figures. Completed localStorage records carry the same field. Added in migration `003_add_hole_pars.sql`, 2 September 2026
- `client_round_id` — text, nullable — the local (client-side) game's own id, sent by the client as an idempotency key on save so a given round can only ever produce one row, even if `POST /api/games` is called more than once for it (e.g. back-navigation to an already-saved Summary screen, or an automatic re-sync of a pending round after an ambiguous failure, §11.8). `GET /api/games` also returns it, so History can match a pending local round to its D1 row (§11.9). Unique per `(user_id, client_round_id)`; added in migration `002_add_client_round_id.sql`, 24 August 2026. On `POST /api/games` it must be absent or null (an old cached frontend omits it) or a non-empty string of at most 64 characters; anything else is a `400`.
- `notes` — text, nullable — an optional free-text note (up to 300 characters, enforced on the server for both `POST /api/games` and `PATCH /api/games/[id]` as well as client-side; a non-string or over-length value is a `400`) attached to a round. Present since the initial schema (`001_initial.sql`). Captured on the immediate post-finish Summary screen; shown read-only (and hidden entirely if blank) when the same round is later reopened from History, consistent with History's read-only scorecard view (§11.9). Editing notes on an already-saved round is done through the "Edit a past round" flow (§11.13), not a standalone update-notes endpoint.
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
2. `POST /api/auth/request-link` — validates email format (the server rule in "Email validation" below), then (per-email throttle) rejects with `429` if the address already has 5 or more unclaimed links issued in the last 15 minutes, so an inbox can't be flooded; otherwise creates a magic_token record in D1 (expires in 15 minutes) and sends the magic link email via Resend. The same call also prunes any magic_token rows whose expiry is more than 24 hours in the past — best-effort, after the response, so it can't affect sign-in — so abandoned sign-in attempts don't retain email addresses indefinitely (§11.12). Residual-abuse follow-ups are tracked in BACKLOG.md (#79).
3. User sees a confirmation screen: "Check your email — we've sent a link to [email]"
4. User taps the link in their email
5. `GET /api/auth/verify?token=<token>` — validates the token (exists, not expired, not used), claims it atomically, creates or finds the user record, creates a session, sets the HttpOnly session cookie, redirects to the app. The claim is a single `UPDATE ... SET used = 1 WHERE id = ? AND used = 0 AND expires_at > now`, and the handler checks that exactly one row changed; if none did (a second or concurrent click, or a token that lapsed in between) it redirects to `?auth=expired` and creates no user, session or second session. Expired `sessions` rows are pruned at this point (§11.3)
6. On first-time sign-in (new user), Bruntsfield Short Hole Golf Course is seeded as the user's default course
7. User is now in the logged-in state

**Email validation:** one shared server rule (`functions/_lib/email.js`) is used by `request-link` and `PATCH /api/users` (§11.4.1). It is deliberately permissive, since Resend is the real deliverability check. An address must be at most 254 characters; the local part at most 64, in dot-atom form (no leading, trailing or consecutive dots); the domain at least two dot-separated labels, each at most 63 characters. Letters, numbers and marks are allowed, including non-ASCII (internationalised addresses). Whitespace, commas, quotes, angle brackets and more than one `@` are rejected, as are quoted local parts and IP-literal domains.

**Request bodies:** a request body that is not a JSON object (unparseable, empty, `null`, an array or a bare primitive) returns `400 { error: 'Invalid request body' }`. This applies to every JSON-body endpoint (auth, games, courses, and `PATCH /api/users`).

**Session expiry:** Sessions last 30 days. A new session is created on each successful verification.

**Email content:** Simple, branded. Subject: "Sign in to Scorecard by Outbuild". A "Scorecard by Outbuild" wordmark, a "Sign in to your account" heading, a single "Sign in to Scorecard" CTA button, and the plain-text fallback URL below it. The plain-text alternative carries the same link. Footer: "Built by Outbuild." (Wording last revised 1 September 2026 — see CHANGELOG.md.)

**From address:** Set via the `RESEND_FROM_EMAIL` environment variable (§11.11). The exact address and its inbox sender-name display format are tracked in BACKLOG.md (#2b, #12).

---

### 11.4.1 Email change re-verification

Changing the email on an account reuses the magic-link machinery (§11.4) — the change only takes effect once the person proves they control the new address.

**Flow:**
1. A signed-in user submits a new email via `PATCH /api/users` (§11.14). The endpoint validates format (the same server rule as §11.4 "Email validation") and lowercases it, then **rejects it as a `400` with a clear message if it equals the user's current email** (not a silent success), rejects it as a `409` if it is already registered to another user, and rejects it as a `429` if the new address is over the per-email cap (step 2). Only past all of those does it set `users.pending_email` to the new address and issue a `magic_tokens` row for it (same table, same 15-minute expiry, `used = 0`).
2. The per-email cap from §11.4 / BACKLOG #14 applies to the new address — 5 unclaimed links per 15 minutes — so `PATCH /api/users` can't be used to flood an inbox. Lower risk than `request-link` since it needs a valid session.
3. A confirmation email is sent to the **new** address via Resend — layout mirrors the sign-in email, CTA reads "Confirm your email", subject "Confirm your email for Scorecard by Outbuild". If Resend fails the endpoint returns `500`; `users.email` is untouched and `pending_email` is left set (harmless — it does nothing until the link is clicked); the user retries.

---

### 11.4.2 Resend link on the confirmation screen

> **Status:** shipped 18 September 2026 (BACKLOG #9). Decisions below confirmed by the user 18 September 2026.

Adds a "Resend link" control to step 3 of §11.4's flow - the "Check your email" confirmation screen (`src/pages/Login.jsx`), which currently shows static confirmation text with no way to resend without navigating back to the form.

**No new backend surface.** The button re-calls the existing `POST /api/auth/request-link` (§11.4), reusing the email address already held in Login's local component state from the initial submission. No new endpoint, no schema change.

**Client-side cooldown (new, in addition to the existing server-side throttle):** after a tap, the button disables for **30 seconds**, showing a countdown state (e.g. "Resend in 30s") before re-enabling as "Resend link". This is a UX guard against accidental repeat taps, deliberately short and separate from - not a replacement for - the server's existing 5-links-per-15-minutes-per-email cap (§11.4). Cooldown state is local component state only, not persisted, so it resets on page refresh or re-navigation to the screen.

**429 handling:** if `request-link` rejects the resend because the server throttle has been hit, the screen shows plain-language copy in place of a raw error - e.g. "You've requested a few links already - check your inbox (including spam), or try again in a few minutes." - rather than surfacing the API's raw error text. The button still returns to its normal 30-second client cooldown afterwards; the UI does not attempt to compute or display the server throttle's own reset time.

A successful resend re-confirms in place, reusing the existing "we've sent a link to [email]" copy from step 3 of §11.4 rather than introducing new wording.

**Out of scope for this capability:** no attempts-remaining counter, no way to change the email address from this screen (existing "back to form" navigation already covers that), no change to the server-side throttle itself (§11.4 / BACKLOG #79 track that separately).
4. Best-effort and non-blocking (`context.waitUntil`), sent from `PATCH /api/users` at request time: a short security notice to the **old** address, subject "Email change requested on your Scorecard account" — "a request was made to change the email on your Scorecard account; if this wasn't you, contact scorecard@outbuild.uk". It does **not** contain the new address (avoids leaking a mistyped address) and carries no action link.
5. The user clicks the link in the new inbox → `GET /api/auth/confirm-email?token=<token>` — a **new** endpoint, not an extension of `/api/auth/verify`. `verify` finds-or-creates a user and opens a session; neither is wanted here, and running it would create a second account for the pending address. `confirm-email` instead: validates the token (exists, `used = 0`, not expired); finds the user whose `pending_email` matches the token's email; re-checks the address is still free; then atomically (`DB.batch`) sets `users.email` to the pending value, clears `pending_email`, and marks the token used.
6. Redirects to `APP_URL` with a status flag for the frontend to surface: `?email=changed` on success, `?email=taken` when the address was claimed by someone else in the meantime, and `?email=expired` for **any** dead link — token missing or malformed, genuinely expired, already used, or superseded by a later change request (`pending_email` no longer matches). The dead-link cases are deliberately collapsed into the one `expired` flag: they all mean "this link no longer works, start the change again", and a separate "superseded" flag would add UI copy for no user benefit.

**No re-login.** Sessions key on the session id, not the email, so the current session and every other device's session stay valid — the email changes underneath them.

**Superseded requests:** issuing a new change request overwrites `pending_email`; any earlier outstanding confirmation link is then dead, because step 5's `pending_email` match no longer succeeds — it redirects `?email=expired` (see step 6).

---

### 11.5 Session management

- Session ID (UUID) stored in D1 `sessions` table
- Browser receives the session ID as a `session` HttpOnly cookie — never accessible to JavaScript
- `GET /api/auth/me` — reads the session cookie, validates against D1, returns `{ user: { id, email, name, pending_email } }` or 401. `name` is `null` for any user who hasn't set one (§11.14); `pending_email` is `null` unless an email change is awaiting confirmation (§11.4.1) and is returned so the Settings panel can show a "confirmation pending" state. `me.js` reads the cookie with `getSessionCookie` from `functions/_lib/session.js` but carries its own inline session query (it does not use `getSessionUser`) — that query also selects `name` and `pending_email`; `getSessionUser` in `session.js`, used by the course and game endpoints, is unchanged. The cookie is read, set and cleared only through shared helpers in `session.js` (`getSessionCookie`, `buildSessionCookie`, `CLEAR_SESSION_COOKIE`), so verify, logout, me and account delete agree on its attributes (`HttpOnly; Secure; SameSite=Lax; Path=/`, 30-day `Max-Age`)
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

- On game completion ("Done" on the post-finish Summary), the completed round is written to D1 via `POST /api/games`, idempotent on `client_round_id` (§11.3). The round is always also retained in localStorage. A synced round is not deleted locally, but the logged-in history view reads from D1 (plus the marker-gated exception for unsaved rounds below) — the two histories otherwise stay separate (§11.9)
- The game record includes: user_id, played_at, holes_played, player_data (JSON), course_id, hole_pars (JSON, copied from the course — see §5.1), notes, client_round_id (see §11.3). (The schema also has a nullable `game_name` column, unused since game-naming was removed from the UI.)
- Both `POST /api/games` and `PATCH /api/games/[id]` validate the client-supplied fields before writing: `played_at` must parse as a date, `player_data` must be a non-empty array (≤12) of `{ name, scores[, total, dnf] }` entries with the right types, `holes_played` an integer 1–36, and `hole_pars` (when present) a par array of the right length. Malformed input is rejected with a 400 (`functions/_lib/game-input.js`, `hole-pars.js`).
- The existing finish-game flow (summary screen, share) is unchanged — only the save destination changes

**Active game state:** While a game is in progress, the active game is still tracked in localStorage (same as the quick-play flow). On game completion, the final record is written to D1.

**When the save fails (BACKLOG #95).** A signed-in round must never be silently lost to a failed save (patchy signal on the course is the realistic cause). Correction to an earlier version of this section: it claimed a synced round is kept locally "so a failed POST can be retried on the next Summary visit". No path returns to that Summary, so that retry never happened; it is replaced by the behaviour below.
- **Failure is never silent.** A non-OK response or a network error on Done keeps the user on Summary, shows an error announced to assistive tech (`role="alert"`), and offers two choices: **Retry**, or **Keep on this device and go home**. Nothing navigates home on its own after a failure, and the user is never trapped without signal. Success behaves as before (home).
- **Marking the round pending (refined, BACKLOG #112, #113).** The round is marked **pending** at the **first failed save**, at the moment the error appears, tagged with the user who played it (`pendingSyncUserId` = the signed-in user's id). It is not deferred until the user taps "Keep on this device". **Keep on this device and go home** therefore only navigates home, because the round is already pending; a back gesture or closing the app on the error screen no longer leaves an unmarked, unsynced local round. A signed-out user never gets a marker (they have nothing to save). If even the local write of the marker fails (for example device storage is full), the round is **not** marked, **Keep on this device is not offered**, and the user is told to stay and retry, so nothing is silently lost. A successful **Retry** clears the marker and marks the round synced, as before.
  - **While the error is showing**, the background sync leaves that round alone, so it cannot double-send or overwrite the notes the user is still editing for Retry. The round is released, and a sync is triggered, when the user leaves the screen. Notes typed on the error screen are stored on the pending round, so the later sync sends them.
  - The existing `synced` flag is **not** used for this: it is undefined on every quick-play round, so it cannot tell a signed-in failed save from a pre-sign-in quick-play round (and it is not a reliable "on the server" flag). A pending round is the only kind of local round that carries this marker. The marker is deliberately generic so the future quick-play import (BACKLOG #8, §8) could reuse it; #8 remains separate, unbuilt and out of scope here.
- **Automatic re-sync.** Pending rounds are re-sent with no user action on any of these triggers: the app opening (once auth resolves); signing in (including signing back in after a 401); the device coming back online (the `online` event); the tab or app becoming visible again (`visibilitychange`); immediately after the user leaves the failed-save screen (Keep or otherwise); and after a pending round's edit is saved or abandoned. A 5xx or a timeout does not fire `online`, which is why the visible-again and after-Keep triggers exist. Every trigger goes through the same double-fire guard, so a round is never sent by two overlapping runs, and the same check that the browser's session really belongs to the round's user (BACKLOG #114). Re-sending relies on `client_round_id` idempotency, so a retry after an ambiguous failure (server saved, response lost) cannot create a duplicate. On success the marker is cleared and the local round is marked synced.
- **Outcomes of a re-sync attempt, per round:** a 2xx clears the marker (above). A network error or 5xx is transient: the round stays pending and is retried on the next trigger. A **401** (session expired) keeps the round pending and waits; it is retried once the user is signed in again. A permanent **400** (for example the round's course has since been deleted) never deletes the round: it stays on the device flagged as **rejected** (not saveable) and is not retried automatically. A round is never deleted by the app because a save failed, whatever the response. **Known limit:** a rejected (400) round is view / edit / delete only. There is no manual retry, and editing it does not clear the rejected flag or trigger a re-attempt. **Known limit (lost response, then a local edit):** if the server saved the round but the response was lost, and the user then edits the round locally (or changes its notes on the error screen and retries) before the next successful sync, the sync's idempotent 200 keeps the **old** data on the server and the edit stays local-only. The marker clears, so the round then shows as saved with the old server data. Fixing this needs a backend change (a PATCH, or a GET by `client_round_id`); it is tracked as a separate BACKLOG item and is **out of scope** here.
- **Shared device.** A pending round syncs only while the user who played it (`pendingSyncUserId`) is the signed-in user. A different user signing in on the same device never syncs it, sees it in History, or has it counted in filters or totals; when signed out, it appears as an ordinary local round in the quick-play History (§11.9), as it always could.
- **Editing or deleting a pending round** is local only (§11.9, §11.13): an edit never sets `synced` or clears the marker, and a delete makes no server call. While a re-sync of that same round is in flight, Edit and Delete of it are briefly blocked with a short message ("Saving this round - try again in a moment."), so an edit or delete can never diverge from what the server received. In the other direction, while the user is on the **Edit Round setup screen** for a pending round (before the edit working copy exists), the background sync leaves that round alone, so it cannot send the old data and strand the edit; the round is released when the user leaves the screen (starts the edit, or cancels). While the edit itself is in progress the round is already skipped by the sync, and it is released and a sync triggered when the edit is saved or abandoned.

---

### 11.9 Logged-in history

- Logged-in users see their DB-backed game history — not their localStorage history
- Logged-out users see their localStorage history — no change
- The two histories are kept strictly separate — no merging in v2.0 — with **one narrow, marker-gated exception** for rounds whose save to D1 failed (§11.8, BACKLOG #95): a signed-in user's History additionally shows local rounds whose `pendingSyncUserId` matches their own user id. **Nothing else from localStorage is ever merged**: quick-play rounds without the marker, and pending rounds tagged with a different user's id, never appear in a signed-in History (importing quick-play rounds is BACKLOG #8, separate and unbuilt)
- **Pending rounds in the list:**
  - Each carries a **"Not yet saved"** badge. A round the server permanently rejected (§11.8) carries a visibly distinct treatment and wording instead (for example "Can't be saved", with a short explanation that it is kept on this device only). Exact copy and styling are a DESIGN.md / frontend call
  - Ordering: merged into the list by played date alongside D1 rows. The `GET /api/games` `LIMIT 100` cap is unchanged (decided 19 September 2026); pending rounds are always shown **in addition to** the 100 D1 rows, never count toward the cap and are never evicted by it
  - They otherwise behave as any other row: same fields and result label, player filter chips, opening the full scorecard
  - **Open** (read): from the local record. **Edit**: writes back to the local record only and the round stays pending (§11.13). **Delete**: removes the local record only, with no server call and no server wait; the confirm bottom sheet keeps the same structure as for a saved round, but the delete-waits-for-server rule below does not apply
  - **Dedupe on sync**: once a pending round syncs (marker cleared), only the D1 row shows. Matching is by `client_round_id` (the local round's id, §11.3), so a round never appears twice, including when the server saved it but the response was lost and the marker is not yet cleared. `GET /api/games` therefore returns `client_round_id` on each row
- Signed-out History is unchanged (it lists every local round, including any still pending, with no badge)
- Logged-in history screen shows: course name, date, player names, holes played, and the result label (Winner / Tied / No winner), consistent with §4.5. (Game naming was removed from the UI, so no game-name column is shown.)
- Tapping a game shows the full scorecard (read-only, same layout as the existing summary screen), including the per-hole vs-par indicator (§5.3.1) and the round total-to-par (§5.3.2)
- Tapping a player name filters to games that player appeared in
- Empty state if no games saved yet - shown only when the load actually succeeded. A failed load shows "Couldn't load your rounds" with a **Try again** button, and a 401 shows "You've been signed out" with **Sign in**; neither is ever presented as "No rounds yet" (BACKLOG #99)
- A single round whose stored data cannot be read is skipped with a quiet note ("1 round couldn't be shown."); it does not blank the rest of the list
- **Deleting a saved round** waits for the server: the buttons disable while it is in flight, and a failure keeps the round in the list and says so in the sheet. A 404 (already deleted elsewhere) counts as deleted

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

The contact address is `scorecard@outbuild.uk`, shown on both the privacy page and the information page (§4.8).

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
- **Course** — logged-in D1 rounds only, via the existing course selector (§11.7). For local/quick-play rounds the course is fixed and not editable in v1. **A round's hole count can't change during an edit:** the selector offers only courses with the round's own hole count (the round's current course always stays selectable), and a course created mid-edit is locked to that hole count (9 or 18). A round with any other hole count (e.g. a 36-hole no-course round) can therefore switch only among same-length courses and cannot create a new one during the edit. This prevents a stale-size grid where a longer round is switched onto a shorter course (BACKLOG #56).
- **This round's hole pars** — a **separate, distinct capability from editing the course itself (§11.7)** and from the "Course" field above. Applies to both round types (local/quick-play and logged-in D1). The user can correct the per-hole par values recorded on this one round (`games.hole_pars`, §11.3) — independent of, and without touching, the course's own par definition (`courses.hole_pars`). Editing a course's par (§11.7) is forward-looking only and never rewrites a round already saved against it; this field is how a user instead goes back and fixes the par on one specific already-played round. Uses the same −/+ stepper pattern (2–7 band) as the course par editor (§11.7), rendered for exactly the round's existing hole count — editing a round's par never changes `holes_played` and has no effect on totals, winner or DNF (par is display-only per §5). **On the edit screen this control must be presented as clearly separate from the course-name/course-selector control** — its own labelled section, not merged into or adjacent-looking to the course picker — so a user cannot confuse "I'm correcting this round's par" with "I'm changing which course this round is attached to".
- **The player roster** — adding and removing players. Originally deferred at v1 (see the superseded note below); now specified in full at §11.13.1 (BACKLOG #6).

**What is NOT editable (deferred — see BACKLOG.md):**
- Changing the course on a local/quick-play round.
- Holes played is not a directly editable field — it is derived from the edited scores (see recalculation below).

> **Superseded note:** v1 of this feature (29 August 2026) explicitly deferred adding/removing players — "v1 is renames and score changes only." That deferral is reversed by §11.13.1 below (BACKLOG #6, confirmed 18 September 2026). Left here for history rather than silently dropped, consistent with how this PRD documents other reversed decisions (e.g. §5.2, §11.15).

**Recalculation on save:**
- Winner, DNF status, and per-player totals are all recalculated from the edited scores, applying the same rules as finishing a game (§4.4, §5): a player who has not scored every hole is DNF and excluded from the winner calculation; the winner is the lowest total among those who finished; ties and all-DNF cases are handled exactly as in the normal finish flow and the share image (§4.7).

**Persistence and identity:**
- The round keeps its original identity — same row, same `id`. Only `id`, `client_round_id`, and `created_at` are guaranteed unchanged by an edit. `played_at` (the round date) may change because it is user-editable (see above); this is still a correction to an existing round, not a new round.
- Logged-in: a `PATCH` on `functions/api/games/[id].js` updates the existing row, gated by the session cookie and by ownership (the round must belong to the requesting user). Editable fields include `played_at`, `player_data` (a full replacement array — this is also how a changed roster is written, §11.13.1), `hole_pars` (the round-level par correction above), `notes` and `course_id`.
- Logged-out: an update path in `storage.js` overwrites the existing localStorage record in place, keyed on its existing id.
- A signed-in round that is still **pending** (never saved to D1, §11.8) has no D1 row to `PATCH`: editing it uses the local update path above, and the round stays pending (the edit does not mark it synced). The edited data is what later syncs.

**Sharing:** unchanged. After an edit is saved, the Summary view reflects the recalculated result and the existing Share button (§4.7) generates the share image from the updated data.

---

### 11.13.1 Adding and removing players during an edit

> **Status:** shipped 18 September 2026 (BACKLOG #6). Reverses the explicit v1 deferral in §11.13 ("Adding or removing players during an edit" was out of scope). Decisions below confirmed by the user on 18 September 2026.

Extends §11.13's edit capability to the player roster itself — not just names, scores, notes, course and par on the *existing* set of players. Applies to both round types (local/quick-play and logged-in D1), same as the rest of §11.13.

**No schema or API change required.** `functions/_lib/game-input.js`'s `validatePlayerData` already accepts any array of 1–12 valid player entries with no comparison against the original record's player count, and `PATCH /api/games/[id]` already writes whatever `player_data` it is given. This is frontend-only work: the edit-mode player-list step (`src/pages/Setup.jsx`) and the Scorecard grid rendering an added player's columns (`src/pages/Scorecard.jsx`).

**Adding a player:**
- Reuses the same "Add Player" control and name-entry UI as New Game setup (§4.2), including duplicate-name blocking against the other players already in the round.
- **Floors and caps at the same 1–6 band as New Game setup (§4.2)** — not the API's looser 12-player ceiling (`MAX_PLAYERS` in `game-input.js`), which exists as a backend safety limit, not a product-facing player count. The edit UI stays consistent with the one player-count range the product already exposes anywhere.
- **No backfill requirement.** A player added to a round that already has scores entered for earlier holes is not required to have those holes filled in before saving. Already-played holes simply stay unscored (—) for them; the user *may* fill them in retroactively if they know the scores, but nothing blocks saving if they don't.
- Consequence of no backfill: under the existing `calculateResult` rule (§4.4, §5) a player who hasn't filled every hole up to the round's furthest-played hole is DNF, not blocked from saving. A retroactively-added player who only has scores from the hole they joined onward will save as DNF for the round — an accepted, expected outcome of this capability, not an error state. No new DNF rule is introduced; this is the existing rule applied to a new way of reaching it.
- The added player's row renders in the edit-mode Scorecard grid exactly as any other player column — same width-sharing, same active-cell model, same empty (—) / scored states (§4.3) — across every hole row already shown.

**Removing a player:**
- Reuses the same "✕" remove control as New Game setup (§4.2) — an immediate action, no separate confirmation dialog beyond whatever the app already shows for a normal edit save.
- **No minimum-player floor beyond 1.** A user can remove players down to a single remaining player; the round simply becomes a solo round at that point. Removing the round's only player is not offered — the control's floor is 1, matching the same implicit floor as New Game setup's 1–6 range (§4.2).
- A round reduced to one player is a solo round under the existing rules with no special handling introduced here: winner and draw concepts do not apply, nothing is highlighted as a result on any screen (§4.4), and a solo round is never DNF once at least one hole is scored (§4.4).
- Removing a player who was the furthest-progressed player in the round can reduce the round's effective `holes_played` on save, same as any other score edit — covered by §11.13's existing "holes played is derived, not directly editable" rule; no new behaviour.

**Recalculation on save:** unchanged from §11.13 — winner, DNF status and per-player totals are recalculated from the edited roster and scores via the same `calculateResult` helper used everywhere else (§4.4, §5), which already returns no winner / `isDraw: false` for a roster under two players and already computes DNF per-player independent of how that player's row came to have gaps in it.

**Sharing:** unchanged. The share image (§4.7) already renders whatever player set and result shape `calculateResult` produces — a solo round (no result callout drawn) and a DNF player (marked DNF in the totals row) are both existing, tested paths, not new ones introduced by this capability.

**Out of scope for this capability:**
- No change to the 1–6 player range anywhere in the app (§4.2) — this only lets an *existing saved round's* roster move within that same range after the fact.
- No confirmation/warning dialog on removal beyond the existing save flow, per the user's explicit decision — removing a player down to a solo round carries no extra friction beyond what solo rounds already carry everywhere else in the app.
- No partial-backfill prompt or "fill in earlier holes?" nudge for an added player — DNF is an accepted, silent outcome, not a state the UI calls out or warns about.

---

### 11.14 User profile and account management

Lightweight profile data plus self-serve account controls for signed-in users. The backend (BACKLOG #3) and the Settings panel (BACKLOG #4) ship together on one branch. Signed-in identity in gameplay (BACKLOG #5) is a separate, later effort — specified in full at §11.15.

Requires migration `004_add_user_profile.sql` applied to production D1 before deploy.

**The `name` field**
- A single nullable `users.name` column (§11.3) — the user's own display name, 1–60 characters after trimming, empty clears to null.
- Set only via the Settings panel. There is no onboarding step and no prompt at sign-in (§7, §10). A user with no name is fully functional — `name` stays null.
- In v1 of this capability `name` is **not read anywhere** in gameplay, history or sharing. Pre-filling the user's own player slot and marking it with a star badge is BACKLOG #5 (§11.15) and out of scope here. §4.2's player-name entry and duplicate-name blocking are unchanged.

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
- **Quick-play localStorage history is deliberately left untouched** — it is device-local, was never tied to the account (§11.9), and the client does not clear it on account deletion. This includes any round still pending sync (§11.8): it stays on the device, but it is tagged with the deleted user's id, which no account can ever have again, so it never syncs and is not shown in any signed-in History; it remains visible in signed-out History as a local round.
- Irreversible: no soft-delete, no grace period, no export-first step.

**Settings panel (BACKLOG #4 — ships with this capability)**
- Entry point: a settings affordance on Home, shown only when signed in, paired with a clearer signed-in/signed-out indicator on Home. This delivers the indicator that §11.6 previously flagged as a backlog item. The signed-out Home is unchanged (§11.10).
- Contents: edit name (text field, 1–60, clear-to-empty allowed); change email (shows the current address; on submit, tells the user to check the new inbox and that the address changes only once confirmed; shows the pending address while `pending_email` is set); delete account.
- Delete account: a confirmation dialog matching `History.jsx`'s delete-round bottom sheet, plus the requirement to type `DELETE` to enable the destructive button. Copy states plainly that all rounds, courses and the account are removed, and that quick-play history on this device is not affected.

**Forward reference — signed-in identity in gameplay (BACKLOG #5): now specified in full at §11.15.** First-player-slot pre-fill on New Game, and a star badge marking the signed-in user's name wherever players are listed (name-match against this `name` field, computed live — no stored link, no onboarding prompt). No schema or API groundwork beyond the `name` column itself was needed.

---

### 11.15 Signed-in identity in gameplay

> **Status:** shipped 18 September 2026 (BACKLOG #5). This section supersedes the earlier forward-references in §8 and §11.14, which described a different mechanism (a one-time name prompt plus "primary" score styling) that was never built.
> **PRD alignment check (18 September 2026):** four deviations flagged by frontend-developer in handoff, resolved by product-owner — see the "Visual treatment" and "New Game pre-fill" notes below for the locked decisions. The follow-up (the star on the "Finish Game?" confirmation dialog) was built before merge.

Signed-in users get a lightweight way to see which scores in a round are theirs, without introducing a second identity system alongside player names.

**Identification mechanism — name match, not a stored link:**
- A player within a round is treated as "the signed-in user" whenever that player's name exactly equals the signed-in account's `users.name` value (§11.3, §11.14).
- This is computed live, from the two existing name strings, wherever players are rendered — there is no new `user_id`-per-player field, no change to `player_data`, and no games-API or schema change of any kind.
- Because it's a display-time comparison rather than a stored link, it works **retroactively** on rounds saved before this capability existed, and on any round where a player happens to be named to match — no backfill, no migration.
- The comparison: exact string match after trimming whitespace and case-folding (lower-casing) both sides — the same normalisation `findDuplicateIndices` already uses for the duplicate-name check at §4.2 (`src/utils/game.js`). This keeps the two name-comparison rules in the app consistent rather than introducing a second, stricter one.
- If `users.name` is null (never set), no player in any round ever matches — see "No onboarding prompt" below.

**Visual treatment — a star, not a primary/highlight style:**
- The matched player's name carries a small star icon/badge wherever players are listed **as a row in a structured, scannable roster** as part of a round: the live Scorecard grid (§4.3), the post-finish and read-only Summary player-totals table (§4.4, §11.9), History's per-round player rows, and History's player filter chips (§4.5, §11.9).
- This replaces the "styling the user's own score as primary" idea floated in the earlier §8/§11.14 forward-references — that approach (a bold/colour treatment implying visual hierarchy over guest players) was not built. The star is an identity marker only; it does not change score colour or weight, does not interact with the §5.3 vs-par colour system, and does not imply the signed-in player is more important than guests in the round.
- **Explicitly starred — the "Finish Game?" confirmation dialog (§4.4).** This sheet lists each player's name against their live total, in the same row-per-player shape as the Summary table it leads into a few seconds later — it is a structured roster, not a one-off sentence, and §5.3.2 already treats it as a first-class surface for the same score-to-par figure the star sits beside. Omitting the star here while showing it on Summary moments later would read as a bug, not a scope boundary. **This was not built in v1 and needs a small code change** (`src/pages/Scorecard.jsx`'s `showConfirm` dialog) to add it, matching the pattern already used in Summary's table row.
- **Explicitly not starred — prose result callouts that name a winner.** Summary's "Winner - [Name] - [X] strokes" / "Tied - [Name] & [Name] - [X] strokes" line (§4.4), and History's equivalent one-line result label per round (§4.5), do **not** carry the star, even when the named winner is the signed-in user. These are one-off announcement sentences, not a scannable list a player needs help finding their own row in — the star's job (help you spot your row among several) doesn't apply to a sentence that already names one or two people in full. It also avoids stacking two "this one's special" signals (the winner's accent-green treatment plus a star) on the exact moment a signed-in user wins, which sits closer to the "does not imply more important" line this section already draws. This was a deliberate reading by the developer, applied consistently in both Summary and History, and is confirmed correct — not left ambiguous for a future build to re-litigate.
- Exact icon, size and placement (inline after the name vs. a fixed-position badge) are a DESIGN.md / frontend-developer call, following the existing icon language. Built as `src/components/PlayerStar.jsx`, `w-2.5 h-2.5`, matching the existing external-link ↗ annotation size tier, and rendered in `currentColor` (see "Colour" below).
- The star does **not** appear on the share image (§4.7) in v1. The share image is a static export handed off outside the app via the OS share sheet, to a recipient who is not necessarily signed in and for whom "this is the app's current viewer" has no meaning. Omitting it is a deliberate scope decision, not an oversight.

**Colour — inherits, does not introduce a token:**
- `PlayerStar` carries no colour of its own; it renders in `currentColor` and inherits whatever colour its surrounding name already has (muted list text, the accent winner-name treatment, white-on-accent inside a filter chip). Confirmed correct and consistent with this section's "does not imply the signed-in player is more important than guests" requirement: a fixed accent/brand colour on the star would visually mark the signed-in player as special independent of context (bold even in a muted, non-winner row), which is exactly what this section rules out. This is a single-component styling decision within `PlayerStar.jsx`, not a new DESIGN.md token, so it did not need a design-director pass. Documented in DESIGN.md under "Icons".

**No onboarding prompt:**
- There is no blocking interstitial, inline nudge, or "set your name" prompt anywhere in this capability — not at sign-in, not on New Game, not the first time a round finishes without a star. This reverses the "one-time name prompt" idea in the earlier §8/§11.14 forward-references, which was never built.
- A signed-in user with no `users.name` set simply sees no star anywhere, indefinitely, until they choose to set a name from the Settings panel (§11.14). Setting a name is entirely self-directed and unrelated to this capability's own UI.

**New Game pre-fill (unchanged from the original backlog description):**
- On the Setup screen (§4.2), a signed-in user's `users.name` — if set — pre-fills the first player slot. Other player slots are unaffected and still default to empty/guest.
- If `users.name` is null, the first slot behaves exactly as it does today (empty, no pre-fill).
- The pre-filled name is editable like any other player-name field. A user can overwrite it for that round, in which case that round's first player simply won't match their account name and won't carry a star — nothing forces the first slot to stay "the signed-in player" once the round starts.
- **Also applies to Add Past Round.** The Setup screen is shared by New Game and Add Past Round (History's "+ Add" button, `pastRound: true`) — both present a fresh, unfilled player list rather than an existing round being edited, so the pre-fill applies to both. It does **not** apply when Setup is opened to edit an existing saved round (`editRound: true`) — there the player slots already hold real names being corrected, not fresh entries, and pre-filling over one would be a rename, not a default. The guard is "not an edit", not "New Game specifically."

**Known edge case — accepted, not solved:**
- Because matching is purely by name text, a guest player in a round can coincidentally (or deliberately) type the exact same name as the signed-in account holder and will also display the star, even though they are not that account. This is only possible when the actual account holder either isn't a player in that round, or is playing under a different name that round — §4.2's duplicate-name blocking already prevents two players sharing one name *within the same round*, so it cannot happen alongside the real account holder under the same name in the same round.
- This is an accepted limitation of the name-match approach, not a bug to fix now. A future `user_id`-per-player field (out of scope here) would be the way to close it if it ever becomes a real problem.

**Scope boundary:**
- This capability is display-only. It does not change scoring, totals, winner/DNF/draw logic (§5), sharing (§4.7), or any API contract. No schema change, no new environment variable.
- It reads `users.name`, already returned by `GET /api/auth/me` (§11.5) — no new endpoint required.

**Touchpoints:** §4.2 (Setup pre-fill, New Game and Add Past Round), §4.3 (live Scorecard star), §4.4 (Finish Game? confirmation dialog star — pending build; post-finish and read-only Summary table star, shipped; winner prose line — deliberately not starred), §11.9 (History player-row and filter-chip star, shipped; result-label line — deliberately not starred), §11.3/§11.14 (`users.name` source field).
