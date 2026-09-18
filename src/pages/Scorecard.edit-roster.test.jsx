import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './Scorecard.jsx'
import { buildEditGame } from '../utils/game.js'
import { getCompletedGames } from '../utils/storage.js'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Rendering a roster change during a past-round edit (§11.13.1, BACKLOG #6) —
// the Scorecard grid must show an added player's columns, with already-played
// holes empty/unscored for them, and must not block saving on that gap.

const savedRound = {
  id: 'g1',
  players: ['Ann'],
  scores: { Ann: [3, 4] },
  holes: 2,
  holesPlayed: 2,
  completedAt: '2026-08-01T12:00:00.000Z',
  holePars: [3, 3],
  courseName: 'Bruntsfield',
}

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

describe('Scorecard — edit-mode grid with an added player (§11.13.1)', () => {
  it('renders the added player\'s column with already-played holes empty, and saves without a backfill', async () => {
    const user = userEvent.setup()
    // "Priya" added with no prior scores (originalIndices[1] === null).
    const editGame = buildEditGame(savedRound, ['Ann', 'Priya'], null, 'Bruntsfield', savedRound.completedAt, [3, 3], [0, null])

    localStorage.setItem('gt_completed_games', JSON.stringify([savedRound]))

    render(
      <AuthProvider>
        <Scorecard
          navigate={vi.fn()}
          params={{ game: editGame, editContext: { id: 'g1', fromDb: false } }}
        />
      </AuthProvider>,
    )

    // Both players' columns render.
    expect(screen.getByRole('columnheader', { name: /Ann/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Priya/ })).toBeInTheDocument()

    // Priya's cells for both already-played holes read as unscored (–).
    const rows = screen.getAllByRole('row').slice(1) // drop header row
    rows.forEach(row => {
      const cells = within(row).getAllByRole('cell')
      const priyaCell = cells[2] // Hole | Ann | Priya
      expect(priyaCell).toHaveTextContent('–')
    })

    // Saving is not blocked by Priya's unscored holes.
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const [saved] = getCompletedGames()
    expect(saved.players).toEqual(['Ann', 'Priya'])
    expect(saved.scores.Priya).toEqual([null, null])
    expect(saved.dnf).toContain('Priya')
    expect(saved.winner).toBe('Ann')
  })
})
