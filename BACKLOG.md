# Backlog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> Open items only — ideas, deferred work, and known issues not yet done.
> When something ships, delete its line and add a note to `CHANGELOG.md`.
> Nothing here is actioned without explicit instruction — tell the project-manager (or Claude directly) to pull an item into work.
> Numbers are stable IDs for cross-reference — don't renumber existing items when deleting one, so gaps are expected.

**Last updated:** 19 September 2026

> The history of shipped and removed items lives in `CHANGELOG.md`. This file is open items only.
>
> Still-relevant status notes: #40 needs a product-owner PRD decision before build. #42 (Google sign-in) is Blocked on an external Google Cloud OAuth client. #31 (analytics / GA4) is Blocked on a privacy/consent decision — route (a)/(b)/(c) must be chosen before any build. #39/#64 (end-of-round tally) were built and removed the same day — nothing remains; PRD §5.2 is a "removed" stub. Settings/account screen text alignment was checked live during the 11 September 2026 UI/UX review and found already left-aligned throughout (labels, body copy, input, button text) — no action needed, not logged as an open item.

---

## Features not yet built

### 2b. Sign-in email — inbox sender name (manual, not code)
The email copy/wordmark now read "Scorecard by Outbuild" (shipped 1 Sep). Remaining: the inbox *sender name* is set by the `RESEND_FROM_EMAIL` env var format — set it to a `Scorecard by Outbuild <address>` display-name format via the Cloudflare Pages dashboard (Settings → Environment variables). No code.

### 7. Course leaderboard — top rounds recorded on a course
A screen that picks a course and shows the best (lowest) rounds recorded on it. Drawn **only from signed-in users' D1 entries** — quick-play localStorage rounds never feed it. Scope to settle when built: which courses are selectable (the user's own courses, the seeded Bruntsfield, or any course with entries), whether it ranks whole-round totals or per-player rounds within a game, how ties and DNF rounds are treated, and how many rows to show. Requires the database, so signed-in only. Post-MVP. **PRD §8 update needed** — it currently frames this as an "all-time personal leaderboard per user" (lowest round, most wins); the new shape is per-course, not per-user.

### 8. Quick-play history import after sign-in
Offer a one-time prompt after first sign-in to migrate localStorage game history into the new account (`POST` each local game with a migrated flag). Deferred because the two histories are deliberately separate in v2.0 (PRD §11.9) and this adds complexity without blocking the core Plus experience.

### 10. Full onboarding journey (name + home course + par)
A proper sign-up flow capturing name and home course together, with editable per-hole par. Introduces par as a first-class concept — currently explicitly out of scope for MVP and v2.0 (PRD §7). Materially bigger than the lightweight name capture in #5; needs a decision on how par interacts with the raw-stroke scoring model (PRD §5) before any code.

### 11. Multi-course architecture
The architecture for properly supporting multiple courses, beyond the current v2.0 model where a signed-in user's "course" is a name string with a default hole count (PRD §11.7). Would cover structured per-course data (holes, par), how quick-play coexists with it, and whether system-provided courses become browsable. Planning item, not a single chunk — revisit once real usage shows users creating multiple distinct courses.


### 40. Optional match-play game mode (win each hole)
A game-mode toggle at setup: **stroke play** (current — lowest total wins) or **match play** (win the most holes; each hole won by the lowest score, halved on a tie). Changes the winner calculation, the Summary, and the share image. Explicitly flagged by the user as a future edition. PRD §5 change needed.

### 83. Home (signed in) — fold Settings into the header icon
When signed in, Home shows a "signed in as…" state plus a standalone **Settings** button that the user considers redundant. Swap the header **info (ℹ) icon for a settings (gear) icon** that opens the Settings screen, and drop the standalone Settings button.
- **Open question for the product-owner before build:** where the **Info page** (PRD §4.8) is then reached from — move its entry point into Settings, keep an info affordance elsewhere, or show the settings icon only when signed in and keep the info icon when signed out. Resolve first.
- Frontend-only once decided; likely small. Related: #5 (signed-in identity, shipped 18 Sep 2026), #4 (Settings panel, shipped).

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

### 12. Contact email — decide the final address and whether Info needs a link
The placeholder gmail is already gone: `Privacy.jsx` uses `scorecard@outbuild.uk`, and the Info page (PRD §4.8) currently has no contact `mailto:` at all. Decide whether the Info page should carry a contact link, and confirm `scorecard@outbuild.uk` is the address to standardise on (PRD §4.8 and earlier notes assumed `hello@outbuild.co`). Align both pages and the PRD once decided.

### 13. Official Bruntsfield logo
Add the club's official logo (likely Home or the course info section) once permission to use it is obtained.

---

## Known issues

