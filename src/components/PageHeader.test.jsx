import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PageHeader, { HeaderAction } from './PageHeader.jsx'

// PageHeader is the shared boxed header bar: three flex slots on one row —
// left, centre, right — with the centre title wrapping (up to two lines)
// into whatever width the (never-shrinking) side slots leave (#85, #87). The
// behaviours worth pinning:
//  - the optional `title` skips the <h1> entirely when falsy so a caller
//    like Summary doesn't reserve a blank line (#69)
//  - `backLabel` is the plain destination text and the button's accessible
//    name; the header draws the chevron itself (aria-hidden), and only with an
//    `onBack` handler (#35)
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

  it('names the back button by its plain label (no arrow glyph) and fires onBack on click', async () => {
    const onBack = vi.fn()
    render(<PageHeader title="Info" onBack={onBack} backLabel="History" />)
    const back = screen.getByRole('button', { name: 'History' })
    expect(back.textContent).toBe('History')
    await userEvent.setup().click(back)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('falls back to "Back" when no backLabel is passed', () => {
    render(<PageHeader title="Info" onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('draws a decorative chevron by default and none with backChevron={false} (Pause)', () => {
    const { rerender } = render(<PageHeader title="Info" onBack={vi.fn()} backLabel="Home" />)
    const chevron = screen.getByRole('button', { name: 'Home' }).querySelector('svg')
    expect(chevron).not.toBeNull()
    expect(chevron).toHaveAttribute('aria-hidden', 'true')
    rerender(<PageHeader title="Info" onBack={vi.fn()} backLabel="Pause" backChevron={false} />)
    expect(screen.getByRole('button', { name: 'Pause' }).querySelector('svg')).toBeNull()
  })

  it('keeps the 44px tap target and the solid accent focus ring on the back button', () => {
    render(<PageHeader title="Info" onBack={vi.fn()} backLabel="Home" />)
    const cls = screen.getByRole('button', { name: 'Home' }).className
    expect(cls).toContain('min-h-11')
    expect(cls).toContain('focus-visible:ring-accent')
    expect(cls).not.toContain('ring-accent/40')
    expect(cls).toContain('text-muted')
    expect(cls).toContain('type-small-strong')
  })

  it('renders the right slot', () => {
    render(<PageHeader title="Rounds" right={<button>Edit</button>} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})

describe('PageHeader structure (#85)', () => {
  it('lays the header out as three slots with truncate on the h1, not the wrapper', () => {
    const { container } = render(
      <PageHeader title="A course with a long name" onBack={vi.fn()} backLabel="Rounds" right={<button>Edit</button>} />,
    )
    const header = container.querySelector('header')
    expect(header.children).toHaveLength(3)
    // Centre wrapper is the flex-1 slot; it must not truncate — its h1 does.
    const centre = header.children[1]
    expect(centre.className).toContain('flex-1')
    expect(centre.className).not.toContain('truncate')
    // Title wraps up to two lines rather than clipping to an ellipsis (#87).
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('line-clamp-2')
    // No absolute title layer, no pointer-events-none anywhere.
    expect(container.querySelector('.absolute')).toBeNull()
    expect(header.className).not.toContain('pointer-events-none')
    // Redesign frame: 68px (4.25rem) bar, 16px page padding, hairline below.
    expect(header.className).toContain('min-h-[4.25rem]')
    expect(header.className).toContain('px-page')
    expect(header.className).toContain('border-b')
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('type-title')
  })

  it('back label, right action and title all render together without overlap', () => {
    render(
      <PageHeader title="Scorecard" onBack={vi.fn()} backLabel="History" right={<button>Finish</button>} />,
    )
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Scorecard' })).toBeInTheDocument()
  })
})

describe('PageHeader invisible mirror (#85)', () => {
  it('fills the empty right slot with an aria-hidden copy of the back button when only onBack is set', () => {
    const { container } = render(<PageHeader title="Information" onBack={vi.fn()} backLabel="Home" />)
    const header = container.querySelector('header')
    expect(header.children).toHaveLength(3)
    const mirror = container.querySelector('div[aria-hidden="true"]')
    expect(mirror).not.toBeNull()
    expect(mirror.className).toContain('invisible')
    expect(mirror.textContent).toBe('Home')
    // The mirror is hidden from the accessibility tree — only one real back button.
    expect(screen.getAllByRole('button', { name: 'Home' })).toHaveLength(1)
  })

  it('fills the empty left slot with an aria-hidden copy of the right action when only right is set', () => {
    const { container } = render(<PageHeader title="Summary" right={<button>Done</button>} />)
    const mirror = container.querySelector('div[aria-hidden="true"]')
    expect(mirror).not.toBeNull()
    expect(mirror.textContent).toBe('Done')
    expect(screen.getAllByRole('button', { name: 'Done' })).toHaveLength(1)
  })

  it('mirrors both sides when both carry real content, so the title sits at the true centre', () => {
    const { container } = render(
      <PageHeader title="History" onBack={vi.fn()} backLabel="Home" right={<button>+ Add round</button>} />,
    )
    const mirrors = [...container.querySelectorAll('div[aria-hidden="true"]')]
    expect(mirrors.map(m => m.textContent)).toEqual(['+ Add round', 'Home'])
    // The real controls stay reachable: one Home and one + Add round button
    // in the accessibility tree (mirrors are aria-hidden and invisible).
    expect(screen.getAllByRole('button', { name: 'Home' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '+ Add round' })).toHaveLength(1)
  })

  it('mirrors for a subtitle-only header too, keeping the subtitle centred', () => {
    // CourseEdit during its course == null load: title is undefined but the
    // "Edit course" subtitle is already showing, with only onBack populated.
    const { container } = render(
      <PageHeader title={undefined} subtitle="Edit course" onBack={vi.fn()} backLabel="New game" />,
    )
    const header = container.querySelector('header')
    expect(header.children).toHaveLength(3)
    const mirror = container.querySelector('div[aria-hidden="true"]')
    expect(mirror).not.toBeNull()
    expect(mirror.textContent).toBe('New game')
    expect(screen.getByText('Edit course')).toBeInTheDocument()
  })

  it('renders no mirror when the centre slot is empty (no title, no subtitle)', () => {
    const { container } = render(<PageHeader onBack={vi.fn()} backLabel="Home" />)
    expect(container.querySelector('div[aria-hidden="true"]')).toBeNull()
  })
})

describe('PageHeader bare variant (#85)', () => {
  it('drops the border and renders only the back slot', () => {
    const { container } = render(<PageHeader bare onBack={vi.fn()} backLabel="Home" />)
    const header = container.querySelector('header')
    expect(header.className).not.toContain('border-b')
    expect(header.className).toContain('px-page')
    expect(header.children).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })

  it('renders no title, subtitle, right slot or mirror even when passed', () => {
    const { container } = render(
      <PageHeader bare title="Ignored" subtitle="Ignored too" onBack={vi.fn()} right={<button>Edit</button>} />,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByText('Ignored too')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(container.querySelector('div[aria-hidden="true"]')).toBeNull()
  })
})

describe('HeaderAction (c04 App bar action)', () => {
  it('is a text action by default: accent label, no fill, 44px target, solid focus ring', async () => {
    const onClick = vi.fn()
    render(<HeaderAction onClick={onClick}>Finish</HeaderAction>)
    const btn = screen.getByRole('button', { name: 'Finish' })
    expect(btn.className).toContain('text-accent')
    expect(btn.className).toContain('bg-transparent')
    expect(btn.className).toContain('border-transparent')
    expect(btn.className).toContain('min-h-11')
    expect(btn.className).toContain('focus-visible:ring-accent')
    expect(btn.className).not.toContain('border-accent')
    expect(btn.className).not.toContain('rounded-full')
    await userEvent.setup().click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is a filled pill only when asked (the expected next step)', () => {
    render(<HeaderAction filled>Finish</HeaderAction>)
    const cls = screen.getByRole('button', { name: 'Finish' }).className
    expect(cls.split(' ')).toContain('bg-accent')
    expect(cls).toContain('text-on-accent')
    expect(cls).toContain('rounded-full')
  })

  it('takes the disabled tokens and does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(<HeaderAction disabled onClick={onClick}>Edit</HeaderAction>)
    const btn = screen.getByRole('button', { name: 'Edit' })
    expect(btn).toBeDisabled()
    expect(btn.className).toContain('disabled:text-disabled-text')
    await userEvent.setup().click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })
})
