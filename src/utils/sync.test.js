import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildGamePayload,
  isSyncing,
  ME_TIMEOUT_MS,
  POST_TIMEOUT_MS,
  postRound,
  subscribeToSync,
  syncPendingRounds,
} from './sync.js'
import {
  clearActiveGame,
  deleteCompletedGame,
  getCompletedGames,
  markCompletedGamePending,
  markCompletedGameRejected,
  saveActiveGame,
  saveCompletedGame,
  updateCompletedGame,
} from './storage.js'

function round(overrides = {}) {
  return {
    id: 'round-1',
    courseId: 'course-1',
    courseName: 'Bruntsfield',
    completedAt: '2026-08-01T12:00:00.000Z',
    holes: 2,
    holesPlayed: 2,
    holePars: [3, 3],
    players: ['Ann', 'Bo'],
    scores: { Ann: [3, 3], Bo: [4, 4] },
    ...overrides,
  }
}

describe('buildGamePayload', () => {
  it('builds exactly the POST /api/games body from a stored round', () => {
    expect(buildGamePayload(round(), 'Windy')).toEqual({
      course_id: 'course-1',
      played_at: '2026-08-01T12:00:00.000Z',
      holes_played: 2,
      player_data: [
        { name: 'Ann', scores: [3, 3], total: 6, dnf: false },
        { name: 'Bo', scores: [4, 4], total: 8, dnf: false },
      ],
      hole_pars: [3, 3],
      notes: 'Windy',
      client_round_id: 'round-1',
    })
  })

  it('uses the round\'s own id as the idempotency key', () => {
    expect(buildGamePayload(round({ id: 'abc-123' }), '').client_round_id).toBe('abc-123')
  })

  it('trims notes, and sends null for blank, null or undefined notes', () => {
    expect(buildGamePayload(round(), '  Windy on the 2nd  ').notes).toBe('Windy on the 2nd')
    expect(buildGamePayload(round(), '   ').notes).toBeNull()
    expect(buildGamePayload(round(), '').notes).toBeNull()
    expect(buildGamePayload(round(), null).notes).toBeNull()
  })

  it('falls back to the round\'s stored notes when none are passed (a pending round)', () => {
    expect(buildGamePayload(round({ notes: '  Kept  ' })).notes).toBe('Kept')
    expect(buildGamePayload(round()).notes).toBeNull()
    // An explicit value wins over the stored one, including an explicit blank.
    expect(buildGamePayload(round({ notes: 'Kept' }), '').notes).toBeNull()
  })

  it('sends course_id and hole_pars as null when the round has none', () => {
    const body = buildGamePayload(round({ courseId: undefined, holePars: undefined }), '')
    expect(body.course_id).toBeNull()
    expect(body.hole_pars).toBeNull()
    expect(buildGamePayload(round({ courseId: '' }), '').course_id).toBeNull()
  })

  it('flags a player who stopped short as dnf, from the scores', () => {
    const body = buildGamePayload(round({ scores: { Ann: [3, 3], Bo: [4] } }), '')
    expect(body.player_data).toEqual([
      { name: 'Ann', scores: [3, 3], total: 6, dnf: false },
      { name: 'Bo', scores: [4], total: 4, dnf: true },
    ])
  })

  it('ignores a stale stored dnf list (not authoritative, PRD 4.4)', () => {
    const body = buildGamePayload(round({ dnf: ['Ann'] }), '')
    expect(body.player_data.map(p => p.dnf)).toEqual([false, false])
  })

  it('caps each player\'s scores array at holesPlayed', () => {
    const body = buildGamePayload(round({ holesPlayed: 2, scores: { Ann: [3, 3, 9], Bo: [4, 4, 9] } }), '')
    expect(body.player_data[0].scores).toEqual([3, 3])
  })

  it('treats a player with no scores as total 0', () => {
    const body = buildGamePayload(round({ scores: { Ann: [3, 3] } }), '')
    expect(body.player_data[1]).toEqual({ name: 'Bo', scores: [], total: 0, dnf: true })
  })

  it('is pure: does not mutate the round it is given', () => {
    const r = round()
    const before = JSON.stringify(r)
    buildGamePayload(r, 'x')
    expect(JSON.stringify(r)).toBe(before)
  })
})

// ── postRound ───────────────────────────────────────────────────────────────

