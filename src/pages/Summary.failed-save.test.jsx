import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Summary from './Summary.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getCompletedGames, markCompletedGamePending, saveCompletedGame } from '../utils/storage.js'
import { isHeld, postRound, syncPendingRounds } from '../utils/sync.js'

// Marking a round pending at the FIRST failed save, holding it while the error
// shows, and syncing when the user leaves (BACKLOG #112, PRD §11.8). The rest
// of Summary's failed-save behaviour (copy, Retry, Keep wording) is covered in
// Summary.test.jsx; these tests are about what is written, held and triggered.

// Pass-throughs by default, so the real implementations run; a test can force a
// throw from postRound (the handler's catch branch) or count the marker writes.
vi.mock('../utils/sync.js', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, postRound: vi.fn(actual.postRound), syncPendingRounds: vi.fn(actual.syncPendingRounds) }
})
vi.mock('../utils/storage.js', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, markCompletedGamePending: vi.fn(actual.markCompletedGamePending) }
})

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

function baseGame(overrides = {}) {
  return {
    id: 'round-1',
    courseId: 'course-1',
    courseName: 'Bruntsfield',
    completedAt: '2026-08-01T12:00:00.000Z',
    holes: 2,
    holesPlayed: 2,
    holePars: [3, 3],
    players: ['Ann', 'Bo'],
    scores: { Ann: [3, 3], Bo: [4, 4] },
    ...overrides,
  }
}

const failWith = status => () => Promise.resolve({ ok: false, status, json: async () => ({ error: 'nope' }) })
const okResponse = () => Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'srv-1' }) })

