# Backlog
## Scorecard by Outbuild — Bruntsfield Links

Last updated: 12 July 2026

Items below are logged for future consideration. None are implemented.

Items previously in this backlog that have moved into the build plan: Podium (Chunk 11), Course Map (Chunk 12), Outbuild credit (Chunk 13), Share scorecard (Chunk 14). Analytics was briefly promoted to Chunk 15 but moved back here — see item 4 below.

Items from the v2.0 planning session (July 2026) that were explicitly deferred: quick-play history import (item 7), magic link resend (item 8), auth rate limiting (item 9), quick-play course future-proofing (item 10).

---

### 1. All-time leaderboard

A screen showing top scores and records across all games ever played (lowest round, most wins per player, etc.). Requires database — post-MVP only. Blocked until backend storage is added.

Related PRD section: 8 (Future considerations)

---

### 2. Contact email — switch to hello@outbuild.co via Resend

**Status: On pause — blocked pending Resend setup**

The information page (PRD 4.8) currently uses williamadamgriffiths@gmail.com as a placeholder contact email. Once hello@outbuild.co is configured via Resend, the mailto: link in the information page must be updated to that address.

Action required when ready: configure Resend, verify hello@outbuild.co, then update the contact link in the information page component.

Related PRD section: 4.8 (Information page)

---

### 4. Analytics

Track meaningful usage without cookie consent requirements.

- Confirm Cloudflare Pages built-in analytics are active for basic traffic data
- Evaluate and integrate a privacy-friendly product analytics tool (Plausible, Fathom, or PostHog)
- Track in-app events already instrumented: New Game Started, Game Completed (with player count and holes played), Scorecard Shared
- Confirm no cookie consent banner is required
- If analytics are added, update the information page copy (PRD 4.8) to reflect what is collected and by whom

Related PRD section: 4.5 (Analytics)

---

### 3. package.json internal rename

**Status: Low priority — no user impact**

The npm package name is currently "golf-tavern-scorecard" (package.json line 2). This is an internal identifier only — not user-facing. Rename to "scorecard-by-outbuild" or similar when convenient, as part of routine housekeeping.

No PRD section — housekeeping only.

---

### 5. Crisper course map image

The current course map image (`public/course_map_v2.png`) lacks sharpness when zoomed in on high-resolution screens. Replace with a higher-resolution source image, or explore SVG/vector format if one is available from the course.

No PRD section — visual quality improvement.

---

### 6. Official Bruntsfield Links logo

**Status: Blocked — awaiting permissions**

Add the official Bruntsfield Short Hole Golf Club logo to the app (likely the home screen or course information section) once permission to use it has been obtained from the club.

No PRD section — pending permissions.

---

### 7. Quick-play history import (post sign-in migration)

**Added: 12 July 2026. Deferred from v2.0 planning.**

Allow users who have been playing in quick-play (localStorage) mode to migrate their existing local game history into their new DB account after they sign in for the first time.

**Proposed flow:** After the magic link verification and account creation, detect whether the user's device has localStorage game history. If so, offer a one-time prompt: "You have X saved games on this device — import them to your Scorecard Plus account?" Importing would POST each game to `/api/games` with a flag indicating it was migrated from local storage.

Deferred because: the two histories are deliberately kept separate in v2.0 (PRD 11.9), and the migration flow adds meaningful complexity without blocking the core Plus experience. Revisit post-launch once users have used the product.

Related PRD section: 11.7, 11.9, 8 (Future considerations)

---

### 8. Magic link resend

**Added: 12 July 2026. Deferred from v2.0.**

A "Resend link" button on the post-send confirmation screen (Chunk 25). The first version has no resend — if the user misses the email they must go back and start again. A resend button reduces friction. Requires throttling to prevent abuse.

Related PRD section: 11.4

---

### 9. Auth rate limiting

**Added: 12 July 2026. Deferred from v2.0.**

`POST /api/auth/request-link` currently has no rate limiting. Add per-email and per-IP rate limiting to prevent abuse (e.g. flooding a target email address with magic link emails). Cloudflare Workers has built-in rate limiting via the Rate Limiting API — evaluate this first.

Related PRD section: 11.4

---

### 10. Quick-play course future-proofing

**Added: 12 July 2026. Deferred from v2.0.**

Quick-play is currently hardcoded to Bruntsfield Links. If the app ever expands to other courses, quick-play will need a lightweight course selector. For now it stays hardcoded — no UI change needed. Log this so the hardcoded course reference is easy to find when the time comes: it lives in the new-game setup screen (logged-out path) and should be a named constant, not an inline string.

Related PRD section: 11.7

---

### 11. Data clause for logged-in users

**Added: 12 July 2026.**

The "Your data" section was removed from the information page as it only described localStorage behaviour (quick-play). A new data clause is needed for logged-in (Scorecard Plus) users explaining that scores, player names, and game history are stored on Cloudflare's servers and tied to their email address. This should appear in an appropriate logged-in context - either a dedicated section in the information page (shown only when logged in), or in an account/settings screen added in a later chunk.

Related PRD section: 11.12
