import { formatToPar } from '../utils/scores.js'

// Score-vs-par delta, rendered to the DESIGN.md "Score vs par" spec.
// One component for every in-app surface so the notation, size and the
// semantic-colour override rule can never drift between the live grid, the
// read-only Summary / History table and the totals rows.
//
// Colour (DESIGN.md override rule):
//   under par  → `under-par`   green
//   over par   → `over-par`    terracotta
//   level (E)  → no colour of its own; inherits the surrounding text colour
//   `inverted` → the delta sits inside a filled cell (the live active cell,
//                white-on-accent) where the semantic colours fail contrast:
//                it takes the cell's inverted text colour and the leading
//                +/- sign carries the direction. A winner's accent-green
//                column is NOT inverted — deltas there stay semantic.
//
// Both variants are Caption (12px, medium) via `type-caption`, never a
// superscript (redesign decision 8, plan 5f).
// variant:
//   'inline'  — beside a score in a grid cell, same line, small gap: `9 +6`
//   'bracket' — in brackets on a total's line: `55 (+22)`
// className is appended to the rendered span.
export default function ParDelta({ delta, variant = 'inline', inverted = false, className = '' }) {
  const label = formatToPar(delta)
  if (!label) return null

  const semantic =
    inverted || delta === 0
      ? ''
      : delta < 0
        ? 'text-under-par'
        : 'text-over-par'

  if (variant === 'bracket') {
    return <span className={['type-caption', semantic, className].join(' ')}> ({label})</span>
  }

  return (
    <span className={['type-caption ml-1', semantic, className].join(' ')}>
      {label}
    </span>
  )
}
