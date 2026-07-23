# Build Plan
## Scorecard by Outbuild

**Last updated:** 23 July 2026 (Chunks 33-34 complete; urgent hotfix — production deep-link 308 redirect)

> All planned work through Phase 4 (Chunks 1–29) and Wave 5 (Chunks 30–32) is complete and archived in BUILDPLAN-ARCHIVE.md.

## Hotfix log

**23 July 2026 — Production 308 redirect on deep-linked routes. RESOLVED.** Reported urgently by the user: direct navigation to `https://scorecard.outbuild.uk/bruntsfield-short-course` (and other routes) returned an HTTP 308 redirect to the bare domain root instead of loading the app. Investigated via the debugger agent and extensive live Cloudflare dashboard checks with the user — app code, build output, DNS, Redirect Rules, Page Rules, Bulk Redirects, and Pages build configuration were all confirmed correct. Root cause narrowed to `public/_redirects`'s enumerated per-route format; fixed by switching to the standard Cloudflare Pages SPA wildcard rule (`/* /index.html 200`). Confirmed by the user: deep links now load correctly.

**Follow-on regression, same day — magic-link sign-in broken. RESOLVED.** The `_redirects` wildcard fix above appears to have also intercepted `/api/auth/request-link` before it reached the Cloudflare Pages Function, despite general Cloudflare docs stating Functions take priority — likely a nuance of this project's Pages "Build system version 3". Fixed by adding `public/_routes.json` (`include: ["/api/*"], exclude: []`), explicitly scoping Functions eligibility to the API routes and removing any ambiguity with `_redirects`. Confirmed by the user: sign-in works again. Lesson for future hosting-config changes: verify both the target symptom *and* adjacent functionality (especially `/api/*`) before considering a routing fix complete.

---

## Current status

Wave 6 defined below — not yet started. Scoped from a 15-item feedback/bug/feature list provided by the user on 23 July 2026. Triage, grouping, and chunk order are pending user confirmation before any coding begins.

---

## Stack

Vite + React · Tailwind CSS · localStorage · Cloudflare Pages · Cloudflare D1 · Cloudflare Pages Functions · Resend

---

## Version control

Mode C — Git + GitHub (full). See CLAUDE.md for rules.

**Flag:** the current session branch (`claude/game-app-ui-auth-h2kngb`) is a session-assigned name and does not meet CLAUDE.md's hard branch-naming rule. No coding has happened yet, so nothing needs fixing retroactively — but a properly named branch (`feat/`, `fix/`, `chore/`, `refactor/`, or `security/` prefix) must be created before Wave 6 work starts, per chunk.

---

## Wave 6 — User feedback batch (23 July 2026)

Source: 15-item list from the user (bugs, small features, one backend-touching feature set). Two items were explicitly deferred to backlog by the user at the time of request (see BACKLOG.md items 13–14). Item 15 (GDPR statement on Info page) was judged suitable to action now rather than defer — see rationale below chunk 33.

**Track A runs as UI feedback mode** (per project-manager rules) — cosmetic/layout-only changes, single bundled review and commit. **Track B runs as the standard build loop** — one chunk per logical change, each through the full completion gate.

---

### Chunk 33 — UI feedback pass: sign-in & scorecard polish
**Status: Complete (23 July 2026)**
**Mode: UI feedback (bundled, single review/commit)**

Covers user items 1, 2, 3, 4, 12, 15. All cosmetic/layout — no data model or logic changes.

- **Item 1 — Email autofill/autocomplete (verify only):** `Login.jsx` already sets `type="email"` and `autoComplete="email"`. No code change expected — confirm on a real device during this pass and close out.
- **Item 2 — Email field position:** move the email input higher on the sign-in screen so the iOS keyboard doesn't obscure it. Likely means trimming/collapsing the heading and value-prop copy above the form, or restructuring so the input sits above the fold on a standard iPhone viewport with keyboard open.
- **Item 3 — New Game name entry overflow:** root cause identified in `Setup.jsx` — the "new course name" input (shown to logged-in users creating a course) is a flex child without `min-w-0`, which can force it wider than its flex container. Add `min-w-0` (or equivalent) so it stays within the content wrapper. Verify against the reported case (logged-in, New Game, creating/entering a course name).
- **Item 4 — Header centering:** `PageHeader.jsx` currently centres the title between the back button and right-side slot (flex layout), not against total page width. `DESIGN.md` already specifies the correct pattern (title absolutely positioned, `inset-x-0 text-center`, back/right floating above it) — bring the component in line with its own design spec. Applies to all pages using `PageHeader`.
- **Item 12 — Text input font size:** the "Add a note" textarea on `Summary.jsx` (shown after a round is finished, logged-in only) uses `text-sm` (14px). iOS Safari auto-zooms on focus for inputs under 16px — confirmed behaviour, not just the user's belief. Bump to `text-base` (16px) or explicit 16px.
- **Item 15 — GDPR statement on Info page:** a full GDPR-aligned Privacy page already exists at `/privacy` (linked from the Login screen) and already covers UK GDPR rights, retention, and third parties. This item is a small addition, not new policy drafting — add a short statement + link to `/privacy` at the bottom of `Info.jsx`, visible in the logged-in Account section (and reasonably shown to logged-out users too, since quick-play users may also want to find it).

