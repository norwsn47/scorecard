# START-HERE.md
Last updated: 11 July 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

*The complete guide to starting a new Outbuild project from scratch. Read this once, follow it in order. Once you've shipped v1, switch to PLAYBOOK.md for ongoing work.*

---

## Step 0 — Check your setup

Before anything else, open Claude Code and say:

> "Use the project-manager agent to run a setup check. Confirm that CLAUDE.md, .outbuild/OUTBUILD-PRINCIPLES.md, .outbuild/OUTBUILD-DESIGN-LANGUAGE.md, and all agent files exist in .claude/agents/. For each file that exists, tell me what it covers at a high level and when it was last updated. Flag anything missing."

The project-manager will confirm everything is in place, then ask you one question:

> "How do you want to handle version control for this project?
> A) No git — just local files, no setup needed
> B) Git local — version control on your machine, no GitHub yet
> C) Git + GitHub — full setup with remote backup and push protocol"

Pick whichever suits this project. You can always change it later.

- Trying something out quickly → **A**
- Building something you want checkpoints on but not ready for GitHub → **B**
- Building something serious or shareable from the start → **C**

Everything else adapts automatically. If you pick A or B, any steps mentioning GitHub simply don't apply.

If anything is missing or needs tweaking (project name in CLAUDE.md, specific rules for this project), tell the project-manager now before you start building.

```
/your-project/
├── CLAUDE.md                        ← project rules and guardrails
├── .outbuild/                       ← Outbuild references (read-only)
│   ├── OUTBUILD-PRINCIPLES.md       ← product philosophy
│   ├── OUTBUILD-DESIGN-LANGUAGE.md  ← transferable design principles
│   ├── ADDING-AGENTS.md             ← how to extend the agent team
│   ├── START-HERE.md                ← project setup guide (this file)
│   └── PLAYBOOK.md                  ← ongoing work reference
└── .claude/
    └── agents/
        ├── project-manager.md
        ├── product-owner.md
        ├── design-director.md
        ├── frontend-developer.md
        ├── backend-developer.md
        ├── code-reviewer.md
        ├── debugger.md
        └── performance-auditor.md
```

---

## Step 1 — Set up version control (if using git)

*Skip this step if you chose Mode A (no git).*

**Mode B — Git local:**
```bash
git init
git add .
git commit -m "chore: initial setup"
```

**Mode C — Git + GitHub:**

> "Set up the GitHub repo for this project, initialise git, make an initial commit, and connect to the remote."

---

## Phase 1 — Define the idea

### Step 1.1 — Create the PRD

Tell the project-manager what you want to build. It will hand off to the product-owner:

> "Use the product-owner to create the PRD for [your idea]. Have it ask me clarifying questions before writing anything."

The product-owner will ask questions to understand the problem, users, features, and constraints. Answer them. It then writes `PRD.md` — the single source of truth for what you're building.

### Step 1.2 — Grill me

Once the PRD exists, ask the product-owner to pressure-test it:

> "Use the product-owner to grill me on the PRD. I want it to find everything underspecified, contradictory, or missing."

This is not optional. Weak PRDs produce weak builds. Push until the PRD is genuinely tight.

**→ Do not create the build plan yet. That comes after the stack is confirmed.**

---

## Phase 2 — Choose your stack

### Step 2.1 — Tech stack conversation

> "Use the project-manager to recommend a tech stack for this project based on the PRD. Justify each choice and flag any trade-offs."

### Step 2.2 — Tools and integrations

Decide on third-party tools — email (Resend), payments (Stripe), auth (Clerk), etc. If you already know what you want:

> "I want to use [tool] for [purpose]. Confirm this fits the stack and update the PRD."

If you're not sure, ask the project-manager to recommend.

### Step 2.3 — Environment variables

> "List every environment variable this project will need based on our stack and integrations. Give me the names and what each is for."

The product-owner updates the PRD with all confirmed stack decisions, tools, and env var names.

### Step 2.4 — Design direction

This is where you establish the visual language before any code is written.

Collect reference material first:
- **Mobbin** (mobbin.com) — screenshot UI patterns you like: navigation, cards, forms, empty states
- **Wink Creative** (winkreative.com) — broader visual and brand inspiration
- **Pentagram** (pentagram.com/work) — design thinking and identity

Then:

> "Use the design-director to produce DESIGN.md. Here are my references: [paste URLs or describe what you like]. Read the PRD and both Outbuild principles files and produce a design direction for this project."

The design-director reads `.outbuild/OUTBUILD-PRINCIPLES.md` and `.outbuild/OUTBUILD-DESIGN-LANGUAGE.md` before making any decision. It uses your references for colour mood and visual texture, and the principles for everything else. It will ask you to confirm the direction before writing the file.

