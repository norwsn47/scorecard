import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './Scorecard.jsx'
import { buildEditGame, createGame } from '../utils/game.js'
import { AuthProvider } from '../hooks/useAuth.jsx'

// "Edit game setup" (this change): the explicit way back to the Setup screen
// now that Summary's Edit skips straight to Scorecard by default. Edit-mode
// only, and must hand Setup the live `game` state (whatever has been scored
// in this session so far), not the initial copy Scorecard mounted with.

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

describe('Scorecard - "Edit game setup" (edit mode only)', () => {
  it('is not shown on the live/new-game Scorecard', () => {
    const game = createGame(['Ann', 'Bo'])
    render(
      <AuthProvider>
        <Scorecard navigate={vi.fn()} params={{ game }} />
      </AuthProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Edit game setup' })).not.toBeInTheDocument()
  })

  it('is shown in edit mode, and navigates to Setup with the live game state and fromScorecard', async () => {
    const editGame = buildEditGame(savedRound, ['Ann'], null, 'Bruntsfield', savedRound.completedAt, [3, 3])
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Scorecard navigate={navigate} params={{ game: editGame, editContext: { id: 'g1', fromDb: false } }} />
      </AuthProvider>,
    )

    // Score a change before opening "Edit game setup", so the live state (not
    // the initial copy) is what gets handed to Setup.
    await user.click(screen.getByLabelText('Increase score')) // Ann / hole 1: 3 -> 4

    await user.click(screen.getByRole('button', { name: 'Edit game setup' }))

    expect(navigate).toHaveBeenCalledWith('setup', {
      editRound: true,
      game: expect.objectContaining({ id: 'g1', scores: { Ann: [4, 4] } }),
      fromScorecard: true,
    })
  })
})
