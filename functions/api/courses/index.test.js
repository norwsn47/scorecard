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
    const ctx = post({ name: 'Braid Hills' })
    ctx.env.DB = makeDB()

    expect((await onRequestPost(ctx)).status).toBe(401)
  })

  it('defaults hole_pars to a length-36 array of 3s when absent', async () => {
    const ctx = post({ name: 'Braid Hills' })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(db.inserted[0][HOLE_PARS_ARG]).toBe(JSON.stringify(Array(36).fill(3)))
    expect(json.course.hole_pars).toBe(JSON.stringify(Array(36).fill(3)))
  })

  it('stores a valid custom hole_pars', async () => {
    const pars = Array(36).fill(3)
    pars[0] = 4
    pars[35] = 5
    const ctx = post({ name: 'Braid Hills', hole_pars: pars })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(201)
    expect(db.inserted[0][HOLE_PARS_ARG]).toBe(JSON.stringify(pars))
  })

  it('rejects a hole_pars that is not 36 entries', async () => {
    const ctx = post({ name: 'Braid Hills', hole_pars: Array(18).fill(3) })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('rejects a hole_pars with an out-of-range value', async () => {
    const bad = Array(36).fill(3)
    bad[10] = 1
    const ctx = post({ name: 'Braid Hills', hole_pars: bad })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('rejects a hole_pars with a non-integer value', async () => {
    const bad = Array(36).fill(3)
    bad[10] = 3.5
    const ctx = post({ name: 'Braid Hills', hole_pars: bad })
    const db = makeDB()
    ctx.env.DB = db

    const res = await onRequestPost(ctx)

    expect(res.status).toBe(400)
  })

  it('still rejects a missing course name', async () => {
    const ctx = post({ hole_pars: Array(36).fill(3) })
    ctx.env.DB = makeDB()

    expect((await onRequestPost(ctx)).status).toBe(400)
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
