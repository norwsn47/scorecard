# Design
## Scorecard by Outbuild — Bruntsfield Short Hole Golf Course

Last updated: 23 November 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

> This file describes the app as it ships after the November 2026 redesign. The tokens were read from Figma and are recorded in `docs/redesign/reference/tokens.json`; `src/styles/tokens.test.js` checks the code against that file. Decisions and reversals are in `CHANGELOG.md` (22 and 23 November 2026).

---

## Overview

Mobile-only scorecard app. Cream/warm ivory background with a single forest green brand colour. Two typographic registers: Cormorant Garamond italic for editorial moments, Inter for all UI labels and data. Outbuild design language throughout: warm, restrained, purposeful.

**Design philosophy (Home screen):** "A simple digital replica of the paper scorecard used for hundreds of years, designed to keep your focus on the game, not the screen." The Home screen breaks digital symmetry intentionally: a left-aligned title and value propositions create a structured printed-document feel, not a centred app layout.

**Physical context:** this app is a digital replica of the paper scorecard carried round Bruntsfield for over a century: printed-document type, ruled hairlines, heritage serif, a familiar hole-by-player grid. Borrowing that language is a deliberate, context-rooted decision (per `OUTBUILD-PRINCIPLES.md` "Products rooted in a physical context"), not decoration. The one place the app steps outside pure pencil-and-paper monochrome is the **score-vs-par semantic colour** (see "Score vs par" below): golfers read a card in green/level/red the moment they look up from the green, and the app follows that reading.

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
| `accent` | `--color-accent` | `#1A4329` | Brand colour — deep historic Scottish green; all interactive highlights, active cell, winner. The CSS var holds the RGB channels (`26 67 41`), not a hex string, so opacity modifiers compile |
| `accent-hover` | `--color-accent-hover` | `#142f1e` | Accent on press (Figma accent hover and pressed) |
| `accent-tint` | `--color-accent-tint` | accent at 8% (`rgb(var(--color-accent) / 0.08)`) | The one tint: active row, selected states and soft fills. Figma `color/accent/subtle`. **Must not be raised:** `muted` text on it is 4.57:1, so any more opacity falls below AA 4.5:1. Guarded by `src/styles/tokens.test.js` |
| `accent-tint-hover` | `--color-accent-tint-hover` | accent at 15% (`rgb(var(--color-accent) / 0.15)`) | Pressed state of an `accent-tint` fill (buttons, header actions, the back button). Figma `color/accent/subtle-hover` |
| `on-accent` | `--color-on-accent` | `#FFFFFF` | Text and icons on a solid `accent` fill. Figma `color/accent/on-accent`. White on `accent` is 11.2:1 |
| `border` | `--color-border` | `#D9D0C4` | Hairlines, dividers, card edges: warm light, decorative (1.39:1 on `bg`, deliberately below the 3:1 graphics floor) |
| `field` | `--color-border-field` | `#827970` | Boundary of **form fields** (text inputs, textareas, selects) and the History filter pills. Used as `border-field`. Warm mid-grey, ~3.7:1 on `bg-card` (see "Sunlight contrast") |
| `control-warm` | `--color-control-warm` | `#7D746C` | Warm grey for secondary game controls: Decrement outline and glyph, Advance fill |
| `disabled-surface` | `--color-surface-disabled` | `#E8E1D6` | Fill of a disabled control. Figma `color/surface/disabled` |
| `disabled-text` | `--color-text-disabled` | `#A39A90` | Text of a disabled control. **Owner override** of Figma `color/text/disabled` (`#D9D0C4`, 1.17:1 on the disabled fill, unreadable outdoors): about 2.1:1 on `disabled-surface`, 2.5:1 on `bg` - readable, still plainly disabled |
| `error` | `--color-error` | `#9B3A24` | Field error edge and message. Figma `color/status/error/text`. Same value as `over-par`, separate token so `over-par` stays deltas-only |
| `under-par` | `--color-under-par` | `#2C6B3C` | Score-vs-par **delta** when under par (`-1`, `-2` ...). Deltas only: never chrome, never interactive |
| `over-par` | `--color-over-par` | `#9B3A24` | Score-vs-par **delta** when over par (`+1`, `+5` ...). Deltas only: never chrome, never interactive |
| *(desktop only)* | n/a | `#E8E2D6` | Background behind phone frame on desktop |

`disabled-text` on `disabled-surface` is **below 4.5:1 by design**. Disabled states are exempt from the contrast rule (see "Sunlight contrast"). Buttons, fields, header actions and the par stepper buttons use these two tokens; none uses `opacity-40`.

`tailwind.config.js` carries a matching alias for each token (for example `'under-par': 'var(--color-under-par)'`, `'accent-tint': 'var(--color-accent-tint)'`, `'disabled-surface'` and `'disabled-text'` pointing at the two disabled vars).

### `border` vs `field` — which edge to use

Two border tokens, split by **job**, not by size or importance:

- **`border-field`** - the edge of something you type or choose into: `<input>`, `<textarea>`, `<select>` (including the date input). That edge is the only thing telling a golfer where the field is, so it is a control boundary and must clear 3:1 (WCAG 1.4.11). Nothing else takes it, with one deliberate exception: the History filter pills (see "Filter pills"), which are a control with no other boundary and take `border-field` so the pill reads as tappable. The pill keeps its own separate clear button.
- **`border-border`** - everything decorative: header and table rules, list dividers, card edges, the dashed empty-state boxes, the inactive 9/18 option and the par stepper cells. If removing the line would not stop someone finding a control, it is a hairline and stays light. (Secondary buttons use `border-accent`, and a disabled one `border-disabled-text`; they are not hairlines.)

Why not darken `border` itself: it draws every rule on every screen. Darkening it would turn the scorecard's quiet printed-rule feel into a grid of grey lines (flatness and restraint, `OUTBUILD-DESIGN-LANGUAGE.md` §4 and §9). A field earns a firmer edge; a divider does not.

Not a state colour. `field` is the *resting* edge of a field. Error / duplicate takes `border-error` (`--color-error` `#9B3A24`, Figma `color/status/error/text`, about 6.1:1 on `bg-card`); the focus ring is the solid `ring-accent` (see "Disabled and focus-visible"). There is no dark theme, so there is a single value. The Tailwind key is `field` (not `border-field`) so the class reads `border-field` rather than `border-border-field`; do not use it for `bg-` or `text-`.

### The two score-vs-par colours are a scoped exception

The app is otherwise **one brand colour doing all the work** (Outbuild principle 3). `under-par` and `over-par` are the single, deliberate exception, and they are tightly fenced:

- They colour **vs-par deltas only** — the per-hole inline delta (`+1` / `-1` / `E`) and the round total-to-par (`41 (+5)`). Nothing else.
- They are **never** used for buttons, borders, icons, links, backgrounds, focus rings, or any interactive or chrome role. A golfer must never have to wonder whether a green thing is tappable.
- **Level par (`E`) gets no colour of its own** — it inherits whatever text colour its context already uses (`text`, `muted`, `accent` in a winner column, or white in the active cell).
- The bracketed par **label** on the hole number (e.g. "3 (3)", see "Scorecard table") is *not* a delta — it stays uncoloured and is unaffected by this exception.

This keeps within the Outbuild allowance of "no more than two accents beyond the brand colour, used in precisely defined contexts."

### Overlays and inline transparent values

| Name | Value | Role |
|---|---|---|
| `--overlay-modal` | `rgba(26,26,24,0.55)` | Full modal backdrop |
| `--overlay-backdrop` | `rgba(26,26,24,0.4)` | Bottom sheet backdrop |
| `accent-tint` | accent at 8% (`--color-accent-tint`) | Scorecard active row background, selected states, soft fills. One value for all three. Never raise it (muted text on it is 4.57:1) |
| `accent-tint-hover` | accent at 15% (`--color-accent-tint-hover`) | Pressed state of a tinted fill |
| Focus ring | solid `ring-accent` | There is no transparent focus ring: see "Disabled and focus-visible" |

### Sunlight contrast — the score-vs-par colours

**Rule:** Anything a golfer reads or taps outdoors: text at least 4.5:1, icons, rings and fills at least 3:1 (aim for 4:1). `muted` is the lightest permitted text colour. Only disabled states and decorative hairlines (`border`) may fall below. The edge of a form field is not a hairline: it takes `field`. Disabled states are exempt, so `disabled-text` on `disabled-surface` is allowed to sit below 4.5:1.

The app is used outdoors on a phone in bright light, so both delta colours were chosen to clear **WCAG AA for small text (4.5:1)** against every surface a delta can sit on, with headroom for glare. Ratios:

| Colour | on `bg` `#F7F4EE` | on `bg-card` `#F5EFE3` | on `accent` fill `#1A4329` |
|---|---|---|---|
| `under-par` `#2C6B3C` | **5.8 : 1** ✓ | **5.6 : 1** ✓ | 1.7 : 1 ✗ |
| `over-par` `#9B3A24` | **6.3 : 1** ✓ | **6.1 : 1** ✓ | 1.6 : 1 ✗ |
| white `#FFFFFF` (active-cell text, `on-accent`) | — | — | **11.2 : 1** ✓ |
| `accent` `#1A4329` (winner column text) | 10.2 : 1 ✓ | 9.8 : 1 ✓ | — |
| `control-warm` `#7D746C` (Decrement outline and glyph, Advance fill) | 4.2 : 1 ✓ | 4.0 : 1 ✓ | — |
| `muted` `#6B6560` (secondary text, inactive hole numbers, placeholders) | 5.2 : 1 ✓ | 5.0 : 1 ✓ | — |
| `field` `#827970` (text input, textarea, select edge) | 3.9 : 1 ✓ | 3.7 : 1 ✓ | — |
| `border` `#D9D0C4` (decorative hairlines only) | 1.39 : 1 (exempt) | 1.33 : 1 (exempt) | — |

