# Backlog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> A to-do list, so nothing gets forgotten. Open items only.
> - **Removing:** whoever finishes an item deletes its line in the same commit as the change (the project-manager for large changes, the main session for small ones). Add a `CHANGELOG.md` note only if it was a decision or a reversal.
> - **Adding:** you ask; the project-manager adds genuine follow-ups from a large change; Critical/High review and audit findings are added. Lower findings stay in the chat report until you triage them.
> - **Entries are short:** what needs doing, not the history. Nothing here is actioned without explicit instruction.
> - **IDs are stable and never reused**, even after an item is deleted, so gaps are expected. Next free ID: **#112**.

**Last updated:** 19 September 2026

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
- **Decided 19 Sep 2026:** signed in, the header shows the gear and Settings gets an "About" row that links to the Info page; signed out, the info icon stays (no Settings to fold into). Needs a PRD §4.8 update.
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
The placeholder gmail is already gone: `Privacy.jsx` uses `scorecard@outbuild.uk`, and the Info page (PRD §4.8) currently has no contact `mailto:` at all. Decide whether the Info page should carry a contact link, and confirm `scorecard@outbuild.uk` is the address to standardise on (PRD §4.8 and earlier notes assumed `hello@outbuild.co`). Align both pages and the PRD once decided. **Decided 19 Sep 2026:** standardise on `scorecard@outbuild.uk` and add a `mailto:` link to the Info page; update PRD §4.8 to match.

### 13. Official Bruntsfield logo
Add the club's official logo (likely Home or the course info section) once permission to use it is obtained.

---

## Known issues

### 43b. Back-nav polish - still open (follow-ups from the #43 build)
- **D1-round gap:** the `gameId` re-resolution only covers local/quick-play rounds (looked up in `localStorage`). A browser back/forward bounce, or Setup's edit-cancel, landing back on a signed-in D1-only round opened from History (never saved locally) still falls back to the most recently completed *local* game, same as before this build — there's no `GET /api/games/:id` to re-fetch a single D1 round by id. Low priority (narrow path: sign in, open a past round from History, tap Edit, cancel before starting the scorecard, or a raw browser bounce) — would need a new API endpoint if it's worth closing.
- `pastRound` isn't persisted in history state, so a browser back/forward bounce onto the "Add Past Round" Setup screen re-renders it titled "New Game" with no date field (cosmetic; the past round is already saved by then; no worse than pre-#43 behaviour). Add `pastRound` to the `navigate` allowlist in `App.jsx` if that path is worth polishing.
- `Setup.edit-recovery.test.jsx` covers the abandoned-edit guard directly; `App.test.jsx` now also drives it through a real `popstate` bounce, and `Login.test.jsx` covers the "← Home" label. Still no render test for the `goBack()` fix itself.


### 56. Length-changing course switch during a D1 past-round edit leaves a stale-size grid
Surfaced in the #48–#55 code review. `buildEditGame` sizes the edit grid to the *round's saved* hole count, not the newly-selected course's. Switching a 36-hole round onto a 9-hole course mid-edit (D1 rounds only — local rounds can't change course) leaves a 36-row grid with holes 10–36 padded back to par 3. No crash, no data loss, but confusing. **Decided 19 Sep 2026:** disallow a length-changing course switch during an edit (offer only courses with the same hole count). Small fix in Setup's edit flow; needs a PRD §11.7/§11.13 note and a localhost check. (PRD §11.7, §11.13.)

