import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import { AuthProvider, useAuth } from '../hooks/useAuth.jsx'
import { clearActiveGame, getActiveGame, getCompletedGames, markCompletedGamePending, saveActiveGame } from '../utils/storage.js'
import { isHeld, syncPendingRounds } from '../utils/sync.js'

// The Edit Round screen holds a local round while it is open, and asks for a
// sync run when the edit is abandoned or its stranded working copy is cleared
// (BACKLOG #113, PRD §11.8). The real runner and the real holds are used; only
// the entry point is spied so a test can see when a run was asked for.
vi.mock('../utils/sync.js', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, syncPendingRounds: vi.fn(actual.syncPendingRounds) }
})

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

const record = {
  id: 'round-1',
  players: ['Ann', 'Bob'],
  scores: { Ann: [3, 4], Bob: [4, 4] },
  holes: 2,
  holesPlayed: 2,
  completedAt: '2026-08-01T12:00:00.000Z',
  holePars: [3, 3],
  courseId: 'course-1',
  courseName: 'Bruntsfield',
}

const ok = body => Promise.resolve({ ok: true, status: 200, json: async () => body })

function mockFetch({ user = SIGNED_IN } = {}) {
  global.fetch = vi.fn((url, opts) => {
    const u = String(url)
    if (u.includes('/api/auth/me')) return ok({ user })
    if (u.includes('/api/courses')) return ok({ courses: [] })
    if (u === '/api/games' && opts?.method === 'POST') return ok({ id: 'srv-1' })
    return Promise.reject(new Error(`unexpected fetch: ${u}`))
  })
}

const posts = () => global.fetch.mock.calls.filter(([u, o]) => String(u) === '/api/games' && o?.method === 'POST')
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

// Renders Setup only once auth has resolved, so the user is known at mount
// (as it is when the screen is reached by navigating inside the running app).
function AfterAuth({ children }) {
  const { loading } = useAuth()
  return loading ? null : children
}

function renderSetup(params, { strict = false } = {}) {
  const navigate = vi.fn()
  const tree = (
    <AuthProvider>
      <AfterAuth>
        <Setup navigate={navigate} goBack={vi.fn()} params={params} />
      </AfterAuth>
    </AuthProvider>
  )
  const { unmount } = render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  return { navigate, unmount }
}

const runsAskedFor = () => syncPendingRounds.mock.calls.map(([id]) => id)

beforeEach(() => {
  localStorage.clear()
  syncPendingRounds.mockClear()
  mockFetch()
})

// Unmount first (a cleanup may itself start a run), then let any run finish so
// nothing leaks into the next test.
afterEach(async () => {
  cleanup()
  await Promise.all(syncPendingRounds.mock.results.map(r => r.value))
})

function seedPending() {
  localStorage.setItem('gt_completed_games', JSON.stringify([record]))
  markCompletedGamePending('round-1', 'u1', 'Kept note')
}

