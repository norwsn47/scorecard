# Design
## Scorecard by Outbuild — Bruntsfield Links

Last updated: 12 July 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.

---

## Overview

Mobile-only scorecard app. Cream/warm ivory background with a single forest green brand colour. Two typographic registers: Cormorant Garamond italic for editorial moments, Inter for all UI labels and data. Outbuild design language throughout — warm, restrained, purposeful.

**Design philosophy (Home screen):** "A simple digital replica of the paper scorecard used for hundreds of years, designed to keep your focus on the game, not the screen." The Home screen breaks digital symmetry intentionally — left-aligned title, subtitle, and value propositions create a structured printed-document feel, not a centred app layout.

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
| `accent` | `--color-accent` | `#1A4329` | Brand colour — deep historic Scottish green; all interactive highlights |
| `accent-hover` | `--color-accent-hover` | `#142f1e` | Accent on press |
| `border` | `--color-border` | `#D9D0C4` | All borders — warm light |
| `chrome` | `--color-chrome` | `#C0B8B0` | Inactive chrome — disabled icons, borders |
| `control-warm` | `--color-control-warm` | `#9A9189` | Warm grey fill — advance button background |
| *(desktop only)* | — | `#E8E2D6` | Background behind phone frame on desktop |

### Overlays and inline transparent values

| Name | Value | Role |
|---|---|---|
| `--overlay-modal` | `rgba(26,26,24,0.55)` | Full modal backdrop |
| `--overlay-backdrop` | `rgba(26,26,24,0.4)` | Bottom sheet backdrop |
| Active row tint | `rgba(26,67,41,0.05)` | Scorecard active row background |
| Focus ring | `rgba(26,67,41,0.4)` | Input focus ring |

---

## Typography

Two registers. The display font is used once, deliberately, for a specific editorial purpose. Inter handles everything else.

| Font | Token | Usage |
|---|---|---|
| `Cormorant Garamond` | `--font-display` | Editorial: app name, page titles, player names on Podium |
| `Inter` | `--font-ui` | All UI: buttons, labels, table cells, inputs, body text |
| `Caveat` | *(no token)* | Desktop wrapper note only — never inside the app |

### Editorial register — Cormorant Garamond italic

| Context | Classes |
|---|---|
| App name (Home) | `font-display text-5xl italic text-text` |
| Page header title | `font-display text-2xl italic text-text` |
| Section heading (Podium) | `font-display text-4xl italic text-text` |
| Player names (Podium) | `font-display text-2xl italic` |
| Logo lockup (Podium header) | `font-display text-lg italic text-text` |

**Home screen alignment exception:** The `h1` title and subtitle on the Home screen are left-aligned (`text-left`). This is a deliberate departure from centred editorial screens (Podium, page headers). The Home screen follows a printed-document convention.

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
| Error / banner | `font-ui text-xs tracking-wide` |
| Ordinal rank (Podium) | `font-ui text-xs tracking-widest uppercase` |

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
| `8px` | `rounded-md` | All other interactive controls: inputs, cards, Podium rows |
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
- Heritage footer: left-aligned

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
relative flex items-center px-5 pt-12 pb-6 border-b border-border shrink-0
```
- Title: `absolute inset-x-0 text-center font-display italic text-2xl text-text pointer-events-none`
- Back: `py-2 text-muted font-ui text-sm tracking-[0.08em] uppercase` — ← prefix, no button chrome
- Right slot: optional, used for Finish button

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
| Empty score | `—` (em dash) |

### Podium result cards
| State | Classes |
|---|---|
| 1st place | `bg-accent border-accent rounded-md border px-5 py-4` — text inverts to bg colour |
| 2nd+ place | `bg-bg-card border-border rounded-md border px-5 py-4` |
| DNF | `bg-bg-card border-border rounded-md border px-5 py-4 opacity-40` |

### Accent divider rule
```
w-10 h-0.5 bg-accent mx-auto
```
Used to separate major sections on editorial screens (Home, Podium). Not used on utility screens.
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

### Heritage footer (Home screen only)
```
font-display italic text-[11px] text-muted opacity-70 text-left pb-3
```
Text: "Bruntsfield Links, Edinburgh · Golf played here since 1456"
- Uses existing `font-display` (Cormorant Garamond italic)
- `text-[11px]` — deliberately smaller than any standard text step
- `text-muted` + `opacity-70` — an inscription, not a UI element
- Left-aligned, no interactive behaviour

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
- Wordmark: `font-family: Georgia, serif` — "Scorecard" in muted (`#6B6560`), "Club" in accent (`#1A4329`); `font-size: 11px`, uppercase, `letter-spacing: 0.12em`
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

State-machine router in `App.jsx` — no URL routing.

```
home → setup → scorecard → podium → summary
home → history
home → courseinfo
scorecard → courseinfo (modal, via CourseMapModal)
```

`navigate(to, params)` passed as prop to every page. Back buttons call `navigate('home')` or the appropriate parent.

---

## Icons

Inline SVGs throughout — no icon library dependency.
- Stroke-based, `strokeLinecap="round" strokeLinejoin="round"`
- Standard `strokeWidth`: `1.5` (general UI), `2` (close/X), `2.5` (advance chevron)
- Sizes: `w-2.5 h-2.5` (external link ↗), `w-4 h-4` (close ✕), `w-6 h-6` (map, chevron)

---

## Consistency check — Outbuild principles

### Aligned ✓
- Single brand colour (forest green) handles all decorative and interactive roles
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

**4. Podium screen uses a bespoke header instead of PageHeader**
All other screens use the shared `PageHeader` component. Podium has a custom inline header. Low priority — but worth standardising if Podium header ever needs updating.
