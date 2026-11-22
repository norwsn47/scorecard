import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Card, { CARD_INNER_CONTROL } from './Card.jsx'

describe('Card (static)', () => {
  it('renders a div with the record-card surface and no button', () => {
    render(<Card data-testid="c">Hello</Card>)
    const card = screen.getByTestId('c')
    expect(card.tagName).toBe('DIV')
    expect(card).toHaveClass('bg-bg-card', 'border', 'border-border', 'rounded-control', 'shadow-subtle', 'p-card')
    expect(card).not.toHaveClass('shadow-card', 'rounded-md', 'relative')
    expect(screen.queryByRole('button')).toBeNull()
    expect(card).toHaveTextContent('Hello')
  })

  it('merges className for layout, forwards attributes and ref, and honours `as`', () => {
    const ref = createRef()
    render(<Card as="li" ref={ref} className="mt-3" data-testid="c" aria-label="Round">x</Card>)
    const card = screen.getByTestId('c')
    expect(card.tagName).toBe('LI')
    expect(card).toHaveClass('mt-3', 'bg-bg-card')
    expect(card).toHaveAttribute('aria-label', 'Round')
    expect(ref.current).toBe(card)
  })
})

describe('Card (interactive)', () => {
  function setup(onOpen = vi.fn(), onInner = vi.fn()) {
    render(
      <Card onOpen={onOpen} openLabel="Open round: 22 Nov, Will" data-testid="c">
        <p>22 Nov</p>
        <button type="button" className={CARD_INNER_CONTROL} aria-pressed="false" onClick={onInner}>Will</button>
      </Card>,
    )
    return { onOpen, onInner }
  }

  it('is a relative div holding a real type="button" open button with the given name', () => {
    setup()
    const card = screen.getByTestId('c')
    expect(card.tagName).toBe('DIV')
    expect(card).toHaveClass('relative', 'bg-bg-card', 'shadow-subtle')
    const open = screen.getByRole('button', { name: 'Open round: 22 Nov, Will' })
    expect(open).toHaveAttribute('type', 'button')
    expect(open).toHaveClass('absolute', 'inset-0', 'w-full', 'h-full', 'rounded-control')
    expect(open).toBeEmptyDOMElement()
  })

  it('puts the content above the button with pointer-events-none, and inner controls opt back in', () => {
    setup()
    const wrapper = screen.getByText('22 Nov').parentElement
    expect(wrapper).toHaveClass('relative', 'pointer-events-none', 'text-left')
    expect(CARD_INNER_CONTROL).toBe('pointer-events-auto')
    expect(screen.getByRole('button', { name: 'Will' })).toHaveClass('pointer-events-auto')
  })

  it('uses a solid accent focus ring, not the 40% ring', () => {
    setup()
    const open = screen.getByRole('button', { name: 'Open round: 22 Nov, Will' })
    expect(open).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-accent')
    expect(open.className).not.toContain('ring-accent/40')
  })

  it('gives hover and press feedback as an accent edge, never a tint under the text', () => {
    setup()
    const open = screen.getByRole('button', { name: 'Open round: 22 Nov, Will' })
    expect(open).toHaveClass('peer')
    const edge = open.nextElementSibling
    expect(edge).toHaveAttribute('aria-hidden', 'true')
    expect(edge).toHaveClass('pointer-events-none', 'peer-hover:border-accent', 'peer-active:border-accent')
    const card = screen.getByTestId('c')
    expect(card.innerHTML).not.toMatch(/accent-tint/)
  })

  it('opens on click and on keyboard Enter and Space', async () => {
    const { onOpen } = setup()
    const open = screen.getByRole('button', { name: 'Open round: 22 Nov, Will' })
    await userEvent.click(open)
    expect(onOpen).toHaveBeenCalledTimes(1)
    open.focus()
    await userEvent.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledTimes(2)
    await userEvent.keyboard(' ')
    expect(onOpen).toHaveBeenCalledTimes(3)
  })

  it('does not open when an inner button is clicked', async () => {
    const { onOpen, onInner } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Will' }))
    expect(onInner).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('never nests a button inside a button', () => {
    setup()
    for (const b of screen.getAllByRole('button')) {
      expect(b.querySelector('button')).toBeNull()
      expect(b.closest('button')).toBe(b)
    }
  })

  it('works as a single tappable card with no inner controls', async () => {
    const onOpen = vi.fn()
    render(<Card onOpen={onOpen} openLabel="Bruntsfield Short Hole Golf Course">Course map</Card>)
    await userEvent.click(screen.getByRole('button', { name: 'Bruntsfield Short Hole Golf Course' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
