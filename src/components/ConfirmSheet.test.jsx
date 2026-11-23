import { useRef, useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmSheet from './ConfirmSheet.jsx'

function Harness({ locked = false, onClose = vi.fn(), useReturnRef = false }) {
  const [open, setOpen] = useState(false)
  const cancelRef = useRef(null)
  const returnRef = useRef(null)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <button type="button" ref={returnRef}>Return here</button>
      {open && (
        <ConfirmSheet
          title="Delete this round?"
          onClose={() => { onClose(); setOpen(false) }}
          locked={locked}
          initialFocusRef={cancelRef}
          returnFocusRef={useReturnRef ? returnRef : undefined}
        >
          <button type="button" ref={cancelRef} onClick={() => setOpen(false)}>Cancel</button>
          <button type="button">Delete</button>
        </ConfirmSheet>
      )}
    </div>
  )
}

describe('ConfirmSheet', () => {
  it('is a labelled modal dialog inside the page (absolute), with the safe-area padding', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this round?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.parentElement).toHaveClass('absolute', 'inset-0')
    expect(dialog.className).toContain('env(safe-area-inset-bottom')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('traps Tab and Shift+Tab inside the sheet', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 3; i += 1) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement)
    }
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(dialog).toContainElement(document.activeElement)
  })

  it('closes on Escape and on the backdrop, and hands focus back to the opener', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await user.click(opener)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()

    await user.click(opener)
    await user.click(screen.getByRole('dialog').parentElement)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('ignores Escape and the backdrop while locked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness locked onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('dialog').parentElement)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('hands focus to returnFocusRef when given one', async () => {
    const user = userEvent.setup()
    render(<Harness useReturnRef />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Return here' })).toHaveFocus()
  })
})
