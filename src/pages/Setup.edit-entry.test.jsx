import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Covers the two Setup-side changes needed so Summary's Edit can skip
// straight to Scorecard, and Scorecard's own "Edit game setup" can send the
// user back here: (1) the pastDate initialiser must prefer a working copy's
// own `pastDate` over its stale original `completedAt`, and (2) the header
// back label/destination must say "Scorecard" when opened from there.

const localGame = {
  id: 'g1',
  players: ['Ann', 'Bob'],
  scores: { Ann: [3, 4], Bob: [4, 4] },
  holes: 2,
  holesPlayed: 2,
  completedAt: '2026-08-01T12:00:00.000Z',
  holePars: [3, 4],
  courseId: null,
  courseName: 'Bruntsfield',
}

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

function renderSetup(params) {
  return render(
    <AuthProvider>
      <Setup navigate={vi.fn()} goBack={vi.fn()} params={params} />
    </AuthProvider>,
  )
}

describe('Setup - pastDate seed prefers a working copy\'s own pastDate (#round-trip)', () => {
  it('seeds the date field from completedAt when there is no pastDate on the game', () => {
    renderSetup({ editRound: true, game: localGame })
    expect(screen.getByLabelText('Date played')).toHaveValue('2026-08-01')
  })

  it('seeds the date field from pastDate, not the stale completedAt, when a working copy carries both', () => {
    // buildEditGame carries the original completedAt forward untouched (via
    // its ...existingGame spread) alongside the newly-chosen pastDate — this
    // is exactly the shape a second "Edit game setup" visit hands back.
    const workingCopy = { ...localGame, pastDate: '2026-08-15T12:00:00.000Z' }
    renderSetup({ editRound: true, game: workingCopy })
    expect(screen.getByLabelText('Date played')).toHaveValue('2026-08-15')
  })
})

describe('Setup - back label names where "Edit game setup" was opened from', () => {
  it('shows "← Summary" by default (opened from Summary\'s Edit)', () => {
    renderSetup({ editRound: true, game: localGame })
    expect(screen.getByRole('button', { name: '← Summary' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '← Scorecard' })).not.toBeInTheDocument()
  })

  it('shows "← Scorecard" when opened via Scorecard\'s "Edit game setup"', () => {
    renderSetup({ editRound: true, game: localGame, fromScorecard: true })
    expect(screen.getByRole('button', { name: '← Scorecard' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '← Summary' })).not.toBeInTheDocument()
  })

  it('ignores fromScorecard outside edit mode (New Game never reads it)', () => {
    renderSetup({ fromScorecard: true })
    expect(screen.queryByRole('button', { name: '← Scorecard' })).not.toBeInTheDocument()
  })
})
