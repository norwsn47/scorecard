import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Tag from './Tag.jsx'

describe('Tag', () => {
  it('renders real text in the caption style on the accent tint with accent text', () => {
    render(<Tag>Not yet saved</Tag>)
    const tag = screen.getByText('Not yet saved')
    expect(tag).toHaveClass('type-caption', 'text-accent', 'bg-accent-tint', 'rounded-full')
  })

  it('never pairs muted text with the tint', () => {
    render(<Tag>Can't be saved</Tag>)
    expect(screen.getByText("Can't be saved").className).not.toContain('text-muted')
  })

  it('is read as part of its card: plain text, not hidden, no role', () => {
    render(<Tag>Not yet saved</Tag>)
    const tag = screen.getByText('Not yet saved')
    expect(tag).not.toHaveAttribute('aria-hidden')
    expect(tag).not.toHaveAttribute('role')
  })

  it('merges className for layout and forwards attributes', () => {
    render(<Tag className="mb-2" data-testid="t">Not yet saved</Tag>)
    expect(screen.getByTestId('t')).toHaveClass('mb-2', 'bg-accent-tint')
  })
})
