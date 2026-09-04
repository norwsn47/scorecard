# CLAUDE.md
Last updated: 4 September 2026
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
- A batch of small cosmetic changes given together is still "small": make them all on one branch, one code-review pass, one localhost review, one commit (`fix/...` describing the batch).

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

**Date rule:** Whenever a project document or an agent file in `.claude/agents/` is edited, update its `Last updated:` line to today's date before saving. Agent files carry the `Last updated:` line but rely on this rule rather than restating it.

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
- This applies to CLI tools too (Homebrew, gh, wrangler, Node/npm). The full rule is in "Project-specific rules > CLI tools" below — that block is canonical; agent files reference it rather than restating it.

---

## Version control
Git + GitHub, full workflow with remote (Outbuild "Mode C"). If the user ever asks to change this, update this section.

- **Branch first — before editing a single file or dispatching any agent.** Run `git checkout -b <prefix>/<description>` from an up-to-date `main` as the very first step of any task that will change files. Never make edits while on `main` and branch later, even if the changes would move with you — the order is the rule.
- Prefix is one of `feat/`, `fix/`, `chore/`, `refactor/`, `security/`; the description is clear enough to understand from the branch list alone.
- Push the branch and show the user the branch name and a summary of what's on it.
- Wait for the user to explicitly say "go ahead and merge" before running any merge command. Implied consent ("let's do X") is not sign-off — ask.
- Never auto-clean up branches — confirm before deleting local or remote branches.
- gh CLI may be available or installable (check `which gh` — see Dependencies); otherwise fall back to standard git + the GitHub UI.

**Hard git rules — these always apply:**
- Never push to `main` — not directly, not via merge without explicit sign-off.
- Never work on `main` — branch before the first edit (see above).
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

**PRD deviations:** if any agent's build differs from what `PRD.md` specifies — even a small, reasonable-looking call — it flags that explicitly in its handoff. It does not decide how to resolve it. The product-owner decides whether the PRD updates to match or the code changes. (Agent files reference this rather than restating it.)

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

## Output conventions
These apply to all output - from the main session and from every agent in `.claude/agents/`. Agent files reference this section rather than restating it.

**Questions go at the end.** When a response contains both information and questions, present all information, findings, recommendations and summaries first, then a clear separator (a horizontal rule or a bold "Questions for you:" heading), then the questions. Never split questions across different parts of a response - the reader should be able to scroll to the bottom to find everything that needs answering.

**British English.** Colour not color, organise not organize, recognise not recognize, behaviour not behavior, centre not center, and so on.

**No em dashes.** Use a standard hyphen-minus (-) to separate clauses or items in a sentence, never an em dash. This applies to every kind of output - summaries, instructions, questions, code comments, and document content.

**Conversational responses are concise.** Lead with the answer or the action. Skip restating context the user already has. No multi-paragraph preamble before getting to the point. This governs back-and-forth explanation and reasoning - not the structured deliverables that have a fixed format of their own (the code-reviewer's phase-by-phase report, the `DONE` handoff summaries, the completion summary format). Those stay exactly as specified; they are scanned as reference output, not read as conversation.

---

## Notes
- This is a personal project on a personal machine (no longer a corporate/managed work laptop, confirmed 24 August 2026). Standard caution still applies to system-level settings, global installs, and network calls — ask first, explain what's being installed and why, prefer minimal/reversible installs — but this is not a locked-down device requiring the extra corporate-machine caution used previously.
- Update this file if project-specific rules need to be added below.

---

## Project-specific rules

Version control: git + GitHub (full remote workflow). See the "Version control" section above.

CLI tools (Homebrew, gh, wrangler, Node/npm) — **canonical rule; every agent that touches the shell references this block:**
- This is a personal machine (confirmed 24 August 2026, no longer a managed work laptop) — these tools may already be installed, or may be installed on request, subject to the same Dependencies rule as anything else: ask first, explain what it does and why.
- Always check with `which <tool>` before assuming a tool is available or unavailable — do not assume either way.
- If a tool is missing and a task needs it, ask before installing it rather than defaulting straight to manual dashboard instructions. Prefer minimal, reversible installs (a user-local install over system-wide/sudo) where practical.
- If the user declines an install, or it isn't practical, fall back to clear, specific numbered manual instructions via the Cloudflare dashboard, GitHub UI, or Resend dashboard as appropriate — exact navigation path, exact values, what the user should see when it works.