function mockFetch({ user = SIGNED_IN, postGames = okResponse } = {}) {
  global.fetch = vi.fn((url, opts) => {
    if (url.includes('/api/auth/me')) return Promise.resolve({ ok: true, json: async () => ({ user }) })
    if (url === '/api/games' && opts?.method === 'POST') return postGames(opts)
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

const gamePosts = () => global.fetch.mock.calls.filter(([url, opts]) => url === '/api/games' && opts?.method === 'POST')
const meCalls = () => global.fetch.mock.calls.filter(([url]) => url.includes('/api/auth/me'))
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
const stored = () => getCompletedGames().find(g => g.id === 'round-1')
const keepButton = () => screen.getByRole('button', { name: 'Keep on this device and go home' })
const noteField = () => screen.getByPlaceholderText('Add a note about this round...')

async function renderSummary(game, { strict = false } = {}) {
  saveCompletedGame(game)
  const navigate = vi.fn()
  const tree = (
    <AuthProvider>
      <Summary navigate={navigate} params={{ game }} />
    </AuthProvider>
  )
  const view = render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  await settle()
  return { navigate, unmount: view.unmount }
}

// The storage-resolved paths: no `game` param, so Summary re-reads the round
// from storage on every render (the bounce back onto the screen, PRD §11.8).
async function renderSummaryFromStorage(game, params) {
  saveCompletedGame(game)
  const navigate = vi.fn()
  const view = render(
    <AuthProvider>
      <Summary navigate={navigate} params={params ?? { gameId: game.id }} />
    </AuthProvider>,
  )
  await settle()
  return { navigate, unmount: view.unmount }
}

const STATUS_LINE = 'Not yet saved to your account'

async function failFirstSave(user, navigate) {
  await user.click(screen.getByRole('button', { name: 'Done' }))
  await screen.findByRole('alert')
  expect(navigate).not.toHaveBeenCalled()
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({ depth: 1 }, '', '/summary')
  vi.mocked(markCompletedGamePending).mockClear()
  vi.mocked(syncPendingRounds).mockClear()
})

afterEach(() => {
  // Leaving with a pending round triggers a background run. RTL unmounts after
  // this hook, so make any such run fail fast instead of hanging on a test's
  // unresolved fetch and leaking its guard into later tests.
  global.fetch = vi.fn(() => Promise.reject(new TypeError('offline')))
  vi.restoreAllMocks()
})

describe('Summary - the first failed save marks the round pending (#112)', () => {
  it.each([
    ['a 5xx', () => mockFetch({ postGames: failWith(500) }), "Couldn't save this round"],
    ['a network error', () => mockFetch({ postGames: () => Promise.reject(new TypeError('Failed to fetch')) }), "Couldn't save this round"],
    ['a 401', () => mockFetch({ postGames: failWith(401) }), "You've been signed out"],
    ['a 400', () => mockFetch({ postGames: failWith(400) }), "Your account couldn't take this round"],
  ])('%s marks the round pending for the signed-in user, holds it, and keeps the same copy', async (_label, setup, copy) => {
    setup()
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)

    await failFirstSave(user, navigate)

    expect(screen.getByRole('alert')).toHaveTextContent(copy)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
    expect(keepButton()).toBeEnabled()
    expect(stored().pendingSyncUserId).toBe('u1')
    expect(stored().synced).toBeUndefined()
    expect(stored().syncRejected).toBeUndefined()
    expect(isHeld('round-1')).toBe(true)
    expect(markCompletedGamePending).toHaveBeenCalledTimes(1)
    expect(markCompletedGamePending).toHaveBeenCalledWith('round-1', 'u1', '')
  })

  it('a timeout marks it pending too, and the copy is the same', async () => {
    mockFetch({ postGames: () => new Promise(() => {}) })
    const { navigate } = await renderSummary(baseGame())

    vi.useFakeTimers()
    try {
      act(() => { screen.getByRole('button', { name: 'Done' }).click() })
      await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    } finally {
      vi.useRealTimers()
    }

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(stored().pendingSyncUserId).toBe('u1')
    expect(isHeld('round-1')).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('a thrown error marks it pending too, and the copy is the same', async () => {
    mockFetch()
    vi.mocked(postRound).mockImplementationOnce(() => Promise.reject(new Error('boom')))
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await failFirstSave(user, navigate)

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(keepButton()).toBeEnabled()
    expect(stored().pendingSyncUserId).toBe('u1')
    expect(isHeld('round-1')).toBe(true)
  })

  it('stores the note typed before the failure on the pending round', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.type(noteField(), '  Windy  ')
    await failFirstSave(user, navigate)

    expect(stored().notes).toBe('Windy')
  })

  it('does not mark the round when the local write fails: device-full copy, no Keep, nothing marked, no hold left', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    const before = localStorage.getItem('gt_completed_games')

    const realSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'gt_completed_games') throw new Error('QuotaExceededError')
      return realSetItem.call(this, key, value)
    })
    await failFirstSave(user, navigate)

    expect(screen.getByRole('alert')).toHaveTextContent("couldn't store the round either")
    expect(screen.queryByRole('button', { name: 'Keep on this device and go home' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
    expect(localStorage.getItem('gt_completed_games')).toBe(before)
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)
  })

  it('after a failed mark, a later failed Retry tries to mark again and, once it works, offers Keep', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    const realSetItem = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'gt_completed_games') throw new Error('QuotaExceededError')
      return realSetItem.call(this, key, value)
    })
    await failFirstSave(user, navigate)
    expect(stored().pendingSyncUserId).toBeUndefined()

    spy.mockRestore() // the device has room again
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(gamePosts()).toHaveLength(2))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save this round"))
    expect(keepButton()).toBeEnabled()
    expect(stored().pendingSyncUserId).toBe('u1')
    expect(isHeld('round-1')).toBe(true)
    expect(markCompletedGamePending).toHaveBeenCalledTimes(2)
  })

  it('a successful first Done never marks or holds the round', async () => {
    mockFetch()
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(markCompletedGamePending).not.toHaveBeenCalled()
    expect(stored().synced).toBe(true)
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)
    // No background run is started for a round that saved.
    expect(syncPendingRounds).not.toHaveBeenCalled()
    await settle()
    expect(gamePosts()).toHaveLength(1)
    expect(meCalls()).toHaveLength(1) // AuthProvider's own
  })

  it('a signed-out user never gets a marker, a hold, or a request on Done, or when leaving', async () => {
    mockFetch({ user: null })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(navigate).toHaveBeenCalledWith('home')
    expect(markCompletedGamePending).not.toHaveBeenCalled()
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)
    expect(gamePosts()).toHaveLength(0)
    unmount()
    await settle()
    expect(gamePosts()).toHaveLength(0)
    expect(meCalls()).toHaveLength(1) // AuthProvider's own; no sync run
  })

  it('a signed-in user object with no id never gets a marker or a hold', async () => {
    mockFetch({ user: { email: 'ann@example.com', name: 'Ann' }, postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())

    await failFirstSave(user, navigate)

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(markCompletedGamePending).not.toHaveBeenCalled()
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)
    unmount()
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('holds the round through StrictMode\'s double effect: the failure is handled as a mounted screen', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame(), { strict: true })
    const meBefore = meCalls().length // StrictMode doubles AuthProvider's own check

    await failFirstSave(user, navigate)

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(stored().pendingSyncUserId).toBe('u1')
    expect(isHeld('round-1')).toBe(true)
    // The dev-only cleanup ran with nothing held and did not trigger a sync.
    expect(meCalls()).toHaveLength(meBefore)
  })
})