### 43b. Back-nav polish (follow-ups from the #43 build) — mostly built 5 September 2026
The broken loop and the label rationalisation from the 5 Sep scenario review are built. Summary's "← Rounds" and Setup's edit-cancel branch now call `goBack()` instead of pushing a fresh `navigate()`; `App.jsx` persists a round's own `id` (never the mutable object) in history state as `gameId`, and Summary re-resolves the round from storage by that id when a popstate bounce drops the `game` param. Every back button now names its real destination or action instead of a generic "← Back" (History "← Home"; Info/Privacy/Rules context-aware; Setup three ways — "← Summary" / "← History" / "← Home" or "← Bruntsfield"; Login "← Home" on both its screens; Scorecard edit mode "← History"; Scorecard live mode "Pause", no arrow, since it leaves the round intact in storage rather than stepping back or ending it). Home and the Bruntsfield course page keep no in-app back button (root screen; phone browser back nav respectively). A code-review pass (5 Sep) caught two label bugs before this shipped: Login's initial form still said "← Back" (only its "check your email" screen had been updated) — fixed; and the live Scorecard's back action was initially labelled "Quit" though the code never clears the active game — relabelled "Pause" to match actual behaviour rather than changing the behaviour itself. See DESIGN.md "Navigation".

Still open:
- **D1-round gap:** the `gameId` re-resolution only covers local/quick-play rounds (looked up in `localStorage`). A browser back/forward bounce, or Setup's edit-cancel, landing back on a signed-in D1-only round opened from History (never saved locally) still falls back to the most recently completed *local* game, same as before this build — there's no `GET /api/games/:id` to re-fetch a single D1 round by id. Low priority (narrow path: sign in, open a past round from History, tap Edit, cancel before starting the scorecard, or a raw browser bounce) — would need a new API endpoint if it's worth closing.
- `pastRound` isn't persisted in history state, so a browser back/forward bounce onto the "Add Past Round" Setup screen re-renders it titled "New Game" with no date field (cosmetic; the past round is already saved by then; no worse than pre-#43 behaviour). Add `pastRound` to the `navigate` allowlist in `App.jsx` if that path is worth polishing.
- `Setup.edit-recovery.test.jsx` covers the abandoned-edit guard directly; `App.test.jsx` now also drives it through a real `popstate` bounce, and `Login.test.jsx` covers the "← Home" label. Still no render test for the `goBack()` fix itself.
- **Scorecard "Pause" — no confirmation dialog.** Flagged during the 5 Sep build, not decided: tapping it leaves the app with no confirmation, unlike Finish Game. Scores are autosaved so no data is lost either way, but it's still an accidental-tap risk. Worth a product-owner/user call on whether it needs a guard.


### 56. Length-changing course switch during a D1 past-round edit leaves a stale-size grid
Surfaced in the #48–#55 code review. `buildEditGame` sizes the edit grid to the *round's saved* hole count, not the newly-selected course's. Switching a 36-hole round onto a 9-hole course mid-edit (D1 rounds only — local rounds can't change course) leaves a 36-row grid with holes 10–36 padded back to par 3. No crash, no data loss, but confusing. Needs a product decision: disallow a length-changing course switch during an edit, or accept it and document the behaviour. (PRD §11.7, §11.13.)

