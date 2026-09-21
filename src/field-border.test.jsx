import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './pages/Login.jsx'
import Setup from './pages/Setup.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'

// BACKLOG #108: form-field edges use the stronger `border-field` token (about
// 3.7:1) rather than the decorative hairline `border-border` (1.39:1), so a
// field's boundary is visible outdoors (WCAG 1.4.11). Error and duplicate
// states keep `border-accent`.

function mockApi(courses = []) {
  global.fetch = vi.fn(url => {
    if (String(url).startsWith('/api/courses')) {
      return Promise.resolve({ ok: true, json: async () => ({ courses }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({ user: { id: 'u1', email: 'a@b.co', name: 'Ann' } }) })
  })
}

async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

function fields(container) {
  return [...container.querySelectorAll('input:not([type=hidden]), textarea, select')]
}

function expectFieldEdges(container) {
  const all = fields(container)
  expect(all.length).toBeGreaterThan(0)
  for (const el of all) {
    expect(el.className, `${el.tagName} ${el.getAttribute('aria-label') ?? ''}`).toContain('border-field')
    expect(el.className).not.toMatch(/(^|\s)border-border(\s|$)/)
  }
}

const nineHoleCourse = { id: 'c1', name: 'Nine A', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 0, round_count: 0 }

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

describe('form fields use the stronger edge (#108)', () => {
  it('Login email input', async () => {
    mockApi()
    const { container } = render(<AuthProvider><Login navigate={vi.fn()} goBack={vi.fn()} /></AuthProvider>)
    await settle()
    expectFieldEdges(container)
  })

  it('Setup: course select, player, date and notes fields', async () => {
    mockApi([nineHoleCourse])
    const { container } = render(<AuthProvider><Setup navigate={vi.fn()} params={{}} /></AuthProvider>)
    await settle()
    expect(container.querySelector('select')).toBeTruthy()
    expectFieldEdges(container)
  })

  it('Setup: the new-course name input has the field edge, and a duplicate player name keeps the accent edge', async () => {
    const user = userEvent.setup()
    mockApi([nineHoleCourse])
    const { container } = render(<AuthProvider><Setup navigate={vi.fn()} params={{}} /></AuthProvider>)
    await settle()
    await user.click(await screen.findByRole('button', { name: '+ New course' }))
    expectFieldEdges(container)

    await user.click(screen.getByRole('button', { name: /add player/i }))
    const p1 = screen.getByLabelText('Player 1 name')
    const p2 = screen.getByLabelText('Player 2 name')
    await user.clear(p1)
    await user.type(p1, 'Sam')
    await user.type(p2, 'Sam')
    expect(p2.className).toContain('border-accent')
    expect(p2.className).not.toContain('border-field')
  })
})
