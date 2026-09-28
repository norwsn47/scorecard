import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// #56 reversed (with explicit product-owner sign-off): a round's hole count
// CAN now change while it is being edited - any course is selectable
// regardless of hole count, and a new course can be created mid-edit
// regardless of the round's own hole count. The old restriction existed
// because switching a longer round onto a shorter course used to leave a
// silently-truncated grid with no warning; that risk is now covered by an
// explicit confirmation dialog (Setup.jsx's `pendingChange` state), gated at
// the point of selection, naming exactly which holes would lose their
// recorded scores. See src/utils/game.js's `buildEditGame` (`targetHoleCount`
// param) and `highestScoredHoleIndex` for the other half of this change.

function dbRound({ holes, scoredHoles = holes, courseId = null, courseName = null }) {
  const scores = Array(holes).fill(null)
  for (let i = 0; i < scoredHoles; i++) scores[i] = 3
  return {
    id: 'g1',
    _fromDb: true,
    players: ['Ann'],
    scores: { Ann: scores },
    holes,
    holesPlayed: scoredHoles,
    completedAt: '2026-08-01T12:00:00.000Z',
    holePars: Array(scoredHoles).fill(3),
    courseId,
    courseName,
  }
}

function course(id, name, holes) {
  return { id, name, holes, hole_pars: JSON.stringify(Array(holes).fill(3)), is_default: 0, round_count: 0 }
}

// Returns the list of POST /api/courses request bodies made so far, live -
// callers can inspect its length before/after an action to prove a course
// was (or was not) actually created server-side.
function mockApi(courses) {
  const postBodies = []
  global.fetch = vi.fn((url, options) => {
    const u = String(url)
    if (u.startsWith('/api/courses') && options?.method === 'POST') {
      const body = JSON.parse(options.body)
      postBodies.push(body)
      return Promise.resolve({
        ok: true,
        json: async () => ({
          course: { id: 'new-course', name: body.name, holes: body.holes, hole_pars: JSON.stringify(body.hole_pars) },
        }),
      })
    }
    if (u.startsWith('/api/courses')) {
      return Promise.resolve({ ok: true, json: async () => ({ courses }) })
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ user: { id: 'u1', email: 'a@b.co', name: 'Ann' } }),
    })
  })
  return postBodies
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

