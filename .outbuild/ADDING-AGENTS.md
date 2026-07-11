# ADDING-AGENTS.md
Last updated: 11 July 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

*Reference for adding a new specialist agent to a project. Read this before creating a new agent file.*

---

## When to add a new agent

Add a new agent when:
- A recurring, well-scoped role is being handled ad hoc by project-manager or claude
- The work has a clear input, a clear output, and a distinct set of tools it needs
- You expect to invoke it more than once across sessions

Do not add an agent for a one-off task, or just to have a longer list. The existing eight agents cover most builds.

---

## File location and naming

All agent files live in `.claude/agents/`. The filename becomes the agent's name when you invoke it:

```
.claude/agents/your-agent-name.md
```

Use lowercase kebab-case. Be specific: `data-migrator` is better than `helper`.

---

## Required frontmatter

Every agent file must start with YAML frontmatter:

```yaml
---
name: your-agent-name
description: One sentence — what this agent does and when to invoke it. Be specific enough that the project-manager can route to it correctly.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---
```

**Tools** — only list what the agent actually needs. Common sets:
- Read-only research: `Read, Bash, Glob, Grep`
- Writes files, no shell: `Read, Write, Edit, Glob, Grep`
- Full access: `Read, Write, Edit, Bash, Glob, Grep`

**Model** — use `sonnet` for most agents. Use `haiku` only for lightweight, repetitive tasks with no reasoning requirement.

---

## Required header

Immediately after the frontmatter, include:

```markdown
Last updated: DD Month YYYY
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.
```

---

## Agent body structure

A well-formed agent file covers:

1. **Role statement** — one sentence saying what this agent is and what it's responsible for
2. **When invoked** — what inputs it receives; what it should do first (e.g. which files to read)
3. **What it produces** — the specific output: a file, a report, a handoff summary
4. **Rules** — constraints, things it must not do, escalation behaviour
5. **Handoff summary format** — how it reports back before handing control to the project-manager

Keep agent files tight. Agents that try to do too many things produce inconsistent output.

---

## Registering the agent in CLAUDE.md

Once the file exists, add a one-line entry to the agent setup section in `CLAUDE.md`:

```markdown
- **your-agent-name** — short description of when to invoke it
```

This is what the project-manager reads to know the agent exists.

---

## Example: minimal agent file

```markdown
---
name: localisation-checker
description: Audits UI strings for hardcoded copy that should be in i18n files. Invoked before any internationalisation pass.
tools: Read, Bash, Glob, Grep
model: sonnet
---
Last updated: 11 July 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

You are a localisation auditor. You find hardcoded strings in UI components that should be externalised to i18n files.

## When invoked

Read `PRD.md` to understand which languages are in scope. Then scan all component files for string literals that are not wrapped in a translation function.

## Output

A report listing:
- File path and line number for each hardcoded string
- The string content
- Severity: Critical (user-facing), Warn (dev-facing)

Do not fix anything. Report only.
```
