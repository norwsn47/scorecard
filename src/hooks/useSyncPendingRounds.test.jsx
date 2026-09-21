import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { AuthProvider } from './useAuth.jsx'
import { useSyncPendingRounds } from './useSyncPendingRounds.js'
import { getCompletedGames, markCompletedGamePending, saveCompletedGame } from '../utils/storage.js'

// The triggers for the background sync of pending rounds (BACKLOG #95): when a
// signed-in user is present, and when the device comes back online. The real
// runner and storage are used; only fetch is faked.

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

function Probe() {
  useSyncPendingRounds()
  return null
}

function seedPending(id, userId = 'u1') {
  saveCompletedGame({
    id,
    courseId: 'course-1',
    completedAt: '2026-08-01T12:00:00.000Z',
    holes: 2,
    holesPlayed: 2,
    holePars: [3, 3],
    players: ['Ann'],
    scores: { Ann: [3, 3] },
  })
  markCompletedGamePending(id, userId, '')
}

let postGames
// Who /api/auth/me says is signed in. Tests can change it after mounting to
// simulate the browser's session cookie changing under a stale tab (#114).
let meUser
function mockFetch(user) {
  meUser = user
  global.fetch = vi.fn((url, opts) => {
    if (url.includes('/api/auth/me')) return Promise.resolve({ ok: true, json: async () => ({ user: meUser }) })
    if (url === '/api/games' && opts?.method === 'POST') return postGames(opts)
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}
const gamePosts = () => global.fetch.mock.calls.filter(([url, o]) => url === '/api/games' && o?.method === 'POST')
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

async function mount(user, { strict = false } = {}) {
  mockFetch(user)
  const tree = <AuthProvider><Probe /></AuthProvider>
  const view = render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  await settle()
  return view
}

beforeEach(() => {
  localStorage.clear()
  postGames = () => Promise.resolve({ ok: true, status: 201, json: async () => ({}) })
})

afterEach(() => {
  vi.restoreAllMocks()
  delete document.visibilityState // drop any per-test override, back to jsdom's own
})

// jsdom's visibilityState is read-only; shadow it on the instance for a test.
function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}
const fireVisibilityChange = () => act(() => { document.dispatchEvent(new Event('visibilitychange')) })
const meCallCount = () => global.fetch.mock.calls.filter(([url]) => url.includes('/api/auth/me')).length

describe('useSyncPendingRounds', () => {
  it('syncs a pending round once a signed-in user is present', async () => {
    seedPending('a')
    await mount(SIGNED_IN)
    expect(gamePosts()).toHaveLength(1)
    expect(getCompletedGames().find(g => g.id === 'a').synced).toBe(true)
  })

  it('never fetches games when nobody is signed in', async () => {
    seedPending('a')
    await mount(null)
    expect(gamePosts()).toHaveLength(0)
    expect(getCompletedGames().find(g => g.id === 'a').pendingSyncUserId).toBe('u1')
  })

  it('does not send another user\'s pending round', async () => {
    seedPending('a', 'someone-else')
    await mount(SIGNED_IN)
    expect(gamePosts()).toHaveLength(0)
  })

  it('runs again when the device comes back online', async () => {
    await mount(SIGNED_IN)
    expect(gamePosts()).toHaveLength(0)
    seedPending('a')
    act(() => { window.dispatchEvent(new Event('online')) })
    await settle()
    expect(gamePosts()).toHaveLength(1)
    expect(getCompletedGames().find(g => g.id === 'a').synced).toBe(true)
  })

  it('retries an earlier failure when it comes back online', async () => {
    seedPending('a')
    postGames = () => Promise.reject(new TypeError('Failed to fetch'))
    await mount(SIGNED_IN)
    expect(gamePosts()).toHaveLength(1)
    postGames = () => Promise.resolve({ ok: true, status: 201, json: async () => ({}) })
    act(() => { window.dispatchEvent(new Event('online')) })
    await settle()
    expect(gamePosts()).toHaveLength(2)
    expect(getCompletedGames().find(g => g.id === 'a').synced).toBe(true)
  })

  it('ignores online events while nobody is signed in', async () => {
    seedPending('a')
    await mount(null)
    act(() => { window.dispatchEvent(new Event('online')) })
    await settle()
    expect(gamePosts()).toHaveLength(0)
  })

  it('stops listening for online events on unmount', async () => {
    const { unmount } = await mount(SIGNED_IN)
    unmount()
    seedPending('a')
    act(() => { window.dispatchEvent(new Event('online')) })
    await settle()
    expect(gamePosts()).toHaveLength(0)
  })

  it('removes the exact listener it added', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = await mount(SIGNED_IN)
    const added = add.mock.calls.filter(([type]) => type === 'online').map(([, fn]) => fn)
    expect(added).toHaveLength(1)
    unmount()
    const removed = remove.mock.calls.filter(([type]) => type === 'online').map(([, fn]) => fn)
    expect(removed).toEqual(added)
  })

  it('does not send a round twice under StrictMode\'s double effect', async () => {
    seedPending('a')
    await mount(SIGNED_IN, { strict: true })
    expect(gamePosts()).toHaveLength(1)
  })

  it('does not send a round twice when online fires while the first run is still going', async () => {
    seedPending('a')
    let release
    postGames = () => new Promise(resolve => { release = () => resolve({ ok: true, status: 201, json: async () => ({}) }) })
    await mount(SIGNED_IN)
    expect(gamePosts()).toHaveLength(1)
    act(() => { window.dispatchEvent(new Event('online')) })
    await settle()
    expect(gamePosts()).toHaveLength(1)
    await act(async () => { release() })
    await settle()
    expect(gamePosts()).toHaveLength(1)
  })
})

