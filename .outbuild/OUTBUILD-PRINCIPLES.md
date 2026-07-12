# Outbuild Design Principles
Last updated: 12 July 2026
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

## Microcopy - write for a specific person in a specific context

Never use generic functional labels if a more specific, human alternative exists. UI copy should sound like someone who cares about this product and knows its context wrote it - not like a form template.

Ask before writing any copy:
- Who is using this, and where are they when they use it?
- What are they actually doing at this moment?
- What would a knowledgeable, friendly person say here - not what would a system prompt say?

Examples of the difference:
- "Submit" vs "Start the round"
- "History" vs "Past rounds"
- "Error: invalid input" vs "That does not look right - try again"
- "No data available" vs "No rounds saved yet - start a new game to begin"

Rules:
- Avoid words like Submit, Confirm, Proceed, Enter, Manage - these are system words not human words
- Empty states should never say "No [thing] found" - they should acknowledge the context and suggest a next step
- Error messages should explain what went wrong in plain English and say what to do next
- Button labels should describe the outcome, not the action - "Save round" not "Save", "See full scorecard" not "View details"
- If a label could belong to any app, it is not specific enough

This applies to every piece of visible text the user reads - buttons, labels, empty states, error messages, headings, helper text, and placeholders.

---

## Products rooted in a physical context

Some Outbuild products are digital replicas of physical objects or are designed to be used in a specific physical environment. In these cases, borrowing from that environment's visual language is not a violation of the Outbuild principles - it is an expression of them.

The core principle is: the product should feel like it belongs where it is used.

Examples of what this permits:
- A golf scorecard app borrowing the tactile, printed aesthetic of a paper scorecard - texture, sharp corners, left-aligned type, heritage typography
- A bothy planning app borrowing the utilitarian, functional aesthetic of an OS map or a mountain rescue notice
- A race spectator tool borrowing the energy and colour of physical race signage

When a product has a strong physical context, the design-director should:
- Identify the physical object or environment the product most closely relates to
- Extract the visual principles of that object or environment - not copy it literally, but borrow its spirit
- Document this as a project-specific design direction in DESIGN.md
- Flag explicitly that this is a deliberate context-rooted decision, not a deviation from Outbuild principles

What this does not permit:
- Decorative textures or historical references that have no connection to the product's actual context
- Borrowing a physical aesthetic purely for trend reasons
- Abandoning the core Outbuild principles of restraint, clarity, and doing less better - the physical context adds character, it does not override the fundamentals

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
