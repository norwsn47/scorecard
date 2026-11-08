import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteRound, SAVING_MESSAGE } from './deleteRound.js'
import { getCompletedGames, markCompletedGamePending, saveCompletedGame } from './storage.js'
import { syncPendingRounds } from './sync.js'

const resp = (status, body = {}) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body })

function seed(id, { pendingFor = null } = {}) {
  saveCompletedGame({ id, completedAt: '2026-08-01T10:00:00.000Z', holes: 2, holesPlayed: 2, players: ['Ann'], scores: { Ann: [3, 3] }, holePars: [3, 3] })
  if (pendingFor !== null) markCompletedGamePending(id, pendingFor, '')
}

const ids = () => getCompletedGames().map(g => g.id)

beforeEach(() => { localStorage.clear() })
afterEach(() => { vi.restoreAllMocks() })

describe('deleteRound - saved (D1) round', () => {
  it('calls DELETE with credentials and reports success', async () => {
    global.fetch = vi.fn(() => resp(200))
    const result = await deleteRound({ id: 'd1', _fromDb: true }, { userId: 'u1' })
    expect(result).toEqual({ ok: true })
    expect(global.fetch).toHaveBeenCalledWith('/api/games/d1', { method: 'DELETE', credentials: 'include' })
  })

  it('treats 404 (already gone) as success', async () => {
    global.fetch = vi.fn(() => resp(404))
    expect(await deleteRound({ id: 'd1', _fromDb: true }, { userId: 'u1' })).toEqual({ ok: true })
  })

  it('a server failure returns an error and removes nothing, including the local twin', async () => {
    seed('p1', { pendingFor: 'u1' })
    global.fetch = vi.fn(() => resp(500))
    const result = await deleteRound({ id: 'd1', _fromDb: true, clientRoundId: 'p1' }, { userId: 'u1' })
    expect(result).toEqual({ ok: false, error: "Couldn't delete this round - check your connection and try again." })
    expect(ids()).toEqual(['p1'])
  })

  it('a network error returns the same error', async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    const result = await deleteRound({ id: 'd1', _fromDb: true }, { userId: 'u1' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Couldn't delete this round/)
  })

  it('removes the local copy when it is still pending for this user', async () => {
    seed('p1', { pendingFor: 'u1' })
    global.fetch = vi.fn(() => resp(200))
    await deleteRound({ id: 'd1', _fromDb: true, clientRoundId: 'p1' }, { userId: 'u1' })
    expect(ids()).toEqual([])
  })

  it("never removes another user's pending copy", async () => {
    seed('p1', { pendingFor: 'u2' })
    global.fetch = vi.fn(() => resp(200))
    await deleteRound({ id: 'd1', _fromDb: true, clientRoundId: 'p1' }, { userId: 'u1' })
    expect(ids()).toEqual(['p1'])
  })

  it('never removes an unmarked local copy', async () => {
    seed('q1')
    global.fetch = vi.fn(() => resp(200))
    await deleteRound({ id: 'd1', _fromDb: true, clientRoundId: 'q1' }, { userId: 'u1' })
    expect(ids()).toEqual(['q1'])
  })
})

describe('deleteRound - local round', () => {
  it('deletes a pending round locally with no server call (_pending flag)', async () => {
    seed('p1', { pendingFor: 'u1' })
    seed('p2', { pendingFor: 'u1' })
    global.fetch = vi.fn()
    expect(await deleteRound({ id: 'p1', _pending: true }, { userId: 'u1' })).toEqual({ ok: true })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(ids()).toEqual(['p2'])
  })

  it('deletes a storage record that carries pendingSyncUserId', async () => {
    seed('p1', { pendingFor: 'u1' })
    global.fetch = vi.fn()
    const record = getCompletedGames()[0]
    expect(await deleteRound(record, { userId: 'u1' })).toEqual({ ok: true })
    expect(ids()).toEqual([])
  })

  it('refuses while a save of that pending round is in flight, then works once it ends', async () => {
    seed('p1', { pendingFor: 'u1' })
    let release
    global.fetch = vi.fn(url => {
      if (String(url).includes('/api/auth/me')) return resp(200, { user: { id: 'u1' } })
      return new Promise(resolve => { release = () => resolve({ ok: false, status: 503, json: async () => ({}) }) })
    })
    const run = syncPendingRounds('u1')
    await vi.waitFor(() => expect(release).toBeTypeOf('function')) // the POST is in flight

    expect(await deleteRound({ id: 'p1', _pending: true }, { userId: 'u1' })).toEqual({ ok: false, error: SAVING_MESSAGE })
    expect(ids()).toEqual(['p1'])

    release()
    await run
    expect(await deleteRound({ id: 'p1', _pending: true }, { userId: 'u1' })).toEqual({ ok: true })
    expect(ids()).toEqual([])
  })

  it('signed-out quick-play: deletes locally', async () => {
    seed('q1')
    global.fetch = vi.fn()
    expect(await deleteRound({ id: 'q1' })).toEqual({ ok: true })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(ids()).toEqual([])
  })
})