const resp = (status, body = {}) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body })

describe('postRound', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('POSTs the buildGamePayload body with JSON headers and credentials', async () => {
    global.fetch = vi.fn(() => resp(201))
    const r = round()
    expect(await postRound(r, 'Windy')).toEqual({ ok: true })
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/games')
    expect(opts.method).toBe('POST')
    expect(opts.credentials).toBe('include')
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(opts.body)).toEqual(buildGamePayload(r, 'Windy'))
    expect(opts.signal).toBeInstanceOf(AbortSignal)
  })

  it('sends the record\'s stored notes when none are passed', async () => {
    global.fetch = vi.fn(() => resp(200))
    await postRound(round({ notes: 'Kept' }))
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).notes).toBe('Kept')
  })

  it.each([
    [200, { ok: true }],
    [201, { ok: true }],
    [400, { ok: false, kind: 'rejected' }],
    [401, { ok: false, kind: 'unauthorised' }],
    [403, { ok: false, kind: 'server' }],
    [500, { ok: false, kind: 'server' }],
    [503, { ok: false, kind: 'server' }],
  ])('maps a %i response to %j', async (status, expected) => {
    global.fetch = vi.fn(() => resp(status))
    expect(await postRound(round())).toEqual(expected)
  })

  it('maps a rejected fetch to a network error rather than throwing', async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(await postRound(round())).toEqual({ ok: false, kind: 'network' })
  })

  it('treats a stalled fetch as a network error after the timeout', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn(() => new Promise(() => {}))
    let result
    const p = postRound(round()).then(r => { result = r })
    await vi.advanceTimersByTimeAsync(POST_TIMEOUT_MS - 1)
    expect(result).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    await p
    expect(result).toEqual({ ok: false, kind: 'network' })
    expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('does not leave a timer running after a normal response', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn(() => resp(200))
    await postRound(round())
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports a record that cannot be turned into a body as rejected, without fetching', async () => {
    global.fetch = vi.fn(() => resp(200))
    expect(await postRound(null)).toEqual({ ok: false, kind: 'rejected' })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ── syncPendingRounds ───────────────────────────────────────────────────────

const posts = () => global.fetch.mock.calls.filter(([url, o]) => url === '/api/games' && o?.method === 'POST')
const postedIds = () => posts().map(([, o]) => JSON.parse(o.body).client_round_id)
const byId = id => getCompletedGames().find(g => g.id === id)

// Seeds a completed round and (unless userId is null) marks it pending for that user.
function seed(id, { userId = 'u1', completedAt, ...rest } = {}) {
  saveCompletedGame(round({ id, completedAt: completedAt ?? '2026-08-01T12:00:00.000Z', ...rest }))
  if (userId !== null) markCompletedGamePending(id, userId, '')
}

// The runner confirms /api/auth/me matches the round's owner before its first
// POST (#114). Every fetch mock a test assigns is wrapped here so /api/auth/me
// is answered separately and never reaches (or is counted by) the test's mock.
// meIds is consumed one per /me call; meDefault answers once it is empty.
let meIds = []
let meDefault = 'u1'
const meCalls = () => global.fetch.mock.calls.filter(([url]) => url === '/api/auth/me')

function installMeWrapper() {
  let current
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    get: () => current,
    set(fn) {
      current = vi.fn((url, o) => (
        url === '/api/auth/me'
          ? resp(200, { user: { id: meIds.length ? meIds.shift() : meDefault } })
          : fn(url, o)
      ))
    },
  })
}

beforeEach(() => { meIds = []; meDefault = 'u1'; installMeWrapper() })
afterEach(() => {
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: undefined })
})

// Lets pending promises (the /api/auth/me check, then the POST) settle.
const tick = () => new Promise(r => setTimeout(r, 0))

function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