describe('Summary - leaving a failed save (#112)', () => {
  it('back or close (unmount) without Keep leaves the round pending, releases the hold, and triggers a sync', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)
    expect(isHeld('round-1')).toBe(true)
    expect(gamePosts()).toHaveLength(1)

    unmount()

    expect(isHeld('round-1')).toBe(false)
    expect(stored().pendingSyncUserId).toBe('u1')
    expect(syncPendingRounds).toHaveBeenCalledTimes(1)
    expect(syncPendingRounds).toHaveBeenCalledWith('u1')
    // The run checks the session, then POSTs the round again.
    await waitFor(() => expect(gamePosts()).toHaveLength(2))
    expect(meCalls()).toHaveLength(2)
    expect(stored().pendingSyncUserId).toBe('u1')
    expect(stored().synced).toBeUndefined()
  })

  it('the sync started on leaving saves the round when the server is back', async () => {
    let call = 0
    mockFetch({ postGames: () => (++call === 1 ? failWith(503)() : okResponse()) })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)

    unmount()

    await waitFor(() => expect(stored().synced).toBe(true))
    expect(stored().pendingSyncUserId).toBeUndefined()
  })

  it('Keep only navigates and triggers a sync: it does not mark the round a second time', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)
    expect(markCompletedGamePending).toHaveBeenCalledTimes(1)
    const recordBefore = stored()

    await user.click(keepButton())

    expect(navigate).toHaveBeenCalledWith('home')
    expect(markCompletedGamePending).toHaveBeenCalledTimes(1)
    expect(stored()).toEqual(recordBefore)
    expect(isHeld('round-1')).toBe(false)
    expect(syncPendingRounds).toHaveBeenCalledTimes(1)
    expect(syncPendingRounds).toHaveBeenCalledWith('u1')
    await waitFor(() => expect(gamePosts()).toHaveLength(2)) // the sync it triggered
  })

  it('Keep followed by the unmount does not start a second sync', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)

    await user.click(keepButton())
    await waitFor(() => expect(gamePosts()).toHaveLength(2))
    unmount()
    await settle()
    await settle()

    expect(syncPendingRounds).toHaveBeenCalledTimes(1)
    expect(gamePosts()).toHaveLength(2)
    expect(meCalls()).toHaveLength(2) // AuthProvider's + exactly one run
  })

  it('a failure landing after the screen has gone marks the round and syncs, without taking a hold', async () => {
    let calls = 0
    let land
    mockFetch({
      postGames: () => (++calls === 1
        ? new Promise(resolve => { land = () => resolve({ ok: false, status: 503, json: async () => ({}) }) })
        : failWith(503)()),
    })
    const user = userEvent.setup()
    const { unmount } = await renderSummary(baseGame())
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(stored().pendingSyncUserId).toBeUndefined()

    unmount() // the back gesture while "Saving..." is showing
    await settle()
    expect(gamePosts()).toHaveLength(1)
    expect(meCalls()).toHaveLength(1) // nothing was held, so no sync yet

    await act(async () => { land() })

    expect(stored().pendingSyncUserId).toBe('u1')
    expect(isHeld('round-1')).toBe(false)
    await waitFor(() => expect(gamePosts()).toHaveLength(2)) // the sync it triggered
    expect(meCalls()).toHaveLength(2)
  })

  it('a success landing after the screen has gone still marks the round synced', async () => {
    let land
    mockFetch({ postGames: () => new Promise(resolve => { land = () => resolve({ ok: true, status: 200, json: async () => ({}) }) }) })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await screen.findByRole('button', { name: 'Saving…' })

    unmount()
    await act(async () => { land() })

    expect(stored().synced).toBe(true)
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)
    expect(markCompletedGamePending).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('home') // pre-existing behaviour, unchanged
    expect(gamePosts()).toHaveLength(1)
  })
})

