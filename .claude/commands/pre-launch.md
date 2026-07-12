---
description: Pre-launch audit
---

# /pre-launch - Pre-launch audit

Run a four-gate audit before any version goes live. Produce a GO / NO GO recommendation at the end.

## How to run this audit

Invoke the code-reviewer agent with the following brief:

"Run the full pre-launch audit for this project. Work through all four gates in order. For each gate, read the relevant files and report findings. Produce a GO / NO GO recommendation at the end.

## Gate 1 - Security sweep

Check every file in `src/`, `functions/`, and the project root for:
- Hardcoded secrets, API keys, tokens, or credentials anywhere in the codebase
- Any endpoint that does not validate session/auth before returning user data
- Any user input that is passed to a database query without parameterisation
- Any CORS configuration that is too permissive
- Any sensitive data logged to the console

Report each finding as: FILE | LINE | ISSUE | SEVERITY (Critical / High / Medium / Low)

Critical or High findings block GO.

## Gate 2 - Accessibility check

Check every page component in `src/pages/` for:
- Interactive elements (buttons, links, inputs) missing accessible labels or aria attributes
- Images missing alt text
- Colour contrast - does the design rely on colour alone to convey meaning?
- Focus management - can the app be navigated by keyboard?
- Form inputs missing associated labels

Report each finding as: FILE | ELEMENT | ISSUE | SEVERITY

High findings block GO.

## Gate 3 - Real device checklist

This gate cannot be automated - output it as a checklist for the human to complete on a real device before launch:

[ ] App loads correctly on iOS Safari (latest)
[ ] App loads correctly on Android Chrome (latest)
[ ] All tap targets are at least 44x44px
[ ] Text is readable without zooming at default font size
[ ] The scorecard is usable with one hand
[ ] Share function works on mobile (native share sheet appears)
[ ] Magic link email arrives and sign-in completes end-to-end
[ ] App works on a slow 3G connection (throttle in DevTools)
[ ] No horizontal scroll on any screen at 390px viewport width

Output this checklist and note that it must be completed manually. It does not block GO automatically - but any item that cannot be confirmed should be noted.

## Gate 4 - Known issues summary

Read BACKLOG.md and list every open item flagged as a known issue or bug. For each one, state whether it is a launch blocker or a post-launch item.

## Final recommendation

After all four gates:
- If any Critical or High security finding exists: NO GO - list the blockers
- If any High accessibility finding exists: NO GO - list the blockers
- If Gate 3 checklist is incomplete: FLAG - cannot confirm GO without real device test
- If all gates pass or have only Medium/Low findings: GO - list any post-launch items to track"
