# Workflow Lessons - retiring the PRD, and backlog admission rules
Last updated: 27 September 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

*Written for the agent redesigning the R&A Build Kit (v1.8). Everything below is drawn from one real project's transition from active build to iteration. Nothing in the kit is fixed - treat this as evidence and a proposal, not a patch.*

---

## 1. Summary

A shipped, single-owner project carried two build-phase artefacts into its iteration phase past the point they earned their keep: a PRD that needed updating for every small change, and a backlog that had grown into a review archive. Both were fixed in the same session, by the same underlying move: work out which artefact's job has been taken over by something else (code, tests, the owner's own memory), then retire the artefact and reassign whatever of its job is still real.

**The core lesson is not "don't write a PRD."** For the initial build, the PRD and a product-owner role earned their place - they were the only place the spec existed before code did. The lesson is to *retire it deliberately, at the right moment*, rather than let it either linger unmaintained or get abandoned all at once with nothing salvaged. The same applies to a backlog: it needs an admission filter from day one, or it fills with noise no one intended to keep.

The kit should build this lifecycle in rather than leave each project to discover it the hard way.

---

## 2. Evidence from this project

### Before / after

| Area | Before | After |
|---|---|---|
| Spec | A large PRD, updated for every product change, cited by section number across dozens of code comments | Retired. Behaviour lives in code and tests; the handful of facts code can't recover moved to the rules file or a code comment |
| Product-ownership agent | A dedicated agent whose only job was writing and aligning the PRD | Removed entirely. Scope decisions go to the owner directly, in conversation |
| Review-gate step | A "PRD alignment" / "PRD deviations" check, run for large changes | One generic "deviations" line in every handoff: what was built differently, and why |
| Backlog | Had grown into a review archive: audit findings, accepted/won't-fix items, stale housekeeping notes, no filter on what got added | Three short sections plus one tidy-ups line, one to three lines per entry, an explicit admission filter |
| Non-blocking review findings | Filed to the backlog automatically | Reported in chat only; never filed |
| Won't-fix / accepted context | Lived as a backlog entry indefinitely, un-actioned | A one-line code comment at the exact spot it explains, or a one-line entry in the known-and-accepted list |

### Change 1 - retiring the PRD and its agent

**Symptom.** Keeping the PRD current for every change cost more than the change itself, for changes that no longer needed a spec written first. Nobody but the assistant read the document day to day. Dozens of code comments and doc lines cited its section numbers, each one a small maintenance liability of its own.

**Cause.** The project had shipped and moved from a linear build plan to a stream of individual small requests, with one person acting as product owner already, in practice, for months. The PRD's actual job - describing what the product currently does - was now done faster and more reliably by the code and its tests. The product-owner agent's only job was keeping the PRD synced to a reality it always trailed a step behind.

**Fix.** Went through the PRD section by section and pulled out the small number of facts that code genuinely could not recover on its own: environment variable names, an explicit out-of-scope list, and a handful of deliberate product rules that would look like bugs without their reasoning attached (a stroke cap set higher than the official rule; two histories kept deliberately unmerged; a marker rule scoped to one device). Those moved into the project's rules file. Everything else was superseded by the code itself. Deleted the PRD, deleted the product-owner agent outright (not merged elsewhere - once its one job was gone, there was no residual job to give it), and replaced every "PRD alignment" / "PRD deviations" review step with one generic line every agent's handoff now carries. The decision itself, and why, went into the changelog - that is now the permanent record of "there was a PRD, and here is why there isn't one now," so nothing else needs to preserve that context.

### Change 2 - backlog admission rules

**Symptom.** The backlog had grown from a to-do list into a review archive. It carried review provenance ("code-review housekeeping, CLEAR WITH NOTES"), citations to the (by-then-retired) PRD's section numbers, and items marked accepted or "no fix planned" that had sat there, unactioned, for weeks. A full-codebase audit run once had left over half the file as findings nobody had asked to track.

