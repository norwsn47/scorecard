import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Summary from './Summary.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getCompletedGames, markCompletedGameSynced, saveActiveGame, saveCompletedGame } from '../utils/storage.js'
import { buildGamePayload, syncPendingRounds } from '../utils/sync.js'

// First render coverage for Summary (BACKLOG #104, #95, #91). Three areas:
// - the D1 save in handleGoHome ("Done") for a signed-in user: what is POSTed,
//   when the round is marked synced, the re-entrance guard, and the signed-out
//   path that never POSTs.
// - what happens when that save fails (#95): the user stays on Summary with an
//   alert and a choice of Retry or "Keep on this device and go home" - a round
//   is never silently lost, and never leaves the screen without a decision.
// - the signed-in star (PlayerStar) and the result / DNF rendering.

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

const okResponse = () => Promise.resolve({ ok: true, json: async () => ({ id: 'srv-1' }) })

function mockFetch({ user = null, postGames = okResponse } = {}) {
  global.fetch = vi.fn((url, opts) => {
    if (url.includes('/api/auth/me')) {
      return Promise.resolve({ ok: true, json: async () => ({ user }) })
    }
    if (url === '/api/games' && opts?.method === 'POST') return postGames(opts)
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

const gamePosts = () => global.fetch.mock.calls.filter(([url, opts]) => url === '/api/games' && opts?.method === 'POST')

// Seeds the round in localStorage (as Scorecard's finish flow does), renders
// Summary inside the real AuthProvider and lets /api/auth/me settle, so `user`
// is resolved before any test taps Done.
async function renderSummary(game, params = {}) {
  saveCompletedGame(game)
  const navigate = vi.fn()
  render(
    <AuthProvider>
      <Summary navigate={navigate} params={{ game, ...params }} />
    </AuthProvider>,
  )
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  return { navigate }
}

beforeEach(() => {
  localStorage.clear()
  // Post-finish flow always arrives from Scorecard, i.e. at depth > 0.
  window.history.replaceState({ depth: 1 }, '', '/summary')
})

afterEach(() => {
  // Leaving Summary with a failed save pending triggers a background run (#112).
  // RTL unmounts after this hook, so make any such run fail fast now instead of
  // hanging on a test's unresolved fetch and leaking its guard into later tests.
  global.fetch = vi.fn(() => Promise.reject(new TypeError('offline')))
  vi.restoreAllMocks()
})

describe('Summary - saving on Done, signed in (#95)', () => {
  it('POSTs the round to /api/games with the client_round_id and per-player data', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    const posts = gamePosts()
    expect(posts).toHaveLength(1)
    const [, opts] = posts[0]
    expect(opts.credentials).toBe('include')
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(opts.body)).toEqual({
      course_id: 'course-1',
      played_at: '2026-08-01T12:00:00.000Z',
      holes_played: 2,
      player_data: [
        { name: 'Ann', scores: [3, 3], total: 6, dnf: false },
        { name: 'Bo', scores: [4, 4], total: 8, dnf: false },
      ],
      hole_pars: [3, 3],
      notes: null,
      client_round_id: 'round-1',
    })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
  })

  it('sends course_id as null for a round with no course, and hole_pars as null when none are stored', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    await renderSummary(baseGame({ courseId: undefined, courseName: undefined, holePars: undefined }))

    await user.click(screen.getByRole('button', { name: 'Done' }))

    const body = JSON.parse(gamePosts()[0][1].body)
    expect(body.course_id).toBeNull()
    expect(body.hole_pars).toBeNull()
  })

  it('flags a player as dnf in player_data when they stopped short of the furthest hole', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    await renderSummary(baseGame({ scores: { Ann: [3, 3], Bo: [4] } }))

    await user.click(screen.getByRole('button', { name: 'Done' }))

    const body = JSON.parse(gamePosts()[0][1].body)
    expect(body.player_data).toEqual([
      { name: 'Ann', scores: [3, 3], total: 6, dnf: false },
      { name: 'Bo', scores: [4], total: 4, dnf: true },
    ])
  })

  it('includes the typed note, trimmed, in the body', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    await renderSummary(baseGame())

    await user.type(screen.getByPlaceholderText('Add a note about this round...'), '  Windy on the 2nd  ')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(JSON.parse(gamePosts()[0][1].body).notes).toBe('Windy on the 2nd')
  })

  it('sends notes as null when the note is only whitespace', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    await renderSummary(baseGame())

    await user.type(screen.getByPlaceholderText('Add a note about this round...'), '   ')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(JSON.parse(gamePosts()[0][1].body).notes).toBeNull()
  })

  it('caps the note at 300 characters', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    await renderSummary(baseGame())

    const field = screen.getByPlaceholderText('Add a note about this round...')
    await user.click(field)
    await user.paste('x'.repeat(320))

    expect(field).toHaveValue('x'.repeat(300))
  })

  it('marks the round synced in localStorage and goes home once the POST succeeds', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())
    expect(getCompletedGames()[0].synced).toBeUndefined()

    await user.click(screen.getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(getCompletedGames()[0].synced).toBe(true)
    expect(getCompletedGames()[0].pendingSyncUserId).toBeUndefined()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ignores a second tap while the POST is in flight, and locks the button and the note', async () => {
    let release
    mockFetch({
      user: SIGNED_IN,
      postGames: () => new Promise(resolve => { release = () => resolve({ ok: true, json: async () => ({}) }) }),
    })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    // In flight: label swaps to "Saving…", the button and the note lock, and
    // we have not navigated yet.
    const saving = await screen.findByRole('button', { name: 'Saving…' })
    expect(saving).toBeDisabled()
    expect(screen.getByPlaceholderText('Add a note about this round...')).toBeDisabled()
    await user.click(saving)
    expect(gamePosts()).toHaveLength(1)
    expect(navigate).not.toHaveBeenCalled()

    await act(async () => { release() })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(gamePosts()).toHaveLength(1)
  })
})

