import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PageHeader from './PageHeader.jsx'

// PageHeader is the shared boxed header bar. The behaviours worth pinning
// (#35, #69): the optional `title` skips the <h1> entirely when falsy so a
// caller like Summary doesn't reserve a blank line, `backLabel` is rendered
// verbatim (caller owns the arrow), and the back button only appears with an
// `onBack` handler.

describe('PageHeader (#69)', () => {
  it('renders the title as an <h1> when one is given', () => {
    render(<PageHeader title="Bruntsfield" subtitle="Edit course" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Bruntsfield' })).toBeInTheDocument()
    expect(screen.getByText('Edit course')).toBeInTheDocument()
  })

  it('omits the <h1> entirely when the title is falsy, keeping the subtitle', () => {
    render(<PageHeader title={undefined} subtitle="Edit course" />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('Edit course')).toBeInTheDocument()
  })

  it('omits the <h1> for an empty-string title too', () => {
    render(<PageHeader title="" subtitle="Edit course" />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('renders no back button without an onBack handler', () => {
    render(<PageHeader title="Info" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders backLabel verbatim (caller owns the arrow) and fires onBack on click', async () => {
    const onBack = vi.fn()
    render(<PageHeader title="Info" onBack={onBack} backLabel="← History" />)
    const back = screen.getByRole('button', { name: '← History' })
    await userEvent.setup().click(back)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('falls back to "← Back" when no backLabel is passed', () => {
    render(<PageHeader title="Info" onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: '← Back' })).toBeInTheDocument()
  })

  it('renders the right slot', () => {
    render(<PageHeader title="Rounds" right={<button>Edit</button>} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})
