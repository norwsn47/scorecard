import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Scorecard from './Scorecard.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Header actions on the live Scorecard (redesign stage 4, c02/c04): Finish is
// a text action until every hole is scored for every player, then it becomes
// the filled pill (the expected next step). Save in edit mode stays text.
// Pause is an action, not a step back, so it has no chevron; the edit-mode
// back button ("History") does.

const game = scores => ({
  id: 'g1',
  players: ['Ann', 'Bo'],
  scores,
  holes: 2,
  courseId: null,
  courseName: 'Bruntsfield',
})

function renderScorecard(g, params = {}) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
  render(
    <AuthProvider>
      <Scorecard navigate={vi.fn()} params={{ game: g, ...params }} />
    </AuthProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('Scorecard header actions', () => {
  it('Finish is a text action while holes are unscored', () => {
    renderScorecard(game({ Ann: [3, null], Bo: [3, 3] }))
    expect(screen.getByRole('button', { name: 'Finish' }).className.split(' ')).not.toContain('bg-accent')
  })

  it('Finish becomes the filled pill once every hole is scored for every player', () => {
    renderScorecard(game({ Ann: [3, 4], Bo: [3, 3] }))
    expect(screen.getByRole('button', { name: 'Finish' }).className.split(' ')).toContain('bg-accent')
  })

  it('Pause has no chevron', () => {
    renderScorecard(game({ Ann: [null, null], Bo: [null, null] }))
    expect(screen.getByRole('button', { name: 'Pause' }).querySelector('svg')).toBeNull()
  })
})
