import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BottomActionBar from './BottomActionBar.jsx'

describe('BottomActionBar', () => {
  it('renders its children in a hairline-topped, shadowless bar that clears the safe area', () => {
    render(
      <BottomActionBar data-testid="bar">
        <button type="button">Save</button>
      </BottomActionBar>,
    )
    const bar = screen.getByTestId('bar')
    expect(screen.getByRole('button', { name: 'Save' }).parentElement).toBe(bar)
    expect(bar.className).toContain('border-t')
    expect(bar.className).toContain('shrink-0')
    expect(bar.className).toContain('env(safe-area-inset-bottom')
    expect(bar.className).not.toContain('shadow')
    expect(bar.className).not.toContain('fixed')
  })
})
