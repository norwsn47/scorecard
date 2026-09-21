import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './Scorecard.jsx'
import Summary from './Summary.jsx'
import { buildEditGame } from '../utils/game.js'
import { getActiveGame, getCompletedGames, markCompletedGamePending, markCompletedGameRejected } from '../utils/storage.js'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Editing a pending round (its save to D1 is still outstanding, BACKLOG #95,
// PRD §11.8 / §11.13) is local only and the round stays pending: the marker is
// kept, `synced` is never set, and Summary afterwards still treats it as pending.

// Saving the edit now asks for a background sync run (BACKLOG #113; covered in
// Scorecard.edit-sync.test.jsx). Neutralised here so these tests stay about the
// edit itself: what is written locally, and that the edit makes no request.
vi.mock('../utils/sync.js', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, syncPendingRounds: vi.fn(() => Promise.resolve({ synced: 0, rejected: 0, remaining: 0 })) }
})

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

const mockUser = user => {
  global.fetch = vi.fn(url => {
    if (String(url).includes('/api/auth/me')) return Promise.resolve({ ok: true, json: async () => ({ user }) })
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

function seed({ pending = true, rejected = false } = {}) {
  localStorage.setItem('gt_completed_games', JSON.stringify([record]))
  if (pending) markCompletedGamePending('g1', 'u1', 'Kept note')
  if (rejected) markCompletedGameRejected('g1')
}

// Builds the working copy the way Setup does for a local edit: from the record
// as History / Summary hand it over, tags and all.
function renderEdit(handedOver) {
  const working = buildEditGame(handedOver, ['Ann'], null, null, handedOver.completedAt, [3, 3])
  working._edit = { id: 'g1', fromDb: false }
  localStorage.setItem('gt_active_game', JSON.stringify(working))
  const navigate = vi.fn()
  const { unmount } = render(
    <AuthProvider>
      <Scorecard navigate={navigate} params={{ game: working, editContext: working._edit }} />
    </AuthProvider>,
  )
  return { navigate, unmount }
}

async function changeHole1AndSave(user) {
  await user.click(screen.getByLabelText('Increase score')) // Ann / hole 1: 3 -> 4
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.click(screen.getByRole('button', { name: /save changes/i }))
}

const stored = () => getCompletedGames().find(g => g.id === 'g1')

beforeEach(() => {
  localStorage.clear()
  mockUser(SIGNED_IN)
})

describe('Scorecard - editing a pending round', () => {
  it('writes the edit to the local record, keeps the pending marker and notes, and never sets synced', async () => {
    seed()
    const user = userEvent.setup()
    const handedOver = { ...stored(), _pending: true, _rejected: false } // as History tags it
    const { navigate } = renderEdit(handedOver)

    await changeHole1AndSave(user)

    const after = stored()
    expect(getCompletedGames()).toHaveLength(1)
    expect(after.scores.Ann[0]).toBe(4)
    expect(after.pendingSyncUserId).toBe('u1')
    expect(after.syncRejected).toBeUndefined()
    expect(after.synced).toBeUndefined()
    expect(after.notes).toBe('Kept note') // carried through the working copy, as Setup pre-fills it
    expect(navigate).toHaveBeenCalledWith('summary', expect.any(Object))
    // The active-game slot is released so the background sync can pick it up.
    expect(getActiveGame()).toBeNull()
  })

  it('hands Summary the stored record: marker kept, no synced flag, no leftover edit or display tags', async () => {
    seed()
    const user = userEvent.setup()
    const { navigate } = renderEdit({ ...stored(), _pending: true, _rejected: false })

    await changeHole1AndSave(user)

    const [page, params] = navigate.mock.calls[0]
    expect(page).toBe('summary')
    expect(params.game).toMatchObject({ id: 'g1', pendingSyncUserId: 'u1' })
    expect(params.game.scores.Ann[0]).toBe(4)
    expect(params.game.synced).toBeUndefined()
    expect(params.game._edit).toBeUndefined()
    expect(params.game._pending).toBeUndefined()
  })

  it('an edit does not clear the rejected flag', async () => {
    seed({ rejected: true })
    const user = userEvent.setup()
    const { navigate } = renderEdit({ ...stored(), _pending: true, _rejected: true })

    await changeHole1AndSave(user)

    expect(stored()).toMatchObject({ pendingSyncUserId: 'u1', syncRejected: true })
    expect(stored().synced).toBeUndefined()
    expect(navigate.mock.calls[0][1].game).toMatchObject({ pendingSyncUserId: 'u1', syncRejected: true })
  })

  it('makes no network request for the edit (local only)', async () => {
    seed()
    const user = userEvent.setup()
    renderEdit(stored())
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
    const before = global.fetch.mock.calls.length

    await changeHole1AndSave(user)

    expect(global.fetch.mock.calls.length).toBe(before)
  })

  it('Summary afterwards still shows the round as pending: read-only, status line, no Done', async () => {
    seed()
    const user = userEvent.setup()
    const { navigate, unmount } = renderEdit(stored())
    await changeHole1AndSave(user)
    const [, params] = navigate.mock.calls[0]

    // Fresh screen: unmount the Scorecard, then render Summary with what it was handed.
    unmount()
    render(
      <AuthProvider>
        <Summary navigate={vi.fn()} params={params} />
      </AuthProvider>,
    )
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

    expect(screen.getByText('Not yet saved to your account. It will save automatically when you have signal.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(global.fetch.mock.calls.some(([, o]) => o?.method === 'POST')).toBe(false)
  })
})

describe('Scorecard - editing a round that is not pending keeps its behaviour', () => {
  it('a signed-out local edit still hands Summary a synced round, with no pending marker', async () => {
    mockUser(null)
    seed({ pending: false })
    const user = userEvent.setup()
    const { navigate } = renderEdit(stored())

    await changeHole1AndSave(user)

    const [, params] = navigate.mock.calls[0]
    expect(params.game.synced).toBe(true)
    expect(params.game.pendingSyncUserId).toBeUndefined()
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(stored().scores.Ann[0]).toBe(4)
  })
})