**Cause.** Two automatic inflows had no filter on them. An audit command filed every Medium and Low finding, and even explicitly said anything the owner chose not to act on immediately would be added afterwards anyway. A code-review step logged its whole "clear with notes" section - including non-blocking, cosmetic and speculative observations - as backlog entries, not just the findings that actually blocked anything. The backlog had a rule for *removing* a finished item, but no rule at all for what was allowed to get added. It could only ever grow.

**Fix.** Added an explicit admission filter: an entry goes in only if it is a real bug, a feature idea that has actually been asked for, or a manual step the owner owes. Critical and High findings from a review or an audit still go in; everything else stays in the chat report and is never filed automatically. An accepted or won't-fix item is never logged at all - if the reasoning behind it matters, it becomes a one-line code comment at the exact spot it explains, not a backlog line that sits there forever. Entries were capped at one to three lines. The same filter was applied everywhere findings could enter the backlog - the audit command and the code-reviewer's follow-up section - not just the backlog file's own header, because a rule stated in one place and violated by every writer is not a rule.

---

## 3. Principles

- **Every document needs a single job that no other artefact already does.** The moment something else does that job better - code, tests, the owner's own memory - the document is overhead wearing the shape of a safeguard.
- **A planning document stops earning its keep once code becomes the source of truth for what it records.** A PRD records *behaviour*; once the app is shipped, the code is a better, faster, always-current record of behaviour than a document anyone has to remember to update. A design-language document records *intent and rationale* - code doesn't explain why a colour was chosen, only that it was - so that kind of document can keep earning its place long after behaviour-focused ones stop.
- **An agent that exists only to maintain one document should be removed the moment that document is.** If it has no other job, it has no reason to survive its one artefact.
- **Process weight should match the project phase, not the project's age.** A five-step review gate makes sense when almost every change is architecturally significant. It's the wrong shape once most changes are small, well-understood, and asked for by name.
- **A backlog needs an admission filter, not just a removal rule.** Without a rule for what is allowed in, it will only ever grow - every audit, every review, every one-off observation is a plausible-sounding reason to add one more line.
- **Won't-fix and accepted context belongs next to the code it explains, not in a to-do list that never gets actioned.** A backlog entry implies someone intends to act on it. If nobody does, the honest place for the reasoning is a comment where a future reader will actually see it.
- **Audits and reviews always find more than anyone will act on as a to-do - filter what gets written down as a to-do, never what gets reported.** The volume an automated sweep produces is not a signal of how much should become a backlog entry, but every finding still gets reported and a proposed call. The filter sits between the report and the backlog, not between the sweep and the report.
- **A retired document's rationale survives in the commit and changelog trail, not by keeping the document around "just in case."** Delete it properly; the reasoning for deleting it is itself worth recording, once, in the changelog.

---

## 4. Proposed kit workflow

### Build phase (kept, largely as-is)

Keep the spec document and its dedicated owning agent for this phase - this is exactly where they earn their place. Nothing has shipped yet, so there is no code to act as a competing source of truth, and a single owner still benefits from an explicit, written, agent-grilled spec before implementation starts. Keep the full review gate on every change: in this phase almost every change is architecturally significant, so there's no small/large split worth making yet. Keep a changelog entry on every commit, for the same reason - everything is still worth a permanent record while the shape of the project is being decided.

### The phase switch - "v1 shipped"

**Trigger conditions.** Don't infer this silently - ask the owner directly. Signs it's time:
- The product is live, in front of real users.
- The person who was the "product owner" role is now just *the* owner, day to day, with no one else to align with.
- Work has stopped arriving as a planned sequence of build chunks and started arriving as individual, mostly small requests.
- The owner (or the assistant) is updating the spec *after* the code changes, to match what already shipped, rather than before, to plan it.

That last one is the clearest tell: a spec that only ever gets updated in arrears has already stopped doing its job.

**Build this in as a command, not a one-off manual pass.** The kit should ship an explicit transition step (call it something like a "graduate to iteration" command) that does the following, in order:

