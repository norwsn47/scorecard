import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './Scorecard.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { buildEditGame } from '../utils/game.js'
import { getCompletedGames, markCompletedGamePending } from '../utils/storage.js'

// A pending round's edit must not be stranded (BACKLOG #113, PRD §11.8): when
// the edit is saved or abandoned, a sync run is asked for, so the round goes to
// the account with the edited data now rather than at the next app open. The
// real runner is used; only the entry point is spied.
vi.mock('../utils/sync.js', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, syncPendingRounds: vi.fn(actual.syncPendingRounds) }
})
import { syncPendingRounds } from '../utils/sync.js'

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

const record = {
  id: 'g1',
  players: ['Ann'],
  scores: { Ann: [3, 4] },
  holes: 2,
  holesPlayed: 2,
  completedAt: '2026-08-01T12:00:00.000Z',
  holePars: [3, 3],
  courseId: 'c1',
  courseName: 'Bruntsfield',
}

const ok = body => Promise.resolve({ ok: true, status: 200, json: async () => body })

function mockFetch(user) {
  global.fetch = vi.fn((url, opts) => {
    const u = String(url)
    if (u.includes('/api/auth/me')) return ok({ user })
    if (u === '/api/games' && opts?.method === 'POST') return ok({ id: 'srv-1' })
    if (u.startsWith('/api/games/') && opts?.method === 'PATCH') return ok({})
    return Promise.reject(new Error(`unexpected fetch: ${u}`))
  })
}

const posts = () => global.fetch.mock.calls.filter(([u, o]) => String(u) === '/api/games' && o?.method === 'POST')
const stored = () => getCompletedGames().find(g => g.id === 'g1')

function seed({ pending = true } = {}) {
  localStorage.setItem('gt_completed_games', JSON.stringify([record]))
  if (pending) markCompletedGamePending('g1', 'u1', 'Kept note')
}

// Renders the edit as Setup hands it over (working copy in the active slot),
// then lets auth resolve so the screen knows who is signed in.
async function renderEdit({ fromDb = false } = {}) {
  const working = buildEditGame(stored() ?? record,['Ann'], 'c1', 'Bruntsfield', record.completedAt, [3, 3])
  working._edit = { id: 'g1', fromDb }
  localStorage.setItem('gt_active_game', JSON.stringify(working))
  const navigate = vi.fn()
  render(
    <AuthProvider>
      <Scorecard navigate={navigate} params={{ game: working, editContext: working._edit }} />
    </AuthProvider>,
  )
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  return { navigate }
}

async function changeHole1AndSave(user) {
  await user.click(screen.getByLabelText('Increase score')) // Ann / hole 1: 3 -> 4
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.click(screen.getByRole('button', { name: /save changes/i }))
}

const runsAskedFor = () => syncPendingRounds.mock.calls.map(([id]) => id)

beforeEach(() => {
  localStorage.clear()
  syncPendingRounds.mockClear()
  mockFetch(SIGNED_IN)
})

afterEach(async () => {
  cleanup()
  await Promise.all(syncPendingRounds.mock.results.map(r => r.value))
})

describe('Scorecard - saving the edit of a pending round asks for a sync run', () => {
  it('runs after navigating to Summary, and the round sent carries the edited scores', async () => {
    seed()
    const user = userEvent.setup()
    const { navigate } = await renderEdit()

    await changeHole1AndSave(user)

    expect(navigate).toHaveBeenCalledWith('summary', expect.any(Object))
    expect(runsAskedFor()).toEqual(['u1'])
    // After the navigate call, so it can never delay it.
    expect(navigate.mock.invocationCallOrder[0]).toBeLessThan(syncPendingRounds.mock.invocationCallOrder[0])

    const result = await syncPendingRounds.mock.results[0].value
    expect(result.synced).toBe(1)
    expect(posts()).toHaveLength(1)
    const body = JSON.parse(posts()[0][1].body)
    expect(body.client_round_id).toBe('g1')
    expect(body.player_data[0].scores).toEqual([4, 4]) // the edit (3 -> 4), not the old data
    expect(body.player_data[0].total).toBe(8)
    expect(body.notes).toBe('Kept note')
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(stored().synced).toBe(true)
  })

  it('a local round that is not pending asks for no run', async () => {
    seed({ pending: false })
    const user = userEvent.setup()
    const { navigate } = await renderEdit()

    await changeHole1AndSave(user)

    expect(navigate).toHaveBeenCalledWith('summary', expect.any(Object))
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('a database edit (PATCH) asks for no run', async () => {
    const user = userEvent.setup()
    const { navigate } = await renderEdit({ fromDb: true })

    await changeHole1AndSave(user)

    expect(navigate).toHaveBeenCalledWith('summary', expect.any(Object))
    expect(global.fetch.mock.calls.some(([, o]) => o?.method === 'PATCH')).toBe(true)
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('signed out: asks for no run', async () => {
    mockFetch(null)
    seed()
    const user = userEvent.setup()
    const { navigate } = await renderEdit()

    await changeHole1AndSave(user)

    expect(navigate).toHaveBeenCalledWith('summary', expect.any(Object))
    expect(syncPendingRounds).not.toHaveBeenCalled()
    expect(posts()).toHaveLength(0)
  })
})

describe('Scorecard - abandoning the edit asks for a sync run', () => {
  it('the back button releases the round, goes to History, then asks for a run that sends the unedited round', async () => {
    seed()
    const user = userEvent.setup()
    const { navigate } = await renderEdit()

    await user.click(screen.getByRole('button', { name: /History/ }))

    expect(navigate).toHaveBeenCalledWith('history')
    expect(runsAskedFor()).toEqual(['u1'])
    expect(navigate.mock.invocationCallOrder[0]).toBeLessThan(syncPendingRounds.mock.invocationCallOrder[0])
    const result = await syncPendingRounds.mock.results[0].value
    expect(result.synced).toBe(1)
    expect(JSON.parse(posts()[0][1].body).player_data[0].scores).toEqual([3, 4])
  })

  it('signed out: asks for no run', async () => {
    mockFetch(null)
    seed()
    const user = userEvent.setup()
    await renderEdit()

    await user.click(screen.getByRole('button', { name: /History/ }))

    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('a database edit asks for no run', async () => {
    const user = userEvent.setup()
    await renderEdit({ fromDb: true })

    await user.click(screen.getByRole('button', { name: /History/ }))

    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('pausing an ordinary game (not an edit) asks for no run', async () => {
    const game = { id: 'n1', players: ['Ann'], scores: { Ann: [null, null] }, holes: 2, holePars: [3, 3] }
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Scorecard navigate={navigate} params={{ game }} />
      </AuthProvider>,
    )
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

    await user.click(screen.getByRole('button', { name: /Pause/ }))

    expect(navigate).toHaveBeenCalledWith('home')
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })
})
