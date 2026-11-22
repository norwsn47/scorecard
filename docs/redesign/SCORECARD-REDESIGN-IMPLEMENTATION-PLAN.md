# Scorecard redesign: implementation plan
Last updated: 22 November 2026
> How to bring the Figma redesign into the live app, in small, reversible stages, using the project's existing workflow (CLAUDE.md, DESIGN.md, agents, review gate).

Source of truth for the design: Figma file `1I1SSucIxg7CVz9HEysdp3` (Outbuild), board "Scorecard design system (latest)", node `66-1004`. It holds seven screens, the 18 components, the colour, type, shape and spacing tokens, and the content-page rules. The code agent may not be able to open Figma, so it works from the reference pack in section 11 (text spec first, PNGs for the look). If your Claude Code setup can use the Figma connector, use it as a bonus, not as the only source.

Labels used below follow CLAUDE.md: **Verified** (checked in the repo or Figma), **Assumed** (reasonable, not tested), **Estimated** (a guess).

---

## 1. How this works, in plain English

- The work happens in Claude Code, in your repo folder, using the agents you already have. You do not write code.
- The design is applied in nine small stages, each on its own branch. The first stage changes almost nothing you can see; later stages change one area at a time (type, buttons, header, cards, History filters, score table).
- Your jobs: answer the open decisions in section 4, look at each stage running on localhost (or the Cloudflare preview URL on your phone) and compare it to the Figma board, and say "go ahead and merge" when you are happy.
- Nothing reaches `main` without that sign-off, and every stage can be undone on its own.

## 2. What was checked (Verified)

**Stack and rules**
- Vite + React 18 + Tailwind 3, Vitest (jsdom), Cloudflare Pages with Functions and D1. No new dependencies are needed for this plan.
- CLAUDE.md rules that apply to every stage: branch first (`feat/`, `fix/`, `chore/`, `refactor/`), one logical change per commit, `npm run lint` and `npm test` before commit, mandatory human localhost review for anything visible, never push to `main`, wait for "go ahead and merge", update `Last updated:` lines (a pre-commit hook enforces the date), British English, no em dashes, flag every deviation from what was asked.
- Large changes (several files across concerns, new components) go through the project-manager and the code-reviewer. Token-level changes to DESIGN.md go through the design-director.

**Token architecture (good news)**
- Colours, fonts, radii and shadows are already CSS variables in `src/styles/index.css`, mapped to Tailwind classes in `tailwind.config.js`. The redesign can be applied by changing tokens and adding a few utilities, not by hunting hex codes.
- Raw colour values outside the tokens exist only in `src/utils/share.js` (the share image, drawn on a canvas, mirrors the tokens by hand). It must be updated only if a token value changes.
- Fonts: the self-hosted variable files already cover Cormorant Garamond italic 400 to 600 and Inter 400 to 600. The redesign's Medium Italic title and Semibold caps need no new font files.
- The app root font size is 18px on screens wider than 430px (desktop phone frame). Type and spacing utilities must be written in `rem`, not `px`, or the desktop frame will stop scaling.

**How much code the redesign touches (count of source lines, excluding tests)**

| Pattern | Lines | Becomes |
|---|---|---|
| `text-xs` / `text-sm` / `text-base` | 133 / 106 / 34 | the 8 type utilities |
| `uppercase` and `tracking-[...]` | 72 each | sentence case, except Label caps |
| `rounded-sm` / `rounded-md` | 39 / 31 | one control radius (6px) |
| `px-5` / `px-6` | 26 / 23 | page padding token (16px) |
| `bg-accent/10` | 9 | the single accent tint |
| `shadow-card` / `shadow-btn` | 8 / 11 | cards and primary button only |

