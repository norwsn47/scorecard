# Build Plan
## Scorecard by Outbuild

**Last updated:** 29 August 2026 (doc reconciliation — Chunks 33 & 34 marked Done and their detail blocks archived; Chunk 40 "Edit a past round" pulled forward by the user as the next chunk)

> All planned work through Phase 4 (Chunks 1–29), Wave 5 (Chunks 30–32), and Wave 6 Chunks 33–34 is complete and archived in BUILDPLAN-ARCHIVE.md.

## Hotfix log

**23 July 2026 — Production 308 redirect on deep-linked routes. RESOLVED.** Reported urgently by the user: direct navigation to `https://scorecard.outbuild.uk/bruntsfield-short-course` (and other routes) returned an HTTP 308 redirect to the bare domain root instead of loading the app. Investigated via the debugger agent and extensive live Cloudflare dashboard checks with the user — app code, build output, DNS, Redirect Rules, Page Rules, Bulk Redirects, and Pages build configuration were all confirmed correct. Root cause narrowed to `public/_redirects`'s enumerated per-route format; fixed by switching to the standard Cloudflare Pages SPA wildcard rule (`/* /index.html 200`). Confirmed by the user: deep links now load correctly.

**Follow-on regression, same day — magic-link sign-in broken. RESOLVED.** The `_redirects` wildcard fix above appears to have also intercepted `/api/auth/request-link` before it reached the Cloudflare Pages Function, despite general Cloudflare docs stating Functions take priority — likely a nuance of this project's Pages "Build system version 3". Fixed by adding `public/_routes.json` (`include: ["/api/*"], exclude: []`), explicitly scoping Functions eligibility to the API routes and removing any ambiguity with `_redirects`. Confirmed by the user: sign-in works again. Lesson for future hosting-config changes: verify both the target symptom *and* adjacent functionality (especially `/api/*`) before considering a routing fix complete.

**24 August 2026 — Duplicate game rows saved to D1 (Scorecard Plus) on back-navigation and on revisiting a past round. RESOLVED.** Reported by the user (signed in, Scorecard Plus): duplicate rows for the same round appeared in their game history. Root cause: `Summary.jsx`'s `handleGoHome()` unconditionally `POST`s to `/api/games` whenever a logged-in user taps "Done", with no idempotency protection. `Summary` (and `Podium`) fall back to `getCompletedGames()[0]` (the most recently finished local game) when `params.game` is missing — which happens after browser back/forward navigation, since `App.jsx`'s `popstate` handler clears `params` to `{}` regardless of the target route. The user confirmed they likely navigated back and forth after finishing a round, which matches this: Summary re-displays the same already-saved round via the fallback, and a second tap of "Done" fires a second, un-deduplicated `POST`, creating a duplicate D1 row. A secondary, smaller risk (Done button double-tap racing the `disabled` state before React re-renders) was addressed at the same time since it touches the same handler.

Fix, in three layers (defence in depth, no single layer relied on alone):
1. **Client — stop the silent re-save:** `Summary.jsx` now tracks whether a completed game has already been synced to the server (`markCompletedGameSynced()` in `storage.js`, sets `synced: true` on the localStorage record after a successful save). `handleGoHome()` skips the `POST` entirely if `game.synced` is already true — so a revisit via the `getCompletedGames()[0]` fallback (e.g. after back-navigation) no longer silently re-submits.
2. **Client — idempotency key:** every `POST /api/games` now includes `client_round_id`, set to the local game's own `id` (already a stable per-round identifier, assigned once at `createGame()` and carried through `finishGame()` to the completed record). Also added a synchronous `useRef` re-entrance guard in `handleGoHome()` so a double-tap can't fire two overlapping save attempts even before React re-renders the disabled button.
3. **Server — dedup / uniqueness:** `functions/api/games/index.js`'s `onRequestPost` checks for an existing row with the same `(user_id, client_round_id)` before inserting, and returns that row's id instead of creating a duplicate. A new D1 migration, `migrations/002_add_client_round_id.sql`, adds the `client_round_id` column and a `UNIQUE(user_id, client_round_id)` index as a hard backstop against races (two near-simultaneous duplicate `POST`s both passing the pre-insert check) — the insert handler catches a unique-constraint failure and returns the winning row instead of erroring. (An earlier version of this check also had a fallback match on `(user_id, played_at, holes_played)` for requests without `client_round_id`; removed after code review flagged it could false-positive on two different same-day past-round backfills with the same hole count and silently drop a real round — a request without the key now just inserts normally.)

