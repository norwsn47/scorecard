import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// §11.15 — a signed-in user's own name pre-fills the first player slot on a
// genuinely new round, is still freely editable, and is never forced onto an
// edit of an existing round (renaming a player there is a distinct action).

function mockAuthMe(user) {
  global.fetch = vi.fn(url => {
    if (String(url).startsWith('/api/courses')) {
      return Promise.resolve({ ok: true, json: async () => ({ courses: [] }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({ user }) })
  })
}

beforeEach(() => {
  localStorage.clear()
})

function renderSetup(params = {}) {
  const navigate = vi.fn()
  render(
    <AuthProvider>
      <Setup navigate={navigate} goBack={vi.fn()} params={params} />
    </AuthProvider>,
  )
  return { navigate }
}

describe('Setup — signed-in name pre-fill on New Game (§4.2, §11.15)', () => {
  it('pre-fills the first player slot with the signed-in user\'s own name once it resolves', async () => {
    mockAuthMe({ id: 'u1', name: 'Alice' })
    renderSetup()

    expect(await screen.findByDisplayValue('Alice')).toBeInTheDocument()
  })

  it('leaves the first slot empty when the signed-in user has no name set', async () => {
    mockAuthMe({ id: 'u1', name: null })
    renderSetup()

    await screen.findByPlaceholderText('Player 1')
    expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Player 1')).toHaveValue('')
  })

  it('leaves the first slot empty when signed out', async () => {
    mockAuthMe(null)
    renderSetup()

    await screen.findByPlaceholderText('Player 1')
    expect(screen.getByPlaceholderText('Player 1')).toHaveValue('')
  })

  it('is still freely editable/overwritable after the pre-fill', async () => {
    mockAuthMe({ id: 'u1', name: 'Alice' })
    const user = userEvent.setup()
    renderSetup()

    const input = await screen.findByDisplayValue('Alice')
    await user.clear(input)
    await user.type(input, 'Someone Else')
    expect(input).toHaveValue('Someone Else')
  })

  it('does not pre-fill the first slot when editing an existing round', async () => {
    mockAuthMe({ id: 'u1', name: 'Alice' })
    renderSetup({
      editRound: true,
      game: { id: 'g1', players: ['Bob'], holes: 2, holePars: [3, 3], scores: { Bob: [3, 4] }, completedAt: '2026-08-01T12:00:00.000Z' },
    })

    await screen.findByDisplayValue('Bob')
    expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument()
  })
})
