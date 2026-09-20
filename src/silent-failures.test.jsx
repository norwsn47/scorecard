import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import History from './pages/History.jsx'
import Setup from './pages/Setup.jsx'
import Scorecard from './pages/Scorecard.jsx'
import Info from './pages/Info.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'
import { localDateString } from './utils/format.js'
import { getActiveGame, saveActiveGame } from './utils/storage.js'

// BACKLOG #99: failures that used to look like success or an empty account.
// A failed load is not "No rounds yet", a failed delete does not remove the
// round, a cleared date does not throw, a failed local save does not discard
// the round, and a failed sign-out does not pretend to have signed out.

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }
const json = (body, init = {}) => Promise.resolve({ ok: true, status: 200, json: async () => body, ...init })

const dbRound = {
  id: 'db1', played_at: '2026-08-01T10:00:00.000Z', holes_played: 2, course_id: null, course_name: null,
  notes: null, hole_pars: '[3,3]',
  player_data: JSON.stringify([{ name: 'Ann', scores: [3, 3], total: 6 }, { name: 'Bo', scores: [4, 4], total: 8 }]),
}
// player_data that JSON.parse cannot read: normalizeDbGame throws on this row.
const badRound = { ...dbRound, id: 'bad1', player_data: '{not json' }

async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ───────────────────────── History ─────────────────────────
describe('History - loading and deleting (#99)', () => {
  function mockApi({ games, del } = {}) {
    global.fetch = vi.fn((url, opts) => {
      const u = String(url)
      if (u.includes('/api/auth/me')) return json({ user: SIGNED_IN })
      if (opts?.method === 'DELETE') return del ? del() : json({})
      if (u.startsWith('/api/games')) return games()
      return Promise.reject(new Error(`unexpected fetch: ${u}`))
    })
  }
  function renderHistory() {
    const navigate = vi.fn()
    render(<AuthProvider><History navigate={navigate} goBack={vi.fn()} /></AuthProvider>)
    return { navigate }
  }

  it('a server error shows "Couldn\'t load your rounds" with Try again, never "No rounds yet"', async () => {
    const user = userEvent.setup()
    let fail = true
    mockApi({ games: () => (fail ? json({}, { ok: false, status: 500 }) : json({ games: [dbRound] })) })
    renderHistory()

    expect(await screen.findByText("Couldn't load your rounds")).toBeInTheDocument()
    expect(screen.queryByText('No rounds yet')).not.toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: /^Open round/ })).toBeInTheDocument()
    expect(screen.queryByText("Couldn't load your rounds")).not.toBeInTheDocument()
  })

  it('a 401 says you have been signed out and offers Sign in', async () => {
    const user = userEvent.setup()
    mockApi({ games: () => json({}, { ok: false, status: 401 }) })
    const { navigate } = renderHistory()

    expect(await screen.findByText("You've been signed out")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(navigate).toHaveBeenCalledWith('login')
  })

  it('one unreadable round is skipped with a note, not a blank list', async () => {
    mockApi({ games: () => json({ games: [dbRound, badRound] }) })
    renderHistory()

    expect(await screen.findByRole('button', { name: /^Open round/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Open round/ })).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent("1 round couldn't be shown.")
  })

  it('a failed delete keeps the round, says so, and leaves the sheet open', async () => {
    const user = userEvent.setup()
    mockApi({ games: () => json({ games: [dbRound] }), del: () => json({}, { ok: false, status: 500 }) })
    renderHistory()

    await user.click(await screen.findByRole('button', { name: 'Delete round' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText("Couldn't delete this round - check your connection and try again.")).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Open round/ })).toBeInTheDocument()
  })

  it('a successful delete (or one that is already gone, 404) removes the round and closes the sheet', async () => {
    for (const status of [200, 404]) {
      const user = userEvent.setup()
      mockApi({
        games: () => json({ games: [dbRound] }),
        del: () => json({}, { ok: status === 200, status }),
      })
      const { unmount } = render(<AuthProvider><History navigate={vi.fn()} goBack={vi.fn()} /></AuthProvider>)

      await user.click(await screen.findByRole('button', { name: 'Delete round' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.queryByRole('button', { name: /^Open round/ })).not.toBeInTheDocument()
      unmount()
    }
  })

  it('while the delete is in flight both buttons are disabled and the sheet cannot be dismissed', async () => {
    const user = userEvent.setup()
    let release
    mockApi({
      games: () => json({ games: [dbRound] }),
      del: () => new Promise(resolve => { release = () => resolve({ ok: true, status: 200, json: async () => ({}) }) }),
    })
    renderHistory()

    await user.click(await screen.findByRole('button', { name: 'Delete round' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await act(async () => { release() })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

// ───────────────────────── Setup ─────────────────────────
describe('Setup - courses load and the date field (#99)', () => {
  function mockApi(coursesResponse) {
    global.fetch = vi.fn(url => {
      const u = String(url)
      if (u.startsWith('/api/courses')) return coursesResponse()
      return json({ user: SIGNED_IN })
    })
  }
  function renderSetup(params = {}) {
    const navigate = vi.fn()
    render(<AuthProvider><Setup navigate={navigate} goBack={vi.fn()} params={params} /></AuthProvider>)
    return { navigate }
  }

  it('a failed courses load says so with Try again, and never shows "No courses yet"', async () => {
    const user = userEvent.setup()
    let fail = true
    mockApi(() => (fail
      ? json({}, { ok: false, status: 500 })
      : json({ courses: [{ id: 'c1', name: 'Nine A', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 1, round_count: 0 }] })))
    renderSetup()

    expect(await screen.findByText("Couldn't load your courses - check your connection.")).toBeInTheDocument()
    expect(screen.queryByText(/No courses yet/)).not.toBeInTheDocument()
    expect(screen.getByText(/start below without one/)).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByDisplayValue('Nine A')).toBeInTheDocument()
  })

  it('a 401 on the courses load says you have been signed out and offers Sign in', async () => {
    const user = userEvent.setup()
    mockApi(() => json({}, { ok: false, status: 401 }))
    const { navigate } = renderSetup()

    expect(await screen.findByText(/You've been signed out/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(navigate).toHaveBeenCalledWith('login')
  })

  it('an account with no courses still gets the real "No courses yet" state once the load succeeds', async () => {
    mockApi(() => json({ courses: [] }))
    renderSetup()
    expect(await screen.findByText(/No courses yet/)).toBeInTheDocument()
  })

  it('clearing the date disables the start button with a hint, instead of throwing on tap', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: null }) })
    renderSetup({ pastRound: true })
    await settle()

    await user.type(screen.getByLabelText('Player 1 name'), 'Ann')
    const start = screen.getByRole('button', { name: 'Enter scores' })
    expect(start).toBeEnabled()

    await user.clear(screen.getByLabelText('Date played'))
    expect(start).toBeDisabled()
    expect(screen.getByText('Choose the date the round was played')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Date played'), '2026-08-01')
    expect(start).toBeEnabled()
  })

  it('the date defaults to the device\'s local date, and editing a round shows its local date', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: null }) })
    renderSetup({ pastRound: true })
    await settle()
    expect(screen.getByLabelText('Date played')).toHaveValue(localDateString())
    expect(screen.getByLabelText('Date played')).toHaveAttribute('max', localDateString())
  })

  it('a round finished at 00:30 local time edits as that same local day', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: null }) })
    // Local 00:30 on 1 Aug; in a UTC+1 zone its ISO string is still 31 July.
    const completedAt = new Date(2026, 7, 1, 0, 30).toISOString()
    const game = {
      id: 'g1', players: ['Ann'], scores: { Ann: [3] }, holes: 1, holesPlayed: 1, completedAt,
      holePars: [3], courseId: null, courseName: 'B',
    }
    renderSetup({ editRound: true, game })
    await settle()
    expect(screen.getByLabelText('Date played')).toHaveValue('2026-08-01')
  })
})

