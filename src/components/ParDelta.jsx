import { formatToPar } from '../utils/scores.js'

// Score-vs-par delta, rendered to the DESIGN.md "Score vs par" spec (§5.3).
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
// variant:
//   'superscript' — trails a score digit in a grid cell (#38)
//   'bracket'     — full size, in brackets, on a total's line: `(+5)` (#52)
// className is appended to the rendered span — used to size the bracket down
// on space-constrained surfaces (the live totals bar drops it to text-sm so
// `41 (+5)` doesn't wrap at six players — a documented DESIGN.md exception).
export default function ParDelta({ delta, variant = 'superscript', inverted = false, className = '' }) {
  const label = formatToPar(delta)
  if (!label) return null

  const semantic =
    inverted || delta === 0
      ? ''
      : delta < 0
        ? 'text-under-par'
        : 'text-over-par'

  if (variant === 'bracket') {
    return <span className={[semantic, className].join(' ')}> ({label})</span>
  }

  return (
    <span className={['font-ui text-[0.6em] align-super font-normal ml-[1px]', semantic, className].join(' ')}>
      {label}
    </span>
  )
}
