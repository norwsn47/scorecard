import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import History from './History.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getCompletedGames, markCompletedGamePending, markCompletedGameRejected, saveCompletedGame } from '../utils/storage.js'
import { syncPendingRounds } from '../utils/sync.js'

// Pending rounds in a signed-in History (BACKLOG #95, PRD §11.8 / §11.9): local
// rounds whose save to D1 is outstanding are listed with a badge, merged by
// date, deduped against the D1 rows, never truncated by the 100-row cap, and
// deletable locally. Storage is real localStorage; fetch is mocked.

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

const resp = (status, body = {}) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body })

function dbRow(id, playedAt, players = ['Ann'], extra = {}) {
  return {
    id,
    played_at: playedAt,
    holes_played: 2,
    course_id: null,
    course_name: null,
    notes: null,
    hole_pars: '[3,3]',
    client_round_id: null,
    player_data: JSON.stringify(players.map((name, i) => ({ name, scores: [3 + i, 3 + i], total: 6 + 2 * i }))),
    ...extra,
  }
}

function localRound(id, playedAt, players = ['Ann'], extra = {}) {
  return {
    id,
    completedAt: playedAt,
    holes: 2,
    holesPlayed: 2,
    players,
    scores: Object.fromEntries(players.map((p, i) => [p, [3 + i, 3 + i]])),
    holePars: [3, 3],
    ...extra,
  }
}

// Saves a local round; `pendingFor` tags it pending for that user id.
function seed(id, playedAt, players, { pendingFor = null, rejected = false, ...extra } = {}) {
  saveCompletedGame(localRound(id, playedAt, players, extra))
  if (pendingFor !== null) markCompletedGamePending(id, pendingFor, '')
  if (rejected) markCompletedGameRejected(id)
}

// `games` may be an array or a function (so a later load can answer differently).
function mockApi({ user = SIGNED_IN, games = [], gamesStatus = 200, post = () => resp(201), del = () => resp(200) } = {}) {
  global.fetch = vi.fn((url, opts = {}) => {
    if (url.includes('/api/auth/me')) return resp(200, { user })
    if (url === '/api/games' && !opts.method) {
      return gamesStatus === 'network'
        ? Promise.reject(new TypeError('Failed to fetch'))
        : resp(gamesStatus, { games: typeof games === 'function' ? games() : games })
    }
    if (url === '/api/games' && opts.method === 'POST') return post(opts)
    if (url.startsWith('/api/games/') && opts.method === 'DELETE') return del(url)
    return Promise.reject(new Error(`unexpected fetch: ${opts.method ?? 'GET'} ${url}`))
  })
}

const tick = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

// Renders History under the real AuthProvider and lets the session check and
// the D1 load both settle.
async function renderHistory() {
  const navigate = vi.fn()
  const view = render(
    <AuthProvider>
      <History navigate={navigate} goBack={vi.fn()} />
    </AuthProvider>,
  )
  await tick()
  await tick()
  return { navigate, ...view }
}

const openButtons = () => screen.queryAllByRole('button', { name: /^Open round/ })
const openNames = () => openButtons().map(b => b.getAttribute('aria-label'))
const calls = (method, matcher = () => true) =>
  global.fetch.mock.calls.filter(([url, opts]) => (opts?.method ?? 'GET') === method && matcher(url))
