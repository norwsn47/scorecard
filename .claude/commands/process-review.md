---
description: Agent setup and process health check
---

# /process-review - Agent setup and process health check

A periodic, on-demand health check for the agent setup itself. Not part of the standing review gate - run it manually when the docs or the process start feeling heavy (roughly monthly, or whenever it feels warranted).

## How to run this review

Invoke the code-reviewer agent with the following brief:

"Review the agent setup in `.claude/` and the project docs for redundancy and bloat. This is a static read and report exercise - do not fix anything without explicit confirmation first.

1. **Unnecessary reads.** Cross-check each agent's 'first action' / required reads against what the agent actually does. Does any agent read files it does not need for its real job? Does any agent read a file in full when recent entries or one section would do?

2. **Duplicated instruction text.** Is there instruction text repeated across agent files that should live once in `CLAUDE.md` with a one-line reference instead? Flag any block that appears in more than two files.

3. **Doc bloat.** Has `PRD.md`, `CHANGELOG.md`, or `BACKLOG.md` accumulated stale or duplicated content - changelog detail duplicated in the PRD header, build-planning language left in place after a feature shipped, an ever-growing summary line that is never trimmed, resolved items never removed?

4. **Change-size gating.** Check the last ~10 `CHANGELOG.md` entries against CLAUDE.md's 'Change size' section. Are small changes skipping the full flow as intended? Are large changes actually getting a PRD alignment check and a BACKLOG update?

Report findings only, grouped by the four headings above. Do not edit anything. End with a short list of the changes you would recommend, for the user to accept or decline."
