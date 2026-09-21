# Backlog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> A to-do list, so nothing gets forgotten. Open items only.
> - **Removing:** whoever finishes an item deletes its line in the same commit as the change (the project-manager for large changes, the main session for small ones). Add a `CHANGELOG.md` note only if it was a decision or a reversal.
> - **Adding:** you ask; the project-manager adds genuine follow-ups from a large change; Critical/High review and audit findings are added. Lower findings stay in the chat report until you triage them.
> - **Entries are short:** what needs doing, not the history. Nothing here is actioned without explicit instruction.
> - **IDs are stable and never reused**, even after an item is deleted, so gaps are expected. Next free ID: **#118**.

**Last updated:** 21 September 2026

---

## Features not yet built

### 2b. Sign-in email — inbox sender name (manual, not code)
The email copy/wordmark now read "Scorecard by Outbuild" (shipped 1 Sep). Remaining: the inbox *sender name* is set by the `RESEND_FROM_EMAIL` env var format — set it to a `Scorecard by Outbuild <address>` display-name format via the Cloudflare Pages dashboard (Settings → Environment variables). No code.

### 7. Course leaderboard — top rounds recorded on a course
A screen that picks a course and shows the best (lowest) rounds recorded on it. Drawn **only from signed-in users' D1 entries** — quick-play localStorage rounds never feed it. Scope to settle when built: which courses are selectable (the user's own courses, the seeded Bruntsfield, or any course with entries), whether it ranks whole-round totals or per-player rounds within a game, how ties and DNF rounds are treated, and how many rows to show. Requires the database, so signed-in only. Post-MVP. **PRD §8 update needed** — it currently frames this as an "all-time personal leaderboard per user" (lowest round, most wins); the new shape is per-course, not per-user.

### 8. Quick-play history import after sign-in
Offer a one-time prompt after first sign-in to migrate localStorage game history into the new account (`POST` each local game with a migrated flag). Deferred because the two histories are deliberately separate in v2.0 (PRD §11.9) and this adds complexity without blocking the core Plus experience. Can reuse the `pendingSyncUserId` marker and sync runner built in #95 (`src/utils/sync.js`).

### 10. Full onboarding journey (name + home course + par)
A proper sign-up flow capturing name and home course together, with editable per-hole par. Introduces par as a first-class concept — currently explicitly out of scope for MVP and v2.0 (PRD §7). Materially bigger than the lightweight name capture in #5; needs a decision on how par interacts with the raw-stroke scoring model (PRD §5) before any code.

### 11. Multi-course architecture
The architecture for properly supporting multiple courses, beyond the current v2.0 model where a signed-in user's "course" is a name string with a default hole count (PRD §11.7). Would cover structured per-course data (holes, par), how quick-play coexists with it, and whether system-provided courses become browsable. Planning item, not a single chunk — revisit once real usage shows users creating multiple distinct courses.


### 40. Optional match-play game mode (win each hole)
A game-mode toggle at setup: **stroke play** (current — lowest total wins) or **match play** (win the most holes; each hole won by the lowest score, halved on a tie). Changes the winner calculation, the Summary, and the share image. Explicitly flagged by the user as a future edition. PRD §5 change needed.

---

## Blocked / waiting on a decision or something external

### 31. Set up analytics — explored 19 September 2026, parked for now (not actioned)
**Not blocked on a decision any more — the user reviewed the options directly and chose not to proceed with any of them for now.** Revisit only if the user raises it again; the research below stands so it doesn't need re-doing.

**What they actually want:** unique visitors, visit count, and time-on-page, simple, free, no consent banner.

**The conflict (why this isn't a five-minute job):** any tool that identifies a visitor via cookies/localStorage (GA4, PostHog's default mode) sets non-essential identifiers, which under UK PECR + UK GDPR requires a consent banner - the app has deliberately never had one. The "Your data" privacy page and `Info.jsx` both currently state there is **no tracking or analytics at all** (PRD §4.8 links to that page); any of these routes makes that copy false and needs it corrected, banner or not.

