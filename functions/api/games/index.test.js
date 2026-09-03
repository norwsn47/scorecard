import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onRequestPost } from './index.js'
import { getSessionUser } from '../../_lib/session.js'

vi.mock('../../_lib/session.js', () => ({ getSessionUser: vi.fn() }))

// Minimal fake of the D1 prepared-statement API used by onRequestPost.
function makeDB({ courses = [], inserted = [] } = {}) {
  return {
    inserted,
    prepare(sql) {
      const db = this
      return {
        sql,
        args: [],
        bind(...args) {
          this.args = args
          return this
        },
        async first() {
          if (/SELECT id FROM courses WHERE id = \? AND user_id = \?/.test(this.sql)) {
            const [id, userId] = this.args
            const c = courses.find((x) => x.id === id && x.user_id === userId)
            return c ? { id: c.id } : null
          }
          if (/SELECT id FROM games WHERE user_id = \? AND client_round_id = \?/.test(this.sql)) {
            return null
          }
          return null
        },
        async run() {
          if (/^\s*INSERT INTO games/.test(this.sql)) {
            db.inserted.push(this.args)
          }
          return { success: true }
        },
      }
    },
  }
}

function post(body) {
  const request = new Request('http://localhost/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { env: { DB: null }, params: {}, request }
}

const validBody = {
  played_at: '2026-08-01T10:00:00.000Z',
  holes_played: 18,
  player_data: [{ name: 'Ann', scores: [3] }],
}

describe('onRequestPost /api/games — course ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
  })

  it("rejects a course_id that is not one of the user's courses", async () => {
    const ctx = post({ ...validBody, course_id: 'course-owned-by-u2' })
    const db = makeDB({ courses: [{ id: 'course-u1', user_id: 'u1' }] })
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it("accepts a course_id that belongs to the user", async () => {
    const ctx = post({ ...validBody, course_id: 'course-u1' })
    const db = makeDB({ courses: [{ id: 'course-u1', user_id: 'u1' }] })
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(201)
    expect(db.inserted).toHaveLength(1)
  })

  it('allows an absent course_id', async () => {
    const ctx = post({ ...validBody })
    const db = makeDB({ courses: [] })
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(201)
    expect(db.inserted).toHaveLength(1)
  })
})

describe('onRequestPost /api/games — holes_played validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
  })

  for (const bad of [
    { label: 'a string', value: '18' },
    { label: 'a non-integer', value: 18.5 },
    { label: 'above 36', value: 40 },
    { label: 'negative', value: -3 },
  ]) {
    it(`rejects holes_played that is ${bad.label}`, async () => {
      const ctx = post({ ...validBody, holes_played: bad.value })
      const db = makeDB()
      ctx.env.DB = db

      const res = await onRequestPost(ctx)

      expect(res.status).toBe(400)
      expect(db.inserted).toHaveLength(0)
    })
  }

  it('accepts holes_played at the bounds (1 and 36)', async () => {
    for (const value of [1, 36]) {
      const ctx = post({ ...validBody, holes_played: value })
      ctx.env.DB = makeDB()
      expect((await onRequestPost(ctx)).status).toBe(201)
    }
  })
})

describe('onRequestPost /api/games — hole_pars', () => {
  // INSERT column order: id, user_id, course_id, played_at, holes_played,
  // player_data, hole_pars, notes, client_round_id, created_at
  const HOLE_PARS_ARG = 6

  beforeEach(() => {
    vi.clearAllMocks()
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
  })

  it('stores NULL when hole_pars is absent', async () => {
    const ctx = post({ ...validBody })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(201)
    expect(db.inserted[0][HOLE_PARS_ARG]).toBeNull()
  })

  it('stores a valid hole_pars matching holes_played', async () => {
    const pars = Array(18).fill(3)
    const ctx = post({ ...validBody, hole_pars: pars })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(201)
    expect(db.inserted[0][HOLE_PARS_ARG]).toBe(JSON.stringify(pars))
  })

  it('rejects a hole_pars whose length does not match holes_played', async () => {
    const ctx = post({ ...validBody, hole_pars: Array(9).fill(3) })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('rejects a hole_pars with a non-integer or out-of-range entry', async () => {
    const bad = Array(18).fill(3)
    bad[2] = 12
    const ctx = post({ ...validBody, hole_pars: bad })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })
})
