import { forwardRef } from 'react'

// The record-card surface (Figma Card; History round cards and the Home course
// card). Flat cream surface, hairline edge, the one soft card shadow.
//
// Two forms, one API:
//
//   Static:       <Card>...</Card>
//   Interactive:  <Card onOpen={open} openLabel="Open round: 22 Nov, Will, Kate">...</Card>
//
// Interactive form. The card is never a button containing buttons. The card is
// a div; the "open" action is a real <button type="button"> stretched behind
// the content (absolute inset-0), and the content sits above it with
// pointer-events-none so taps fall through to the open button. Any control
// inside the content (a player-name toggle, say) is its own real button and
// must opt back in with `pointer-events-auto`: use CARD_INNER_CONTROL so the
// convention has one name. With no inner controls (the Home course card) the
// same form simply gives one tappable card.
//
// `openLabel` is the open button's accessible name (required with onOpen: the
// button has no text of its own, because the content is a sibling, not a child).
//
// Hover and press feedback: a border change, deliberately NOT a tint. The open
// button sits behind the content, so any fill on it would sit under the card's
// muted text, and muted on the 8% accent tint over bg-card is 4.39:1 (3.88:1 on
// the 15% hover tint), both below AA 4.5:1. The edge is drawn by a decorative
// span that reads the open button's state through `peer`, so pressing an inner
// button never lights the card. Hover: accent edge. Press: accent edge plus a
// 1px ring (2px line). Keyboard focus: solid 2px accent ring on the button.
//
// className is for layout only (mt-3, w-full). Never restyle the surface.

// Add to any control placed inside an interactive Card's content.
export const CARD_INNER_CONTROL = 'pointer-events-auto'

const SURFACE = 'bg-bg-card border border-border rounded-control shadow-subtle p-card'

const OPEN_BUTTON =
  'peer absolute inset-0 w-full h-full rounded-control ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

const EDGE =
  'pointer-events-none absolute -inset-px rounded-control border border-transparent ' +
  'peer-hover:border-accent peer-active:border-accent peer-active:ring-1 peer-active:ring-accent'

const Card = forwardRef(function Card(
  { as: Tag = 'div', onOpen, openLabel, className = '', children, ...rest },
  ref,
) {
  const interactive = typeof onOpen === 'function'
  const classes = [SURFACE, interactive ? 'relative' : '', className].filter(Boolean).join(' ')

  if (!interactive) {
    return (
      <Tag ref={ref} className={classes} {...rest}>
        {children}
      </Tag>
    )
  }

  return (
    <Tag ref={ref} className={classes} {...rest}>
      <button type="button" onClick={onOpen} aria-label={openLabel} className={OPEN_BUTTON} />
      <span aria-hidden="true" className={EDGE} />
      <div className="relative pointer-events-none text-left">{children}</div>
    </Tag>
  )
})

export default Card
