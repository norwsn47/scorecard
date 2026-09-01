# CLAUDE.md
Last updated: 1 September 2026
> Ground rules for this project. Read this at the start of every session.
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

---

## Starting work

The app is shipped and in production. Work now arrives as individual requests, not a linear build plan.

At the start of a session, skim `BACKLOG.md` and the most recent `CHANGELOG.md` entries for context. You don't need the project-manager agent for every session — invoke it when:
- the work is large or spans several parts (see "Change size" below)
- you want a considered plan before starting
- the request is vague and needs shaping into scoped work
- the user asks for it

For a small, well-defined change, just do it (following "Change size" and the review gate).

If a new idea comes up that isn't being actioned now, add it to `BACKLOG.md` — one entry, no ceremony.

---

## Change size

Decide which category a piece of work falls into and follow that path.

**Small** — a single component or file, visual/copy/layout, a contained bug fix, config. No database schema, no auth, no API contract change, no new user-facing capability.
- Build it directly (or via frontend-developer / backend-developer if you want).
- Review gate: code-reviewer static + render check → human localhost review (mandatory for anything visible in the browser) → commit.
- No PRD update, no project-manager, no CHANGELOG entry unless it's notable.

**Large** — backend logic, database schema or migration, auth, an API contract change, a new feature or user-facing capability, or anything touching several files across concerns.
- Start with the project-manager to scope and plan it.
- product-owner updates `PRD.md` first if it's a new capability or a scope change.
- Build via the right specialist agent.
- Full review gate (below), including PRD alignment.
- Add a `CHANGELOG.md` entry. Update `BACKLOG.md` (remove done items, log any follow-ups).

If a "small" change turns out to need schema/auth/API/feature work once you're in it, stop and treat it as large.

---

## Project context
Scorecard by Outbuild — a mobile scorecard for the Bruntsfield Short Hole Golf Course. Shipped and in production on Cloudflare Pages.
An Outbuild project on a personal machine (no longer a managed work laptop, confirmed 24 August 2026).
Stack: Vite + React + Tailwind CSS · localStorage (quick-play) · Cloudflare Pages, D1, Pages Functions · Resend (magic-link auth). Full detail in `PRD.md`.

---

## Agent setup
Specialist agents live in `.claude/agents/`. In active use:
- **project-manager** — scopes and coordinates large work
- **product-owner** — owns PRD.md and BACKLOG.md; PRD alignment checks
- **frontend-developer** — builds UI, always reads DESIGN.md first
- **backend-developer** — builds APIs, database, auth, integrations
- **code-reviewer** — runs the review gate
- **debugger** — root-cause investigation when something is broken

Situational (did their main job pre-launch, still available):
- **design-director** — token-level design changes to DESIGN.md
- **performance-auditor** — performance measurement

Project documents in the root, kept current:
`CLAUDE.md` · `PRD.md` · `DESIGN.md` · `BACKLOG.md` · `CHANGELOG.md`

**Date rule:** Whenever a project document is edited, update its `Last updated:` line to today's date before saving.

---

## Design principles
This project follows the Outbuild design language. Before writing any UI code, read:
- `.outbuild/OUTBUILD-PRINCIPLES.md` — product philosophy
- `.outbuild/OUTBUILD-DESIGN-LANGUAGE.md` — transferable design principles
- `DESIGN.md` — project-specific tokens and component patterns

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
- **Do not install packages without asking first.** This is a personal machine now, but installs should still be deliberate and intentional, not incidental.
- When proposing a new dependency, explain: what it does, why it's needed, and what alternatives were considered.
- Keep the dependency set lean. No installing things speculatively.
- This applies to CLI tools too (Homebrew, gh, wrangler, Node/npm itself, etc.) — check with `which <tool>` before assuming availability either way, and ask before installing anything missing. Prefer minimal, reversible installs (e.g. a user-local install over a system-wide/sudo one) where practical.

---

## Version control
Git + GitHub, full workflow with remote (Outbuild "Mode C"). If the user ever asks to change this, update this section.

- Always create a descriptive branch before starting work — `feat/`, `fix/`, `chore/`, `refactor/`, or `security/` prefix, clear enough to understand from the branch list alone.
- Push the branch and show the user the branch name and a summary of what's on it.
- Wait for the user to explicitly say "go ahead and merge" before running any merge command.
- Never auto-clean up branches — confirm before deleting local or remote branches.
- gh CLI may be available or installable (check `which gh` — see Dependencies); otherwise fall back to standard git + the GitHub UI.

**Hard git rules — these always apply:**
- Never push to `main` — not directly, not via merge without explicit sign-off.
- Never use a session-assigned branch name (`claude/anything`) — always a descriptive `feat/` `fix/` `chore/` `refactor/` `security/` branch.
- Never commit more than one logical change in a single commit without explicit instruction.
- Don't commit before the review gate has run for that change.

---

## Review gate
Runs before a change is committed. Scales with change size (see "Change size").

**Small changes:**
1. code-reviewer — static analysis (Critical findings block) + rendering verification (dev server, tests, routes)
2. Human reviews the running app at localhost and confirms — mandatory for anything visible in the browser
3. Commit on a named branch → push → wait for merge sign-off (Mode C rules below)

**Large changes:** all of the above, plus —
- product-owner updates `PRD.md` first if it's a new capability or scope change
- product-owner runs a PRD alignment check after the build — conflicts block the commit
- `CHANGELOG.md` entry added; `BACKLOG.md` updated (done items removed, follow-ups logged)

The human localhost review is never skipped, regardless of how small the change looks.

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
- This is a personal project on a personal machine (no longer a corporate/managed work laptop, confirmed 24 August 2026). Standard caution still applies to system-level settings, global installs, and network calls — ask first, explain what's being installed and why, prefer minimal/reversible installs — but this is not a locked-down device requiring the extra corporate-machine caution used previously.
- Update this file if project-specific rules need to be added below.

---

## Project-specific rules

Version control: git + GitHub (full remote workflow). See the "Version control" section above.

CLI tools (Homebrew, gh, wrangler, Node/npm):
- This is a personal machine (confirmed 24 August 2026, no longer a managed work laptop) — these tools may already be installed, or may be installed on request, subject to the same Dependencies rule as anything else: ask first, explain what it does and why.
- Always check with `which <tool>` before assuming a tool is available or unavailable — do not assume either way.
- If a tool is missing and a task needs it, ask before installing it rather than defaulting straight to manual dashboard instructions.
- If the user declines an install, or it isn't practical, fall back to clear, specific manual instructions via the Cloudflare dashboard, GitHub UI, or Resend dashboard as appropriate.
