import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerStar from './PlayerStar.jsx'

// The identity marker for the signed-in user's own name (PRD 11.15). It has no
// colour of its own, so these pin the accessible name and the inherit-colour
// contract rather than any visual detail.
describe('PlayerStar', () => {
  it('is exposed as an image labelled "You"', () => {
    render(<PlayerStar />)
    expect(screen.getByRole('img', { name: 'You' })).toBeInTheDocument()
  })

  it('takes its colour from the surrounding text rather than setting its own', () => {
    render(<PlayerStar />)
    const star = screen.getByRole('img', { name: 'You' })
    expect(star).toHaveAttribute('stroke', 'currentColor')
    expect(star).toHaveAttribute('fill', 'none')
  })

  it('keeps its base sizing and appends any extra class from the caller', () => {
    render(<PlayerStar className="ml-0.5" />)
    const star = screen.getByRole('img', { name: 'You' })
    expect(star).toHaveClass('w-2.5', 'h-2.5', 'shrink-0', 'ml-0.5')
  })

  it('renders with no extra class by default', () => {
    render(<PlayerStar />)
    expect(screen.getByRole('img', { name: 'You' })).toHaveClass('w-2.5', 'h-2.5')
  })
})
