# Changelog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> Human-readable record of what shipped and why. One entry per notable change, newest first.
> Git history is the full record; this file is for context and decision rationale that commit messages don't carry.
> Update the date below whenever you add an entry.

**Last updated:** 1 September 2026

---

## 1 September 2026

- **Backlog bug-fix batch B.** Three fixes: opening `/scorecard` with no active game no longer throws a setState-during-render warning — the bounce-home guard moved into an effect (#17); browser Back out of an in-progress edit no longer strands a working copy behind a mislabelled "New Game" screen — Setup detects it, discards the abandoned edit, and routes to History (#18); inline text-link tap targets across Info, Login, Summary, the course-map modal and the rules content widened toward 44px via a documented `inline-block py-3 -my-3` hit-area pattern, and the modal close button taken from 32px to 44px (#28). Item #19 (past-round back button always targets History) reviewed and recommended for won't-fix — History is the right destination in every path.
- **Backlog housekeeping batch A.** Six small items cleared: removed the orphaned `Podium` screen (nothing navigated to it — finish goes straight to Summary), and its now-dead references in DESIGN.md/PRD.md (#20); extracted the Bruntsfield course name to `src/constants.js` (#26); widened the `PageHeader` title clearance and documented a title-length budget (#27); renamed the npm package to `scorecard-by-outbuild` (#30); updated the three `index.html` SEO/social meta tags to the current course name (#32); dropped the unused `game_name` field from the games PATCH handler (#24 — the rest of that dead plumbing is now #33).
- **Project docs simplified.** Retired `BUILDPLAN.md`, `BUILDPLAN-ARCHIVE.md`, and `ARCHIVE.md` — they had become a hand-maintained parallel copy of git history plus a status section that needed reconciling every session. Work is now tracked as a flat `BACKLOG.md` (open items only) plus this changelog. Session ritual lightened: the project-manager is no longer mandatory for small changes, and the review gate scales with change size (see CLAUDE.md).

## 29 August 2026

- **Edit a past round** (feature). An "Edit round" flow reachable from a round's detail view, for both signed-in (D1) rounds and logged-out quick-play (localStorage) rounds. Editing overwrites the existing record — no new row, no duplicate — and recalculates winner/DNF/totals. Editable: player names (rename only), per-hole scores, date, notes; course is editable for signed-in rounds only. Adding/removing players during an edit was deferred (BACKLOG). New `PATCH /api/games/:id` with session + row-ownership + course-ownership checks; `course_id` ownership validation also added to the existing `POST` at the same time.
- **Past-round detail view slimmed down.** When a round is opened from History, the detail screen now shows navigation chrome — back to the rounds list (top-left), Edit (top-right) — instead of a full-width "Done" button, with notes as small static text. Frees vertical space for the scorecard. The immediate post-finish screen (where "Done" performs the save) is unchanged.

## 24 August 2026

- **Hotfix — duplicate game rows in D1 (Scorecard Plus).** Signed-in users saw duplicate rows for the same round. Two causes: (1) the summary screen re-POSTed on every "Done" tap with no idempotency protection, and after browser back/forward it fell back to the most recent local game and re-submitted it; (2) more significantly, the summary screen is reused for viewing any past round from History, and "Done" (its only way back) re-POSTed that round as a new row on every visit. Fixed in three layers: client stops re-saving an already-synced or History-opened round; every `POST /api/games` carries a `client_round_id` idempotency key (the local round's own id); server dedups on `(user_id, client_round_id)` with a `UNIQUE` index as a backstop (migration `002`). An earlier `(user_id, played_at, holes_played)` fallback match was removed after review flagged it could drop a genuine second same-day round. Pre-existing duplicate rows in production were left for a separate cleanup (BACKLOG). Round `notes` not pre-filling on the detail screen was fixed in the same pass.

## 23 August 2026

- **Hotfix — production 308 redirect on deep links.** Direct navigation to routes like `/bruntsfield-short-course` returned a 308 to the domain root instead of loading the app. After extensive Cloudflare dashboard checks (DNS, redirect rules, page rules, bulk redirects, build config all confirmed correct), root cause was the enumerated per-route format in `public/_redirects`; fixed by switching to the standard Cloudflare Pages SPA wildcard (`/* /index.html 200`).
- **Hotfix — magic-link sign-in broken (regression from the redirect fix).** The `_redirects` wildcard also intercepted `/api/auth/request-link` before it reached the Pages Function. Fixed by adding `public/_routes.json` scoping Functions to `/api/*`. Lesson: verify adjacent functionality (especially `/api/*`) when changing hosting/routing config.

## July – August 2026 — Phase 4: Scorecard Plus (v2.0)

Signed-in accounts on top of the original quick-play app. Cloudflare D1 database + schema, Pages Functions API, magic-link auth (Resend), session middleware, auth UI, Scorecard Plus branding, user-created courses and course selection, save games to D1 when signed in, signed-in history view.

- **Wave 5 — generic home + course page refactor.** Renamed "Bruntsfield Links" to "Bruntsfield Short Hole Golf Course"; generic home screen with a dedicated `/bruntsfield-short-course` page; rules content update and context-aware setup/scorecard flow.
- **Wave 6 — user feedback batch (partial).** UI feedback pass (sign-in and scorecard polish, GDPR statement on the Info page); fixed a bug where resetting the hole count hid later scored holes. Remaining Wave 6 items (course-map reliability, sign-in email branding, user profile/settings, signed-in identity in gameplay) are open in `BACKLOG.md`.

## July 2026 — Wave 2

Golf Tavern → Bruntsfield copy fix; 14-stroke cap per hole; restore exact game state on app reopen; optional game naming; Information page; course rules screen.

## July 2026 — v1 (original quick-play app)

Local, no-account scorecard for the Bruntsfield short course. Home screen, new-game setup, live scorecard with auto-save, game summary, history with per-player filter and averages, podium screen, course map modal, branded PNG share via the native share sheet, Outbuild attribution. Vite + React + Tailwind, localStorage only, deployed on Cloudflare Pages.
