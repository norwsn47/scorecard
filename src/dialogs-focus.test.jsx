import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './pages/Scorecard.jsx'
import CourseEdit from './pages/CourseEdit.jsx'
import History from './pages/History.jsx'
import Settings from './pages/Settings.jsx'
import CourseMapModal from './components/CourseMapModal.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'

// BACKLOG #100 / #80 / #101 (second half): every confirmation sheet and modal is
// a real dialog - role, label, focus moved in on open, Escape and backdrop
// dismiss, focus handed back to whatever opened it - and the History card no
// longer nests one button inside another.

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

function mockFetch({ user = null, courses = [], games = [] } = {}) {
  global.fetch = vi.fn(url => {
    const u = String(url)
    if (u.startsWith('/api/courses')) return Promise.resolve({ ok: true, json: async () => ({ courses }) })
    if (u.startsWith('/api/games')) return Promise.resolve({ ok: true, json: async () => ({ games }) })
    return Promise.resolve({ ok: true, json: async () => ({ user }) })
  })
}

async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

describe('Scorecard - Finish sheet', () => {
  const game = () => ({
    id: 'g1', players: ['Ann'], scores: { Ann: [3] }, holes: 1, holePars: [3], courseId: null, courseName: 'B',
  })

  async function open() {
    mockFetch()
    const user = userEvent.setup()
    render(<AuthProvider><Scorecard navigate={vi.fn()} params={{ game: game() }} /></AuthProvider>)
    await settle()
    const finish = screen.getByRole('button', { name: 'Finish' })
    await user.click(finish)
    return { user, finish }
  }

  it('is a labelled modal dialog with focus on Cancel', async () => {
    await open()
    const dialog = screen.getByRole('dialog', { name: 'Finish Game?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('Escape closes it and hands focus back to the Finish button', async () => {
    const { user, finish } = await open()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(finish).toHaveFocus()
  })

  it('a tap on the backdrop closes it, but a tap inside the sheet does not', async () => {
    const { user } = await open()
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByText('Scores are final'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(dialog.parentElement) // the backdrop
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('CourseEdit - delete-course sheet', () => {
  it('is a labelled dialog, focuses Cancel, and Escape returns focus to the trigger', async () => {
    const user = userEvent.setup()
    mockFetch({
      user: SIGNED_IN,
      courses: [{ id: 'c1', name: 'Nine A', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 0, round_count: 2 }],
    })
    render(<AuthProvider><CourseEdit navigate={vi.fn()} params={{ courseId: 'c1' }} /></AuthProvider>)

    const trigger = await screen.findByRole('button', { name: 'Delete this course' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Delete Nine A?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

describe('CourseMapModal', () => {
  it('is a labelled dialog focusing Close; Escape and the backdrop close it; focus returns to the opener', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    function Harness() {
      return <><button>Map</button></>
    }
    const { rerender } = render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Map' })
    opener.focus()

    rerender(<><Harness /><CourseMapModal onClose={onClose} /></>)
    const dialog = screen.getByRole('dialog', { name: /Bruntsfield Short Hole Golf Course/ })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(dialog.parentElement) // backdrop
    expect(onClose).toHaveBeenCalledTimes(2)

    rerender(<Harness />) // modal unmounts
    expect(opener).toHaveFocus()
  })

  it('does not re-grab focus when the parent re-renders with a new onClose function', async () => {
    const { rerender } = render(<CourseMapModal onClose={() => {}} />)
    const toggle = screen.getByRole('button', { name: 'Course rules' })
    toggle.focus()

    rerender(<CourseMapModal onClose={() => {}} />)
    expect(toggle).toHaveFocus()
  })
})

describe('History cards', () => {
  const dbRound = {
    id: 'db1', played_at: '2026-08-01T10:00:00.000Z', holes_played: 2, course_id: null, course_name: null,
    notes: null, hole_pars: '[3,3]',
    player_data: JSON.stringify([
      { name: 'Ann', scores: [3, 3], total: 6 },
      { name: 'Bo', scores: [4, 4], total: 8 },
    ]),
  }

  async function renderHistory() {
    mockFetch({ user: SIGNED_IN, games: [dbRound] })
    const navigate = vi.fn()
    render(<AuthProvider><History navigate={navigate} goBack={vi.fn()} /></AuthProvider>)
    await screen.findByRole('button', { name: /^Open round/ })
    return { navigate }
  }

  it('never nests a button inside another button or an interactive role', async () => {
    await renderHistory()
    for (const button of screen.getAllByRole('button')) {
      expect(within(button).queryAllByRole('button')).toHaveLength(0)
    }
    expect(document.querySelector('[role="button"]')).toBeNull()
  })

  it('opens the round from the open button, and names its date and players', async () => {
    const user = userEvent.setup()
    const { navigate } = await renderHistory()

    const open = screen.getByRole('button', { name: /^Open round: .*Ann, Bo/ })
    await user.click(open)
    expect(navigate).toHaveBeenCalledWith('summary', expect.objectContaining({ fromHistory: true }))
  })

  it('a player name in a card is a real toggle button that filters without opening the round', async () => {
    const user = userEvent.setup()
    const { navigate } = await renderHistory()

    const card = screen.getByRole('button', { name: /^Open round/ }).parentElement
    const bo = within(card).getByRole('button', { name: 'Bo' })
    expect(bo).toHaveAttribute('aria-pressed', 'false')

    await user.click(bo)
    expect(within(card).getByRole('button', { name: 'Bo' })).toHaveAttribute('aria-pressed', 'true')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('the delete sheet returns focus to the round\'s delete control on Escape', async () => {
    const user = userEvent.setup()
    await renderHistory()

    const del = screen.getByRole('button', { name: 'Delete round' })
    await user.click(del)
    expect(screen.getByRole('dialog', { name: 'Delete this round?' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(del).toHaveFocus()
  })
})

describe('Settings - focus return', () => {
  it('collapsing the email form hands focus back to "Change email address"', async () => {
    const user = userEvent.setup()
    mockFetch({ user: SIGNED_IN })
    render(<AuthProvider><Settings navigate={vi.fn()} goBack={vi.fn()} params={{}} /></AuthProvider>)

    const change = await screen.findByRole('button', { name: 'Change email address' })
    await user.click(change)
    expect(screen.getByLabelText('New email address')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Keep my current email' }))
    expect(screen.getByRole('button', { name: 'Change email address' })).toHaveFocus()
  })

  it('the delete sheet returns focus to "Delete my account" on Escape', async () => {
    const user = userEvent.setup()
    mockFetch({ user: SIGNED_IN })
    render(<AuthProvider><Settings navigate={vi.fn()} goBack={vi.fn()} params={{}} /></AuthProvider>)

    const del = await screen.findByRole('button', { name: 'Delete my account' })
    await user.click(del)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(del).toHaveFocus()
  })
})
