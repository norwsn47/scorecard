import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getActiveGame } from '../utils/storage.js'

// Adding/removing players during a past-round edit (§11.13.1, BACKLOG #6) —
// reuses the same Add Player / ✕ remove controls and duplicate-name blocking
// as New Game setup (§4.2), now also enabled in edit mode.

const twoPlayerLocalRound = {
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

const sixPlayerLocalRound = {
  id: 'g2',
  players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  scores: {
    P1: [3], P2: [3], P3: [3], P4: [3], P5: [3], P6: [3],
  },
  holes: 1,
  holesPlayed: 1,
  completedAt: '2026-08-01T12:00:00.000Z',
  holePars: [3],
  courseId: null,
  courseName: 'Bruntsfield',
}

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

describe('Setup — adding/removing players during an edit (§11.13.1)', () => {
  it('shows the same "+ Add player" control used by New Game', async () => {
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: twoPlayerLocalRound }} />
      </AuthProvider>,
    )
    expect(await screen.findByRole('button', { name: '+ Add player' })).toBeInTheDocument()
  })

  it('shows a ✕ remove control on every player row once there is more than one', async () => {
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: twoPlayerLocalRound }} />
      </AuthProvider>,
    )
    expect(await screen.findByLabelText('Remove player 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Remove player 2')).toBeInTheDocument()
  })

  it('adding a player opens a new empty field and focuses it', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: twoPlayerLocalRound }} />
      </AuthProvider>,
    )
    await user.click(await screen.findByRole('button', { name: '+ Add player' }))
    const newField = screen.getByPlaceholderText('Player 3')
    expect(newField).toBeInTheDocument()
    expect(newField).toHaveFocus()
  })

  it('blocks saving on a duplicate name against an existing player, same rule as New Game', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: twoPlayerLocalRound }} />
      </AuthProvider>,
    )
    await user.click(await screen.findByRole('button', { name: '+ Add player' }))
    await user.type(screen.getByPlaceholderText('Player 3'), 'ann')

    // Both the existing "Ann" row and the new "ann" row flag as duplicates.
    expect(screen.getAllByText('Each player must have a unique name')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Edit hole scores' })).toBeDisabled()
  })

  it('caps at 6 players in edit mode, the same band as New Game', async () => {
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: sixPlayerLocalRound }} />
      </AuthProvider>,
    )
    await screen.findByLabelText('Remove player 1')
    expect(screen.queryByRole('button', { name: '+ Add player' })).not.toBeInTheDocument()
  })

  it('allows removing down to a single player - no floor beyond 1', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: twoPlayerLocalRound }} />
      </AuthProvider>,
    )
    await user.click(await screen.findByLabelText('Remove player 2'))
    // Down to one player - the remaining field has no remove control.
    expect(screen.queryByLabelText('Remove player 1')).not.toBeInTheDocument()
  })

  it('saving after adding a player carries the new roster forward with the added player fully unscored', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: twoPlayerLocalRound }} />
      </AuthProvider>,
    )
    await user.click(await screen.findByRole('button', { name: '+ Add player' }))
    await user.type(screen.getByPlaceholderText('Player 3'), 'Priya')
    await user.click(screen.getByRole('button', { name: 'Edit hole scores' }))

    await waitFor(() => {
      const active = getActiveGame()
      expect(active.players).toEqual(['Ann', 'Bob', 'Priya'])
      expect(active.scores.Priya).toEqual([null, null])
      // Existing players' scores are untouched by the addition.
      expect(active.scores.Ann.slice(0, 2)).toEqual([3, 4])
      expect(active.scores.Bob.slice(0, 2)).toEqual([4, 4])
    })
  })

  it('saving after removing a player carries the remaining player\'s scores forward correctly, not misaligned', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: twoPlayerLocalRound }} />
      </AuthProvider>,
    )
    await user.click(await screen.findByLabelText('Remove player 1')) // remove Ann
    await user.click(screen.getByRole('button', { name: 'Edit hole scores' }))

    await waitFor(() => {
      const active = getActiveGame()
      expect(active.players).toEqual(['Bob'])
      expect(active.scores.Bob.slice(0, 2)).toEqual([4, 4])
      expect(active.scores.Ann).toBeUndefined()
    })
  })
})