describe('Summary - unmounting while a Retry is in flight (#112)', () => {
  // First POST fails, the Retry's POST is deferred so the test decides when and
  // how it lands. Any later POST (a sync run) fails fast.
  async function retryInFlight() {
    let land
    let call = 0
    mockFetch({
      postGames: () => {
        call += 1
        if (call === 1) return failWith(500)()
        if (call === 2) return new Promise(resolve => { land = resolve })
        return failWith(503)()
      },
    })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('button', { name: 'Retrying…' })).toBeDisabled()
    expect(gamePosts()).toHaveLength(2)
    return { land: response => act(async () => { land(response) }), unmount }
  }

  it('the unmount releases the hold but starts no sync; a failure landing afterwards then triggers one', async () => {
    const { land, unmount } = await retryInFlight()

    unmount()
    await settle()

    expect(isHeld('round-1')).toBe(false)
    expect(syncPendingRounds).not.toHaveBeenCalled()
    expect(meCalls()).toHaveLength(1) // AuthProvider's own
    expect(gamePosts()).toHaveLength(2)

    await land({ ok: false, status: 503, json: async () => ({}) })

    expect(syncPendingRounds).toHaveBeenCalledTimes(1)
    expect(syncPendingRounds).toHaveBeenCalledWith('u1')
    expect(stored().pendingSyncUserId).toBe('u1')
    await waitFor(() => expect(gamePosts()).toHaveLength(3)) // the run it started
    expect(meCalls()).toHaveLength(2)
  })

  it('a success landing afterwards clears the marker, marks it synced, and triggers no sync', async () => {
    const { land, unmount } = await retryInFlight()

    unmount()
    await settle()
    expect(syncPendingRounds).not.toHaveBeenCalled()

    await land({ ok: true, status: 200, json: async () => ({}) })
    await settle()

    expect(stored().synced).toBe(true)
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)
    expect(syncPendingRounds).not.toHaveBeenCalled()
    expect(gamePosts()).toHaveLength(2)
    expect(meCalls()).toHaveLength(1)
  })
})

describe('Summary - a round resolved from storage keeps its error screen (#112)', () => {
  const bothPaths = [
    ['params.gameId', undefined],
    ['no game param at all', {}],
  ]

  it.each(bothPaths)('after a failed Done (%s) the error card, Retry, Keep and the notes field stay, with no read-only status line', async (_label, params) => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummaryFromStorage(baseGame(), params)
    await failFirstSave(user, navigate)

    expect(stored().pendingSyncUserId).toBe('u1') // the marker is there, and the next render re-read it
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
    expect(keepButton()).toBeEnabled()
    expect(noteField()).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByText(STATUS_LINE, { exact: false })).not.toBeInTheDocument()
    expect(isHeld('round-1')).toBe(true)
  })

  it('Done is still the Retry path: it POSTs again from the same screen', async () => {
    let call = 0
    mockFetch({ postGames: () => (++call === 1 ? failWith(500)() : failWith(503)()) })
    const user = userEvent.setup()
    const { navigate } = await renderSummaryFromStorage(baseGame())
    await failFirstSave(user, navigate)

    await user.click(screen.getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(gamePosts()).toHaveLength(2))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(screen.queryByText(STATUS_LINE, { exact: false })).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('Keep still leaves and triggers the sync', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummaryFromStorage(baseGame())
    await failFirstSave(user, navigate)

    await user.click(keepButton())

    expect(navigate).toHaveBeenCalledWith('home')
    expect(isHeld('round-1')).toBe(false)
    expect(syncPendingRounds).toHaveBeenCalledTimes(1)
    expect(syncPendingRounds).toHaveBeenCalledWith('u1')
    await waitFor(() => expect(gamePosts()).toHaveLength(2))
  })

  it('a Retry success clears the marker, marks it synced and goes home', async () => {
    let call = 0
    mockFetch({ postGames: () => (++call === 1 ? failWith(500)() : okResponse()) })
    const user = userEvent.setup()
    const { navigate } = await renderSummaryFromStorage(baseGame())
    await failFirstSave(user, navigate)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(stored().synced).toBe(true)
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)
    expect(syncPendingRounds).not.toHaveBeenCalled()
  })

  it('a round that was already pending on arrival is unaffected: read-only, with the status line, no error card', async () => {
    mockFetch()
    await renderSummaryFromStorage(baseGame({ pendingSyncUserId: 'u1' }))

    expect(screen.getByText(STATUS_LINE, { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Add a note about this round...')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled()
    expect(isHeld('round-1')).toBe(false)
  })
})

describe('Summary - Retry after a failed save (#112)', () => {
  it('a successful Retry clears the marker, marks the round synced, releases the hold, goes home, and starts no sync', async () => {
    let call = 0
    mockFetch({ postGames: () => (++call === 1 ? failWith(500)() : okResponse()) })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)
    expect(stored().pendingSyncUserId).toBe('u1')

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(stored().synced).toBe(true)
    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(isHeld('round-1')).toBe(false)
    unmount()
    await settle()
    await settle()
    expect(syncPendingRounds).not.toHaveBeenCalled()
    expect(gamePosts()).toHaveLength(2) // the failed try + the Retry; nothing else
    expect(meCalls()).toHaveLength(1)
    expect(stored().synced).toBe(true)
  })

  it('a second failed Retry shows the error again without a second marker or a second hold', async () => {
    mockFetch({ postGames: failWith(503) })
    const user = userEvent.setup()
    const { navigate, unmount } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(gamePosts()).toHaveLength(2))
    await user.click(await screen.findByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(gamePosts()).toHaveLength(3))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    expect(markCompletedGamePending).toHaveBeenCalledTimes(1)
    expect(getCompletedGames().filter(g => g.pendingSyncUserId)).toHaveLength(1)
    expect(getCompletedGames()).toHaveLength(1)
    expect(navigate).not.toHaveBeenCalled()
    // One hold, so one release lets go of it.
    unmount()
    expect(isHeld('round-1')).toBe(false)
  })
})