const gamesGets = () => calls('GET', url => url === '/api/games')

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({ depth: 1 }, '', '/history')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('History - a pending round shows its status (signed in)', () => {
  it('shows a "Not yet saved" badge on a pending round and none on a saved one', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi({ games: [dbRow('d1', '2026-08-01T10:00:00.000Z', ['Saved'])] })
    await renderHistory()

    const pendingCard = screen.getByRole('button', { name: /^Open round.*Pending/ }).parentElement
    const savedCard = screen.getByRole('button', { name: /^Open round.*Saved/ }).parentElement
    expect(within(pendingCard).getByText('Not yet saved')).toBeInTheDocument()
    expect(within(savedCard).queryByText('Not yet saved')).not.toBeInTheDocument()
    expect(screen.getAllByText('Not yet saved')).toHaveLength(1)
  })

  it('gives a rejected round distinct wording and says where it is kept', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Refused'], { pendingFor: 'u1', rejected: true })
    mockApi()
    await renderHistory()

    expect(screen.getByText("Can't be saved")).toBeInTheDocument()
    expect(screen.getByText('Kept on this device only.')).toBeInTheDocument()
    expect(screen.queryByText('Not yet saved')).not.toBeInTheDocument()
  })

  it('exposes the status as text and in the open button\'s accessible name', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    seed('p2', '2026-08-03T10:00:00.000Z', ['Refused'], { pendingFor: 'u1', rejected: true })
    mockApi({ games: [dbRow('d1', '2026-08-01T10:00:00.000Z', ['Saved'])] })
    await renderHistory()

    // Real text in the accessibility tree, not a CSS pseudo-element or an icon.
    expect(screen.getByText('Not yet saved')).toBeVisible()
    expect(screen.getByRole('button', { name: /^Open round: .*Pending, not yet saved$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Open round: .*Refused, can't be saved, kept on this device only$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Open round: .*Saved$/ })).toBeInTheDocument()
  })

  it('keeps the card layering: the badge sits in the pointer-events-none content, the open button behind it', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi()
    await renderHistory()

    const badge = screen.getByText('Not yet saved')
    expect(badge.closest('.pointer-events-none')).not.toBeNull()
    const card = badge.closest('.pointer-events-none').parentElement
    expect(within(card).getByRole('button', { name: /^Open round/ })).toHaveClass('absolute', 'inset-0')
  })

  it('opens a pending round with the local record, as any other row does', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi()
    const user = userEvent.setup()
    const { navigate } = await renderHistory()

    await user.click(screen.getByRole('button', { name: /^Open round/ }))

    expect(navigate).toHaveBeenCalledWith('summary', {
      game: expect.objectContaining({ id: 'p1', pendingSyncUserId: 'u1', players: ['Pending'] }),
      fromHistory: true,
    })
  })
})

