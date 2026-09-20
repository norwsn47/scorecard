import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './pages/Login.jsx'
import Setup from './pages/Setup.jsx'
import Scorecard from './pages/Scorecard.jsx'
import Summary from './pages/Summary.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'

// BACKLOG #101 (accessibility, first half): form fields have accessible names
// (not just a placeholder), error and status messages are announced, and the
// pages that lacked one now have a <main> landmark.

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

function mockAuth(user = null, courses = []) {
  global.fetch = vi.fn(url => {
    if (String(url).startsWith('/api/courses')) {
      return Promise.resolve({ ok: true, json: async () => ({ courses }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({ user }) })
  })
}

async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

describe('Login', () => {
  it('associates the "Email address" label with the input and has a main landmark', async () => {
    mockAuth(null)
    render(<AuthProvider><Login navigate={vi.fn()} goBack={vi.fn()} /></AuthProvider>)
    await settle()

    expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email')
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('announces a failed send as an alert', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(url => {
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: async () => ({ user: null }) })
      }
      return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'Nope' }) })
    })
    render(<AuthProvider><Login navigate={vi.fn()} goBack={vi.fn()} /></AuthProvider>)
    await settle()

    await user.type(screen.getByLabelText('Email address'), 'a@b.co')
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('Setup', () => {
  it('names the player and date fields', async () => {
    mockAuth(null)
    render(<AuthProvider><Setup navigate={vi.fn()} goBack={vi.fn()} params={{ pastRound: true }} /></AuthProvider>)
    await settle()

    expect(screen.getByLabelText('Player 1 name')).toBeInTheDocument()
    expect(screen.getByLabelText('Date played')).toHaveAttribute('type', 'date')
  })

  it('names the notes field (shown when editing a round)', async () => {
    mockAuth(null)
    const game = {
      id: 'g1', players: ['Ann'], scores: { Ann: [3] }, holes: 1, holesPlayed: 1,
      completedAt: '2026-08-01T12:00:00.000Z', holePars: [3], courseId: null, courseName: 'B',
    }
    render(<AuthProvider><Setup navigate={vi.fn()} goBack={vi.fn()} params={{ editRound: true, game }} /></AuthProvider>)
    await settle()

    expect(screen.getByLabelText('Round notes').tagName).toBe('TEXTAREA')
  })

  it('names the course select and the new-course name field when signed in', async () => {
    const user = userEvent.setup()
    mockAuth(SIGNED_IN, [{ id: 'c1', name: 'Nine A', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 1, round_count: 0 }])
    render(<AuthProvider><Setup navigate={vi.fn()} goBack={vi.fn()} params={{}} /></AuthProvider>)

    await screen.findByDisplayValue('Nine A')
    expect(screen.getByLabelText('Course').tagName).toBe('SELECT')

    await user.click(screen.getByRole('button', { name: '+ New course' }))
    expect(screen.getByLabelText('Course name')).toBeInTheDocument()
  })
})

describe('Scorecard and Summary landmarks', () => {
  it('Scorecard has a main landmark holding the scoring grid', async () => {
    mockAuth(null)
    const game = { id: 'g1', players: ['Ann'], scores: { Ann: [null] }, holes: 1, courseId: null, courseName: 'B' }
    render(<AuthProvider><Scorecard navigate={vi.fn()} params={{ game }} /></AuthProvider>)
    await settle()

    const main = screen.getByRole('main')
    expect(main).toContainElement(screen.getByRole('table'))
    expect(main).toContainElement(screen.getByRole('button', { name: 'Increase score' }))
  })

  it('Summary has a main landmark holding the scorecard table and the actions', async () => {
    mockAuth(null)
    const game = {
      id: 'r1', courseId: null, courseName: 'B', completedAt: '2026-08-01T12:00:00.000Z',
      holes: 1, holesPlayed: 1, holePars: [3], players: ['Ann'], scores: { Ann: [3] },
    }
    render(<AuthProvider><Summary navigate={vi.fn()} params={{ game }} /></AuthProvider>)
    await settle()

    const main = screen.getByRole('main')
    expect(main).toContainElement(screen.getByRole('table'))
  })
})
