import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// #56: a round's hole count can't change while it is being edited. Switching a
// 36-hole round onto a 9-hole course used to leave a 36-row grid with holes
// 10-36 padded to par 3, so a D1 edit only offers courses with the round's own
// hole count (plus the round's current course), and a course created mid-edit
// is locked to that hole count.

function dbRound(holes, courseId, courseName) {
  return {
    id: 'g1',
    _fromDb: true,
    players: ['Ann'],
    scores: { Ann: Array(holes).fill(3) },
    holes,
    holesPlayed: holes,
    completedAt: '2026-08-01T12:00:00.000Z',
    holePars: Array(holes).fill(3),
    courseId,
    courseName,
  }
}

function course(id, name, holes) {
  return { id, name, holes, hole_pars: JSON.stringify(Array(holes).fill(3)), is_default: 0, round_count: 0 }
}

function mockApi(courses) {
  global.fetch = vi.fn(url => {
    if (String(url).startsWith('/api/courses')) {
      return Promise.resolve({ ok: true, json: async () => ({ courses }) })
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ user: { id: 'u1', email: 'a@b.co', name: 'Ann' } }),
    })
  })
}

function renderEdit(game) {
  render(
    <AuthProvider>
      <Setup navigate={vi.fn()} params={{ editRound: true, game }} />
    </AuthProvider>,
  )
}

// The course <select>, found by its current display value (the player-name
// inputs are comboboxes too, so the role alone is ambiguous).
async function courseSelect(currentName) {
  return screen.findByDisplayValue(currentName)
}

function optionNames(select) {
  return within(select).getAllByRole('option').map(o => o.textContent)
}

beforeEach(() => {
  localStorage.clear()
})

describe('Setup - editing a round keeps its hole count (#56)', () => {
  it('lists only courses with the round\'s hole count', async () => {
    mockApi([course('a', 'Nine A', 9), course('b', 'Nine B', 9), course('c', 'Eighteen C', 18)])
    renderEdit(dbRound(9, 'a', 'Nine A'))

    expect(optionNames(await courseSelect('Nine A'))).toEqual(['Nine A', 'Nine B'])
    expect(screen.getByText('Course - 9-hole courses only, to match this round')).toBeInTheDocument()
  })

  it('always keeps the round\'s own course selectable, even if its hole count differs from the round\'s', async () => {
    // e.g. legacy data: an 18-hole round saved against a course recorded as 9 holes
    mockApi([course('a', 'Odd Nine', 9), course('b', 'Eighteen B', 18), course('c', 'Nine C', 9)])
    renderEdit(dbRound(18, 'a', 'Odd Nine'))

    expect(optionNames(await courseSelect('Odd Nine'))).toEqual(['Odd Nine', 'Eighteen B'])
  })

  it('a course created mid-edit is locked to the round\'s hole count (no 9/18 picker)', async () => {
    const user = userEvent.setup()
    mockApi([course('a', 'Eighteen A', 18)])
    renderEdit(dbRound(18, 'a', 'Eighteen A'))

    // Wait for the course list first: before it loads there is a separate
    // empty-state "+ New course" button that gets replaced.
    await courseSelect('Eighteen A')
    await user.click(screen.getByRole('button', { name: '+ New course' }))

    expect(screen.queryByRole('radiogroup', { name: 'Number of holes on this course' })).not.toBeInTheDocument()
    expect(screen.getByText('18 holes')).toBeInTheDocument()
    expect(screen.getByText("Holes - matches this round, can't be changed")).toBeInTheDocument()
  })

  it('a round that is not 9 or 18 holes cannot get a new course (only 9 or 18 are creatable)', async () => {
    mockApi([course('a', 'Nine A', 9)])
    renderEdit(dbRound(36, null, null))

    // No 36-hole course exists and none can be created, so the empty state says why.
    expect(await screen.findByText(/No courses with 36 holes/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ New course' })).not.toBeInTheDocument()
  })

  it('a new game still offers every course and the 9/18 hole picker', async () => {
    const user = userEvent.setup()
    mockApi([course('a', 'Nine A', 9), course('c', 'Eighteen C', 18)])
    render(
      <AuthProvider>
        <Setup navigate={vi.fn()} params={{}} />
      </AuthProvider>,
    )

    expect(optionNames(await courseSelect('Nine A'))).toEqual(['Nine A', 'Eighteen C'])

    await user.click(screen.getByRole('button', { name: '+ New course' }))
    expect(screen.getByRole('radiogroup', { name: 'Number of holes on this course' })).toBeInTheDocument()
  })
})
