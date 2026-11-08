import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Summary from './Summary.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { getCompletedGames, markCompletedGamePending, markCompletedGameRejected, markCompletedGameSynced, saveCompletedGame } from '../utils/storage.js'
import { syncPendingRounds } from '../utils/sync.js'

// "Delete this round" on Summary: only on a round opened as saved and reliably
// identified, with the confirm sheet History used to carry.

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }
const resp = (status, body = {}) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body })

function local(id, extra = {}) {
  return {
    id, courseName: 'Bruntsfield', completedAt: '2026-08-01T12:00:00.000Z',
    holes: 2, holesPlayed: 2, holePars: [3, 3], players: ['Ann'], scores: { Ann: [3, 3] }, ...extra,
  }
}
const dbGame = (extra = {}) => local('d1', { _fromDb: true, clientRoundId: null, ...extra })

function mockApi({ user = SIGNED_IN, post = () => resp(201), del = () => resp(200) } = {}) {
  global.fetch = vi.fn((url, opts = {}) => {
    if (url.includes('/api/auth/me')) return resp(200, { user })
    if (url === '/api/games' && opts.method === 'POST') return post(opts)
    if (url.startsWith('/api/games/') && opts.method === 'DELETE') return del(url)
    return Promise.reject(new Error(`unexpected fetch: ${opts.method ?? 'GET'} ${url}`))
  })
}
const deletes = () => global.fetch.mock.calls.filter(([, o]) => o?.method === 'DELETE')
const tick = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

async function renderSummary(params) {
  const navigate = vi.fn()
  render(<AuthProvider><Summary navigate={navigate} params={params} /></AuthProvider>)
  await tick()
  return { navigate }
}
const link = () => screen.getByRole('button', { name: 'Delete this round' })
const noLink = () => expect(screen.queryByRole('button', { name: 'Delete this round' })).not.toBeInTheDocument()
const confirm = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' })

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({ depth: 1 }, '', '/summary')
})
afterEach(() => {
  global.fetch = vi.fn(() => Promise.reject(new TypeError('offline')))
  vi.restoreAllMocks()
})

describe('Summary - delete link visibility', () => {
  it('is not shown on the post-finish flow', async () => {
    mockApi()
    const g = local('r1')
    saveCompletedGame(g)
    await renderSummary({ game: g })
    noLink()
  })

  it('is not shown signed out on the post-finish flow either', async () => {
    mockApi({ user: null })
    const g = local('r1')
    saveCompletedGame(g)
    await renderSummary({ game: g })
    noLink()
  })

  it('is shown for a saved round opened from History', async () => {
    mockApi()
    await renderSummary({ game: dbGame(), fromHistory: true })
    expect(link()).toBeInTheDocument()
  })

  it('is hidden on a bounced Summary whose gameId does not match the resolved round', async () => {
    mockApi({ user: null })
    saveCompletedGame(local('newest', { completedAt: '2026-09-01T12:00:00.000Z' }))
    await renderSummary({ gameId: 'other', fromHistory: true })
    noLink()
  })

  it('is shown on a bounced Summary when the gameId matches', async () => {
    mockApi({ user: null })
    saveCompletedGame(local('r1'))
    await renderSummary({ gameId: 'r1', fromHistory: true })
    expect(link()).toBeInTheDocument()
  })

  it('is hidden when there is neither a game nor a gameId (newest-round guess)', async () => {
    mockApi({ user: null })
    saveCompletedGame(local('r1'))
    await renderSummary({ fromHistory: true })
    noLink()
  })

  it('is hidden for a signed-in local record that is only synced', async () => {
    mockApi()
    saveCompletedGame(local('r1'))
    markCompletedGameSynced('r1')
    await renderSummary({ gameId: 'r1' })
    noLink()
  })

  it('is shown for the signed-in owner\'s pending round', async () => {
    mockApi()
    saveCompletedGame(local('p1'))
    markCompletedGamePending('p1', 'u1', '')
    await renderSummary({ game: getCompletedGames()[0] })
    expect(link()).toBeInTheDocument()
  })

  it('is hidden for another user\'s pending round', async () => {
    mockApi()
    saveCompletedGame(local('p1'))
    markCompletedGamePending('p1', 'someone-else', '')
    await renderSummary({ game: getCompletedGames()[0] })
    noLink()
  })
})

