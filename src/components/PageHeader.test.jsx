import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PageHeader from './PageHeader.jsx'

// PageHeader is the shared boxed header bar: three flex slots on one row —
// left, centre, right — with the centre title truncating into whatever
// width the (never-shrinking) side slots leave (#85). The behaviours worth
// pinning:
//  - the optional `title` skips the <h1> entirely when falsy so a caller
//    like Summary doesn't reserve a blank line (#69)
//  - `backLabel` is rendered verbatim (caller owns the arrow) and the back
//    button only appears with an `onBack` handler (#35)
//  - the invisible mirror: a one-sided header with centre content (title or
//    subtitle) fills the empty slot with an aria-hidden copy of the
//    populated side, so the centre text stays centred on the header
//  - the `bare` variant (Login) drops the border and boxed padding and
//    renders the back slot alone

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

describe('PageHeader structure (#85)', () => {
  it('lays the header out as three slots with truncate on the h1, not the wrapper', () => {
    const { container } = render(
      <PageHeader title="A course with a long name" onBack={vi.fn()} backLabel="← Rounds" right={<button>Edit</button>} />,
    )
    const header = container.querySelector('header')
    expect(header.children).toHaveLength(3)
    // Centre wrapper is the flex-1 slot; it must not truncate — its h1 does.
    const centre = header.children[1]
    expect(centre.className).toContain('flex-1')
    expect(centre.className).not.toContain('truncate')
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('truncate')
    // No absolute title layer, no pointer-events-none anywhere.
    expect(container.querySelector('.absolute')).toBeNull()
    expect(header.className).not.toContain('pointer-events-none')
  })

  it('back label, right action and title all render together without overlap', () => {
    render(
      <PageHeader title="Scorecard" onBack={vi.fn()} backLabel="← History" right={<button>Finish</button>} />,
    )
    expect(screen.getByRole('button', { name: '← History' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Scorecard' })).toBeInTheDocument()
  })
})

describe('PageHeader invisible mirror (#85)', () => {
  it('fills the empty right slot with an aria-hidden copy of the back button when only onBack is set', () => {
    const { container } = render(<PageHeader title="Information" onBack={vi.fn()} backLabel="← Home" />)
    const header = container.querySelector('header')
    expect(header.children).toHaveLength(3)
    const mirror = container.querySelector('[aria-hidden="true"]')
    expect(mirror).not.toBeNull()
    expect(mirror.className).toContain('invisible')
    expect(mirror.textContent).toBe('← Home')
    // The mirror is hidden from the accessibility tree — only one real back button.
    expect(screen.getAllByRole('button', { name: '← Home' })).toHaveLength(1)
  })

  it('fills the empty left slot with an aria-hidden copy of the right action when only right is set', () => {
    const { container } = render(<PageHeader title="Summary" right={<button>Done</button>} />)
    const mirror = container.querySelector('[aria-hidden="true"]')
    expect(mirror).not.toBeNull()
    expect(mirror.textContent).toBe('Done')
    expect(screen.getAllByRole('button', { name: 'Done' })).toHaveLength(1)
  })

  it('renders no mirror when both side slots carry real content', () => {
    const { container } = render(
      <PageHeader title="History" onBack={vi.fn()} backLabel="← Home" right={<button>+ Add round</button>} />,
    )
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('mirrors for a subtitle-only header too, keeping the subtitle centred', () => {
    // CourseEdit during its course == null load: title is undefined but the
    // "Edit course" subtitle is already showing, with only onBack populated.
    const { container } = render(
      <PageHeader title={undefined} subtitle="Edit course" onBack={vi.fn()} backLabel="← New Game" />,
    )
    const header = container.querySelector('header')
    expect(header.children).toHaveLength(3)
    const mirror = container.querySelector('[aria-hidden="true"]')
    expect(mirror).not.toBeNull()
    expect(mirror.textContent).toBe('← New Game')
    expect(screen.getByText('Edit course')).toBeInTheDocument()
  })

  it('renders no mirror when the centre slot is empty (no title, no subtitle)', () => {
    const { container } = render(<PageHeader onBack={vi.fn()} backLabel="← Home" />)
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })
})

describe('PageHeader bare variant (#85)', () => {
  it('drops the border and renders only the back slot', () => {
    const { container } = render(<PageHeader bare onBack={vi.fn()} backLabel="← Home" />)
    const header = container.querySelector('header')
    expect(header.className).not.toContain('border-b')
    expect(header.className).toContain('px-4')
    expect(header.children).toHaveLength(1)
    expect(screen.getByRole('button', { name: '← Home' })).toBeInTheDocument()
  })

  it('renders no title, subtitle, right slot or mirror even when passed', () => {
    const { container } = render(
      <PageHeader bare title="Ignored" subtitle="Ignored too" onBack={vi.fn()} right={<button>Edit</button>} />,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByText('Ignored too')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })
})
