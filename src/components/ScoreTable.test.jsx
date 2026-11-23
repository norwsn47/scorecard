import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SubtotalRow, tableDensity } from './ScoreTable.jsx'

describe('tableDensity', () => {
  it('uses Label caps headers and 44px bands for up to four players', () => {
    expect(tableDensity(4)).toEqual({ dense: false, headCls: 'type-label-caps', bandRowCls: 'h-11', bracketCls: '' })
  })
  it('switches to Caption headers, 56px bands and a stacked bracket at five or six', () => {
    expect(tableDensity(5)).toEqual({ dense: true, headCls: 'type-caption', bandRowCls: 'h-14', bracketCls: 'block' })
  })
})

describe('SubtotalRow', () => {
  const pars = Array(18).fill(3)
  const scores = { Ann: [...Array(9).fill(4), ...Array(9).fill(null)], Bo: Array(18).fill(null) }
  const renderRow = props => render(
    <table><tbody>
      <SubtotalRow label="Front 9" from={0} to={9} players={['Ann', 'Bo']} scores={scores} holePars={pars} density={tableDensity(2)} {...props} />
    </tbody></table>,
  )

  it('labels the row as a row header in Caption and totals each half per player', () => {
    renderRow()
    const header = screen.getByRole('rowheader', { name: 'Front 9' })
    expect(header).toHaveClass('type-caption', 'h-11', 'whitespace-nowrap')
    const row = header.closest('tr')
    expect(within(row).getAllByRole('cell')[0]).toHaveTextContent('36 (+9)')
  })

  it('shows the empty glyph for a half with nothing scored', () => {
    renderRow({ label: 'Back 9', from: 9, to: 18, empty: '–' })
    const cells = within(screen.getByRole('rowheader', { name: 'Back 9' }).closest('tr')).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('–')
    expect(cells[1]).toHaveTextContent('–')
  })
})
