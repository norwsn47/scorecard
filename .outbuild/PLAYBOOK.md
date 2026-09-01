# PLAYBOOK.md
Last updated: 1 September 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

> **This project has streamlined the Outbuild workflow (1 September 2026).** `CLAUDE.md` is the authority. In short: no `BUILDPLAN.md` (retired; work is tracked in `BACKLOG.md` + `CHANGELOG.md`), the project-manager is only for large or vague work, and the review gate scales with change size (CLAUDE.md "Change size" / "Review gate"). The "moves" below have been updated to match; use them as a menu.

*The ongoing reference for working on an Outbuild project after v1 is shipped. Not a linear process — pick the move you need.*

---

## Starting a session

*On this project (see the banner above): skim `BACKLOG.md` and recent `CHANGELOG.md` entries yourself; only bring in the project-manager for large or vague work.*

The generic Outbuild flow: start with

> "Use the project-manager to start this session."

It reads CLAUDE.md, PRD.md, DESIGN.md, BACKLOG.md, and CHANGELOG.md and tells you where things stand and what's next. Confirm you're happy with that context before doing anything.

---

## The moves

### Adding a new feature

**When:** You want to build something new that wasn't in the original PRD.

**First — decide if it belongs in the PRD or the backlog.**
If this is going into the current version, the PRD needs to be updated first. If it's a future idea, log it to the backlog and come back to it.

> "Use the product-owner to add [feature] to the PRD. Confirm it fits the current scope or flag if it changes what we're building."

If it's in scope, the product-owner updates the PRD. Then the project-manager plans the build (breaking it into small pieces, one at a time) and runs each through the review gate. See CLAUDE.md "Change size" and "Review gate".

---

### Design tweak

**When:** You want to change how something looks — colours, spacing, typography, a component — without changing any functionality.

**Small tweak (single component, no token change):**
> "Use the frontend-developer to [describe the change]. Read DESIGN.md first and stay within the existing tokens."

**Token-level change (colour, spacing scale, type scale):**
This means updating DESIGN.md first. Changing a token affects everything that uses it.
> "Use the design-director to update DESIGN.md — I want to change [what]. Explain what else will be affected before making the change."

Confirm the updated DESIGN.md before any code changes. Then:
> "Use the frontend-developer to apply the updated DESIGN.md token to the affected components."

The review gate still runs — the code-reviewer checks design token consistency as part of Phase 1.

---

### Something is broken

**When:** An error is thrown, something behaves unexpectedly, or tests are failing.

**Step 1 — Describe the symptom precisely.** What is happening, what should be happening, and when did it start.

> "Use the debugger. Here's what's broken: [exact error message or behaviour]. It started after [last change or unknown]. Steps to reproduce: [steps]."

The debugger follows a strict root-cause process — it won't guess and it won't apply a fix until the cause is confirmed. Let it run its full process.

**If it's intermittent or only happens in production:**

> "Use the debugger. This issue is intermittent — [describe]. It doesn't reproduce locally. Last time it happened: [when]. Here's what changed recently: [git log summary]."

The debugger will look at environment differences, async timing, and data-specific edge cases.

---

### Performance feels slow

**When:** Something loads slowly, interactions feel sluggish, or you want to check before launching.

> "Use the performance-auditor. [Describe what feels slow — which page, which interaction, or ask for a full audit]."

The performance-auditor measures actual runtime — load times, Core Web Vitals, API response times, bundle size, N+1 queries. It reports numbers, not impressions, and proposes optimisations with before/after measurements.

---

### PRD has drifted

**When:** After a run of changes, you want to check that what's built still matches the PRD.

> "Use the product-owner to run a PRD drift check. Compare the current codebase against PRD.md. Flag anything built outside scope, anything different from the spec, and anything in the PRD not yet addressed."

The product-owner produces a prioritised list. Bring it to the project-manager to decide what to fix now, what to update in the PRD, and what to log to the backlog.

---

### Backlog grooming

**When:** The backlog has grown and you want to plan what's next.

> "Use the product-owner to review the backlog — regroup related items, reorder by priority, and flag anything that conflicts with the current PRD."

The product-owner updates `BACKLOG.md`. Review it and confirm. When you're ready to action items, the project-manager scopes them (large ones first through a PRD update) and runs each through the review gate.

---

### Security concern

**When:** You've spotted something that looks like a security issue, or you want a periodic security check.

> "Use the code-reviewer to run a security audit. [Describe the specific concern if you have one, or ask for a full sweep.]"

Review every finding manually before accepting any change. The code-reviewer will propose fixes — it won't auto-apply them. Security is the one area where you always review diffs yourself.

---

### Updating project documents

**When:** A decision has changed, a tool has been swapped, or something in the PRD needs correcting.

- PRD changes → product-owner
- BACKLOG / CHANGELOG changes → product-owner or project-manager
- DESIGN changes → design-director
- CLAUDE.md changes → you, directly

All agents automatically update the `Last updated:` date when they edit a file.

---

### Pre-launch checklist

**When:** You're about to ship.

Run these in order:

**1. Security audit**
> "Use the code-reviewer to run the full security audit. Show me every finding before applying anything."

**2. Performance audit**
> "Use the performance-auditor to run a pre-launch audit. Compare against the baseline and flag any regressions."

**3. Pre-launch sweep**
> "Use the code-reviewer to run the pre-launch checklist. Assume security is done. Check for console.logs, missing env vars, hardcoded values, and anything not production-ready."

**4. Final PRD check**
> "Use the product-owner to confirm everything in the PRD has been built. Flag any gaps."

Once all four are clear, you're ready to ship.

---

## Quick reference — which agent for what

| Situation | Agent |
|-----------|-------|
| Large or vague piece of work — scoping and coordination | project-manager |
| New feature — PRD section | product-owner |
| New feature — building UI | frontend-developer |
| New feature — building backend | backend-developer |
| Design tweak — token level | design-director |
| Design tweak — component level | frontend-developer |
| Something is broken | debugger |
| Performance issues | performance-auditor |
| PRD drift | product-owner |
| Backlog grooming | product-owner |
| Security concern | code-reviewer |
| Review gate | code-reviewer |
| Pre-launch | code-reviewer + performance-auditor + product-owner |

---

## Things to remember

**The review gate always runs** — for a large change the project-manager coordinates it; for a small one it's code-reviewer then commit. Either way you open localhost and test it yourself when the human review prompt appears. That step is never skipped.

**The PRD is always current** — if a decision changes, the product-owner updates the PRD immediately. It should always describe what the app actually does.

**New ideas go to the backlog, not straight into work** — when something comes up that isn't in scope, log it:
> "Add this to BACKLOG.md: [idea]. Don't implement it now."

**Version control** — git + GitHub. Every push goes to a named branch, never `main`; merges wait for an explicit "go ahead and merge". Full rules in CLAUDE.md.

**One thing at a time** — don't build two things simultaneously or skip the review gate. Each commit should be a safe point you can return to.

