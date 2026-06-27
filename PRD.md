# Product Requirements Document
## The Golf Tavern — Bruntsfield Links Scorecard App

**Version:** 1.2 (MVP)
**Last updated:** June 2026

---

## 1. Goal

An official Golf Tavern web app that lets anyone create and track a golf scorecard for Bruntsfield Links — no login required, as few taps as possible, designed to feel like a physical scorecard on your phone. Built for use on the course, in the sun, by anyone.

---

## 2. Brand

- **Product of:** The Golf Tavern, Edinburgh — est. 1456
- **Built by:** Outbuild (design agency)
- **Tone:** Historic, warm, Scottish — rooted in place. Heritage pub meets classic golf club. Not corporate, not generic.
- **Course:** Bruntsfield Links — one of Scotland's oldest public golf courses, on the doorstep of The Golf Tavern

### Visual direction
The Golf Tavern's brand uses a dark, moody palette — deep charcoal backgrounds, cream/ivory script logotype, terracotta/rust accents, all-caps spaced serif supporting text.

For the scorecard app, this palette is **flipped for outdoor sunlight legibility:**
- **Background:** Cream / ivory (warm, not clinical white)
- **Primary text:** Deep charcoal / near-black
- **Accent:** Terracotta / rust (matching the Golf Tavern "Book Now" / "Est 1456" tone)
- **Typography:** Script display font for headings/logo (matching Golf Tavern logotype feel); clean spaced all-caps serif or sans for UI labels and data
- **Texture:** Subtle and warm — not flat and generic
- **Overall feel:** Same brand DNA as the Golf Tavern site — inverted for readability on a phone in daylight

---

## 3. Users

- Golfers playing Bruntsfield Links
- Primarily a known group of friends to start — designed to scale to any visitor
- No accounts, no authentication
- Accessed via mobile browser on the course

---

## 4. Core features

### 4.1 Home screen
- Two options only: **New Game** and **History**
- The Golf Tavern branding and Bruntsfield Links name displayed prominently
- If a game is currently in progress (auto-saved), a **Resume Game** prompt appears between the two buttons

### 4.2 Start a new game
- User taps **New Game**
- Selects number of players (1–4)
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
  - Large **−** button · large **+** button · **→** advance button — all right-aligned
  - A hole score has two states: **empty (—)** and **scored (1 or above)** — there is no zero
  - Tapping **+** on an empty cell sets it to 1; tapping **+** on a scored cell increments by 1
  - Tapping **−** on a cell showing 1 returns it to empty (—); tapping **−** on a cell showing 2+ decrements by 1
  - The **−** button is visually disabled when the active cell is empty
  - No maximum
  - The **→** button advances focus to the next player on the same hole, or the next hole's first player
- Running totals shown above the control bar, always visible
- Progress is **auto-saved to local storage continuously** — closing and reopening the browser resumes exactly where you left off

### 4.4 Finishing a game
- User taps **Finish Game**
- A **confirmation dialog** appears — user must confirm before the game ends (prevents accidental taps)
- Final scores shown in a summary view (all players, all holes, totals)
- **Players who did not complete all holes are excluded from the winner calculation** — marked as DNF
- Winner = player with the lowest total among those who finished
- Completed game saved to local browser storage with:
  - Date and time
  - Player names and scores per hole
  - Number of holes played
  - DNF status where applicable

### 4.5 Game history
- Accessible from the home screen via **History**
- Lists all previously saved games, each showing: date, players, number of holes, winner
- Tapping a game shows the full scorecard for that game
- Tapping a player name filters to all games that player has appeared in

### 4.6 Player profiles (lightweight)
- Name-based recall only — not a login system
- Previously used names suggested when starting a new game
- Tapping a name in History filters to that player's game history
- Stored entirely in local browser storage (no database in MVP)
- History is device-specific — known MVP limitation, resolved when database is added post-MVP

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
- Up to **24 holes**
- UI includes a **"More courses coming soon"** placeholder where course selection will eventually live
- No hole-level metadata (no par, no yardage, no difficulty rating) in MVP

---

## 7. Out of scope (MVP)

- User accounts or authentication
- Multiple courses / course selection
- Par values or handicap calculations
- Leaderboards or social features
- Push notifications
- Native mobile app (web only)
- Backend database (local storage only for MVP)
- Admin tools or course management
- Cross-device history sync

---

## 8. Future considerations (post-MVP)

- Database-backed storage so history persists across devices and browsers
- Course selection (add more courses, or allow custom course names)
- Player profiles backed by accounts (optional login)
- Par values and scoring modes (stableford, etc.)
- Potential Golf Tavern integrations (e.g. booking, offers)

---

## 9. Success metrics (MVP)

- Any golfer at Bruntsfield Links can pick it up and use it without explanation
- A group can complete a full round and save it without confusion
- Returning users can see their previous games on the same device
- Closing and reopening the browser mid-round resumes the game correctly
- Feels like a Golf Tavern product — not a generic app

---

## 10. Design principles

- **Mobile-first** — designed for use on a phone, on a golf course, in sunlight
- **Light and legible** — high contrast, readable outdoors; aesthetics serve usability
- **Fewest taps possible** — every interaction obvious and minimal
- **Physical scorecard feel** — familiar grid layout, nothing unfamiliar
- **Golf Tavern character** — traditional, warm, Scottish — not generic or corporate
- **No friction** — no login, no setup, no onboarding required