// The tab or app becoming visible again is a trigger too (BACKLOG #112): a 5xx
// or a timeout never fires `online`.
describe('useSyncPendingRounds - visibilitychange', () => {
  it('runs when the page becomes visible', async () => {
    await mount(SIGNED_IN)
    expect(gamePosts()).toHaveLength(0)
    seedPending('a')
    setVisibility('visible')
    await fireVisibilityChange()
    await settle()
    expect(gamePosts()).toHaveLength(1)
    expect(getCompletedGames().find(g => g.id === 'a').synced).toBe(true)
  })

  it('does not run when the page becomes hidden', async () => {
    await mount(SIGNED_IN)
    seedPending('a')
    setVisibility('hidden')
    await fireVisibilityChange()
    await settle()
    expect(gamePosts()).toHaveLength(0)
    expect(getCompletedGames().find(g => g.id === 'a').pendingSyncUserId).toBe('u1')
  })

  it('retries an earlier failure when the page becomes visible again', async () => {
    seedPending('a')
    postGames = () => Promise.resolve({ ok: false, status: 503, json: async () => ({}) })
    await mount(SIGNED_IN)
    expect(gamePosts()).toHaveLength(1)
    postGames = () => Promise.resolve({ ok: true, status: 201, json: async () => ({}) })
    setVisibility('visible')
    await fireVisibilityChange()
    await settle()
    expect(gamePosts()).toHaveLength(2)
    expect(getCompletedGames().find(g => g.id === 'a').synced).toBe(true)
  })

  it('sends a round once when visible and online arrive together (the guard)', async () => {
    await mount(SIGNED_IN)
    seedPending('a')
    setVisibility('visible')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('online'))
    })
    await settle()
    expect(gamePosts()).toHaveLength(1)
  })

  it('stops listening on unmount, and removes the exact listener it added', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const { unmount } = await mount(SIGNED_IN)
    const added = add.mock.calls.filter(([type]) => type === 'visibilitychange').map(([, fn]) => fn)
    expect(added).toHaveLength(1)
    unmount()
    const removed = remove.mock.calls.filter(([type]) => type === 'visibilitychange').map(([, fn]) => fn)
    expect(removed).toEqual(added)

    seedPending('a')
    setVisibility('visible')
    await fireVisibilityChange()
    await settle()
    expect(gamePosts()).toHaveLength(0)
  })

  it('never fetches on a visibility change while nobody is signed in', async () => {
    seedPending('a')
    await mount(null)
    const meBefore = meCallCount()
    setVisibility('visible')
    await fireVisibilityChange()
    await settle()
    expect(gamePosts()).toHaveLength(0)
    expect(meCallCount()).toBe(meBefore)
    expect(getCompletedGames().find(g => g.id === 'a').pendingSyncUserId).toBe('u1')
  })

  it('posts nothing when the browser session has changed to someone else (#114)', async () => {
    await mount(SIGNED_IN)
    seedPending('a')
    meUser = { ...SIGNED_IN, id: 'someone-else' }
    setVisibility('visible')
    await fireVisibilityChange()
    await settle()
    expect(gamePosts()).toHaveLength(0)
    expect(getCompletedGames().find(g => g.id === 'a').pendingSyncUserId).toBe('u1')
    expect(getCompletedGames().find(g => g.id === 'a').synced).toBeUndefined()
  })
})
