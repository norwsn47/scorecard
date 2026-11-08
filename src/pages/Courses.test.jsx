import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Courses from './Courses.jsx'
import CourseEdit from './CourseEdit.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Settings > My courses: list of the signed-in user's own courses, each a
// tap-through to CourseEdit.

const user = { id: 'u1', email: 'jane@example.com', name: 'Jane' }

const courses = [
  { id: 'c1', name: 'Bruntsfield', holes: 18, hole_pars: JSON.stringify(Array(18).fill(3)), is_default: 1, round_count: 12 },
  { id: 'c2', name: 'Back garden', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 0, round_count: 1 },
  { id: 'c3', name: 'Park loop', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 0, round_count: 0 },
]

function mockApi({ me = user, coursesRes } = {}) {
  global.fetch = vi.fn(url => {
    if (String(url).includes('/api/auth/me')) {
      return Promise.resolve({ ok: true, json: async () => ({ user: me }) })
    }
    if (String(url).startsWith('/api/courses')) {
      return (coursesRes ?? (() => Promise.resolve({ ok: true, json: async () => ({ courses }) })))()
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

function renderCourses() {
  const navigate = vi.fn()
  const goBack = vi.fn()
  render(
    <AuthProvider>
      <Courses navigate={navigate} goBack={goBack} params={{}} />
    </AuthProvider>,
  )
  return { navigate, goBack }
}

beforeEach(() => { window.history.replaceState({}, '', '/courses') })
afterEach(() => { vi.restoreAllMocks() })

describe('Courses (My courses)', () => {
  it('lists each course with its sublines and a default marker on the default one only', async () => {
    mockApi()
    renderCourses()

    expect(await screen.findByRole('heading', { name: 'My courses' })).toBeInTheDocument()
    expect(screen.getByText(/Change a course's name or the par for each hole/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Bruntsfield/ })).toHaveTextContent('18 holes · 12 rounds · default')
    expect(screen.getByRole('button', { name: /Back garden/ })).toHaveTextContent('9 holes · 1 round')
    expect(screen.getByRole('button', { name: /Back garden/ })).not.toHaveTextContent('rounds')
    expect(screen.getByRole('button', { name: /Back garden/ })).not.toHaveTextContent('default')
    expect(screen.getByRole('button', { name: /Park loop/ })).toHaveTextContent('9 holes · 0 rounds')
    expect(screen.queryByRole('button', { name: /new course/i })).not.toBeInTheDocument()
  })

  it('opens CourseEdit for the tapped course', async () => {
    const u = userEvent.setup()
    mockApi()
    const { navigate } = renderCourses()

    await u.click(await screen.findByRole('button', { name: /Back garden/ }))
    expect(navigate).toHaveBeenCalledWith('courseEdit', { courseId: 'c2' })
  })

  it('goes back to Settings from the header', async () => {
    const u = userEvent.setup()
    mockApi()
    const { goBack } = renderCourses()

    await u.click(await screen.findByRole('button', { name: '← Settings' }))
    expect(goBack).toHaveBeenCalledWith('settings')
  })

  it('bounces signed-out visitors Home, replacing the history entry', async () => {
    mockApi({ me: null })
    const { navigate } = renderCourses()

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home', {}, { replace: true }))
  })

  it('shows an empty state when there are no courses', async () => {
    mockApi({ coursesRes: () => Promise.resolve({ ok: true, json: async () => ({ courses: [] }) }) })
    renderCourses()

    expect(await screen.findByText(/No courses yet - add one when you start your next game/)).toBeInTheDocument()
  })

  it('shows an error with Try again that re-fetches', async () => {
    const u = userEvent.setup()
    let fail = true
    mockApi({
      coursesRes: () => fail
        ? Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
        : Promise.resolve({ ok: true, json: async () => ({ courses }) }),
    })
    renderCourses()

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your courses")
    fail = false
    await u.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: /Bruntsfield/ })).toBeInTheDocument()
  })

  it('offers Sign in when the session has expired', async () => {
    const u = userEvent.setup()
    mockApi({ coursesRes: () => Promise.resolve({ ok: false, status: 401, json: async () => ({}) }) })
    const { navigate } = renderCourses()

    expect(await screen.findByRole('alert')).toHaveTextContent("You've been signed out")
    await u.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(navigate).toHaveBeenCalledWith('login')
  })

  it('opens CourseEdit with that id, which loads the same course', async () => {
    const u = userEvent.setup()
    mockApi()
    const { navigate } = renderCourses()
    await u.click(await screen.findByRole('button', { name: /Park loop/ }))
    const [, params] = navigate.mock.calls.find(([page]) => page === 'courseEdit')

    render(<CourseEdit navigate={vi.fn()} goBack={vi.fn()} params={params} />)
    expect(await screen.findByDisplayValue('Park loop')).toBeInTheDocument()
  })
})
