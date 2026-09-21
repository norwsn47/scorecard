import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// A failed map chunk (offline on first open, or a stale tab after a deploy) must
// show a small "couldn't load" dialog, not replace the scorecard with the
// app-level error page, and the next open must try the network again.

beforeEach(() => {
  vi.resetModules()
  vi.spyOn(console, 'error').mockImplementation(() => {}) // React logs the caught render error
})
afterEach(() => {
  vi.doUnmock('./CourseMapModal.jsx')
  vi.restoreAllMocks()
})

function failingModal() {
  vi.doMock('./CourseMapModal.jsx', () => { throw new Error('Failed to fetch dynamically imported module') })
}

describe('LazyCourseMapModal - chunk load failure', () => {
  it('shows a labelled "couldn\'t load" dialog; Close, Escape and the backdrop dismiss it and focus returns to the opener', async () => {
    failingModal()
    const { default: LazyCourseMapModal } = await import('./CourseMapModal.lazy.jsx')
    const user = userEvent.setup()
    const onClose = vi.fn()

    const { rerender } = render(<button>Map</button>)
    const opener = screen.getByRole('button', { name: 'Map' })
    opener.focus()
    rerender(<><button>Map</button><LazyCourseMapModal onClose={onClose} /></>)

    const dialog = await screen.findByRole('dialog', { name: /Bruntsfield Short Hole Golf Course/ })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent("The course map couldn't load")
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}')
    await user.click(dialog.parentElement) // backdrop
    expect(onClose).toHaveBeenCalledTimes(3)

    rerender(<button>Map</button>)
    expect(screen.getByRole('button', { name: 'Map' })).toHaveFocus()
  })

  it('tries the network again on the next open after a failure', async () => {
    failingModal()
    const { default: LazyCourseMapModal } = await import('./CourseMapModal.lazy.jsx')

    const first = render(<LazyCourseMapModal onClose={() => {}} />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    first.unmount()

    vi.resetModules()
    vi.doUnmock('./CourseMapModal.jsx')
    // Same lazy wrapper module instance as before the failure: only the import
    // it retries has changed, so this proves the rejected lazy was not cached.
    const second = render(<LazyCourseMapModal onClose={() => {}} />)
    expect(await screen.findByRole('dialog', { name: /Bruntsfield Short Hole Golf Course/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    second.unmount()
  })
})
