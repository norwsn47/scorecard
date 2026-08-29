import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onRequestPatch } from './[id].js'
import { getSessionUser } from '../../_lib/session.js'

vi.mock('../../_lib/session.js', () => ({ getSessionUser: vi.fn() }))

// Minimal fake of the D1 prepared-statement API used by the handler:
// prepare(sql).bind(...args).first() / .run()
function makeDB(games) {
  return {
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...args) {
          this.args = args
          return this
        },
        async first() {
          if (/SELECT id FROM games WHERE id = \? AND user_id = \?/.test(this.sql)) {
            const [id, userId] = this.args
            const g = games.find((x) => x.id === id && x.user_id === userId)
            return g ? { id: g.id } : null
          }
          return null
        },
        async run() {
          const m = this.sql.trim().match(/^UPDATE games SET (.+) WHERE id = \? AND user_id = \?$/s)
          if (m) {
            const setCols = m[1].split(',').map((s) => s.trim().split(' = ')[0])
            const id = this.args[this.args.length - 2]
            const userId = this.args[this.args.length - 1]
            const g = games.find((x) => x.id === id && x.user_id === userId)
            if (g) setCols.forEach((col, i) => { g[col] = this.args[i] })
          }
          return { success: true }
        },
      }
    },
  }
}

function patch(body, { id = 'g1' } = {}) {
  const request = new Request(`http://localhost/api/games/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { env: { DB: null }, params: { id }, request }
}

describe('onRequestPatch /api/games/[id]', () => {
  let games

  beforeEach(() => {
    vi.clearAllMocks()
    games = [
      {
        id: 'g1',
        user_id: 'u1',
        game_name: 'Old name',
        course_id: null,
        played_at: '2026-08-01T10:00:00.000Z',
        holes_played: 18,
        player_data: JSON.stringify([{ name: 'Ann', scores: [3] }]),
        notes: null,
        client_round_id: 'local-1',
        created_at: '2026-08-01T11:00:00.000Z',
      },
    ]
  })

  it('returns 401 when unauthenticated', async () => {
    getSessionUser.mockResolvedValue(null)
    const ctx = patch({ notes: 'hi' })
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(401)
  })

  it("returns 404 for another user's game id", async () => {
    getSessionUser.mockResolvedValue({ id: 'u2', email: 'other@example.com' })
    const ctx = patch({ notes: 'hi' })
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(404)
    expect(games[0].notes).toBeNull()
  })

  it('applies a partial update and leaves other fields untouched', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ notes: 'Great round', game_name: 'New name' })
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, id: 'g1' })
    expect(games[0].notes).toBe('Great round')
    expect(games[0].game_name).toBe('New name')
    // Untouched
    expect(games[0].holes_played).toBe(18)
    expect(games[0].played_at).toBe('2026-08-01T10:00:00.000Z')
    expect(games[0].client_round_id).toBe('local-1')
    expect(games[0].created_at).toBe('2026-08-01T11:00:00.000Z')
  })

  it('accepts player_data as a JSON string and stores it verbatim', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const raw = JSON.stringify([{ name: 'Bob', scores: [4, 5] }])
    const ctx = patch({ player_data: raw })
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(200)
    expect(games[0].player_data).toBe(raw)
  })

  it('rejects an out-of-range holes_played', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ holes_played: 40 })
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
    expect(games[0].holes_played).toBe(18)
  })

  it('rejects a non-integer holes_played', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ holes_played: 9.5 })
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
  })

  it('rejects an empty player_data array', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ player_data: [] })
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
  })

  it('rejects notes longer than 300 characters', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ notes: 'x'.repeat(301) })
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
    expect(games[0].notes).toBeNull()
  })

  it('returns ok without a write when the body has no editable fields', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({})
    ctx.env.DB = makeDB(games)

    const res = await onRequestPatch(ctx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, id: 'g1' })
  })
})