describe('History - merging pending rounds with the saved list', () => {
  it('orders saved and pending rounds together, newest played date first', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Middle'], { pendingFor: 'u1' })
    seed('p2', '2026-07-01T10:00:00.000Z', ['Oldest'], { pendingFor: 'u1' })
    mockApi({ games: [
      dbRow('d1', '2026-08-03T10:00:00.000Z', ['Newest']),
      dbRow('d2', '2026-08-01T10:00:00.000Z', ['Later']),
    ] })
    await renderHistory()

    const order = openNames().map(n => ['Newest', 'Middle', 'Later', 'Oldest'].find(p => n.includes(p)))
    expect(order).toEqual(['Newest', 'Middle', 'Later', 'Oldest'])
  })

  it('shows a round once, as the saved row, when the server already holds it (same client_round_id)', async () => {
    // Saved, but the response was lost so the local marker is not cleared yet.
    seed('p1', '2026-08-02T10:00:00.000Z', ['Twin'], { pendingFor: 'u1' })
    mockApi({ games: [dbRow('d1', '2026-08-02T10:00:00.000Z', ['Twin'], { client_round_id: 'p1' })] })
    await renderHistory()

    expect(openButtons()).toHaveLength(1)
    expect(screen.queryByText('Not yet saved')).not.toBeInTheDocument()
    expect(openNames()[0]).not.toMatch(/not yet saved/i)
  })

  it('shows every pending round in addition to a full 100-row saved list (never capped)', async () => {
    const base = Date.UTC(2026, 7, 20, 10, 0, 0)
    const rows = Array.from({ length: 100 }, (_, i) => dbRow(`d${i}`, new Date(base - i * 3600000).toISOString(), ['Saved']))
    // Older than every saved row, so a merged list cut at 100 would lose them.
    seed('p1', '2025-01-01T10:00:00.000Z', ['Old one'], { pendingFor: 'u1' })
    seed('p2', '2025-01-02T10:00:00.000Z', ['Old two'], { pendingFor: 'u1' })
    seed('p3', '2025-01-03T10:00:00.000Z', ['Old three'], { pendingFor: 'u1', rejected: true })
    mockApi({ games: rows })
    await renderHistory()

    expect(openButtons()).toHaveLength(103)
    expect(screen.getAllByText('Not yet saved')).toHaveLength(2)
    expect(screen.getAllByText("Can't be saved")).toHaveLength(1)
    // ...and they sort to the bottom, after all 100 saved rows.
    expect(openNames().slice(-3).map(n => ['Old three', 'Old two', 'Old one'].find(p => n.includes(p)))).toEqual(['Old three', 'Old two', 'Old one'])
  })

  it('never shows another user\'s pending round or an unmarked quick-play round', async () => {
    seed('mine', '2026-08-03T10:00:00.000Z', ['Mine'], { pendingFor: 'u1' })
    seed('theirs', '2026-08-02T10:00:00.000Z', ['Theirs'], { pendingFor: 'u2' })
    seed('quick', '2026-08-01T10:00:00.000Z', ['Quickplay'])
    seed('synced', '2026-07-31T10:00:00.000Z', ['Synced'], { synced: true })
    mockApi()
    await renderHistory()

    expect(openNames()).toHaveLength(1)
    expect(openNames()[0]).toMatch(/Mine/)
    expect(screen.queryByText('Theirs')).not.toBeInTheDocument()
    expect(screen.queryByText('Quickplay')).not.toBeInTheDocument()
    expect(screen.queryByText('Synced')).not.toBeInTheDocument()
  })

  it('shows quick-play rounds as "No rounds yet" for a signed-in user who has nothing saved or pending', async () => {
    seed('quick', '2026-08-01T10:00:00.000Z', ['Quickplay'])
    mockApi()
    await renderHistory()

    expect(screen.getByText('No rounds yet')).toBeInTheDocument()
    expect(screen.queryByText('Quickplay')).not.toBeInTheDocument()
  })

  it('does not show the "No rounds yet" empty state when only pending rounds exist', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi({ games: [] })
    await renderHistory()

    expect(screen.queryByText('No rounds yet')).not.toBeInTheDocument()
    expect(openButtons()).toHaveLength(1)
  })

  it('includes pending rounds\' players in the player filter chips, and filters on them', async () => {
    const user = userEvent.setup()
    seed('p1', '2026-08-02T10:00:00.000Z', ['Ann', 'Cass'], { pendingFor: 'u1' })
    mockApi({ games: [dbRow('d1', '2026-08-01T10:00:00.000Z', ['Ann', 'Bo'])] })
    await renderHistory()

    const chips = screen.getByRole('group', { name: 'Filter by player' })
    expect(within(chips).getByRole('button', { name: /^Cass/ })).toBeInTheDocument()

    await user.click(within(chips).getByRole('button', { name: /^Cass/ }))
    expect(openButtons()).toHaveLength(1)
    expect(openNames()[0]).toMatch(/not yet saved/)
  })

  it('includes a pending round\'s course in the course filter', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Ann'], { pendingFor: 'u1', courseName: 'Elsewhere' })
    mockApi({ games: [dbRow('d1', '2026-08-01T10:00:00.000Z', ['Ann'], { course_name: 'Bruntsfield' })] })
    await renderHistory()

    const chips = screen.getByRole('group', { name: 'Filter by course' })
    expect(within(chips).getByRole('button', { name: 'Elsewhere' })).toBeInTheDocument()
  })
})

describe('History - pending rounds when the saved list will not load', () => {
  it('lists pending rounds under the error block, keeps Try again, and hides the empty state', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi({ gamesStatus: 500 })
    await renderHistory()

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your rounds")
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText('No rounds yet')).not.toBeInTheDocument()
    expect(openButtons()).toHaveLength(1)
    expect(screen.getByText('Not yet saved')).toBeInTheDocument()
  })

  it('does the same after a network failure', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi({ gamesStatus: 'network' })
    await renderHistory()

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your rounds")
    expect(openButtons()).toHaveLength(1)
  })

  it('does the same when signed out mid-session (401): Sign in stays, pending rounds still list', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi({ gamesStatus: 401 })
    await renderHistory()

    expect(screen.getByRole('alert')).toHaveTextContent("You've been signed out")
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('No rounds yet')).not.toBeInTheDocument()
    expect(openButtons()).toHaveLength(1)
  })

  it('still shows the plain error and no empty state when nothing is pending', async () => {
    mockApi({ gamesStatus: 500 })
    await renderHistory()

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your rounds")
    expect(screen.queryByText('No rounds yet')).not.toBeInTheDocument()
    expect(openButtons()).toHaveLength(0)
  })
})

