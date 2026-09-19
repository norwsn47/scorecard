import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scorecard from './Scorecard.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// The signed-in identity star on the live Scorecard (PRD 11.15, BACKLOG #91):
// a small star next to the player whose name matches the account name, in the
// column header and again in the finish-round confirm sheet. Matching is
// case-insensitive here (trimming is covered by isSignedInPlayer in
// game.test.js); signed out, or with no name set, shows none.

const game = () => ({
  id: 'g1',
  players: ['Ann', 'Bo'],
  scores: { Ann: [null], Bo: [null] },
  holes: 1,
  courseId: null,
  courseName: 'Bruntsfield',
})

function mockAuth(user) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user }) })
}

// Renders and lets /api/auth/me settle so `user` is resolved before asserting.
async function renderScorecard() {
  render(
    <AuthProvider>
      <Scorecard navigate={vi.fn()} params={{ game: game() }} />
    </AuthProvider>,
  )
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

beforeEach(() => {
  localStorage.clear()
})

describe('Scorecard - signed-in star (#91)', () => {
  it('stars only the column header that matches the signed-in name, ignoring case', async () => {
    mockAuth({ id: 'u1', email: 'ann@example.com', name: 'ann' })
    await renderScorecard()

    expect(screen.getAllByRole('img', { name: 'You' })).toHaveLength(1)
    const [, annHeader, boHeader] = screen.getAllByRole('columnheader')
    expect(within(annHeader).getByRole('img', { name: 'You' })).toBeInTheDocument()
    expect(within(boHeader).queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('carries the star onto the player\'s line in the finish-round confirm sheet', async () => {
    mockAuth({ id: 'u1', email: 'ann@example.com', name: 'Ann' })
    const user = userEvent.setup()
    await renderScorecard()

    await user.click(screen.getByRole('button', { name: 'Finish' }))

    // One in the header, one on Ann's line in the sheet; none on Bo's.
    const stars = screen.getAllByRole('img', { name: 'You' })
    expect(stars).toHaveLength(2)
    const inSheet = stars.filter(star => !star.closest('th'))
    expect(inSheet).toHaveLength(1)
    expect(inSheet[0].parentElement).toHaveTextContent('Ann')
  })

  it('shows no star when signed out', async () => {
    mockAuth(null)
    await renderScorecard()

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('shows no star when the signed-in user has no name set', async () => {
    mockAuth({ id: 'u1', email: 'ann@example.com', name: null })
    await renderScorecard()

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })
})
