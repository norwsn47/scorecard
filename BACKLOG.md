# Backlog
## Scorecard by Outbuild — Bruntsfield Links

Last updated: 23 July 2026

Items below are logged for future consideration. None are implemented.

Items previously in this backlog that have moved into the build plan: Podium (Chunk 11), Course Map (Chunk 12), Outbuild credit (Chunk 13), Share scorecard (Chunk 14). Analytics was briefly promoted to Chunk 15 but moved back here — see item 4 below.

Items from the v2.0 planning session (July 2026) that were explicitly deferred: quick-play history import (item 7), magic link resend (item 8), auth rate limiting (item 9), quick-play course future-proofing (item 10).

Wave 5 items (generic home + Bruntsfield course page refactor, added 19 July 2026) were planned directly into the build plan — see Chunks 30-32 in BUILDPLAN.md. They are not listed as separate backlog items here.

Items 13 and 14 below were added 23 July 2026 from a 15-item user feedback list. The user explicitly flagged both as "future addition, not to be done now" at the time of request — see Chunks 33-40 in BUILDPLAN.md for the rest of that list, which was actioned into the current build plan.

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

**Added: 12 July 2026. Resolved 12 July 2026 - implemented as a dedicated Privacy page (`/privacy`) linked from the login screen.**

---

### 12. magic_tokens table cleanup - expired token retention

**Added: 12 July 2026.**

Used and expired magic tokens are never deleted from the D1 `magic_tokens` table. This means email addresses from abandoned sign-in attempts (where the user never clicked the link) accumulate in the database indefinitely. This is inconsistent with the UK GDPR data minimisation and storage limitation principles (Articles 5(1)(c) and (e)).

Fix: add a scheduled Cloudflare Worker (or a cleanup step in `verify.js`) that deletes `magic_tokens` rows older than 24 hours. All tokens expire after 15 minutes and are marked `used = 1` after verification - there is no legitimate reason to retain them beyond 24 hours.

Priority: medium. Not a launch blocker, but should be addressed before significant user numbers.

Related PRD section: 11.12

---

### 13. Full onboarding journey (name + home course + par)

**Added: 23 July 2026. Explicitly deferred by the user — "future addition, not to be done now."**

A proper onboarding flow on sign-up: prompt for name and home course together (rather than the lightweight name-only capture being built now in Chunk 39 of BUILDPLAN.md), with the ability to add/edit a home course and its par scores when created. Par would then appear on the course record and on the scorecard, with running over/under-par totals alongside the existing raw stroke totals.

This is a materially bigger feature than the current v2.0 scope: it introduces par as a first-class concept, which PRD section 7 currently lists as explicitly out of scope for both MVP and v2.0. Building this properly means deciding how par interacts with the existing raw-stroke scoring model (PRD section 5) before writing any code — not a small addition.

Related PRD sections: 5 (Scoring), 7 (Out of scope), 8 (Future considerations), 11.7 (Course creation).

---

### 14. Multi-course architecture

**Added: 23 July 2026. Explicitly deferred by the user — "future addition, not to be done now."**

Consider the site architecture needed to properly support multiple courses, beyond the current v2.0 model where a logged-in user's "course" is just a name string with a default hole count (PRD 11.7). Would need to cover: structured per-course data (holes, par per hole if item 13 is ever built), how quick-play (currently hardcoded to Bruntsfield) would coexist with a multi-course model, and whether system-provided courses (beyond the Bruntsfield default) become a thing users can browse rather than only create themselves.

This is an architecture/planning item, not a single buildable chunk — revisit once real usage data shows whether users are actually creating multiple distinct courses in practice.

Related PRD sections: 6 (Course), 11.7 (Course creation and selection), 8 (Future considerations).
