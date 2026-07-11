# Outbuild Design Language
Last updated: 4 July 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.
*Transferable principles extracted from the Outbuild product suite. No specific colours, sizes, or component values — the spirit, not the spec. Feed this into the design-director agent alongside project references at step 2.4.*

---

## 1. Typography earns its character from weight and spacing, not from typeface

Use the platform system font stack as the default — SF Pro on Apple, Segoe UI on Windows. It is fast, native, and legible without loading anything. Do not reach for a branded typeface to give the product personality. Personality comes from how the type is set: weight contrast, tracking, and scale hierarchy.

If a project calls for a second typeface, use it once, deliberately, for a specific purpose. Not as a general personality layer.

**In practice:** Four weights maximum. The primary contrast is between regular and semibold. Bold is reserved for the single most important text on any given screen. Tracking is negative at large sizes, expanded at micro sizes — never arbitrary.

---

## 2. Two typographic registers, not one continuous scale

Every screen operates across two registers: a micro layer for UI labels and annotations (small, uppercase, tracked, muted) and an editorial layer for headings and primary content (larger, tight-tracked, weight-driven). Body copy sits between them as the workhorse.

These registers should feel distinct. The micro layer reads as annotation — it orientates and labels. The editorial layer carries meaning and hierarchy. Mixing them produces visual noise.

**In practice:** Micro labels are uppercase, tracked, and muted in colour. They do not compete with headings. Headings do not use display fonts — scale and weight do the work.

---

## 3. A limited palette with one brand colour doing all the work

One brand colour handles all decorative and interactive work — buttons, active states, highlights, accents. It does not need help from a second colour to feel complete.

If accent colours exist beyond the brand colour, they appear sparingly and with specific purpose — no more than two, used in precisely defined contexts. The rest of the palette is neutral: warm whites, warm greys, warm borders. Nothing loud.

**In practice:** Aim for around ten conceptual colour roles regardless of how many tokens you end up with: background, surface, border, primary text, muted text, brand, brand tint, and one or two accents. The palette should feel warm and grounded, not clinical or tech-forward.

---

## 4. Flatness is a principle, not a limitation

Static content surfaces carry no shadow. Shadow is reserved for elements that are genuinely floating above the surface — panels, modals, chips over a map. When something has a shadow, it means something: it is above the page flow. When everything has a shadow, nothing does.

This keeps the visual hierarchy honest. The content carries the weight, not the chrome.

**In practice:** Before adding a shadow, ask whether this element is actually floating above the page. If it is part of the page flow, no shadow. If it overlays content, shadow proportional to its perceived height.

---

## 5. Two radius families — purposeful controls and floating labels

Interactive controls (buttons, inputs, dropdowns) use a squarish radius — substantial enough to feel modern, restrained enough to feel purposeful. Chips, tags, and pill badges use a full radius — they float and label rather than anchor.

Never use a single radius value for everything. And never use a very large radius on a large element — it reads as a stylistic choice rather than a design decision.

**In practice:** Two values cover most needs: a control radius (moderate, squarish) and a pill radius (full). Panels and modals sit between them — rounded enough to feel lifted, not so rounded they feel playful.

---

## 6. Whitespace is structural, not decorative

Whitespace separates layers and establishes hierarchy — it is not filler between content. Nothing should feel crowded, but there should be no large decorative blank zones either. Every gap is doing something: separating sections, breathing room for reading copy, grouping related elements.

The amount of whitespace scales with the warmth of the context. UI controls are tight. Reading copy is generous. Headings sit between.

**In practice:** Establish a base unit early (4px or 8px) and build the spacing scale from it. Most decisions should fall on the scale. When they don't, question whether the exception is necessary.

---

## 7. Transparency signals height, not aesthetics

Frosted glass and semi-transparency are used only on elements that genuinely float above other content — panels over a map, bottom sheets, filter chips over a background. On static surfaces, everything is opaque.

This gives transparency a consistent meaning: if something is translucent, it is above the page. If it is opaque, it is in the page. Blur and transparency as a general aesthetic choice erodes that signal.

**In practice:** Before adding backdrop blur or opacity to a surface, confirm it is overlaying content. If it is in the page flow, make it opaque.

---

## 8. One primary action per screen

Every screen should have one obvious thing to do. Secondary actions exist but are visually subordinate — they do not compete with the primary action for attention. If two actions feel equally important, the information architecture probably needs rethinking, not the button styles.

Navigation should be minimal. Dense tab bars, sidebars, and multi-level menus are signs that the product is trying to do too much. If the navigation is complex, the product is complex.

**In practice:** One breakpoint handles the full layout shift from mobile to desktop where possible. Simplicity over flexibility. Phone-first, then adapted for desktop — not the other way around.

---

## 9. The product does not compete with its content

The UI is a frame for content, not a statement in itself. When the content is a map, the UI floats politely over it. When the content is words, the typography carries the experience. The chrome — navigation, controls, status — should be present when needed and quiet when not.

This means minimal decoration on surfaces, restrained use of colour in the UI itself, and a general assumption that less chrome is better.

**In practice:** Before adding a UI element, ask whether the user needs it right now or whether it could appear on demand. If it can wait, make it wait.

---

## What Outbuild products are not

- Not a card wall — content lives in lists, panels, and open page space, not a grid of white cards
- Not a display type showcase — no expressive headline fonts; weight and tracking do the work
- Not gradient-heavy — gradients only as UX signals (scroll overflow, text truncation), never decorative
- Not dense — minimal navigation, one primary action per screen, no competing hierarchies
- Not a tech aesthetic — warm, grounded, earthy rather than clinical, blue-tinted, or corporate
- Not multi-breakpoint responsive — one breakpoint handles the full shift; simplicity over flexibility

