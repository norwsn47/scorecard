import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// First render coverage for Login (#35). Two things this pins down:
// - both screens (the form and the "check your email" confirmation) show the
//   same "← Home" back button — a stale "← Back" on the form screen survived
//   #43b's review precisely because nothing rendered Login in a test.
// - the happy path POSTs the email to /api/auth/request-link and swaps to the
//   confirmation screen; a server error keeps the user on the form.

function routedFetch(handlers) {
  return vi.fn((url, opts) => {
    if (url.includes('/api/auth/me') || url.includes('/api/auth/logout')) {
      return Promise.resolve({ ok: true, json: async () => ({ user: null }) })
    }
    if (url.includes('/api/auth/request-link')) {
      return handlers.requestLink(opts)
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

beforeEach(() => {
  window.history.replaceState({}, '', '/login')
  global.fetch = routedFetch({
    requestLink: () => Promise.resolve({ ok: true, json: async () => ({ ok: true }) }),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderLogin(props = {}) {
  const navigate = vi.fn()
  const goBack = vi.fn()
  render(
    <AuthProvider>
      <Login navigate={navigate} goBack={goBack} {...props} />
    </AuthProvider>,
  )
  return { navigate, goBack }
}

describe('Login (#35)', () => {
  it('renders the form with a "← Home" back button that calls goBack("home")', async () => {
    const user = userEvent.setup()
    const { goBack } = renderLogin()

    expect(screen.getByRole('heading', { name: 'Sign in to Scorecard' })).toBeInTheDocument()
    const back = screen.getByRole('button', { name: '← Home' })
    expect(screen.queryByRole('button', { name: '← Back' })).not.toBeInTheDocument()

    await user.click(back)
    expect(goBack).toHaveBeenCalledWith('home')
  })

  it('POSTs the email to request-link and shows the confirmation screen (still with "← Home")', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('you@example.com'), 'player@example.com')
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }))

    await waitFor(() => {
      const call = global.fetch.mock.calls.find(([url]) => url.includes('/api/auth/request-link'))
      expect(call).toBeTruthy()
      expect(call[1].method).toBe('POST')
      expect(JSON.parse(call[1].body)).toEqual({ email: 'player@example.com' })
    })

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText('player@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '← Back' })).not.toBeInTheDocument()
  })

  it('shows the server error and stays on the form when request-link fails', async () => {
    const user = userEvent.setup()
    global.fetch = routedFetch({
      requestLink: () => Promise.resolve({ ok: false, json: async () => ({ error: 'Too many requests' }) }),
    })
    renderLogin()

    await user.type(screen.getByPlaceholderText('you@example.com'), 'player@example.com')
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }))

    expect(await screen.findByText('Too many requests')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign in to Scorecard' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument()
  })

  it('links to the privacy page from the form', async () => {
    const user = userEvent.setup()
    const { navigate } = renderLogin()
    await user.click(screen.getByRole('button', { name: 'How we handle your data' }))
    expect(navigate).toHaveBeenCalledWith('privacy', { from: 'login' })
  })
})
