# Outbuild Design Principles
Last updated: 4 July 2026
> Whenever you edit this file, update the "Last updated:" date above to today's date before saving.
*To be fed into the design-director agent alongside project references at step 2.4*

---

## Philosophy

**Do less, better.**

Most products try to do everything. Outbuild products do one thing — properly. Every design decision should reflect that restraint. If something doesn't need to be there, it isn't. If a feature needs explaining, it probably needs removing.

Start with the problem, not the product. Take away everything that isn't the answer.

---

## Design principles — non-negotiable

**Restraint over richness**
Strip back to what matters. No decorative elements that don't carry meaning. No feature added because it was possible. Every component earns its place. Fewer things, done properly.

**Clarity over cleverness**
The interface should be immediately understandable to someone who has never seen it. No onboarding needed. No tooltips explaining what a button does. If it needs explaining, simplify it.

**Human first, device second**
Designed for how people actually behave — outside, on a phone, one hand occupied, glancing not studying. Interactions should be forgiving, not precise. Information should be scannable, not read.

**Purposeful, not decorative**
Typography, spacing, and layout are tools for communicating hierarchy and meaning — not for making things look designed. Whitespace is not empty space. It's breathing room.

**Honest and direct**
No marketing language in the UI. No "Unleash your potential." Tell the user what a thing does, simply. Labels are descriptions, not calls to action dressed up as features.

**Small and specific, not broad and general**
This is a product that solves one real problem. The UI should feel like it was made for exactly this purpose — not adapted from a template. Avoid generic patterns that could belong to any app.

---

## Tone and feel

The aesthetic comes from the context Outbuild products live in — outdoors, active, Scotland. That doesn't mean hiking fonts and green palettes. It means:

- **Uncluttered** — like a good map. Everything you need, nothing you don't.
- **Considered** — like good outdoor kit. Functional but well-made. No unnecessary detail.
- **Confident** — not loud. Quiet conviction. It doesn't need to shout.
- **Grounded** — real, not aspirational. For people doing things, not imagining doing things.

---

## What to avoid

- Anything that feels like a SaaS dashboard — metrics, gradients, busy sidebars
- Generic Tailwind defaults — rounded-xl, shadow-lg, blue primary buttons
- Decorative illustration or stock imagery
- Micro-animations for their own sake
- Dark mode as a style choice rather than a user need
- Landing page energy in product UI — hero sections, feature grids, testimonial carousels
- Anything that would feel out of place shown to someone standing on a hill

---

## How to use this

When the design-director agent is invoked at step 2.4, feed this file alongside your reference screenshots and the project PRD. The design-director should use these principles to:

1. Evaluate which visual directions from your references align with the Outbuild philosophy
2. Make decisions that aren't in the references — spacing scale, typographic hierarchy, interaction patterns — based on these principles
3. Flag anything in the references that contradicts the principles, and propose an alternative

The colour palette, typeface, and specific tokens will vary per project. These principles do not.

---

## Mobile-only apps — desktop wrapper pattern

When a project is built specifically for mobile use, it must never render a stretched desktop layout. Instead, on desktop it displays a phone mockup containing the app at mobile dimensions, with a handwritten note beside it.

**The pattern:**
- The app always renders at mobile dimensions (max ~390px wide) regardless of screen size
- The phone frame: rounded rectangle, substantial dark border (around 6px, near-black like #1c1c1e) with a border-radius of about 44px and a soft shadow — a solid outline, not a photorealistic device
- **The frame must always fit comfortably within the viewport — minimum 40px padding on all sides. It never clips, never overflows, never touches the edges.** If the app content is taller than the available height, the frame scrolls internally. If the viewport is too small, the wrapper drops away and the app renders full-width.
- Desktop background behind the frame: warm neutral (not white, not black, not the app's own background colour)
- To the side of the frame, a handwritten note in **Caveat** font (Google Fonts, weight 500)
- The app content itself is completely unaware of the wrapper — it renders as if it's always on a phone

**Caveat font** is the single consistent Outbuild choice for all handwritten moments across every app. It is only ever used for this desktop wrapper note. Never used inside the app itself.

**How it gets applied:**
- The PRD or DESIGN.md will include a flag: `Mobile only: true`
- The frontend-developer reads this flag and implements the wrapper automatically — no need to ask
- The code-reviewer checks for it: if the PRD says mobile-only and the wrapper is missing on desktop, that is a Critical finding

Every app built under the Outbuild name must include an attribution mark on the home or landing screen. This is not optional and must not be removed or hidden.

**The mark:**
- App name in heavy weight, followed by "by Outbuild" in a lighter weight and muted colour
- "by Outbuild" must link to https://outbuild.uk — opens in a new tab
- An external link indicator (↗ or equivalent) beside the link is correct
- Position: visible on the home/landing screen — typically header or footer
- Style: subtle but present. It should not compete with the app's primary content, but it must be legible and clickable

**What it looks like:**
```
[App name]  by Outbuild ↗
```
Heavy/bold for the app name. Regular weight, muted colour for "by Outbuild ↗". Same baseline. No decoration.

**The frontend-developer agent has this rule baked in** — it will include the mark without being asked. If it is ever missing from a build, that is a code-reviewer finding.