describe('Summary - delete sheet', () => {
  it('opens a labelled modal dialog with focus on Cancel', async () => {
    mockApi()
    const user = userEvent.setup()
    await renderSummary({ game: dbGame(), fromHistory: true })
    await user.click(link())

    const dialog = screen.getByRole('dialog', { name: 'Delete this round?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText('This cannot be undone.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('Escape closes it and returns focus to the link', async () => {
    mockApi()
    const user = userEvent.setup()
    await renderSummary({ game: dbGame(), fromHistory: true })
    const l = link()
    await user.click(l)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(l).toHaveFocus()
  })

  it('a failed delete keeps the round, says so, and leaves the sheet open', async () => {
    mockApi({ del: () => resp(500) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary({ game: dbGame(), fromHistory: true })
    await user.click(link())
    await user.click(confirm())

    expect(await screen.findByText("Couldn't delete this round - check your connection and try again.")).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('a successful delete (or one already gone, 404) goes to History, replacing this screen', async () => {
    for (const status of [200, 404]) {
      mockApi({ del: () => resp(status) })
      const user = userEvent.setup()
      const navigate = vi.fn()
      const { unmount } = render(<AuthProvider><Summary navigate={navigate} params={{ game: dbGame(), fromHistory: true }} /></AuthProvider>)
      await tick()
      await user.click(link())
      await user.click(confirm())
      await waitFor(() => expect(navigate).toHaveBeenCalledWith('history', {}, { replace: true }))
      expect(deletes()[0][0]).toBe('/api/games/d1')
      unmount()
    }
  })

  it('while the delete is in flight both buttons are disabled and Escape is blocked', async () => {
    let release
    mockApi({ del: () => new Promise(resolve => { release = () => resolve({ ok: true, status: 200, json: async () => ({}) }) }) })
    const user = userEvent.setup()
    const { navigate } = await renderSummary({ game: dbGame(), fromHistory: true })
    await user.click(link())
    await user.click(confirm())

    expect(await screen.findByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await act(async () => { release() })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('history', {}, { replace: true }))
  })
})

describe('Summary - deleting a pending round', () => {
  it('removes the local record only: no server call, then goes to History', async () => {
    mockApi()
    saveCompletedGame(local('p1'))
    markCompletedGamePending('p1', 'u1', '')
    saveCompletedGame(local('p2'))
    const user = userEvent.setup()
    const { navigate } = await renderSummary({ game: getCompletedGames().find(g => g.id === 'p1') })
    await user.click(link())
    await user.click(confirm())

    expect(deletes()).toHaveLength(0)
    expect(getCompletedGames().map(g => g.id)).toEqual(['p2'])
    expect(navigate).toHaveBeenCalledWith('history', {}, { replace: true })
  })

  it('deletes a rejected round locally too', async () => {
    mockApi()
    saveCompletedGame(local('p1'))
    markCompletedGamePending('p1', 'u1', '')
    markCompletedGameRejected('p1')
    const user = userEvent.setup()
    await renderSummary({ game: getCompletedGames()[0] })
    await user.click(link())
    await user.click(confirm())

    expect(deletes()).toHaveLength(0)
    expect(getCompletedGames()).toHaveLength(0)
  })

  it('refuses with the calm message while a save is in flight, then works once it has finished', async () => {
    let release
    mockApi({ post: () => new Promise(resolve => { release = () => resolve({ ok: false, status: 503, json: async () => ({}) }) }) })
    saveCompletedGame(local('p1'))
    markCompletedGamePending('p1', 'u1', '')
    const user = userEvent.setup()
    const { navigate } = await renderSummary({ game: getCompletedGames()[0] })

    const run = syncPendingRounds('u1')
    await tick()

    await user.click(link())
    await user.click(confirm())
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Saving this round - try again in a moment.')
    expect(getCompletedGames().map(g => g.id)).toEqual(['p1'])
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeEnabled()
    expect(navigate).not.toHaveBeenCalled()

    await act(async () => { release(); await run })
    await user.click(confirm())
    expect(getCompletedGames()).toHaveLength(0)
    expect(navigate).toHaveBeenCalledWith('history', {}, { replace: true })
  })
})

describe('Summary - deleting a saved round', () => {
  it('also removes a still-pending local twin so a later sync cannot send it back', async () => {
    mockApi()
    saveCompletedGame(local('p1'))
    markCompletedGamePending('p1', 'u1', '')
    const user = userEvent.setup()
    await renderSummary({ game: dbGame({ clientRoundId: 'p1' }), fromHistory: true })
    await user.click(link())
    await user.click(confirm())

    await waitFor(() => expect(getCompletedGames()).toHaveLength(0))
    expect(deletes()).toHaveLength(1)
  })

  it('leaves an unmarked local copy alone', async () => {
    mockApi()
    saveCompletedGame(local('q1'))
    markCompletedGameSynced('q1')
    const user = userEvent.setup()
    await renderSummary({ game: dbGame({ clientRoundId: 'q1' }), fromHistory: true })
    await user.click(link())
    await user.click(confirm())

    await waitFor(() => expect(deletes()).toHaveLength(1))
    expect(getCompletedGames().map(g => g.id)).toEqual(['q1'])
  })
})

describe('Summary - deleting signed out', () => {
  it('deletes a local round with no server call, then goes to History', async () => {
    mockApi({ user: null })
    saveCompletedGame(local('r1'))
    const user = userEvent.setup()
    const { navigate } = await renderSummary({ game: getCompletedGames()[0], fromHistory: true })
    await user.click(link())
    await user.click(confirm())

    expect(getCompletedGames()).toHaveLength(0)
    expect(deletes()).toHaveLength(0)
    expect(navigate).toHaveBeenCalledWith('history', {}, { replace: true })
  })
})
