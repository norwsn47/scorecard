import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './useAuth.jsx'

// First direct coverage for AuthProvider / useAuth (BACKLOG #104). Everything
// else exercises it only indirectly through page tests. Covers the session
// check on mount (signed in, signed out, failed, timed out), the one-off
// ?auth= / ?email= redirect flags, and logout / updateProfile / deleteAccount.
//
// A small probe renders the context so the tests read what a real consumer
// would see, and hands back the live context object for calling the actions.

let ctx
function Probe() {
  ctx = useAuth()
  return (
    <div>
      <p>user: {ctx.user ? ctx.user.email : 'none'}</p>
      <p>name: {ctx.user?.name ?? 'none'}</p>
      <p>pending: {ctx.user?.pending_email ?? 'none'}</p>
      <p>loading: {String(ctx.loading)}</p>
      <p>authError: {ctx.authError ?? 'none'}</p>
      <p>emailNotice: {ctx.emailNotice ?? 'none'}</p>
    </div>
  )
}

function renderProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

const JANE = { id: 'u1', email: 'jane@example.com', name: 'Jane', pending_email: null }

const json = (body, init = {}) =>
  Promise.resolve({ ok: true, status: 200, json: async () => body, ...init })

// Routes fetch by URL; anything not in `routes` fails loudly.
function mockFetch(routes) {
  global.fetch = vi.fn((url, opts) => {
    const handler = routes[url]
    if (!handler) return Promise.reject(new Error(`unexpected fetch: ${url}`))
    return handler(opts)
  })
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AuthProvider - session check on mount', () => {
  it('asks /api/auth/me with credentials and starts in the loading state', async () => {
    mockFetch({ '/api/auth/me': () => json({ user: JANE }) })
    renderProvider()

    expect(screen.getByText('loading: true')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/auth/me')
    expect(opts.credentials).toBe('include')
    expect(opts.signal).toBeInstanceOf(AbortSignal)

    await screen.findByText('loading: false')
  })

  it('sets the user, keeping all four profile fields, when signed in', async () => {
    mockFetch({
      '/api/auth/me': () => json({ user: { ...JANE, pending_email: 'new@example.com' } }),
    })
    renderProvider()

    expect(await screen.findByText('user: jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('name: Jane')).toBeInTheDocument()
    expect(screen.getByText('pending: new@example.com')).toBeInTheDocument()
    expect(screen.getByText('loading: false')).toBeInTheDocument()
  })

  it('leaves user null on a 401 with { user: null } (what the server sends with no session)', async () => {
    mockFetch({ '/api/auth/me': () => json({ user: null }, { ok: false, status: 401 }) })
    renderProvider()

    expect(await screen.findByText('loading: false')).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
  })

  it('leaves user null on a 200 with { user: null }', async () => {
    mockFetch({ '/api/auth/me': () => json({ user: null }) })
    renderProvider()

    expect(await screen.findByText('loading: false')).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
  })

  it('leaves user null when the body has no user key at all', async () => {
    mockFetch({ '/api/auth/me': () => json({}) })
    renderProvider()

    expect(await screen.findByText('loading: false')).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
  })

  it('leaves user null and stops loading when the request fails', async () => {
    mockFetch({ '/api/auth/me': () => Promise.reject(new TypeError('Failed to fetch')) })
    renderProvider()

    expect(await screen.findByText('loading: false')).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
  })

  it('leaves user null and stops loading when the response body is not JSON', async () => {
    mockFetch({
      '/api/auth/me': () => Promise.resolve({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token <') } }),
    })
    renderProvider()

    expect(await screen.findByText('loading: false')).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
  })

  it('clears its 5-second timeout once the check resolves (no timer left running)', async () => {
    vi.useFakeTimers()
    mockFetch({ '/api/auth/me': () => json({ user: JANE }) })
    renderProvider()

    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('loading: false')).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('gives up after 5 seconds: aborts the request, leaves user null and stops loading', async () => {
    vi.useFakeTimers()
    // A request that never answers on its own, but honours the abort signal
    // the way a real fetch does.
    mockFetch({
      '/api/auth/me': opts => new Promise((_, reject) => {
        opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }),
    })
    renderProvider()

    await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
    expect(screen.getByText('loading: true')).toBeInTheDocument()
    expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(false)

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true)
    expect(screen.getByText('loading: false')).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
  })
})

describe('AuthProvider - ?auth= and ?email= redirect flags', () => {
  beforeEach(() => {
    mockFetch({ '/api/auth/me': () => json({ user: null }) })
  })

  it.each(['expired', 'error'])('captures ?auth=%s as authError and strips the query', async flag => {
    window.history.replaceState({}, '', `/login?auth=${flag}`)
    renderProvider()

    expect(await screen.findByText(`authError: ${flag}`)).toBeInTheDocument()
    expect(window.location.search).toBe('')
    expect(window.location.pathname).toBe('/login')
  })

  it.each(['changed', 'expired', 'taken'])('captures ?email=%s as emailNotice and strips the query', async flag => {
    window.history.replaceState({}, '', `/?email=${flag}`)
    renderProvider()

    expect(await screen.findByText(`emailNotice: ${flag}`)).toBeInTheDocument()
    expect(window.location.search).toBe('')
    expect(window.location.pathname).toBe('/')
  })

  it('captures both flags when both are present', async () => {
    window.history.replaceState({}, '', '/?auth=error&email=taken')
    renderProvider()

    expect(await screen.findByText('authError: error')).toBeInTheDocument()
    expect(screen.getByText('emailNotice: taken')).toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('ignores unrecognised values and leaves the URL alone', async () => {
    window.history.replaceState({}, '', '/?auth=nonsense&email=whatever')
    renderProvider()

    await screen.findByText('loading: false')
    expect(screen.getByText('authError: none')).toBeInTheDocument()
    expect(screen.getByText('emailNotice: none')).toBeInTheDocument()
    expect(window.location.search).toBe('?auth=nonsense&email=whatever')
  })

  it('sets no flags on a plain URL', async () => {
    renderProvider()

    await screen.findByText('loading: false')
    expect(screen.getByText('authError: none')).toBeInTheDocument()
    expect(screen.getByText('emailNotice: none')).toBeInTheDocument()
  })

  it('lets a consumer clear the flags again via the setters', async () => {
    window.history.replaceState({}, '', '/?auth=expired&email=changed')
    renderProvider()
    await screen.findByText('authError: expired')

    act(() => { ctx.setAuthError(null); ctx.setEmailNotice(null) })

    expect(screen.getByText('authError: none')).toBeInTheDocument()
    expect(screen.getByText('emailNotice: none')).toBeInTheDocument()
  })
})

describe('AuthProvider - logout', () => {
  it('POSTs to /api/auth/logout with credentials and clears the user', async () => {
    mockFetch({
      '/api/auth/me': () => json({ user: JANE }),
      '/api/auth/logout': () => json({ ok: true }),
    })
    renderProvider()
    await screen.findByText('user: jane@example.com')

    await act(async () => { await ctx.logout() })

    const logoutCall = global.fetch.mock.calls.find(([url]) => url === '/api/auth/logout')
    expect(logoutCall[1]).toEqual({ method: 'POST', credentials: 'include' })
    expect(screen.getByText('user: none')).toBeInTheDocument()
  })
})

describe('AuthProvider - updateProfile (PRD 11.14)', () => {
  it('PATCHes only the fields passed and merges name / pending_email into the user', async () => {
    mockFetch({
      '/api/auth/me': () => json({ user: JANE }),
      '/api/users': () => json({ name: 'Janet', pending_email: 'new@example.com' }),
    })
    renderProvider()
    await screen.findByText('user: jane@example.com')

    await act(async () => { await ctx.updateProfile({ name: 'Janet', email: 'new@example.com' }) })

    const patch = global.fetch.mock.calls.find(([url]) => url === '/api/users')
    expect(patch[1].method).toBe('PATCH')
    expect(patch[1].credentials).toBe('include')
    expect(JSON.parse(patch[1].body)).toEqual({ name: 'Janet', email: 'new@example.com' })
    // email itself stays as it was until the link in the new inbox is clicked.
    expect(screen.getByText('user: jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('name: Janet')).toBeInTheDocument()
    expect(screen.getByText('pending: new@example.com')).toBeInTheDocument()
  })

  it('leaves the body without keys that were not passed', async () => {
    mockFetch({
      '/api/auth/me': () => json({ user: JANE }),
      '/api/users': () => json({ name: 'Janet' }),
    })
    renderProvider()
    await screen.findByText('user: jane@example.com')

    await act(async () => { await ctx.updateProfile({ name: 'Janet' }) })

    const patch = global.fetch.mock.calls.find(([url]) => url === '/api/users')
    expect(JSON.parse(patch[1].body)).toEqual({ name: 'Janet' })
    expect(screen.getByText('pending: none')).toBeInTheDocument()
  })

  it('throws an Error carrying the server message and status on a non-2xx, leaving the user unchanged', async () => {
    mockFetch({
      '/api/auth/me': () => json({ user: JANE }),
      '/api/users': () => json({ error: 'That email is already in use' }, { ok: false, status: 409 }),
    })
    renderProvider()
    await screen.findByText('user: jane@example.com')

    let caught
    await act(async () => {
      try { await ctx.updateProfile({ email: 'taken@example.com' }) } catch (e) { caught = e }
    })

    expect(caught).toBeInstanceOf(Error)
    expect(caught.message).toBe('That email is already in use')
    expect(caught.status).toBe(409)
    expect(screen.getByText('name: Jane')).toBeInTheDocument()
  })
})

describe('AuthProvider - deleteAccount (PRD 11.14)', () => {
  it('DELETEs /api/users with credentials and clears the user', async () => {
    mockFetch({
      '/api/auth/me': () => json({ user: JANE }),
      '/api/users': () => json({ ok: true }),
    })
    renderProvider()
    await screen.findByText('user: jane@example.com')

    await act(async () => { await ctx.deleteAccount() })

    const del = global.fetch.mock.calls.find(([url, opts]) => url === '/api/users' && opts?.method === 'DELETE')
    expect(del[1].credentials).toBe('include')
    expect(screen.getByText('user: none')).toBeInTheDocument()
  })

  it('throws with the server message and status on failure, and stays signed in', async () => {
    mockFetch({
      '/api/auth/me': () => json({ user: JANE }),
      '/api/users': () => json({ error: 'Try again shortly' }, { ok: false, status: 500 }),
    })
    renderProvider()
    await screen.findByText('user: jane@example.com')

    let caught
    await act(async () => {
      try { await ctx.deleteAccount() } catch (e) { caught = e }
    })

    expect(caught.message).toBe('Try again shortly')
    expect(caught.status).toBe(500)
    await waitFor(() => expect(screen.getByText('user: jane@example.com')).toBeInTheDocument())
  })
})

describe('useAuth', () => {
  it('throws a clear error when used outside an AuthProvider', () => {
    // React logs the render error and jsdom re-reports it as an uncaught
    // window error; swallow both so the test output stays quiet.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const swallow = e => e.preventDefault()
    window.addEventListener('error', swallow)
    try {
      expect(() => render(<Probe />)).toThrow('useAuth must be used within AuthProvider')
    } finally {
      window.removeEventListener('error', swallow)
    }
  })
})