describe('Setup - editing a round can now change its course/hole count (#56 reversed)', () => {
  it('lists every course in the dropdown, regardless of hole count', async () => {
    mockApi([course('a', 'Nine A', 9), course('b', 'Eighteen B', 18)])
    renderEdit(dbRound({ holes: 9, courseId: 'a', courseName: 'Nine A' }))

    expect(optionNames(await courseSelect('Nine A'))).toEqual(['Nine A', 'Eighteen B'])
  })

  it('selecting a course with fewer holes than the round\'s highest scored hole shows a confirmation naming the holes at risk, and does not change the selected course', async () => {
    const user = userEvent.setup()
    mockApi([course('a', 'Eighteen A', 18), course('b', 'Nine B', 9)])
    renderEdit(dbRound({ holes: 18, scoredHoles: 18, courseId: 'a', courseName: 'Eighteen A' }))

    const select = await courseSelect('Eighteen A')
    await user.selectOptions(select, 'Nine B')

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/holes 10 to 18/)).toBeInTheDocument()
    // The select itself never changed - React re-renders it back to the
    // still-current selectedCourseId.
    expect(screen.getByDisplayValue('Eighteen A')).toBeInTheDocument()
  })

  it('confirming the dialog applies the new course selection', async () => {
    const user = userEvent.setup()
    mockApi([course('a', 'Eighteen A', 18), course('b', 'Nine B', 9)])
    renderEdit(dbRound({ holes: 18, scoredHoles: 18, courseId: 'a', courseName: 'Eighteen A' }))

    const select = await courseSelect('Eighteen A')
    await user.selectOptions(select, 'Nine B')
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Switch course' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByDisplayValue('Nine B')).toBeInTheDocument()
  })

  it('cancelling the dialog leaves the previous course selected and the round\'s scores untouched', async () => {
    const user = userEvent.setup()
    mockApi([course('a', 'Eighteen A', 18), course('b', 'Nine B', 9)])
    const game = dbRound({ holes: 18, scoredHoles: 18, courseId: 'a', courseName: 'Eighteen A' })
    const scoresBefore = JSON.stringify(game.scores)
    renderEdit(game)

    const select = await courseSelect('Eighteen A')
    await user.selectOptions(select, 'Nine B')
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Eighteen A')).toBeInTheDocument()
    expect(JSON.stringify(game.scores)).toBe(scoresBefore)
  })

  it('selecting a course with MORE holes than the round applies immediately, no confirmation shown', async () => {
    const user = userEvent.setup()
    mockApi([course('a', 'Nine A', 9), course('b', 'Eighteen B', 18)])
    renderEdit(dbRound({ holes: 9, scoredHoles: 9, courseId: 'a', courseName: 'Nine A' }))

    const select = await courseSelect('Nine A')
    await user.selectOptions(select, 'Eighteen B')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByDisplayValue('Eighteen B')).toBeInTheDocument()
  })

  it('selecting a course matching the round\'s actual highest scored hole (not its nominal `holes`) does not trigger the confirmation', async () => {
    // Theoretical/defensive case: `holes` is the round's nominal target and
    // `holesPlayed`/the real scored data can fall short of it (e.g. an
    // 18-hole round the player stopped after 9, saved as a DNF) - the
    // confirmation must key off the real data, not the nominal count.
    const user = userEvent.setup()
    mockApi([course('a', 'Eighteen A', 18), course('b', 'Nine B', 9)])
    renderEdit(dbRound({ holes: 18, scoredHoles: 9, courseId: 'a', courseName: 'Eighteen A' }))

    const select = await courseSelect('Eighteen A')
    await user.selectOptions(select, 'Nine B')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByDisplayValue('Nine B')).toBeInTheDocument()
  })

  it('"+ New course" mid-edit offers the same 9/18 hole-count picker as a new round', async () => {
    const user = userEvent.setup()
    mockApi([course('a', 'Nine A', 9)])
    // Only 3 holes actually scored, so the 9-hole default is safe and the
    // form opens directly with no confirmation in the way.
    renderEdit(dbRound({ holes: 9, scoredHoles: 3, courseId: 'a', courseName: 'Nine A' }))

    await courseSelect('Nine A')
    await user.click(screen.getByRole('button', { name: '+ New course' }))

    expect(screen.getByRole('radiogroup', { name: 'Number of holes on this course' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '9 holes' })).toHaveAttribute('aria-checked', 'true')
  })

  it('"+ New course" mid-edit on a round with real scores past hole 9 gates the (default 9-hole) creation behind the same confirmation, and does not POST until confirmed', async () => {
    const user = userEvent.setup()
    const postBodies = mockApi([course('a', 'Eighteen A', 18)])
    renderEdit(dbRound({ holes: 18, scoredHoles: 18, courseId: 'a', courseName: 'Eighteen A' }))

    await courseSelect('Eighteen A')
    await user.click(screen.getByRole('button', { name: '+ New course' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/holes 10 to 18/)).toBeInTheDocument()
    // Cancelling never enters the creation form and never POSTs.
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Course name')).not.toBeInTheDocument()
    expect(postBodies).toHaveLength(0)

    // Trying again and confirming this time opens the creation form at 9
    // holes; the course is still only created once the user actually submits.
    await user.click(screen.getByRole('button', { name: '+ New course' }))
    await user.click(await screen.findByRole('button', { name: 'Create course' }))
    expect(await screen.findByPlaceholderText('Course name')).toBeInTheDocument()
    expect(postBodies).toHaveLength(0)

    await user.type(screen.getByPlaceholderText('Course name'), 'New Nine')
    await user.click(screen.getByRole('button', { name: 'Edit hole scores' }))

    await vi.waitFor(() => expect(postBodies).toHaveLength(1))
    expect(postBodies[0]).toMatchObject({ name: 'New Nine', holes: 9 })
  })

  it('a 36-hole round can now get a new course created mid-edit (the old 36-hole restriction is gone)', async () => {
    const user = userEvent.setup()
    mockApi([])
    // Only 3 holes actually scored, so the 9-hole default is safe.
    renderEdit(dbRound({ holes: 36, scoredHoles: 3, courseId: null, courseName: null }))

    await screen.findByText('No courses yet - add one to get started')
    await user.click(screen.getByRole('button', { name: '+ New course' }))

    expect(screen.getByRole('radiogroup', { name: 'Number of holes on this course' })).toBeInTheDocument()
  })

  it('a new game (not an edit) still offers every course and the 9/18 hole picker, unaffected by any of the above', async () => {
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
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
