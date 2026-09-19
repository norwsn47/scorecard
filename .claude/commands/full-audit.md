---
description: Full-codebase audit for accumulated issues
---

# /full-audit - Full-codebase audit

An occasional, deliberately expensive sweep of the whole app for issues the per-commit review gate never sees, because that gate only ever looks at one chunk's diff at a time. Run manually, only when there is token budget for it - not part of any standing flow.

This is not a launch gate (that is `/pre-launch`) and not an agent-setup review (that is `/process-review`). It looks at the actual app code across the whole repo.

## How to run this audit

Invoke the code-reviewer agent with the following brief:

"Run a full-codebase audit - not scoped to any particular chunk or recent change. Work through the whole of `src/`, `functions/`, and the project root. This is a flag-and-report exercise, not a fix-it pass: you never edit anything here (including `BACKLOG.md`), and nothing gets actioned without the user pulling it into work explicitly.

1. **Dead code** - unused exports, components nothing imports or navigates to, orphaned files, commented-out blocks left in place, unreachable branches.
2. **Unused dependencies** - cross-check `package.json` against actual imports; flag anything installed but never used.
3. **Duplicated or near-duplicated logic** - the same behaviour implemented more than once across files instead of shared.
4. **Inconsistent patterns** - error-handling shapes that differ across endpoints, naming inconsistencies, components that do not follow the established patterns in `DESIGN.md`.
5. **Stale BACKLOG items** - cross-check `BACKLOG.md` against the actual codebase: is anything listed already done, or no longer accurate?
6. **Full accessibility and security sweep** - the same checks the review gate runs per-chunk, but applied across every route and component, not just recently changed ones.
7. **Performance smells** - flag only; do not measure.

Report findings as: FILE | ISSUE | SEVERITY (Critical / High / Medium / Low). Do not fix anything.

**Where findings go:**
- **Critical and High:** list them under a "FOR BACKLOG" heading, one short to-do line each (what to do, not the history). The main session adds these to `BACKLOG.md` and surfaces them to the user for a priority call.
- **Medium and Low:** report them in chat only, grouped by the seven headings above and kept short (a few lines per group, cap of about 10 items per group; say how many more there are if you cut any). Do not file them. The user triages the report; anything they choose not to action now is added to `BACKLOG.md` as a to-do item afterwards.

Delegate anything needing root-cause investigation to the debugger using the existing handoff format - do not attempt it inline. Runtime performance measurement has no agent: list it as a follow-up for the user to decide on."
