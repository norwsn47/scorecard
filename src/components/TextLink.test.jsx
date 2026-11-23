import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TextLink from './TextLink.jsx'

describe('TextLink', () => {
  it('renders a button by default, with the shared link look and a rounded focus ring', () => {
    const onClick = vi.fn()
    render(<TextLink onClick={onClick}>Edit game setup</TextLink>)
    const link = screen.getByRole('button', { name: 'Edit game setup' })
    expect(link).toHaveAttribute('type', 'button')
    expect(link).toHaveClass('text-accent', 'underline', 'rounded-control', 'focus-visible:ring-accent', 'py-3', '-my-3', 'inline-block')
    fireEvent.click(link)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders an anchor for href; external adds a new tab and the arrow', () => {
    render(<TextLink href="https://outbuild.uk" external>outbuild.uk</TextLink>)
    const link = screen.getByRole('link', { name: /outbuild\.uk/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveClass('inline-flex')
    expect(link.querySelector('svg')).not.toBeNull()
  })

  it('an in-sentence link has no extra tap padding', () => {
    render(<TextLink href="mailto:a@b.c" pad="none">a@b.c</TextLink>)
    const link = screen.getByRole('link', { name: 'a@b.c' })
    expect(link).toHaveClass('inline')
    expect(link).not.toHaveClass('py-3')
    expect(link).not.toHaveAttribute('target')
  })

  it('takes size and tone, and forwards a ref to the element', () => {
    const ref = createRef()
    render(<TextLink ref={ref} size="small-strong" tone="muted" pad="lg">Delete this round</TextLink>)
    const link = screen.getByRole('button', { name: 'Delete this round' })
    expect(link).toHaveClass('type-small-strong', 'text-muted', 'py-3.5', '-my-3.5')
    expect(ref.current).toBe(link)
  })
})