### 90. Header top padding on mobile — reduced, needs on-device confirmation
From the 11 September 2026 UI/UX review. Reported across mobile screens, not confirmed at pixel level via desktop emulation (doesn't render iOS status bar/notch chrome). Fixed 11 September 2026: `PageHeader.jsx`'s top padding reduced `pt-10` → `pt-6` (an existing DESIGN.md spacing token, not an invented value). Still needs a quick on-device visual check to confirm it reads right with real iOS status-bar/notch chrome. Low priority.

### 95. Signed-in "Done" silently loses the round if the save to D1 fails (HIGH - full audit, 19 Sep 2026)
`Summary.jsx:132-153`: for a signed-in user, "Done" POSTs the round to `/api/games`. A non-OK response or network error is ignored (empty catch, `res.ok` never checked) and `navigate('home')` runs regardless. The round then exists only in localStorage. Signed-in History reads D1 only (`History.jsx:16,50`), Home's "Last round" shows for signed-out users only (`Home.jsx:126`), and nothing retries the sync, so the round is invisible to the user with no message. Realistic on a golf course with patchy signal. There is no recovery path because #8 (history import) is not built. Needs a product/scope call (show an error and stay on Summary, retry, or queue for later sync) - likely project-manager scoping. Not actioned. (PRD §11.)

**Scoped and decided 19 September 2026 (project-manager plan + user decisions; not yet built, needs a PRD update first).** Size: Large. Chosen approach: project-manager's "B + C" - mark a failed round as pending locally, re-sync automatically, and show pending rounds in History. Rough effort (Estimated) about 3 days. No backend change needed: `POST /api/games` is already idempotent on `client_round_id` (UNIQUE(user_id, client_round_id), migration 002) and Summary already sends it.
1. **On failure the user chooses:** Retry, or "Keep on this device and go home" (never trapped with no signal).
2. **Visibility:** unsaved rounds appear in signed-in History with a "Not yet saved" badge. This needs a narrow, marker-gated exception to PRD §11.9 ("strictly separate, no merging"); delete, edit and dedupe-on-sync of a pending round are new cases, and the 100-row D1 cap interacts with the merged ordering.
3. **Retry:** automatic on app open and when signal returns (`online` event), guarded against double-firing. No user action needed.
4. **Rejections:** a permanent 400 (e.g. course deleted) or a 401 (session expired) keeps the round locally and flags it, never deletes it. 401 waits for the user to sign in again.
5. **Shared device:** a pending round is tagged with the user who played it and only syncs when that user signs in.
6. **#8 stays separate**, but the pending marker should be designed so #8 can reuse it later.
Findings to carry into the build: `synced` alone cannot mark a failed save (it is undefined on every quick-play round, so signed-in failures would look identical to pre-sign-in quick-play rounds - a new marker such as `pendingSyncUserId` is needed); PRD §11.8 says a failed POST "can be retried on the next Summary visit" but no path reaches that Summary again (PRD to be corrected); `Scorecard.jsx:215` `synced: true` oddity is logged in #111. Build sequence: product-owner updates PRD §11.8 and §11.9 first; frontend-developer builds in pieces (marker + Summary error handling, then the sync runner, then History visibility); code-reviewer; human localhost review with `/api/games` blocked or offline; PRD alignment check; CHANGELOG and BACKLOG. Suggested branch: `fix/summary-save-failure-retry`.

### 96. Scorecard scoring cells not reachable by keyboard or screen reader (HIGH - full audit, 19 Sep 2026)
`Scorecard.jsx:317-319`: choosing a hole to score is a `<td onClick>` with no role, `tabIndex` or key handler. Keyboard, switch and screen-reader users can only move forward with Advance and cannot jump back to correct an earlier score. The header, +, - and Advance buttons are fine. This is the app's core interaction. Not actioned.

---

## Housekeeping & tech debt

### 91. Signed-in identity in gameplay (#5) - code-review housekeeping (CLEAR WITH NOTES, 18 Sep 2026)
Minor items logged from the Phase 2 review of `feat/signed-in-identity-gameplay` (PRD §11.15); none block. (The two test-coverage gaps originally listed here - a star render assertion and an explicit `pastRound` pre-fill test - were closed on 19 September 2026 by `chore/test-coverage-gaps`.)
- **`PlayerStar`'s `aria-label="You"` may fold into the History filter-chip button's accessible name** (e.g. announced as "Alice You" rather than "Alice" with a separate marker), since the star sits inside the `<button>` alongside the plain-text name. Not wrong, but wasn't an explicit accessibility decision — worth a quick screen-reader spot-check.

### 110. Remove-player (✕) touch target below 44px guideline
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
Measure and tune actual load performance — Core Web Vitals (LCP, CLS, INP), bundle size (currently ~282 kB / ~82 kB gzip as of 19 September 2026), font loading (three families via Google Fonts with `display=swap`), image weight (`course_map_v2.png` is ~455 kB), and Cloudflare Pages caching headers. Establish a baseline, fix the obvious wins, re-measure. Assistance requested.




### 78. `BruntsfiledCoursePage.jsx` discreet-link spacing (residual)
The tap-target growth shipped 8 September 2026 - all three foot-of-page links ("Last round", "Sign in", "← Golf Scorecard home") now use `inline-block py-3 -my-3` with the wrappers spaced so the hit boxes don't overlap. The missing `track()` event and missing render/interaction test were fixed 11 September 2026 (`BruntsfiledCoursePage.test.jsx` added; home link now fires `Bruntsfield Home Link Clicked`, the first click/nav-exit event in an otherwise domain-state-event taxonomy - worth a glance if a second one shows up). Still open, low priority: the discreet-link stack sits closer to the primary-button block above (~4px hit-box clearance) than the links sit to each other (~32px) - deliberate, but if a 4th discreet link is ever added the spacing model should be revisited.

### 79. Magic-link abuse protection — revisit if abuse is observed
#14 (shipped 8 September 2026) added a per-email throttle: `POST /api/auth/request-link` rejects with `429` at 5+ unclaimed links per address per 15 min. Residual surface: ~480 emails/day to a single targeted inbox is still possible, and there is no global or per-IP cap (magic_tokens deliberately stores no IP), so distributed abuse across many victim addresses is unthrottled, and the throttle is soft under concurrency (TOCTOU — N parallel requests can each read a count under the cap). All acceptable at current scale. If abuse is seen: add Cloudflare Turnstile on the login form, or a Cloudflare WAF rate-limit rule on the endpoint. Separately: the #14 window relies on `magic_tokens.expires_at` being exactly issued + 15 min — if a longer-lived link type is ever added, give the table a real `created_at` column so the throttle can be explicit. Low priority until abuse is observed.

### 80. Settings panel (#4) - code-review housekeeping (CLEAR WITH NOTES, 8 Sep 2026)
Minor items logged from the Phase 2 review of `feat/user-profile-foundation`; none block. All low priority.
- **Neither sheet has a focus trap or focus-return.** `aria-modal="true"` makes assistive tech treat the background as inert, but Tab can still leave the dialog, and closing it does not return focus to the trigger. Acceptable at this app's scope; revisit if a keyboard-heavy flow lands.
- **DESIGN.md's dialog-semantics "no exceptions" wording doesn't fully match Settings.jsx.** (From the 11 Sep 2026 dialog-parity review.) The new pattern block states the close handler "lives in one named function... so the three paths can never drift apart", but Settings.jsx's pre-existing "Keep my account" button calls `() => setConfirmDelete(false)` inline rather than the file's own `closeDelete()`. Harmless (the button is disabled while `deleting`), but either tighten Settings.jsx to call `closeDelete()` or soften the DESIGN.md wording.
- **`History.jsx`'s Delete button has no in-flight guard.** (From the 11 Sep 2026 dialog-parity review.) `executeDelete` awaits a fetch for DB-backed games but the button isn't disabled and shows no "Deleting…" state meanwhile, unlike Settings.jsx's `deleting`-gated equivalent. Pre-existing, low risk (a rapid double-tap could in theory fire two DELETE calls), but now sits next to a DESIGN.md section citing Settings.jsx as the reference pattern for this exact sheet.
- **No render test for `History.jsx`'s delete-sheet dialog semantics.** (From the 11 Sep 2026 dialog-parity review.) Settings.jsx has a dedicated test covering labelled-dialog role, autofocus and Escape/backdrop close (`Settings.test.jsx:185`); `History.jsx` now has the identical behaviour but no equivalent test — only the player-filter feature is covered in `History.test.jsx`.
- **Settings delete-sheet focus effect re-pulls focus when `deleting` flips true** (`Settings.jsx` ~63-71, deps `[confirmDelete, deleting]`). Harmless since the input stays mounted, but focus jumps back to it mid-delete. Gate the `.focus()` on the open transition only if it ever annoys.
- **Stacked accent banners.** An active `!storageOk` banner (`App.jsx:152`) plus the `?email=` notice banner (`Home.jsx:62`) would render two full-width accent bars at once. Very unlikely combo, cosmetic.
- **`replaceState` on a recognised `?auth=` / `?email=` param strips the whole query string** (`useAuth.jsx:30`), including any unrelated params. Pre-existing behaviour, no impact today (the app uses no other query params).
- **`AuthContext` value is a fresh object literal every render** (`useAuth.jsx:100`). Every consumer re-renders on any auth state change. The new Home capture effect is safe regardless because it keys on the referentially-stable `useState` setter, but the context value could be wrapped in `useMemo` if a perf pass ever wants it. Trivial at current scale, not worth a perf pass on its own.

From the #84 review (email-disclosure, CLEAR WITH NOTES, 9 Sep 2026), same low-priority tier:
- **No focus-return when the "Change email address" form collapses.** Tapping "Keep my current email" unmounts the form and focus falls to `<body>` — should return to the "Change email address" trigger. Same class as the focus-return gap above; the disclosure adds a second instance.
- **"Keep my current email" link is ~40px tall** (`Settings.jsx` ~257-264, `py-2.5` + `text-sm`), just under the 44px guideline. Identical to the existing "Delete my account" link right below it — same tap-target class as the links fixed 11 September 2026, but this one wasn't part of that batch.

### 82. Email-change / account-deletion edge cases (from the #3 backend review)
Two narrow wrinkles in `functions/api/users/index.js` / `confirm-email.js`, both low priority, logged so they aren't lost:
- **Deletion clears an unrelated party's unclaimed sign-in token.** `DELETE /api/users` removes `magic_tokens` rows matching the user's `email` *or* `pending_email`. If user A has an email change pending to address Y, and the owner of Y has separately requested a sign-in link (to make their own account) that's still unclaimed, deleting A's account also burns Y's token. Self-healing — Y just requests another link — and the path is very narrow. Scope a fix only if it ever bites.
- **No index on `users.pending_email`.** `confirm-email` does `SELECT id FROM users WHERE pending_email = ?` on every click. The table is tiny so a scan is free today; add the index in the next migration that touches `users` if the user base ever grows.

---

### Full-codebase audit, 19 September 2026 (#97-#109, #111) - lower findings, short form
From the first `/full-audit`. Contrast ratios and tap sizes are hand-computed estimates, not browser measurements; nothing was screen-reader tested; `npm audit` was not run. The High findings are #95 and #96 above.

### 97. Dead code - remainder (Low)
`EMAIL_RE` in `functions/_lib/email.js:10` stays exported because tests import it. `README.md` is effectively empty (11 bytes) and needs content, not deletion.

### 98. Duplicated logic (Medium/Low)
- Magic-link throttle, TTL, token INSERT and email send duplicated in `auth/request-link.js` and `users/index.js`.
- `player_data` payload built twice (`Scorecard.jsx` `buildPlayerData`, `Summary.jsx`).
- `share.js` `winnerLabel` re-implements `tiedNames` and the tie wording from `result.js`.
- `Home.jsx` and `BruntsfiledCoursePage.jsx` are near-copies; Home lacks the tap-target fixes from #78.
- Low: session cookie regex x3 and cookie header strings x3; "+ New course" reset handler in `Setup.jsx`; two resend POSTs in `Login.jsx`; external-link SVG inlined ~5 times; hole count `36` in five places; par band 2-7 defined three times; client email regex looser than server `EMAIL_RE`; security-notice email re-inlines the branded shell.

### 99. Error handling that shows false success or a misleading state (Medium)
- `History.jsx`: delete ignores `res.ok`; games fetch has no `res.ok` check (a 401/500 shows "No rounds yet"; one bad `player_data` row blanks the list).
- `Setup.jsx`: courses fetch has no 401 handling (expired session shows "No courses yet"); clearing the date field throws a RangeError so "Enter scores" silently does nothing; date defaults use the UTC date (wrong 00:00-01:00 BST).
- `Scorecard.jsx:222-224`: ignores a failed `saveCompletedGame` (quota/blocked storage) then clears the active game.
- Low: `logout()` has no try/catch (`Info.jsx`, `useAuth.jsx`).

### 100. Inconsistent patterns (Medium/Low)
- Medium: no dialog semantics on the Finish sheet (`Scorecard.jsx:403`), delete-course sheet (`CourseEdit.jsx:238`) and `CourseMapModal.jsx` (no role, `aria-modal`, Escape, focus).
- Medium: stale copy in `Settings.jsx:174` ("...not shown on any scorecard yet"); the name is now shown.
- Low, backend: unhandled 500 on a null or non-string JSON body (`request-link.js`, `courses/index.js`, `games/index.js`); `games` POST does not cap `notes` or validate `client_round_id`; `games/[id].js` DELETE lacks `AND user_id = ?`; `me.js` returns `{ user: null }` with 401; mixed semicolon style.
- Low, frontend: ErrorBoundary button styling and no logging (`App.jsx`); `useAuth.jsx:30` wipes the history stamp; back labels lack the arrow; empty-score glyph differs from DESIGN.md's em dash; `MAX_STROKES` declared inside `Scorecard`; `createGame`/`buildEditGame` take 6-7 positional args; "Bruntsfiled" filename typo; large `Setup.jsx`, `Scorecard.jsx`, `Summary.jsx`.
- Content flag: `BruntsfiledCoursePage.jsx:46` says "since 1456" (not in PRD; `Info.jsx` says 1895).

### 101. Accessibility beyond #95/#96 (Medium unless stated)
- Missing accessible names: `Login.jsx:172` label lacks `htmlFor`; `Setup.jsx` and `CourseEdit.jsx` inputs, select, date and notes.
- No live regions for errors/status app-wide (only `Home.jsx:63`); #93 covers Login only.
- `History.jsx:234-296` nests `role="button"` spans inside a `<button>`.
- Home tap targets are ~16px ("Last round", "Sign in", Outbuild link; `Home.jsx`).
- Low: info icon ~40px; Privacy/Rules links ~20px with no focus ring; History delete is 36px and says "Delete game"; no `<main>` on Scorecard, Summary, Login; missing focus-return (see #80).

### 102. Security hardening (Medium unless stated; no secrets found)
- No security headers (no `public/_headers`: CSP, frame-ancestors, X-Content-Type-Options, Referrer-Policy).
- Magic and email-confirm links are consumed on GET, so a mail scanner could burn them (Assumed; see #106).
- Google Fonts on every visit sends IPs to Google, against the "no tracking" copy; self-host the fonts (overlaps #41).
- Low: token check and mark-used not atomic (`verify.js`); expired `sessions` rows never deleted; personal Gmail hardcoded as `ADMIN_NOTIFY_EMAIL` fallback (`users/index.js:210`); `.dev.vars` not in `.gitignore`; permissive `EMAIL_RE`; full Resend error logged; tokens have no type column.

### 103. Performance smells (flag only; not measured)
- Medium: blank shell until `/api/auth/me` resolves or 5s abort (`App.jsx:156`, `useAuth.jsx`). Decided 19 Sep 2026: leave the `GET /api/games` `LIMIT 100` cap as it is (History silently stops at 100 rounds); revisit if anyone nears 100.
- Low: pan-zoom library statically bundled; render-blocking Google Fonts CSS; missing indexes (`games.course_id`, `courses.user_id`, `sessions.user_id`, `magic_tokens.email`); History aggregations every render.

### 104. Test coverage - remainder (Low)
No tests for the `Info`, `Privacy` and `Rules` pages, or the `logout` and `session` Pages Functions. Summary tests for a failed save and share failures wait on #95 and #111.

### 105. Stale documentation (Low)
BACKLOG #80 line refs (Settings focus effect now `Settings.jsx:86-94`, storage banner `App.jsx:162`, notice banner `Home.jsx:63`); PRD §11.15 status still says "build in progress" and that the star is not on the Finish dialog (it is); DESIGN.md "Divergences" (~569-577) lists items already fixed and a removed "← Add Past Round" back button.

### 106. Magic-link prefetch investigation (not yet run)
Check whether mail-security scanners burn the single-use link (`verify.js:14-22`, `confirm-email.js:24-26`), leaving the user on "expired". Needs a real mail client or scanner. Links to #102.

### 107. Measure performance (not yet run)
App-start auth gating, bundle and font loading (LCP on a throttled mobile profile, fits #41), and D1 timings for `GET /api/games` and `GET /api/courses` at realistic row counts.

### 108. Input and outline-button border contrast (design decision)
`border` `#D9D0C4` is ~1.39:1 on the page background, below the 3:1 WCAG expects for control boundaries (estimate). **Decided 19 Sep 2026:** darken borders on inputs only, via a new stronger border token for form fields; decorative hairlines stay light. Design-director proposes the value, then a localhost check.

### 109. Redirect-to-Home uses pushState (Low)
The no-data redirects in `Summary.jsx`, `Scorecard.jsx` and `Settings.jsx` push history, so Back from Home returns to the page that bounced (a Back loop); StrictMode also pushes twice in dev. Needs a `replace` option on `navigate` in `App.jsx`; affects three pages and the popstate tests. Related: #43b.

### 111. Smaller findings from the #104 tests (Low)
- `Summary.jsx:117-125` `alreadySaved` re-POST guard is unreachable and its comment stale; tidy when #95 reworks it.
- Share failures give no feedback (`Summary.jsx:167-172`); needs an intended-behaviour decision.
- `share.js` `winnerLabel` says "1 strokes" for a winning total of 1.
- `Scorecard.jsx:215` sets `synced: true` on a locally edited round without POSTing it (unreachable for signed-in users today), so `synced` is not a trustworthy "on the server" flag; matters for #8 and #95.
- Possible race, Assumed and probably unreachable: Done tapped before `/api/auth/me` resolves skips the save (`Summary.jsx:125`).
