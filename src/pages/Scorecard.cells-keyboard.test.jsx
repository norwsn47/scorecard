import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './Scorecard.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// BACKLOG #96: the scoring cells are real buttons, so a keyboard, switch or
// screen-reader user can jump straight to any hole to correct a score instead
// of only stepping forward with Advance.

const game = () => ({
  id: 'g1',
  players: ['Ann', 'Bo'],
  scores: { Ann: [3, 4, null], Bo: [5, null, null] },
  holes: 3,
  holePars: [3, 4, 3],
  courseId: null,
  courseName: 'Bruntsfield',
})

async function renderScorecard() {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
  render(
    <AuthProvider>
      <Scorecard navigate={vi.fn()} params={{ game: game() }} />
    </AuthProvider>,
  )
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

const cell = (hole, par, player, score) =>
  screen.getByRole('button', { name: `Hole ${hole}, par ${par}, ${player}: ${score}` })

beforeEach(() => {
  localStorage.clear()
})

describe('Scorecard - scoring cells are buttons (#96)', () => {
  it('exposes one labelled button per visible hole and player, with the score (or "no score yet")', async () => {
    await renderScorecard()

    // The grid only shows rows up to the hole in play (here hole 2), so hole 3
    // has no row yet.
    expect(screen.getAllByRole('button', { name: /^Hole \d+, par \d+, / })).toHaveLength(4)
    expect(cell(1, 3, 'Ann', '3')).toBeInTheDocument()
    expect(cell(2, 4, 'Ann', '4')).toBeInTheDocument()
    expect(cell(1, 3, 'Bo', '5')).toBeInTheDocument()
    expect(cell(2, 4, 'Bo', 'no score yet')).toBeInTheDocument()
  })

  it('marks exactly one cell as current', async () => {
    await renderScorecard()

    const current = screen.getAllByRole('button', { name: /^Hole \d+, par \d+, / })
      .filter(b => b.getAttribute('aria-current') === 'true')
    expect(current).toHaveLength(1)
  })

  it('a keyboard user can Tab to a cell and press Enter or Space to make it current', async () => {
    const user = userEvent.setup()
    await renderScorecard()

    const target = cell(1, 3, 'Ann', '3')
    expect(target).not.toHaveAttribute('aria-current')

    target.focus()
    await user.keyboard('{Enter}')
    expect(target).toHaveAttribute('aria-current', 'true')

    const other = cell(2, 4, 'Bo', 'no score yet')
    other.focus()
    await user.keyboard(' ')
    expect(other).toHaveAttribute('aria-current', 'true')
    expect(target).not.toHaveAttribute('aria-current')
  })

  it('can jump back to an earlier hole and correct its score', async () => {
    const user = userEvent.setup()
    await renderScorecard()

    // Correct Ann's hole 1 from 3 to 4 without stepping through the round.
    cell(1, 3, 'Ann', '3').focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Increase score' }))

    expect(cell(1, 3, 'Ann', '4')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hole 1, par 3, Ann: 3' })).not.toBeInTheDocument()
  })
})
