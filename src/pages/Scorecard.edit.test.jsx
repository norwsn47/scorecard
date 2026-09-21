import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './Scorecard.jsx'
import { buildEditGame } from '../utils/game.js'
import { getCompletedGames } from '../utils/storage.js'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Editing a saved round must OVERWRITE it, never create a second row — the
// regression class behind the 24 August duplicate-save hotfix (#22 / PRD §11.13).

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

function renderEdit(editContext) {
  const editGame = buildEditGame(savedRound, ['Ann'], editContext.courseId ?? null, 'Bruntsfield', savedRound.completedAt, [3, 3])
  const navigate = vi.fn()
  render(
    <AuthProvider>
      <Scorecard navigate={navigate} params={{ game: editGame, editContext }} />
    </AuthProvider>,
  )
  return { navigate }
}

async function changeHole1AndSave(user) {
  await user.click(screen.getByLabelText('Increase score')) // Ann / hole 1: 3 -> 4
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.click(screen.getByRole('button', { name: /save changes/i }))
}

// Scorecard reads useAuth() (§11.15, the signed-in identity star) — the
// localStorage-path case needs a resolvable /api/auth/me even though it
// otherwise never touches the network; the D1-path case supplies its own
// fetch mock per-test below.
beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

describe('Scorecard — editing a saved round (#22)', () => {
  it('localStorage path: updates the existing record in place, no new row', async () => {
    localStorage.setItem('gt_completed_games', JSON.stringify([savedRound]))
    const user = userEvent.setup()

    const { navigate } = renderEdit({ id: 'g1', fromDb: false })
    await changeHole1AndSave(user)

    const rows = getCompletedGames()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('g1')
    expect(rows[0].scores.Ann[0]).toBe(4)
    expect(navigate).toHaveBeenCalledWith('summary', expect.any(Object))
  })

  it('D1 path: PATCHes the round by id, never POSTs a new one', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock
    const user = userEvent.setup()

    renderEdit({ id: 'g1', fromDb: true })
    await changeHole1AndSave(user)

    const calls = fetchMock.mock.calls.map(([url, opts]) => ({ url: String(url), method: opts?.method }))
    expect(calls).toContainEqual({ url: '/api/games/g1', method: 'PATCH' })
    expect(calls.some(c => c.method === 'POST')).toBe(false)
  })

  it('D1 path: the PATCH body is exactly the round fields, with no client_round_id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock
    const user = userEvent.setup()
    // Two players, Bo unfinished, so the DNF flag and totals are exercised.
    const twoPlayers = { ...savedRound, players: ['Ann', 'Bo'], scores: { Ann: [3, 4], Bo: [4, null] }, notes: '  Windy  ' }
    const editGame = buildEditGame(twoPlayers, ['Ann', 'Bo'], 'c1', 'Bruntsfield', twoPlayers.completedAt, [3, 3])
    render(
      <AuthProvider>
        <Scorecard navigate={vi.fn()} params={{ game: editGame, editContext: { id: 'g1', fromDb: true, courseId: 'c1' } }} />
      </AuthProvider>,
    )
    await user.click(screen.getByLabelText('Increase score')) // Ann / hole 1: 3 -> 4
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const patch = fetchMock.mock.calls.find(([, o]) => o?.method === 'PATCH')
    const body = JSON.parse(patch[1].body)
    expect(Object.keys(body)).toEqual(['course_id', 'played_at', 'holes_played', 'player_data', 'hole_pars', 'notes'])
    expect(body).toEqual({
      course_id: 'c1',
      played_at: '2026-08-01T12:00:00.000Z',
      holes_played: 2,
      player_data: [
        { name: 'Ann', scores: [4, 4], total: 8, dnf: false },
        { name: 'Bo', scores: [4, null], total: 4, dnf: true },
      ],
      hole_pars: [3, 3],
      notes: 'Windy',
    })
  })
})
