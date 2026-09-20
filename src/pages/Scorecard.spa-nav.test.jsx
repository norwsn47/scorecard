import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Scorecard from './Scorecard.jsx'
import { saveActiveGame } from '../utils/storage.js'
import { AuthProvider } from '../hooks/useAuth.jsx'

// #17 — opening /scorecard with no active game (a direct URL hit, or a
// browser bounce onto a stale entry). The guard sends the user home and the
// component renders nothing in the meantime. That the redirect fires from an
// effect rather than inline during render is proven by App.test.jsx's #17
// case, where `navigate` is App's real setState-driven function.

// Scorecard reads useAuth() (§11.15, the signed-in identity star) — a
// logged-out resolution is all these cases need.
beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Scorecard — no active game (#17)', () => {
  it('bounces home once and renders nothing', async () => {
    const navigate = vi.fn()

    const { container } = render(
      <AuthProvider>
        <Scorecard navigate={navigate} params={{}} />
      </AuthProvider>,
    )

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home', {}, { replace: true }))
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the grid and does not bounce when an active game is in storage', async () => {
    saveActiveGame({
      id: 'g1',
      players: ['Ann', 'Ben'],
      scores: { Ann: [null, null], Ben: [null, null] },
      holes: 2,
      holePars: [3, 3],
    })
    const navigate = vi.fn()

    render(
      <AuthProvider>
        <Scorecard navigate={navigate} params={{}} />
      </AuthProvider>,
    )

    expect(await screen.findByText('Ann')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