`muted` on the 8% `accent-tint` is **4.57 : 1** (the figure from `tokens.json`, guarded by `src/styles/tokens.test.js`). That is the reason the tint is capped at 8%: any stronger and muted text on the active row drops below 4.5:1. The table above has no column for the tint, so this one ratio is stated here rather than as a row.

The `field` and `border` rows are **hand-computed from WCAG relative luminance** (sRGB channels linearised, ratio = `(L1 + 0.05) / (L2 + 0.05)`), not measured in a browser. Relative luminance: `bg` 0.906, `bg-card` 0.867, `field` 0.196, `border` 0.638.

**Why `field` sits at 3.7:1, not 4:1.** Inputs are filled `bg-bg-card` and sit on `bg` (or on a `bg` sheet), so the edge borders two surfaces. The card fill is the lighter-contrast, worse case: 3.7:1 there, 3.9:1 against `bg`. That clears the 3:1 floor with about 25% headroom for glare and 1px anti-aliasing. A flat 4:1 would need `#7D746C` (the `control-warm` value), which on a 1px line around every field reads as a heavy pencil box rather than a ruled line. 3.7 is the point where the edge is plainly a control boundary without looking heavy. If outdoor testing shows fields still washing out, move it darker toward `#7D746C`; that is the ceiling.

`control-warm` is a graphics colour (icons, rings, fills), held to the 3:1 floor with a 4:1 aim, so it clears the rule at about 4:1. `muted` is text and clears 4.5:1.

