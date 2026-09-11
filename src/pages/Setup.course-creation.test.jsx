import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Course-creation UI (#35). "+ New course" used to be a sentinel option
// inside the course <select> (value="__new__") — picking it didn't select a
// course, it flipped the UI into creation mode. That pattern isn't cleanly
// drivable by userEvent.selectOptions / fireEvent.change in jsdom (a native
// select fires a real "selection changed" change event, not a "command"
// one), which left the 9/18 hole-count radiogroup and the par stepper's 2-7
// clamp untested. Refactored so "+ New course" is a standalone button beside
// the select — same trigger, ordinary click, now testable directly.

const coursesResponse = {
  courses: [
    { id: 'courseA', name: 'Course A', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 1, round_count: 1 },
    { id: 'courseB', name: 'Course B', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 0, round_count: 0 },
  ],
}

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn(url => {
    if (String(url).startsWith('/api/courses')) {
      return Promise.resolve({ ok: true, json: async () => coursesResponse })
    }
    return Promise.resolve({ ok: true, json: async () => ({ user: { id: 'u1' } }) })
  })
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

async function enterCreationMode() {
  const user = userEvent.setup()
  renderSetup()
  await screen.findByDisplayValue('Course A')
  await user.click(screen.getByRole('button', { name: '+ New course' }))
  return user
}

describe('Setup — "+ New course" button (#35)', () => {
  it('sits beside the select, which now holds only real course options', async () => {
    renderSetup()

    const select = await screen.findByDisplayValue('Course A')
    expect(select.tagName).toBe('SELECT')
    // No more sentinel option inside the select itself.
    expect(screen.queryByRole('option', { name: '+ New course' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New course' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('clicking "+ New course" enters creation mode and shows the radiogroup and par stepper', async () => {
    await enterCreationMode()

    expect(screen.getByPlaceholderText('Course name')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Number of holes on this course' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '9 holes' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '18 holes' })).toHaveAttribute('aria-checked', 'false')
    // Default 9-hole par stepper, all starting at par 3.
    expect(screen.getAllByRole('group')).toHaveLength(9)
    expect(screen.getByRole('group', { name: 'Hole 1, par 3' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Hole 9, par 3' })).toBeInTheDocument()
  })

  it('the 9/18 radiogroup selects correctly and resets the par array to the right length of 3s', async () => {
    const user = await enterCreationMode()

    await user.click(screen.getByRole('radio', { name: '18 holes' }))

    expect(screen.getByRole('radio', { name: '18 holes' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '9 holes' })).toHaveAttribute('aria-checked', 'false')
    const groups = screen.getAllByRole('group')
    expect(groups).toHaveLength(18)
    expect(screen.getByRole('group', { name: 'Hole 18, par 3' })).toBeInTheDocument()

    // Switching back to 9 resets the array back down to 9 holes of par 3.
    await user.click(screen.getByRole('radio', { name: '9 holes' }))
    expect(screen.getAllByRole('group')).toHaveLength(9)
    expect(screen.queryByRole('group', { name: /^Hole 1[0-8],/ })).not.toBeInTheDocument()
  })

  it('the par stepper clamps at 2 and cannot go lower', async () => {
    const user = await enterCreationMode()

    const decrease = screen.getByRole('button', { name: 'Decrease par for hole 1' })
    await user.click(decrease) // 3 -> 2
    expect(screen.getByRole('group', { name: 'Hole 1, par 2' })).toBeInTheDocument()
    expect(decrease).toBeDisabled()

    await user.click(decrease) // no-op at the floor
    expect(screen.getByRole('group', { name: 'Hole 1, par 2' })).toBeInTheDocument()
  })

  it('the par stepper clamps at 7 and cannot go higher', async () => {
    const user = await enterCreationMode()

    const increase = screen.getByRole('button', { name: 'Increase par for hole 1' })
    for (let i = 0; i < 4; i++) await user.click(increase) // 3 -> 7

    expect(screen.getByRole('group', { name: 'Hole 1, par 7' })).toBeInTheDocument()
    expect(increase).toBeDisabled()

    await user.click(increase) // no-op at the ceiling
    expect(screen.getByRole('group', { name: 'Hole 1, par 7' })).toBeInTheDocument()
  })

  it('"Cancel" in creation mode returns to the select view', async () => {
    await enterCreationMode()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByDisplayValue('Course A')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Course name')).not.toBeInTheDocument()
  })
})
