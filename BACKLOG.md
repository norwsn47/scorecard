# Backlog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> Open items only — ideas, deferred work, and known issues not yet done.
> When something ships, delete its line and add a note to `CHANGELOG.md`.
> Nothing here is actioned without explicit instruction — tell the project-manager (or Claude directly) to pull an item into work.
> Numbers are stable IDs for cross-reference — don't renumber existing items when deleting one, so gaps are expected.

**Last updated:** 11 September 2026

> The history of shipped and removed items lives in `CHANGELOG.md`. This file is open items only.
>
> Still-relevant status notes: #40 needs a product-owner PRD decision before build. #42 (Google sign-in) is Blocked on an external Google Cloud OAuth client. #31 (analytics / GA4) is Blocked on a privacy/consent decision — route (a)/(b)/(c) must be chosen before any build. #39/#64 (end-of-round tally) were built and removed the same day — nothing remains; PRD §5.2 is a "removed" stub.

---

## Features not yet built

### 1. Course map reliability
From the July 2026 feedback list. The loading/error state on `CourseMapModal.jsx` shipped 8 September 2026 (instant "Loading map…" placeholder, fade-in on load, error message on failure, cached-image guard). Remaining part: **a previous implementation attempt was flagged wrong by the user and reverted — needs a fresh approach before restarting.**
- The map button in `Scorecard.jsx` only renders when a game was started from the `/bruntsfield-short-course` route. A user who starts from the generic home "New Game", or a signed-in user who picks Bruntsfield from the course selector, never sees it. Show the button whenever the active game's course is Bruntsfield (by course name/id, not by navigation route). Note: this reverses a deliberate Wave 5 scoping decision.

### 2b. Sign-in email — inbox sender name (manual, not code)
The email copy/wordmark now read "Scorecard by Outbuild" (shipped 1 Sep). Remaining: the inbox *sender name* is set by the `RESEND_FROM_EMAIL` env var format — set it to a `Scorecard by Outbuild <address>` display-name format via the Cloudflare Pages dashboard (Settings → Environment variables). No code.

