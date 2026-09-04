import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ParDelta from './ParDelta.jsx'

// The one renderer for every score-vs-par delta (§5.3). These lock the
// notation and the semantic-colour override rule so they can't drift.
describe('ParDelta', () => {
  it('renders nothing for an unscored hole (null / undefined delta)', () => {
    const { container } = render(<ParDelta delta={null} />)
    expect(container).toBeEmptyDOMElement()
    const { container: c2 } = render(<ParDelta delta={undefined} />)
    expect(c2).toBeEmptyDOMElement()
  })

  it('shows E for level par, with no semantic colour class', () => {
    render(<ParDelta delta={0} />)
    const el = screen.getByText('E')
    expect(el).not.toHaveClass('text-under-par')
    expect(el).not.toHaveClass('text-over-par')
  })

  it('shows +N in over-par colour and -N in under-par colour', () => {
    render(<ParDelta delta={2} />)
    expect(screen.getByText('+2')).toHaveClass('text-over-par')

    render(<ParDelta delta={-1} />)
    expect(screen.getByText('-1')).toHaveClass('text-under-par')
  })

  it('drops the semantic colour when inverted (inside the filled active cell)', () => {
    render(<ParDelta delta={2} inverted />)
    const el = screen.getByText('+2')
    expect(el).not.toHaveClass('text-over-par')
    expect(el).not.toHaveClass('text-under-par')
  })

  it('superscript variant is small and non-bold; bracket variant wraps in ( )', () => {
    const { rerender } = render(<ParDelta delta={-1} variant="superscript" />)
    const sup = screen.getByText('-1')
    expect(sup).toHaveClass('align-super')
    expect(sup).toHaveClass('font-normal')

    rerender(<ParDelta delta={-1} variant="bracket" />)
    expect(screen.getByText('(-1)')).toBeInTheDocument()
  })

  it('appends a passed className (used to shrink the totals-bar bracket)', () => {
    render(<ParDelta delta={5} variant="bracket" className="text-sm" />)
    expect(screen.getByText('(+5)')).toHaveClass('text-sm')
  })
})