**Second, more significant duplicate-creation vector found and fixed in the same pass:** `Summary.jsx` is reused both for the immediate post-finish flow and for viewing any past round opened from History (`History.jsx`'s `normalizeDbGame()` passes a DB-backed record flagged `_fromDb: true`). `handleGoHome()` had no awareness of this — since "Done" is this screen's only way back (no header/back button), simply opening any past round from History and tapping Done re-POSTed it as a brand-new row on every single visit. Its `game.id` in that case is the DB row's own UUID rather than the original `client_round_id`, so the new server-side dedup check above would not have caught it either — this was very likely the dominant real-world cause of the duplicates reported, more so than back-navigation alone. Fixed by adding a `!game._fromDb` condition to the existing save guard in `handleGoHome()`, so a past round opened from History is never re-saved, only ever navigated away from.

**Related, smaller fix folded into the same chunk — round notes not pre-filling.** Separately reported: notes were visible on the History list card but always showed empty on the round's own detail/Summary screen. Root cause: the notes `useState` always initialised to `''`, ignoring `game.notes` (present on DB-backed rounds via `row.notes`). Fixed by initialising from `game?.notes ?? ''`. Since edits made on an already-saved round's notes field (either `_fromDb` or `synced`) are never persisted (no re-save path exists for either case), the textarea is `readOnly` and visually dimmed whenever `game._fromDb || game.synced` is true, and the whole notes block is hidden if that already-saved round has no note at all (an editable-looking "Add a note..." placeholder with nowhere for the edit to go would be misleading). Notes remain fully editable, as before, up until the round is first saved. (Code review initially flagged that only the `_fromDb` case was read-only — a `synced` round revisited via the back-navigation fallback still showed a fully editable, silently-discarding textarea; fixed by gating on the combined `alreadySaved = game._fromDb || game.synced` in both the save guard and the field's read-only/visibility logic.)

**Verified:** Node.js v24.19.0 installed locally this session (user-local, `~/.local/node-runtimes`, no sudo — the project previously had no Node available at all, not even via a version manager). `npm test` — 60/60 passing, including new `markCompletedGameSynced` coverage. `npm run build` — clean. `npm run dev` — serves without compile errors. Formal code-reviewer pass (static analysis + rendering verification) run and returned clean after the two Should-fix items above were resolved (see delegated review notes). product-owner PRD alignment check: clear (also closed a pre-existing PRD gap — the `notes` column and its read-only-on-past-rounds behaviour are now documented in PRD.md §11.3). **Not yet verified:** the actual signed-in save/dedup path has not been exercised end-to-end against real D1 by a human — that's the remaining localhost review step below.

**Migration applied to production D1 (24 August 2026).** Wrangler CLI was previously unavailable on this machine; the user confirmed this is no longer a managed work laptop, so wrangler was installed locally as a project devDependency (`npm install --save-dev wrangler`) and authenticated via `wrangler login` (OAuth, williamadamgriffiths@gmail.com). `migrations/002_add_client_round_id.sql` was applied directly to the `scorecard-plus` D1 database via `wrangler d1 execute --remote` and verified via `PRAGMA table_info` / `sqlite_master` — the `client_round_id` column and `idx_games_user_client_round_id` unique index are both confirmed live in production. Safe against existing data (existing rows get `NULL`; SQLite does not treat `NULL` as a duplicate in a `UNIQUE` index — no backfill needed). The pre-existing duplicate-row cleanup (the rows already in the screenshot the user reported) is still outstanding and explicitly out of scope for this hotfix — see BACKLOG.md item 18; now trivial to do via `wrangler d1 execute` if the user wants it done as a follow-up.

**Merged and pushed to production (24 August 2026).** Reviewed and confirmed by the user at localhost, running the full app via `wrangler pages dev` with a local D1 instance (plain `vite` can't exercise `/api/*` at all, so this was a more faithful test than earlier chunks had access to). `gh` CLI was also installed locally (same rationale as wrangler) and authenticated via device-code OAuth to enable pushing, since this machine had no GitHub credentials configured at all — no SSH keys, no git config, no prior push ever done from here. Merged `fix/summary-duplicate-save-idempotency` into `main` (3 commits: the fix itself, the wrangler devDependency addition, and the CLAUDE.md/agent CLI-restriction relaxation) and pushed — `main` is now at `61ecff4`. Production D1 migration was applied ahead of the merge, so deploy ordering is safe.

---

## Current status

**Wave 6 in progress.** Scoped from a 15-item feedback/bug/feature list provided by the user on 23 July 2026.

- **Done:** Chunk 33 (UI feedback pass) and Chunk 34 (hole-reset display bug) — both completed 23 July 2026, detail blocks now archived in BUILDPLAN-ARCHIVE.md.
- **Paused:** Chunk 35 (course map reliability) — an implementation attempt was flagged wrong by the user; needs fresh explicit instruction before an agent resumes.
- **Next:** Chunk 40 (Edit a past round). Pulled forward ahead of Chunks 35–39 by the user on 29 August 2026. v1 scope confirmed by the user to cover **both** D1 (logged-in) rounds **and** logged-out localStorage quick-play rounds. Not yet started — needs a product-owner PRD subsection, a named branch, and the implementation brief agreed before coding begins.
- **Remaining after 40:** Chunks 36, 37, 38, 39 (and 35 once unblocked).

The priority hotfix for duplicate game rows on save is resolved, merged to `main`, and pushed (see Hotfix log above).

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

- Add `PATCH` support to `functions/api/games/[id].js` for logged-in (D1-backed) rounds.
- Add a localStorage update path (`updateCompletedGame` in `storage.js`) for logged-out quick-play rounds.
- Build an edit flow reusing the existing "past round" setup pattern (`Setup.jsx`'s `pastRound` mode) and the scorecard grid, pre-populated with the existing round's data, saving back on completion instead of creating a new record.
- **Scope decision — RESOLVED 29 August 2026 (user):** v1 covers **both** logged-in (D1) rounds **and** logged-out (localStorage) quick-play rounds.
- **Status: pulled forward by the user on 29 August 2026 — this is the next chunk, ahead of Chunks 35–39.**

**Verify:** edit a past round's player names, scores, and course; confirm the change is saved and reflected in History and Summary; confirm winner/DNF/totals recalculate correctly after edits.

---

## Chunk order summary — Wave 6

| Chunk | What | Depends on | Status |
|-------|------|------------|--------|
| 33 | UI feedback pass (items 1, 2, 3, 4, 12, 15) | Nothing | Done (23 Jul 2026, archived) |
| 34 | Bug fix: hole reset display bug (item 9) | Nothing | Done (23 Jul 2026, archived) |
| 35 | Course map reliability (items 10, 11) | Nothing | Paused (needs fresh instruction) |
| 36 | Sign-in email branding (item 13) | Nothing | Not started |
| 37 | Backend: user profile foundation (items 5/6 backend) | Nothing | Not started |
| 38 | Settings panel (item 6 UI) | 37 | Not started |
| 39 | Logged-in identity in gameplay (item 5) | 37, 38 | Not started |
| 40 | Edit a past round (item 14) | Benefits from 39 | **Next — pulled forward 29 Aug 2026** |

**Original recommended build order:** 33 → 34 → 35 → 36 → 37 → 38 → 39 → 40.

**Actual order (user override, 29 August 2026):** 33 → 34 → **40** → 36 → 37 → 38 → 39, with 35 slotted back in once unblocked. Chunk 40 pulled forward at the user's request. Trade-off accepted: Chunk 39's "own player" handling is not yet in place, so highlighting the logged-in user's own row in the edit view is deferred to Chunk 39 rather than built here.
