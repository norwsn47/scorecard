# CLAUDE.md
> Ground rules for this project. Read this at the start of every session.

---

## Project context
This is a personal golf score tracking app, built on a work laptop.
The project lives in a dedicated folder (e.g. `~/Projects/golf-tracker`).
Tech stack is TBD — stack decisions will be made in Phase 2 before any code is written.

---

## File access
- **Only read and write files within the project folder.** Never touch anything outside it — no other directories, no system files, no other projects.
- If you ever need to reference something outside the project folder, ask first and explain why.

---

## Edits & confirmations
- For small, obvious changes (typos, single-line fixes): go ahead.
- For anything significant — modifying multiple files, changing structure, adding new patterns, touching config — **show what you plan to do and wait for confirmation before doing it.**
- Never make silent edits. If something changed, say so.
- If you weren't able to run or test something, say so explicitly. Don't claim it works unless it was verified.

---

## Secrets & security
- **Never hardcode API keys, tokens, passwords, or credentials** — anywhere, ever. Always use environment variables.
- Before touching anything related to authentication, tokens, or API keys, flag it and wait for confirmation.
- If you spot a secret hardcoded anywhere in the codebase, raise it immediately.

---

## Dependencies
- **Do not install packages without asking first.** This is a work laptop — unexpected installs can trigger security alerts.
- When proposing a new dependency, explain: what it does, why it's needed, and what alternatives were considered.
- Keep the dependency set lean. No installing things speculatively.

---

## Git
- **Never run `git push` automatically.** Always confirm before anything leaves the local machine.
- Use branches for any significant work. Name them clearly: `feat/`, `fix/`, or `chore/` prefix, descriptive enough to understand from the branch list alone.
- Never merge to `main` without explicit sign-off.
- Commit after every verified chunk of work — each commit should be a safe point to return to.

---

## Uncertainty
- Distinguish clearly between what is **verified** (tested and confirmed), **assumed** (reasonable but untested), and **estimated** (a guess).
- Never present an assumption as a fact.
- If you're unsure about something, ask — don't fill the gap silently.

---

## End-of-task summary
After every significant task, provide a short summary covering:
- What changed and why
- What was tested and what wasn't
- Any known risks or loose ends
- Recommended next steps
- Confidence score (1–10)

---

## Notes
- Stack is TBD — do not assume any framework, database, or tooling until decisions are confirmed in Phase 2.
- This is a personal project on a work machine. Err on the side of caution with anything that touches system-level settings, global installs, or network calls.
