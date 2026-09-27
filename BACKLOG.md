# Backlog
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

> A to-do list, so nothing gets forgotten. Open items only.
> - **Adding:** only if it's something I'd actually do — a real bug, a feature idea I've asked for, or a manual step I owe. Critical/High findings from a review or audit go in; everything else stays in the chat report. Non-blocking review notes are never logged. Accepted or won't-fix items are never to-dos: one line in "Known and accepted" below, or a code comment where the issue sits in one place. Reviews and audits read that section and don't re-raise it.
> - **Removing:** whoever finishes an item deletes its line in the same commit as the change. Add a `CHANGELOG.md` note only if it was a decision or a reversal.
> - **Entries stay short:** one to three lines — what needs doing, not the history.
> - **IDs are stable and never reused**, even after an item is deleted, so gaps are expected. Next free ID: **#124**.

**Last updated:** 27 September 2026

---

## My manual to-dos

- **#2b** — Set `RESEND_FROM_EMAIL` to the `Scorecard by Outbuild <address>` format in the Cloudflare Pages dashboard (Settings → Environment variables).
- **#90** — Check the header top spacing on a real iPhone.
- **#120** — Production checks: sign-in still works (recheck a double-click on the link lands on the expired state); a failed save recovers (block `/api/games` in DevTools, finish a round, confirm Retry/Keep, round shows "Not yet saved" in History, unblock and confirm it syncs with no duplicate).

---

## Bugs and small fixes

- **#116** — A lost save response followed by a local edit keeps the old data on the server (needs `PATCH` or `GET` by `client_round_id`).
- **#43b** — A signed-in round opened from History can land on the wrong round after a back/forward bounce or an edit-cancel (needs `GET /api/games/:id`).
- **#111** — Show a small "Couldn't share - try again" message when sharing fails.
- **#123** — `Info.jsx` says the Club has been in Edinburgh "since 1895"; `BruntsfieldCoursePage.jsx` says "Golf played here since 1456". Reword `Info.jsx` to lead with golf on the links since 1456, keeping the Club's founding date as a separate fact. Fact-check both dates before changing copy.
- **#78** — `BruntsfieldCoursePage.jsx`'s foot links sit a little close to the buttons above — small cosmetic spacing fix.
- **#41** — Performance pass: Core Web Vitals on a throttled mobile profile, bundle and image weight, the blank shell while `/api/auth/me` resolves, and D1 timings. Fix the obvious wins, re-measure.

---

## Ideas

- **#7** — Course leaderboard: best rounds recorded on a course, from signed-in users' D1 data only.
- **#8** — Import quick-play history into the account after first sign-in.
- **#10** — Full sign-up journey: name, home course, per-hole par.

---

**Tidy-ups to do when passing:** duplicated code between `Home.jsx` and `BruntsfieldCoursePage.jsx`; the backend's own copies of the hole cap and par band; large page files (`Setup.jsx`, `Scorecard.jsx`, `Summary.jsx`); the empty `README.md`.

---

## Known and accepted

<!-- Not to-dos. Decisions not to fix something, so reviews and audits don't raise them again. -->
<!-- One line each: what, and why it's accepted, with the date. -->
