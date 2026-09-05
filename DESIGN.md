# Design
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

Last updated: 5 September 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

---

## Overview

Mobile-only scorecard app. Cream/warm ivory background with a single forest green brand colour. Two typographic registers: Cormorant Garamond italic for editorial moments, Inter for all UI labels and data. Outbuild design language throughout — warm, restrained, purposeful.

**Design philosophy (Home screen):** "A simple digital replica of the paper scorecard used for hundreds of years, designed to keep your focus on the game, not the screen." The Home screen breaks digital symmetry intentionally — left-aligned title, subtitle, and value propositions create a structured printed-document feel, not a centred app layout.

**Physical context:** this app is a digital replica of the paper scorecard carried round Bruntsfield for over a century — printed-document type, sharp-cornered CTAs, heritage serif, a familiar hole-by-player grid. Borrowing that language is a deliberate, context-rooted decision (per `OUTBUILD-PRINCIPLES.md` "Products rooted in a physical context"), not decoration. The one place the app steps outside pure pencil-and-paper monochrome is the **score-vs-par semantic colour** (see "Score vs par" below) — golfers read a card in green/level/red the moment they look up from the green, and the app follows that reading.

**Mobile only: true** — on desktop the app is displayed as a centred phone frame with a handwritten Caveat note beside it.

---

## Colour tokens

All tokens are defined as CSS custom properties in `src/styles/index.css` and aliased in `tailwind.config.js`.

| Token | CSS var | Hex | Role |
|---|---|---|---|
| `bg` | `--color-bg` | `#F7F4EE` | Page background — warm off-white, heavy cardstock feel |
| `bg-card` | `--color-bg-card` | `#F5EFE3` | Surface — slightly warmer cream for cards, inputs |
| `text` | `--color-text` | `#1A1A18` | Primary text — near-black charcoal |
| `muted` | `--color-text-muted` | `#6B6560` | Muted text — warm grey |
| `accent` | `--color-accent` | `#1A4329` | Brand colour — deep historic Scottish green; all interactive highlights, active cell, winner |
| `accent-hover` | `--color-accent-hover` | `#142f1e` | Accent on press |
| `border` | `--color-border` | `#D9D0C4` | All borders — warm light |
| `chrome` | `--color-chrome` | `#C0B8B0` | Inactive chrome — disabled icons, borders |
| `control-warm` | `--color-control-warm` | `#9A9189` | Warm grey fill — advance button background |
| `under-par` | `--color-under-par` | `#2C6B3C` | Score-vs-par **delta** when under par (`-1`, `-2` …). Deltas only — never chrome, never interactive |
| `over-par` | `--color-over-par` | `#9B3A24` | Score-vs-par **delta** when over par (`+1`, `+5` …). Deltas only — never chrome, never interactive |
| *(desktop only)* | — | `#E8E2D6` | Background behind phone frame on desktop |

`tailwind.config.js` carries matching aliases for these two tokens: `'under-par': 'var(--color-under-par)'`, `'over-par': 'var(--color-over-par)'`.

### The two score-vs-par colours are a scoped exception

The app is otherwise **one brand colour doing all the work** (Outbuild principle 3). `under-par` and `over-par` are the single, deliberate exception, and they are tightly fenced:

- They colour **vs-par deltas only** — the per-hole superscript (`+1` / `-1` / `E`) and the round total-to-par (`41 (+5)`). Nothing else.
- They are **never** used for buttons, borders, icons, links, backgrounds, focus rings, or any interactive or chrome role. A golfer must never have to wonder whether a green thing is tappable.
- **Level par (`E`) gets no colour of its own** — it inherits whatever text colour its context already uses (`text`, `muted`, `accent` in a winner column, or white in the active cell).
- The bracketed par **label** on the hole number (§5.1, e.g. "3 (3)") is *not* a delta — it stays uncoloured and is unaffected by this exception.

This keeps within the Outbuild allowance of "no more than two accents beyond the brand colour, used in precisely defined contexts."

### Overlays and inline transparent values

| Name | Value | Role |
|---|---|---|
| `--overlay-modal` | `rgba(26,26,24,0.55)` | Full modal backdrop |
| `--overlay-backdrop` | `rgba(26,26,24,0.4)` | Bottom sheet backdrop |
| Active row tint | `rgba(26,67,41,0.05)` | Scorecard active row background |
| Focus ring | `rgba(26,67,41,0.4)` | Input focus ring (always-on, since focus on an input follows a deliberate tap into it); also the token for the new button `focus-visible` ring — see "Button size system" |

### Sunlight contrast — the score-vs-par colours

The app is used outdoors on a phone in bright light, so both delta colours were chosen to clear **WCAG AA for small text (4.5:1)** against every surface a delta can sit on, with headroom for glare. Ratios:

| Colour | on `bg` `#F7F4EE` | on `bg-card` `#F5EFE3` | on `accent` fill `#1A4329` |
|---|---|---|---|
| `under-par` `#2C6B3C` | **5.8 : 1** ✓ | **5.6 : 1** ✓ | 1.7 : 1 ✗ |
| `over-par` `#9B3A24` | **6.3 : 1** ✓ | **6.1 : 1** ✓ | 1.6 : 1 ✗ |
| white `#FFFFFF` (active-cell text) | — | — | **11.2 : 1** ✓ |
| `accent` `#1A4329` (winner column text) | 10.2 : 1 ✓ | 9.8 : 1 ✓ | — |

Both delta colours **fail** on the solid `accent` fill — this is expected and is exactly why the override rule below forces them off inside a filled cell. On every non-filled surface (cream ground or card, including behind a winner's accent-green *text*) they pass comfortably.

`under-par` `#2C6B3C` is a lighter, greener mid-forest — deliberately ~12 lightness points up from the brand `accent` `#1A4329` so a `-1` reads as its own "good score" mark, not as winner/active chrome. `over-par` `#9B3A24` is a deep burnt-terracotta / rust — warm, of the Outbuild family (the brand's original accent direction), and distinct from any error state (the app has no red error state; errors use the green banner).

---

## Typography

Two registers. The display font is used once, deliberately, for a specific editorial purpose. Inter handles everything else.

| Font | Token | Usage |
|---|---|---|
| `Cormorant Garamond` | `--font-display` | Editorial: app name, page titles, course name and section headings |
| `Inter` | `--font-ui` | All UI: buttons, labels, table cells, inputs, body text |
| `Caveat` | *(no token)* | Desktop wrapper note only — never inside the app |

### Editorial register — Cormorant Garamond italic

| Context | Classes |
|---|---|
| App name (Home) | `font-display text-5xl italic text-text` |
| Page header title | `font-display text-2xl italic text-text` |
| Course name (Summary header, Course Map modal) | `font-display text-2xl italic text-text` / `text-xl` |
| Winner callout name (Summary) | `font-display text-sm italic text-accent` |

**Home screen alignment exception:** The `h1` title and subtitle on the Home screen are left-aligned (`text-left`). This is a deliberate departure from the centred page-header title used on every other screen. The Home screen follows a printed-document convention.

### UI register — Inter

| Context | Classes |
|---|---|
| Micro labels / table headers | `font-ui text-xs tracking-[0.12em] uppercase text-muted` |
| Primary button label | `font-ui text-sm tracking-[0.1em] uppercase font-semibold` |
| Secondary button label | `font-ui text-sm tracking-[0.1em] uppercase font-medium` |
| Navigation (Back) | `font-ui text-sm tracking-[0.08em] uppercase text-muted` |
| Body / descriptive copy | `font-ui text-sm text-muted` |
| Input text | `font-ui text-base text-text` |
| Total score | `font-ui text-base font-semibold text-text` |
| Score cell | `font-ui text-sm` |
| Score-vs-par delta (superscript) | `font-ui text-[0.6em] align-super font-normal` — smallest legible, never bold; see "Score vs par" |
| Error / banner | `font-ui text-xs tracking-wide` |

### Caveat — desktop note only
`font-family: 'Caveat', cursive; font-size: 1.15rem; line-height: 1.35` — rotated 5deg, muted colour, opacity 0.75. Never used inside the app itself.

---

## Spacing

Base unit: 4px (Tailwind default).

| Context | Value |
|---|---|
| Page horizontal padding | `px-5` (20px) or `px-6` (24px) |
| Page header vertical | `pt-10 pb-4` |
| Primary button vertical | `py-4` (16px) |
| Secondary / input vertical | `py-3` (12px) |
| Items in a list | `space-y-3` (12px gap) |
| Button group gap | `gap-3` or `gap-4` |
| Footer safe area | `pb-10` to `pb-14` |
| Control bar | `px-5 py-4` |
| Table cell (vertical) | `py-3` |
| Table cell (horizontal) | `px-2` (hole col), `px-1` (player cols) |

`pt-10 pb-4` corrects a doc/reality mismatch found in this pass — the table previously read `pt-12 pb-6`, but `PageHeader.jsx` has shipped `pt-10 pb-4` throughout; the code is taken as the source of truth here.

---

## Border radius

| Value | Tailwind | Use |
|---|---|---|
| `4px` | `rounded-sm` | Primary and secondary CTA buttons — sharp, printed-document feel |
| `8px` | `rounded-md` | All other interactive controls: inputs, cards, list rows |
| `12px` | `rounded-lg` | (Available — larger panels) |
| `50%` | `rounded-full` | Circular control bar buttons (64×64); also filter chips — see "Filter chips" |
| `16px top` | `rounded-t-2xl` | Bottom sheet / confirmation modal |
| `44px` | *(CSS only)* | Phone frame on desktop |

Primary button exception: uses `rounded-sm` (4px) for a sharp, printed-document feel. Secondary/outlined buttons also use `rounded-sm`. All other interactive controls retain `rounded-md` (8px).

Rule: **Exception: primary and secondary CTA buttons use `rounded-sm` (4px) — sharp corners signal a printed document.** All other interactive elements in the page flow use `rounded-md`. Floating elements (modals, sheets) use `rounded-t-2xl`. Circular controls, and filter chips, use `rounded-full`.

---

## Shadows

Used sparingly — only on elements genuinely floating above page flow.

| Token | Value | Use |
|---|---|---|
| `--shadow-card` | `0 1px 3px rgba(26,26,24,0.08), 0 1px 2px rgba(26,26,24,0.04)` | Modals, bottom sheets |
| `--shadow-btn` | `0 1px 2px rgba(26,26,24,0.12)` | Primary CTA button only |
| Phone frame | `0 0 0 10px #1C1B19, 0 0 0 11px rgba(255,255,255,0.06), 0 32px 80px rgba(26,26,24,0.45)` | Desktop wrapper |

Static surfaces in the page flow carry no shadow.

---

## Home screen layout principles

The Home screen breaks the centred-app convention deliberately:
- `h1` title: left-aligned
- Subtitle: left-aligned
- Accent divider rule: left-aligned (`ml-0`, not `mx-auto`)
- Value-proposition lines: left-aligned
- Action buttons: full-width (no change)

All other screens retain their existing centred or page-header layout.

---

## Component patterns

### Button size system

Every button in the app belongs to one of three sizes. The tier says how much weight the decision carries and how much room it has to sit in — it is independent of colour treatment (filled / outline), which is decided per pattern below. This system was reverse-engineered from three variants already shipping without a name; naming them now so the next new button picks a tier deliberately instead of copying whichever existing button looks closest.

| Tier | Says | Padding / type | Where it's used |
|---|---|---|---|
| **Full CTA** | "This is the one thing to do on this screen" | `py-4 px-6`, `text-sm tracking-[0.1em] uppercase font-semibold` (filled) / `font-medium` (outline) | Home primary/secondary, Bruntsfield course page, Login submit, Setup "Start Game" |
| **Dialog button** | "Choose one of two things, right now" | `py-3 px-4` full-width standalone, or `flex-1 py-3` paired in a row; `text-sm tracking-[0.08em] uppercase font-medium` (outline) / `font-semibold` (filled) | Resume Game, course-map link (standalone); Scorecard finish-confirm, History delete-confirm (paired) |
| **Header action** | "A secondary action that shouldn't outweigh the page title" | `py-2 px-4`, `text-xs tracking-[0.1em] uppercase font-semibold` | Scorecard header Finish/Save, History "+ Add round" |

**Disabled state — every tier, no exceptions: `opacity-40`.** Circular control-bar buttons (Increment/Decrement/Advance) are a different affordance and keep their own already-documented `opacity-25` — see "Control bar buttons" below for why.

**Focus-visible ring — new in this pass.** Every button gets:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
```
using the same token as the input focus ring. `:focus-visible` only fires for keyboard/switch/assistive-tech navigation — never for a touch tap, never for a mouse click — so on this touch-only, one-handed, outdoor product it is invisible during every normal interaction (per `OUTBUILD-PRINCIPLES.md`, "human first, device second"). It replaces the browser's default (usually blue, off-brand) focus outline for the rare keyboard/assistive-tech user at zero visual cost to everyone else. **Decision: add it**, everywhere a button exists — Full CTA, Dialog button, Header action, filter chips, the segmented toggle, and the circular control-bar buttons. This is a systemic addition, not itemised per file below.

### Primary button (Full CTA — filled)
```
bg-accent text-bg rounded-sm py-4 px-6
font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn
active:bg-accent-hover
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
disabled: opacity-40 cursor-not-allowed
```

### Secondary / outline button (Full CTA — outline)
```
border border-border text-text rounded-sm py-4 px-6
font-ui text-sm tracking-[0.1em] uppercase font-medium
active:bg-bg-card
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
```

### Accent outline button (Dialog tier, standalone) — Resume Game, course map link
```
border border-accent text-accent rounded-sm py-3 px-4
font-ui text-sm tracking-[0.08em] uppercase font-medium
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
```
The Dialog tier's single-button form — a full-width accent-outline action rather than a paired confirm/cancel. Same padding and type scale as the paired dialog buttons below, just standalone rather than `flex-1` in a row.

**Doc bug fixed in this pass:** this entry used to also name "Finish header button" as an example, with this same spec. It doesn't match — the shipped Scorecard Finish/Save button is `py-2 px-4`, `text-xs`, `font-semibold`, `tracking-[0.1em]` (the Header action tier, below), not this one. The doc had apparently never matched the shipped code. Resume Game and the course-map link are the only confirmed members of this pattern.

### Dialog buttons — paired (Dialog tier)
```
Cancel / neutral: flex-1 py-3 rounded-sm border border-border text-text
                  font-ui text-sm tracking-[0.08em] uppercase
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
                  disabled: opacity-40

Confirm / filled: flex-1 py-3 rounded-sm bg-accent text-bg
                  font-ui text-sm tracking-[0.08em] uppercase font-semibold
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
                  disabled: opacity-40
```
Used in Scorecard's finish-confirm sheet and History's delete-confirm sheet.

**Disabled opacity standardised to `opacity-40` in this pass.** Scorecard's confirm button shipped with `disabled:opacity-60` and no documented reason — **`src/pages/Scorecard.jsx` line 412 needs a code change** to bring it in line with every other disabled button in the app.

### Header action button (Header action tier) — Finish/Save, + Add round
```
py-2 px-4 rounded-sm border border-accent text-accent
font-ui text-xs tracking-[0.1em] uppercase font-semibold
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
```
Sits inside a `PageHeader` right slot (or an equivalent compact context) — small enough not to outweigh the page title, still comfortably legible at `text-xs` because it carries a short, familiar word ("Finish", "Save", "+ Add round"). Touch target is ~34px including border, below the 44px ideal; accepted for the same reason "Inline link tap targets" (below) accepts ~36-40px for `text-xs` inline elements — this is a deliberately quiet secondary action inside a fixed-height chrome bar, not the screen's one primary action.

**Needs a code change to match this spec:** `src/pages/History.jsx` line 71 ("+ Add round") currently ships as `py-2 px-3`, `tracking-[0.08em]`, no `font-semibold`, plus an extra `active:bg-accent/10` state not present on Scorecard's Finish/Save button. Three of those four are drift within the same tier. Align it to the spec above; the `active:bg-accent/10` press state can stay — it's a reasonable addition, just not yet documented, so it becomes this tier's standard active state going forward.

### Add-player button (dashed ghost)
```
border border-dashed border-border bg-bg-card text-muted rounded-md py-3 px-4
font-ui text-sm
active:bg-border
```

### Control bar buttons (circular 64×64)

| Button | Classes |
|---|---|
| Map | `rounded-full border-2 border-chrome text-chrome` |
| Decrement (−) | `rounded-full border-2 border-chrome text-chrome text-2xl` — disabled: `opacity-25` |
| Increment (+) | `rounded-full bg-accent border-2 border-accent text-bg text-2xl` |
| Advance (→) | `rounded-full bg-control-warm border-2 border-control-warm text-bg` — disabled: `opacity-25` |

These are physical game controls, not text buttons, which is why they keep their own `opacity-25` disabled state rather than the button system's `opacity-40` above — a lighter fade reads as "not reachable right now" (e.g. can't decrement below hole 1) rather than "unavailable," which suits a control the player is about to need again a moment later.

### Text input
```
w-full py-3 pl-4 rounded-md border font-ui text-base bg-bg-card text-text
placeholder:text-muted
focus:outline-none focus:ring-2 focus:ring-[rgba(26,67,41,0.4)]
normal border: border-border
error border: border-accent
with remove button: pr-10   without: pr-4
```

### Page header (PageHeader component)
```
relative flex items-center justify-between px-5 pt-10 pb-4 border-b border-border shrink-0
```
- Title: `absolute inset-x-0 text-center px-24 font-display italic text-2xl text-text truncate pointer-events-none`
- Back: `py-3 min-h-[44px] flex items-center whitespace-nowrap text-muted font-ui text-sm tracking-[0.08em] uppercase` — ← prefix, no button chrome, **never truncates**
- Right slot: optional (a Header action button, an Edit link) — `whitespace-nowrap`, **never truncates**; its own touch target is set by whatever's passed in

**Never truncate a header button — use a shorter accurate word instead.** Named as a standing rule in this pass, not a one-off fix. The back/right slots used to sit behind a fixed 72px width with `truncate`, which silently clipped "← Bruntsfield" down to the meaningless "← BRUNT". The fix was not a wider box — it was renaming the destination to a word that actually fits: **"Bruntsfield" became "Course"** everywhere in the app (it's the only course today; revisit if a second course ships). `PageHeader`'s back/right slots now carry no width cap and `whitespace-nowrap`, so a button can never clip — the corollary is that a caller must never hand it a label that's genuinely too long for the space. If a destination's real name won't fit, shorten the *word*. Do not widen the box or reintroduce `truncate` on a button label.

**Title-length budget:** the centred title sits behind `px-24` (96px) clearance on each side and still `truncate`s — this is the one place in the header a defensive `truncate` remains, because a title is editorial content (a course name, a page name) that the app doesn't fully control, not a short button label the app writes itself. At 390px that leaves ~198px for the title. `px-24` was sized to comfortably fit the longest back-button label in the app today ("← History" / "← Summary") in full, alongside a one-word right action. A longer label than either of those needs the clearance measured again at render — but per the rule above, the better fix is almost always a shorter word, not more clearance.

### Inline link tap targets

Text links inside body copy (`text-sm` / `text-xs`, underlined accent) are visually small but still need a comfortable hit area. Grow the tap target with vertical padding cancelled by an equal negative margin, so the clickable box expands without shifting surrounding layout:

```
inline-block py-3 -my-3        /* default — ~44px on text-sm, ~40px on text-xs */
inline-block py-2.5 -my-2.5    /* where line height is tight — ~36-38px */
```

Match `inline-flex` instead of `inline-block` where the link already uses it (e.g. links with a trailing ↗ icon) — just add the `py-* -my-*`.

**Target:** 44px where the surrounding layout allows it (wrap the link so the padding can grow freely). ~36-40px is the practical floor for a `text-xs` link sitting inline within flowing paragraph text, where more vertical padding would overlap adjacent lines — better than the bare ~16px text height, accepted as a trade-off.

**`space-y-*` caveat:** if the link is a direct child of a `space-y-*` container, that container's `> :not([hidden]) ~ :not([hidden])` selector out-specifies `-my-*` (specificity 0,3,0 vs 0,1,0), so the negative margin is ignored and the padding shifts the layout. Fix: wrap the link in an unclassed `<div>`. The wrapper absorbs the `space-y` margin and the negative margin then resolves cleanly inside it. Links sitting inline within a `<p>`, or as the sole child of a padded container, need no wrapper.

Precedent: the Setup course-rules link, and the inline links across Info, Login, Summary, `CourseMapModal`, and `RulesContent`.

### Course-creation controls (Setup — "+ New course")

**Hole-count toggle (9 / 18):** two equal buttons, `flex gap-2`, each `flex-1 h-11 rounded-md border font-ui text-sm`. Active = `border-accent text-accent`; inactive = `border-border text-text`; `active:bg-bg-card`. Labelled "9 holes" / "18 holes", default 9. Single-select: `role="radiogroup"` on the wrapper, `role="radio"` + `aria-checked` on each button. Caption below in the standard form-caption style (`font-ui text-xs text-muted mt-1.5 pl-1`): "Holes — can't be changed later". Same segmented-control language as the old "set every hole to" row it partly replaces.

This toggle's **outline** active state is a deliberate choice, not a leftover — see "Selection-state language: outline vs fill" below, which compares it directly with the filter chips' fill active state.

**Par stepper row (two-column list):** `grid grid-cols-2 gap-x-3 gap-y-1.5`, one cell per hole. Each cell: `flex items-center justify-between rounded-md border border-border bg-bg-card pl-3 pr-0.5`, holding a `Hole {n}` label (`font-ui text-sm text-text`) and a `−  {par}  +` stepper. Stepper buttons are `w-11 h-11` (44px), `rounded-md`, `font-ui text-lg`, `active:bg-border`; the par value between them is `font-ui text-sm w-4 text-center tabular-nums`. At the 2–7 band edge the relevant button is `disabled` + `opacity-40` and does nothing (no wraparound). Each row carries `role="group" aria-label="Hole {n}, par {par}"`; the buttons carry `aria-label="Decrease/Increase par for hole {n}"`. Heading above the grid: the standard micro-label (`font-ui text-xs tracking-[0.12em] uppercase text-muted`), "Par for each hole". No "set every hole to N" control, no tap-to-cycle grid.

### Filter chips (History)
```
rounded-full border py-1.5 px-3 font-ui text-xs font-medium
active:   bg-accent border-accent text-bg
inactive: border-border text-muted
```
Used for History's course-filter row (shown when 2+ distinct courses exist) and player-filter row (shown when 2+ distinct players exist), both `role="group"`, horizontally scrollable (`overflow-x-auto no-scrollbar`), with an "All" / "All players" chip first. Tapping a player's name inline in the round list toggles the same filter state — the chip and the inline name are two entry points into one selection and must always agree on which is "on."

**Not documented until this pass**, despite shipping live with #51/#61. No visual change — this closes the doc gap.

### Selection-state language: outline vs fill (a decision, not an accident)

Two different "this is currently selected" idioms exist in the app side by side. This pass makes the split a named decision rather than something that happened by accident:

- **Segmented control** (9/18 hole-count toggle): active = **outline** (`border-accent text-accent`), inactive = `border-border text-text`. This is a fixed, mutually-exclusive *setting* chosen once while building something (a course) — closer to a radio button than a switch. Quiet, because it's describing a configuration, not an in-the-moment action.
- **Filter chip** (History course/player row): active = **fill** (`bg-accent border-accent text-bg`), inactive = `border-border text-muted`. This is a transient, removable *criterion* layered over a list you're currently looking at — closer to a toggle switch. Bold, because a filled chip means "this is live and shaping what's on screen right now," and that should be unmissable at a glance.

The split tracks a distinction the app already makes on radius (`rounded-md` for anchored controls, `rounded-full` for chips — Outbuild design language §5): an anchored control you set once stays quiet with an outline; a chip actively narrowing your view earns the bolder fill. Keep the two languages apart — don't reach for fill on a future segmented control, or outline on a future filter chip, without a reason as specific as this one.

### Bottom sheet / confirmation modal
```
Backdrop:  fixed inset-0 z-50, background: var(--overlay-backdrop)
Sheet:     bg-bg rounded-t-2xl w-full max-w-[430px] px-6 pt-6 pb-10 shadow-card
Handle:    w-10 h-1 bg-border rounded-full mx-auto mb-6
Heading:   font-display italic text-2xl text-text
Subtext:   font-ui text-xs text-muted tracking-wide
```

### Scorecard table
```
table-fixed border-collapse w-full
```
| Part | Classes |
|---|---|
| Header row | `bg-bg-card border-b border-border` |
| Header cells | `font-ui text-xs tracking-[0.12em] uppercase text-muted` |
| Data rows | `border-b border-border` |
| Active row | `bg-[rgba(26,67,41,0.05)]` |
| Active cell | `bg-accent text-white font-semibold` |
| Hole # (active row) | `text-accent font-semibold` |
| Hole # (inactive) | `text-chrome` |
| Hole # + par | hole number `font-semibold`, then the hole's par in brackets `font-normal ml-0.5` at the same size — e.g. **3** (3). The bracketed par **label** carries no colour of its own; it inherits the cell colour (chrome / muted / accent). Same treatment on the live grid and the read-only Summary table, and mirrored (bold hole number + normal-weight bracket, same muted colour) on the hand-drawn share canvas (`src/utils/share.js`) since 5 September 2026. Replaces the earlier raised `(N)` superscript. *Deltas-only exception:* the par carries no colour rule holds for this par **label** — but score-vs-par **deltas** (the `+1` / `-1` / `E` superscript and the round total-to-par) do take a semantic colour. See "Score vs par" below. |
| Empty score | `—` (em dash) |

### Score vs par

The one place the scorecard leaves pencil-and-paper monochrome. Applies to score-vs-par **deltas** only (PRD §5.3): the live per-hole superscript, the read-only Summary / History superscript, and the round total-to-par `41 (+5)`. It does **not** apply to the bracketed par *label* on the hole number (§5.1) — that stays uncoloured.

**Notation** (owned by PRD §5.3 / the shared `formatToPar` helper, repeated here for the visual spec):
- Under par: `-N` (`-1`, `-2`) — rendered in `under-par` `#2C6B3C`.
- Level par: `E` — never `+0` / `-0`. **No colour of its own** — inherits the surrounding text colour.
- Over par: `+N` (`+1`, `+5`) — always a leading `+` — rendered in `over-par` `#9B3A24`.
- Hole not yet scored: nothing shown. No placeholder, no `E`.

**Per-hole indicator (grid + Summary + share).** A superscript trailing the score digit — `font-ui text-[0.6em] align-super font-normal`, never bold, `ml-[1px]`. Smallest legible size; the digit stays the workhorse and the delta annotates it (micro register). Superscript rather than the inline `(par)` bracket used on the hole number, because up to six player columns share a row and `3 (+1)` will not fit — this is the one deliberate divergence from §5.1's inline treatment, justified by column width.

**Round total-to-par (totals bar, Summary totals row, finish dialog, share).** In brackets, on the total's own line: `41 (+5)`. Not superscript. `Av.` / `DNF` stay as the sub-labels beneath. The bracket's digits and sign take the semantic colour; the surrounding total stays `text` / `accent` as today. Before a player has scored, the bracket is omitted entirely.
- Full size (matches the total) on the surfaces with room: the Summary totals row, the finish dialog, the share image.
- **Surface exception — the live Scorecard totals bar:** the bracket drops to `text-sm font-normal` (and the cell gets `leading-tight`). At 390px with 5–6 players the column is ~47px and a full-size `41 (+5)` wraps to two lines; the smaller bracket keeps it to one. This is the one documented size exception.

**Override rule (one sentence).** A vs-par delta keeps its semantic colour on every surface where the background is the cream ground or the card — *including* inside a winner's accent-green column, where the delta stays `under-par` / `over-par` and only a level `E` inherits the column's green — and drops the semantic colour *only* inside a filled cell (the live active cell, white-on-`accent`), where the delta takes that cell's inverted white text and the leading `+` / `-` sign carries the direction.

Rationale: the semantic colours fail contrast on the solid `accent` fill (1.6–1.7:1) so they cannot be used there; everywhere else — winner columns included — the delta sits on cream/card and passes AA (5.6–6.3:1), and a winner making bogeys is information worth keeping visible. Winner status therefore never changes a delta's colour; only a solid fill behind it does.

**Canvas mirror (`src/utils/share.js`).** The share image is hand-drawn and cannot read CSS tokens, so the two hexes are duplicated into its local `C` map:
```
underPar: '#2C6B3C',
overPar:  '#9B3A24',
```
The share image has no active cell, so the "filled cell" branch of the override never applies there. It does have winner columns (drawn in `C.accent`): per the rule above, deltas in those columns still render in `C.underPar` / `C.overPar`, and a level `E` inherits `C.accent`. In practice the canvas picks the delta's `fillStyle` purely from the sign of the delta (negative → `C.underPar`, positive → `C.overPar`, zero → inherit the cell's current fill), independent of winner status.

### Accent divider rule
```
w-10 h-0.5 bg-accent mx-auto
```
Used to separate major sections on the Home screen (left-aligned `ml-0` variant). Not used on utility screens.
On the Home screen the rule is left-aligned: `ml-0` replaces `mx-auto`.

### Error / notification banner
```
sticky top-0 z-50 bg-accent text-bg text-center font-ui text-xs py-2 px-4 tracking-wide
```

### Outbuild attribution mark
Footer of home screen only.
```
Scorecard         font-bold text-base text-text
 by               text-xs text-muted font-normal
Outbuild ↗        text-xs text-muted font-normal underline underline-offset-2
                  → links to https://outbuild.uk, target="_blank"
```
Inline, same baseline, `items-baseline gap-1`.

---

## Email design — magic link

Email clients cannot load web fonts, so the two-register typographic system is approximated with widely supported fallbacks.

| Role | App token | Email equivalent |
|------|-----------|-----------------|
| Display / wordmark | Cormorant Garamond | Georgia, serif |
| UI labels, body, button | Inter | Arial, sans-serif |

### Colour palette (inline styles — no CSS variables in email)

| Role | Hex |
|------|-----|
| Page background | `#F7F4EE` |
| Card surface | `#F5EFE3` |
| Border | `#D9D0C4` |
| Primary text | `#1A1A18` |
| Muted text / labels | `#6B6560` |
| Accent (green) | `#1A4329` |
| Button text | `#F7F4EE` |

### Button style
Matches the app's primary button: `border-radius: 4px` (sharp), uppercase, `letter-spacing: 0.1em`, `font-weight: 600`, `font-size: 13px`. Background `#1A4329`, text `#F7F4EE`.

### Structure
- Outer background: `#F7F4EE`, `padding: 40px 20px`
- Card: `max-width: 480px`, `background: #F5EFE3`, `border: 1px solid #D9D0C4`, `border-radius: 8px`, `padding: 40px`
- Wordmark: `font-family: Georgia, serif` — "Scorecard" in muted (`#6B6560`), "by Outbuild" in accent (`#1A4329`); `font-size: 11px`, uppercase, `letter-spacing: 0.12em`
- Heading: Georgia, `font-weight: normal`, `font-size: 24px`, `color: #1A1A18`
- Body copy: Arial, `font-size: 14px`, `line-height: 1.6`, `color: #6B6560`
- Fallback link: `font-size: 12px`, muted label + `#1A1A18` URL, `word-break: break-all`
- Footer: Arial, `font-size: 12px`, `color: #6B6560` — "Built by Outbuild. If you didn't request this, you can safely ignore this email."
- Divider: `border-top: 1px solid #D9D0C4`, no shadow

### Source file
`functions/api/auth/request-link.js` — `buildEmailHtml()` function.

---

## Desktop wrapper pattern

`Mobile only: true`

On viewports wider than 430px:
- Body: flex, centred, `padding: 48px 0`, background `#E8E2D6`
- App shell: `width: 390px; height: 844px; border-radius: 44px`
- Bezel: `box-shadow: 0 0 0 10px #1C1B19, 0 0 0 11px rgba(255,255,255,0.06), 0 32px 80px rgba(26,26,24,0.45)`
- Desktop note: Caveat font, right of frame, `left: calc(50% + 240px)`, rotated 5deg, `opacity: 0.75`
- On viewports narrower than 431px: app renders full-width, frame drops away

The app shell class `.app-shell` triggers this layout. The app itself is entirely unaware of the wrapper.

---

## Navigation

State-machine router in `App.jsx` with light URL sync (path per page, `popstate` handled).

```
home → setup → scorecard → summary
home → history → summary
home → info
home → /bruntsfield-short-course
scorecard / course page → course map (modal, via CourseMapModal)
```

`navigate(to, params)` and `goBack(fallback)` are both passed as props to every page. `navigate` pushes a new history entry (a genuinely new state — starting a game, opening a round from a list). `goBack` steps back one entry through the real browser history (`window.history.back()`) when there's an in-app step to return to, and falls back to `navigate(fallback)` only on a direct deep-link load (nothing to step back to). Screens use whichever is correct for the action, not always `goBack` — e.g. finishing an edit and landing on a fresh Summary is a `navigate`, because it's a new state, not a step backward.

**History state and the params allowlist.** `popstate` restores a page's `params` from a small allowlist stamped in `history.state` at push time — `bruntsfield`, `fromHistory`, and `gameId` (a round's own id, added when a `game` param is passed to `navigate`, regardless of destination page). The mutable `game` object itself, and edit-flow flags (`editRound` / `editContext` / `pastRound`), are deliberately never persisted — a frozen snapshot would go stale, and a bounce into a half-restored edit could strand a working copy. Screens that need that state after a bounce recover it themselves: from the game's own `_edit` marker recovered from storage (Scorecard), or by re-resolving the round from storage using the persisted `gameId` (Summary — see `Summary.jsx`, #43b). This is a known, accepted limitation for a bounce onto a signed-in D1-only round with no local copy to look up (tracked in BACKLOG #43b).