### 5. Signed-in identity in gameplay
Foundation (#3 profile backend, #4 Settings panel) shipped 8 September 2026 — this is now unblocked. PRD §8, forward-referenced from §11.14.
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


### 40. Optional match-play game mode (win each hole)
A game-mode toggle at setup: **stroke play** (current — lowest total wins) or **match play** (win the most holes; each hole won by the lowest score, halved on a tie). Changes the winner calculation, the Summary, and the share image. Explicitly flagged by the user as a future edition. PRD §5 change needed.

### 83. Home (signed in) — fold Settings into the header icon
When signed in, Home shows a "signed in as…" state plus a standalone **Settings** button that the user considers redundant. Swap the header **info (ℹ) icon for a settings (gear) icon** that opens the Settings screen, and drop the standalone Settings button.
- **Open question for the product-owner before build:** where the **Info page** (PRD §4.8) is then reached from — move its entry point into Settings, keep an info affordance elsewhere, or show the settings icon only when signed in and keep the info icon when signed out. Resolve first.
- Frontend-only once decided; likely small. Related: #5 (signed-in identity), #4 (Settings panel, shipped).

---

## Blocked / waiting on a decision or something external

### 31. Set up analytics — user wants Google Analytics (GA4); blocked on a privacy/consent decision, not on work
**The user has asked for this directly (GA4 specifically, assistance requested).** It is not blocked on engineering effort — the build is ~2-3 hours — but on one decision that must be made first, because GA4 conflicts with a deliberate product stance. Blocked until the route below is chosen (product-owner + user call).

**The conflict:** GA4 sets cookies. Under UK PECR + UK GDPR that normally requires a consent banner, which the app has deliberately never had. The "Your data" privacy page and `Info.jsx` both currently state there is **no tracking or analytics at all** (PRD §4.8 links to that page). Adding GA4 as-is would make both pages false.

**Pick one before any code (product-owner + user call):**
- **(a)** GA4 with a consent banner — accept the banner, rewrite the privacy page / `Info.jsx` copy and PRD §4.8.
- **(b)** GA4 in a cookieless / consent-exempt configuration — no banner, but reduced data; still needs the privacy copy updated to name GA as a processor.
- **(c)** A cookieless tool (Plausible / Fathom) — no banner, minimal privacy-copy change. **The scaffolding already targets this route:** `src/utils/analytics.js` is a `track()` wrapper around `window.plausible?.(...)` (currently a silent no-op) and `index.html:32` has the Plausible `<script>` commented out, ready to enable.

**Already done (whichever route is chosen):** events are instrumented app-wide — New Game Started, Game Completed (player count, holes), Scorecard Shared, Game Edited.

**Build steps once the route is chosen:**
- Wire the tool: for GA, swap `analytics.js` to the `gtag` API and add the script to `index.html`; for Plausible, just uncomment `index.html:32` and set `data-domain`. Create the account either way.
- Update `Info.jsx` + `Privacy.jsx` copy and PRD §4.8 to state exactly what is collected and by whom (and add/justify a consent banner if route (a)).
- Confirm Cloudflare Pages' built-in analytics are on for basic traffic data regardless.

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
- `Setup.edit-recovery.test.jsx` covers the abandoned-edit guard directly; `App.test.jsx` now also drives it through a real `popstate` bounce, and `Login.test.jsx` covers the "← Home" label (both tracked under #35). Still no render test for the `goBack()` fix itself.
- **Scorecard "Pause" — no confirmation dialog.** Flagged during the 5 Sep build, not decided: tapping it leaves the app with no confirmation, unlike Finish Game. Scores are autosaved so no data is lost either way, but it's still an accidental-tap risk. Worth a product-owner/user call on whether it needs a guard.


### 56. Length-changing course switch during a D1 past-round edit leaves a stale-size grid
Surfaced in the #48–#55 code review. `buildEditGame` sizes the edit grid to the *round's saved* hole count, not the newly-selected course's. Switching a 36-hole round onto a 9-hole course mid-edit (D1 rounds only — local rounds can't change course) leaves a 36-row grid with holes 10–36 padded back to par 3. No crash, no data loss, but confusing. Needs a product decision: disallow a length-changing course switch during an edit, or accept it and document the behaviour. (PRD §11.7, §11.13.)

---

## Housekeeping & tech debt

### 25. Crisper course map image — blocked on a better source asset
`public/course_map_v2.png` is only 443×600px (~444 KB). `CourseMapModal.jsx` displays it at ~320px wide and zooms to 4× (~1300px effective demand), so it is inherently soft on any retina screen — the modal code itself is fine. The fix is purely a better asset: a higher-resolution scan/export (ideally ≥1600px on the long edge) or an SVG/vector from the club. Nothing to do in code until that exists. Overlaps with #13 (official logo) and #1 as things to request from Bruntsfield in one go. (Distinct from #1, which is about when the map appears and its loading state.)

### 60. Product-owner pass over §4.8 and its overlap with the privacy page
Split out from the old #59. §4.8 (Information page) and §11.12 / the "Your data" privacy page (`Privacy.jsx`) describe overlapping things — what the info page contains, what the privacy page contains, where the data explanation lives. The 3 Sep cleanup made both accurate individually but the split between them is implicit. A proper product-owner pass would make §4.8 and §11.12 explicitly complementary. Low priority — both are accurate as they stand.

### 35. Render/flow test coverage — harness landed, more flows to cover
The React Testing Library harness is in (`vitest.setup.js`, `setupFiles` in `vite.config.js`, `@testing-library/react` + `jest-dom` + `user-event`). Covered so far: `ParDelta` (§5.3 notation + colour override), the `History` player filter (#51/#61), **the edit-past-round flow (#22)** — `Scorecard.edit.test.jsx` — the `CourseEdit` screen incl. its 401 branch (#75), **`Login.jsx`** + **`PageHeader`** (`Login.test.jsx` / `PageHeader.test.jsx`), and (8 Sep 2026) **SPA navigation** — `Scorecard.spa-nav.test.jsx` pins the #17 no-active-game bounce (effect-not-render, no React error) and `App.test.jsx` drives the router end to end: deep-linked `/scorecard` → Home (#17), a `popstate` bounce onto a param-less Setup discarding a stranded edit → History (#18), and plain page restore on `popstate` (#43). Still no render coverage for:
- **`Setup` course creation** — the 9/18 radiogroup (#57) and the par stepper clamp (#58). The `<select value=… >` "+ New course" option is a command not a real selection, which `userEvent.selectOptions` / `fireEvent.change` don't drive cleanly in jsdom — needs either a small refactor of that control or a workaround before it's testable.
- **`Login.jsx` authError-from-context path** — the `?auth=expired|error` redirect surfacing as an inline message. Needs App's loading gate simulated (Login only mounts after the auth check resolves), so it wasn't covered in the 8 Sep pass.
Fold #58 in here (par stepper — `ParDelta` markup is now covered; the stepper isn't).

### 41. Page load performance pass
Measure and tune actual load performance — Core Web Vitals (LCP, CLS, INP), bundle size (currently ~248 kB / ~76 kB gzip), font loading (three families via Google Fonts with `display=swap`), image weight (`course_map_v2.png` is ~455 kB), and Cloudflare Pages caching headers. Establish a baseline, fix the obvious wins, re-measure. Assistance requested. (The `performance-auditor` agent covers this.)




### 58. Par stepper render test — folded into #35
The `ParDelta` markup is now covered (`src/components/ParDelta.test.jsx`). The `Setup.jsx` `stepPar` 2–7 clamp still isn't — tracked under #35 (blocked on the "+ New course" select being hard to drive in jsdom).

### 78. `BruntsfiledCoursePage.jsx` discreet-link follow-ups
The tap-target growth shipped 8 September 2026 - all three foot-of-page links ("Last round", "Sign in", "← Golf Scorecard home") now use `inline-block py-3 -my-3` with the wrappers spaced so the hit boxes don't overlap. Still open, all low priority: the home link has no `track()` analytics event (other nav actions on the page do); there is no render/interaction test for `BruntsfiledCoursePage` (its conditional links - active game, last round, signed-in Past Rounds - are all uncovered); and the discreet-link stack now sits closer to the primary-button block above (~4px hit-box clearance) than the links sit to each other (~32px) - deliberate, but if a 4th discreet link is ever added the spacing model should be revisited.

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
- **"Keep my current email" link is ~40px tall** (`Settings.jsx` ~257-264, `py-2.5` + `text-sm`), just under the 44px guideline. Identical to the existing "Delete my account" link right below it (#34 territory), so consistent with the established pattern rather than new.

### 81. PRD §11.2 says `SameSite=Strict`; the session cookie has always been `SameSite=Lax`
`verify.js`, `logout.js` and the new `DELETE /api/users` all set `session=…; SameSite=Lax`, and have since launch — magic-link sign-in returning from an email client needs at least `Lax`. PRD §11.2 still documents `Strict`. The code is right; this is a PRD-to-match fix. Reconcile §11.2 to `Lax` with a one-line note on why. Doc-only, low priority.

### 82. Email-change / account-deletion edge cases (from the #3 backend review)
Two narrow wrinkles in `functions/api/users/index.js` / `confirm-email.js`, both low priority, logged so they aren't lost:
- **Deletion clears an unrelated party's unclaimed sign-in token.** `DELETE /api/users` removes `magic_tokens` rows matching the user's `email` *or* `pending_email`. If user A has an email change pending to address Y, and the owner of Y has separately requested a sign-in link (to make their own account) that's still unclaimed, deleting A's account also burns Y's token. Self-healing — Y just requests another link — and the path is very narrow. Scope a fix only if it ever bites.
- **No index on `users.pending_email`.** `confirm-email` does `SELECT id FROM users WHERE pending_email = ?` on every click. The table is tiny so a scan is free today; add the index in the next migration that touches `users` if the user base ever grows.
