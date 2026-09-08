import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import App from './App.jsx'
import { getActiveGame, saveActiveGame } from './utils/storage.js'

// Integration coverage for the state-machine router in App.jsx — the pieces
// that only misbehave when several parts interact: booting on a deep-linked
// path, and a browser back/forward bounce (popstate) restoring a page with
// its edit-flow params deliberately gone (#17 / #18, #43).

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
  // AuthProvider hits /api/auth/me on mount; the logged-out pages here read
  // localStorage, not the network.
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// popstate the way App's handler expects to see it — a { page, depth, params }
// state object, pushed and then announced. `handlePopState` only reads `.page`
// and `.params`; `depth` is a placeholder here (a real entry would carry the
// nav depth, which only `goBack()` reads — don't reuse this helper for a
// back-button test without setting it).
function browserPopTo(page, params = {}) {
  act(() => {
    const state = { page, depth: 0, params }
    window.history.pushState(state, '', page === 'home' ? '/' : `/${page}`)
    window.dispatchEvent(new PopStateEvent('popstate', { state }))
  })
}

describe('App router — SPA navigation', () => {
  it('boots on a deep-linked /scorecard with no active game and bounces to Home (#17)', async () => {
    window.history.replaceState({}, '', '/scorecard')

    render(<App />)

    // Scorecard's no-game guard runs in an effect and calls App's real
    // (setState-driven) navigate — an inline call during render would throw
    // the cross-component-update error. The "New Game" button is on Home,
    // never on the Scorecard grid.
    expect(await screen.findByRole('button', { name: 'New Game' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('a popstate bounce onto a param-less Setup discards a stranded edit and lands on History (#18)', async () => {
    // An edit in progress: the working copy sits in the active-game slot with
    // an _edit marker. App boots straight to the Scorecard for it.
    saveActiveGame({
      id: 'g1',
      _edit: { id: 'g1', fromDb: false },
      players: ['Ann'],
      scores: { Ann: [3, 4] },
      holes: 2,
      holePars: [3, 3],
    })

    render(<App />)
    await screen.findByText('Ann')

    // Browser Back: App restores 'setup' from history state with no edit-flow
    // params (navigate() never persists them), exactly as a real popstate would.
    browserPopTo('setup')

    // Setup's abandoned-edit guard fires: working copy cleared, routed to History.
    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument()
    expect(getActiveGame()).toBeNull()
  })

  it('restores a different page on popstate (#43)', async () => {
    render(<App />)
    await screen.findByRole('button', { name: 'New Game' })

    browserPopTo('info')

    expect(await screen.findByRole('heading', { name: 'Information' })).toBeInTheDocument()
  })
})