describe('Summary - the runner and Retry never both send (#112)', () => {
  it('while the error is showing a sync run sends nothing for the round and counts it as remaining; after leaving it does send', async () => {
    let call = 0
    mockFetch({ postGames: () => (++call === 1 ? failWith(500)() : okResponse()) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)
    expect(gamePosts()).toHaveLength(1)

    let summary
    await act(async () => { summary = await syncPendingRounds('u1') })

    expect(summary).toEqual({ synced: 0, rejected: 0, remaining: 1 })
    expect(gamePosts()).toHaveLength(1)
    expect(stored().pendingSyncUserId).toBe('u1')

    await user.click(keepButton())

    await waitFor(() => expect(stored().synced).toBe(true))
    expect(gamePosts()).toHaveLength(2)
  })
})

describe('Summary - notes typed on the error screen (#112)', () => {
  it('are stored on the pending round as they are typed, and a later sync sends them', async () => {
    let call = 0
    mockFetch({ postGames: () => (++call === 1 ? failWith(500)() : okResponse()) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)
    expect(stored().notes).toBeNull()

    await user.type(noteField(), 'Windy on the 2nd')
    expect(stored().notes).toBe('Windy on the 2nd')
    expect(stored().pendingSyncUserId).toBe('u1')

    await user.click(keepButton())

    await waitFor(() => expect(gamePosts()).toHaveLength(2))
    expect(JSON.parse(gamePosts()[1][1].body).notes).toBe('Windy on the 2nd')
    await waitFor(() => expect(stored().synced).toBe(true))
  })

  it('a blank note is stored as null', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    await user.type(noteField(), 'Windy')
    await failFirstSave(user, navigate)
    expect(stored().notes).toBe('Windy')

    await user.clear(noteField())

    expect(stored().notes).toBeNull()
  })

  it('Retry sends the note as it now reads', async () => {
    let call = 0
    mockFetch({ postGames: () => (++call === 1 ? failWith(500)() : okResponse()) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    await failFirstSave(user, navigate)

    await user.type(noteField(), 'Breezy')
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(JSON.parse(gamePosts()[1][1].body).notes).toBe('Breezy')
  })

  it('typing before any failure never touches storage, and never adds a marker', async () => {
    mockFetch()
    const user = userEvent.setup()
    await renderSummary(baseGame())
    const before = localStorage.getItem('gt_completed_games')

    await user.type(noteField(), 'Windy')

    expect(localStorage.getItem('gt_completed_games')).toBe(before)
    expect(stored().pendingSyncUserId).toBeUndefined()
  })

  it('typing after a failed mark (device full) adds no marker', async () => {
    mockFetch({ postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    const realSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'gt_completed_games') throw new Error('QuotaExceededError')
      return realSetItem.call(this, key, value)
    })
    await failFirstSave(user, navigate)
    vi.restoreAllMocks()

    await user.type(noteField(), 'Windy')

    expect(stored().pendingSyncUserId).toBeUndefined()
    expect(stored().notes).toBeUndefined()
  })
})
