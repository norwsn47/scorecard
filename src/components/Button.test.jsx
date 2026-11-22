import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Button from './Button.jsx'

describe('Button', () => {
  it('defaults to a primary, large, type="button" button', () => {
    render(<Button>Start the round</Button>)
    const btn = screen.getByRole('button', { name: 'Start the round' })
    expect(btn).toHaveAttribute('type', 'button')
    expect(btn).toHaveClass('bg-accent', 'text-on-accent', 'rounded-control', 'type-strong', 'min-h-12')
    expect(btn).not.toHaveClass('shadow-btn')
  })

  it('renders the secondary and text variants and the medium size', () => {
    render(
      <>
        <Button variant="secondary">Cancel</Button>
        <Button variant="text" size="medium">Skip</Button>
      </>,
    )
    const secondary = screen.getByRole('button', { name: 'Cancel' })
    expect(secondary).toHaveClass('border-accent', 'text-accent', 'rounded-control')
    expect(secondary).not.toHaveClass('bg-accent')
    const text = screen.getByRole('button', { name: 'Skip' })
    expect(text).toHaveClass('border-transparent', 'text-accent', 'min-h-11')
  })

  it('keeps a 44px minimum touch target in both sizes', () => {
    render(
      <>
        <Button>Large</Button>
        <Button size="medium">Medium</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Large' })).toHaveClass('min-h-12')
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveClass('min-h-11')
  })

  it('uses the disabled tokens instead of opacity and does not fire onClick', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Save</Button>)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeDisabled()
    expect(btn.className).toContain('disabled:bg-disabled-surface')
    expect(btn.className).toContain('disabled:text-disabled-text')
    expect(btn.className).not.toContain('opacity-40')
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('calls onClick when enabled', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('forwards a ref to the button element', () => {
    const ref = createRef()
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Ref' }))
  })

  it('passes aria props and other attributes through', () => {
    render(<Button aria-expanded={false} aria-label="Open notes" data-testid="b">Notes</Button>)
    const btn = screen.getByTestId('b')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(btn).toHaveAccessibleName('Open notes')
  })

  it('allows type="submit" and merges className for layout', () => {
    render(<Button type="submit" fullWidth className="flex-1 mt-4">Send</Button>)
    const btn = screen.getByRole('button', { name: 'Send' })
    expect(btn).toHaveAttribute('type', 'submit')
    expect(btn).toHaveClass('w-full', 'flex-1', 'mt-4', 'bg-accent')
  })

  it('renders leading and trailing icons around the label', () => {
    render(
      <Button
        leadingIcon={<svg data-testid="lead" aria-hidden="true" />}
        trailingIcon={<svg data-testid="trail" aria-hidden="true" />}
      >
        Share
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Share' })
    expect(btn.firstChild).toBe(screen.getByTestId('lead'))
    expect(btn.lastChild).toBe(screen.getByTestId('trail'))
  })
})