describe('Summary - when the save fails (#95)', () => {
  const failWith = status => () => Promise.resolve({ ok: false, status, json: async () => ({ error: 'nope' }) })
  const keepButton = () => screen.getByRole('button', { name: 'Keep on this device and go home' })

  it('a non-OK response keeps the user on Summary with an alert and both choices', async () => {
    mockFetch({ user: SIGNED_IN, postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
    expect(keepButton()).toBeEnabled()
    expect(navigate).not.toHaveBeenCalled()
    expect(gamePosts()).toHaveLength(1)
    // The round is marked pending at the first failure (#112), never synced.
    expect(getCompletedGames()[0].synced).toBeUndefined()
    expect(getCompletedGames()[0].pendingSyncUserId).toBe('u1')
    // The header Done is back, so the screen is not stuck in "Saving…".
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
  })

  it('a network error is treated the same way', async () => {
    mockFetch({ user: SIGNED_IN, postGames: () => Promise.reject(new TypeError('Failed to fetch')) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(keepButton()).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(getCompletedGames()[0].synced).toBeUndefined()
  })

  it('a stalled save times out into the same error instead of hanging on "Saving…"', async () => {
    mockFetch({ user: SIGNED_IN, postGames: () => new Promise(() => {}) })
    const { navigate } = await renderSummary(baseGame())

    // Fake timers only after the session check has settled, so the click and
    // the 15 s timeout are the only clocks in play.
    vi.useFakeTimers()
    try {
      act(() => { screen.getByRole('button', { name: 'Done' }).click() })
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
      await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    } finally {
      vi.useRealTimers()
    }

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save this round")
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
    expect(navigate).not.toHaveBeenCalled()
    expect(getCompletedGames()[0].synced).toBeUndefined()
  })

  it('a 401 says the user was signed out and still offers both choices', async () => {
    mockFetch({ user: SIGNED_IN, postGames: failWith(401) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("You've been signed out")
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(keepButton()).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(getCompletedGames()[0].synced).toBeUndefined()
  })

  it('a 400 keeps the round on Summary with both choices and its own wording', async () => {
    mockFetch({ user: SIGNED_IN, postGames: failWith(400) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Your account couldn't take this round")
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(keepButton()).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('Retry re-sends the same body, then marks the round synced and goes home on success', async () => {
    let call = 0
    mockFetch({
      user: SIGNED_IN,
      postGames: () => (++call === 1
        ? failWith(500)()
        : Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'srv-1' }) })),
    })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.type(screen.getByPlaceholderText('Add a note about this round...'), 'Windy')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await screen.findByRole('alert')
    expect(navigate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    const posts = gamePosts()
    expect(posts).toHaveLength(2)
    expect(posts[1][1].body).toBe(posts[0][1].body)
    expect(JSON.parse(posts[1][1].body)).toMatchObject({ client_round_id: 'round-1', notes: 'Windy' })
    expect(getCompletedGames()[0].synced).toBe(true)
    expect(getCompletedGames()[0].pendingSyncUserId).toBeUndefined()
  })

  it('Retry that fails again stays on Summary with the alert still showing', async () => {
    mockFetch({ user: SIGNED_IN, postGames: failWith(503) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(gamePosts()).toHaveLength(2))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('Retry is disabled and relabelled while in flight, and a second tap cannot fire a second POST', async () => {
    let call = 0
    let release
    mockFetch({
      user: SIGNED_IN,
      postGames: () => (++call === 1
        ? failWith(500)()
        : new Promise(resolve => { release = () => resolve({ ok: true, status: 200, json: async () => ({}) }) })),
    })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    const retrying = await screen.findByRole('button', { name: 'Retrying…' })
    expect(retrying).toBeDisabled()
    // Keep is locked too, and so is the note: nothing can race the request.
    expect(keepButton()).toBeDisabled()
    expect(screen.getByPlaceholderText('Add a note about this round...')).toBeDisabled()
    await user.click(retrying)
    await user.click(keepButton())
    expect(gamePosts()).toHaveLength(2) // the failed first try + one retry
    expect(navigate).not.toHaveBeenCalled()
    // Marked at the first failure; the in-flight Retry does not change that.
    expect(getCompletedGames()[0].pendingSyncUserId).toBe('u1')

    await act(async () => { release() })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(gamePosts()).toHaveLength(2)
  })

  it('"Keep on this device and go home" leaves the round pending with the user id and the trimmed note, without touching synced', async () => {
    mockFetch({ user: SIGNED_IN, postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.type(screen.getByPlaceholderText('Add a note about this round...'), '  Windy on the 2nd  ')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await screen.findByRole('alert')
    await user.click(keepButton())

    expect(navigate).toHaveBeenCalledWith('home')
    const [stored] = getCompletedGames()
    expect(stored.pendingSyncUserId).toBe('u1')
    expect(stored.notes).toBe('Windy on the 2nd')
    expect(stored.synced).toBeUndefined()
    expect(stored.syncRejected).toBeUndefined()
    // Leaving triggers one background run (#112), which is the only further request.
    await waitFor(() => expect(gamePosts()).toHaveLength(2))
    expect(getCompletedGames()[0].pendingSyncUserId).toBe('u1')
  })

  it('a 401 can be kept on the device too, tagged with the user id', async () => {
    mockFetch({ user: SIGNED_IN, postGames: failWith(401) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))
    await screen.findByRole('alert')
    await user.click(keepButton())

    expect(navigate).toHaveBeenCalledWith('home')
    expect(getCompletedGames()[0].pendingSyncUserId).toBe('u1')
    expect(getCompletedGames()[0].synced).toBeUndefined()
  })

  it('keeping a round with a blank note stores no note', async () => {
    mockFetch({ user: SIGNED_IN, postGames: failWith(500) })
    const user = userEvent.setup()
    await renderSummary(baseGame())

    await user.type(screen.getByPlaceholderText('Add a note about this round...'), '   ')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await screen.findByRole('alert')
    await user.click(keepButton())

    expect(getCompletedGames()[0].notes).toBeNull()
  })

  it('if the round is not in local storage either, the mark fails: the device-full wording, no Keep, and no navigation', async () => {
    mockFetch({ user: SIGNED_IN, postGames: failWith(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    // Simulate the local copy being gone (e.g. Scorecard's storage write failed).
    localStorage.clear()
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't store the round either")
    expect(screen.queryByRole('button', { name: 'Keep on this device and go home' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('a signed-out user never sees the error block or a Retry', async () => {
    mockFetch({ user: null })
    const user = userEvent.setup()
    await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    expect(gamePosts()).toHaveLength(0)
  })
})

describe('buildGamePayload matches what Summary POSTs', () => {
  it('sends exactly the body the shared builder produces for the stored round', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    const game = baseGame()
    await renderSummary(game)

    await user.type(screen.getByPlaceholderText('Add a note about this round...'), 'Breezy')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(JSON.parse(gamePosts()[0][1].body)).toEqual(buildGamePayload(game, 'Breezy'))
  })
})

describe('Summary - rounds that are already saved (#95)', () => {
  // A round that is _fromDb or synced puts the screen in viewingSaved mode,
  // which swaps the header "Done" for "Edit" - so there is no save handler to
  // tap at all. These pin the outcome that matters: viewing a saved round
  // never creates a duplicate row.
  it('a D1 round opened from History has no Done button and never POSTs', async () => {
    mockFetch({ user: SIGNED_IN })
    const game = baseGame({ _fromDb: true, id: 'db-row-9', notes: 'Lovely evening' })
    await renderSummary(game, { fromHistory: true })

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(gamePosts()).toHaveLength(0)
  })

  it('a round already synced this session has no Done button and never POSTs', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(baseGame({ synced: true }))

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(gamePosts()).toHaveLength(0)
  })

  it('shows a saved round\'s note as read-only text, not an editable field', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(baseGame({ _fromDb: true, notes: 'Lovely evening' }), { fromHistory: true })

    expect(screen.getByText('Lovely evening')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Add a note about this round...')).not.toBeInTheDocument()
  })

  it('the Home fallback (depth 0) on a saved round goes home without POSTing', async () => {
    window.history.replaceState({ depth: 0 }, '', '/summary')
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame({ _fromDb: true }), { fromHistory: true })

    await user.click(screen.getByRole('button', { name: 'Home' }))

    expect(navigate).toHaveBeenCalledWith('home')
    expect(gamePosts()).toHaveLength(0)
  })
})

// A round whose save to D1 is still outstanding (pendingSyncUserId, BACKLOG #95,
// PRD §11.8). Reached from History, after a browser bounce, or handed back after
// an edit, it is always read-only here: the background sync saves it, never Done.
describe('Summary - a pending round (#95)', () => {
  const STATUS = 'Not yet saved to your account. It will save automatically when you have signal.'
  const REJECTED = "This round can't be saved to your account. It is kept on this device only."
  const pendingGame = (overrides = {}) => baseGame({ pendingSyncUserId: 'u1', ...overrides })

  it('is read-only for its owner: no Done, no notes field, no POST, and a static status line', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(pendingGame(), { fromHistory: true })

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Add a note about this round...')).not.toBeInTheDocument()
    expect(screen.getByText(STATUS)).toBeInTheDocument()
    expect(gamePosts()).toHaveLength(0)
  })

  it('is read-only without the fromHistory flag too (a bounce, or handed back after an edit)', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(pendingGame())

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByText(STATUS)).toBeInTheDocument()
    expect(gamePosts()).toHaveLength(0)
  })

  it('says a refused round cannot be saved and is kept on this device, in place of the pending line', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(pendingGame({ syncRejected: true }), { fromHistory: true })

    expect(screen.getByText(REJECTED)).toBeInTheDocument()
    expect(screen.queryByText(STATUS)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('shows no status line on a saved round', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(baseGame({ _fromDb: true }), { fromHistory: true })

    expect(screen.queryByText(STATUS)).not.toBeInTheDocument()
    expect(screen.queryByText(REJECTED)).not.toBeInTheDocument()
  })

  it('offers Edit to the signed-in owner, and Edit goes to Setup with the round', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(pendingGame(), { fromHistory: true })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(navigate).toHaveBeenCalledWith('setup', { editRound: true, game: expect.objectContaining({ id: 'round-1', pendingSyncUserId: 'u1' }) })
  })

  it('does not offer Edit, Done or a status line to a different signed-in user, and never POSTs their round', async () => {
    mockFetch({ user: { ...SIGNED_IN, id: 'u2' } })
    await renderSummary(pendingGame(), { fromHistory: true })

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.queryByText(STATUS)).not.toBeInTheDocument()
    expect(gamePosts()).toHaveLength(0)
  })

  it('does not let a different signed-in user save it from a bounce (no Done to send it under their account)', async () => {
    mockFetch({ user: { ...SIGNED_IN, id: 'u2' } })
    await renderSummary(pendingGame()) // no fromHistory

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(gamePosts()).toHaveLength(0)
  })

  it('matches the owner whether the id came back as a number or a string', async () => {
    mockFetch({ user: { ...SIGNED_IN, id: 7 } })
    await renderSummary(pendingGame({ pendingSyncUserId: '7' }), { fromHistory: true })

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByText(STATUS)).toBeInTheDocument()
  })

  it('signed out, a still-pending round opens like any local round: Edit, no Done, no status line', async () => {
    mockFetch({ user: null })
    await renderSummary(pendingGame(), { fromHistory: true })

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.queryByText(STATUS)).not.toBeInTheDocument()
    expect(gamePosts()).toHaveLength(0)
  })

  it('refuses Edit with a short message while a save of this round is in flight, and works afterwards', async () => {
    let release
    mockFetch({
      user: SIGNED_IN,
      postGames: () => new Promise(resolve => { release = () => resolve({ ok: false, status: 503, json: async () => ({}) }) }),
    })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(pendingGame(), { fromHistory: true })

    const run = syncPendingRounds('u1')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) }) // POST in flight

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Saving this round - try again in a moment.')
    expect(navigate).not.toHaveBeenCalled()

    await act(async () => { release(); await run })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(navigate).toHaveBeenCalledWith('setup', expect.any(Object))
  })

  it('still refuses Edit while another game is in progress, with the existing message', async () => {
    mockFetch({ user: SIGNED_IN })
    saveActiveGame({ id: 'live', players: ['Ann'], holes: 2, scores: { Ann: [null, null] } })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(pendingGame(), { fromHistory: true })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Finish your current round before editing a past one.')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not edit a stale local copy when the round has been saved since this screen opened', async () => {
    mockFetch({ user: SIGNED_IN })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(pendingGame(), { fromHistory: true })
    markCompletedGameSynced('round-1') // a background sync finished meanwhile

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('alert')).toHaveTextContent('This round has just been saved. Open it from History to edit it.')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('a saved D1 round is still editable, and an unmarked signed-in local round still is not', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(baseGame({ _fromDb: true }), { fromHistory: true })
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('an unmarked local round is still not editable by a signed-in user', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(baseGame(), { fromHistory: true })
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })
})

describe('Summary - signed out', () => {
  it('goes home on Done without POSTing or touching the synced flag', async () => {
    mockFetch({ user: null })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(navigate).toHaveBeenCalledWith('home')
    expect(gamePosts()).toHaveLength(0)
    expect(getCompletedGames()[0].synced).toBeUndefined()
    expect(getCompletedGames()[0].pendingSyncUserId).toBeUndefined()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('offers no notes field and points to account creation instead', async () => {
    mockFetch({ user: null })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    expect(screen.queryByPlaceholderText('Add a note about this round...')).not.toBeInTheDocument()
    expect(screen.getByText('Saved in this browser only.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /create an account/i }))
    expect(navigate).toHaveBeenCalledWith('login')
  })
})

describe('Summary - signed-in star (#91, PRD 11.15)', () => {
  it('marks only the column header matching the signed-in name, case-insensitively', async () => {
    mockFetch({ user: { ...SIGNED_IN, name: 'ann' } })
    await renderSummary(baseGame())

    const stars = screen.getAllByRole('img', { name: 'You' })
    expect(stars).toHaveLength(1)

    const [, annHeader, boHeader] = screen.getAllByRole('columnheader')
    expect(within(annHeader).getByRole('img', { name: 'You' })).toBeInTheDocument()
    expect(within(boHeader).queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('does not put the star on the winner callout', async () => {
    mockFetch({ user: SIGNED_IN })
    await renderSummary(baseGame())

    // Ann wins (6 v 8) and is the signed-in player: the only star is in the
    // table, none inside the callout line.
    const callout = screen.getByText('Winner -').closest('p')
    expect(within(callout).queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'You' })).toHaveLength(1)
  })

  it('shows no star when signed out', async () => {
    mockFetch({ user: null })
    await renderSummary(baseGame())

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('shows no star when the signed-in user has no name set', async () => {
    mockFetch({ user: { ...SIGNED_IN, name: null } })
    await renderSummary(baseGame())

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('shows no star when no player matches the signed-in name', async () => {
    mockFetch({ user: { ...SIGNED_IN, name: 'Cass' } })
    await renderSummary(baseGame())

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })
})

describe('Summary - result and DNF rendering', () => {
  it('names the outright winner with their stroke count', async () => {
    mockFetch({ user: null })
    await renderSummary(baseGame())

    expect(screen.getByText('Winner -')).toBeInTheDocument()
    const callout = screen.getByText('Winner -').closest('p')
    expect(callout).toHaveTextContent('Winner -Ann- 6 strokes')
  })

  it('says "1 stroke" (singular) for a winning total of one, in all three wordings', async () => {
    mockFetch({ user: null })
    const { unmount } = await renderSummary(baseGame({ holes: 1, holesPlayed: 1, holePars: [3], scores: { Ann: [1], Bo: [2] } }))
    expect(screen.getByText('Winner -').closest('p')).toHaveTextContent('Winner -Ann- 1 stroke')
    expect(screen.getByText('Winner -').closest('p')).not.toHaveTextContent('1 strokes')
    unmount?.()
  })

  it('reads "Tied" with both names when two players are level', async () => {
    mockFetch({ user: null })
    await renderSummary(baseGame({ scores: { Ann: [3, 4], Bo: [4, 3] } }))

    const callout = screen.getByText('Tied -').closest('p')
    expect(callout).toHaveTextContent('Tied -Ann & Bo- 7 strokes')
  })

  it('falls back to a count when four or more players are level', async () => {
    mockFetch({ user: null })
    const players = ['Ann', 'Bo', 'Cass', 'Dev']
    await renderSummary(baseGame({
      players,
      scores: Object.fromEntries(players.map(p => [p, [3, 3]])),
    }))

    expect(screen.getByText(/Tied/)).toHaveTextContent('Tied - 4 players level on 6 strokes')
  })

  it('says "No winner" when nobody has a score', async () => {
    mockFetch({ user: null })
    await renderSummary(baseGame({ scores: {} }))

    expect(screen.getByText('No winner')).toBeInTheDocument()
  })

  it('shows no result line for a solo round', async () => {
    mockFetch({ user: null })
    await renderSummary(baseGame({ players: ['Ann'], scores: { Ann: [3, 3] } }))

    expect(screen.queryByText(/Winner/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Tied/)).not.toBeInTheDocument()
    expect(screen.queryByText('No winner')).not.toBeInTheDocument()
  })

  it('labels a player who stopped early as DNF and leaves them out of the result', async () => {
    mockFetch({ user: null })
    await renderSummary(baseGame({ scores: { Ann: [3, 3], Bo: [2] } }))

    // Once under the name in the header, once in the totals row.
    expect(screen.getAllByText('DNF')).toHaveLength(2)
    expect(screen.getByText('Winner -').closest('p')).toHaveTextContent('Winner -Ann- 6 strokes')
  })

  it('re-derives the result from the scores, ignoring a stale stored winner', async () => {
    mockFetch({ user: null })
    await renderSummary(baseGame({ winner: 'Bo', winners: ['Bo'], winningTotal: 1 }))

    expect(screen.getByText('Winner -').closest('p')).toHaveTextContent('Winner -Ann- 6 strokes')
  })
})

describe('Summary - no round to show', () => {
  it('bounces home when there is nothing in storage and no game param', async () => {
    mockFetch({ user: null })
    const navigate = vi.fn()
    render(
      <AuthProvider>
        <Summary navigate={navigate} params={{}} />
      </AuthProvider>,
    )

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home', {}, { replace: true }))
    expect(gamePosts()).toHaveLength(0)
  })
})
