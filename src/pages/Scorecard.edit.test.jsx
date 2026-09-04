import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './Scorecard.jsx'
import { buildEditGame } from '../utils/game.js'
import { getCompletedGames } from '../utils/storage.js'

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
  render(<Scorecard navigate={navigate} params={{ game: editGame, editContext }} />)
  return { navigate }
}

async function changeHole1AndSave(user) {
  await user.click(screen.getByLabelText('Increase score')) // Ann / hole 1: 3 -> 4
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.click(screen.getByRole('button', { name: /save changes/i }))
}

beforeEach(() => {
  localStorage.clear()
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
})
