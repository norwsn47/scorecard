import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login.jsx'
import App from '../App.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// First render coverage for Login (#35). Two things this pins down:
// - both screens (the form and the "check your email" confirmation) show the
//   same "← Home" back button — a stale "← Back" on the form screen survived
//   #43b's review precisely because nothing rendered Login in a test.
// - the happy path POSTs the email to /api/auth/request-link and swaps to the
//   confirmation screen; a server error keeps the user on the form.
//
// The ?auth=expired|error inline-error tests below (still #35) render the
// real <App /> rather than <Login /> directly. Login's `error` state is
// seeded once, on mount, from AuthContext's `authError` — and AuthContext
// only sets `authError` from the `?auth=` query param inside its own mount
// effect. Mounting <Login /> straight inside <AuthProvider> (as the tests
// above do) mounts both at the same instant, before that effect has run, so
// Login's initial state reads `authError` while it's still null. In the real
// app this never happens: App.jsx gates all page rendering on
// `useAuth().loading`, so Login isn't mounted until *after* AuthProvider's
// mount effect has already set `authError` (loading only flips once the
// /api/auth/me fetch resolves, and the synchronous `setAuthError` call
// happens earlier in that same effect). Rendering <App /> here reproduces
// that gate for real instead of trying to fake it.

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
  // App.jsx boots straight to 'scorecard' if an active game is sitting in
  // storage — irrelevant here, but clearing it keeps the App-driven tests
  // below landing on /login as intended, matching App.test.jsx's own setup.
  localStorage.clear()
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

describe('Login (#35) — ?auth= inline error, past App\'s real auth-check gate', () => {
  it('shows the expired-link message for ?auth=expired', async () => {
    window.history.replaceState({}, '', '/login?auth=expired')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in to Scorecard' })).toBeInTheDocument()
    expect(screen.getByText('Your link has expired. Request a new one.')).toBeInTheDocument()
    // The param is stripped once read, so a refresh doesn't replay it.
    expect(window.location.search).toBe('')
  })

  it('shows the generic error message for ?auth=error', async () => {
    window.history.replaceState({}, '', '/login?auth=error')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in to Scorecard' })).toBeInTheDocument()
    expect(screen.getByText('Something went wrong. Try again.')).toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('shows no inline error on a plain /login visit', async () => {
    window.history.replaceState({}, '', '/login')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in to Scorecard' })).toBeInTheDocument()
    expect(screen.queryByText('Your link has expired. Request a new one.')).not.toBeInTheDocument()
    expect(screen.queryByText('Something went wrong. Try again.')).not.toBeInTheDocument()
  })
})
