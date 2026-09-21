import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ExternalArrow from './ExternalArrow.jsx'

// The one drawing of the ↗ arrow. Locks the geometry and classes so the five
// links that share it (Home footer, Info x3, Privacy) cannot drift apart.
describe('ExternalArrow', () => {
  it('draws the up-and-right arrow at the DESIGN.md icon size', () => {
    const { container } = render(<ExternalArrow />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 10 10')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveAttribute('stroke-width', '1.5')
    expect(svg).toHaveAttribute('stroke-linecap', 'round')
    expect(svg).toHaveAttribute('stroke-linejoin', 'round')
    expect(svg).toHaveClass('w-2.5', 'h-2.5', 'relative', 'top-px')
    expect(svg.querySelector('path')).toHaveAttribute('d', 'M2 8L8 2M8 2H4M8 2V6')
  })
})
