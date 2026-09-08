import { StrictMode, useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './Home.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Home's signed-in additions (§4.1, §11.6, §11.14): the Settings entry point
// and signed-in indicator, and the one-off ?email= banner redirected back from
// GET /api/auth/confirm-email (§11.4.1) which useAuth strips from the URL.
//
// Everything renders through StrictMode, mirroring src/main.jsx — the banner
// regression that prompted this (effect cleanup wiping the notice during
// StrictMode's mount/cleanup/mount) only shows up under the double-invoke.

function mountFetch(user = null) {
  global.fetch = vi.fn((url) => {
    if (url.includes('/api/auth/me')) {
      return Promise.resolve({ ok: true, json: async () => ({ user }) })
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

function renderHome() {
  const navigate = vi.fn()
  render(
    <StrictMode>
      <AuthProvider>
        <Home navigate={navigate} />
      </AuthProvider>
    </StrictMode>,
  )
  return { navigate }
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Home — signed-in indicator and Settings entry (§11.14)', () => {
  it('shows the signed-in indicator and opens Settings, for a signed-in user', async () => {
    const user = userEvent.setup()
    mountFetch({ id: 'u1', email: 'jane@example.com', name: null, pending_email: null })
    const { navigate } = renderHome()

    expect(await screen.findByText(/Signed in as jane@example.com/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(navigate).toHaveBeenCalledWith('settings', { from: 'home' })
  })

  it('prefers the name over the email in the indicator when one is set', async () => {
    mountFetch({ id: 'u1', email: 'jane@example.com', name: 'Jane', pending_email: null })
    renderHome()
    expect(await screen.findByText(/Signed in as Jane/)).toBeInTheDocument()
  })

  it('shows the sign-in nudge and no Settings link for a signed-out user', async () => {
    mountFetch(null)
    renderHome()
    expect(await screen.findByRole('button', { name: /Want to save your scores/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument()
  })
})

describe('Home — ?email= confirm-email banner (§11.4.1)', () => {
  it.each([
    ['changed', /email address has been updated\. sign in with your new address/i],
    ['expired', /expired or has already been used\. open the app and request the change again/i],
    ['taken', /in use by another account/i],
  ])('renders the %s message (signed out) and strips the param', async (flag, matcher) => {
    window.history.replaceState({}, '', `/?email=${flag}`)
    mountFetch(null)
    renderHome()

    expect(await screen.findByText(matcher)).toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe(''))
  })

  it('drops the "sign in" line from the changed message when the reader is signed in', async () => {
    window.history.replaceState({}, '', '/?email=changed')
    mountFetch({ id: 'u1', email: 'new@example.com', name: null, pending_email: null })
    renderHome()

    expect(await screen.findByText('Your email address has been updated.')).toBeInTheDocument()
  })

  it('shows the banner exactly once — not again after navigating away and back', async () => {
    window.history.replaceState({}, '', '/?email=changed')
    mountFetch(null)

    function Harness() {
      const [showHome, setShowHome] = useState(true)
      return (
        <StrictMode>
          <AuthProvider>
            <button onClick={() => setShowHome(s => !s)}>toggle-home</button>
            {showHome && <Home navigate={vi.fn()} />}
          </AuthProvider>
        </StrictMode>
      )
    }

    const user = userEvent.setup()
    render(<Harness />)

    expect(await screen.findByRole('status')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'toggle-home' })) // unmount Home
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'toggle-home' })) // remount Home
    await screen.findByRole('button', { name: 'New Game' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows nothing for an unrecognised ?email= value and leaves the URL alone', async () => {
    window.history.replaceState({}, '', '/?email=weird')
    mountFetch(null)
    renderHome()

    await screen.findByRole('button', { name: 'New Game' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(window.location.search).toBe('?email=weird')
  })
})
