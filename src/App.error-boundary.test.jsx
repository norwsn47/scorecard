import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.jsx'

// A page that throws while rendering must land on the calm "Something went
// wrong" screen, and the error must be logged so it can be found in the
// console (App.jsx ErrorBoundary.componentDidCatch).
vi.mock('./pages/Home.jsx', () => ({
  default: () => {
    throw new Error('boom from Home')
  },
}))

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App ErrorBoundary', () => {
  it('shows the fallback screen and logs the error with its component stack', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()

    const logged = errorSpy.mock.calls.find(
      ([first]) => first instanceof Error && first.message === 'boom from Home',
    )
    expect(logged).toBeDefined()
    expect(logged[1]).toEqual(expect.objectContaining({ componentStack: expect.any(String) }))
  })
})
