# Design
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

Last updated: 4 September 2026
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

`tailwind.config.js` needs matching aliases for the two new tokens: `'under-par': 'var(--color-under-par)'`, `'over-par': 'var(--color-over-par)'` (added by the frontend-developer as part of the #38 / #52 build — this file only defines the tokens).

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
| Focus ring | `rgba(26,67,41,0.4)` | Input focus ring |

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
| Page header vertical | `pt-12 pb-6` |
| Primary button vertical | `py-4` (16px) |
| Secondary / input vertical | `py-3` (12px) |
| Items in a list | `space-y-3` (12px gap) |
| Button group gap | `gap-3` or `gap-4` |
| Footer safe area | `pb-10` to `pb-14` |
| Control bar | `px-5 py-4` |
| Table cell (vertical) | `py-3` |
| Table cell (horizontal) | `px-2` (hole col), `px-1` (player cols) |

---

## Border radius

| Value | Tailwind | Use |
|---|---|---|
| `4px` | `rounded-sm` | Primary and secondary CTA buttons — sharp, printed-document feel |
| `8px` | `rounded-md` | All other interactive controls: inputs, cards, list rows |
| `12px` | `rounded-lg` | (Available — larger panels) |
| `50%` | `rounded-full` | Circular control bar buttons (64×64) |
| `16px top` | `rounded-t-2xl` | Bottom sheet / confirmation modal |
| `44px` | *(CSS only)* | Phone frame on desktop |

Primary button exception: uses `rounded-sm` (4px) for a sharp, printed-document feel. Secondary/outlined buttons also use `rounded-sm`. All other interactive controls retain `rounded-md` (8px).

Rule: **Exception: primary and secondary CTA buttons use `rounded-sm` (4px) — sharp corners signal a printed document.** All other interactive elements in the page flow use `rounded-md`. Floating elements (modals, sheets) use `rounded-t-2xl`. Circular controls use `rounded-full`.

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

### Primary button
```
bg-accent text-bg rounded-sm py-4 px-6
font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn
active:bg-accent-hover
disabled: opacity-40 cursor-not-allowed
```

### Secondary / outline button
```
border border-border text-text rounded-sm py-4 px-6
font-ui text-sm tracking-[0.1em] uppercase font-medium
active:bg-bg-card
```

### Accent outline button (Resume Game, Finish header button)
```
border border-accent text-accent rounded-sm py-3 px-4
font-ui text-sm tracking-[0.08em] uppercase font-medium
```

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
- Title: `absolute inset-x-0 text-center px-20 font-display italic text-2xl text-text truncate pointer-events-none`
- Back: `py-3 min-h-[44px] text-muted font-ui text-sm tracking-[0.08em] uppercase` — ← prefix, no button chrome
- Right slot: optional (Finish button, Edit action) — same `py-3 min-h-[44px]` touch target

**Title-length budget:** the centred title sits behind a fixed `px-20` (80px) clearance on each side and `truncate`s rather than wrapping. At 390px that leaves ~230px for the title. "← Back" plus a one-word right action is the widest side content the header is designed for; a longer right-side label needs the clearance revisited (measure sibling widths at render).

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

**Par stepper row (two-column list):** `grid grid-cols-2 gap-x-3 gap-y-1.5`, one cell per hole. Each cell: `flex items-center justify-between rounded-md border border-border bg-bg-card pl-3 pr-0.5`, holding a `Hole {n}` label (`font-ui text-sm text-text`) and a `−  {par}  +` stepper. Stepper buttons are `w-11 h-11` (44px), `rounded-md`, `font-ui text-lg`, `active:bg-border`; the par value between them is `font-ui text-sm w-4 text-center tabular-nums`. At the 2–7 band edge the relevant button is `disabled` + `opacity-40` and does nothing (no wraparound). Each row carries `role="group" aria-label="Hole {n}, par {par}"`; the buttons carry `aria-label="Decrease/Increase par for hole {n}"`. Heading above the grid: the standard micro-label (`font-ui text-xs tracking-[0.12em] uppercase text-muted`), "Par for each hole". No "set every hole to N" control, no tap-to-cycle grid.

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
| Hole # + par | hole number `font-semibold`, then the hole's par in brackets `font-normal ml-0.5` at the same size — e.g. **3** (3). The bracketed par **label** carries no colour of its own; it inherits the cell colour (chrome / muted / accent). Same treatment on the live grid and the read-only Summary table. Replaces the earlier raised `(N)` superscript. *Deltas-only exception:* the par carries no colour rule holds for this par **label** — but score-vs-par **deltas** (the `+1` / `-1` / `E` superscript and the round total-to-par) do take a semantic colour. See "Score vs par" below. |
| Empty score | `—` (em dash) |

### Score vs par

The one place the scorecard leaves pencil-and-paper monochrome. Applies to score-vs-par **deltas** only (PRD §5.3): the live per-hole superscript (#38), the read-only Summary / History superscript, and the round total-to-par `41 (+5)` (#52). It does **not** apply to the bracketed par *label* on the hole number (§5.1) — that stays uncoloured.

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

`navigate(to, params)` passed as a prop to every page. Back buttons call `navigate('home')` or the appropriate parent. `popstate` clears `params` — pages that need context across a browser back/forward stamp it on the active game (see the edit-round flow).

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
- Two radius families: `rounded-md` for controls, `rounded-full` for circular controls
- Phone-frame desktop wrapper correctly implemented per Outbuild mobile-only pattern
- Caveat font used exclusively in desktop wrapper note — never inside the app
- Outbuild attribution mark present on home screen, links to outbuild.uk
- Warm, earthy palette — not clinical or tech-forward
- One primary action per screen throughout
- No icon library; no decorative illustration; no gradient backgrounds

### Divergences — flag for fix

**1. Advance button uses `bg-muted` instead of `bg-control-warm` — Active bug**
The CSS token `--color-control-warm: #9A9189` was created specifically for the advance button fill.
`Scorecard.jsx` applies `bg-muted` (maps to `--color-text-muted: #6B6560` — a darker, text-role value) instead.
The `control-warm` token is currently unused. Fix: change `bg-muted border-2 border-muted` to `bg-control-warm border-2 border-control-warm` in the advance button.

**2. Active row tint is an arbitrary hardcoded value**
`bg-[rgba(26,67,41,0.05)]` hardcodes the accent RGB. Recommend adding `--color-accent-tint` to CSS vars and `'accent-tint': 'var(--color-accent-tint)'` to Tailwind config so it's a named token.

**3. Focus ring hardcodes the accent RGB**
`focus:ring-[rgba(26,67,41,0.4)]` — same pattern as above. Could be extracted to a consistent named value.
