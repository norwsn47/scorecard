# CHANGELOG entries to add (stage 0)
Last updated: 22 November 2026
> Paste these into CHANGELOG.md on the `chore/redesign-spec` branch. They record decisions and reversals only, as CLAUDE.md asks. Each is dated 22 November 2026 and was accepted by the project owner.

## 22 November 2026 - Redesign decisions (accepted)

Context: the Scorecard was redesigned in Figma (file "Outbuild", board "Scorecard design system (latest)"). These decisions reverse or extend rules in DESIGN.md. DESIGN.md is updated in the same branch as each stage that implements them.

1. **Buttons use sentence case.** Reverses the uppercase, tracked button labels (`uppercase tracking-[0.1em]`). Reason: one calmer, more legible type system (eight styles, serif for titles only).
2. **One 6px control radius.** Replaces `rounded-sm` (4px, buttons) and `rounded-md` (8px, inputs, cards). Reverses the "sharp printed-document" button rule. `rounded-full` (chips, round controls) and `rounded-t-2xl` (sheets) stay.
3. **Header actions are text actions.** Reverses the bordered "Header action" button (Finish, Save, + Add). A filled pill is used only when the action is the expected next step (for example Finish once every hole is scored).
4. **"+ Add player" and "Resume game" use the standard buttons.** Removes the dashed ghost button and the one-off accent outline button.
5. **Page padding 16px, header fixed at 68px.** Replaces `px-5` and `px-6` page padding and the `pt-6 pb-4` header. The header keeps its three-slot layout and invisible mirror.
6. **History filters become two pills with a picker sheet.** Replaces the course and player chip rows. The course pill appears only with two or more courses, the player pill only with two or more players (unchanged rules).
7. **Record cards carry the card shadow.** Reverses "static surfaces carry no shadow" for History round cards and the Home course card only.
8. **Score-vs-par delta is a fixed 12px caption.** Reverses the `0.6em` superscript (about 10px, below the 12px minimum used elsewhere). Colours are unchanged (`under-par` `#2C6B3C`, `over-par` `#9B3A24`).
9. **History rows drop the winner line and winner highlight.** Player names carry equal weight; the course name leads. Summary keeps its winner line.

## 22 November 2026 - Score table decisions

10. **Hole column is tinted, with no hairline.** 56px wide (unchanged), left-aligned labels, filled with `bg-bg-card`, matching the header and totals bands.
11. **Up to six players stays in scope.** One density rule for five and six players: Caption (12px) column headers instead of Label caps, and the total stacked above its bracket (replacing the shrunk-bracket exception).
12. **Accent tint is one value, 8%.** Replaces the 5% active-row tint and the 10% soft tint (`bg-accent/10`). Do not raise it: muted text on the tinted row is 4.57:1, so more than 8% would fall below AA.

## 22 November 2026 - Figma matches the code tokens

13. Where Figma and code differed, the code values were kept because they are contrast-tested: field edge `#827970`, accent pressed (and hover) `#142F1E`, under par `#2C6B3C`, over par `#9B3A24`, secondary control grey `#7D746C` (`--color-control-warm`). Figma was corrected to match. No code change is needed for these.
