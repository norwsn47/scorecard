# Backlog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> Open items only — ideas, deferred work, and known issues not yet done.
> When something ships, delete its line and add a note to `CHANGELOG.md`.
> Nothing here is actioned without explicit instruction — tell the project-manager (or Claude directly) to pull an item into work.
> Numbers are stable IDs for cross-reference — don't renumber existing items when deleting one, so gaps are expected.

**Last updated:** 3 September 2026

Shipped and removed: 1 Sep — batch A (20, 24, 26, 27, 30, 32), batch B (17, 18, 28), batch C (2 code part / see 2b, 29, 33); 2 Sep — 21 (ESLint), 36 (ties → draw), 37 (per-hole par); 3 Sep — 47 (new game landed on wrong hole), 48/49/50/55 (par UI rework + 9/18 course length). See `CHANGELOG.md`.

Items 36-44 added 1 September 2026 from a golf-feedback list. **36 (ties → draw) and 37 (per-hole par) shipped 2 September** — see `CHANGELOG.md`; both unblock 38 and 39. 40 still needs a product-owner PRD decision before build; 42 (Google sign-in) moved to Blocked on 3 September — it needs an external Google Cloud OAuth client set up first.

Items 47-55 added 2 September 2026 from a ties+par testing-feedback list, after 36/37 shipped. **47, 48, 49, 50 and 55 shipped 3 September** — see `CHANGELOG.md`. 52 still changes PRD-described behaviour and needs a product-owner PRD update before build; 54 needs a build-vs-admin decision first. Item 10 of that list was folded into #39. Items 56-58 added 3 September 2026 from the #48–#55 code review. #60 added 3 September 2026 (split from the closed #59, the PRD as-built pass).

---

## Features not yet built

### 1. Course map reliability
Two parts, from the July 2026 feedback list. **A previous implementation attempt was flagged wrong by the user and reverted — needs a fresh approach before restarting.**
- The map button in `Scorecard.jsx` only renders when a game was started from the `/bruntsfield-short-course` route. A user who starts from the generic home "New Game", or a signed-in user who picks Bruntsfield from the course selector, never sees it. Show the button whenever the active game's course is Bruntsfield (by course name/id, not by navigation route). Note: this reverses a deliberate Wave 5 scoping decision.
- `CourseMapModal.jsx` shows no loading state — add an instant placeholder/spinner, replaced on the image's `onLoad` (or an error state).

### 2b. Sign-in email — inbox sender name (manual, not code)
The email copy/wordmark now read "Scorecard by Outbuild" (shipped 1 Sep). Remaining: the inbox *sender name* is set by the `RESEND_FROM_EMAIL` env var format — set it to a `Scorecard by Outbuild <address>` display-name format via the Cloudflare Pages dashboard (Settings → Environment variables). No code.

### 3. User profile foundation (backend)
Groundwork for name capture and account settings. Touches auth data — confirm before starting.
- Add a nullable `name` column to `users` (D1 migration).
- Extend `GET /api/auth/me` to return `name`.
- `PATCH /api/users` — update name and/or email for the current session's user. Open decision: does an email change require re-verification via magic link, or take effect immediately?
- `DELETE /api/users` — delete the current user's account, send a notification email to williamadamgriffiths@gmail.com via Resend, clear the session.

### 4. Settings panel (UI)
Depends on #3.
- Settings (gear) icon on Home, visible only when signed in. Pair with a clearer signed-in vs signed-out indicator on Home.
- Settings screen: edit name, update email, delete account (confirmation dialog matching the delete-round pattern in `History.jsx`).

### 5. Signed-in identity in gameplay
Depends on #3, #4.
- When a signed-in user has no name yet, prompt once (lightweight inline prompt, not a full onboarding flow) or direct them to Settings.
- Pre-fill the first player slot with the user's own name on New Game; other players stay "guest".
- Highlight the user's own score as primary in the scorecard, summary, and history views; guest scores stay visually secondary. (This is the "own player" handling the past-round edit view currently defers.)

