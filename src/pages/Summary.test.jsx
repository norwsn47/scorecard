import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Summary from './Summary.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getCompletedGames, saveCompletedGame } from '../utils/storage.js'

// First render coverage for Summary (BACKLOG #104, #95, #91). Two areas:
// - the D1 save in handleGoHome ("Done") for a signed-in user: what is POSTed,
//   when the round is marked synced, the re-entrance guard, and the signed-out
//   path that never POSTs.
// - the signed-in star (PlayerStar) and the result / DNF rendering.
//
// Deliberately NOT asserted: what happens on a failed save. Today a non-OK
// response or a network error is swallowed and the user is still sent home
// (BACKLOG #95). The failure tests below only pin the part that is
// unambiguously right - the round is not marked synced - and leave the
// navigation outcome open until #95 decides the intended behaviour.

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
  })

  it('does not mark the round synced when the server answers with a non-OK status', async () => {
    mockFetch({
      user: SIGNED_IN,
      postGames: () => Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }),
    })
    const user = userEvent.setup()
    await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    // Navigation is not asserted here on purpose - see the file header (#95).
    // Wait for the save to settle (button back to "Done") instead.
    await screen.findByRole('button', { name: 'Done' })
    expect(gamePosts()).toHaveLength(1)
    expect(getCompletedGames()[0].synced).toBeUndefined()
  })

  it('does not mark the round synced when the request fails outright', async () => {
    mockFetch({ user: SIGNED_IN, postGames: () => Promise.reject(new TypeError('Failed to fetch')) })
    const user = userEvent.setup()
    await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    await screen.findByRole('button', { name: 'Done' })
    expect(gamePosts()).toHaveLength(1)
    expect(getCompletedGames()[0].synced).toBeUndefined()
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

describe('Summary - rounds that are already saved (#95)', () => {
  // `alreadySaved` (_fromDb or synced) puts the screen in viewingSaved mode,
  // which swaps the header "Done" for "Edit" - so the re-POST guard in
  // handleGoHome is never reachable by a tap. These pin the outcome the guard
  // exists for: viewing a saved round never creates a duplicate row.
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

describe('Summary - signed out', () => {
  it('goes home on Done without POSTing or touching the synced flag', async () => {
    mockFetch({ user: null })
    const user = userEvent.setup()
    const { navigate } = await renderSummary(baseGame())

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(navigate).toHaveBeenCalledWith('home')
    expect(gamePosts()).toHaveLength(0)
    expect(getCompletedGames()[0].synced).toBeUndefined()
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