**Tests**
- About 60 test files. Only two reference styling classes: `ParDelta.test.jsx` and `field-border.test.jsx`. **Assumed:** the rest query by role and text, so a visual refactor is low risk. This must be confirmed by running the suite before starting (section 8).
- **Not verified:** I could not run `npm install`, `npm test` or `npm run lint` (no network in my environment). A baseline run on your machine is stage 0.

## 3. Decisions the redesign reverses (ACCEPTED on 22 November 2026)

These are documented, deliberate rules in DESIGN.md today. The owner has accepted all nine. They are recorded as decisions in `CHANGELOG-decisions-to-add.md` (stage 0 adds them to CHANGELOG.md) and each stage updates the matching DESIGN.md section when it ships.

1. Uppercase, tracked button labels become sentence-case Inter (DESIGN.md "Primary button label").
2. Button radius 4px and control radius 8px become one 6px control radius ("sharp printed-document feel" is dropped).
3. The bordered "Header action" button (Finish, Save, + Add) becomes a plain text action, with a filled pill only when it is the expected next step.
4. The dashed "+ Add player" ghost button and the outlined "Resume game" accent button become the standard Secondary or Text button.
5. Page padding 20 or 24px becomes 16px; the page header becomes a fixed 68px.
6. History filter chip rows become two filter pills ("Course", "Player") that open a picker sheet.
7. Static record cards (History rounds, Home course card) carry the soft card shadow. DESIGN.md currently says static surfaces carry no shadow.
8. The score-vs-par superscript (`0.6em`, about 10px) becomes a fixed 12px caption.
9. History rows no longer show the "Winner: ..." line or the winner highlight (Summary keeps its winner line).

---

## 4. Open decisions (answer these before the stage that needs them)

| # | Decision | Needed by | Recommendation |
|---|---|---|---|
| D1 | Hole column in the score table. | Stage 7 | **Decided: tint only, no hairline.** 56px wide (as today), labels left-aligned, same deeper cream as the header and total bands. The active row keeps its own tint across the column. |
| D2 | Five and six players. | Stage 7 | **Decided: keep up to 6 players.** Designed in Figma (board section "Score table: tinted hole column, up to six players"). One density rule, see 5f. |
| D3 | Four colour values differed between Figma and code. | Stage 1 | **Decided: code wins. Figma has been corrected** (field edge, accent hover and pressed, under par, over par, plus a new control grey token). Nothing to change in code for these. |
| D4 | The nine reversals in section 3. | Stage 0 | **Decided: yes to all nine.** |
| D5 | Screens that were never redesigned: Login, Courses, Course edit (par stepper grid), course page, Privacy. | Stage 8 | **Decided: they inherit the new tokens and shared components; review them in stage 8 and only redesign what looks wrong.** |
| D6 | Optional visual-regression screenshots (Playwright as a dev dependency). | Stage 0 | **Decided: skip for now; use the manual comparison checklist in section 8.** Nothing is installed. |

---

## 5. Figma to code mapping

### 5a. Colour

| Role | Figma value | Code token today | Status | Action |
|---|---|---|---|---|
| Page | `#F7F4EE` | `--color-bg` | Same | none |
| Card and field fill | `#F5EFE3` | `--color-bg-card` | Same | none |
| Text | `#1A1A18` | `--color-text` | Same | none |
| Muted text | `#6B6560` | `--color-text-muted` | Same | none |
| Hairline | `#D9D0C4` | `--color-border` | Same | none |
| Accent | `#1A4329` | `--color-accent` | Same | none |
| Accent tint (active row, pin circle, tags) | accent at 8% | `--color-accent-tint` 5% (row) and `bg-accent/10` (circle) | **Differs** | One token at 8%; replace the 9 `bg-accent/10` uses and the inline `rgba(26,67,41,0.05)` |
| Field edge | `#827970` | `--color-border-field` `#827970` | Same (Figma corrected) | none (3.73:1 on card) |
| Accent pressed or hover | `#142F1E` (one value for both) | `--color-accent-hover` `#142F1E` | Same (Figma corrected) | none |
| Under par (delta) | `#2C6B3C` | `--color-under-par` `#2C6B3C` | Same (Figma corrected) | none (5.1 to 5.8:1) |
| Over par (delta) | `#9B3A24` | `--color-over-par` `#9B3A24` | Same (Figma corrected) | none (5.5 to 6.3:1) |
| Secondary round controls (Decrement, Advance) | control grey `#7D746C` | `--color-control-warm` `#7D746C` | Same (Figma token added) | none |
| Disabled | lighter fills and text | `disabled:opacity-40` | Differs by design | Keep opacity-40 in code; Figma disabled states are illustrative |

