import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import Scorecard from './Scorecard.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// The live Front 9 subtotal row on an 18-hole scorecard.
// Appears once every current player has a stroke count for hole 9, stays
// visible through the back nine, and never appears for a 9-hole or 36-hole
// (Bruntsfield) round.

function eighteenHoleGame(overrides = {}) {
  return {
    id: 'g1',
    players: ['Ann', 'Bo'],
    scores: { Ann: Array(18).fill(null), Bo: Array(18).fill(null) },
    holes: 18,
    holePars: Array(18).fill(3),
    courseId: 'c1',
    courseName: 'Bruntsfield Down the Way',
    ...overrides,
  }
}

async function renderScorecard(game, user = null) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user }) })
  render(
    <AuthProvider>
      <Scorecard navigate={vi.fn()} params={{ game }} />
    </AuthProvider>,
  )
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

beforeEach(() => {
  localStorage.clear()
})

describe('Scorecard — Front 9 subtotal row', () => {
  it('does not show before hole 9 is complete for every player', async () => {
    const game = eighteenHoleGame({
      scores: {
        Ann: [3, 3, 3, 3, 3, 3, 3, 3, null, ...Array(9).fill(null)],
        Bo: [4, 4, 4, 4, 4, 4, 4, 4, null, ...Array(9).fill(null)],
      },
    })
    await renderScorecard(game)

    expect(screen.queryByText('Front 9')).not.toBeInTheDocument()
  })

  it('shows once hole 9 is scored for every current player, with each player\'s Front 9 total', async () => {
    const game = eighteenHoleGame({
      scores: {
        Ann: [3, 3, 3, 3, 3, 3, 3, 3, 4, ...Array(9).fill(null)], // 28, +1
        Bo: [4, 4, 4, 4, 4, 4, 4, 4, 4, ...Array(9).fill(null)], // 36, +9
      },
    })
    await renderScorecard(game)

    const label = screen.getByText('Front 9')
    const row = label.closest('tr')
    expect(row).not.toBeNull()
    const rowScope = within(row)
    expect(rowScope.getByText('28')).toBeInTheDocument()
    expect(rowScope.getByText('(+1)')).toBeInTheDocument()
    expect(rowScope.getByText('36')).toBeInTheDocument()
    expect(rowScope.getByText('(+9)')).toBeInTheDocument()
  })

  it('stays visible through hole 10 and beyond', async () => {
    const game = eighteenHoleGame({
      scores: {
        Ann: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, ...Array(8).fill(null)],
        Bo: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, ...Array(8).fill(null)],
      },
    })
    await renderScorecard(game)

    expect(screen.getByText('Front 9')).toBeInTheDocument()
  })

  it('never shows for a 9-hole round', async () => {
    const game = {
      id: 'g2',
      players: ['Ann', 'Bo'],
      scores: { Ann: Array(9).fill(3), Bo: Array(9).fill(3) },
      holes: 9,
      holePars: Array(9).fill(3),
      courseId: 'c1',
      courseName: 'A Nine',
    }
    await renderScorecard(game)

    expect(screen.queryByText('Front 9')).not.toBeInTheDocument()
  })

  it('never shows for the 36-hole Bruntsfield course', async () => {
    const game = {
      id: 'g3',
      players: ['Ann', 'Bo'],
      scores: { Ann: Array(36).fill(3), Bo: Array(36).fill(3) },
      holes: 36,
      holePars: Array(36).fill(3),
      courseId: null,
      courseName: 'Bruntsfield Short Hole Golf Course',
    }
    await renderScorecard(game)

    expect(screen.queryByText('Front 9')).not.toBeInTheDocument()
  })
})