describe('History - deleting a pending round', () => {
  it('removes the local record only: no server call, no waiting, sheet closes', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    seed('p2', '2026-08-01T10:00:00.000Z', ['Other'], { pendingFor: 'u1' })
    mockApi()
    const user = userEvent.setup()
    await renderHistory()
    const before = global.fetch.mock.calls.length

    const card = screen.getByRole('button', { name: /^Open round.*Pending/ }).parentElement
    await user.click(within(card).getByRole('button', { name: 'Delete round' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Delete this round?' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(global.fetch.mock.calls.length).toBe(before) // nothing was requested
    expect(calls('DELETE')).toHaveLength(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getCompletedGames().map(g => g.id)).toEqual(['p2'])
    expect(openButtons()).toHaveLength(1)
    expect(openNames()[0]).toMatch(/Other/)
  })

  it('deletes a rejected round locally too', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Refused'], { pendingFor: 'u1', rejected: true })
    mockApi()
    const user = userEvent.setup()
    await renderHistory()

    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(calls('DELETE')).toHaveLength(0)
    expect(getCompletedGames()).toHaveLength(0)
  })

  it('blocks the delete with a calm message while a save of that round is in flight, and works once it has finished', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    let release
    // Every load answers with whatever the server holds; a saved round would
    // come back as a row, but here the POST is held, so it does not.
    mockApi({ post: () => new Promise(resolve => { release = () => resolve({ ok: false, status: 503, json: async () => ({}) }) }) })
    const user = userEvent.setup()
    await renderHistory()

    const run = syncPendingRounds('u1')
    await tick() // the POST is now in flight

    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    const dialog = screen.getByRole('dialog') // still open
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Saving this round - try again in a moment.')
    expect(getCompletedGames().map(g => g.id)).toEqual(['p1']) // not deleted
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeEnabled()

    // The save ends (it failed, so the round stays pending); trying again now works.
    await act(async () => { release(); await run })
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getCompletedGames()).toHaveLength(0)
  })

  it('clears the "saving" message when the sheet is closed and reopened', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    let release
    mockApi({ post: () => new Promise(resolve => { release = () => resolve({ ok: false, status: 503, json: async () => ({}) }) }) })
    const user = userEvent.setup()
    await renderHistory()
    const run = syncPendingRounds('u1')
    await tick()

    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Delete round' }))

    expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument()
    await act(async () => { release(); await run })
  })
})

describe('History - deleting a saved round is unchanged', () => {
  it('waits for the server, then removes the row', async () => {
    let release
    mockApi({
      games: [dbRow('d1', '2026-08-01T10:00:00.000Z', ['Saved'])],
      del: () => new Promise(resolve => { release = () => resolve({ ok: true, status: 200, json: async () => ({}) }) }),
    })
    const user = userEvent.setup()
    await renderHistory()

    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(calls('DELETE')).toHaveLength(1)
    expect(calls('DELETE')[0][0]).toBe('/api/games/d1')
    // In flight: the sheet stays, its buttons are locked.
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(openButtons()).toHaveLength(1)

    await act(async () => { release() })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openButtons()).toHaveLength(0)
  })

  it('keeps the row and says so in the sheet when the server fails', async () => {
    mockApi({
      games: [dbRow('d1', '2026-08-01T10:00:00.000Z', ['Saved'])],
      del: () => resp(500),
    })
    const user = userEvent.setup()
    await renderHistory()

    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent("Couldn't delete this round")
    expect(openButtons()).toHaveLength(1)
  })

  it('also removes a still-pending local twin of the round, so a later sync cannot send it back', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Twin'], { pendingFor: 'u1' })
    mockApi({ games: [dbRow('d1', '2026-08-02T10:00:00.000Z', ['Twin'], { client_round_id: 'p1' })] })
    const user = userEvent.setup()
    await renderHistory()
    expect(openButtons()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(calls('DELETE')).toHaveLength(1)
    expect(getCompletedGames()).toHaveLength(0)
    expect(openButtons()).toHaveLength(0)
  })

  it('leaves an unmarked local copy of a saved round alone', async () => {
    seed('q1', '2026-08-02T10:00:00.000Z', ['Twin'], { synced: true })
    mockApi({ games: [dbRow('d1', '2026-08-02T10:00:00.000Z', ['Twin'], { client_round_id: 'q1' })] })
    const user = userEvent.setup()
    await renderHistory()

    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(getCompletedGames().map(g => g.id)).toEqual(['q1'])
  })
})

