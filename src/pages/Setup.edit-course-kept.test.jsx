import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import Scorecard from './Scorecard.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getActiveGame, getCompletedGames, markCompletedGamePending } from '../utils/storage.js'

// A local edit has no course picker, so it must leave the round's own course
// alone (BACKLOG #95 review, HIGH). A pending round carries a D1 course id its
// later sync needs; blanking it on edit would make the round sync with
// course_id = null. Runs the real Setup -> Scorecard edit flow end to end.

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

const record = {
  id: 'g1',
  players: ['Ann'],
  scores: { Ann: [3, 4] },
  holes: 2,
  holesPlayed: 2,
  completedAt: '2026-08-01T12:00:00.000Z',
  holePars: [3, 3],
  courseId: 'c1',
  courseName: 'Some Course',
}

const stored = () => getCompletedGames().find(g => g.id === 'g1')

function mockFetch(user) {
  global.fetch = vi.fn(url => {
    if (String(url).includes('/api/auth/me')) return Promise.resolve({ ok: true, json: async () => ({ user }) })
    if (String(url).includes('/api/courses')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ courses: [{ id: 'c1', name: 'Some Course', holes: 2, hole_pars: [3, 3], is_default: 1 }] }),
      })
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

// Setup -> "Edit hole scores" -> Scorecard -> change hole 1 -> save changes.
async function editThroughSetupAndScorecard(handedOver) {
  const user = userEvent.setup()
  const setupNavigate = vi.fn()
  const { unmount } = render(
    <AuthProvider>
      <Setup navigate={setupNavigate} params={{ editRound: true, game: handedOver }} />
    </AuthProvider>,
  )
  await user.click(await screen.findByRole('button', { name: 'Edit hole scores' }))
  await waitFor(() => expect(setupNavigate).toHaveBeenCalledWith('scorecard', expect.any(Object)))
  const [, scorecardParams] = setupNavigate.mock.calls.find(([page]) => page === 'scorecard')

  // The working copy Setup handed over, as stored in the active-game slot.
  expect(getActiveGame()).toMatchObject({ courseId: handedOver.courseId ?? null, courseName: handedOver.courseName ?? null })
  unmount()

  const scorecardNavigate = vi.fn()
  render(
    <AuthProvider>
      <Scorecard navigate={scorecardNavigate} params={scorecardParams} />
    </AuthProvider>,
  )
  await user.click(await screen.findByLabelText('Increase score')) // Ann / hole 1: 3 -> 4
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.click(screen.getByRole('button', { name: /save changes/i }))
  await waitFor(() => expect(scorecardNavigate).toHaveBeenCalledWith('summary', expect.any(Object)))
  return scorecardNavigate
}

beforeEach(() => {
  localStorage.clear()
})

describe('Setup -> Scorecard - a local edit keeps the round\'s own course', () => {
  it('a pending round keeps its courseId and courseName and stays pending after an edit is saved', async () => {
    mockFetch(SIGNED_IN)
    localStorage.setItem('gt_completed_games', JSON.stringify([record]))
    markCompletedGamePending('g1', 'u1', null)
    const handedOver = { ...stored(), _pending: true, _rejected: false } // as History tags it

    const navigate = await editThroughSetupAndScorecard(handedOver)

    const after = stored()
    expect(after.scores.Ann[0]).toBe(4)
    expect(after.courseId).toBe('c1')
    expect(after.courseName).toBe('Some Course')
    expect(after.pendingSyncUserId).toBe('u1')
    expect(after.synced).toBeUndefined()
    const summaryGame = navigate.mock.calls.find(([page]) => page === 'summary')[1].game
    expect(summaryGame).toMatchObject({ courseId: 'c1', courseName: 'Some Course', pendingSyncUserId: 'u1' })
    expect(summaryGame.synced).toBeUndefined()
  })

  it('a signed-out local edit keeps its quick-play course label and has no course id or pending marker', async () => {
    mockFetch(null)
    localStorage.setItem(
      'gt_completed_games',
      JSON.stringify([{ ...record, courseId: null, courseName: 'Quick Play' }]),
    )

    const navigate = await editThroughSetupAndScorecard(stored())

    const after = stored()
    expect(after.scores.Ann[0]).toBe(4)
    expect(after.courseId).toBeNull()
    expect(after.courseName).toBe('Quick Play')
    expect(after.pendingSyncUserId).toBeUndefined()
    expect(navigate.mock.calls.find(([page]) => page === 'summary')[1].game.synced).toBe(true)
  })

  it('a signed-out local round with no course label at all stays null', async () => {
    mockFetch(null)
    const bare = { ...record, courseId: null }
    delete bare.courseName
    localStorage.setItem('gt_completed_games', JSON.stringify([bare]))

    await editThroughSetupAndScorecard(stored())

    expect(stored().courseId).toBeNull()
    expect(stored().courseName).toBeNull()
  })
})
