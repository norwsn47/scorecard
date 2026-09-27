import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import Summary from './Summary.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { saveCompletedGame } from '../utils/storage.js'

// The read-only Front 9 / Back 9 break lines on the
// Summary scorecard table (and, by extension, History's detail view, which
// reuses this same component). 18-hole rounds only.

function game18(overrides = {}) {
  return {
    id: 'round-18',
    courseId: 'course-1',
    courseName: 'Bruntsfield',
    completedAt: '2026-08-01T12:00:00.000Z',
    holes: 18,
    holesPlayed: 18,
    holePars: Array(18).fill(3),
    players: ['Ann', 'Bo'],
    scores: {
      // Front 9: 8 threes + one 4 = 28 (+1). Back 9: nine 3s = 27 (E).
      Ann: [3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      // Front 9: nine 4s = 36 (+9). Back 9: nine 3s = 27 (E).
      Bo: [4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    },
    ...overrides,
  }
}

async function renderSummary(game, params = {}) {
  saveCompletedGame(game)
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
  render(
    <AuthProvider>
      <Summary navigate={vi.fn()} params={{ game, fromHistory: true, ...params }} />
    </AuthProvider>,
  )
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

beforeEach(() => {
  localStorage.clear()
})

describe('Summary — Front 9 / Back 9 break lines (§5.3.3)', () => {
  it('shows both break lines for a full 18-hole round, with correct totals and to-par figures', async () => {
    await renderSummary(game18())

    const frontRow = screen.getByText('Front 9').closest('tr')
    const backRow  = screen.getByText('Back 9').closest('tr')
    expect(frontRow).not.toBeNull()
    expect(backRow).not.toBeNull()

    const front = within(frontRow)
    expect(front.getByText('28')).toBeInTheDocument()
    expect(front.getByText('(+1)')).toBeInTheDocument()
    expect(front.getByText('36')).toBeInTheDocument()
    expect(front.getByText('(+9)')).toBeInTheDocument()

    const back = within(backRow)
    expect(back.getAllByText('27')).toHaveLength(2)
    expect(back.getAllByText('(E)')).toHaveLength(2)
  })

  it('shows only the Front 9 line (no Back 9) for a round that stopped at hole 9', async () => {
    await renderSummary(game18({
      holesPlayed: 9,
      scores: {
        Ann: [3, 3, 3, 3, 3, 3, 3, 3, 4],
        Bo: [4, 4, 4, 4, 4, 4, 4, 4, 4],
      },
    }))

    expect(screen.getByText('Front 9')).toBeInTheDocument()
    expect(screen.queryByText('Back 9')).not.toBeInTheDocument()
  })

  it('never shows for a 9-hole round', async () => {
    await renderSummary({
      id: 'round-9',
      courseId: 'course-2',
      courseName: 'A Nine',
      completedAt: '2026-08-01T12:00:00.000Z',
      holes: 9,
      holesPlayed: 9,
      holePars: Array(9).fill(3),
      players: ['Ann', 'Bo'],
      scores: { Ann: Array(9).fill(3), Bo: Array(9).fill(3) },
    })

    expect(screen.queryByText('Front 9')).not.toBeInTheDocument()
    expect(screen.queryByText('Back 9')).not.toBeInTheDocument()
  })

  it('never shows for the 36-hole Bruntsfield course', async () => {
    await renderSummary({
      id: 'round-36',
      courseId: null,
      courseName: 'Bruntsfield Short Hole Golf Course',
      completedAt: '2026-08-01T12:00:00.000Z',
      holes: 36,
      holesPlayed: 36,
      holePars: Array(36).fill(3),
      players: ['Ann', 'Bo'],
      scores: { Ann: Array(36).fill(3), Bo: Array(36).fill(3) },
    })

    expect(screen.queryByText('Front 9')).not.toBeInTheDocument()
    expect(screen.queryByText('Back 9')).not.toBeInTheDocument()
  })
})