describe('syncPendingRounds', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('sends a pending round, clears the marker and marks it synced', async () => {
    seed('a')
    global.fetch = vi.fn(() => resp(201))
    const summary = await syncPendingRounds('u1')
    expect(summary).toEqual({ synced: 1, rejected: 0, remaining: 0 })
    expect(postedIds()).toEqual(['a'])
    expect(byId('a').synced).toBe(true)
    expect(byId('a').pendingSyncUserId).toBeUndefined()
    expect(byId('a').syncRejected).toBeUndefined()
  })

  it('accepts the idempotent 200 for a round the server already holds', async () => {
    seed('a')
    global.fetch = vi.fn(() => resp(200))
    expect(await syncPendingRounds('u1')).toMatchObject({ synced: 1 })
    expect(byId('a').synced).toBe(true)
  })

  it('sends the notes stored on the pending round', async () => {
    saveCompletedGame(round({ id: 'a' }))
    markCompletedGamePending('a', 'u1', '  Kept it  ')
    global.fetch = vi.fn(() => resp(201))
    await syncPendingRounds('u1')
    expect(JSON.parse(posts()[0][1].body).notes).toBe('Kept it')
  })

  it('sends rounds oldest first, one at a time', async () => {
    seed('new', { completedAt: '2026-08-03T12:00:00.000Z' })
    seed('old', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('mid', { completedAt: '2026-08-02T12:00:00.000Z' })
    let inFlight = 0
    let maxInFlight = 0
    global.fetch = vi.fn(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await tick()
      inFlight -= 1
      return resp(201)
    })
    await syncPendingRounds('u1')
    expect(postedIds()).toEqual(['old', 'mid', 'new'])
    expect(maxInFlight).toBe(1)
  })

  it('flags a 400 as rejected, keeps the round, and still syncs the next one', async () => {
    seed('bad', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('good', { completedAt: '2026-08-02T12:00:00.000Z' })
    global.fetch = vi.fn((url, o) => resp(JSON.parse(o.body).client_round_id === 'bad' ? 400 : 201))
    const summary = await syncPendingRounds('u1')
    expect(summary).toEqual({ synced: 1, rejected: 1, remaining: 0 })
    expect(postedIds()).toEqual(['bad', 'good'])
    expect(byId('bad')).toMatchObject({ syncRejected: true, pendingSyncUserId: 'u1' })
    expect(byId('bad').synced).toBeUndefined()
    expect(byId('good').synced).toBe(true)
  })

  it('leaves a 401 pending and stops the batch after one request', async () => {
    seed('a', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    global.fetch = vi.fn(() => resp(401))
    const summary = await syncPendingRounds('u1')
    expect(summary).toEqual({ synced: 0, rejected: 0, remaining: 2 })
    expect(posts()).toHaveLength(1)
    expect(byId('a')).toMatchObject({ pendingSyncUserId: 'u1' })
    expect(byId('a').syncRejected).toBeUndefined()
    expect(byId('b')).toBeDefined()
  })

  it('leaves the round pending and stops the batch on a network error', async () => {
    seed('a', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(await syncPendingRounds('u1')).toEqual({ synced: 0, rejected: 0, remaining: 2 })
    expect(posts()).toHaveLength(1)
    expect(byId('a').pendingSyncUserId).toBe('u1')
  })

  it('leaves the round pending and stops the batch on a 5xx', async () => {
    seed('a', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    global.fetch = vi.fn(() => resp(503))
    expect(await syncPendingRounds('u1')).toEqual({ synced: 0, rejected: 0, remaining: 2 })
    expect(posts()).toHaveLength(1)
  })

  it('syncs what it can before a later round fails (partial progress is kept)', async () => {
    seed('a', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    seed('c', { completedAt: '2026-08-03T12:00:00.000Z' })
    global.fetch = vi.fn((url, o) => resp(JSON.parse(o.body).client_round_id === 'b' ? 500 : 201))
    expect(await syncPendingRounds('u1')).toEqual({ synced: 1, rejected: 0, remaining: 2 })
    expect(postedIds()).toEqual(['a', 'b'])
    expect(byId('a').synced).toBe(true)
    expect(byId('c').pendingSyncUserId).toBe('u1')
  })

  it('counts a timeout as a network error and releases the guard so a later run works', async () => {
    seed('a')
    vi.useFakeTimers()
    global.fetch = vi.fn(() => new Promise(() => {}))
    const first = syncPendingRounds('u1')
    await vi.advanceTimersByTimeAsync(POST_TIMEOUT_MS)
    expect(await first).toEqual({ synced: 0, rejected: 0, remaining: 1 })
    expect(byId('a').pendingSyncUserId).toBe('u1')
    expect(isSyncing('a')).toBe(false)

    global.fetch = vi.fn(() => resp(201))
    expect(await syncPendingRounds('u1')).toEqual({ synced: 1, rejected: 0, remaining: 0 })
    expect(posts()).toHaveLength(1)
  })

  it('keeps working when a subscriber throws', async () => {
    seed('a')
    global.fetch = vi.fn(() => resp(201))
    // A subscriber that throws must not wedge or break later runs.
    const unsubscribe = subscribeToSync(() => { throw new Error('boom') })
    await expect(syncPendingRounds('u1')).resolves.toMatchObject({ synced: 1 })
    unsubscribe()
    seed('b')
    await expect(syncPendingRounds('u1')).resolves.toMatchObject({ synced: 1 })
  })

  it('never retries a rejected round', async () => {
    seed('a')
    markCompletedGameRejected('a')
    global.fetch = vi.fn(() => resp(201))
    expect(await syncPendingRounds('u1')).toEqual({ synced: 0, rejected: 0, remaining: 0 })
    expect(posts()).toHaveLength(0)
    expect(byId('a').syncRejected).toBe(true)
  })

  it('never sends another user\'s pending round, or a round with no marker', async () => {
    seed('mine')
    seed('theirs', { userId: 'u2' })
    seed('quickplay', { userId: null })
    global.fetch = vi.fn(() => resp(201))
    await syncPendingRounds('u1')
    expect(postedIds()).toEqual(['mine'])
    expect(byId('theirs')).toMatchObject({ pendingSyncUserId: 'u2' })
    expect(byId('theirs').synced).toBeUndefined()
    expect(byId('quickplay').pendingSyncUserId).toBeUndefined()
    expect(byId('quickplay').synced).toBeUndefined()
  })

  it('matches the user id whether it is a number or a string', async () => {
    seed('a', { userId: 7 })
    meDefault = '7'
    global.fetch = vi.fn(() => resp(201))
    await syncPendingRounds(7)
    expect(postedIds()).toEqual(['a'])
  })

  it('does nothing and does not fetch when nothing is pending', async () => {
    saveCompletedGame(round())
    global.fetch = vi.fn(() => resp(201))
    expect(await syncPendingRounds('u1')).toEqual({ synced: 0, rejected: 0, remaining: 0 })
    expect(posts()).toHaveLength(0)
  })

  it('sends each round once when two runs overlap', async () => {
    seed('a', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    const gate = deferred()
    global.fetch = vi.fn(async () => { await gate.promise; return resp(201) })
    const first = syncPendingRounds('u1')
    const second = syncPendingRounds('u1')
    gate.resolve()
    const [s1, s2] = await Promise.all([first, second])
    expect(postedIds().sort()).toEqual(['a', 'b'])
    expect(s1).toEqual({ synced: 2, rejected: 0, remaining: 0 })
    expect(s2).toEqual(s1)
  })

  it('can run again once the previous run has finished', async () => {
    seed('a')
    global.fetch = vi.fn(() => resp(500))
    await syncPendingRounds('u1')
    global.fetch = vi.fn(() => resp(201))
    expect(await syncPendingRounds('u1')).toMatchObject({ synced: 1 })
  })

  it('a run for a different user waits for the current one, then syncs its own rounds', async () => {
    seed('mine')
    seed('theirs', { userId: 'u2' })
    const gate = deferred()
    global.fetch = vi.fn(async (url, o) => {
      if (JSON.parse(o.body).client_round_id === 'mine') await gate.promise
      return resp(201)
    })
    meIds = ['u1', 'u2']
    const first = syncPendingRounds('u1')
    const second = syncPendingRounds('u2')
    await tick()
    expect(postedIds()).toEqual(['mine'])
    gate.resolve()
    await Promise.all([first, second])
    expect(postedIds()).toEqual(['mine', 'theirs'])
  })

  it('isSyncing is true only while that round is being POSTed', async () => {
    seed('a')
    const gate = deferred()
    global.fetch = vi.fn(async () => { await gate.promise; return resp(201) })
    const run = syncPendingRounds('u1')
    await tick()
    expect(isSyncing('a')).toBe(true)
    expect(isSyncing('other')).toBe(false)
    gate.resolve()
    await run
    expect(isSyncing('a')).toBe(false)
  })

  it('isSyncing is false again after a failed POST', async () => {
    seed('a')
    global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    await syncPendingRounds('u1')
    expect(isSyncing('a')).toBe(false)
  })

  it('does not throw or resurrect a round that was deleted while its POST was in flight', async () => {
    seed('a')
    seed('keep', { completedAt: '2026-08-02T12:00:00.000Z' })
    global.fetch = vi.fn(async (url, o) => {
      if (JSON.parse(o.body).client_round_id === 'a') deleteCompletedGame('a')
      return resp(201)
    })
    await expect(syncPendingRounds('u1')).resolves.toMatchObject({ remaining: 0 })
    expect(byId('a')).toBeUndefined()
    expect(byId('keep').synced).toBe(true)
  })

  it('skips a round that was deleted before its turn', async () => {
    seed('a', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    global.fetch = vi.fn(async (url, o) => {
      if (JSON.parse(o.body).client_round_id === 'a') deleteCompletedGame('b')
      return resp(201)
    })
    await syncPendingRounds('u1')
    expect(postedIds()).toEqual(['a'])
    expect(byId('b')).toBeUndefined()
  })

  it('never deletes a local round, whatever the outcome', async () => {
    for (const status of [201, 400, 401, 500]) {
      localStorage.clear()
      seed('a')
      global.fetch = vi.fn(() => resp(status))
      await syncPendingRounds('u1')
      expect(byId('a')).toBeDefined()
    }
  })
})

// A round being edited has its working copy in the active-game slot, stamped
// `_edit: { id, fromDb }` by Setup. The runner must not send it: the copy in
// the completed list is about to be overwritten, and a save that succeeds with
// the old data mid-edit would clear the marker and strand the edit.
describe('syncPendingRounds - session check (#114)', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('checks /api/auth/me once per run, before the first POST', async () => {
    seed('a')
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    global.fetch = vi.fn(() => resp(201))
    await syncPendingRounds('u1')
    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me', '/api/games', '/api/games'])
    expect(postedIds()).toEqual(['a', 'b'])
  })

  it('posts nothing and keeps the round pending when the session belongs to someone else', async () => {
    seed('a')
    meDefault = 'someone-else'
    global.fetch = vi.fn(() => resp(201))
    expect(await syncPendingRounds('u1')).toEqual({ synced: 0, rejected: 0, remaining: 1 })
    expect(posts()).toHaveLength(0)
    expect(byId('a').pendingSyncUserId).toBe('u1')
    expect(byId('a').synced).toBeUndefined()
  })

  it('posts nothing when /api/auth/me says the session has expired', async () => {
    seed('a')
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: vi.fn((url) => (url === '/api/auth/me' ? resp(401) : resp(201))) })
    expect(await syncPendingRounds('u1')).toMatchObject({ synced: 0, remaining: 1 })
    expect(global.fetch.mock.calls.filter(([u]) => u === '/api/games')).toHaveLength(0)
  })

  it('posts nothing when /api/auth/me fails or returns no user', async () => {
    seed('a')
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: vi.fn((url) => (url === '/api/auth/me' ? Promise.reject(new TypeError('offline')) : resp(201))) })
    expect(await syncPendingRounds('u1')).toMatchObject({ synced: 0, remaining: 1 })
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: vi.fn((url) => (url === '/api/auth/me' ? resp(200, { user: null }) : resp(201))) })
    expect(await syncPendingRounds('u1')).toMatchObject({ synced: 0, remaining: 1 })
    expect(global.fetch.mock.calls.filter(([u]) => u === '/api/games')).toHaveLength(0)
  })

  it('gives up after the timeout when /api/auth/me hangs, and can run again later', async () => {
    vi.useFakeTimers()
    seed('a')
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: vi.fn((url) => (url === '/api/auth/me' ? new Promise(() => {}) : resp(201))) })
    const run = syncPendingRounds('u1')
    await vi.advanceTimersByTimeAsync(ME_TIMEOUT_MS + 10)
    expect(await run).toMatchObject({ synced: 0, remaining: 1 })
    expect(global.fetch.mock.calls.filter(([u]) => u === '/api/games')).toHaveLength(0)
  })

  it('makes no /api/auth/me request when nothing is waiting', async () => {
    global.fetch = vi.fn(() => resp(201))
    await syncPendingRounds('u1')
    expect(meCalls()).toHaveLength(0)
  })
})

