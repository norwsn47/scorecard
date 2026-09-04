import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
      <History navigate={vi.fn()} />
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
