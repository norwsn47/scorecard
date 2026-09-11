import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from './Settings.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Settings panel (§11.14, #4). Covers: the signed-out bounce, the name field
// calling PATCH /api/users, the email field surfacing 409 / 429, and the
// typed-DELETE gate on the destructive button before it calls DELETE /api/users
// and (via the signed-out guard) returns Home.

const baseUser = { id: 'u1', email: 'jane@example.com', name: null, pending_email: null }

function mountFetch({ user = baseUser, patch, del } = {}) {
  global.fetch = vi.fn((url, opts) => {
    if (url.includes('/api/auth/me')) {
      return Promise.resolve({ ok: true, json: async () => ({ user }) })
    }
    if (url.includes('/api/users') && opts?.method === 'PATCH') {
      return (patch ?? (() => Promise.resolve({ ok: true, json: async () => ({}) })))(opts)
    }
    if (url.includes('/api/users') && opts?.method === 'DELETE') {
      return (del ?? (() => Promise.resolve({ ok: true, json: async () => ({}) })))(opts)
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

// Rendered through StrictMode, mirroring src/main.jsx — so the suite catches
// effect-cleanup / double-invoke regressions the way dev does.
function renderSettings(props = {}) {
  const navigate = vi.fn()
  const goBack = vi.fn()
  render(
    <StrictMode>
      <AuthProvider>
        <Settings navigate={navigate} goBack={goBack} params={{}} {...props} />
      </AuthProvider>
    </StrictMode>,
  )
  return { navigate, goBack }
}

beforeEach(() => {
  window.history.replaceState({}, '', '/settings')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Settings (#4)', () => {
  it('renders the panel when signed in', async () => {
    mountFetch()
    renderSettings()
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('shows a "Home" link when the app loads straight onto Settings (depth 0 — e.g. a reload or deep link)', async () => {
    window.history.replaceState({ depth: 0 }, '', '/settings')
    mountFetch()
    renderSettings()
    await screen.findByRole('heading', { name: 'Settings' })
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })

  it('hides the "Home" link when there is somewhere in-app to go back to (depth > 0)', async () => {
    window.history.replaceState({ depth: 1 }, '', '/settings')
    mountFetch()
    renderSettings()
    await screen.findByRole('heading', { name: 'Settings' })
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('bounces to Home when there is no signed-in user', async () => {
    mountFetch({ user: null })
    const { navigate } = renderSettings()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('pre-fills the name and PATCHes the trimmed value', async () => {
    const user = userEvent.setup()
    const patch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ name: 'Jane' }) }))
    mountFetch({ user: { ...baseUser, name: 'Jan' }, patch })
    renderSettings()

    const field = await screen.findByDisplayValue('Jan')

    await user.clear(field)
    await user.type(field, '  Jane  ')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    await waitFor(() => {
      expect(patch).toHaveBeenCalled()
      expect(JSON.parse(patch.mock.calls[0][0].body)).toEqual({ name: 'Jane' })
    })
    expect(await screen.findByText('Saved.')).toBeInTheDocument()
  })

  it('sends an empty name to clear it', async () => {
    const user = userEvent.setup()
    const patch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ name: null }) }))
    mountFetch({ user: { ...baseUser, name: 'Jan' }, patch })
    renderSettings()

    const field = await screen.findByDisplayValue('Jan')
    await user.clear(field)
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    await waitFor(() => expect(JSON.parse(patch.mock.calls[0][0].body)).toEqual({ name: '' }))
  })

  it('surfaces a 409 from the email change as an inline message', async () => {
    const user = userEvent.setup()
    const patch = vi.fn(() => Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'in use' }) }))
    mountFetch({ patch })
    renderSettings()

    await screen.findByRole('heading', { name: 'Settings' })
    await user.click(screen.getByRole('button', { name: 'Change email address' }))
    await screen.findByLabelText('New email address')
    await user.type(screen.getByLabelText('New email address'), 'taken@example.com')
    await user.click(screen.getByRole('button', { name: 'Send confirmation link' }))

    expect(await screen.findByText(/already tied to another account/i)).toBeInTheDocument()
  })

  it('surfaces a 429 from the email change as an inline message', async () => {
    const user = userEvent.setup()
    const patch = vi.fn(() => Promise.resolve({ ok: false, status: 429, json: async () => ({ error: 'slow down' }) }))
    mountFetch({ patch })
    renderSettings()

    await screen.findByRole('heading', { name: 'Settings' })
    await user.click(screen.getByRole('button', { name: 'Change email address' }))
    await screen.findByLabelText('New email address')
    await user.type(screen.getByLabelText('New email address'), 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'Send confirmation link' }))

    expect(await screen.findByText(/lot of attempts/i)).toBeInTheDocument()
  })

  it('tells the user to check the new inbox on a successful email change', async () => {
    const user = userEvent.setup()
    const patch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ pending_email: 'new@example.com' }) }))
    mountFetch({ patch })
    renderSettings()

    await screen.findByRole('heading', { name: 'Settings' })
    await user.click(screen.getByRole('button', { name: 'Change email address' }))
    await screen.findByLabelText('New email address')
    await user.type(screen.getByLabelText('New email address'), 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'Send confirmation link' }))

    expect(await screen.findByText(/check the new inbox/i)).toBeInTheDocument()
    expect(screen.getByText(/Waiting for confirmation of/i)).toBeInTheDocument()
  })

  it('surfaces a 500 (Resend failure) from the email change with a distinct message', async () => {
    const user = userEvent.setup()
    const patch = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }))
    mountFetch({ patch })
    renderSettings()

    await screen.findByRole('heading', { name: 'Settings' })
    await user.click(screen.getByRole('button', { name: 'Change email address' }))
    await screen.findByLabelText('New email address')
    await user.type(screen.getByLabelText('New email address'), 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'Send confirmation link' }))

    expect(await screen.findByText(/sending the confirmation email/i)).toBeInTheDocument()
  })

  it('keeps the new-email input collapsed until "Change email address" is tapped, and clears it on backing out', async () => {
    const user = userEvent.setup()
    mountFetch()
    renderSettings()

    await screen.findByRole('heading', { name: 'Settings' })
    expect(screen.queryByLabelText('New email address')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Change email address' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)

    const field = await screen.findByLabelText('New email address')
    expect(field).toHaveFocus()
    await user.type(field, 'half-typed@example')

    await user.click(screen.getByRole('button', { name: 'Keep my current email' }))
    await waitFor(() => expect(screen.queryByLabelText('New email address')).not.toBeInTheDocument())

    // Re-opening starts clean, not with the abandoned value.
    await user.click(screen.getByRole('button', { name: 'Change email address' }))
    expect(await screen.findByLabelText('New email address')).toHaveValue('')
  })

  it('opens the delete sheet as a labelled dialog, focuses the input, and closes on Escape or backdrop click', async () => {
    const user = userEvent.setup()
    mountFetch()
    renderSettings()

    await screen.findByRole('heading', { name: 'Settings' })
    await user.click(screen.getByRole('button', { name: 'Delete my account' }))

    const dialog = screen.getByRole('dialog', { name: 'Delete your account?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByLabelText('Type DELETE to confirm')).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Re-open, then dismiss by clicking the backdrop.
    await user.click(screen.getByRole('button', { name: 'Delete my account' }))
    await screen.findByRole('dialog')
    await user.click(document.querySelector('.fixed.inset-0'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('gates the destructive button on a typed DELETE, then calls deleteAccount and returns Home', async () => {
    const user = userEvent.setup()
    const del = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
    mountFetch({ del })
    const { navigate } = renderSettings()

    await screen.findByRole('heading', { name: 'Settings' })
    await user.click(screen.getByRole('button', { name: 'Delete my account' }))

    const confirmBtn = screen.getByRole('button', { name: 'Delete account' })
    expect(confirmBtn).toBeDisabled()

    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'delete')
    expect(confirmBtn).toBeDisabled()

    await user.clear(screen.getByLabelText('Type DELETE to confirm'))
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE')
    expect(confirmBtn).toBeEnabled()

    await user.click(confirmBtn)

    await waitFor(() => {
      expect(del).toHaveBeenCalled()
      expect(del.mock.calls[0][0].method).toBe('DELETE')
    })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
  })
})
