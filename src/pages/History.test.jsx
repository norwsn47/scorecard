import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import History from './History.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Logged-out History reads from localStorage; the auth check just needs to
// resolve to "no user".
beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

function seedLocalGames(games) {
  localStorage.setItem('gt_completed_games', JSON.stringify(games))
}

function renderHistory() {
  render(
    <AuthProvider>
      <History navigate={vi.fn()} goBack={vi.fn()} />
    </AuthProvider>,
  )
}

const round = (id, players, completedAt) => ({
  id,
  completedAt,
  holesPlayed: 2,
  players,
  scores: Object.fromEntries(players.map((p, i) => [p, [3, 3 + i]])),
  holePars: [3, 3],
})

describe('History — Home fallback on depth 0 (#89 fix-forward)', () => {
  it('shows a "Home" link when the app loads straight onto History (depth 0 — e.g. a reload or deep link)', () => {
    window.history.replaceState({ depth: 0 }, '', '/history')
    renderHistory()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })

  it('hides the "Home" link when there is somewhere in-app to go back to (depth > 0)', () => {
    window.history.replaceState({ depth: 1 }, '', '/history')
    renderHistory()
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument()
  })
})

describe('History — player filter (#51 / #61)', () => {
  it('shows no player-filter row when only one player appears across rounds', () => {
    seedLocalGames([round('g1', ['Ann'], '2026-08-01T10:00:00.000Z')])
    renderHistory()
    expect(screen.queryByRole('button', { name: 'All players' })).not.toBeInTheDocument()
  })

  it('shows a chip per distinct player once two or more appear, and filters the list on tap', async () => {
    const user = userEvent.setup()
    seedLocalGames([
      round('g1', ['Ann', 'Bo'], '2026-08-02T10:00:00.000Z'),
      round('g2', ['Ann', 'Cass'], '2026-08-01T10:00:00.000Z'),
    ])
    renderHistory()

    const chips = screen.getByRole('group', { name: 'Filter by player' })
    const list = screen.getByRole('main')
    expect(within(chips).getByRole('button', { name: 'All players' })).toBeInTheDocument()

    // Both rounds in the list: Cass's row (g2) is present.
    expect(within(list).getByText('Cass')).toBeInTheDocument()

    // Filter to Bo — only g1 (Ann + Bo) matches, so g2 (Ann + Cass) leaves the list.
    await user.click(within(chips).getByRole('button', { name: 'Bo' }))
    expect(within(list).queryByText('Cass')).not.toBeInTheDocument()
    expect(within(list).getByText('Bo')).toBeInTheDocument()

    // "All players" clears the filter — g2 is back.
    await user.click(within(chips).getByRole('button', { name: 'All players' }))
    expect(within(list).getByText('Cass')).toBeInTheDocument()
  })
})

// Signed-in identity star (PRD 11.15, BACKLOG #91). A signed-in user's History
// reads from D1, so this mocks /api/games as well as /api/auth/me. The star
// shows on the player's filter chip and on their name in each round row.
describe('History - signed-in star (#91)', () => {
  const dbRound = {
    id: 'db1',
    played_at: '2026-08-01T10:00:00.000Z',
    holes_played: 2,
    course_id: null,
    course_name: null,
    notes: null,
    hole_pars: '[3,3]',
    player_data: JSON.stringify([
      { name: 'Ann', scores: [3, 3], total: 6 },
      { name: 'Bo', scores: [4, 4], total: 8 },
    ]),
  }

  async function renderSignedIn(userName) {
    global.fetch = vi.fn(url => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: async () => ({ user: { id: 'u1', email: 'ann@example.com', name: userName } }) })
      }
      if (url.includes('/api/games')) {
        return Promise.resolve({ ok: true, json: async () => ({ games: [dbRound] }) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    renderHistory()
    await screen.findByText('Bo', { selector: '[role="button"]' })
    await act(async () => { await Promise.resolve() })
  }

  it('stars the matching player on their filter chip and in the round row, and nobody else', async () => {
    await renderSignedIn('ann')

    const chips = screen.getByRole('group', { name: 'Filter by player' })
    const list = screen.getByRole('main')
    expect(within(chips).getAllByRole('img', { name: 'You' })).toHaveLength(1)
    expect(within(list).getAllByRole('img', { name: 'You' })).toHaveLength(1)

    expect(within(within(chips).getByRole('button', { name: /^Ann/ })).getByRole('img', { name: 'You' })).toBeInTheDocument()
    expect(within(within(chips).getByRole('button', { name: /^Bo/ })).queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('shows no star when the signed-in user has no name set', async () => {
    await renderSignedIn(null)

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('shows no star when signed out', async () => {
    seedLocalGames([round('g1', ['Ann', 'Bo'], '2026-08-01T10:00:00.000Z')])
    renderHistory()

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })
})
