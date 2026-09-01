# Backlog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> Open items only — ideas, deferred work, and known issues not yet done.
> When something ships, delete its line and add a note to `CHANGELOG.md`.
> Nothing here is actioned without explicit instruction — tell the project-manager (or Claude directly) to pull an item into work.
> Numbers are stable IDs for cross-reference — don't renumber existing items when deleting one.

**Last updated:** 1 September 2026

---

## Features not yet built

### 1. Course map reliability
Two parts, from the July 2026 feedback list. **A previous implementation attempt was flagged wrong by the user and reverted — needs a fresh approach before restarting.**
- The map button in `Scorecard.jsx` only renders when a game was started from the `/bruntsfield-short-course` route. A user who starts from the generic home "New Game", or a signed-in user who picks Bruntsfield from the course selector, never sees it. Show the button whenever the active game's course is Bruntsfield (by course name/id, not by navigation route). Note: this reverses a deliberate Wave 5 scoping decision.
- `CourseMapModal.jsx` shows no loading state — add an instant placeholder/spinner, replaced on the image's `onLoad` (or an error state).

### 2. Sign-in email branding
- `functions/api/auth/request-link.js` — subject line and in-email wordmark read plain "Scorecard". Update to "Scorecard by Outbuild" per DESIGN.md's email pattern.
- Manual step (not code): the inbox sender name is set by the `RESEND_FROM_EMAIL` env var format. Update via the Cloudflare Pages dashboard (Settings → Environment variables).

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

---

## Blocked / waiting on something external

### 12. Contact email → hello@outbuild.co
The Info page uses williamadamgriffiths@gmail.com as a placeholder. Once hello@outbuild.co is configured and verified via Resend, update the `mailto:` link. (PRD §4.8.)

### 13. Official Bruntsfield logo
Add the club's official logo (likely Home or the course info section) once permission to use it is obtained.

---

## Known issues

### 14. No rate limiting on `POST /api/auth/request-link`
No per-email or per-IP rate limiting, so a target address could be flooded with magic-link emails. Evaluate Cloudflare Workers' built-in Rate Limiting API first. (PRD §11.4.) Medium priority — address before significant user numbers.

### 15. `magic_tokens` table never cleaned up
Used/expired magic tokens are never deleted, so email addresses from abandoned sign-in attempts accumulate indefinitely — inconsistent with GDPR data-minimisation. Add a scheduled Worker (or a cleanup step in `verify.js`) that deletes rows older than 24 hours. All tokens expire after 15 minutes and are marked `used` after verification. (PRD §11.12.) Medium priority.

### 16. Pre-existing duplicate game rows in production D1
The 24 Aug hotfix stopped new duplicates but didn't touch rows already duplicated before it shipped. Identify and remove them via the Cloudflare D1 console — group by `user_id, played_at, holes_played` looking for counts > 1 (all predate `client_round_id` so all have it `NULL`). Check for other affected users too.

### 17. `Scorecard.jsx` setState-during-render warning on direct load
Loading `/scorecard` directly with no active game triggers "Cannot update a component while rendering a different component". `Scorecard.jsx` (~line 35) calls `navigate()`/setState during render instead of in a `useEffect` for the no-active-game case. Needs a debugger pass.

### 18. Edit-mode browser Back lands on a mislabelled "New Game" screen
Pressing browser Back from the edit-mode Scorecard drops the user on a Setup screen labelled "New Game", with a stranded active game in storage. No data loss or duplicate record — cosmetic + UX clarity. (PRD §11.13.)

### 19. Past-round "← Rounds" back button always targets History
On the round detail view the back button always goes to History, even when the user reached it another way (post-edit-finish, or browser-back after Done). Minor misdirection, no broken state. (PRD §11.13.)

### 20. `Podium.jsx` "See full card" is a dead path
No `navigate('podium')` exists anywhere in the app. If the route is hit by direct URL as a signed-in user it can now enter the read-only detail view. Pre-existing, low value — clean up next time `Podium.jsx` is touched.

---

## Housekeeping & tech debt

### 21. No linter configured
No ESLint (or equivalent) and no `lint` script. Reviews rely on manual reading. Add ESLint with a sensible React/JSX config.

### 22. No flow test for the edit-past-round path
No integration/component test covers open-edit → change on the scorecard → save back. The duplicate-save regression class isn't protected by an automated flow test. Add one asserting a single record in/out (no new row) for both the D1 and localStorage paths.

### 23. `onRequestPatch` / `onRequestPost` input validation is minimal
`played_at` accepts any non-empty string (no date-format check); `player_data` is only checked for being a non-empty array (element shape not validated). Both client-controlled and consistent with each other, but both would benefit from stricter schema validation.

### 24. `onRequestPatch` accepts `game_name` but the client never sends it
After a rename via the edit flow, the D1 `game_name` column can go stale relative to `player_data`. Harmless today (`game_name` isn't rendered anywhere the edited round shows) — either wire the client to send it or drop it from the handler.

### 25. Crisper course map image
`public/course_map_v2.png` lacks sharpness when zoomed on high-res screens. Replace with a higher-resolution source, or SVG/vector if the course can provide one. (Distinct from #1, which is about when the map appears and its loading state.)

### 26. Quick-play hardcoded course reference
Quick-play is hardcoded to Bruntsfield. If the app expands to other courses it'll need a lightweight selector on the logged-out new-game path. For now, make sure the hardcoded reference is a named constant, not an inline string. (Related to #11.)

### 27. `PageHeader` title-clearance margin is fixed, not proportional
The absolutely-centred title uses a fixed `px-16` clearance. Safe against every current title/button combination (smallest measured margin: 20px) but doesn't scale with sibling content width. Either document a safe title-length budget in DESIGN.md or make the clearance responsive next time the component is touched.

### 28. Sub-44px tap targets on inline text links
Several inline text-link buttons (`Info.jsx`, `Login.jsx`, `Summary.jsx`, `CourseMapModal.jsx`, `RulesContent.jsx`) have no padding/min-height, giving tap targets under the 44×44px guideline. App-wide convention. The Setup course-rules link was widened already; the rest remain. Do a pass.

### 29. Summary saved-note body is very small (12px)
The read-only note on the past-round detail view renders at `text-xs`. Deliberate ("very small" was the ask), but it's user-authored content read on a phone — revisit to `text-sm` if it reads as too small in practice.

### 30. `package.json` internal rename
The npm package name is `golf-tavern-scorecard` — internal only, not user-facing. Rename to `scorecard-by-outbuild` or similar when convenient.

### 31. Analytics
- Confirm Cloudflare Pages built-in analytics are active.
- Evaluate a privacy-friendly product analytics tool (Plausible, Fathom, PostHog) — no cookie-consent banner required.
- In-app events already instrumented: New Game Started, Game Completed (player count, holes), Scorecard Shared.
- If added, update the Info page copy (PRD §4.8) to say what's collected and by whom.
