import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getActiveGame, saveActiveGame } from '../utils/storage.js'

// Browser Back out of an in-progress edit lands on Setup with the edit-flow
// params gone (App.jsx never persists editRound / game in history state). The
// mount guard must discard the stranded working copy and route to History,
// not leave a phantom "Resume" game behind (#43 review — twice-regressed).
beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

describe('Setup — abandoned-edit recovery on a bounce', () => {
  it('clears a stranded _edit working copy and navigates to history', async () => {
    saveActiveGame({
      id: 'g1',
      _edit: { id: 'g1', fromDb: false },
      players: ['Ann'],
      scores: { Ann: [3, 4] },
      holes: 2,
    })
    const navigate = vi.fn()

    render(
      <AuthProvider>
        <Setup navigate={navigate} params={{}} />
      </AuthProvider>,
    )

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('history'))
    expect(getActiveGame()).toBeNull()
  })

  it('leaves a normal in-progress game alone (no _edit marker)', async () => {
    saveActiveGame({ id: 'g2', players: ['Ann'], scores: { Ann: [3] }, holes: 2 })
    const navigate = vi.fn()

    render(
      <AuthProvider>
        <Setup navigate={navigate} params={{}} />
      </AuthProvider>,
    )

    // Wait for a positive render signal, then assert the guard stayed quiet.
    await screen.findByText('New Game')
    expect(navigate).not.toHaveBeenCalled()
    expect(getActiveGame()?.id).toBe('g2')
  })
})