describe('syncPendingRounds - a round under edit', () => {
  const editing = (id, extra = {}) => saveActiveGame({ ...round({ id }), _edit: { id, fromDb: false }, ...extra })

  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks() })

  it('skips the round being edited, keeps it pending, counts it in remaining, and still sends the others', async () => {
    seed('a', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    editing('a')
    global.fetch = vi.fn(() => resp(201))
    const summary = await syncPendingRounds('u1')
    expect(postedIds()).toEqual(['b'])
    expect(summary).toEqual({ synced: 1, rejected: 0, remaining: 1 })
    expect(byId('a').pendingSyncUserId).toBe('u1')
    expect(byId('a').synced).toBeUndefined()
    expect(byId('b').synced).toBe(true)
  })

  it('sends nothing at all when the only pending round is the one being edited', async () => {
    seed('a')
    editing('a')
    global.fetch = vi.fn(() => resp(201))
    expect(await syncPendingRounds('u1')).toEqual({ synced: 0, rejected: 0, remaining: 1 })
    expect(posts()).toHaveLength(0)
  })

  it('picks the round up on the next run once the edit is abandoned', async () => {
    seed('a')
    editing('a')
    global.fetch = vi.fn(() => resp(201))
    await syncPendingRounds('u1')
    expect(posts()).toHaveLength(0)

    clearActiveGame()
    expect(await syncPendingRounds('u1')).toEqual({ synced: 1, rejected: 0, remaining: 0 })
    expect(postedIds()).toEqual(['a'])
  })

  it('sends the edited data, not the old, once the edit has been saved', async () => {
    seed('a')
    editing('a')
    global.fetch = vi.fn(() => resp(201))
    await syncPendingRounds('u1')
    // The edit is saved: the completed copy is overwritten in place (marker
    // kept) and the working copy goes.
    updateCompletedGame('a', { scores: { Ann: [1, 1], Bo: [2, 2] } })
    clearActiveGame()
    await syncPendingRounds('u1')
    expect(JSON.parse(posts()[0][1].body).player_data[0].scores).toEqual([1, 1])
  })

  it('is not held up by an edit of a different round, or by a normal game in progress', async () => {
    seed('a')
    editing('other')
    global.fetch = vi.fn(() => resp(201))
    expect(await syncPendingRounds('u1')).toMatchObject({ synced: 1 })

    localStorage.clear()
    seed('b')
    saveActiveGame(round({ id: 'b' })) // same id but a live game, no _edit marker
    expect(await syncPendingRounds('u1')).toMatchObject({ synced: 1 })
  })

  it('honours an edit that starts part-way through a batch', async () => {
    seed('a', { completedAt: '2026-08-01T12:00:00.000Z' })
    seed('b', { completedAt: '2026-08-02T12:00:00.000Z' })
    global.fetch = vi.fn(async (url, o) => {
      if (JSON.parse(o.body).client_round_id === 'a') editing('b')
      return resp(201)
    })
    const summary = await syncPendingRounds('u1')
    expect(postedIds()).toEqual(['a'])
    expect(summary).toEqual({ synced: 1, rejected: 0, remaining: 1 })
    expect(byId('b').pendingSyncUserId).toBe('u1')
  })
})