The result is `DESIGN.md` — colour tokens, type scale, spacing, component patterns. Every agent that builds UI will read this file.

### Step 2.5 — Create the build plan

Now — and only now — create the build plan. The stack, tools, env vars, and design direction are all confirmed, so the plan can be accurate first time.

> "Use the project-manager to create BUILDPLAN.md. We've confirmed the stack and design direction. Break the PRD into build chunks that can each be built and tested independently. Order them so each one builds on verified work."

**PRD = what you're building. Build plan = how and in what order, given the confirmed stack.**

The build plan contains only things you're actually building — not setup steps like "decide the stack" or "set up git". Those are already done.

---

## Phase 3 — Set up and scaffold

### Step 3.1 — Create the repo (if using git)

*Skip if Mode A.*

**Mode B:** The project-manager will initialise git locally.

**Mode C:**
> "Create the GitHub repo for this project and connect it."

Or do it manually through GitHub if you prefer.

### Step 3.2 — Scaffold the project

> "Use the project-manager to scaffold the project based on our confirmed stack. Empty structure only — no features, no content. It should build without errors. Include BUILDPLAN.md in the root."

### Step 3.3 — Scaffold review + performance baseline

Two things happen here:

> "Use the code-reviewer to review the scaffold. Check folder structure, dependencies, config files, and environment variable wiring. Flag anything misconfigured."

Then immediately after:

> "Use the performance-auditor to run a baseline measurement on the empty scaffold. I want a reference point to compare against at launch."

This baseline matters. It tells you what performance looked like before you built anything, so regressions are obvious later.

### Step 3.4 — Set up the test suite

> "Before we write any features, set up a test suite. Map the critical user paths from the PRD, write unit and integration tests, and configure a test runner."

---

## Phase 4 — Build

This is the repeating loop. For every chunk of work:

### The build loop

**1. Start the session**

> "Use the project-manager to start this session."

It reads all project documents and tells you where you are and what's next.

**2. Build the chunk**

The project-manager identifies the next chunk from BUILDPLAN.md and hands off to the right agent:

- UI work → frontend-developer
- API / database / auth / integrations → backend-developer

The developer builds the chunk and outputs a handoff summary including any PRD deviations.

**3. Pre-push gate (automatic)**

After every chunk, the following runs in sequence — you don't need to remember it, the project-manager coordinates it:

```
code-reviewer: static analysis        → Critical findings block the push
code-reviewer: rendering verification → starts dev server, runs tests,
                                        checks all new routes render
code-reviewer: human review gate      → YOU open localhost and test it
                                        manually before anything is pushed
product-owner: PRD alignment check    → conflicts block the push
documents updated                     → BUILDPLAN, PRD, BACKLOG, DESIGN
branch proposed                       → you confirm → push
```

**4. Commit and repeat**

Once the gate passes and you've confirmed the branch name, the push runs. Then back to step 1 for the next chunk.

### During the build — periodic checks

Every few chunks, run a drift check:

> "Use the product-owner to compare the codebase against the PRD. Flag anything drifted, anything outside scope, and anything in the PRD not yet addressed."

At the end of each major feature:

> "Use the code-reviewer to do an error handling pass. Check for missing try/catch, unhandled states, and inconsistent error shapes."

### Step 4.4 — Security audit (before pre-launch)

> "Use the code-reviewer to run a full security audit of the codebase. Look for hardcoded secrets, missing auth checks, unvalidated input, injection risks, and anything in git history. Don't auto-apply — show me each finding first."

Review every change manually. This is the one place where you do not auto-accept.

### Step 4.5 — Pre-launch

> "Use the performance-auditor to run a pre-launch performance audit. Compare against the baseline from step 3.3 and flag any regressions."

Then:

> "Use the code-reviewer to run the pre-launch checklist. Assume the security audit is done. Check for console.logs, missing env vars, hardcoded values, and anything not production-ready."

Once both are clear, you're ready to ship.

---

## What you've produced by the end

```
/your-project/
├── CLAUDE.md              — rules and guardrails
├── PRD.md                 — what you built (kept current throughout)
├── BUILDPLAN.md           — how you built it (all chunks ticked off)
├── DESIGN.md              — visual tokens and component patterns
├── BACKLOG.md             — ideas for future versions
├── ARCHIVE.md             — completed backlog items
├── .outbuild/             — Outbuild references (principles, playbook, guides)
└── .claude/
    └── agents/            — your team
```

**Next: open `.outbuild/PLAYBOOK.md`** for how to add features, fix things, tweak the design, and manage the project once the initial build is done.