**Verify:** all five changes visible and correct on a real mobile viewport. Header centering checked on at least one page with a back button + right-side content (e.g. Scorecard) and one without. No regression to existing truncation behaviour on long titles.

---

### Chunk 34 — Bug fix: hole reset no longer hides later holes
**Status: Complete (23 July 2026)**
**Depends on: nothing**

Covers user item 9.

- Root cause: `computeDisplayedHoles()` (`src/utils/game.js`) returns the row count based on the first hole (from the start) where not all players have scored. Resetting a middle hole back to empty makes that function think the round hasn't progressed past that point, so it hides — but does not delete — every later hole's row from the live scorecard view. Data in `game.scores` is untouched; this is a display bug, not data loss, but it looks and feels like data loss to the user.
- Fix: change the row-count logic so any hole with an existing score (for any player) stays visible, regardless of gaps earlier in the sequence. The "empty" display (`–`) already exists for unscored cells — extend that same treatment to a hole that's been reset to empty after being played, rather than hiding the row.
- Confirm `calculateResult` / `finishGame` (which already use a different, correct trailing-hole calculation) are unaffected by this change — they are not driven by `computeDisplayedHoles`.

**Verify:** score a few holes, reset a middle hole to empty, confirm later holes and their scores remain visible in the grid (showing `–` only for the reset hole), confirm totals and DNF/winner calculation at finish are unaffected.

---

### Chunk 35 — Course map reliability
**Status: PAUSED — needs manual review/instruction before an agent resumes.** An implementation attempt was made (branch `fix/course-map-reliability`, stashed, not committed) but the user flagged it as wrong before it reached commit. Do not re-attempt this chunk without fresh, explicit instruction from the user on what approach is actually wanted.
**Depends on: nothing**

Covers user items 10 and 11. Grouped because both concern `CourseMapModal.jsx` and the map trigger in `Scorecard.jsx`.

- **Item 11 — Map should appear generally, not just via the Bruntsfield slug route:** currently the map button in `Scorecard.jsx` only renders when `params.bruntsfield` is true, which is only set when a game is started from `/bruntsfield-short-course` (`BruntsfiledCoursePage` → `Setup`). A user who taps the generic Home "New Game" button never sees the map, and a logged-in user who picks Bruntsfield from the course selector doesn't either. **Note:** this was intentionally scoped that way in Wave 5 Chunk 32 ("showing the course map button and rules link only in that context") — this chunk deliberately reverses that scoping decision per the user's explicit request. Fix: show the map button whenever the active game's course is Bruntsfield (by `courseName` / `courseId`, not by navigation route), covering both the quick-play and logged-in course-selector paths.
- **Item 10 — No loading feedback for the map image:** `CourseMapModal.jsx` renders the `<img>` with no loading state. Add an instantly-appearing placeholder/spinner shown the moment the modal opens, replaced once the image's `onLoad` fires (or an error state if it fails).

**Verify:** start a game via the generic Home → New Game flow and confirm the map button appears when the course is Bruntsfield. Start via the Bruntsfield course page and confirm no regression. Confirm a visible loading placeholder appears instantly on modal open, before the image finishes loading, on a throttled connection.

---

### Chunk 36 — Sign-in email branding
**Status: Not started**
**Depends on: nothing**

Covers user item 13.

- **Code change:** update `functions/api/auth/request-link.js` — subject line and in-email wordmark currently read plain "Scorecard". Update copy to read "Scorecard by Outbuild" with correct capitalisation, per DESIGN.md's email pattern.
- **Manual step (flagged, not code):** the visible **sender name** in a recipient's inbox is controlled by the `RESEND_FROM_EMAIL` environment variable's format (e.g. `Scorecard by Outbuild <hello@outbuild.co>` vs a bare address). Wrangler CLI is not available on this machine, so this value must be updated via the **Cloudflare Pages dashboard** (Settings → Environment variables) by the human, not by an agent. Clear manual instructions will be provided when this chunk is reached.