**Contrast headroom on the 8% tint (Verified, computed):** muted text on the tinted row is 4.57:1, so the tint must not go above 8% or small muted text drops below AA 4.5:1. Deltas on the tint: under par 5.1:1, over par 5.52:1. Accent on tint 8.89:1.

### 5b. Type: eight styles

Write these as Tailwind component utilities (in `rem`) in `index.css` or a plugin in `tailwind.config.js`, then replace ad hoc class combinations with them.

| Figma style | Utility | Spec | Replaces (examples) |
|---|---|---|---|
| Display | `type-display` | `font-display` italic, 42/46 | Home title (`text-5xl`, 48px) |
| Title | `type-title` | `font-display` italic, weight 500, 24/30 | page header title (`text-2xl`), sheet titles |
| Body | `type-body` | Inter 400, 16/24 | paragraphs, values, input text |
| Strong | `type-strong` | Inter 500, 16/24 | scores, names, button labels |
| Small | `type-small` | Inter 400, 14/20 | meta lines, small print |
| Small strong | `type-small-strong` | Inter 500, 14/20 | back label, text actions, field labels |
| Caption | `type-caption` | Inter 500, 12/16, tracking 0.2px | deltas, par in brackets, tags |
| Label caps | `type-label-caps` | Inter 600, 14/20, uppercase, tracking 1.1px | section labels, course names, table headers |

Serif is for titles only (Display, Title). Inter for everything else.

### 5c. Spacing (your Layout tokens)

Add Tailwind spacing aliases so class names match Figma:

| Figma token | Value | Tailwind alias |
|---|---|---|
| layout/gap/related | 8 | `gap-related` |
| layout/gap/field | 12 | `gap-field` |
| layout/gap/group | 16 | `gap-group` |
| layout/gap/section | 24 | `gap-section` |
| layout/padding/page | 16 | `px-page`, `py-page` |
| layout/padding/card | 16 | `p-card` |

Content-page ladder (Information, Rules, Settings): related items 8, blocks 16, sections 24 either side of a hairline, name and email 4. A link's 44px tap area is added with padding and a matching negative margin (the code already does this with `py-3 -my-3`), so it never changes visible spacing.

### 5d. Shape and shadow

- Add `--radius-control: 6px` (Tailwind `rounded-control`) for buttons, inputs, selects, cards. Keep `rounded-full` (chips, round controls) and `rounded-t-2xl` (sheets).
- Cards: `bg-bg-card border border-border rounded-control shadow-card p-card`. Inputs keep the deeper cream fill they already have (`bg-bg-card border-field`).

### 5e. Components

