# Backlog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> Open items only — ideas, deferred work, and known issues not yet done.
> When something ships, delete its line and add a note to `CHANGELOG.md`.
> Nothing here is actioned without explicit instruction — tell the project-manager (or Claude directly) to pull an item into work.
> Numbers are stable IDs for cross-reference — don't renumber existing items when deleting one, so gaps are expected.

**Last updated:** 2 September 2026

Shipped and removed: 1 Sep — batch A (20, 24, 26, 27, 30, 32), batch B (17, 18, 28), batch C (2 code part / see 2b, 29, 33); 2 Sep — 21 (ESLint). See `CHANGELOG.md`.

Items 36-44 added 1 September 2026 from a golf-feedback list. Several (36, 37, 38, 39, 40, 42) change what the PRD currently specifies (winner calc, par explicitly out of scope, magic-link-only auth) — each needs a product-owner PRD decision before it can be built.

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

### 7. All-time leaderboard
A screen showing records across all games — lowest round, most wins per player, etc. Requires the database (so signed-in only). Post-MVP. (PRD §8.)

### 8. Quick-play history import after sign-in
Offer a one-time prompt after first sign-in to migrate localStorage game history into the new account (`POST` each local game with a migrated flag). Deferred because the two histories are deliberately separate in v2.0 (PRD §11.9) and this adds complexity without blocking the core Plus experience.

### 9. Magic link resend
A "Resend link" button on the post-send confirmation screen. Currently a missed email means starting over. Needs throttling. (PRD §11.4.)

### 10. Full onboarding journey (name + home course + par)
A proper sign-up flow capturing name and home course together, with editable per-hole par. Introduces par as a first-class concept — currently explicitly out of scope for MVP and v2.0 (PRD §7). Materially bigger than the lightweight name capture in #5; needs a decision on how par interacts with the raw-stroke scoring model (PRD §5) before any code.

### 11. Multi-course architecture
The architecture for properly supporting multiple courses, beyond the current v2.0 model where a signed-in user's "course" is a name string with a default hole count (PRD §11.7). Would cover structured per-course data (holes, par), how quick-play coexists with it, and whether system-provided courses become browsable. Planning item, not a single chunk — revisit once real usage shows users creating multiple distinct courses.

### 36. Ties count as joint first (draw)
Currently `calculateResult` / `normalizeDbGame` pick a single lowest-total finisher as the winner (PRD §4.4: "Winner = player with the lowest total among those who finished"). When two or more finishers share the lowest total they should be **joint first — a draw**, shown as such on the Summary, Podium-less finish, History card and share image. Apply retrospectively: the winner is recomputed client-side from `player_data` on every History load, so a D1 round updates on next view; localStorage rounds store `game.winner` and would need a one-time re-derivation on read (or a migration). PRD §4.4 / §5 change needed.

### 37. Par as a first-class concept — set per course, shown while scoring
When creating a course, let the user enter par (per hole, or a single value applied to every hole; default 3). Store it on the course record. While entering scores, show each hole's par. This is the enabling work for #38, #39 and part of #10; relates to #11 (structured per-course data). PRD currently lists par as explicitly out of scope for MVP and v2.0 (§7) — needs a product-owner decision on how par sits alongside the raw-stroke model (§5) before building. Quick-play (Bruntsfield) can assume par 3 for all 36 holes.

### 38. Score-against-par indicator while entering scores
With par available (#37), show each entered score's result vs par — e.g. a small superscript or bracketed `+1` / `-1` / `E` next to the number in the scorecard grid. Live as the score is entered. Depends on #37.

### 39. End-of-round tally: eagles / birdies / bogeys / double-bogeys
On finishing a round, count and show per player how many holes they scored eagle (−2), birdie (−1), par (E), bogey (+1) and double-bogey-or-worse (+2+) — a small summary block on the finish/Summary screen and a candidate for the share image. Depends on #37. Decide exact buckets and labels with the product-owner (the user's terms were "eagles, biggies, double biggies").

### 40. Optional match-play game mode (win each hole)
A game-mode toggle at setup: **stroke play** (current — lowest total wins) or **match play** (win the most holes; each hole won by the lowest score, halved on a tie). Changes the winner calculation, the Summary, and the share image. Explicitly flagged by the user as a future edition. PRD §5 change needed.

### 42. "Sign in with Google" (OAuth)
Add Google as a sign-in option alongside the magic link (PRD §11.4 is currently magic-link-only). Needs: an OAuth client (Google Cloud console), the redirect/callback Pages Function, and a decision on account linking — a user who has signed in by magic link and then uses Google with the same email address should land on the same account, not a duplicate. PRD §11.4 change needed. Assistance requested.

---

## Blocked / waiting on something external

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
- **Decision / conflict to resolve first:** GA4 sets cookies and, under UK PECR + UK GDPR, generally needs a consent banner — which the app has deliberately avoided, and PRD §4.8 currently tells users "No tracking, no analytics, and no third-party services". Either (a) accept a consent banner + rewrite the Info/Privacy copy and PRD §4.8/§4.5, or (b) use GA in a cookieless/consent-exempt configuration, or (c) reconsider a cookieless tool (Plausible/Fathom) that needs no banner. Product-owner call.
- Wire the chosen tool: swap `analytics.js` to the GA `gtag` API (or keep Plausible), add the script to `index.html`, create the account.
- Confirm Cloudflare Pages built-in analytics are active for basic traffic data.
- Update the Info page + Privacy page copy and PRD §4.8/§4.5 to state exactly what is collected and by whom.

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

### 44. Design-system consolidation + page/header templates
DESIGN.md has component patterns but no formal system. The user wants: a mobile header review (spacing and sizing rules — `PageHeader` `pt-10 pb-4`, `px-20` title clearance, the Summary bespoke header, etc.), documented design-system rules for the app, and page/header templates so new screens are built to a pattern rather than ad hoc. Design-director work; produces an expanded DESIGN.md (tokens → components → page templates → header rules) plus, ideally, a shared layout/header primitive the pages compose. Related: #27 (closed — PageHeader clearance), #34 (tap-target floor), the DESIGN.md "Inline link tap targets" and "Navigation" sections.