### 6. Add / remove players during a past-round edit
Deferred from the edit-past-round feature. v1 lets you edit a saved round's date, names, scores, notes, and (signed-in only) course — but not the set of players. Follow-up: allow adding a player (with a full set of hole scores) and removing one, then recalculating winner/DNF/totals. Needs decisions on: what removing a player does to a round left with one player, and how the grid handles a newly added player's empty columns. (PRD §11.13.)

### 7. Course leaderboard — top rounds recorded on a course
A screen that picks a course and shows the best (lowest) rounds recorded on it. Drawn **only from signed-in users' D1 entries** — quick-play localStorage rounds never feed it. Scope to settle when built: which courses are selectable (the user's own courses, the seeded Bruntsfield, or any course with entries), whether it ranks whole-round totals or per-player rounds within a game, how ties and DNF rounds are treated, and how many rows to show. Requires the database, so signed-in only. Post-MVP. **PRD §8 update needed** — it currently frames this as an "all-time personal leaderboard per user" (lowest round, most wins); the new shape is per-course, not per-user.

### 8. Quick-play history import after sign-in
Offer a one-time prompt after first sign-in to migrate localStorage game history into the new account (`POST` each local game with a migrated flag). Deferred because the two histories are deliberately separate in v2.0 (PRD §11.9) and this adds complexity without blocking the core Plus experience.

### 9. Magic link resend
A "Resend link" button on the post-send confirmation screen. Currently a missed email means starting over. Needs throttling. (PRD §11.4.)

### 10. Full onboarding journey (name + home course + par)
A proper sign-up flow capturing name and home course together, with editable per-hole par. Introduces par as a first-class concept — currently explicitly out of scope for MVP and v2.0 (PRD §7). Materially bigger than the lightweight name capture in #5; needs a decision on how par interacts with the raw-stroke scoring model (PRD §5) before any code.

### 11. Multi-course architecture
The architecture for properly supporting multiple courses, beyond the current v2.0 model where a signed-in user's "course" is a name string with a default hole count (PRD §11.7). Would cover structured per-course data (holes, par), how quick-play coexists with it, and whether system-provided courses become browsable. Planning item, not a single chunk — revisit once real usage shows users creating multiple distinct courses.

### 38. Score-against-par indicator while entering scores
With par now shipped (#37 — `hole_pars` on the game, `scoreToPar()` helper already in `src/utils/scores.js`), show each entered score's result vs par — a small superscript / bracketed `+1` / `-1` / `E` next to the number in the scorecard grid, live as it's entered. Also a candidate for the read-only Summary scorecard. **Unblocked.**

### 39. End-of-round tally: eagles / birdies / bogeys / double-bogeys
On finishing a round, count and show per player how many holes they scored eagle (−2), birdie (−1), par (E), bogey (+1) and double-bogey-or-worse (+2+) — a small block on the finish/Summary screen and a candidate for the share image. Uses `scoreToPar()` + the round's `hole_pars` snapshot (#37, **unblocked**). Decide exact buckets and labels with the product-owner (the user's terms were "eagles, biggies, double biggies"). 2 Sep testing feedback: the user wants birdies/eagles/bogeys called out **in the final scorecard outline** specifically — treat that as the primary surface.

### 40. Optional match-play game mode (win each hole)
A game-mode toggle at setup: **stroke play** (current — lowest total wins) or **match play** (win the most holes; each hole won by the lowest score, halved on a tie). Changes the winner calculation, the Summary, and the share image. Explicitly flagged by the user as a future edition. PRD §5 change needed.

