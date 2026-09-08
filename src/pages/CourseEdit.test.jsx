import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CourseEdit from './CourseEdit.jsx'

// Editing and deleting a course from its dedicated screen (§11.7, #54/#71).
// GET /api/courses has no single-course endpoint, so CourseEdit fetches the
// full list and finds the course by id — same request Setup already makes.

const course = {
  id: 'c1',
  name: 'Bruntsfield',
  holes: 9,
  hole_pars: JSON.stringify([3, 3, 3, 3, 3, 3, 3, 3, 3]),
  is_default: 0,
  round_count: 12,
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('CourseEdit (#54/#71)', () => {
  it('loads the course by id and renders its name and full-length par grid', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ courses: [course] }) })

    render(<CourseEdit navigate={vi.fn()} params={{ courseId: 'c1' }} />)

    expect(await screen.findByDisplayValue('Bruntsfield')).toBeInTheDocument()
    // Rendered read-only-length at the course's own hole count (9) — no
    // hole-count control anywhere on this screen (§11.7).
    expect(screen.getAllByRole('group', { name: /^Hole \d, par 3$/ })).toHaveLength(9)
    expect(screen.queryByText(/holes.*can.t be changed later/i)).not.toBeInTheDocument()
  })

  it('shows a not-found state for an id that is missing or not owned by this user', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ courses: [] }) })

    render(<CourseEdit navigate={vi.fn()} params={{ courseId: 'missing' }} />)

    expect(await screen.findByText("We can't find that course")).toBeInTheDocument()
  })

  it('saves the edited name and par via PATCH, then returns to the calling Setup screen', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ courses: [course] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, id: 'c1' }) })
    global.fetch = fetchMock
    const navigate = vi.fn()

    render(<CourseEdit navigate={navigate} params={{ courseId: 'c1', editRound: true, pastRound: false }} />)
    await screen.findByDisplayValue('Bruntsfield')

    const nameInput = screen.getByPlaceholderText('Course name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Bruntsfield Renamed')
    await user.click(screen.getByLabelText('Increase par for hole 1'))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([url]) => url === '/api/courses/c1')
      expect(patchCall).toBeTruthy()
      expect(patchCall[1].method).toBe('PATCH')
      const body = JSON.parse(patchCall[1].body)
      expect(body.name).toBe('Bruntsfield Renamed')
      expect(body.hole_pars[0]).toBe(4)
      // Hole count is never sent — the API rejects it outright (§11.7).
      expect(body.holes).toBeUndefined()
    })
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('setup', { editRound: true, pastRound: false, game: null, bruntsfield: false })
    )
  })

  it('the delete confirmation states the round count before confirming, deletes, and returns home', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ courses: [course] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, deleted_rounds: 12 }) })
    global.fetch = fetchMock
    const navigate = vi.fn()

    render(<CourseEdit navigate={navigate} params={{ courseId: 'c1' }} />)
    await screen.findByDisplayValue('Bruntsfield')

    await user.click(screen.getByRole('button', { name: 'Delete this course' }))
    expect(await screen.findByText('Delete Bruntsfield?')).toBeInTheDocument()
    expect(screen.getByText(/This will also delete 12 rounds recorded on this course\. This cannot be undone\./)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls[1][0]).toBe('/api/courses/c1')
      expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
    })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
  })
})