### 86. Edit Course screen showed 36 holes for two specific courses — traced to bad data, not code (11 Sep 2026)
From the 11 September 2026 UI/UX review, reproduced on "Bruntsfield Links" (meant to be 9 holes) and "Swanston 18 hole". Investigated 11 September 2026: `CourseEdit.jsx` renders `deriveHolePars(found.hole_pars, found.holes)` (sized to the course's real `holes`), `ParStepperGrid` just maps over whatever array it's given, `POST /api/courses` strictly validates `holes` to 9 or 18 on create, and `PATCH /api/courses/[id]` explicitly rejects any attempt to change `holes` post-creation. No code path renders a hardcoded 36 or lets hole count drift after creation — these two rows genuinely have `holes = 36` stored in D1, most likely predating the strict 9/18 validation. No code fix needed. User will correct the two affected rows directly in D1. Closing — reopen only if a *newly created* 9/18 course is ever seen with the wrong hole count, which would point at an actual regression.

### 90. Header top padding on mobile — reduced, needs on-device confirmation
From the 11 September 2026 UI/UX review. Reported across mobile screens, not confirmed at pixel level via desktop emulation (doesn't render iOS status bar/notch chrome). Fixed 11 September 2026: `PageHeader.jsx`'s top padding reduced `pt-10` → `pt-6` (an existing DESIGN.md spacing token, not an invented value). Still needs a quick on-device visual check to confirm it reads right with real iOS status-bar/notch chrome. Low priority.

### 95. Signed-in "Done" silently loses the round if the save to D1 fails (HIGH - full audit, 19 Sep 2026)
`Summary.jsx:132-153`: for a signed-in user, "Done" POSTs the round to `/api/games`. A non-OK response or network error is ignored (empty catch, `res.ok` never checked) and `navigate('home')` runs regardless. The round then exists only in localStorage. Signed-in History reads D1 only (`History.jsx:16,50`), Home's "Last round" shows for signed-out users only (`Home.jsx:126`), and nothing retries the sync, so the round is invisible to the user with no message. Realistic on a golf course with patchy signal. There is no recovery path because #8 (history import) is not built. Needs a product/scope call (show an error and stay on Summary, retry, or queue for later sync) - likely project-manager scoping. Not actioned. (PRD §11.)

### 96. Scorecard scoring cells not reachable by keyboard or screen reader (HIGH - full audit, 19 Sep 2026)
`Scorecard.jsx:317-319`: choosing a hole to score is a `<td onClick>` with no role, `tabIndex` or key handler. Keyboard, switch and screen-reader users can only move forward with Advance and cannot jump back to correct an earlier score. The header, +, - and Advance buttons are fine. This is the app's core interaction. Not actioned.

---

## Housekeeping & tech debt

### 91. Signed-in identity in gameplay (#5) - code-review housekeeping (CLEAR WITH NOTES, 18 Sep 2026)
Minor items logged from the Phase 2 review of `feat/signed-in-identity-gameplay` (PRD §11.15); none block.
- **No component-level render test asserts the star itself appears.** `isSignedInPlayer()` has full unit coverage (`game.test.js`) and Setup's pre-fill has its own test file, but no test in `Scorecard.jsx`, `Summary.jsx` or `History.jsx`'s existing test suites renders a signed-in matched player and asserts `PlayerStar` (or its `aria-label="You"`) is present. Verified correct by source inspection during review; worth a direct render assertion so a future refactor can't silently drop it.
- **No explicit test for the "Add Past Round" pre-fill path.** `Setup.signed-in-prefill.test.jsx` covers New Game (implicit `pastRound: false`) and explicitly excludes `editRound: true`, but doesn't assert the pre-fill also fires with `pastRound: true` — PRD §11.15 calls this out by name. The guard (`if (editRound || !user?.name) return`) is correct by inspection since it never checks `pastRound`, but an explicit test would close the gap.
- **`PlayerStar`'s `aria-label="You"` may fold into the History filter-chip button's accessible name** (e.g. announced as "Alice You" rather than "Alice" with a separate marker), since the star sits inside the `<button>` alongside the plain-text name. Not wrong, but wasn't an explicit accessibility decision — worth a quick screen-reader spot-check.

### 92. Remove-player (✕) touch target below 44px guideline
Flagged in the code review of `feat/edit-round-players` (PRD §11.13.1, 18 September 2026). The per-row remove control on Setup's player list (`src/pages/Setup.jsx`) is ~32×32px (`p-2` padding around a `w-4 h-4` icon) — below the 44×44px minimum touch target. Pre-existing on New Game, not a regression introduced by that chunk, but now also reachable via past-round edit (a phone-in-hand, outdoors context per DESIGN.md's own rationale), so raising its priority slightly. Low priority, cosmetic/accessibility only — no functional impact.

### 93. Login resend countdown/error text not in an aria-live region
Flagged in the code review of `feat/magic-link-resend` (PRD §11.4.2, 18 September 2026). The "Resend in Ns" countdown and the 429/generic error box on Login's confirmation screen (`src/pages/Login.jsx`) update visually but aren't announced to screen readers via `aria-live`. Consistent with the pre-existing error banner pattern on the same screen (not a regression), so low priority.

### 94. Map button course-match fix (#1) - code-review housekeeping (CLEAR WITH NOTES, 18 September 2026)
Minor items logged from the review of `fix/map-button-course-match` (BACKLOG #1); none block.
- **Transient loading-window flash.** `isBruntsfieldCourse` gates on `!user` first (`Scorecard.jsx:94`), and `user` starts `null` until `/api/auth/me` resolves (`useAuth.jsx`). For a signed-in user on a non-Bruntsfield or courseless round, the Map button (and, if tapped, `CourseMapModal`) can flash on then auto-disappear once auth resolves. Consistent with the existing `PlayerStar` badge flash in the same file (`user?.name` match, already shipped) and with how `Home.jsx`/`Setup.jsx`/`Info.jsx`/`BruntsfiledCoursePage.jsx` all gate on `user` alone rather than `loading` - `Settings.jsx`'s `loading` check is a route guard for a private page, not a comparable case. Not blocking; worth a `loading` gate here only if it's ever reported as a real annoyance in practice.
- **Name-string matching is spoofable/fragile, not identity-stable.** `isBruntsfieldCourse` matches `game.courseName === BRUNTSFIELD_COURSE_NAME` (a plain string), not a stable id or `is_default` flag. Two consequences: (1) the games list/detail query LEFT JOINs course name live (`functions/api/games/index.js:16`), so if a user renames their seeded default Bruntsfield course (`PATCH /api/courses/:id` allows any name, no restriction), every historic round tied to that course id loses the Map button retroactively, not just future rounds; (2) a user could name or rename any of their own courses to the literal string "Bruntsfield Short Hole Golf Course" and the button/modal would show for that unrelated course. Both require a deliberate rename by the user and have no data-safety consequence (wrong map shown, nothing corrupted) - low severity, but worth a stable identifier (id or `is_default`) if this class of bug matters more later.
- **The canonical name lives in two places.** `src/constants.js`'s `BRUNTSFIELD_COURSE_NAME` (used by this fix's match) and `functions/api/auth/verify.js:41`'s hardcoded literal `'Bruntsfield Short Hole Golf Course'` (used to seed each new user's default course) must stay byte-identical for the match to keep working - pre-existing duplication (Functions and the Vite frontend are separate build contexts, so a shared import isn't straightforward), not introduced by this fix, but this fix is the first thing whose correctness now depends on the two staying in sync. No test would catch a drift between them.

### 25. Crisper course map image — blocked on a better source asset
`public/course_map_v2.png` is only 443×600px (~444 KB). `CourseMapModal.jsx` displays it at ~320px wide and zooms to 4× (~1300px effective demand), so it is inherently soft on any retina screen — the modal code itself is fine. The fix is purely a better asset: a higher-resolution scan/export (ideally ≥1600px on the long edge) or an SVG/vector from the club. Nothing to do in code until that exists. Overlaps with #13 (official logo) and #1 as things to request from Bruntsfield in one go. (Distinct from #1, which is about when the map appears and its loading state.)

### 41. Page load performance pass
Measure and tune actual load performance — Core Web Vitals (LCP, CLS, INP), bundle size (currently ~248 kB / ~76 kB gzip), font loading (three families via Google Fonts with `display=swap`), image weight (`course_map_v2.png` is ~455 kB), and Cloudflare Pages caching headers. Establish a baseline, fix the obvious wins, re-measure. Assistance requested. (The `performance-auditor` agent covers this.)




### 78. `BruntsfiledCoursePage.jsx` discreet-link spacing (residual)
The tap-target growth shipped 8 September 2026 - all three foot-of-page links ("Last round", "Sign in", "← Golf Scorecard home") now use `inline-block py-3 -my-3` with the wrappers spaced so the hit boxes don't overlap. The missing `track()` event and missing render/interaction test were fixed 11 September 2026 (`BruntsfiledCoursePage.test.jsx` added; home link now fires `Bruntsfield Home Link Clicked`, the first click/nav-exit event in an otherwise domain-state-event taxonomy - worth a glance if a second one shows up). Still open, low priority: the discreet-link stack sits closer to the primary-button block above (~4px hit-box clearance) than the links sit to each other (~32px) - deliberate, but if a 4th discreet link is ever added the spacing model should be revisited.

### 79. Magic-link abuse protection — revisit if abuse is observed
#14 (shipped 8 September 2026) added a per-email throttle: `POST /api/auth/request-link` rejects with `429` at 5+ unclaimed links per address per 15 min. Residual surface: ~480 emails/day to a single targeted inbox is still possible, and there is no global or per-IP cap (magic_tokens deliberately stores no IP), so distributed abuse across many victim addresses is unthrottled, and the throttle is soft under concurrency (TOCTOU — N parallel requests can each read a count under the cap). All acceptable at current scale. If abuse is seen: add Cloudflare Turnstile on the login form, or a Cloudflare WAF rate-limit rule on the endpoint. Separately: the #14 window relies on `magic_tokens.expires_at` being exactly issued + 15 min — if a longer-lived link type is ever added, give the table a real `created_at` column so the throttle can be explicit. Low priority until abuse is observed.

### 80. Settings panel (#4) - code-review housekeeping (CLEAR WITH NOTES, 8 Sep 2026)
Minor items logged from the Phase 2 review of `feat/user-profile-foundation`; none block. All low priority.
- ~~`History.jsx` delete-round sheet still lacks dialog semantics.~~ Fixed — brought to parity with Settings.jsx (`role="dialog"`, `aria-modal`, `aria-labelledby`, autofocus, Escape/backdrop dismiss) in the tap-targets/dialog-parity batch, 11 Sep 2026.
- **Neither sheet has a focus trap or focus-return.** `aria-modal="true"` makes assistive tech treat the background as inert, but Tab can still leave the dialog, and closing it does not return focus to the trigger. Acceptable at this app's scope; revisit if a keyboard-heavy flow lands.
- **DESIGN.md's dialog-semantics "no exceptions" wording doesn't fully match Settings.jsx.** (From the 11 Sep 2026 dialog-parity review.) The new pattern block states the close handler "lives in one named function... so the three paths can never drift apart", but Settings.jsx's pre-existing "Keep my account" button calls `() => setConfirmDelete(false)` inline rather than the file's own `closeDelete()`. Harmless (the button is disabled while `deleting`), but either tighten Settings.jsx to call `closeDelete()` or soften the DESIGN.md wording.
- **`History.jsx`'s Delete button has no in-flight guard.** (From the 11 Sep 2026 dialog-parity review.) `executeDelete` awaits a fetch for DB-backed games but the button isn't disabled and shows no "Deleting…" state meanwhile, unlike Settings.jsx's `deleting`-gated equivalent. Pre-existing, low risk (a rapid double-tap could in theory fire two DELETE calls), but now sits next to a DESIGN.md section citing Settings.jsx as the reference pattern for this exact sheet.
- **No render test for `History.jsx`'s delete-sheet dialog semantics.** (From the 11 Sep 2026 dialog-parity review.) Settings.jsx has a dedicated test covering labelled-dialog role, autofocus and Escape/backdrop close (`Settings.test.jsx:185`); `History.jsx` now has the identical behaviour but no equivalent test — only the player-filter feature is covered in `History.test.jsx`.
- **Settings delete-sheet focus effect re-pulls focus when `deleting` flips true** (`Settings.jsx` ~63-71, deps `[confirmDelete, deleting]`). Harmless since the input stays mounted, but focus jumps back to it mid-delete. Gate the `.focus()` on the open transition only if it ever annoys.
- **Stacked accent banners.** An active `!storageOk` banner (`App.jsx:152`) plus the `?email=` notice banner (`Home.jsx:62`) would render two full-width accent bars at once. Very unlikely combo, cosmetic.
- **`replaceState` on a recognised `?auth=` / `?email=` param strips the whole query string** (`useAuth.jsx:30`), including any unrelated params. Pre-existing behaviour, no impact today (the app uses no other query params).
- **`AuthContext` value is a fresh object literal every render** (`useAuth.jsx:100`). Every consumer re-renders on any auth state change. The new Home capture effect is safe regardless because it keys on the referentially-stable `useState` setter, but the context value could be wrapped in `useMemo` if a perf pass ever wants it. Trivial at current scale, not a `performance-auditor` referral.

From the #84 review (email-disclosure, CLEAR WITH NOTES, 9 Sep 2026), same low-priority tier:
- **No focus-return when the "Change email address" form collapses.** Tapping "Keep my current email" unmounts the form and focus falls to `<body>` — should return to the "Change email address" trigger. Same class as the focus-return gap above; the disclosure adds a second instance.
- **"Keep my current email" link is ~40px tall** (`Settings.jsx` ~257-264, `py-2.5` + `text-sm`), just under the 44px guideline. Identical to the existing "Delete my account" link right below it — same tap-target class as the links fixed 11 September 2026, but this one wasn't part of that batch.

### 82. Email-change / account-deletion edge cases (from the #3 backend review)
Two narrow wrinkles in `functions/api/users/index.js` / `confirm-email.js`, both low priority, logged so they aren't lost:
- **Deletion clears an unrelated party's unclaimed sign-in token.** `DELETE /api/users` removes `magic_tokens` rows matching the user's `email` *or* `pending_email`. If user A has an email change pending to address Y, and the owner of Y has separately requested a sign-in link (to make their own account) that's still unclaimed, deleting A's account also burns Y's token. Self-healing — Y just requests another link — and the path is very narrow. Scope a fix only if it ever bites.
- **No index on `users.pending_email`.** `confirm-email` does `SELECT id FROM users WHERE pending_email = ?` on every click. The table is tiny so a scan is free today; add the index in the next migration that touches `users` if the user base ever grows.

---

### Full-codebase audit, 19 September 2026 (#97-#107)
Logged from the first `/full-audit` (code-reviewer, read-only). Baseline at the time: lint clean, 35 test files / 419 tests passing. Contrast ratios and tap-target sizes below are hand-computed estimates, not browser measurements; nothing was tested with a screen reader; `npm audit` was not run. The two High findings are #95 and #96 under Known issues. Nothing here is actioned.

### 97. Audit: dead code (Low)
- `format.js:1,7` - `formatGameNameDate` and `formatDate` exported, never imported (including tests).
- `index.css:107-116` `.map-vignette` and `index.css:6-9` `.pt-page` unused.
- `functions/_lib/email.js:10` `EMAIL_RE` and `ParStepperGrid.jsx:9-10` `PAR_MIN`/`PAR_MAX` are exported but only used inside their own file (or tests).
- Four `.gitkeep` placeholders in `src/{components,hooks,pages,utils}` now that they hold real files; `README.md` is effectively empty (11 bytes).
- Stale comments: orphaned "Browser Back out of an in-progress edit..." above the wrong effect (`Setup.jsx:77-82`, describes the effect at ~101); `// totals + avg` in `share.js:99` (average dropped in #70).

### 98. Audit: duplicated logic
- **Medium** - `auth/request-link.js:26-42` and `users/index.js:13-14,94-131` duplicate the throttle count query, `MAX_FRESH_LINKS = 5`, the 15-minute TTL and the token INSERT plus email send. No shared helper.
- **Medium** - `Scorecard.jsx:146-153` (`buildPlayerData`) and `Summary.jsx:126-131` build the same `player_data` payload.
- **Medium** - `share.js:55-64` `winnerLabel` re-implements `tiedNames` and the "Tied: ... level on N strokes" wording from `result.js`, whose header says those strings are shared.
- **Medium** - `Home.jsx:69-100` vs `BruntsfiledCoursePage.jsx` header, info icon, 1/2/3 list, Resume Game, Last round and Sign-in links are near-copies. Home never received the tap-target fixes the course page got (see #101).
- Low: session cookie regex implemented three times (`session.js:3`, `me.js:33`, `logout.js:20`; `me.js` also re-implements the session JOIN, deliberately, but it can drift); clear-cookie and set-cookie header strings duplicated (`logout.js:13`, `users/index.js:228`, `verify.js:56`); the "+ New course" reset handler pasted twice with a third variant (`Setup.jsx:331-336,390-395,415`); two near-identical resend POSTs (`Login.jsx:53,80`); the external-link arrow SVG inlined ~5 times (Home, Info x3, Privacy has its own local `ExternalLink`); hole count `36` in five places (`game.js:3`, `history.js:42`, `Summary.jsx:73`, `Scorecard.jsx:78`, `constants.js:20,25`) despite `constants.js` claiming to be the one place; par band 2-7 and default 3 defined three times (`scores.js:11,88`, `ParStepperGrid.jsx`, `hole-pars.js:10-12`); client email check `/.+@.+\..+/` (`Settings.jsx:122`) looser than server `EMAIL_RE`; security-notice email HTML re-inlines the branded shell (`users/index.js:245-264` vs `email.js:55-81`). The Bruntsfield name literal duplication is already in #94.

### 99. Audit: error handling that reports false success or a misleading state (Medium)
- `History.jsx:80-86` `executeDelete` swallows the fetch and never checks `res.ok`: on 401/500/offline the round vanishes from the list but stays in D1 and returns on reload.
- `History.jsx:50-55` games fetch has no `res.ok` check: a 401/500 renders "No rounds yet". One unparseable `player_data` row makes `normalizeDbGame` throw and blanks the whole list. No error state.
- `Setup.jsx:113-130` courses fetch has no 401/`res.ok` handling and an empty catch, so a failed or expired session shows "No courses yet" and allows a no-course 36-hole round. `CourseEdit.jsx:52` handles 401 properly (#75).
- `Setup.jsx:242,266` `new Date(pastDate + 'T12:00:00').toISOString()` throws RangeError if the date field is cleared; `ready` never checks the date, so "Enter scores" / "Edit hole scores" silently does nothing (reproduced in Node).
- `Scorecard.jsx:222-224` ignores the false return of `saveCompletedGame` (quota/blocked storage), then `clearActiveGame()` runs: silent loss of a finished round for a signed-out user. The active-game path shows a "Couldn't save" banner; the finish path does not.
- `Summary.jsx:61-64` calls `navigate('home')` during render. `Scorecard.jsx:67-72` and `Settings.jsx:27-29` do it from an effect and comment why. Expect a React "update a component while rendering" warning (needs debugger repro, see #106).
- Low: share failures swallowed silently (`Summary.jsx:157-167`, AbortError should stay silent but others need feedback); `logout()` has no try/catch (`Info.jsx:114`, `useAuth.jsx:45-48`); date defaults use the UTC date via `toISOString().slice(0,10)` (`Setup.jsx:51,486`), so between 00:00 and 01:00 BST "today" is not selectable and a round played 00:30 BST edits as the previous day (reproduced in Node).

### 100. Audit: inconsistent patterns (mostly Low)
- **Medium - dialog semantics missing** on the Finish/Save confirm sheet (`Scorecard.jsx:403`), the delete-course sheet (`CourseEdit.jsx:238`) and `CourseMapModal.jsx:23-31` (no role, `aria-modal`, labelling, autofocus, Escape; map modal is backdrop-dismiss only). DESIGN.md says "every bottom sheet, no exceptions (#80)" but only Settings and History are done, so #80's "parity" note is only true for those two.
- **Medium - stale copy** `Settings.jsx:174`: "Just for you for now - it is not shown on any scorecard yet." The name is now used (PlayerStar, Setup pre-fill) since #5.
- Low, backend: `request-link.js:13`, `courses/index.js:40`, `games/index.js:37` throw an unhandled 500 on a `null` or non-string JSON body (the PATCH handlers guard this); `games/index.js:37-105` POST does not cap `notes` (PATCH caps at 300) or validate `client_round_id`; `games/[id].js:14` DELETE lacks `AND user_id = ?` (safe via the preceding check, but `courses/[id].js` scopes both as defence in depth); `me.js:6,18` returns `{ user: null }` with 401 where every other endpoint returns `{ error }` (intentional, but logs a console 401 on every signed-out load); mixed semicolon style (`auth/*` uses them, the rest does not).
- Low, frontend: ErrorBoundary Reload button uses `rounded-md py-3`, which matches no DESIGN.md tier, and has no `componentDidCatch` logging (`App.jsx:28-37`); `useAuth.jsx:30` `replaceState({}, ...)` wipes the history stamp `App.jsx` just set (harmless fallback, contradicts the `App.jsx:89-103` comment); fallback back labels read "Home" with no arrow (`History.jsx:96`, `Settings.jsx:165`, `Summary.jsx:189`) vs DESIGN.md/#43b "← Home"; empty-score glyph is en dash in Scorecard, hyphen in Summary/share, and DESIGN.md specifies an em dash; `Scorecard.jsx:116` `MAX_STROKES = 14` declared inside the component (backend allows 99, rules say 7); `createGame`/`buildEditGame` take 6-7 positional parameters (`game.js:212,257`); "Bruntsfiled" typo in the `BruntsfiledCoursePage` filename, import and tests; `Setup.jsx` (607 lines), `Scorecard.jsx` (447) and `Summary.jsx` (436) are large multi-concern components.
- Content flag for product-owner: `BruntsfiledCoursePage.jsx:46` says "Golf played here since 1456"; that is not in PRD.md and `Info.jsx` says 1895.

### 101. Audit: accessibility beyond #95/#96 (Medium unless stated)
- `Login.jsx:172` `<label>` has no `htmlFor` and does not wrap the input.
- `Setup.jsx:354,406,483,505,559` and `CourseEdit.jsx:179` (course select, course name, player names, date, notes, course-edit name) have no `aria-label` or association. `Settings.jsx` does this correctly.
- No error or status message is in a live region except `Home.jsx:63` `role="status"`: `App.jsx:162`, `Scorecard.jsx:232`, `Login.jsx:120,158`, `Settings.jsx:185,244`, `Setup.jsx:421`, `CourseEdit.jsx:199,225`. #93 covers only Login's resend.
- `History.jsx:234-296` nests `role="button"` spans inside the card's `<button>` (invalid, unreliable under assistive tech).
- Home tap targets: "Last round", "Want to save your scores? Sign in" and the Outbuild footer link are bare `text-xs` with no padding (~16px tall, estimated); the course page got `py-3 -my-3` in #78, Home did not (`Home.jsx:128-136,190-196,205`).
- Contrast (estimated): `text-chrome` #C0B8B0 on #F7F4EE is ~1.8:1 for inactive hole numbers and the Map/Decrement controls (`Scorecard.jsx:308,363,374`); Advance button #F7F4EE on #9A9189 is ~2.8:1 (`Scorecard.jsx:389`, Low); `placeholder:text-chrome` ~1.8:1 (`Login.jsx:183`, `Setup.jsx:564`, `Summary.jsx:373`, Low). This is what DESIGN.md prescribes, so it is a token-level decision, routed to the design-director (proposal only, no DESIGN.md change yet).
- Low: info icon button ~40px (`Home.jsx:76-80`, `BruntsfiledCoursePage.jsx:33-37`); Privacy/Rules inline links ~20px tall and `<a>` lacks the DESIGN.md focus-visible ring (`Privacy.jsx:3-15,83,97,109`, `RulesContent.jsx:49`); History delete button is `w-9 h-9` (36px) and reads "Delete game" while the UI says "round" (`History.jsx:301-302`); no `<main>` landmark on Scorecard, Summary, Login (and the `CourseEdit.jsx:136` area); focus-return missing on several sheets (see #80).

### 102. Audit: security hardening (Medium unless stated; no Critical, no secrets found in tracked files)
- **No security headers**: there is no `public/_headers`, so no CSP, frame-ancestors/X-Frame-Options, X-Content-Type-Options or Referrer-Policy from the repo. Dashboard-level settings were not checked. The session cookie is `SameSite=Lax` (HttpOnly, Secure), so this is hardening, not an open hole.
- **Magic and email-confirmation links are consumed on a plain GET** (`verify.js:14-22`, `confirm-email.js:24-26`), so a mail-security scanner that prefetches links could burn the token and the user would see "expired". Assumed, needs a real mail-flow test (see #106).
- **Google Fonts loaded on every visit** (`index.html:28-30`) sends visitor IPs to Google before interaction, while `Privacy.jsx` says two companies handle data and there is "no tracking". Self-hosting the fonts would close it. Legal weight assumed. Overlaps #41.
- Low: `verify.js:14-22` token check and mark-used are separate statements, so two parallel requests can both pass (fix: `UPDATE ... WHERE used = 0` and check `changes`; same class as #79); expired `sessions` rows are never deleted (`Privacy.jsx` says 30 days); personal Gmail hardcoded as the `ADMIN_NOTIFY_EMAIL` fallback (`users/index.js:210`, asserted in `users/index.test.js:422`; documented in PRD §11.11, but it is PII in source if the repo ever goes public); `.gitignore` ignores `.env*` but not `.dev.vars`; `EMAIL_RE` accepts `x<y@z.com>`; `email.js:42` logs the full Resend error body (may echo the recipient); tokens share one table with no type column, so sign-in and email-change links are interchangeable at the endpoint level (both need inbox control).

### 103. Audit: performance smells (flag only, no measurement; performance-auditor to measure later)
- **Medium** - the whole app renders a blank shell until `/api/auth/me` resolves or the 5s abort fires, including for signed-out quick-play users (`App.jsx:156`, `useAuth.jsx:34,38`).
- **Medium** - `GET /api/games` is `LIMIT 100` with no offset and returns every row's full `player_data`; History silently stops at 100 rounds with no notice (`games/index.js:12-20`). Needs a product decision on what happens past 100.
- Low: `react-zoom-pan-pinch` and `CourseMapModal` are statically bundled into the main JS (no `React.lazy` anywhere); render-blocking Google Fonts stylesheet with three families, the desktop-only Caveat downloaded by every mobile visitor (`index.html:30`, overlaps #41); `courses/index.js:19-22` correlated `round_count` subquery with no index on `games.course_id`, and no index on `courses.user_id`, `sessions.user_id` or `magic_tokens.email` (tiny tables today); History aggregations recomputed every render; every score tap writes the whole active game to localStorage synchronously (fine at 36 holes x 6 players). The `AuthContext` fresh-object point is already in #80.

### 104. Audit: test-coverage gaps
No test files for `Summary.jsx` (the save logic, cf. #95), `useAuth.jsx`, `share.js`, `ParStepperGrid`, `PlayerStar`, `Info`/`Privacy`/`Rules`, and the `logout` and `session` functions. Adds to the gaps already in #91 and #80.

### 105. Audit: stale or inaccurate documentation (log only, not corrected)
- BACKLOG #41 says bundle "~248 kB / ~76 kB gzip"; local `dist/` is 281,717 bytes raw / 81,123 gzip (dist is gitignored, indicative).
- BACKLOG #80 line refs are stale: Settings focus effect is now `Settings.jsx:86-94`, the storage banner is `App.jsx:162`, the notice banner is `Home.jsx:63`. See #100 for "parity" being true only for Settings and History.
- BACKLOG #86 says "Closing" but is still listed under Known issues (this file is open items only).
- PRD.md:731-733 §11.15 status still says "build in progress" and that the star is not yet on the Finish Game dialog; it is (`Scorecard.jsx:417`). Product-owner to update.
- DESIGN.md "Divergences" (~569-577) lists as pending items already fixed (`Scorecard.jsx:412` and `Login.jsx:117` opacity, the "no shipped buttons yet" focus-visible note), and refers to History "+ Add round" (code says "+ Add") and a `CourseEdit.jsx:25` "← Add Past Round" back button removed in #89.

### 106. Audit: debugger handoffs (not yet run)
- Suspected React render-phase state update in `Summary.jsx:61-64`: `navigate('home')` during render when no completed game resolves (e.g. `/summary` deep-linked with empty storage). Needs a dev-console repro to confirm the warning and whether the redirect is reliable under StrictMode.
- Magic-link "expired" for users whose mail client prefetches links (`verify.js:14-22`, `confirm-email.js:24-26`). Assumed; reproduction needs a real mail client or scanner. Links to #102.

### 107. Audit: performance-auditor handoffs (not yet run)
- App start gated on the 5s `/api/auth/me` timeout, static import of the pan-zoom library, render-blocking third-party font CSS. Needs LCP/first-paint on a throttled mobile profile; fits the #41 baseline.
- `GET /api/games` (LIMIT 100, full `player_data`) and `GET /api/courses` correlated `round_count` with no supporting indexes (`migrations/001-004`). Needs D1 timing at realistic row counts, plus the product question in #103.

### 108. Input and outline-button border contrast (~1.39:1) - design decision (design-director, 19 Sep 2026)
Found while proposing the sunlight-contrast fix (branch `fix/sunlight-contrast-tokens`, which deliberately left it out). The `border` token `#D9D0C4` is about 1.39:1 on the page background (hand-computed, not browser-measured), below the 3:1 that WCAG SC 1.4.11 expects for identifying a control's boundary. Inputs also differ from the page only by a faint fill. Buttons carry text labels, so they are the lesser concern; inputs are the weaker case. Fixing it would change the app's warm-hairline character across the whole UI, so it needs a design-director call on whether to darken `border` for controls only (leaving decorative hairlines alone) or accept the current look. Not actioned.