**Verify:** send a test magic link and confirm both the subject/body copy and the sender display name read "Scorecard by Outbuild" correctly.

---

### Chunk 37 — Backend: user profile foundation
**Status: Not started**
**Depends on: nothing (infrastructure)**
**Flag: touches authentication data — requires explicit confirmation before starting, per CLAUDE.md.**

Backend groundwork for user items 5 and 6. No user-facing UI in this chunk.

- Add a `name` column to the `users` table (D1 migration) — nullable, since existing users won't have one yet.
- Extend `GET /api/auth/me` to return `name` alongside `id`/`email`.
- Add `PATCH /api/users` — update name and/or email for the current session's user.
- Add `DELETE /api/users` — delete the current user's account. On success, send a notification email via Resend to williamadamgriffiths@gmail.com per the user's request (item 6), and clear the session.
- **Open decision needed before building (see questions):** should an email change require re-verification (a magic link sent to the new address before it takes effect), or take effect immediately? This is a security-relevant decision, not an implementation detail — needs explicit sign-off.

**Verify:** schema migration applies cleanly to existing data. `/api/auth/me` returns the new field without breaking existing consumers. Update/delete endpoints reject unauthenticated requests. Account deletion actually removes the user record and triggers the notification email (test with a throwaway account, not a real one).

---

### Chunk 38 — Settings panel
**Status: Not started**
**Depends on: 37**

Covers user item 6 (UI half).

- Add a settings (gear) icon on the Home screen, visible only in the logged-in state. Pair with a clearer general logged-in vs logged-out indicator on Home (currently the only signal is which buttons/links are shown — item 6 asks for this to be unambiguous).
- Settings screen: edit name, update email (behaviour per Chunk 37's confirmed decision), delete account (confirmation dialog, matching the existing delete-round confirmation pattern in `History.jsx`).
- Wire to the Chunk 37 endpoints.

**Verify:** gear icon only shows when logged in. Name/email edits persist and reflect immediately in the UI (e.g. Info page account section). Delete account signs the user out, clears session, and the notification email arrives.

---

### Chunk 39 — Logged-in identity in gameplay
**Status: Not started**
**Depends on: 37, 38**

Covers user item 5.

- When a logged-in user has no name on file yet, prompt once (lightweight — a single inline prompt, not the fuller onboarding journey deferred to backlog item 13) to capture it, or direct them to Settings (Chunk 38) to add it.
- When starting a new game while logged in, pre-fill the first player slot with the user's own name; additional players remain "guest" entries as today.
- In the scorecard, summary, and history views, the logged-in user's own score is the primary/highlighted entry; guest scores remain visible but visually secondary.

**Verify:** logged-in user with a name set sees themselves pre-filled as player 1 on New Game. Their score is visually distinct (more prominent) on the scorecard, summary, and history screens. Logged-out (quick-play) flow is completely unchanged.

---

### Chunk 40 — Edit a past round
**Status: Not started**
**Depends on: nothing directly, but benefits from Chunk 39 being in place first for consistent "own player" handling**

Covers user item 14.

- Add `PATCH`/`PUT` support to `functions/api/games/[id].js` for logged-in (D1-backed) rounds.
- Build an edit flow reusing the existing "past round" setup pattern (`Setup.jsx`'s `pastRound` mode) and the scorecard grid, pre-populated with the existing round's data, saving back on completion instead of creating a new record.
- **Open decision needed before building (see questions):** does this need to cover logged-out (localStorage) quick-play rounds too, or D1 rounds only for v1? Quick-play editing is technically simpler (no API call) but doubles the surface area to test.

**Verify:** edit a past round's player names, scores, and course; confirm the change is saved and reflected in History and Summary; confirm winner/DNF/totals recalculate correctly after edits.

---

## Chunk order summary — Wave 6

| Chunk | What | Depends on | Status |
|-------|------|------------|--------|
| 33 | UI feedback pass (items 1, 2, 3, 4, 12, 15) | Nothing | Not started |
| 34 | Bug fix: hole reset display bug (item 9) | Nothing | Not started |
| 35 | Course map reliability (items 10, 11) | Nothing | Not started |
| 36 | Sign-in email branding (item 13) | Nothing | Not started |
| 37 | Backend: user profile foundation (items 5/6 backend) | Nothing | Not started |
| 38 | Settings panel (item 6 UI) | 37 | Not started |
| 39 | Logged-in identity in gameplay (item 5) | 37, 38 | Not started |
| 40 | Edit a past round (item 14) | Benefits from 39 | Not started |

**Recommended build order:** 33 → 34 → 35 → 36 → 37 → 38 → 39 → 40 (fastest, lowest-risk wins first; backend/auth-touching and largest features last).