Both delta colours **fail** on the solid `accent` fill. This is expected and is exactly why the override rule below forces them off inside a filled cell. On every non-filled surface (cream ground or card, including behind a winner's accent-green *text*) they pass comfortably.

`under-par` `#2C6B3C` is a lighter, greener mid-forest, deliberately ~12 lightness points up from the brand `accent` `#1A4329` so a `-1` reads as its own "good score" mark, not as winner/active chrome. `over-par` `#9B3A24` is a deep burnt-terracotta / rust: warm, of the Outbuild family (the brand's original accent direction). Form field errors use the same value through their own `error` token, so `over-par` itself stays deltas-only. The app-level notice banner is the green `accent` fill (see "Error / notification banner").

---

## Typography

Two registers. The display font is used once, deliberately, for a specific editorial purpose. Inter handles everything else.

| Font | Token | Usage |
|---|---|---|
| `Cormorant Garamond` | `--font-display` | Editorial: app name, page and sheet titles, course names |
| `Inter` | `--font-ui` | All UI: buttons, labels, table cells, inputs, body text |
| `Caveat` | *(no token)* | Desktop wrapper note only — never inside the app |

### Type styles

Eight type utilities are defined in `src/styles/index.css` (in `@layer components`), taken from the `textStyles` in `tokens.json`. Sizes, line heights and tracking are in **rem**, so they scale with the 18px root used in the desktop frame. **They are the only way to style text.** No ad hoc size, weight, tracking or uppercase class is used in `src/`, and `src/styles/type-guard.test.js` fails on raw `text-xs|sm|base|lg|xl|2xl...`, `uppercase` and `tracking-*` classes in `src/**/*.jsx` (the only exceptions are the +/- glyphs on the round control buttons and the par stepper, which are icon sizes, not text). Serif is for Display and Title only. Only Label caps is uppercase.

| Utility | Font | Weight | Size / line height | Tracking | Case |
|---|---|---|---|---|---|
| `type-display` | Cormorant Garamond italic | 400 | 2.625rem / 2.875rem (42 / 46px) | 0 | as typed |
| `type-title` | Cormorant Garamond italic | 500 | 1.5rem / 1.875rem (24 / 30px) | 0 | as typed |
| `type-body` | Inter | 400 | 1rem / 1.5rem (16 / 24px) | 0 | as typed |
| `type-strong` | Inter | 500 | 1rem / 1.5rem (16 / 24px) | 0 | as typed |
| `type-small` | Inter | 400 | 0.875rem / 1.25rem (14 / 20px) | 0 | as typed |
| `type-small-strong` | Inter | 500 | 0.875rem / 1.25rem (14 / 20px) | 0 | as typed |
| `type-caption` | Inter | 500 | 0.75rem / 1rem (12 / 16px) | 0.0125rem (0.2px) | as typed |
| `type-label-caps` | Inter | 600 | 0.875rem / 1.25rem (14 / 20px) | 0.06875rem (1.1px) | uppercase |

The two font-weight ranges loaded (Cormorant Garamond 400 to 600, Inter 400 to 600) already cover every weight above.

### Editorial register — Cormorant Garamond italic

Serif is for Display and Title only. Nothing else in the app uses it.

| Context | Utility |
|---|---|
| App name (Home) | `type-display text-text` |
| Page header title, sheet and empty-state titles, course name (Summary header, Course Map modal) | `type-title text-text` |

**Home screen alignment exception:** The `h1` title and subtitle on the Home screen are left-aligned (`text-left`). This is a deliberate departure from the centred page-header title used on every other screen. The Home screen follows a printed-document convention.

### UI register — Inter

Everything that is not Display or Title is Inter, through one of six utilities. Only Label caps is uppercase; buttons, header actions and navigation (Back) are sentence case.

| Context | Utility |
|---|---|
| Body and descriptive copy, input text, the total score | `type-body` (`type-strong` where it needs emphasis, 500) |
| Buttons, header actions (Finish, Save), navigation (Back), emphasised labels, score cells | `type-strong` or `type-small-strong`, sentence case |
| Secondary copy, helper text, table cells, error and banner text | `type-small` (`type-small-strong` for emphasis) |
| Score-vs-par delta, fine print | `type-caption` (12px, 500, tracking 0.2px); see "Score vs par" |
| Micro labels and table headers | `type-label-caps` (the only uppercase style), `text-muted` |

Colour is applied separately with the colour tokens (`text-text`, `text-muted`, `text-accent`); the utilities set family, size, line height, weight, tracking and case only.

### Caveat — desktop note only
`font-family: 'Caveat', cursive; font-size: 1.15rem; line-height: 1.35` — rotated 5deg, muted colour, opacity 0.75. Never used inside the app itself.

---

## Spacing

Base unit: 4px (Tailwind default).

| Context | Value |
|---|---|
| Page horizontal padding | `px-page` (16px), on every screen, the header bar and the bottom action bar alike |
| Page header | `min-h-[4.25rem]` bar, no vertical padding (see "Page header") |
| Button | `min-h-12 px-6 py-2` Large, `min-h-11 px-4 py-2` Medium (see "Button size system") |
| Form field | `py-3 px-4` (see "Text input") |
| Button group gap | `gap-3` (paired sheet buttons) or `gap-group` (stacked page buttons) |
| Footer safe area | `pb-10` to `pb-14` (page foot), `pb-10` (sheets); the bottom action bar adds `env(safe-area-inset-bottom)` |
| Control bar (live Scorecard) | `px-page py-4` |
| Table row height | `h-12` (48px) live grid, `h-9` (36px) Summary; band rows `h-11` or `h-14` (dense). See "Scorecard table" |
| Table cell (horizontal) | `pl-3 pr-1` (hole col, labels left-aligned), `px-0.5` or `px-1` (player cols) |

The header bar sets its height with `min-h-[4.25rem]` rather than vertical padding; see "Page header".

**Page margin.** The 16px page margin (`px-page`) is the same on every screen. The header bar, the page body (`main`) and `BottomActionBar` all use it, so a header's back button, a page's text and the bottom bar's button share one left and right edge. `px-5` and `px-6` are banned by the control guard (`src/styles/control-guard.test.js`). The only allow-listed uses are not page margin:

- `Button` Large's inner padding (`px-6`).
- The inner padding of modals: the course map modal (`CourseMapModal.jsx` and its lazy wrapper, `px-5`).
- The inner padding of bottom sheets (`px-6` in Setup, Summary, Settings, Scorecard and CourseEdit).

Each entry is counted, so a stale or grown entry fails the guard.

### Spacing aliases

Six layout aliases from the Figma Layout collection (`tokens.json`) are defined as Tailwind **spacing keys** in `tailwind.config.js`, in rem. Any spacing utility accepts them: `gap-related`, `space-y-section`, `px-page`, `p-card`, and so on. Pages and components take them in place of raw numbers: `px-page` for page margin, `gap-related` and `gap-group` for stacks, `gap-section` between page sections, `space-y-field` for form fields, `p-card` inside cards. Raw values such as `gap-3` and `mt-4` still appear where no alias fits (paired sheet buttons, a few local gaps), so the table above remains the reference for those.

| Alias | Figma variable | Value | Use |
|---|---|---|---|
| `related` | `layout/gap/related` | 0.5rem (8px) | Gap between closely related items |
| `field` | `layout/gap/field` | 0.75rem (12px) | Gap between form fields |
| `group` | `layout/gap/group` | 1rem (16px) | Gap between groups of content |
| `section` | `layout/gap/section` | 1.5rem (24px) | Gap between page sections |
| `page` | `layout/padding/page` | 1rem (16px) | Page horizontal padding (`px-5` and `px-6` are guarded against) |
| `card` | `layout/padding/card` | 1rem (16px) | Padding inside a card |

Note that `field` is also the name of the form-field border colour token (`border-field`). They do not clash: one is a spacing key (`gap-field`, `p-field`), the other a colour key (`border-field`).

---

## Border radius

One control radius. Two utilities come from the Figma Shape collection, in rem (the desktop frame's root is 18px). They are the only radius keys in `tailwind.config.js`:

| Value | Tailwind | CSS var | Use |
|---|---|---|---|
| `0.375rem` (6px) | `rounded-control` | `--radius-control` | The one control radius: buttons, fields (input, select, date, textarea), cards, the par stepper cells and their buttons, the Map control, the hole-count options, the back button and the text header action |
| `1rem` (16px) | `rounded-sheet` | `--radius-sheet` | Bottom sheets, **top corners only** (`rounded-t-sheet`) |
| `50%` | `rounded-full` | none | Circular game controls (the 64px Decrement, Increment and Advance buttons), the History filter pills, the `Tag`, the filled header action pill (Scorecard Finish), the sheet handle and the Home course-card icon disc |
| `44px` | *(CSS only)* | none | Phone frame on desktop |

`rounded-sm`, `rounded-md` and `rounded-lg` are banned in `src/**/*.jsx` by `src/styles/control-guard.test.js`. The old 4px, 8px and 12px radius variables are gone, so those classes would fall back to Tailwind's own sizes, not the app's.

Rule: **buttons, fields and cards all take `rounded-control`. Sheets take `rounded-t-sheet`. `rounded-full` is for circular game controls, pills and tags, and the filled header action pill only.**

---

## Shadows

One shadow, for **record cards only** (CHANGELOG reversal 7).

| Token | Value | Use |
|---|---|---|
| `--shadow-subtle` | `0 0.0625rem 0.125rem rgba(28,27,25,0.06)` (`0 1px 2px` `#1C1B19` at 6%) | Figma `Shadow/Subtle`. Applied by the `Card` component (History round cards, Home course card) and nowhere else. Tailwind: `shadow-subtle`, the only `boxShadow` key |
| Phone frame | `0 0 0 10px #1C1B19, 0 0 0 11px rgba(255,255,255,0.06), 0 32px 80px rgba(26,26,24,0.45)` | Desktop wrapper (CSS, not a token) |

Buttons, sheets, inputs and every other surface are flat. The old `--shadow-card` and `--shadow-btn` variables and their Tailwind keys are removed, and `shadow-card` and `shadow-btn` stay banned in `src/**/*.jsx` (`src/styles/control-guard.test.js`).

---

## Home screen layout principles

The Home screen breaks the centred-app convention deliberately:
- `h1` title ("Golf Scorecard", `type-display`): left-aligned, with the settings or information icon at the right
- Accent divider rule: left-aligned (`ml-0`, not `mx-auto`)
- Value-proposition lines: a numbered two-column list, left-aligned (`type-strong text-accent` numerals, `type-body text-muted` lines)
- Action buttons: full-width Buttons ("New game" Primary, "Resume game" and "Past rounds" Secondary), on the standard 16px page margin
- Course card: a `Card` (the one shadow) under a muted `type-label-caps` "Course specific scorecards" label. Its title reads "Bruntsfield Short Hole Course" on Home only; the stored course name stays "Bruntsfield Short Hole Golf Course"
- Footer: the Outbuild attribution mark (below)

All other screens use the centred page-header layout.

---

## Component patterns

### Button size system

There is one button, `src/components/Button.jsx`, with three variants (Primary, Secondary, Text) and two sizes (Large, Medium). Colour treatment comes from the variant, weight and room from the size. Do not hand-roll a button with its own classes: use the component. `className` is for layout only (`flex-1`, `mt-4`, `shrink-0`); never restyle colour, radius or type through it.

| Size | Minimum height | Padding | Where it's used |
|---|---|---|---|
| **Large** (default) | `min-h-12` (48px) | `px-6 py-2` | The one main action on a screen: Home, Bruntsfield course page, Login send, Setup "Start the round", Summary home action, sheet buttons |
| **Medium** | `min-h-11` (44px) | `px-4 py-2` | Secondary actions inside a screen: History empty-state actions, Settings account actions, Setup course controls, Summary actions on a saved round |

**The heights are the implementation's choice.** `tokens.json` carries no button dimensions, so Large 48px and Medium 44px are not from Figma. Both keep the 44px minimum touch target.

Shared by every variant: `border rounded-control` (1px; owner call, CHANGELOG 23 November 2026: the 2px outline read too heavy), `type-strong` (sentence case, no uppercase or tracking), `gap-2` between an optional leading or trailing icon and the label, `transition-colors`, and a `type="button"` default. `fullWidth` adds `w-full`.

**Flat.** Buttons carry no shadow.

**Disabled.** Disabled buttons use the disabled tokens, never `opacity-40`: see "Disabled and focus-visible" below. Hover and pressed fills use the `enabled:` variant, so a disabled button never picks one up.

### Primary button
```
bg-accent border-transparent text-on-accent
enabled:hover:bg-accent-hover enabled:active:bg-accent-hover
disabled: bg-disabled-surface border-transparent text-disabled-text
```
The one filled button. Text on the accent is white (`text-on-accent`). Use it for the expected next step on a screen, and keep it to one per screen where possible.

### Secondary button
```
bg-transparent border-accent text-accent
enabled:hover:bg-accent-tint enabled:active:bg-accent-tint-hover
disabled: bg-transparent border-disabled-text text-disabled-text
```
Accent outline on a transparent fill. It is also what "Resume game" (Home) and the course-map link (Bruntsfield page) are: the old one-off accent outline button is removed, and they use this variant at Large.

### Text button
```
bg-transparent border-transparent text-accent
enabled:hover:bg-accent-tint enabled:active:bg-accent-tint-hover
disabled: bg-transparent border-transparent text-disabled-text
```
No outline and no fill, an accent label. It is the "+ Add player" button on Setup (below) and the quiet action on screens such as Settings and Summary. Same sizes as the other variants, so it keeps the 44px minimum height.

### Dialog buttons (paired confirm and cancel)

Sheet buttons are the standard Button at Large, not a separate tier. A confirmation sheet pairs a Secondary (the cancel or neutral choice) with a Primary (the confirm), in a `flex gap-3` row with `className="flex-1"` on each. Order is Cancel then Confirm. Used in Scorecard's finish-confirm sheet, CourseEdit's delete-course sheet and Setup's course-switch sheet.

**Settings' delete-account sheet stacks instead**, per Figma: `flex flex-col gap-3`, both `fullWidth`, with the Primary "Delete account" above the Secondary "Keep my account". The Summary delete-round sheet is the same two-button pattern, with Cancel as the initially focused control (see "Bottom sheet / confirmation modal").

### Header action (`HeaderAction`)

`HeaderAction`, exported from `src/components/PageHeader.jsx`, is the one component for an action in the header's right slot. It is the Figma "App bar action". There is no bordered header button any more (CHANGELOG reversal 3).

```
Shared:  min-h-11 inline-flex items-center justify-center whitespace-nowrap type-small-strong
         transition-colors disabled:cursor-not-allowed
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
Text (default):  -mr-3 px-3 rounded-control border-2 border-transparent bg-transparent text-accent
                 enabled:hover:bg-accent-tint enabled:active:bg-accent-tint-hover
                 disabled:bg-transparent disabled:text-disabled-text
Filled (pill):   px-4 rounded-full border-2 border-transparent bg-accent text-on-accent
                 enabled:hover:bg-accent-hover enabled:active:bg-accent-hover
                 disabled:bg-disabled-surface disabled:text-disabled-text
                 focus-visible:ring-offset-2 focus-visible:ring-offset-bg
```

- **Text by default.** An accent label with no border or fill at rest, and a `rounded-control` tint on hover and press. The `-mr-3` pulls the label back towards the 16px page margin, so the 44px tap area carries the inset, not the text; the transparent 2px border leaves the label ink about 18px from the page edge.
- **Filled pill only for the expected next step.** The one place it ships is Scorecard's **Finish**, and only once every hole is scored for every player and the page is not in edit mode (`filled={!isEdit && allHolesScored}`). It is `rounded-full`, the one pill outside the circular game controls.
- **Everything else is text.** An unscored Finish, Save in edit mode, History's "+ Add" and Summary's "Edit" are all text actions. Summary's Edit keeps `aria-label="Edit round"` (and a matching `title`), so its accessible name stays specific.
- **Pause is not a header action.** It is the Scorecard's left-slot back button with no chevron (see "Back button" under Page header). It is muted text, not accent.
- Every one meets the 44px target (`min-h-11`).

### Add-player button (Text button)
```
<Button variant="text" onClick={handleAddPlayer}>+ Add player</Button>
```
The Text button at Large, grouped under the player fields. The dashed ghost button (`border-dashed bg-bg-card`) is removed.

### Control bar buttons (circular 64×64)

| Button | Classes |
|---|---|
| Map | `w-16 h-16 rounded-control text-muted flex-col` - no ring; map glyph over a `type-caption` "Map" label (muted, so the caption clears 4.5:1). Steps back from the three scoring controls; same 64px tap area |
| Decrement (−) | `rounded-full border-2 border-control-warm text-control-warm text-2xl` - disabled: `opacity-25` |
| Increment (+) | `rounded-full bg-accent border-2 border-accent text-bg text-2xl` |
| Advance (→) | `rounded-full bg-control-warm border-2 border-control-warm text-bg` - disabled: `opacity-25` |

These are physical game controls, not text buttons, which is why they keep their own `opacity-25` disabled state rather than the button system's disabled tokens: a lighter fade reads as "not reachable right now" (e.g. can't decrement below hole 1) rather than "unavailable", which suits a control the player is about to need again a moment later.

### Text input (Field component)

`src/components/Field.jsx` is the one form field. It exports `Input`, `Select`, `DateField` and `Textarea`, all built on one `Field` and all forwarding their ref to the native control, so `autoFocus` and `ref.current.focus()` work as on a bare element. `className` styles the wrapper for layout only.

Anatomy, top to bottom: a visible **label above** the control (`type-small-strong`, `text-text`, `mb-1.5`; `text-muted` when disabled), the control, then optional **helper text** or **error message** below (`type-small`, `mt-1.5`).

```
Control:  block w-full min-w-0 py-3 pl-4 pr-4 rounded-control border type-body
          bg-bg-card text-text placeholder:text-muted
          focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent
Resting edge: border-field   (NOT border-border - see "border vs field")
Error edge:   border-error  (#9B3A24, Figma error colour; message in text-error)
Disabled:     bg-disabled-surface border-border text-disabled-text
              placeholder:text-disabled-text cursor-not-allowed
```

- **Focus** is a solid 2px accent ring plus an accent edge. The ring is not 40% any more.
- **Error** gives the control `border-error` and `aria-invalid`, and shows the message below in `type-small text-error`. `--color-error` has the same value as `over-par` but is its own token, so `over-par` stays deltas-only. Pass `error` as a string for edge plus message (rendered with `role="alert"` unless `errorRole={null}`), or as plain `true` for an edge-only error whose message lives elsewhere. An error message replaces the helper text.
- **Helper text** is `type-small text-muted` (`text-disabled-text` when disabled), tied to the control with `aria-describedby`.
- **Optional** appends a muted "- optional" after the label for sighted users, and an `sr-only` "Optional" tied by `aria-describedby`.
- **Remove slot.** `trailing` renders inside the control's `relative` wrapper and adds `pr-12`, making room for a 44px remove button (Setup's player rows). Without it the control has `pr-4`.
- **`hideLabel`** keeps the label in the DOM but visually hidden (`sr-only`), still tied by `htmlFor` and `id`, so the control keeps its accessible name. Used where a heading already names the group (Setup's player rows sit under "Players").
- **Select** is `appearance-none pr-10 truncate` with its own chevron (`text-text`, `text-disabled-text` when disabled). **Textarea** is `resize-none`. **DateField** is `type="date"`.

**Every field needs an accessible name.** The Field component supplies it: the label is always rendered and tied to the control with `htmlFor` and an auto-generated `id` (or the `id` you pass). A placeholder is not a name.

### Disabled and focus-visible

**Disabled.** Buttons, fields and the par stepper buttons use `disabled-surface` and `disabled-text` (`#E8E1D6` and `#A39A90`), not `opacity-40`. The pair is about 2.1:1, below 4.5:1 **by design**: disabled states are exempt from the contrast rule (see "Sunlight contrast"). A disabled Secondary or Text button has no fill and takes `text-disabled-text` for its label (and its edge, for Secondary). `cursor-not-allowed` is set on all of them. **Circular game controls keep `opacity-25`** (Decrement and Advance): they are physical controls the player is about to need again, and a light fade reads as "not reachable right now".

**Focus-visible.** Every button, field and control uses a solid 2px accent ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`. Buttons add `ring-offset-2 ring-offset-bg` so the ring sits clear of the border. Fields use `focus:` rather than `focus-visible:` because a text field should show focus on tap too, and add the accent edge. `:focus-visible` on buttons only fires for keyboard, switch and assistive-tech navigation, never a touch tap, so it is invisible in normal use on this touch-only product. There is no 40% ring: `ring-accent/40` is banned by the control guard. The header's back button and `HeaderAction` use the solid ring. The Scorecard and Summary score cells take the same solid ring, inset: `ring-accent`, or `ring-on-accent` on the active cell.

**No shadow on buttons or sheets.** The one shadow, `shadow-subtle`, is for record cards only.

### Bottom action bar (BottomActionBar)

`src/components/BottomActionBar.jsx` holds a page's main action in the thumb zone. Used by Setup (Start the round) and Summary (the main action and the links that belong with it).

```
shrink-0 w-full bg-bg border-t border-border px-page pt-group
pb-[calc(1rem+env(safe-area-inset-bottom,0px))]
```

- **In flow, not fixed.** It is the last child of the page's `h-full flex flex-col` column, after the scroll area (`main`), and never shrinks. Because it is not `position: fixed`, it cannot cover the last field, it stays inside the desktop phone frame, and when the iOS keyboard opens it stays at the bottom of the layout while the focused field scrolls into view above it.
- **Hairline** (`border-t border-border`) across the top, the page background behind, **no shadow**.
- **Safe area.** Bottom padding is 1rem plus `env(safe-area-inset-bottom)`, so the button clears the home indicator. The env value is 0 on desktop and in the frame.
- `children` is a Button, a two-column grid of Buttons, and any small text that belongs with them. `className` is for layout only (Summary adds `space-y-field`).

### Page header (PageHeader component)

**One structural layout, always.** Three flex slots on a single row (left, centre, right) with no absolute positioning. The title can never overlap a side slot, because the centre is a real flex child between them, not a layer on top (#85).

```
header:  flex items-center gap-3 px-page min-h-[4.25rem] border-b border-border shrink-0
left:    shrink-0 flex justify-start      /* back button, or an invisible mirror */
centre:  flex-1 min-w-0 text-center       /* <h1> + optional subtitle */
right:   shrink-0 flex justify-end        /* the `right` prop, or an invisible mirror */
```

- **Bar height.** The bar is `min-h-[4.25rem]` (68px) and carries no vertical padding. It is a **minimum, not a fixed height**: a title that wraps to two lines (`type-title` is 30px a line), or a title plus a subtitle, grows the bar by about 10px. Nothing clips. Owner decision (CHANGELOG, 23 November 2026).
- **Frame.** `px-page` (16px) on both sides, `border-b border-border`, and the title in `type-title text-text`. The subtitle is `type-caption text-muted`, one truncated line.
- **The side slots size to their content and never shrink** (`shrink-0`). The back button and any right action keep their full width and are never clipped, wrapped or truncated.
- **The centre slot takes the width the side slots leave** (`flex-1 min-w-0`). The `<h1>` wraps to at most two lines (`line-clamp-2`), so a long course name reads in full; past two lines it clips. `title` is optional: a falsy title skips the `<h1>` entirely, so Summary does not reserve a blank line when a course name is missing (#69).

**The title sits at the true centre of the header on every screen: the invisible mirror.** Whenever the centre has a title or subtitle, each side slot also holds an `aria-hidden`, `invisible`, `pointer-events-none` copy of the other side's node, stacked in the same grid cell. Both sides are then as wide as the wider of the two, so the title is centred on the header, not just in the gap, whether one side, both or neither carry content (Scorecard's Pause and Finish, or Finish changing width when it becomes the filled pill). Owner decision (CHANGELOG, 23 November 2026): a long course name that clips after two lines is preferred to dropping the mirror on course-name screens and letting the title drift off centre.

**Back button.** The left slot, when `onBack` is passed:

```
min-h-11 -ml-2 pl-2 pr-3 inline-flex items-center gap-1 whitespace-nowrap
rounded-control border-2 border-transparent text-muted type-small-strong transition-colors
hover:bg-accent-tint hover:text-accent  active:bg-accent-tint-hover active:text-accent
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
```

- A **chevron SVG** (`w-5 h-5`, 2px stroke, round caps, `aria-hidden`) sits before the label. It replaces the old "←" typed into the label text.
- **`backLabel` is plain text.** It is the destination ("Home", "History"), or for a non-back action the action ("Pause"), and it is the button's **accessible name**. Do not type an arrow into it.
- **`backChevron`** (default `true`) turns the chevron off. Scorecard's live Pause passes `backChevron={false}`, because Pause leaves the round in storage rather than stepping back. Scorecard in edit mode passes `true` with the label "History".
- Muted at rest, with a tint on hover and press. The text turns accent in those same states, so muted text is never drawn on the 8% tint (`muted` on it is 4.57:1, see "Sunlight contrast").
- The 44px target comes from `min-h-11`. The `-ml-2 pl-2` pulls the chevron's ink toward the page margin while keeping the tap area. The focus ring is the solid accent ring, no offset.
- It **never truncates and never wraps.**

**Right slot.** Optional. In practice a `HeaderAction` (see "Header action"). It is `whitespace-nowrap` and never truncates.

**Mirror spacer.** The same node as the side it mirrors, wrapped in `<div aria-hidden="true" class="invisible pointer-events-none">`. It contributes width and nothing else.

**Bare variant, Login only.** `bare` drops the bar entirely: `flex items-center px-page pt-3 shrink-0` with just the back button, no border, no title, no mirror. It is for Login's two screens (the form and "check your email"), which follow Home's borderless "back link above a large editorial heading" pattern. This is a deliberate difference, not an oversight. Login passes `bare`, `onBack` and `backLabel="Home"` and keeps its `<h1>` in the page body. It replaced Login's local `BackToHome` component, the last hand-rolled header back button (#85).

**Never truncate a header button; use a shorter accurate word instead.** A standing rule. The back and right slots carry no width cap and `whitespace-nowrap`, so a button can never clip. The corollary is that a caller must never hand it a label too long for the space: shorten the word. "Bruntsfield" became "Course" everywhere (it is the only course today; revisit if a second ships). Never reintroduce `truncate` on a button label.

**Back-label length.** A long back label never collides with anything, but it eats into the centre title's width (and the mirror doubles the cost), and a title that is a course name can compress to almost nothing. The chevron is an icon, so it takes no characters from the budget. The rule is: **a back label is a single plain destination word where possible and two words at most**, and the check is that the title still has room on a 390px screen. "Home", "Rounds", "History", "Summary", "Course", "Settings", "Courses" and "Pause" all pass. A shortened label still points at the right screen; it need not copy that screen's title.

### Content-page ladder (Info, Privacy, Rules, Settings)

Text-led pages share one vertical rhythm, set with the spacing aliases and no raw numbers. Info and Privacy are the reference screens.

| Step | Value | Where |
|---|---|---|
| Name and email, one above the other | 4px (`gap-1`) | Info's Account block |
| Related items (label, body, link) | 8px (`gap-related`) | Inside a section |
| Blocks inside a section, and the gap between paragraphs | 16px (`gap-group`) | RulesContent's stack |
| Sections | 24px (`gap-section`) either side of a full-width hairline | Info's sections, split by `<div className="h-px bg-border" />` |

- **Page frame.** `main` is `px-page pt-6 pb-14 flex flex-col gap-section max-w-sm mx-auto w-full`, scrolling inside the page column.
- **Section labels** are `type-label-caps`. Info and Privacy set them in `text-accent`. Settings and Home set them in `text-muted`, as in their reference screens. Do not mix the two on one screen.
- **Body text** is `type-body text-text`. Secondary lines are `type-small text-muted`.
- **Settings value rows** are hairline list rows, not boxed fields: `py-3.5 border-b border-border`, a muted `type-small` caption, the value in `type-body text-text`, and a helper line. The edit control is a **44px icon button** (`w-11 h-11 -mr-2.5`, a 20px pencil, `rounded-control`, `text-accent`, accent tint on press) with a specific `aria-label` ("Edit name", "Change email address"). The field opens in place only on a deliberate tap. The tap-through rows ("My courses", "Information") use the same hairline, with a chevron.
- **Settings sign out and delete block** is centred (`flex flex-col items-center text-center gap-section`), pushed to the foot of the page by a `flex-1` spacer. Sign out is a Text button; "Delete my account" is a muted underlined `type-small-strong` link with its explanation beneath.
- **Links.** Grow the tap area with padding and an equal negative margin (see "Inline link tap targets"), and put the link in its own wrapper `<div>` inside a `flex flex-col gap-related` section. Using flex gap instead of `space-y-*` means the negative margin is never overridden, so the link needs no extra handling. Where an item sits under another, `mt-related` gives the 8px.

### Inline link tap targets

Text links inside body copy (`type-body` / `type-small`, underlined accent) are visually small but still need a comfortable hit area. Grow the tap target with vertical padding cancelled by an equal negative margin, so the clickable box expands without shifting surrounding layout:

```
inline-block py-3 -my-3        /* default: ~44px on type-small, ~40px on type-caption */
inline-block py-2.5 -my-2.5    /* where line height is tight: ~36-38px */
```

Match `inline-flex` instead of `inline-block` where the link already uses it (e.g. links with a trailing ↗ icon); just add the `py-* -my-*`.

**Target:** 44px where the surrounding layout allows it (wrap the link so the padding can grow freely). ~36-40px is the practical floor for a `type-caption` link sitting inline within flowing paragraph text, where more vertical padding would overlap adjacent lines. That is better than the bare ~16px text height, accepted as a trade-off only where a link genuinely cannot be pulled onto its own line.

**Prefer giving the link its own line over accepting the reduced floor.** Where a small link can be pulled out of flowing paragraph text (or out of a shared row with another link) onto a line of its own, do that first: it removes the adjacent-line collision that justified the reduced padding, so the link can take `py-3.5 -my-3.5` (~44px even at `type-caption`) instead of settling for `py-2.5 -my-2.5`. Done for Login's "How we handle your data", Info's "Read our privacy policy" and Summary's "Share scorecard" (#34), each on its own line or in its own `<div>`. The `py-2.5 -my-2.5` reduced variant remains available for a link that genuinely cannot be isolated this way.

**`space-y-*` caveat** (content pages now avoid this by using `flex flex-col gap-related`, see the ladder above): if the link is a direct child of a `space-y-*` container, that container's `> :not([hidden]) ~ :not([hidden])` selector out-specifies `-my-*` (specificity 0,3,0 vs 0,1,0), so the negative margin is ignored and the padding shifts the layout. Fix: wrap the link in an unclassed `<div>`. The wrapper absorbs the `space-y` margin and the negative margin then resolves cleanly inside it. Links sitting inline within a `<p>`, or as the sole child of a padded container, need no wrapper.

Precedent: the Setup course-rules link, Summary's "create an account" link (`py-3.5 -my-3.5`, a small link on its own line), and the inline links across Info, Login, Summary, `CourseMapModal`, and `RulesContent`.

### Course-creation controls (Setup, "+ New course")

**Course picking in Setup is selection only.** The native `<select>` (the `Select` field, label "Course") runs full width and keeps the `border-field` edge, as every select does. "+ New course" is a Text button (Large, `mt-related`) under it, not a bordered button, because adding a course is occasional. There is no course editing from Setup: editing lives in Settings > My courses (below).

**Hole-count toggle (9 / 18)**, shown in Setup once "+ New course" is open: two equal buttons, `flex gap-2`, each `flex-1 h-11 rounded-control border type-small-strong`. Active = `border-accent text-accent`; inactive = `border-border text-text`; `active:bg-bg-card`. Labelled "9 holes" / "18 holes", default 9. Single-select: `role="radiogroup"` on the wrapper, `role="radio"` + `aria-checked` on each button. Caption below (`type-small text-muted mt-1.5 pl-1`): "Holes - can't be changed later".

This toggle's **outline** active state is a deliberate choice, not a leftover: see "Selection-state language: outline vs fill" below, which compares it directly with the filter pills' fill applied state.

### My courses (Settings)

Reached from a "My courses" row in Settings' Account section (full-width tap-through row, `min-h-[56px] border-b border-border`, "My courses" in `type-strong text-text`, a muted `type-small` subline "Names and par for each hole", chevron), the same row pattern as Settings' "Information" row. The page (`src/pages/Courses.jsx`, header "My courses", back "Settings" with the header chevron) opens with one `type-body text-muted` intro line, then lists each course as a tap-through row: name in `type-strong`, muted `type-small` subline "{holes} holes · {n} rounds", with " · default" appended for the default course. Tapping a row opens CourseEdit. There is no "+ New course" here: new courses are added when starting a game. The load-failure and empty notices are compact dashed `border-border` boxes, as in Setup.

### Par stepper (`src/components/ParStepperGrid.jsx`)

Shared by course creation (Setup), course editing (CourseEdit) and round-level par correction (Setup in edit mode).

**Two-column list, one column below 360px:** `grid grid-cols-1 min-[360px]:grid-cols-2 gap-x-3 gap-y-1.5`, one cell per hole. Below 360px two columns leave no room for "Hole 18" beside its stepper, so the label wrapped; one column keeps every label on one line. Each cell: `flex items-center justify-between rounded-control border border-border bg-bg-card pl-3 pr-0.5`, holding a `Hole {n}` label (`type-small text-text`) and a `−  {par}  +` stepper. Stepper buttons are 44px square, `rounded-control`, with the disabled colours at the 2 to 7 band edge (no wraparound); the par value between them is `type-strong w-4 text-center tabular-nums`. Each row carries `role="group" aria-label="Hole {n}, par {par}"`; the buttons carry `aria-label="Decrease/Increase par for hole {n}"`. Heading above the grid: `type-label-caps text-muted`, "Par for each hole" (or "Par for this round"). No "set every hole to N" control, no tap-to-cycle grid.

### Filter pills (History)

`src/pages/History.jsx` (the local `FilterPill`), from Figma "Chip" (`c09-chip.png`, `05`, `17`, `18`, `20`). Two pills, **Course** then **Player**, replace the old chip rows (CHANGELOG reversal 6). Each opens a `FilterSheet` (below). The course pill shows only for a signed-in user with 2+ courses, the player pill for 2+ players (signed in or not), and neither while the list loads. A signed-in user with exactly one course still sees that course named as a `type-label-caps text-accent` label, and a signed-out visitor still sees the "Stored on your device" disclaimer. The pills sit in one wrapping row (`flex flex-wrap gap-related px-page`), so two long values drop to a second line at 320px rather than scroll.

```
Shape:    inline-flex max-w-full rounded-full border min-h-11   (44px target)
Default:  border-field text-text, "Course" or "Player" plus a small caret
          hover bg-accent-tint
Open:     border-field bg-accent-tint text-text  (the sheet is up; aria-expanded="true")
Applied:  border-accent bg-accent text-on-accent, the chosen value (truncated) plus a cross
          hover bg-accent-hover
Focus:    ring-2 ring-accent ring-offset-2 ring-offset-bg on the whole pill (has-[:focus-visible])
```

- **Two buttons when applied.** The main button always opens the sheet (`aria-haspopup="dialog"`, `aria-expanded`). Its accessible name is the visible label at rest ("Course") and `Course: {value}` once applied, so a truncated value is still read in full. The cross is its own 44px button, named "Clear course filter" or "Clear player filter", and clears just that filter without opening the sheet. After a clear, focus stays on the pill's main button.
- **Edge.** `border-field`, not `border-border`: `c09-chip.png` shows a clearly firmer edge than a card hairline, and the pill is a control with no other boundary.
- **Open has no PNG.** The tint is the Figma hover look, reused so the pill reads as "pressed in" while its sheet is up.
- **One selection, two entry points.** The inline player-name toggles on the round cards, the player pill and the player sheet all read and write the same `filter` state, so they always agree. Single choice per pill, "All ..." clears, and the two pills combine (course AND player).
- **The star.** The signed-in player keeps the `PlayerStar` on their applied pill and on their row in the sheet.

**Applied state** (`18-history-filters-applied.png`). When any filter is applied and at least one round matches, a row under the pills shows `Showing {n} of {m} rounds` (`type-small text-muted`, `role="status"`, so a change is announced politely; "round" when m is 1) with a **Clear filters** Text button at the right, which clears both filters and puts focus on the first pill. `m` is every round loaded, `n` the rounds on screen. The row is not rendered when no filter is applied.

**No-match state** (`20-history-no-match.png`). When the filters leave no rounds, the status row is replaced by an `EmptyState` (`role="status"`): "No rounds found", then "{name} hasn't played a recorded round." for a player filter, "{name} hasn't played a recorded round at {course}." for a course and player together (a pairing the signed-in player can now reach), and a Text action that clears every filter ("Show all rounds", or "Clear filters" for the pairing). "No rounds yet" is unchanged and only shows with no filter applied.

### FilterSheet (`src/components/FilterSheet.jsx`)

The picker behind each pill (`17-history-picker-open.png`, rows from List row `c15`). A bottom sheet in the shared pattern, with the focus trap added.

```
<FilterSheet title allLabel allCount options selected onSelect onClose />
  options: [{ value, label, count, suffix? }]    selected: a value, or null for "All"
  onSelect(value | null)    onClose()            mount it to open it, unmount to close
Sheet:   role="dialog" aria-modal="true" aria-labelledby={title id} (on the sheet, not the backdrop)
         bg-bg rounded-t-sheet w-full max-w-[430px] max-h-[85vh] px-page pt-3, no shadow
Handle:  w-10 h-1 bg-border rounded-full mx-auto mb-group
Title:   h2 type-title text-text
Rows:    role="radiogroup" > button role="radio" aria-checked, w-full min-h-11 py-group (56px)
         border-b border-border type-body, label left, "{n} rounds" (text-muted) and a check at the right
Chosen:  text-accent label, a 20px check, no tint
Press:   active:bg-accent-tint (muted count on 8% is 4.57:1)
Focus:   ring-2 ring-inset ring-accent
```

- **Order and counts.** The "All ..." row first ("All courses", "All players"), then one row per option. Each count is what choosing the row would leave on screen, so it reflects the **other** active filter (a course's count respects the player filter and the reverse). A count can be 0: the row still works and leads to the no-match state. Singular "1 round".
- **Choosing applies and closes.** There is no Done button. Tapping the chosen row again keeps it and closes.
- **Keyboard.** Roving tabindex: Tab reaches the chosen row (the "All ..." row when nothing is chosen). Arrow keys, Home and End move focus without choosing (a bare radiogroup would choose on arrow, but choosing closes this sheet). Enter or Space chooses.
- **Focus trap.** While the sheet is open Tab and Shift+Tab wrap inside it, and a Tab with focus outside the sheet pulls it back in. Open, close and focus return follow "Bottom sheet / confirmation modal" below.
- **Long names** wrap in the row (`min-w-0 break-words`); the count never shrinks.

### Selection-state language: outline vs fill (a decision, not an accident)

Two different "this is currently selected" idioms exist in the app side by side:

- **Segmented control** (9/18 hole-count toggle): active = **outline** (`border-accent text-accent`), inactive = `border-border text-text`. This is a fixed, mutually-exclusive *setting* chosen once while building something (a course) - closer to a radio button than a switch. Quiet, because it describes a configuration, not an in-the-moment action.
- **Filter pill** (History): applied = **fill** (`bg-accent border-accent text-on-accent`, with the value and a cross), at rest = `border-field text-text` with a caret. This is a transient, removable *criterion* layered over a list you are looking at - closer to a toggle switch. Bold, because a filled pill means "this is live and shaping what is on screen right now", and that should be unmissable at a glance.
- **Inside the picker sheet**, the chosen row is **accent text plus a check, no tint**: a quiet marker, because the sheet is about to close and the pill carries the loud state.

The split tracks a distinction the app already makes on radius (`rounded-control` for anchored controls, `rounded-full` for pills - Outbuild design language section 5): an anchored control you set once stays quiet with an outline; a pill actively narrowing your view earns the bolder fill. Keep the two languages apart - don't reach for fill on a future segmented control, or outline on a future filter pill, without a reason as specific as this one.

### Bottom sheet / confirmation modal
```
Backdrop:  fixed inset-0 flex items-end justify-center z-50, background: var(--overlay-backdrop)
           onClick={close}: tapping the backdrop dismisses the sheet
Sheet:     role="dialog" aria-modal="true" aria-labelledby="{heading-id}"
           onClick={e => e.stopPropagation()}: stops the backdrop's onClick firing
           bg-bg rounded-t-sheet w-full max-w-[430px] px-6 pt-6 pb-10, no shadow
Handle:    w-10 h-1 bg-border rounded-full mx-auto mb-6
Heading:   type-title text-text mb-1, id="{heading-id}" (matches the sheet's aria-labelledby)
Subtext:   type-small text-muted (type-body for the longer Settings delete explanation)
```

These are the confirmation sheets (Scorecard, Summary, Settings, Setup, CourseEdit). `FilterSheet` uses the same shell with `px-page pt-3` and its own row layout (see above).

**Dialog semantics — every bottom sheet, no exceptions (#80).** A confirmation sheet is a real modal dialog, not just a styled panel, and needs the behaviour to match:
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the heading's own `id` — on the sheet element itself, not the backdrop.
- **Autofocus on open** — a `useEffect` keyed on the sheet's open state moves focus onto the sheet's most useful control the moment it mounts: the confirmation text input if the sheet has one (Settings' delete-account sheet, which gates on a typed "DELETE"), otherwise the non-destructive button (Summary's delete-round sheet focuses "Cancel", not "Delete" — a stray Enter keypress should never confirm a destructive action).
- **Escape dismisses** — the same effect adds a `keydown` listener while the sheet is open (removed on cleanup) that closes it on `Escape`, equivalent to tapping the non-destructive action. Skip this while a destructive action is genuinely in flight (Settings' sheet checks its own `deleting` flag) so an in-progress delete can't be abandoned mid-request; a sheet with no async gap doesn't need the guard.
- **Backdrop click dismisses** — `onClick` on the backdrop `div` closes the sheet; the sheet itself carries `onClick={e => e.stopPropagation()}` so a tap inside it doesn't bubble up and immediately close it.
- **Focus returns to the opener on close** - the open effect captures `document.activeElement` before moving focus in and restores it in its cleanup. The focus effect is keyed on the open state only (never on a `deleting`/`finishing` flag, which would re-pull focus mid-action); the Escape listener is a second effect that also depends on that flag and is skipped while an action is in flight.
- **Focus trap (FilterSheet only, so far).** Tab and Shift+Tab wrap inside the sheet, and a Tab with focus outside pulls it back in. The older confirmation sheets below do not trap yet; `FilterSheet` is the reference implementation if they are brought up to it.
- Close logic lives in one named function (`closeDelete`, `closeDeleteConfirm`, etc.) reused by the backdrop click, the Escape handler, and the sheet's own Cancel/dismiss button, so the three paths can never drift apart.

Shipped in `Settings.jsx` (delete-account), `Summary.jsx` (delete-round, moved from History; brought up to parity in #80), `Scorecard.jsx` (Finish/Save sheet), `CourseEdit.jsx` (delete-course sheet), `FilterSheet.jsx` (History's course and player pickers: `rounded-t-sheet`, `px-page`, no shadow, with the focus trap) and `Setup.jsx` (the edit-mode course-switch confirmation, added when BACKLOG #56 was reversed - no async gap, so no in-flight guard needed on the Escape handler). `CourseMapModal.jsx` is a centred modal, not a sheet, but follows the same rules: `role="dialog"`, `aria-labelledby` its course heading, focus on the Close button, Escape and backdrop dismiss, focus returned to the Map control (it reads `onClose` through a ref so a parent re-render never re-grabs focus).

**A card that is tappable and also holds tappable parts** (History rounds) is never a button containing buttons. This is the interactive form of `Card` (see "Card" below): the card is a `div`; the "open this round" action is a real `<button>` stretched behind the content (`absolute inset-0`), the content sits above it with `pointer-events-none`, and each inner control (a player-name toggle with `aria-pressed`) is its own real button with `pointer-events-auto` (the exported `CARD_INNER_CONTROL`).

### Card (`src/components/Card.jsx`)

The shared record-card surface, and the only place `shadow-subtle` is used: `bg-bg-card border border-border rounded-control shadow-subtle p-card`. Used by History's round cards and the Home course card.

- **Static:** `<Card>` is a `div`.
- **Interactive:** `<Card onOpen={fn} openLabel="...">` adds `relative` and the stretched-button pattern above. `openLabel` is the button's whole accessible name (History passes its "Open round: date, players, ..." string; Home passes the course name and subline). Inner controls get `CARD_INNER_CONTROL`; buttons are never nested. `className` is for layout only. `as` changes the root element.
- **Feedback is a border change, not a tint.** Hover gives an accent 1px edge, press adds a 1px accent ring (reads as 2px), keyboard focus is the solid `ring-2 ring-accent`. The stretched button sits behind muted copy, so a tint would put muted text on it, and muted on the 8% tint over `bg-card` is 4.39:1 and on the 15% pressed tint 3.88:1, both below AA (on `bg-card` alone it is 5.02:1). Never add an `accent-tint` fill to a card. Feedback follows the open button (`peer`), so pressing an inner control does not light the whole card.

### History round card

Order, top to bottom: the course name (`type-label-caps text-accent`, hidden when a signed-in user has only one course, as before) with the pending `Tag` at the right; date left and holes right (`type-body text-muted`); one row per player, the name as an `aria-pressed` filter toggle (`type-body text-text`, the same for every player, with the signed-in star and "(DNF)") and the total with its `ParDelta` bracket (`type-body text-muted`, the bracket a 12px Caption, top-aligned beside the total as in the Figma card); the note (`type-small text-muted`, two lines). **There is no "Winner: ..." line and no winner highlight** (CHANGELOG reversal 9): names carry equal weight and the course leads. Summary keeps its winner line. A long name wraps (`min-w-0 break-words`); the total never shrinks.

### Tag (`src/components/Tag.jsx`)

A small status label: `inline-block rounded-full bg-accent-tint px-3 py-1 type-caption text-accent`. Real text, no role, so a screen reader reads it with the card. Used for History's "Not yet saved" and "Can't be saved". Accent on the 8% tint is **8.53:1** over `bg-card` (8.89:1 over `bg`). Never set muted text on it (4.39:1 on `bg-card`). Padding is the implementation's choice: `tokens.json` has no tag dimensions.

### EmptyState (`src/components/EmptyState.jsx`)

A centred block: `title` (`type-title text-text`, a `p` by default, `titleAs` for a heading), optional `body` (`type-body text-muted`, 8px above), and an optional `action` or children (24px above, usually a Button). `role` passes through: History's "could not load" and "signed out" states use `role="alert"`, and a load failure is never shown as an empty state. Used for History "No rounds yet" and the load-failure block. History's no-match state also uses it ("No rounds found", with `role="status"`). Setup's course-area and Courses' dashed boxes are compact inline notices without a title, not `EmptyState`.

### Scorecard table

The live grid (`Scorecard.jsx`) and the read-only table (`Summary.jsx`, which History's detail view reuses) share one look. Only the row height differs.

```
table:  w-full table-fixed border-collapse
cols:   <colgroup> <col class="w-14"> then one bare <col> per player </colgroup>
```

The hole column is a fixed 56px (`w-14`) and the player columns share the rest equally, so one to six players fit at 320px and up with no sideways scroll (Summary lost its `overflow-x-auto` and `min-w-max`). Scores are centred.

**Dense mode.** Five or six players is "dense": `dense = players.length >= 5`. It changes exactly two things, the column headers and the totals. Scores never shrink. Why: at 390px six columns are about 56px wide, and a 14px caps name or `115 (+46)` on one line does not fit that.

| Part | 1 to 4 players | 5 or 6 players (dense) |
|---|---|---|
| Header cells (`th`) | `type-label-caps text-muted`, `h-9` | `type-caption text-muted`, sentence case, `h-9` |
| "Hole" header | `type-label-caps`, left-aligned, `pl-3` | `type-caption`, left-aligned, `pl-3` |
| Player name | `truncate min-w-0` inside a flex span, with the `PlayerStar` (`shrink-0`) after it | same. The full name stays the `th` text, so it is the accessible name |
| Total, Front 9, Back 9 | total and bracket on one line, `55 (+22)`, row `h-11` (44px) | total on one line, bracket below it (`block`), centred, row `h-14` (56px) |

The bracket is always `type-caption` (the `bracket` form of `ParDelta`). It is never shrunk any further.

| Part | Classes |
|---|---|
| Header row | `bg-bg-card border-b border-border`. Live grid: `thead` is `sticky top-0 z-10` |
| Hole column cell (`td`) | `bg-bg-card pl-3 pr-1 text-left whitespace-nowrap`, height from the row (`h-12` live, `h-9` Summary). **No hairline** between it and the scores. The header and totals rows use the same `bg-bg-card`, so the scores sit in a framed field. Row hairlines (`border-b border-border`) stay |
| Hole # + par | hole number `type-strong`, then the par in brackets `type-caption ml-0.5`, e.g. **3** (3). Inactive row: number `text-text`, bracket `text-muted`. Active row: both `text-accent` (muted on the tint is 4.39:1 over the card, below AA) |
| Data rows | `border-b border-border`, `h-12` (48px) live so the whole cell is the tap target, `h-9` (36px) on Summary |
| Active row | `bg-accent-tint` on the `tr`, across the whole row **including the hole column**. The hole `td` paints no fill of its own in the active row (it drops `bg-bg-card`), so the 8% tint shows uniformly. Tint is the only fill there; do not raise it |
| Active cell | `bg-accent text-on-accent` on the `td`, square, the whole cell. Its `ParDelta` is `inverted` (white, the sign carries direction) |
| Score cell (element) | A real `<button type="button">` filling the `td` (`flex items-center justify-center w-full h-12 px-0.5 whitespace-nowrap`, `td` is `p-0`), labelled "Hole N, par P, Player: score" (or "no score yet") with `aria-current="true"` on the active cell, so any hole can be reached and corrected by keyboard or screen reader (#96). The score and its delta stay on one line |
| Focus ring | Inset and solid: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset`, with `focus-visible:ring-accent` on a normal cell and `focus-visible:ring-on-accent` (white) on the accent-filled active cell. The old 40% ring is gone |
| Band rows (Total, Front 9, Back 9) | label in the hole column. Total: `pl-3 pr-1 text-left type-strong text-text`. Front 9 and Back 9: `pl-3 pr-0 text-left type-caption text-text whitespace-nowrap`, so they fit the 56px column on one line (owner call, CHANGELOG 23 November 2026; at Strong size they wrapped onto two). Front 9 and Back 9 rows are `bg-bg-card border-t-2 border-b border-border` |
| Totals bar (live grid) | A flex row under the table, kept in step with its columns: a `w-14 shrink-0 pl-3` label, then one `flex-1 min-w-0` share per player. `bg-bg-card border-t-2 border-border`, `h-11` or `h-14` as above |
| Summary Total row | `tfoot` `sticky bottom-0 z-10`, `bg-bg-card` on each cell (not the row, #66). Height is a minimum, so a `DNF` sub-label can grow it. Winner column text is `text-accent`; the header of a winner is `text-accent` too |
| Empty score | `-` (the live grid uses an en dash) |
| Share image mirror | `share.js` draws its own table (banded rows, no hole-column fill, no dense mode). It mirrors the hole number in `text` bold with the bracket in `muted`, and the `TOTAL` label in `text`. Header labels stay muted caps |

Rows on the live grid are 48px because they are the tap target. The 36px Summary rows are read-only.

**Contrast (computed, WCAG relative luminance).** Muted on the dense Caption header (on `bg-card`) 5.02:1. Accent on the active-row tint 8.89:1 over the page (8.53:1 over the card). Inactive hole number `text` on `bg-card` 15.2:1, its muted bracket 5.02:1. White on the solid active cell 11.2:1. Deltas on the tint over the page: under par 5.10:1, over par 5.52:1. Band labels `text` on `bg-card` 15.2:1. Focus rings: accent on the page 10.2:1, white on accent 11.2:1 (3:1 required).


### Score vs par

The one place the scorecard leaves pencil-and-paper monochrome. Applies to score-vs-par **deltas** only: the live per-hole inline delta, the read-only Summary / History inline delta, and the round total-to-par `41 (+5)`. It does **not** apply to the bracketed par *label* on the hole number — that stays uncoloured.

**Notation** (owned by the shared `formatToPar` helper, repeated here for the visual spec):
- Under par: `-N` (`-1`, `-2`) — rendered in `under-par` `#2C6B3C`.
- Level par: `E` — never `+0` / `-0`. **No colour of its own** — inherits the surrounding text colour.
- Over par: `+N` (`+1`, `+5`) — always a leading `+` — rendered in `over-par` `#9B3A24`.
- Hole not yet scored: nothing shown. No placeholder, no `E`.

**Per-hole indicator (grid + Summary + share).** An inline Caption delta on the same line as the score digit, after a small gap: `9 +6`. `type-caption` (12px, medium, tracking 0.2px), rendered by the shared `ParDelta` component. It is no longer a raised superscript (redesign decision 8). The digit stays the workhorse and the delta annotates it. The bracket form is not used in the grid, because up to six player columns share a row and `3 (+1)` will not fit. The delta sits on the score's line (`whitespace-nowrap`), never below it, and a level `E` takes the surrounding text colour.

**Round total-to-par (totals bar, Summary totals row, finish dialog, share).** In brackets, on the total's own line: `41 (+5)`, also `type-caption` (the bracket form of `ParDelta`, used in History and every totals row). Not superscript. `DNF` stays as the sub-label beneath where it applies. The bracket's digits and sign take the semantic colour; the surrounding total stays `text` / `accent` as today. Before a player has scored, the bracket is omitted entirely. Summary and History used to also show an `Av. X` (average strokes) sub-line here — dropped (#70, flagged as not interesting): the bracket already carries the same total-to-par information the average line duplicated.
- The share image is hand-drawn and sizes its own bracket to match the total.
- The live Scorecard totals bar uses the same Caption bracket as every other surface; there is no size exception anywhere, so the bracket is never shrunk. With one to four players the bracket sits on the total's line (`55 (+22)`, 44px row). With five or six (dense mode, see "Scorecard table") it sits below the total, centred, in a 56px row.

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
sticky top-0 z-50 bg-accent text-on-accent text-center type-small py-2 px-4
```
Used for the app-level storage-blocked notice (`role="alert"`) and Home's email-link notice (`role="status"`).

**Load-failure states.** When a list or selector cannot load, show that, never an empty state. History uses `EmptyState` (title, sentence, a button: **Try again**, or **Sign in** for a 401) with `role="alert"`; Setup's course area uses the dashed empty-state box with the same wording and a small outline button. An empty state ("No rounds yet", "No courses yet") is only for a load that succeeded and returned nothing.

**Announce messages.** An error banner or inline error line carries `role="alert"`; a neutral confirmation ("Saved.", "Check the new inbox...") carries `role="status"`. Neither is put on a per-second countdown (e.g. "Resend in 29s") - that would be read out every tick.

### Outbuild attribution mark
Footer of home screen only.
```
Scorecard         type-strong text-text
 by               type-small text-muted
Outbuild ↗        type-small text-muted underline underline-offset-2
                  links to https://outbuild.uk, target="_blank"
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
`border-radius: 4px`, uppercase, `letter-spacing: 0.1em`, `font-weight: 600`, `font-size: 13px`. Background `#1A4329`, text `#F7F4EE`.

**Known, deliberate difference from the app.** The email was not part of the November 2026 redesign. The app's buttons are now 6px radius, sentence case and white on green, and its cards are 6px; the email still uses the older 4px button, 8px card, uppercase label and cream button text. It was left as it was and its HTML was not changed. The difference is a choice about scope, not an email-client limit (border-radius and uppercase are widely supported), so aligning it is an owner call for later.

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
`functions/_lib/email.js`, `magicLinkEmailHtml()`. The account-deletion notification in `functions/api/users/index.js` carries the same card and wordmark styles.

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

**Back button labels.** Every back affordance names its real destination or action, never a generic "Back". `PageHeader`'s `backLabel` takes the **plain** destination text ("Home", "Rounds", "History"); the chevron is drawn by the header, so no arrow is typed into the string. `backLabel` is also the button's accessible name. A button that steps back through history is labelled with the destination screen, context-aware where the destination varies (Info, Privacy, Rules, Setup each pick their label from where they were opened). A **header** button that performs an action other than stepping back turns the chevron off with `backChevron={false}`. The live Scorecard's **"Pause"** is the one case: it leaves the round in storage to resume, so it reappears as "Resume game" on Home. It has no chevron, because it is an action, not a step back. (Scorecard in edit mode steps back to History and keeps the chevron.) CourseEdit's recovery-panel "Back to Home" also says what it does.

The one deliberate exception is a **foot-of-page wayfinding link**: the Bruntsfield course page has no header back button, but a discreet "Golf Scorecard home" text link sits at the very foot of its action list (below the sign-in prompt). It is page content, not a `PageHeader` button, but it uses the same chevron icon as the header back button (no typed arrow), because it reads as "up to the parent screen". It is an explicit `navigate('home')` (not `goBack()`), so it always lands on Home. Home itself carries no in-app back button (it is the app root). **"Course" replaces "Bruntsfield"** as the destination word wherever a header button needs to name it; see "Never truncate a header button" under Page header.

**Back-label length.** Every back label follows "Page header, Back-label length": a plain destination word, two at most. CourseEdit is reached only from Settings > My courses, so it has a single label, "Courses", and Save, Back and a successful delete all return there. The earlier Setup-dependent labels ("Edit Round", "New Game", "Past round") no longer exist.

**One back button, one header.** Every back affordance is the shared `PageHeader` back button (one definition, one set of classes, see "Back button" under Page header). Summary composes `PageHeader` and passes its conditional Edit or Done control through the `right` prop. Login uses `<PageHeader bare .../>` on both of its screens (see "Bare variant"). No hand-rolled header back buttons remain, so a header change is made once, in `PageHeader.jsx`. The one non-header back link is the Bruntsfield page's foot link, described above.

---

## Icons

Inline SVGs throughout — no icon library dependency.
- Stroke-based, `strokeLinecap="round" strokeLinejoin="round"`
- Standard `strokeWidth`: `1.5` (general UI), `2` (close/X), `2.5` (advance chevron)
- Sizes: `w-2.5 h-2.5` (external link ↗), `w-4 h-4` (close ✕), `w-6 h-6` (map, chevron)

**Signed-in identity star (`src/components/PlayerStar.jsx`)** — a small star badge trailing a player's name wherever players are listed (live Scorecard, Summary, History player rows, the applied player pill and the player picker) when that name matches the signed-in user's own `users.name`. Stroke-based like the rest of the set, `w-2.5 h-2.5` — the same size tier as the external-link ↗ annotation, since the role is identical (a small glyph beside text, not a standalone control). Deliberately carries no colour of its own — it renders in `currentColor` and inherits whatever colour its surrounding name already has (muted header, accent winner name, on-accent applied pill), so it never introduces a competing colour rule or implies the signed-in player outranks guests in the round. Never shown on the share image — that's a static export for a recipient who may not be signed in.

---

## Consistency check - Outbuild principles

### Aligned
- Brand colour (forest green) handles all decorative and interactive roles
- Score-vs-par (`under-par`, `over-par`) is the single deliberate exception to the one-colour rule: two accents, fenced to vs-par **deltas only**, never touching chrome or interaction, within the Outbuild "no more than two accents in precisely defined contexts" allowance. It is a context-rooted decision: golfers read a card in green/level/red
- Two typographic registers (editorial Cormorant Garamond for Display and Title, Inter for everything else) in eight type styles; only Label caps is uppercase; buttons and navigation are sentence case
- Flatness: one shadow (`shadow-subtle`), on record cards only. Buttons, sheets, inputs and the header are flat
- One 6px control radius (`rounded-control`) for buttons, fields and cards; `rounded-t-sheet` for sheets; `rounded-full` only for circular game controls, pills, tags and the filled header action
- One page margin (`px-page`, 16px) on every screen
- Disabled states, focus rings and error edges all come from tokens (`disabled-surface`, `disabled-text`, solid `ring-accent`, `border-error`); `opacity-25` survives only on the circular game controls
- Phone-frame desktop wrapper correctly implemented per Outbuild mobile-only pattern
- Caveat font used exclusively in the desktop wrapper note, never inside the app
- Outbuild attribution mark present on the home screen, links to outbuild.uk
- Warm, earthy palette, not clinical or tech-forward
- One primary action per screen throughout
- No icon library; no decorative illustration; no gradient backgrounds
- Guard tests keep it this way: `type-guard.test.js` (type classes), `control-guard.test.js` (radius, shadow, ring, opacity, page padding, hard-coded colour) and `tokens.test.js` (token values and contrast)

### Divergences

**Known gap, accepted.** Non-field controls draw their edge in a decorative colour rather than a 3:1 one: the inactive 9/18 option and the par stepper cells use `border-border` (1.39:1). Their text labels carry the affordance (`text` / `muted`, 4.5:1 or better), so a golfer can still find and read them, but the boundary itself is below 3:1. Revisit as its own decision. Secondary buttons use `border-accent`, which clears 3:1.

**Email.** The magic-link email still uses the older 4px button radius, 8px card radius and uppercase button label (see "Email design"). Deliberate, not yet aligned.

**No other outstanding divergences.**
