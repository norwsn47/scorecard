import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getActiveGame } from '../utils/storage.js'

// Round-level par correction on the past-round edit flow (§11.13, #54/#71) —
// a separate, distinct capability from the course selector above it, and
// from editing the course itself (§11.7). Alongside Scorecard.edit.test.jsx
// and Setup.edit-recovery.test.jsx.

const savedLocalRound = {
  id: 'g1',
  players: ['Ann'],
  scores: { Ann: [3, 4] },
  holes: 2,
  holesPlayed: 2,
  completedAt: '2026-08-01T12:00:00.000Z',
  holePars: [3, 4],
  courseId: null,
  courseName: 'Bruntsfield',
}

const savedDbRound = {
  id: 'g2',
  _fromDb: true,
  players: ['Ann'],
  scores: { Ann: [3, 4] },
  holes: 2,
  holesPlayed: 2,
  completedAt: '2026-08-01T12:00:00.000Z',
  holePars: [3, 4],
  courseId: 'courseA',
  courseName: 'Course A',
}

const coursesResponse = {
  courses: [
    { id: 'courseA', name: 'Course A', holes: 2, hole_pars: JSON.stringify([3, 4]), is_default: 0, round_count: 1 },
    { id: 'courseB', name: 'Course B', holes: 2, hole_pars: JSON.stringify([5, 5]), is_default: 0, round_count: 0 },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

describe('Setup — round-level par correction (§11.13, #54/#71)', () => {
  it('logged-out (local) edit: shows a "Par for this round" section, seeded from the round\'s own saved par, with no course section above it', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })

    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: savedLocalRound }} />
      </AuthProvider>,
    )

    expect(await screen.findByText('Par for this round')).toBeInTheDocument()
    // Seeded from the round's own saved snapshot (3, 4) — not a course default.
    expect(screen.getByRole('group', { name: 'Hole 1, par 3' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Hole 2, par 4' })).toBeInTheDocument()
    // Local/quick-play round: no course selector, so no "Course" section
    // for this to be confused with.
    expect(screen.queryByText('Course')).not.toBeInTheDocument()
  })

  it('adjusting the round-par stepper and saving carries the new value into the working game — never the course default', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })

    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: savedLocalRound }} />
      </AuthProvider>,
    )

    await screen.findByText('Par for this round')
    await user.click(screen.getByLabelText('Increase par for hole 1')) // 3 -> 4
    await user.click(screen.getByRole('button', { name: 'Edit hole scores' }))

    await waitFor(() => {
      expect(getActiveGame()?.holePars).toEqual([4, 4])
    })
  })

  it('D1 edit: switching the course resets the round-par stepper to the newly-selected course\'s par, then stays hand-editable', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(url => {
      if (String(url).startsWith('/api/courses')) {
        return Promise.resolve({ ok: true, json: async () => coursesResponse })
      }
      return Promise.resolve({ ok: true, json: async () => ({ user: { id: 'u1' } }) })
    })

    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{ editRound: true, game: savedDbRound }} />
      </AuthProvider>,
    )

    // Initially seeded from the round's own saved snapshot, not Course A's.
    expect(await screen.findByRole('group', { name: 'Hole 1, par 3' })).toBeInTheDocument()

    const select = await screen.findByDisplayValue('Course A')
    await user.selectOptions(select, 'Course B')

    // Resets to Course B's own par (5, 5).
    await waitFor(() => expect(screen.getByRole('group', { name: 'Hole 1, par 5' })).toBeInTheDocument())

    // Still freely hand-editable after the reset.
    await user.click(screen.getByLabelText('Increase par for hole 1'))
    expect(screen.getByRole('group', { name: 'Hole 1, par 6' })).toBeInTheDocument()
  })
})