| Figma component | Code | What changes |
|---|---|---|
| App bar with title | `components/PageHeader.jsx` | Keep the three-slot layout and the invisible mirror (it already guarantees a centred title). Fixed 68px, muted 14px sentence-case back label, Title style, text action on the right, `border-b`. |
| Back button, App bar action | inside `PageHeader` and page props | Sentence case; text action by default; filled pill only when Finish is the expected next step. |
| Button (Primary, Secondary, Text; Large, Medium) | **new** `components/Button.jsx` | Replaces about 50 inline class strings. |
| Input, Select, Date, Textarea | **new** `components/Field.jsx` | Label above the field (today it sits below), `border-field`, 6px radius. |
| Chip (filter pill) and picker sheet | History filters + **new** `components/FilterSheet.jsx` | Reuse the existing bottom-sheet pattern and its focus handling. |
| Tag | **new** `components/Tag.jsx` | History "Not yet saved". |
| List row | Settings rows, Home links | Hairline row, 44px target. |
| Card (Course card, Round card) | **new** `components/Card.jsx` | Shared card surface. |
| Score row and Score cell | `pages/Scorecard.jsx`, `pages/Summary.jsx` | Active row on the tint, active cell solid accent and square, active hole number bold accent, header cells Label caps, deltas Caption. |
| Empty state | **new** `components/EmptyState.jsx` | History empty, no-match, error. |
| Bottom action bar | Setup, Summary | Pinned primary action in the thumb zone. |
| Outbuild lockup | existing attribution mark | none |

### 5f. Score table (decided)

Applies to the live Scorecard grid and the Summary table.

| Rule | Value |
|---|---|
| Hole column | 56px (`w-14`, as today), fill `bg-bg-card`, labels left-aligned (12px left padding). **No hairline between the hole column and the scores.** The header and totals rows use the same fill, so the scores sit in a framed field. |
| Player columns | Equal share of the remaining width (`table-fixed`), scores centred. |
| Row height | 48px on the live grid (tap target), 36px on the read-only Summary. |
| Active row | `bg-accent-tint` across the whole row including the hole column. Hole number in accent colour. |
| Active cell | Solid `bg-accent`, white text, square, fills the whole cell. Delta in the inverted (white) colour. |
| Deltas | Caption (12px, medium) beside the score on the same line, in the under-par or over-par colour. Level par is `E` in the text colour. |
| Column headers, 1 to 4 players | Label caps (14px, semibold, uppercase). |
| Column headers, 5 to 6 players ("dense") | Caption (12px, medium, sentence case), truncated with an ellipsis if a name is too long; the full name stays in the accessible label. |
| Totals, 1 to 4 players | Total and bracket on one line: `55 (+22)`. Row 44px. |
| Totals, 5 to 6 players | Total on one line, bracket below it, centred. Row 56px. This replaces the old rule of shrinking the bracket. |
| Summary extras | Front 9 row above Total on 18-hole rounds, as today. |

Why dense mode exists: at 390px six columns are about 56px wide. A 14px caps name like "MAGGIE" needs about 62px, and "115 (+46)" needs about 60px, so both would be clipped or wrap unpredictably. The two dense changes remove that without shrinking the scores themselves.

---

## 6. Screen by screen: what changes against the live code

| Screen | Changes |
|---|---|
| Home | Margin 24 to 16; sentence-case buttons; course link is a card; footer lockup unchanged. |
| Setup | Labels above fields; "Players" heading instead of "Player 1/2" labels; "+ New course" grouped with Course; "+ Add player" grouped with Players and as a text action; "Start the round" pinned at the bottom. |
| Round entry | Header Pause, Scorecard, Finish as text actions; table styling per 5e; multi-player layout (D1, D2); controls and "Edit game setup" link unchanged. |
| Summary | Edit as a text action (was a pencil icon); same winner line, table, Front 9 and Total; Share and Delete as designed. |
| History | Round cards (course name leads, date and holes quiet, names equal weight, note kept, no winner line); filter pills and picker sheet; empty, no-match and error states. |
| Settings | Value rows with Edit icon buttons; plain notice; field and sheet styling. |
| Information, Rules | Spacing ladder; hairline section breaks; Label caps section labels; body in the primary text colour. |
| Login, Courses, Course edit, course page, Privacy | Not designed. They pick up tokens and shared components; review in stage 8 (D5). |

---

## 7. Stages

Each stage is its own branch from an up-to-date `main`, follows the review gate, and updates DESIGN.md in the same branch (the part it changes). Sizes are **Estimated**.