describe('subscribeToSync', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks() })

  it('fires after a run that synced something', async () => {
    seed('a')
    global.fetch = vi.fn(() => resp(201))
    const cb = vi.fn()
    const unsubscribe = subscribeToSync(cb)
    await syncPendingRounds('u1')
    expect(cb).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('fires after a run that newly rejected something', async () => {
    seed('a')
    global.fetch = vi.fn(() => resp(400))
    const cb = vi.fn()
    const unsubscribe = subscribeToSync(cb)
    await syncPendingRounds('u1')
    expect(cb).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('does not fire when nothing changed (nothing pending, or every attempt failed)', async () => {
    const cb = vi.fn()
    const unsubscribe = subscribeToSync(cb)
    global.fetch = vi.fn(() => resp(201))
    await syncPendingRounds('u1')
    seed('a')
    global.fetch = vi.fn(() => resp(500))
    await syncPendingRounds('u1')
    global.fetch = vi.fn(() => resp(401))
    await syncPendingRounds('u1')
    expect(cb).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('stops calling a callback once it has unsubscribed', async () => {
    seed('a')
    global.fetch = vi.fn(() => resp(201))
    const cb = vi.fn()
    subscribeToSync(cb)()
    await syncPendingRounds('u1')
    expect(cb).not.toHaveBeenCalled()
  })
})
