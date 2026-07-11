# Backlog
## Scorecard by Outbuild — Bruntsfield Links

Last updated: 11 July 2026

Items below are logged for future consideration. None are implemented.

Items previously in this backlog that have moved into the build plan: Podium (Chunk 11), Course Map (Chunk 12), Outbuild credit (Chunk 13), Share scorecard (Chunk 14). Analytics was briefly promoted to Chunk 15 but moved back here — see item 4 below.

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