### 52. Total vs par on every scorecard + a design principle for it
Under each player's total, in brackets, show their **score-to-par for the round** (e.g. `41 (+5)` / `38 (E)` / `35 (-3)`) — sum of `scoreToPar(score, par)` over played holes. Surfaces: the live `Scorecard.jsx` totals bar, the read-only `Summary.jsx` table, **and the "Finish game?" confirmation dialog**. Overlaps #38 (per-hole indicator) — same `scoreToPar` helper and `hole_pars` data; decide whether to build together. **PRD update needed** — §5.1 currently scopes par display to "a raised (N) next to the hole number" only. Also: establish a documented **standard for how score + par render together** (colour for under/over/level, `(+N)` / `(E)` / `(-N)` notation, placement) so #38, #39, #48 and this all match — belongs with #44 (design-system).

### 54. Let existing users set par on courses they already created
Courses created before migration `003` have `hole_pars = NULL` (read as all-3s). Real users need a way to set true pars. Two routes: (a) a **course-edit flow** (there is no edit-course UI today — new screen, `PATCH /api/courses/[id]` which doesn't exist), or (b) a **one-off admin backfill** (the user offered to force it as admin). Decide which before scoping. If (a), it likely wants the #50 stepper UI reused — **that stepper now exists** (`Setup.jsx`, `stepPar` + the two-column per-hole par list, shipped 3 Sep with #50) and is ready to lift into a course-edit screen.

---

## Blocked / waiting on something external

### 42. "Sign in with Google" (OAuth)
Add Google as a sign-in option alongside the magic link (PRD §11.4 is currently magic-link-only). Needs: an OAuth client created in the Google Cloud console (external, hence blocked), the redirect/callback Pages Function, and a decision on account linking — a user who has signed in by magic link and then uses Google with the same email address should land on the same account, not a duplicate. PRD §11.4 change needed. Assistance requested — unblock by setting up the Google Cloud OAuth client and confirming the account-linking behaviour.

### 12. Contact email — decide the final address and whether Info needs a link
The placeholder gmail is already gone: `Privacy.jsx` uses `scorecard@outbuild.uk`, and the Info page (PRD §4.8) currently has no contact `mailto:` at all. Decide whether the Info page should carry a contact link, and confirm `scorecard@outbuild.uk` is the address to standardise on (PRD §4.8 and earlier notes assumed `hello@outbuild.co`). Align both pages and the PRD once decided.

### 13. Official Bruntsfield logo
Add the club's official logo (likely Home or the course info section) once permission to use it is obtained.

---

## Known issues

### 14. No rate limiting on `POST /api/auth/request-link`
No per-email or per-IP rate limiting, so a target address could be flooded with magic-link emails. Evaluate Cloudflare Workers' built-in Rate Limiting API first. (PRD §11.4.) Medium priority — address before significant user numbers.

### 15. `magic_tokens` table never cleaned up
Used/expired magic tokens are never deleted, so email addresses from abandoned sign-in attempts accumulate indefinitely — inconsistent with GDPR data-minimisation. Add a scheduled Worker (or a cleanup step in `verify.js`) that deletes rows older than 24 hours. All tokens expire after 15 minutes and are marked `used` after verification. (PRD §11.12.) Medium priority.

### 16. Pre-existing duplicate game rows in production D1
The 24 Aug hotfix (live since 24 August 2026) stopped new duplicates but didn't touch rows already duplicated before it shipped. Identify and remove them via the Cloudflare D1 console — group by `user_id, played_at, holes_played` looking for counts > 1 (all predate `client_round_id` so all have it `NULL`). Check for other affected users too. Close this once the cleanup has been run.

### 19. Past-round "← Rounds" back button always targets History
Superseded by #43 (proper back-a-step navigation across all pages). The narrow "always targets History" concern is fine on its own (History is the right destination for that view) — the real ask is the app-wide one in #43.

### 47b. Scope the active cell to a game id (follow-up from #47)
#47 shipped a fix that clears `gt_active_cell` whenever a new working game is created and only restores it on a paramless Scorecard mount. The more robust design is to store the active cell as `{gameId, holeIndex, playerIndex}` and ignore it whenever `gameId` doesn't match the active game — removes the whole class of stale-cell bugs rather than patching the known entry points. Small refactor to `storage.js` + `Scorecard.jsx`; not urgent now that #47 is fixed.

### 56. Length-changing course switch during a D1 past-round edit leaves a stale-size grid
Surfaced in the #48–#55 code review. `buildEditGame` sizes the edit grid to the *round's saved* hole count, not the newly-selected course's. Switching a 36-hole round onto a 9-hole course mid-edit (D1 rounds only — local rounds can't change course) leaves a 36-row grid with holes 10–36 padded back to par 3. No crash, no data loss, but confusing. Needs a product decision: disallow a length-changing course switch during an edit, or accept it and document the behaviour. (PRD §11.7, §11.13.)

### 51. History player filter isn't discoverable
The History screen lets you filter by player (tap a name) but there's no visual affordance for it. Make it look like the existing course filter and sit directly below it. `History.jsx` — the filter row(s) above the round list.

### 53. Label the note on a viewed historic round
On the past-round `Summary.jsx` view the saved note renders as bare static text with no indication it's a note. Add a simple label — "Notes:" (or a small heading) before the note body. `Summary.jsx`, the `viewingSaved` note block.

### 43. Proper "back a step" navigation on every page
The router is a state machine with light URL sync (`App.jsx`). Back buttons currently navigate to a hard-coded parent (`navigate('home')` or a `from` param), so from a deep screen the user often jumps straight to Home instead of retracing one step. Give every non-Home screen a visible back affordance that goes **back one step** in the actual navigation history (a small nav stack, or lean on `window.history.back()` where the pushState history is reliable), with a sensible fallback when there's no prior entry. Absorbs #19. Check interaction with the popstate-clears-params behaviour and the edit-flow guards (#18).

---

## Housekeeping & tech debt

### 22. No flow test for the edit-past-round path
No integration/component test covers open-edit → change on the scorecard → save back. The duplicate-save regression class isn't protected by an automated flow test. Add one asserting a single record in/out (no new row) for both the D1 and localStorage paths.

### 23. `onRequestPatch` / `onRequestPost` input validation is minimal
`played_at` accepts any non-empty string (no date-format check); `player_data` is only checked for being a non-empty array (element shape not validated). Both client-controlled and consistent with each other, but both would benefit from stricter schema validation.

### 25. Crisper course map image
`public/course_map_v2.png` lacks sharpness when zoomed on high-res screens. Replace with a higher-resolution source, or SVG/vector if the course can provide one. (Distinct from #1, which is about when the map appears and its loading state.)

### 31. Set up analytics
The user wants **Google Analytics (GA4)** specifically (assistance requested). Scaffolding is already in place for a different tool: `src/utils/analytics.js` (a Plausible `window.plausible?.(...)` wrapper) and events instrumented — New Game Started, Game Completed (player count, holes), Scorecard Shared, Game Edited. Open:
- **Decision / conflict to resolve first:** GA4 sets cookies and, under UK PECR + UK GDPR, generally needs a consent banner — which the app has deliberately avoided. The current "Your data" privacy page and `Info.jsx` both state there is no tracking or analytics (PRD §4.8 now just links to that page). Either (a) accept a consent banner + rewrite the privacy page / Info copy and the PRD, or (b) use GA in a cookieless/consent-exempt configuration, or (c) reconsider a cookieless tool (Plausible/Fathom) that needs no banner. Product-owner call.
- Wire the chosen tool: swap `analytics.js` to the GA `gtag` API (or keep Plausible), add the script to `index.html`, create the account.
- Confirm Cloudflare Pages built-in analytics are active for basic traffic data.
- Update the Info page + Privacy page copy and PRD §4.8 to state exactly what is collected and by whom.

### 60. Product-owner pass over §4.8 and its overlap with the privacy page
Split out from the old #59. §4.8 (Information page) and §11.12 / the "Your data" privacy page (`Privacy.jsx`) describe overlapping things — what the info page contains, what the privacy page contains, where the data explanation lives. The 3 Sep cleanup made both accurate individually but the split between them is implicit. A proper product-owner pass would make §4.8 and §11.12 explicitly complementary. Low priority — both are accurate as they stand.

### 34. `text-xs` inline links land ~36-38px, below the ~40px floor
From the batch-B tap-target pass (#28). Three inline-in-paragraph `text-xs` links — `Login.jsx` "How we handle your data", `Info.jsx` "Read our privacy policy", `Summary.jsx` "Share scorecard" — use `py-2.5 -my-2.5` (~36-38px) because more padding would overlap adjacent lines. Better than the bare ~16px but under the documented floor. Revisit if a cleaner pattern turns up (e.g. giving them their own line).

### 35. No render/flow tests for the SPA navigation behaviours
The suite covers `src/utils/*` and `functions/api/*` only. The batch-B fixes (#17 direct `/scorecard` bounce, #18 stranded-edit cleanup) and the edit flow (existing #22) have no automated coverage. One follow-up item to add a component/render test harness (React Testing Library) and cover these.

### 41. Page load performance pass
Measure and tune actual load performance — Core Web Vitals (LCP, CLS, INP), bundle size (currently ~248 kB / ~76 kB gzip), font loading (three families via Google Fonts with `display=swap`), image weight (`course_map_v2.png` is ~455 kB), and Cloudflare Pages caching headers. Establish a baseline, fix the obvious wins, re-measure. Assistance requested. (The `performance-auditor` agent covers this.)

### 45. Dependency audit — update the build/dev toolchain
`npm audit` (first run 2 Sep, surfaced during #21) reports 5 vulnerabilities in the **pre-existing** toolchain, not from ESLint: `browserslist`, `nanoid`, `postcss` (all fixable with a non-breaking `npm audit fix`); `esbuild` ≤0.24.2 → the dev server can be probed by any website (moderate, dev-only), fixable only by a Vite major bump. Do a deliberate `npm audit fix` for the three easy ones, then evaluate the Vite/esbuild upgrade separately (breaking). Not urgent — none affect the production bundle's runtime.

### 46. `POST /api/games` doesn't validate `holes_played` type/range
`onRequestPost` only truthy-checks `holes_played`; the PATCH handler validates integer 1..36. A malformed `holes_played` on a create still inserts. Surfaced during the #37 chunk-3 review. Align POST with PATCH.

### 57. Hole-count picker uses `aria-pressed` rather than a radiogroup
Surfaced in the #48–#55 code review. The 9 / 18 hole-count picker in course creation (`Setup.jsx`) is two buttons with `aria-pressed`. For a single-select control, `role="radio"` + `aria-checked` inside a `role="radiogroup"` would be more accurate. Low priority — consistent with the prior toggle pattern in the app; revisit alongside #44 (design-system) if a shared toggle primitive is introduced.

### 58. No render/interaction test for the par stepper or the new par markup
Surfaced in the #48–#55 code review. The par stepper's 2–7 clamp (`Setup.jsx`, `stepPar`) and the bold-number + bracketed-par markup on `Scorecard.jsx` / `Summary.jsx` have no render/interaction coverage — the suite still tests `src/utils/*` and `functions/api/*` only. Ties into #35 (add a React Testing Library render-test harness); fold in when that lands.

### 44. Design-system consolidation + page/header templates
DESIGN.md has component patterns but no formal system. The user wants: a mobile header review (spacing and sizing rules — `PageHeader` `pt-10 pb-4`, `px-20` title clearance, the Summary bespoke header, etc.), documented design-system rules for the app, and page/header templates so new screens are built to a pattern rather than ad hoc. Design-director work; produces an expanded DESIGN.md (tokens → components → page templates → header rules) plus, ideally, a shared layout/header primitive the pages compose. Related: #27 (closed — PageHeader clearance), #34 (tap-target floor), the DESIGN.md "Inline link tap targets" and "Navigation" sections.