**Options reviewed with the user, in order:**
- **GA4 + consent banner** - free, gives time-on-page via "engagement time" (which Plausible's own testing found can underreport actual time-on-page by up to 80% vs their method). Rejected: user didn't want a banner in any form, including a single discreet line requiring a tap - PECR requires an affirmative action before the tracking script loads, a passive sentence with no action isn't valid consent.
- **GA4 cookieless/consent-exempt config** - not really viable; GA4 fundamentally relies on cookies, a cookieless config is a lossy hack, not a clean supported mode.
- **Plausible (cookieless by design, no banner ever needed - confirmed via independent legal review)** - gives real per-page time-on-page and country-level geolocation without storing IPs. Rejected: paid (~$9/month), user needs free.
- **Cloudflare Web Analytics (already available, free, cookieless, no banner)** - gives visits/pageviews/top pages/referrers/countries/Core Web Vitals. Doesn't give time-on-page. Not rejected outright but doesn't fully meet the "time on page" ask - worth reconsidering alone if analytics comes back up and per-page duration turns out not to matter.
- **PostHog in `cookieless_mode: 'always'`** - free, no banner (cookieless by design when configured this way, not by default), gives visitors/pageviews/sessions/avg session duration/bounce rate/top pages with time-on-page/referrers/devices/active-hours heatmap. **What it loses in this mode:** country/location data (IP is stripped before GeoIP enrichment runs), true multi-day return-visitor tracking (anonymous ID is a daily-rotating hash, so the same person on different days counts as different visitors), and nearly everything else PostHog is otherwise known for - session replay, surveys, feature flags, A/B testing, funnels tied to real people - all of those need persistent identity, which is exactly what this mode avoids. Would have been the closest fit to the stated ask (free + no banner + time-on-page), but the user chose to park the whole idea rather than proceed once the trade-offs were clear.

**Already done regardless of what's eventually chosen:** events are instrumented app-wide - New Game Started, Game Completed (player count, holes), Scorecard Shared, Game Edited, Bruntsfield Home Link Clicked. `src/utils/analytics.js` is a `track()` wrapper around `window.plausible?.(...)` (currently a silent no-op) and `index.html:32` has the Plausible `<script>` commented out, ready to enable if that route is ever picked.

**If revisited:** re-confirm pricing/feature details before building (this research is dated 19 September 2026 and analytics-tool pricing/features change). Still needs `Info.jsx` + `Privacy.jsx` + PRD §4.8 copy updated whatever's chosen, since all routes above make the current "no tracking" claim false.

### 42. "Sign in with Google" (OAuth)
Add Google as a sign-in option alongside the magic link (PRD §11.4 is currently magic-link-only). Needs: an OAuth client created in the Google Cloud console (external, hence blocked), the redirect/callback Pages Function, and a decision on account linking — a user who has signed in by magic link and then uses Google with the same email address should land on the same account, not a duplicate. PRD §11.4 change needed. Assistance requested — unblock by setting up the Google Cloud OAuth client and confirming the account-linking behaviour.

### 13. Official Bruntsfield logo
Add the club's official logo (likely Home or the course info section) once permission to use it is obtained.

---

## Known issues

### 43b. Back-nav polish - still open (follow-ups from the #43 build)
- **D1-round gap:** the `gameId` re-resolution only covers local/quick-play rounds (looked up in `localStorage`). A browser back/forward bounce, or Setup's edit-cancel, landing back on a signed-in D1-only round opened from History (never saved locally) still falls back to the most recently completed *local* game, same as before this build — there's no `GET /api/games/:id` to re-fetch a single D1 round by id. Low priority (narrow path: sign in, open a past round from History, tap Edit, cancel before starting the scorecard, or a raw browser bounce) — would need a new API endpoint if it's worth closing.
- `pastRound` isn't persisted in history state, so a browser back/forward bounce onto the "Add Past Round" Setup screen re-renders it titled "New Game" with no date field (cosmetic; the past round is already saved by then). **Left unpersisted on purpose (20 Sep 2026):** Setup's abandoned-edit guard skips itself when `pastRound` is set, so restoring it on a bounce could leave a stranded `_edit` working copy undiscarded; the cosmetic gain does not justify that.
- `Setup.edit-recovery.test.jsx` covers the abandoned-edit guard directly; `App.test.jsx` now also drives it through a real `popstate` bounce, and `Login.test.jsx` covers the "← Home" label. Still no render test for the `goBack()` fix itself.


### 90. Header top padding on mobile — reduced, needs on-device confirmation
From the 11 September 2026 UI/UX review. Reported across mobile screens, not confirmed at pixel level via desktop emulation (doesn't render iOS status bar/notch chrome). Fixed 11 September 2026: `PageHeader.jsx`'s top padding reduced `pt-10` → `pt-6` (an existing DESIGN.md spacing token, not an invented value). Still needs a quick on-device visual check to confirm it reads right with real iOS status-bar/notch chrome. Low priority.

### 116. Lost-response then local edit keeps old server data (Medium, needs a backend change)
If the server saved a round but the response was lost, and the user then edits the still-pending round locally (or changes its notes on the failed-save screen and retries) before the next sync, the idempotent 200 keeps the old data on the server and the edit stays local-only. Needs `PATCH` or `GET` by `client_round_id`. Documented as a known limit in PRD §11.8.

### 115. Backend hardening follow-ups (Medium/Low, from the 20 Sep 2026 review)
- Medium: `confirm-email.js` still checks the token then marks it used in two steps; use the same atomic claim as `verify.js` (the UNIQUE constraint makes two clicks benign today).
- Low: `games` POST and PATCH pass a truthy non-string `course_id` straight to `bind` (Assumed: a D1 type error, so a 500); validate it as a string.
- Low: a second click on a magic link now shows `?auth=expired` while the first tab is signed in; the expired-banner copy could acknowledge that.
- Low: the runner checks `/api/auth/me` once per run, so a cookie change mid-run is not caught; re-check per POST if it ever matters.
- Low: the new `EMAIL_RE` rejects trailing-dot local parts (`john.@x.com`) and underscore domains; an existing user with such an address could not request a link (very unlikely).

### 117. Failed-save edge cases (Low, from the 21 Sep 2026 review of #112/#113)
- Summary's Retry (and Done before it) has no `/api/auth/me` session check like the background runner's (#114), so with two tabs where user B signs in, user A's round could be filed under B. Pre-existing; two tabs only.
- `Setup.handleStart` ignores a failed `saveActiveGame`; on a full device the unmount looks like an abandon and the runner could send the old data.

---

## Housekeeping & tech debt

### 91. Signed-in identity in gameplay (#5) - code-review housekeeping (CLEAR WITH NOTES, 18 Sep 2026)
Minor items logged from the Phase 2 review of `feat/signed-in-identity-gameplay` (PRD §11.15); none block. (The two test-coverage gaps originally listed here - a star render assertion and an explicit `pastRound` pre-fill test - were closed on 19 September 2026 by `chore/test-coverage-gaps`.)
- **`PlayerStar`'s `aria-label="You"` may fold into the History filter-chip button's accessible name** (e.g. announced as "Alice You" rather than "Alice" with a separate marker), since the star sits inside the `<button>` alongside the plain-text name. Not wrong, but wasn't an explicit accessibility decision — worth a quick screen-reader spot-check.

### 93. Login resend: announce that the link was sent again (Low)
The error box is now `role="alert"` (#101 batch), but the "Resend in Ns" countdown is deliberately not a live region (it would be read out every second) and a successful resend gives no spoken confirmation. Consider a one-off `role="status"` line ("Link sent again") in `src/pages/Login.jsx`.

### 94. Map button course-match fix (#1) - code-review housekeeping (CLEAR WITH NOTES, 18 September 2026)
Minor items logged from the review of `fix/map-button-course-match` (BACKLOG #1); none block.
- **Transient loading-window flash.** `isBruntsfieldCourse` gates on `!user` first (`Scorecard.jsx:94`), and `user` starts `null` until `/api/auth/me` resolves (`useAuth.jsx`). For a signed-in user on a non-Bruntsfield or courseless round, the Map button (and, if tapped, `CourseMapModal`) can flash on then auto-disappear once auth resolves. Consistent with the existing `PlayerStar` badge flash in the same file (`user?.name` match, already shipped) and with how `Home.jsx`/`Setup.jsx`/`Info.jsx`/`BruntsfiledCoursePage.jsx` all gate on `user` alone rather than `loading` - `Settings.jsx`'s `loading` check is a route guard for a private page, not a comparable case. Not blocking; worth a `loading` gate here only if it's ever reported as a real annoyance in practice.
- **Name-string matching is spoofable/fragile, not identity-stable.** `isBruntsfieldCourse` matches `game.courseName === BRUNTSFIELD_COURSE_NAME` (a plain string), not a stable id or `is_default` flag. Two consequences: (1) the games list/detail query LEFT JOINs course name live (`functions/api/games/index.js:16`), so if a user renames their seeded default Bruntsfield course (`PATCH /api/courses/:id` allows any name, no restriction), every historic round tied to that course id loses the Map button retroactively, not just future rounds; (2) a user could name or rename any of their own courses to the literal string "Bruntsfield Short Hole Golf Course" and the button/modal would show for that unrelated course. Both require a deliberate rename by the user and have no data-safety consequence (wrong map shown, nothing corrupted) - low severity, but worth a stable identifier (id or `is_default`) if this class of bug matters more later.
- **The canonical name lives in two places.** `src/constants.js`'s `BRUNTSFIELD_COURSE_NAME` (used by this fix's match) and `functions/api/auth/verify.js:41`'s hardcoded literal `'Bruntsfield Short Hole Golf Course'` (used to seed each new user's default course) must stay byte-identical for the match to keep working - pre-existing duplication (Functions and the Vite frontend are separate build contexts, so a shared import isn't straightforward), not introduced by this fix, but this fix is the first thing whose correctness now depends on the two staying in sync. No test would catch a drift between them.

### 25. Crisper course map image — blocked on a better source asset
`public/course_map_v2.png` is only 443×600px (~444 KB). `CourseMapModal.jsx` displays it at ~320px wide and zooms to 4× (~1300px effective demand), so it is inherently soft on any retina screen — the modal code itself is fine. The fix is purely a better asset: a higher-resolution scan/export (ideally ≥1600px on the long edge) or an SVG/vector from the club. Nothing to do in code until that exists. Overlaps with #13 (official logo) and #1 as things to request from Bruntsfield in one go. (Distinct from #1, which is about when the map appears and its loading state.)

### 41. Page load performance pass
Measure and tune actual load performance — Core Web Vitals (LCP, CLS, INP), bundle size (main JS ~260 kB / ~74 kB gzip as of 21 September 2026, after the map went lazy; fonts are now self-hosted), image weight (`course_map_v2.png` is ~455 kB), and Cloudflare Pages caching headers. Establish a baseline, fix the obvious wins, re-measure. Assistance requested.




### 78. `BruntsfiledCoursePage.jsx` discreet-link spacing (residual)
The tap-target growth shipped 8 September 2026 - all three foot-of-page links ("Last round", "Sign in", "← Golf Scorecard home") now use `inline-block py-3 -my-3` with the wrappers spaced so the hit boxes don't overlap. The missing `track()` event and missing render/interaction test were fixed 11 September 2026 (`BruntsfiledCoursePage.test.jsx` added; home link now fires `Bruntsfield Home Link Clicked`, the first click/nav-exit event in an otherwise domain-state-event taxonomy - worth a glance if a second one shows up). Still open, low priority: the discreet-link stack sits closer to the primary-button block above (~4px hit-box clearance) than the links sit to each other (~32px) - deliberate, but if a 4th discreet link is ever added the spacing model should be revisited.

### 79. Magic-link abuse protection — revisit if abuse is observed
#14 (shipped 8 September 2026) added a per-email throttle: `POST /api/auth/request-link` rejects with `429` at 5+ unclaimed links per address per 15 min. Residual surface: ~480 emails/day to a single targeted inbox is still possible, and there is no global or per-IP cap (magic_tokens deliberately stores no IP), so distributed abuse across many victim addresses is unthrottled, and the throttle is soft under concurrency (TOCTOU — N parallel requests can each read a count under the cap). All acceptable at current scale. If abuse is seen: add Cloudflare Turnstile on the login form, or a Cloudflare WAF rate-limit rule on the endpoint. Separately: the #14 window relies on `magic_tokens.expires_at` being exactly issued + 15 min — if a longer-lived link type is ever added, give the table a real `created_at` column so the throttle can be explicit. Low priority until abuse is observed.

### 80. Settings panel (#4) - code-review housekeeping (CLEAR WITH NOTES, 8 Sep 2026)
Minor items logged from the Phase 2 review of `feat/user-profile-foundation`; none block. All low priority.
- **No dialog has a focus trap** (Settings, History, Scorecard, CourseEdit, map modal). `aria-modal="true"` makes assistive tech treat the background as inert, but Tab can still leave the dialog (focus does return to the opener on close). Acceptable at this app's scope; revisit if a keyboard-heavy flow lands.
- **DESIGN.md's dialog-semantics "no exceptions" wording doesn't fully match Settings.jsx.** (From the 11 Sep 2026 dialog-parity review.) The new pattern block states the close handler "lives in one named function... so the three paths can never drift apart", but Settings.jsx's pre-existing "Keep my account" button calls `() => setConfirmDelete(false)` inline rather than the file's own `closeDelete()`. Harmless (the button is disabled while `deleting`), but either tighten Settings.jsx to call `closeDelete()` or soften the DESIGN.md wording.
- **No render test for `History.jsx`'s delete-sheet dialog semantics.** (From the 11 Sep 2026 dialog-parity review.) Settings.jsx has a dedicated test covering labelled-dialog role, autofocus and Escape/backdrop close (`Settings.test.jsx:185`); `History.jsx` now has the identical behaviour but no equivalent test — only the player-filter feature is covered in `History.test.jsx`.
- **Stacked accent banners.** An active `!storageOk` banner (`App.jsx:162`) plus the `?email=` notice banner (`Home.jsx:63`) would render two full-width accent bars at once. Very unlikely combo, cosmetic.
- **`replaceState` on a recognised `?auth=` / `?email=` param strips the whole query string** (`useAuth.jsx:30`), including any unrelated params. Pre-existing behaviour, no impact today (the app uses no other query params).
- **`AuthContext` value is a fresh object literal every render** (`useAuth.jsx:100`). Every consumer re-renders on any auth state change. The new Home capture effect is safe regardless because it keys on the referentially-stable `useState` setter, but the context value could be wrapped in `useMemo` if a perf pass ever wants it. Trivial at current scale, not worth a perf pass on its own.


### 82. Email-change / account-deletion edge cases (from the #3 backend review)
One narrow wrinkle in `functions/api/users/index.js`, low priority, logged so it isn't lost:
- **Deletion clears an unrelated party's unclaimed sign-in token.** `DELETE /api/users` removes `magic_tokens` rows matching the user's `email` *or* `pending_email`. If user A has an email change pending to address Y, and the owner of Y has separately requested a sign-in link (to make their own account) that's still unclaimed, deleting A's account also burns Y's token. Self-healing — Y just requests another link — and the path is very narrow. Scope a fix only if it ever bites.

---

### Full-codebase audit, 19 September 2026 (#97, #98, #100, #102-#103, #106-#107, #111) - lower findings, short form
From the first `/full-audit`. Contrast ratios and tap sizes are hand-computed estimates, not browser measurements; nothing was screen-reader tested; `npm audit` was not run. The two High findings (#95, #96) are done.

### 97. Dead code - remainder (Low)
`EMAIL_RE` in `functions/_lib/email.js:10` stays exported because tests import it. `README.md` is effectively empty (11 bytes) and needs content, not deletion.

### 98. Duplicated logic (Medium/Low)
- `player_data` payload built twice (`Scorecard.jsx` `buildPlayerData`, `Summary.jsx`).
- `share.js` `winnerLabel` re-implements `tiedNames` and the tie wording from `result.js`.
- `Home.jsx` and `BruntsfiledCoursePage.jsx` are near-copies (header, info icon, 1/2/3 list, Last round and Sign-in links).
- Low: "+ New course" reset handler in `Setup.jsx`; two resend POSTs in `Login.jsx`; external-link SVG inlined ~5 times; hole count `36` in five places; par band 2-7 defined three times; client email regex looser than server `EMAIL_RE`; security-notice email re-inlines the branded shell.

### 100. Inconsistent patterns (Medium/Low)
- Medium: stale copy in `Settings.jsx:174` ("...not shown on any scorecard yet"); the name is now shown.
- Low, backend: `me.js` returns `{ user: null }` with 401 (the client relies on it); mixed semicolon style.
- Low, frontend: ErrorBoundary button styling and no logging (`App.jsx`); `useAuth.jsx:30` wipes the history stamp; back labels lack the arrow; empty-score glyph differs from DESIGN.md's em dash; `MAX_STROKES` declared inside `Scorecard`; `createGame`/`buildEditGame` take 6-7 positional args; "Bruntsfiled" filename typo; large `Setup.jsx`, `Scorecard.jsx`, `Summary.jsx`.
- Content flag: `BruntsfiledCoursePage.jsx:46` says "since 1456" (not in PRD; `Info.jsx` says 1895).

### 102. Security hardening (Medium unless stated; no secrets found)
- The CSP in `public/_headers` is Report-Only (shipped 21 Sep 2026; nosniff, X-Frame-Options and Referrer-Policy are enforced). After browsing production with no console violations, rename it to `Content-Security-Policy` to enforce it. Also check the Cloudflare Pages dashboard: if Web Analytics auto-injection is on, its beacon would violate script-src once enforced.
- Magic and email-confirm links are consumed on GET, so a mail scanner could burn them (Assumed; see #106).
- Low: personal Gmail hardcoded as `ADMIN_NOTIFY_EMAIL` fallback (`users/index.js`; decided 20 Sep 2026 to leave as is); tokens have no type column (a confirm-email token also works at `/verify`; needs a migration, so it goes with the schema bundle).

### 103. Performance smells (flag only; not measured)
- Medium: blank shell until `/api/auth/me` resolves or 5s abort (`App.jsx:156`, `useAuth.jsx`). Decided 19 Sep 2026: leave the `GET /api/games` `LIMIT 100` cap as it is (History silently stops at 100 rounds); revisit if anyone nears 100.
- Low: History aggregations every render.

### 106. Magic-link prefetch investigation (not yet run)
Check whether mail-security scanners burn the single-use link (`verify.js:14-22`, `confirm-email.js:24-26`), leaving the user on "expired". Needs a real mail client or scanner. Links to #102.

### 107. Measure performance (not yet run)
App-start auth gating, bundle and font loading (LCP on a throttled mobile profile, fits #41), and D1 timings for `GET /api/games` and `GET /api/courses` at realistic row counts.

### 111. Smaller findings from the #104 tests (Low)
- Share failures give no feedback (`Summary.jsx:167-172`); needs an intended-behaviour decision.
- `share.js` `winnerLabel` says "1 strokes" for a winning total of 1.
- `Scorecard.jsx` still sets `synced: true` on a locally edited round without POSTing it (now only for signed-out rounds; a pending round keeps its marker instead, #95), so `synced` is not a trustworthy "on the server" flag; matters for #8.
- Possible race, Assumed and probably unreachable: Done tapped before `/api/auth/me` resolves skips the save (`handleGoHome` in `Summary.jsx`).
