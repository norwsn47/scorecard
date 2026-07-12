# CLAUDE.md
Last updated: 12 July 2026
> Ground rules for this project. Read this at the start of every session.
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

---

## How to start every session

Always begin by invoking the project-manager agent before doing anything else. Never respond to tasks, questions, or requests directly without going through the agent system first.

The correct way to start every session:
> "Use the project-manager agent to start this session."

If a user sends a message without invoking an agent, the first response must always be to remind them to start with the project-manager agent before proceeding. Do not start any work until this has happened.

---

## Project context
This is an Outbuild project, built on a work laptop.
The project lives in a dedicated folder (e.g. `~/Projects/[project-name]`).
Tech stack is TBD — stack decisions will be made in Phase 2 before any code is written.

---

## Agent setup
This project uses a set of specialist agents located in `.claude/agents/`:
- **project-manager** — start every session with this agent
- **product-owner** — owns PRD.md and BACKLOG.md
- **design-director** — produces DESIGN.md at step 2.4
- **frontend-developer** — builds UI, always reads DESIGN.md first
- **backend-developer** — builds APIs, database, auth, integrations
- **code-reviewer** — runs the pre-push gate after every chunk
- **debugger** — invoked when something is broken and needs root-cause investigation
- **performance-auditor** — runs after scaffolding (baseline) and before launch

The following project documents live in the root and must be kept current:
`CLAUDE.md` · `PRD.md` · `BUILDPLAN.md` · `DESIGN.md` · `BACKLOG.md`

**Date rule:** Whenever any agent edits a project document, it must update the `Last updated:` line at the top of that file to today's date before saving.

---

## Design principles
This project follows the Outbuild design language. Before writing any UI code, read:
- `.outbuild/OUTBUILD-PRINCIPLES.md` — product philosophy
- `.outbuild/OUTBUILD-DESIGN-LANGUAGE.md` — transferable design principles
- `DESIGN.md` — project-specific tokens (created at step 2.4)

Do not invent a visual style. Do not default to generic patterns. Follow the principles.

---

## File access
- **Only read and write files within the project folder.** Never touch anything outside it — no other directories, no system files, no other projects.
- If you ever need to reference something outside the project folder, ask first and explain why.

---

## Edits & confirmations
- For small, obvious changes (typos, single-line fixes): go ahead.
- For anything significant — modifying multiple files, changing structure, adding new patterns, touching config — **show what you plan to do and wait for confirmation before doing it.**
- Never make silent edits. If something changed, say so.
- One change at a time. Confirm it works before moving on.
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

## Version control
This project's version control mode is set during setup. Check the project-specific rules section at the bottom of this file for the confirmed mode. If nothing is set, ask the user before assuming anything.

**Mode A — No git (local files only)**
- No git commands. No commits, no branches, no push.
- Save checkpoints by asking the user to manually copy the folder if they want a backup.
- The pre-push gate does not apply. The code-reviewer still runs static analysis and rendering verification, and the human review step still applies — but there is no commit or push at the end.

**Mode B — Git local (version control, no remote)**
- Use git for local commits and branches. No `git push` — ever.
- Use branches for all significant work: `feat/`, `fix/`, `chore/`, `refactor/`, `security/` prefix.
- Commit after every verified chunk — each commit is a safe point to return to.
- Never merge to `main` without explicit sign-off.
- The pre-push gate applies up to and including the human review and document update steps. No push step.

**Mode C — Git + GitHub (full setup)**
- Full git workflow with remote. All Mode B rules apply, plus:
- **Never merge directly to main without explicit confirmation.**
- Always create a descriptive branch before any work starts — feat/, fix/, chore/, refactor/, or security/ prefix, descriptive enough to understand from the branch list alone.
- Push the branch to GitHub and show the user the branch name and a summary of what's on it.
- Wait for the user to explicitly say "go ahead and merge" before running any merge command.
- Never auto-clean up branches without asking — always confirm before deleting local or remote branches.
- gh CLI is not available on this machine — use standard git commands only.
- Never use direct merge as a fallback — always create a named branch, push it, and wait for confirmation before merging.

---

## Pre-push gate
*Applies to Mode B (up to step 5) and Mode C (all steps). Does not apply to Mode A.*

Before any chunk is finalised, the following runs in order:
1. code-reviewer runs static analysis — Critical findings block completion
2. code-reviewer runs rendering verification — dev server started, tests run, routes checked
3. Human reviews the running app at localhost and confirms before proceeding
4. product-owner runs PRD alignment check — conflicts block completion
5. All project documents updated (BUILDPLAN.md, PRD.md, BACKLOG.md, DESIGN.md)
6. *(Mode C only)* Branch name confirmed — then push runs

This gate is mandatory for all modes. Step 6 only applies if using GitHub.

---

## Uncertainty
- Distinguish clearly between what is **Verified** (tested and confirmed), **Assumed** (reasonable but untested), and **Estimated** (a guess).
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
- Update this file if project-specific rules need to be added below.

---

## Project-specific rules
<!-- Add any rules specific to this project below this line -->

<!-- VERSION CONTROL MODE — set this during setup -->
<!-- Uncomment the line that applies:              -->
<!-- Version control: none (Mode A — local files only) -->
<!-- Version control: git local (Mode B — no remote)   -->
Version control: git + GitHub (Mode C — full)

Work laptop constraints - CLI tools:
- Wrangler CLI is not available on this machine
- gh CLI is not available on this machine
- Homebrew is not available on this machine
- Do not attempt to run any of these commands
- If a task requires one of these tools, stop and output clear manual instructions for the human to follow instead - using the Cloudflare dashboard, GitHub UI, or Resend dashboard as appropriate