describe('Setup - holding a pending round while the Edit Round screen is open', () => {
  it('a real sync run sends nothing for the round while the screen is open, and the round is held', async () => {
    seedPending()
    renderSetup({ editRound: true, game: record })
    await screen.findByText('Edit Round')
    await settle()

    expect(isHeld('round-1')).toBe(true)
    const result = await syncPendingRounds('u1')

    expect(result).toEqual({ synced: 0, rejected: 0, remaining: 1 })
    expect(posts()).toHaveLength(0)
    expect(getCompletedGames()[0].pendingSyncUserId).toBe('u1')
  })

  it('releases the hold on unmount, and the round then goes out', async () => {
    seedPending()
    const { unmount } = renderSetup({ editRound: true, game: record })
    await screen.findByText('Edit Round')
    await settle()
    expect(isHeld('round-1')).toBe(true)

    unmount()
    expect(isHeld('round-1')).toBe(false)
    const result = await syncPendingRounds('u1')

    expect(result.synced).toBe(1)
    expect(posts()).toHaveLength(1)
  })

  it('still holds after a StrictMode double mount (hold taken, released and retaken)', async () => {
    seedPending()
    renderSetup({ editRound: true, game: record }, { strict: true })
    await screen.findByText('Edit Round')
    await settle()

    expect(isHeld('round-1')).toBe(true)
    await syncPendingRounds('u1')
    expect(posts()).toHaveLength(0)
  })

  it('a database edit takes no hold and asks for no sync run on unmount', async () => {
    const { unmount } = renderSetup({ editRound: true, game: { ...record, _fromDb: true } })
    await screen.findByText('Edit Round')
    await settle()
    expect(isHeld('round-1')).toBe(false)

    syncPendingRounds.mockClear()
    unmount()
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('a New Game screen takes no hold and asks for no sync run on unmount', async () => {
    const { unmount } = renderSetup({})
    await screen.findByText('New Game')
    await settle()
    expect(isHeld('round-1')).toBe(false)

    syncPendingRounds.mockClear()
    unmount()
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('signed out: the round is held, but leaving never asks for a sync run', async () => {
    mockFetch({ user: null })
    const { unmount } = renderSetup({ editRound: true, game: record })
    await screen.findByText('Edit Round')
    await settle()
    expect(isHeld('round-1')).toBe(true)

    unmount()
    expect(isHeld('round-1')).toBe(false)
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })
})

describe('Setup - leaving the Edit Round screen', () => {
  it('cancelling (no edit working copy) asks for a sync run for the signed-in user, and the round is sent', async () => {
    seedPending()
    const { unmount } = renderSetup({ editRound: true, game: record })
    await screen.findByText('Edit Round')
    await settle()

    unmount()

    expect(runsAskedFor()).toEqual(['u1'])
    const result = await syncPendingRounds.mock.results[0].value
    expect(result.synced).toBe(1)
    expect(posts()).toHaveLength(1)
    expect(JSON.parse(posts()[0][1].body).client_round_id).toBe('round-1')
  })

  it('leaving after the edit was started asks for no run, and the round is still not sent', async () => {
    seedPending()
    const user = userEvent.setup()
    const { navigate, unmount } = renderSetup({ editRound: true, game: record })
    await user.click(await screen.findByRole('button', { name: 'Edit hole scores' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('scorecard', expect.any(Object)))
    expect(getActiveGame()._edit).toEqual({ id: 'round-1', fromDb: false })

    unmount()

    expect(syncPendingRounds).not.toHaveBeenCalled()
    expect(isHeld('round-1')).toBe(false) // the hold is gone; the working copy protects it
    const result = await syncPendingRounds('u1')
    expect(result).toEqual({ synced: 0, rejected: 0, remaining: 1 })
    expect(posts()).toHaveLength(0)
  })

  it('no window: nothing is sent while Setup is open, after the edit starts, or until the edit is cancelled', async () => {
    seedPending()
    const user = userEvent.setup()
    const { navigate, unmount } = renderSetup({ editRound: true, game: record })
    await screen.findByText('Edit Round')
    await settle()

    // 1. Setup open: the hold protects the round.
    await syncPendingRounds('u1')
    expect(posts()).toHaveLength(0)

    // 2. The edit starts: `_edit` is saved before Setup goes, so at no point
    //    between the hold and the working copy is the round unprotected.
    await user.click(screen.getByRole('button', { name: 'Edit hole scores' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('scorecard', expect.any(Object)))
    await syncPendingRounds('u1')
    expect(posts()).toHaveLength(0)
    unmount() // Scorecard takes over
    await syncPendingRounds('u1')
    expect(posts()).toHaveLength(0)

    // 3. The edit is cancelled on the scorecard: the round is free to go.
    clearActiveGame()
    const result = await syncPendingRounds('u1')
    expect(result.synced).toBe(1)
    expect(posts()).toHaveLength(1)
  })
})

describe('Setup - the stranded edit guard', () => {
  function seedStranded() {
    seedPending()
    saveActiveGame({
      id: 'round-1',
      _edit: { id: 'round-1', fromDb: false },
      players: ['Ann', 'Bob'],
      scores: { Ann: [3, 4], Bob: [4, 4] },
      holes: 2,
    })
  }

  it('after clearing the stranded working copy, asks for a sync run for a signed-in user, and the round goes out', async () => {
    seedStranded()
    const { navigate } = renderSetup({})

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('history', { bruntsfield: false }, { replace: true }))
    expect(getActiveGame()).toBeNull()
    expect(runsAskedFor()).toEqual(['u1'])
    const result = await syncPendingRounds.mock.results[0].value
    expect(result.synced).toBe(1)
    expect(posts()).toHaveLength(1)
  })

  it('a signed-out user gets the same clear and redirect, and no sync run', async () => {
    mockFetch({ user: null })
    seedStranded()
    const { navigate } = renderSetup({})

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('history', { bruntsfield: false }, { replace: true }))
    expect(getActiveGame()).toBeNull()
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('a normal in-progress game (no _edit) triggers no sync run', async () => {
    saveActiveGame({ id: 'g2', players: ['Ann'], scores: { Ann: [3] }, holes: 2 })
    renderSetup({})
    await screen.findByText('New Game')
    await settle()
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })
})
