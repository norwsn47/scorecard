import { subtotal } from '../utils/scores.js'
import ParDelta from './ParDelta.jsx'

// Pieces shared by the live score grid (Scorecard.jsx) and the read-only table
// (Summary.jsx, which History's detail view reuses), so the two can never
// drift apart (DESIGN.md "Scorecard table").

// Dense mode (DESIGN.md "Scorecard table"): with 5 or 6 players the column headers drop from Label
// caps to Caption, and a total stacks its bracket below it, so the band rows
// grow from 44px to 56px.
export function tableDensity(playerCount) {
  const dense = playerCount >= 5
  return {
    dense,
    headCls: dense ? 'type-caption' : 'type-label-caps',
    bandRowCls: dense ? 'h-14' : 'h-11',
    bracketCls: dense ? 'block' : '',
  }
}

// A Front 9 or Back 9 band row: the card surface and heavier borders mark it
// as a break, not another hole. The label is Caption with whitespace-nowrap
// (owner call, 23 November 2026): at Caption size "Front 9" fits the 56px hole
// column on one line, where the Strong size wrapped onto two. Each half's
// total counts only the scored holes in that half. `empty` is the glyph for a
// half with nothing scored (an en dash on the live grid, a hyphen on Summary).
export function SubtotalRow({ label, from, to, players, scores, holePars, density, empty = '-' }) {
  return (
    <tr className="border-t-2 border-b border-border bg-bg-card">
      <th scope="row" className={`${density.bandRowCls} pl-3 pr-0 text-left type-caption text-text whitespace-nowrap`}>
        {label}
      </th>
      {players.map(player => {
        const { total, toPar } = subtotal(scores?.[player] ?? [], holePars, from, to)
        return (
          <td key={player} className={`${density.bandRowCls} px-0.5 text-center type-strong text-text whitespace-nowrap`}>
            {total ?? empty}
            <ParDelta delta={toPar} variant="bracket" className={density.bracketCls} />
          </td>
        )
      })}
    </tr>
  )
}
