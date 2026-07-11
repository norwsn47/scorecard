# PLAYBOOK.md
Last updated: 11 July 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

*The ongoing reference for working on an Outbuild project after v1 is shipped. Not a linear process — pick the move you need.*

---

## Starting a session

Every session starts the same way, regardless of what you're working on:

> "Use the project-manager to start this session."

It reads CLAUDE.md, PRD.md, BUILDPLAN.md, DESIGN.md, and BACKLOG.md and tells you:
- Where the project is
- What was last worked on
- What's next or what you told it to do next time

Confirm you're happy with that context before doing anything.

---

## The moves

### Adding a new feature

**When:** You want to build something new that wasn't in the original PRD.

**First — decide if it belongs in the PRD or the backlog.**
If this is going into the current version, the PRD needs to be updated first. If it's a future idea, log it to the backlog and come back to it.

> "Use the product-owner to add [feature] to the PRD. Confirm it fits the current scope or flag if it changes what we're building."

If it's in scope, the product-owner updates the PRD. Then:

> "Use the project-manager to add [feature] to BUILDPLAN.md as a new chunk."

Then run the build loop as normal — the same process as Phase 4 in START-HERE.md.

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

The pre-push gate still runs — the code-reviewer checks design token consistency as part of Phase 1.

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

> "Use the performance-auditor. [Describe what feels slow — which page, which interaction, or ask for a full audit]. Compare against the baseline from scaffolding if one exists."

The performance-auditor measures actual runtime — load times, Core Web Vitals, API response times, bundle size, N+1 queries. It reports numbers, not impressions, and proposes optimisations with before/after measurements.

---

### PRD has drifted

**When:** You've built several chunks and want to check that what you've built still matches what you planned.

> "Use the product-owner to run a PRD drift check. Compare the current codebase against PRD.md. Flag anything built outside scope, anything different from the spec, and anything in the PRD not yet addressed."

The product-owner produces a prioritised list. Bring it to the project-manager to decide what to fix now, what to update in the PRD, and what to log to the backlog.

---

### Backlog grooming

**When:** The backlog has grown and you want to plan what's next, or you're about to start a new wave of work.

> "Use the product-owner to review the backlog. Organise it into waves — group related items, order them logically, and flag anything that conflicts with the current PRD."

The product-owner updates BACKLOG.md with the wave structure. Review it and confirm before starting any wave.

**Starting a new wave:**
> "Use the project-manager to add wave [N] from the backlog to BUILDPLAN.md as new chunks."

Then run the build loop as normal.

---

### Security concern

**When:** You've spotted something that looks like a security issue, or you want a periodic security check.

> "Use the code-reviewer to run a security audit. [Describe the specific concern if you have one, or ask for a full sweep.]"

Review every finding manually before accepting any change. The code-reviewer will propose fixes — it won't auto-apply them. Security is the one area where you always review diffs yourself.

---

### Updating project documents

**When:** A decision has changed, a tool has been swapped, or something in the PRD needs correcting.

- PRD changes → product-owner
- BUILDPLAN changes → project-manager
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
| Starting a session | project-manager |
| New feature — scoping | product-owner |
| New feature — building UI | frontend-developer |
| New feature — building backend | backend-developer |
| Design tweak — token level | design-director |
| Design tweak — component level | frontend-developer |
| Something is broken | debugger |
| Performance issues | performance-auditor |
| PRD drift | product-owner |
| Backlog grooming | product-owner |
| Security concern | code-reviewer |
| Pre-push gate | code-reviewer (automatic) |
| Pre-launch | code-reviewer + performance-auditor + product-owner |

---

## Things to remember

**The completion gate runs automatically** — you don't need to invoke the code-reviewer manually, the project-manager coordinates it. But you do need to open localhost and test it yourself when the human review prompt appears. That step cannot be skipped regardless of version control mode.

**The PRD is always current** — if a decision changes mid-build, the product-owner updates the PRD immediately. It should always describe what you're actually building, not what you originally planned.

**New ideas go to the backlog, not the build** — when something comes up mid-chunk that isn't in scope, log it:
> "Add this to BACKLOG.md: [idea]. Don't implement it now."

**Version control is mode-dependent** — the project-manager knows which mode you're using. If you're on Mode C (GitHub), every push goes to a named branch — never main. If you're on Mode A or B, there's no push, just a local commit or nothing. You can switch modes at any time:
> "Switch version control to Mode [A/B/C] and update CLAUDE.md."

**One thing at a time** — the agents are built around this. Don't try to build two chunks simultaneously or skip the review gate. Each chunk should be a safe point you can return to.