**Back button labels.** Every back affordance names its real destination or action rather than a generic "← Back" — `PageHeader`'s `backLabel` prop takes the exact string to render (arrow included when relevant). A button that steps back through history is labelled with the destination screen (`"← Home"`, `"← Rounds"`, `"← History"`), context-aware where the destination varies (Info, Privacy, Rules, Setup each pick their label from where they were opened). A button that performs an action other than stepping back — the live Scorecard's "Pause", an explicit `navigate('home')` (not `goBack()`) that leaves the round intact in storage so it reappears as "Resume Game" on Home — drops the arrow and says what it actually does. Home and the Bruntsfield course page carry no in-app back button at all: Home is the app root, and Bruntsfield relies on the phone browser's own back navigation (user-confirmed). **"Course" replaces "Bruntsfield"** as the destination word wherever a header button needs to name it — see "Never truncate a header button" under Page header, above, for why.

**Known duplication — build note for next pass, not fixed here.** Three hand-rolled copies of "a back button that looks like `PageHeader`'s" exist outside the shared component: Login's two screens (`src/pages/Login.jsx` lines 40-45 and 68-73, `p-4` rather than `py-3 min-h-[44px]` — a real, if small, spacing mismatch against the shared component) and Summary's bespoke header (`src/pages/Summary.jsx` lines 157-207, which reimplements the whole `relative flex items-center justify-between` header shell rather than rendering `PageHeader`, presumably because Summary needs a conditional spacer/Edit-or-Done right slot `PageHeader` doesn't yet support). These should compose `PageHeader` — extending its API if needed — rather than restyle it, so a future header change (like the truncation fix in this pass) only has to happen once. This is a frontend-developer refactor concern, not a DESIGN.md content change; flagging it here so it isn't lost.

---

## Icons

Inline SVGs throughout — no icon library dependency.
- Stroke-based, `strokeLinecap="round" strokeLinejoin="round"`
- Standard `strokeWidth`: `1.5` (general UI), `2` (close/X), `2.5` (advance chevron)
- Sizes: `w-2.5 h-2.5` (external link ↗), `w-4 h-4` (close ✕), `w-6 h-6` (map, chevron)

---

## Consistency check — Outbuild principles

### Aligned ✓
- Brand colour (forest green) handles all decorative and interactive roles
- Score-vs-par (`under-par`, `over-par`) is the single deliberate exception to the one-colour rule — two accents, fenced to vs-par **deltas only**, never touching chrome or interaction, within the Outbuild "no more than two accents in precisely defined contexts" allowance. It is a context-rooted decision: golfers read a card in green/level/red
- Two typographic registers (editorial Cormorant Garamond + micro Inter) are clearly distinct
- Flatness maintained — shadows only on floating elements (modals, primary CTA)
- Two radius families: `rounded-md` for controls, `rounded-full` for circular controls and filter chips
- Phone-frame desktop wrapper correctly implemented per Outbuild mobile-only pattern
- Caveat font used exclusively in desktop wrapper note — never inside the app
- Outbuild attribution mark present on home screen, links to outbuild.uk
- Warm, earthy palette — not clinical or tech-forward
- One primary action per screen throughout
- No icon library; no decorative illustration; no gradient backgrounds
- Three-tier button-size system (Full CTA / Dialog button / Header action) now named and documented, closing a gap where three variants shipped without one

### Divergences — flag for fix

**Intended state:** the advance-button fill is the `control-warm` token, the active-row tint is `accent-tint` (`--color-accent-tint`), and every focus ring is `ring-accent/40`. All three are now fully implemented — `src/pages/Login.jsx:111`'s hardcoded `focus:ring-[rgba(26,67,41,0.4)]` was swapped for the token on 5 September 2026. The one remaining divergence is `Home.jsx:105`'s inline `rgba(26,67,41,0.1)` for a decorative circle, tracked in `BACKLOG.md` (#65). This section otherwise describes the intended, shipped state.

**New divergences found in this pass (#44, button-size system) — for frontend-developer to pick up next, not yet in BACKLOG as separate items:**
- `src/pages/Scorecard.jsx:412` — dialog confirm button ships `disabled:opacity-60`; should be `opacity-40` per the standardised Dialog button spec.
- `src/pages/Login.jsx:117` — submit button ships `disabled:opacity-50`; found independently while verifying this pass (not in the original audit), same fix, `opacity-40`.
- `src/pages/History.jsx:71` — "+ Add round" ships as `py-2 px-3`, `tracking-[0.08em]`, no `font-semibold`; should match the Header action tier spec (`py-2 px-4`, `tracking-[0.1em]`, `font-semibold`) it's grouped with.
- Focus-visible ring is a net-new rule (see "Button size system") with no shipped buttons yet — every button in the app needs the `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40` class added.