| Stage | Branch | Size | What | Tests expected to change | Done when |
|---|---|---|---|---|---|
| 0 | `chore/redesign-spec` | Small | Answer D1 to D6. Add this plan to the repo. CHANGELOG decision entries for the section 3 reversals. Baseline: run lint and tests, and capture baseline screenshots of every screen at 390x844, 320 wide and the desktop frame. | none | Baseline recorded; decisions written down. |
| 1 | `chore/redesign-tokens` | Small | Tokens only: single accent tint (8%), `--radius-control`, spacing aliases, the eight type utilities (defined, not yet used). Reconcile Figma values (D3). | none | Only visible change is the tint. Lint and tests pass. |
| 2 | `refactor/type-scale` | Large | Replace ad hoc type classes with the eight utilities across every page. Deltas become a 12px caption. Add the guard test (section 8). | `ParDelta.test.jsx` | No raw type classes remain; guard test green; screens compared with Figma. |
| 3 | `refactor/buttons-and-fields` | Large | `Button` and `Field` components; sentence case; 6px radius; remove dashed ghost and outlined Resume; label above field; Setup regrouped and "Start the round" pinned. | `field-border.test.jsx`; any test finding buttons by uppercase text | Every button and field uses the shared components. |
| 4 | `feat/page-frame-and-header` | Large | `PageHeader` restyle (68px, muted label, Title style); 16px page padding on every screen; content-page ladder on Information, Settings, Rules. | `PageHeader.test.jsx` | Header and page frame identical on all screens. |
| 5 | `feat/record-cards` | Large | `Card`, `Tag`, `EmptyState`; Home course card; History round cards with the new hierarchy; winner line removed from History. | `History*.test.jsx` | History and Home match the Figma cards. |
| 6 | `feat/history-filter-pills` | Large | Filter pills, `FilterSheet`, applied-filter state, "Showing n of m" and "Clear filters", no-match state. | History tests rewritten; reuse the `dialogs-focus` pattern | Filtering works by keyboard and screen reader; sheet traps and restores focus. |
| 7 | `feat/score-table-multi-player` | Large | The score table exactly as in 5f: tinted 56px hole column, active row and cell, Label caps headers, dense mode for 5 to 6 players, Summary parity. Share image checked. | `Scorecard*.test.jsx`, `Summary*.test.jsx` | One to six players read cleanly at 390px with no clipped names or totals. |
| 8 | `chore/inherit-remaining-screens` | Small | Review Login, Courses, Course edit, course page, Privacy; fix stragglers. | none | Guard tests catch no leftovers. |
| 9 | `chore/redesign-docs-and-audit` | Small | Rewrite DESIGN.md sections (Typography, Spacing, Radius, Shadows, Page header, Buttons, Filter pills, Scorecard table). Update BACKLOG. Run `/full-audit` and `/pre-launch`. Test on a real iPhone. | none | Audit has no Critical or High findings. |

Stages 2 to 7 use the project-manager and the code-reviewer (they touch several files across concerns).

---

## 8. Rigour: how the work is checked