1. **Confirm with the owner first.** State the trigger conditions found and ask for explicit sign-off before touching anything - this is a one-way door for the current project.
2. **Finish or park in-flight work first.** New feature and bug requests will keep arriving while this runs. Don't fold them into the retirement branch - log them for later (or park them on their own branch) and keep the retirement a single, clean, reviewable piece of work. Mixing "we're changing how the project works" with "we're also shipping a new capability" in one branch makes both harder to review and to revert independently.
3. **Salvage before deleting.** Read the spec and pull out anything code cannot recover on its own: configuration/secret names, an explicit out-of-scope list, and any deliberate product rule that would look like a bug without its reasoning attached. Show the candidate list to the owner before writing anything - this is a judgement call about what still matters, and it's the owner's call, not the agent's.
4. **Reassign ownership of any document the retiring agent still owns *before* deleting that agent.** If the same agent maintains two documents and only one of them is being retired, hand the other one to whoever is taking over that responsibility first. Don't leave a document's owner-of-record pointing at an agent that no longer exists.
5. **Retire the spec and its dedicated agent.** Delete outright rather than archive-in-place - the changelog entry from step 8 is the historical record; a "-final" or "-old" copy left in the repo is just a second stale document waiting to happen.
6. **Sweep everything that referenced either of them** - every agent file (frontmatter description *and* body; the description text goes stale just as easily as the body), every command, any pre-commit or CI hook that hardcodes a list of "these documents matter" (easy to forget, since it's neither a doc nor an agent file), and code comments. Replace every "spec alignment" / "spec deviations" review step with one generic line, used everywhere: *"Deviations: anything built differently from what was asked, and why."*
7. **Grep twice, not once.** Search for the document's literal name, and *separately* search for its citation convention (section numbers, a symbol it always used, whatever pattern its cross-references took). A citation that dropped the document's name over time - "see §4.2" rather than "see PRD §4.2" - will not show up in a name-only search, and there will be more of these than the first pass expects. Budget for a second, follow-up cleanup branch; do not assume one sweep caught everything.
8. **Verify, then record the decision.** Run whatever the project's existing checks are (lint, tests) to confirm a comment-only sweep didn't break anything. Add one changelog entry recording the decision and why - this is the permanent record from here on.

### Iteration phase (the new, lighter default)

- **Split changes by size.** Small, well-defined changes (a component, a copy fix, a contained bug) skip the full gate: automated checks plus a human look at the running result is enough. Anything touching schema, auth, an API contract, or a genuinely new capability still gets the full review gate.
- **Changelog entries only for decisions or reversals**, not every commit. Routine changes are already in the commit history; the changelog is for the *why*, reserved for things worth a permanent, human-readable record.
- **No spec-alignment gate.** Anything that changes what the product does gets confirmed with the owner directly, in conversation, before it's built - replacing the old "check it against the spec" step with "check it with the person who'd have written the spec."
- **The backlog admission rule applies from here on** (see §5 for exact wording) - this is the phase where a backlog left ungated will actually fill up, because there are now many more small, independent changes generating findings than there were architecturally-significant ones.

---

## 5. Changes file by file

*Names below are generalised from the kit's own file names - substitute the kit's actual file names for the equivalents described.*

**Core rules file (`CLAUDE.md`-equivalent)** - **change.** Add the two-phase structure explicitly (Build vs Iteration) rather than leaving it implicit in `START-HERE.md`/`PLAYBOOK.md`. Add the small/large change-size split, scoped to the iteration phase. Add the backlog admission rule (or a pointer to it - see below). Replace "spec alignment" language in the review-gate section with the deviations line.

**Initial-setup guide (`START-HERE.md`-equivalent)** - **change, lightly.** Keep the Define → Stack/design → Scaffold → Build sequence and the spec-writing step as-is; this is exactly where it belongs. Replace the vague "once v1 is shipped, switch to the reference doc" ending with a named trigger check and a pointer to the transition command in §4.

**Post-v1 reference (`PLAYBOOK.md`-equivalent)** - **change, substantially.** Remove "the spec is always current" as a standing rule - it's true only in the build phase. Any entry that routes a new feature, a spec drift-check, or backlog grooming through the spec-owning agent needs a visible "build phase only" label, with the iteration-phase alternative given alongside it (route to the owner directly; use the tightened backlog rule).

**Backlog file** - **change.** Add an explicit admission rule to its own header, not just a removal rule. Ready to paste:

```
- Adding: only if it's something the owner would actually do - a real bug, a
  feature idea that's been asked for, or a manual step they owe. Critical/High
  findings from a review or audit go in; everything else stays in the chat
  report. Non-blocking review notes are never logged here. Accepted or
  won't-fix items are never logged here either - the reasoning goes in a
  code comment or the known-and-accepted list instead, never just dropped.
- Entries stay one to three lines: what needs doing, not the history.
```

**Changelog file** - **change, minor.** State explicitly: every commit gets an entry in the build phase; only decisions and reversals get one in the iteration phase.

**project-manager (or equivalent orchestrator) agent** - **change.** Update its backlog-follow-up instructions to the tightened admission rule. Past the phase switch, route "does this change what the product does?" to the owner directly instead of to a spec-owning agent.

**product-owner (or equivalent spec-owning) agent** - **keep, for the build phase; built to be removed per-project.** The kit should still ship this agent - every new project starts in the build phase and needs it. But the transition command in §4 is what deletes *that project's* copy once it graduates; the kit itself keeps shipping the agent for the next new project.

**design-director (or equivalent design-system) agent** - **keep, unaffected.** It maintains a document, but that document records design *intent*, which code doesn't restate on its own the way it does behaviour - it doesn't go stale the same way a behaviour spec does. Worth re-checking against the diagnostic list in §7 periodically anyway, in case that stops being true for a given project.

**frontend-developer / backend-developer (or equivalent builder) agents** - **change.** Remove the spec-read step from "first action" once past the switch (or gate it behind a phase check). Replace the "spec alignment" handoff bullet with the deviations line. Point configuration/environment-variable references at the rules file instead of a spec section that may no longer exist.

**code-reviewer (or equivalent review) agent** - **change.** Rename "spec alignment" to a "scope check" against the request and the project's stated out-of-scope list. Ready to paste, for its follow-ups section:

```
What goes in follow-ups: only Critical or High findings, one to three lines
each - plus anything about security, privacy, data loss, or user-facing
copy that's no longer true, whatever its severity. Speculative concerns,
hypothetical edge cases, minor polish, and anything else accepted or
won't-fix stay in the report body and are not filed - put the context in a
code comment, or the known-and-accepted list, instead if it matters.
```

**debugger (or equivalent root-cause) agent** - **keep, unaffected.** Never referenced the spec in the first place; nothing here changes.

**A performance-focused agent, if the kit has one** - **flag as a candidate to cut**, on the same pattern as the spec-owning agent: if its checks turn out to be rare enough, and cheap enough, for the general-purpose orchestrator to run directly when asked, a dedicated agent whose only job is "run these checks occasionally" is itself a document-maintenance-shaped agent - it exists to maintain a *practice*, not a document, but the shape of the waste is the same. Worth testing against §7 rather than assumed safe.

**Audit command (`/full-audit`-equivalent)** - **change.** Report everything found; the filter applies only to what enters the backlog afterwards, and certain categories always escalate regardless of severity (see §6). Ready to paste:

```
- Report every finding, with a proposed call: fix now, backlog, or accept.
  Security, privacy, data loss, or anything that makes user-facing copy
  untrue always gets flagged for an explicit decision, whatever its severity.
- Save the full report as a dated file (e.g. audits/YYYY-MM-DD.md) - a
  record, not a to-do list. Compare against the previous audit and flag
  anything recurring in the same area.
- The owner triages in one pass. Only findings marked "backlog" during
  triage go into the backlog, as a one-to-three-line entry each. Nothing is
  filed automatically, and nothing is dropped silently either.
```

**Pre-launch command (`/pre-launch`-equivalent)** - **change, conditionally.** Reading the spec here is legitimate *in the build phase* - it's a real pre-launch gate check. Once the spec is retired for a given project, this command must stop reading it; add it to the sweep in §4 step 6, since commands are as easy to forget as agent files are. This command also stays exhaustive regardless of phase - it never applies the iteration-phase reporting shape from §6; a pre-launch gate needs everything on the table, not a pre-triaged subset.

**Process-health command (`/process-review`-equivalent)** - **change.** This is the natural home for the diagnostic checklist in §7 - extend its existing "doc bloat" check into an explicit phase-switch-readiness read-out, not just a bloat warning.

---

## 6. Guardrails so the audit isn't over-simplified

The admission filter in §3 and §5 governs what becomes a to-do. It must never govern what an audit finds or reports - a severity filter on the report itself would quietly drop things that mattered, not just things that were noise.

- **Audits report every finding, each with a proposed call: fix now, backlog, or accept.** The owner confirms all of them in one triage pass. Only the findings marked "backlog" during that pass go into the backlog - nothing is filed automatically, and nothing is silently dropped either.
- **Security, privacy, data loss, and anything that makes user-facing copy untrue always go to the owner for an explicit decision, whatever their stated severity.** A finding in one of these categories is never filtered out on a Low or Medium label alone. (One real near-miss from this project: an injected analytics script that contradicted the app's own "no tracking" privacy copy was nearly waved through as a routine chore, on severity alone, before it was caught and escalated.)
- **Keep a short "known and accepted" list, one line each, that audits and reviews read before reporting**, so a decision already made doesn't get re-raised as if it were new. This is separate from the backlog - nothing on it is a to-do. A code comment still carries the reasoning where an issue sits in one specific spot; the list is for decisions that don't have one obvious place to live next to.
- **Save each full audit's report as a dated file** (for example `audits/2026-09-27.md`), as a permanent record, not a to-do list. A later audit compares against the previous one and flags anything recurring in the same area - a repeated finding is a far stronger signal than a first one.
- **Pre-launch audits stay exhaustive.** The lighter reporting shape described here is for ongoing, iteration-phase audits and reviews, not the one-off gate before a launch - see §5's note on the pre-launch command.

---

## 7. Diagnostic checklist

For the process-health command, and for deciding when a project is ready for the phase switch. None of these need a "yes" to every one - they're a prompt for a conversation with the owner, not a hard gate.

- Is the spec being updated *after* the code, to match what already shipped, rather than before, to plan it?
- Does an agent exist only to maintain one document? Does that document still change what gets built when it changes, or does it just get resynced to reality after the fact?
- What share of open backlog items would the owner actually act on in the next month? If it's a small fraction, the backlog has an admission problem, not a triage problem.
- Do findings from a review or an audit bypass the stated severity threshold and get logged anyway?
- Does every agent handoff carry a field that's usually empty ("spec deviations: none", "spec alignment: not applicable")? A structurally-empty field is a sign the check it belongs to has stopped earning its place.
- Is the same person the builder, the reviewer's intended audience, *and* the product owner? If so, documents written for handoff between roles are pure overhead - there's no one else to hand off to.
- Are most changes now small, well-understood asks rather than new capabilities that genuinely need a spec written first?
- Has the project shipped, and moved from executing a plan to responding to individual requests?
- Has a finding that was dropped or accepted come back in a later audit?
- Did anything to do with security, privacy or copy-truth get filtered out on severity alone?

---

## 8. When the heavier process should stay

Don't apply this lifecycle indiscriminately. The build-phase weight is the right call, indefinitely, when:

- **More than one person is building or deciding scope.** A spec is the shared source of truth between people; once there's more than one person, "the code is the source of truth" only works if everyone reads code at the same fluency, which is rarely true for non-engineering stakeholders.
- **A stakeholder outside the build needs a written spec to sign off on**, whether that's a client, an investor, or a non-technical founder - the document's job there is agreement between parties, not description of behaviour, and code cannot do that job at all.
- **The work is regulated, or otherwise needs an audit trail of what was specified and approved**, independent of what shipped. Retiring the spec removes exactly that trail.
- **The build phase is genuinely long, or nothing has shipped yet.** If there's no running product to act as a competing source of truth, the spec has no competitor yet - the whole rationale for retiring it doesn't apply.
