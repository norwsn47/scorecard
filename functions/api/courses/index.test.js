import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onRequestGet, onRequestPost } from './index.js'
import { getSessionUser } from '../../_lib/session.js'

vi.mock('../../_lib/session.js', () => ({ getSessionUser: vi.fn() }))

// Minimal fake of the D1 prepared-statement API used by the handlers:
// prepare(sql).bind(...args).run() / .all()
function makeDB({ rows = [] } = {}) {
  return {
    inserted: [],
    prepare(sql) {
      const db = this
      return {
        sql,
        args: [],
        bind(...args) {
          this.args = args
          return this
        },
        async all() {
          return { results: rows }
        },
        async run() {
          if (/^\s*INSERT INTO courses/.test(this.sql)) db.inserted.push(this.args)
          return { success: true }
        },
      }
    },
  }
}

function post(body) {
  const request = new Request('http://localhost/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { env: { DB: null }, params: {}, request }
}

function get() {
  const request = new Request('http://localhost/api/courses', { method: 'GET' })
  return { env: { DB: null }, params: {}, request }
}

// INSERT column order: id, user_id, name, holes, hole_pars, is_default, created_at
const HOLE_PARS_ARG = 4

describe('onRequestPost /api/courses — hole_pars', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
  })

  it('returns 401 when unauthenticated', async () => {
    getSessionUser.mockResolvedValue(null)
    const ctx = post({ name: 'Braid Hills', holes: 9 })
    ctx.env.DB = makeDB()

    expect((await onRequestPost(ctx)).status).toBe(401)
  })

  it('defaults hole_pars to an array of 3s matching the hole count when absent', async () => {
    const ctx = post({ name: 'Braid Hills', holes: 9 })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(db.inserted[0][HOLE_PARS_ARG]).toBe(JSON.stringify(Array(9).fill(3)))
    expect(json.course.hole_pars).toBe(JSON.stringify(Array(9).fill(3)))
  })

  it('stores a valid custom hole_pars', async () => {
    const pars = Array(18).fill(3)
    pars[0] = 4
    pars[17] = 5
    const ctx = post({ name: 'Braid Hills', holes: 18, hole_pars: pars })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(201)
    expect(db.inserted[0][HOLE_PARS_ARG]).toBe(JSON.stringify(pars))
  })

  it('rejects a hole_pars whose length does not match the hole count', async () => {
    const ctx = post({ name: 'Braid Hills', holes: 18, hole_pars: Array(9).fill(3) })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('rejects a hole_pars with an out-of-range value', async () => {
    const bad = Array(9).fill(3)
    bad[3] = 1
    const ctx = post({ name: 'Braid Hills', holes: 9, hole_pars: bad })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('rejects a hole_pars with a non-integer value', async () => {
    const bad = Array(9).fill(3)
    bad[3] = 3.5
    const ctx = post({ name: 'Braid Hills', holes: 9, hole_pars: bad })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
  })

  it('still rejects a missing course name', async () => {
    const ctx = post({ holes: 9, hole_pars: Array(9).fill(3) })
    ctx.env.DB = makeDB()

    expect((await onRequestPost(ctx)).status).toBe(400)
  })
})

describe('onRequestPost /api/courses — holes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
  })

  // INSERT column order: id, user_id, name, holes, hole_pars, is_default, created_at
  const HOLES_ARG = 3

  it('accepts holes: 9 and persists it', async () => {
    const ctx = post({ name: 'Braid Hills', holes: 9 })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(db.inserted[0][HOLES_ARG]).toBe(9)
    expect(json.course.holes).toBe(9)
  })

  it('accepts holes: 18 and persists it', async () => {
    const ctx = post({ name: 'Braid Hills', holes: 18 })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(db.inserted[0][HOLES_ARG]).toBe(18)
    expect(json.course.holes).toBe(18)
  })

  it('rejects holes: 36', async () => {
    const ctx = post({ name: 'Braid Hills', holes: 36 })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('rejects a missing holes field', async () => {
    const ctx = post({ name: 'Braid Hills' })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('rejects holes as a string ("9")', async () => {
    const ctx = post({ name: 'Braid Hills', holes: '9' })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('rejects a non-integer holes value (9.5)', async () => {
    const ctx = post({ name: 'Braid Hills', holes: 9.5 })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })
})

describe('onRequestGet /api/courses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
  })

  it('returns courses including the raw hole_pars text', async () => {
    const ctx = get()
    ctx.env.DB = makeDB({
      rows: [
        { id: 'c1', name: 'Bruntsfield Short Hole Golf Course', holes: 36, hole_pars: JSON.stringify(Array(36).fill(3)), is_default: 1 },
        { id: 'c2', name: 'Old course (pre-003)', holes: 36, hole_pars: null, is_default: 0 },
      ],
    })

    const res = await onRequestGet(ctx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.courses).toHaveLength(2)
    expect(json.courses[0].hole_pars).toBe(JSON.stringify(Array(36).fill(3)))
    expect(json.courses[1].hole_pars).toBeNull()
  })
})