1. **Baseline first (stage 0).** Run `npm run lint && npm test` before changing anything and record the result. Every later failure is then new, not inherited.
2. **Token contract test.** A small test that reads `index.css` and fails if a token differs from the table in 5a, and computes the contrast of each text and background pair in 5a (no dependency needed; the maths is a short function).
3. **Guard tests (added in stages 2 and 3).** A Vitest file that scans `src/**/*.jsx` and fails on raw `text-xs|sm|base|lg|xl|2xl`, `uppercase`, `tracking-[`, `rounded-sm|md`, `px-5|px-6` and hard-coded hex or rgba, with an explicit short allow-list (`ParDelta`, `share.js`, the desktop frame). This stops the design drifting back.
4. **Per-stage comparison.** For each screen in the stage, open localhost at 390x844, then 320 wide, then the desktop phone frame, and compare with the matching Figma snapshot (use the Figma connector's screenshot). Check the states, not just the default: empty, error, long names, six players, long course name in the header, signed in and signed out.
5. **Accessibility.** Contrast table in 5a; 44px tap targets; focus rings unchanged (`ring-accent/40`); the picker sheet must trap and restore focus; screen reader names unchanged except where a control was replaced. `a11y-labels-landmarks.test.jsx` stays green.
6. **Behaviour parity.** Tests that encode removed behaviour (History winner line, filter chip roles, pencil icon label) are changed deliberately and listed in the PR summary, never silently.
7. **Real device.** Test on an iPhone through the Cloudflare preview URL for the branch (this also closes BACKLOG #90, header top spacing) and once outdoors before merging stage 9, because sunlight contrast is a stated constraint.
8. **Rollback.** Each stage is merged separately, so any one can be reverted without losing the others.

## 9. Risks

- **Sentence case and 6px corners change the brand feel** (the "printed document" look). Mitigation: stage 3 is easy to review in isolation and to revert.
- **Six players:** decided and designed (5f). The remaining risk is long names. Mitigation: ellipsis plus the full name in the accessible label, and a six-player test with long names in stage 7.
- **The 8% tint has almost no contrast headroom** for small muted text. Mitigation: the token contract test fails above 8%.
- **rem versus px.** Using px in the new utilities would silently break the desktop frame. Mitigation: the token test checks the utilities are in rem.
- **Un-redesigned screens** may look inconsistent after stage 7. Mitigation: stage 8, and consider merging stages 2 to 8 behind a single preview before going live.
- **Estimated size is rough.** The first real measure is how many tests fail after stage 2.

---

## 10. Ready-to-paste prompts for Claude Code

**Stage 0**
> Read CLAUDE.md, DESIGN.md and SCORECARD-REDESIGN-IMPLEMENTATION-PLAN.md. Create the branch `chore/redesign-spec` from an up-to-date `main`. Run `npm run lint` and `npm test` and report the baseline exactly. Add the plan to `docs/redesign/`. Add CHANGELOG decision entries for the nine reversals in section 3 of the plan, marked "proposed, awaiting sign-off". Do not change any source files. Show me what you changed and wait.

**Stage 1**
> Use the project-manager agent. Branch `chore/redesign-tokens`. Read section 5 of the plan and look at the PNGs in `docs/redesign/reference/` (section 11). Implement tokens only: one accent tint at 8% replacing `--color-accent-tint` and all `bg-accent/10` uses, `--radius-control` (6px), the spacing aliases, and the eight type utilities in rem. Do not change any component or page. Add the token contract test. Show the diff and wait for my localhost review.

---

## 11. Design reference pack (for an agent that cannot open Figma)

Give the agent text for every number and pictures for the look. Pictures alone are not enough: they cannot say 6px or 16px, and they hide anything that is not on screen (hover, focus, error, sheets).

**Rule of precedence:** where a PNG and the written spec disagree, the written spec wins for numbers (sizes, colours, spacing); the PNG wins for look, order and hierarchy. If it is still unclear, the agent asks instead of guessing. The agent must never measure pixels off a PNG and treat them as CSS.

Put everything in `docs/redesign/reference/`.

| # | Item | What it gives the agent | Source in Figma | Status |
|---|---|---|---|---|
| 1 | Screen PNGs at 2x (780x1688): `01-home`, `02-setup`, `03-round-entry-3-players`, `04-summary`, `05-history`, `06-settings`, `07-information`, `08-round-entry-6-players`, `09-summary-6-players` | The target look of each screen | Board frames named "Snapshot / ..." | Ready to export |
| 2 | **State PNGs at 2x** (16): `10-home-game-in-progress`, `11-home-signed-out`, `12-setup-add-past-round`, `13-summary-just-finished`, `14-round-entry-in-progress`, `15-round-entry-every-hole-scored`, `16-round-entry-finish-sheet`, `17-history-picker-open`, `18-history-filters-applied`, `19-history-no-rounds`, `20-history-no-match`, `21-history-could-not-load`, `22-settings-editing`, `23-settings-delete-sheet`, `24-information-signed-in`, `25-information-signed-out` | The states the agent cannot infer from the default screens | Board section "States" (frames named "State / ...") | Ready to export |
| 3 | Component PNGs, one per component set (18) at 2x | Variants and states of each shared component | Board section "Components" | Ready to export |
| 4 | Written spec | Every number: sections 5a to 5f of this plan | This file | Done |
| 5 | Spacing redlines | The spacing ladder with gaps drawn in | Board section "Content pages" (before and after) | Ready to export |
| 6 | Tokens as JSON | Colours, text styles, spacing and layout tokens in one machine-readable file | Figma variables and styles | Done: `reference/tokens.json` (read from Figma 22 November 2026) |

**How to export from Figma (one go):** open the page "Reference pack (export)" in the Figma file. It holds 47 frames, each already set to PNG at 2x and named as in this table (`01-home`, `10-home-game-in-progress`, `c01-button`, `t01-colour`, and so on). Click the canvas, press Cmd+A (Ctrl+A on Windows) to select everything, then press "Export 47 layers" at the bottom of the right-hand panel. Figma downloads a zip. Unzip it into `docs/redesign/reference/`. The component sheets (`c01` to `c18`) show every variant of each component with its variant name underneath; `s01` is the spacing ladder; `t01` to `t03` are colour, type, and shape and space. Layers are copies: if a screen changes later, regenerate the page (ask Claude) before exporting again.

**Status on this machine (22 November 2026):** 44 of the 47 PNGs are present. `t01-colour`, `t02-type` and `t03-shape-and-space` are missing; `tokens.json` carries the same values in text, so they are not blocking. Figma is the single source of truth (owner decision, 22 November 2026): where `tokens.json` and this plan or the current code disagree on a number, `tokens.json` wins. This overrides the plan where it says to keep `opacity-40` disabled states, the `ring-accent/40` focus ring, `shadow-card` on cards and `shadow-btn` on the primary button, and cream text on the accent fill.

**Remaining gaps:** there are no frames for the Rules page (it uses the same content-page rules as Information) and none for Login, Courses, Course edit, the course page or Privacy (decision D5). Hover and focus states are described in the component notes, not pictured.

## 12. Where the files go, and how to start

CLAUDE.md allows branch prefixes `feat/`, `fix/`, `chore/`, `refactor/` and `security/` only, so stage 0 uses `chore/redesign-spec` (not `docs/`). Nothing is added directly to `main`.

Final layout in the repo (a new top-level folder, next to `functions` and `migrations`):

```
docs/redesign/
  SCORECARD-REDESIGN-IMPLEMENTATION-PLAN.md
  CHANGELOG-decisions-to-add.md
  reference/
    01-home.png ... 25-information-signed-out.png
    c01-button.png ... c18-outbuild-lockup.png
    s01-content-pages-spacing.png
    t01-colour.png, t02-type.png, t03-shape-and-space.png
```

Route A (recommended, matches the project workflow): put the files in that folder inside your local project folder, open Claude Code there and paste the stage 0 prompt. Claude Code creates the branch, commits and pushes; new untracked files come with it. Route B (GitHub in the browser): Add file, Upload files, drag in the `docs` folder, choose "Create a new branch for this commit", name it `chore/redesign-spec`, and propose the changes as a pull request. Do not commit to `main`.

The PNGs add a few megabytes. That is fine for the length of the redesign; the folder can be removed once stage 9 ships.

## Questions (answered 22 November 2026)
1. History winner line: goes, as reversal 9 (accepted under D4).
2. D5: reviewed in stage 8, redesigned only if they look wrong.
3. D6: skipped for now.