describe('History - reacting to a background sync', () => {
  it('reloads when a sync saves a round, so it shows once, as the saved row', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Twin'], { pendingFor: 'u1' })
    let serverHasIt = false
    mockApi({
      games: () => (serverHasIt ? [dbRow('d1', '2026-08-02T10:00:00.000Z', ['Twin'], { client_round_id: 'p1' })] : []),
      post: () => { serverHasIt = true; return resp(201) },
    })
    await renderHistory()
    expect(screen.getByText('Not yet saved')).toBeInTheDocument()
    expect(gamesGets()).toHaveLength(1)

    await act(async () => { await syncPendingRounds('u1') })
    await tick()

    expect(gamesGets()).toHaveLength(2)
    expect(openButtons()).toHaveLength(1)
    expect(screen.queryByText('Not yet saved')).not.toBeInTheDocument()
  })

  it('reloads when a sync flags a round as rejected, and the badge changes wording', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi({ post: () => resp(400) })
    await renderHistory()
    expect(screen.getByText('Not yet saved')).toBeInTheDocument()

    await act(async () => { await syncPendingRounds('u1') })
    await tick()

    expect(screen.getByText("Can't be saved")).toBeInTheDocument()
    expect(screen.queryByText('Not yet saved')).not.toBeInTheDocument()
  })

  it('stops listening once History is unmounted', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi()
    const { unmount } = await renderHistory()
    expect(gamesGets()).toHaveLength(1)

    unmount()
    await act(async () => { await syncPendingRounds('u1') })

    expect(gamesGets()).toHaveLength(1) // no reload after unmount
  })

  it('"Try again" reloads the saved list and picks pending rounds up again', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    let status = 500
    global.fetch = vi.fn((url, opts = {}) => {
      if (url.includes('/api/auth/me')) return resp(200, { user: SIGNED_IN })
      if (url === '/api/games' && !opts.method) {
        return status === 200 ? resp(200, { games: [dbRow('d1', '2026-08-01T10:00:00.000Z', ['Saved'])] }) : resp(status)
      }
      return Promise.reject(new Error('unexpected'))
    })
    const user = userEvent.setup()
    await renderHistory()
    expect(openButtons()).toHaveLength(1)

    status = 200
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await tick()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(openButtons()).toHaveLength(2)
  })
})

describe('History - signed out is unchanged', () => {
  it('lists every local round, including a still-pending one, with no badge', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    seed('p2', '2026-08-01T10:00:00.000Z', ['Refused'], { pendingFor: 'u1', rejected: true })
    seed('q1', '2026-07-31T10:00:00.000Z', ['Quickplay'])
    mockApi({ user: null })
    await renderHistory()

    expect(openButtons()).toHaveLength(3)
    expect(screen.queryByText('Not yet saved')).not.toBeInTheDocument()
    expect(screen.queryByText("Can't be saved")).not.toBeInTheDocument()
    expect(screen.queryByText('Kept on this device only.')).not.toBeInTheDocument()
    expect(openNames().join(' ')).not.toMatch(/not yet saved|can't be saved/i)
    expect(calls('GET', url => url === '/api/games')).toHaveLength(0)
  })

  it('deletes a still-pending round locally from signed-out History', async () => {
    seed('p1', '2026-08-02T10:00:00.000Z', ['Pending'], { pendingFor: 'u1' })
    mockApi({ user: null })
    const user = userEvent.setup()
    await renderHistory()

    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(getCompletedGames()).toHaveLength(0)
    expect(calls('DELETE')).toHaveLength(0)
  })
})
