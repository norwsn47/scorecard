import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BruntsfiledCoursePage from './BruntsfiledCoursePage.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Covers #78: the three conditional foot-of-page links (active game /
// "Resume Game", signed-out "Last round", signed-in "Past Rounds") and the
// always-present "← Golf Scorecard home" link, including its track() call.

function mountFetch(user = null) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user }) })
}

function renderPage(props = {}) {
  const navigate = vi.fn()
  render(
    <AuthProvider>
      <BruntsfiledCoursePage navigate={navigate} {...props} />
    </AuthProvider>,
  )
  return { navigate }
}

const activeGame = { name: 'Saturday four', players: ['Ann', 'Bo'] }
const completedGame = {
  id: 'g1',
  name: '',
  players: ['Ann', 'Bo'],
  completedAt: '2026-08-01T10:00:00.000Z',
}

beforeEach(() => {
  localStorage.clear()
})

describe('BruntsfiledCoursePage (#78)', () => {
  it('signed out, no active game, no last round: shows New Game and the sign-in prompt, not Resume/Last round', async () => {
    mountFetch(null)
    renderPage()

    await screen.findByRole('button', { name: 'New Game' })
    expect(screen.queryByRole('button', { name: /Resume Game/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Last round:/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign in/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Past Rounds' })).not.toBeInTheDocument()
  })

  it('shows Resume Game when an active game is in progress and navigates to the scorecard on tap', async () => {
    const user = userEvent.setup()
    localStorage.setItem('gt_active_game', JSON.stringify(activeGame))
    mountFetch(null)
    const { navigate } = renderPage()

    const resume = await screen.findByRole('button', { name: /Resume Game/ })
    expect(resume).toHaveTextContent('Saturday four')

    await user.click(resume)
    expect(navigate).toHaveBeenCalledWith('scorecard')
  })

  it('signed out with a completed round shows "Last round" and navigates to its summary on tap', async () => {
    const user = userEvent.setup()
    localStorage.setItem('gt_completed_games', JSON.stringify([completedGame]))
    mountFetch(null)
    const { navigate } = renderPage()

    const lastRound = await screen.findByRole('button', { name: /Last round:/ })
    expect(lastRound).toHaveTextContent('Ann, Bo')

    await user.click(lastRound)
    expect(navigate).toHaveBeenCalledWith('summary', { game: completedGame })
  })

  it('signed in: shows Past Rounds instead of the sign-in prompt or last-round link, and navigates on tap', async () => {
    const user = userEvent.setup()
    // Would be picked up as "last round" if the user were signed out —
    // signed in, it must not surface here (Past Rounds covers it instead).
    localStorage.setItem('gt_completed_games', JSON.stringify([completedGame]))
    mountFetch({ id: 'u1', email: 'jane@example.com' })
    const { navigate } = renderPage()

    const pastRounds = await screen.findByRole('button', { name: 'Past Rounds' })
    expect(screen.queryByText(/Last round:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sign in/ })).not.toBeInTheDocument()

    await user.click(pastRounds)
    expect(navigate).toHaveBeenCalledWith('history', { bruntsfield: true })
  })

  it('the "Sign in" prompt navigates to the login screen', async () => {
    const user = userEvent.setup()
    mountFetch(null)
    const { navigate } = renderPage()

    await user.click(await screen.findByRole('button', { name: /Sign in/ }))
    expect(navigate).toHaveBeenCalledWith('login')
  })

  it('the "← Golf Scorecard home" link tracks the click and navigates home', async () => {
    const user = userEvent.setup()
    mountFetch(null)
    const plausible = vi.fn()
    window.plausible = plausible
    const { navigate } = renderPage()

    await user.click(await screen.findByRole('button', { name: '← Golf Scorecard home' }))

    expect(plausible).toHaveBeenCalledWith('Bruntsfield Home Link Clicked', { props: {} })
    expect(navigate).toHaveBeenCalledWith('home')

    delete window.plausible
  })
})
