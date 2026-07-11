# Product Requirements Document
## Scorecard by Outbuild — Bruntsfield Links

**Version:** 1.4 (MVP)
**Last updated:** 8 July 2026

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
- Up to **36 holes**
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
- Feels like a Scorecard by Outbuild product — not a generic app

---

## 10. Design principles

- **Mobile-first** — designed for use on a phone, on a golf course, in sunlight
- **Light and legible** — high contrast, readable outdoors; aesthetics serve usability
- **Fewest taps possible** — every interaction obvious and minimal
- **Physical scorecard feel** — familiar grid layout, nothing unfamiliar
- **Outbuild character** — restrained, warm, Scottish — not generic or corporate
- **No friction** — no login, no setup, no onboarding required
