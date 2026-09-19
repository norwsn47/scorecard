import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Scorecard from './Scorecard.jsx'
import { saveActiveGame } from '../utils/storage.js'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { BRUNTSFIELD_COURSE_NAME, QUICK_PLAY_COURSE_NAME } from '../constants.js'

// Regression coverage for the Map button visibility gate (BACKLOG #1, reviewer
// follow-up). The button must show for Bruntsfield (quick-play or a signed-in
// user's Bruntsfield-named course) and must NOT show for a signed-in user's
// non-Bruntsfield course, or — the bug the reviewer caught — a signed-in user
// with no course selected at all, a real state Setup supports (Setup.jsx),
// not a stand-in for Bruntsfield. `!game.courseId` alone can't tell those two
// "no course" cases apart, which is exactly how the previous attempt at this
// fix regressed; sign-in state is what actually distinguishes them.

const basePlayers = ['Ann']
const baseScores = { Ann: [null] }

function quickPlayGame(courseName = QUICK_PLAY_COURSE_NAME) {
  return { id: 'g1', players: basePlayers, scores: baseScores, holes: 1, courseId: null, courseName }
}

function signedInGame(courseId, courseName) {
  return { id: 'g2', players: basePlayers, scores: baseScores, holes: 1, courseId, courseName }
}

function mockAuth(user) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user }) })
}

function renderScorecard(params) {
  return render(
    <AuthProvider>
      <Scorecard navigate={vi.fn()} params={params} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('Scorecard — Map button visibility (BACKLOG #1)', () => {
  it('1. logged-out quick-play: button shows', async () => {
    mockAuth(null)
    renderScorecard({ game: quickPlayGame() })

    expect(await screen.findByLabelText('View course map')).toBeInTheDocument()
  })

  it('2. signed-in, playing their Bruntsfield-named course: button shows', async () => {
    mockAuth({ id: 'u1', email: 'ann@example.com', name: 'Ann' })
    renderScorecard({ game: signedInGame('c1', BRUNTSFIELD_COURSE_NAME) })

    expect(await screen.findByLabelText('View course map')).toBeInTheDocument()
  })

  it('3. signed-in, playing a different-named course: button does not show', async () => {
    mockAuth({ id: 'u1', email: 'ann@example.com', name: 'Ann' })
    renderScorecard({ game: signedInGame('c2', 'Musselburgh Links') })

    await waitFor(() => {
      expect(screen.queryByLabelText('View course map')).not.toBeInTheDocument()
    })
  })

  it('4. signed-in, zero courses / no course selected: button does not show', async () => {
    mockAuth({ id: 'u1', email: 'ann@example.com', name: 'Ann' })
    renderScorecard({ game: signedInGame(null, null) })

    await waitFor(() => {
      expect(screen.queryByLabelText('View course map')).not.toBeInTheDocument()
    })
  })

  it('5a. Resume Game path (no route params), logged-out: resolves off the stored game, button shows', async () => {
    mockAuth(null)
    saveActiveGame(quickPlayGame())
    renderScorecard(undefined)

    expect(await screen.findByLabelText('View course map')).toBeInTheDocument()
  })

  it('5b. Resume Game path (no route params), signed-in with no course: resolves off the stored game, button does not show', async () => {
    mockAuth({ id: 'u1', email: 'ann@example.com', name: 'Ann' })
    saveActiveGame(signedInGame(null, null))
    renderScorecard(undefined)

    await waitFor(() => {
      expect(screen.queryByLabelText('View course map')).not.toBeInTheDocument()
    })
  })
})