describe('localDateString', () => {
  it('uses the local calendar date, not the UTC one', () => {
    expect(localDateString(new Date(2026, 7, 1, 0, 30))).toBe('2026-08-01')
    expect(localDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

// ───────────────────────── Scorecard ─────────────────────────
describe('Scorecard - a failed local save on finish (#99)', () => {
  const game = () => ({
    id: 'g1', players: ['Ann'], scores: { Ann: [3] }, holes: 1, holePars: [3], courseId: null, courseName: 'B',
  })

  async function finishWithFailingStorage(user) {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user }) })
    const navigate = vi.fn()
    saveActiveGame(game())
    render(<AuthProvider><Scorecard navigate={navigate} params={{ game: game() }} /></AuthProvider>)
    await settle()

    const realSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'gt_completed_games') throw new Error('QuotaExceededError')
      return realSetItem.call(this, key, value)
    })
    const u = userEvent.setup()
    await u.click(screen.getByRole('button', { name: 'Finish' }))
    await u.click(screen.getByRole('button', { name: 'Confirm' }))
    await settle()
    return { navigate }
  }

  it('signed out: keeps the round on the scorecard with an error, and does not clear the active game', async () => {
    const { navigate } = await finishWithFailingStorage(null)

    expect(navigate).not.toHaveBeenCalledWith('summary', expect.anything())
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save – storage may be full")
    expect(getActiveGame()).not.toBeNull()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('signed in: carries on to Summary, because the round still reaches the server from there', async () => {
    const { navigate } = await finishWithFailingStorage(SIGNED_IN)
    expect(navigate).toHaveBeenCalledWith('summary', expect.anything())
  })
})

// ───────────────────────── Sign out ─────────────────────────
describe('Info - sign out (#99)', () => {
  function mockApi(logoutResponse) {
    global.fetch = vi.fn(url => {
      if (String(url).includes('/api/auth/logout')) return logoutResponse()
      return json({ user: SIGNED_IN })
    })
  }
  async function renderInfo() {
    const navigate = vi.fn()
    render(<AuthProvider><Info navigate={navigate} goBack={vi.fn()} params={{}} /></AuthProvider>)
    return { navigate, signOut: await screen.findByRole('button', { name: 'Sign out' }) }
  }

  it('a failed sign-out stays signed in and says so', async () => {
    const user = userEvent.setup()
    mockApi(() => json({}, { ok: false, status: 500 }))
    const { navigate, signOut } = await renderInfo()

    await user.click(signOut)
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't sign out")
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('a network failure is reported the same way, not as an unhandled rejection', async () => {
    const user = userEvent.setup()
    mockApi(() => Promise.reject(new TypeError('Failed to fetch')))
    const { navigate, signOut } = await renderInfo()

    await user.click(signOut)
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't sign out")
    expect(navigate).not.toHaveBeenCalled()
  })

  it('a successful sign-out goes Home', async () => {
    const user = userEvent.setup()
    mockApi(() => json({ ok: true }))
    const { navigate, signOut } = await renderInfo()

    await user.click(signOut)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
  })
})
