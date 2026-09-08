import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onRequestPatch, onRequestDelete } from './[id].js'
import { getSessionUser } from '../../_lib/session.js'

vi.mock('../../_lib/session.js', () => ({ getSessionUser: vi.fn() }))

// Minimal fake of the D1 prepared-statement API used by the handlers:
// prepare(sql).bind(...args).first() / .run(), plus DB.batch([...]).
function makeDB(courses, games = []) {
  function statement(sql, args) {
    return {
      sql,
      args,
      async first() {
        if (/SELECT id, holes FROM courses WHERE id = \? AND user_id = \?/.test(sql)) {
          const [id, userId] = args
          const c = courses.find((x) => x.id === id && x.user_id === userId)
          return c ? { id: c.id, holes: c.holes } : null
        }
        if (/SELECT id FROM courses WHERE id = \? AND user_id = \?/.test(sql)) {
          const [id, userId] = args
          const c = courses.find((x) => x.id === id && x.user_id === userId)
          return c ? { id: c.id } : null
        }
        if (/SELECT COUNT\(\*\) AS count FROM games WHERE course_id = \? AND user_id = \?/.test(sql)) {
          const [courseId, userId] = args
          const count = games.filter((g) => g.course_id === courseId && g.user_id === userId).length
          return { count }
        }
        return null
      },
      async run() {
        const updateMatch = sql.trim().match(/^UPDATE courses SET (.+) WHERE id = \? AND user_id = \?$/s)
        if (updateMatch) {
          const setCols = updateMatch[1].split(',').map((s) => s.trim().split(' = ')[0])
          const id = args[args.length - 2]
          const userId = args[args.length - 1]
          const c = courses.find((x) => x.id === id && x.user_id === userId)
          if (c) setCols.forEach((col, i) => { c[col] = args[i] })
          return { success: true }
        }
        if (/^DELETE FROM games WHERE course_id = \? AND user_id = \?$/.test(sql.trim())) {
          const [courseId, userId] = args
          for (let i = games.length - 1; i >= 0; i -= 1) {
            if (games[i].course_id === courseId && games[i].user_id === userId) games.splice(i, 1)
          }
          return { success: true }
        }
        if (/^DELETE FROM courses WHERE id = \? AND user_id = \?$/.test(sql.trim())) {
          const [id, userId] = args
          const idx = courses.findIndex((x) => x.id === id && x.user_id === userId)
          if (idx !== -1) courses.splice(idx, 1)
          return { success: true }
        }
        return { success: true }
      },
    }
  }

  return {
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...args) {
          return statement(sql, args)
        },
      }
    },
    async batch(statements) {
      const results = []
      for (const stmt of statements) results.push(await stmt.run())
      return results
    },
  }
}

function patch(body, { id = 'c1' } = {}) {
  const request = new Request(`http://localhost/api/courses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { env: { DB: null }, params: { id }, request }
}

function del({ id = 'c1' } = {}) {
  const request = new Request(`http://localhost/api/courses/${id}`, { method: 'DELETE' })
  return { env: { DB: null }, params: { id }, request }
}

describe('onRequestPatch /api/courses/[id]', () => {
  let courses

  beforeEach(() => {
    vi.clearAllMocks()
    courses = [
      { id: 'c1', user_id: 'u1', name: 'Braid Hills', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 0 },
      { id: 'default1', user_id: null, name: 'Bruntsfield Short Hole Golf Course', holes: 36, hole_pars: JSON.stringify(Array(36).fill(3)), is_default: 1 },
    ]
  })

  it('returns 401 when unauthenticated', async () => {
    getSessionUser.mockResolvedValue(null)
    const ctx = patch({ name: 'New name' })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(401)
  })

  it("returns 404 for another user's course id", async () => {
    getSessionUser.mockResolvedValue({ id: 'u2', email: 'other@example.com' })
    const ctx = patch({ name: 'New name' })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(404)
    expect(courses[0].name).toBe('Braid Hills')
  })

  it('returns 404 for a nonexistent course id', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ name: 'New name' }, { id: 'nope' })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(404)
  })

  it('cannot patch the system default course (user_id = null)', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ name: 'Hacked name' }, { id: 'default1' })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(404)
    expect(courses[1].name).toBe('Bruntsfield Short Hole Golf Course')
  })

  it('updates name alone', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ name: 'Renamed course' })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, id: 'c1' })
    expect(courses[0].name).toBe('Renamed course')
    // Untouched
    expect(courses[0].hole_pars).toBe(JSON.stringify(Array(9).fill(3)))
  })

  it('rejects an empty name', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ name: '   ' })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
  })

  it('rejects a name longer than 60 characters', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ name: 'x'.repeat(61) })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
  })

  it('updates hole_pars alone with a valid length', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const pars = Array(9).fill(4)
    const ctx = patch({ hole_pars: pars })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(200)
    expect(courses[0].hole_pars).toBe(JSON.stringify(pars))
    // Untouched
    expect(courses[0].name).toBe('Braid Hills')
  })

  it('rejects hole_pars with an invalid length for the course', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ hole_pars: Array(18).fill(3) }) // course is 9 holes
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
    expect(courses[0].hole_pars).toBe(JSON.stringify(Array(9).fill(3)))
  })

  it('rejects hole_pars with an out-of-range value', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const bad = Array(9).fill(3)
    bad[0] = 9
    const ctx = patch({ hole_pars: bad })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
  })

  it('rejects an attempt to change holes with a 400', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ holes: 18 })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/hole count/i)
    expect(courses[0].holes).toBe(9)
  })

  it('rejects an attempt to change holes even alongside a valid name', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({ name: 'Renamed', holes: 18 })
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)

    expect(res.status).toBe(400)
    expect(courses[0].name).toBe('Braid Hills')
  })

  it('returns ok without a write when the body has no editable fields', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = patch({})
    ctx.env.DB = makeDB(courses)

    const res = await onRequestPatch(ctx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, id: 'c1' })
  })
})

describe('onRequestDelete /api/courses/[id]', () => {
  let courses
  let games

  beforeEach(() => {
    vi.clearAllMocks()
    courses = [
      { id: 'c1', user_id: 'u1', name: 'Braid Hills', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 0 },
      { id: 'c2', user_id: 'u1', name: 'Empty course', holes: 9, hole_pars: JSON.stringify(Array(9).fill(3)), is_default: 0 },
      { id: 'default1', user_id: null, name: 'Bruntsfield Short Hole Golf Course', holes: 36, hole_pars: JSON.stringify(Array(36).fill(3)), is_default: 1 },
    ]
    games = [
      { id: 'g1', user_id: 'u1', course_id: 'c1' },
      { id: 'g2', user_id: 'u1', course_id: 'c1' },
      { id: 'g3', user_id: 'u1', course_id: 'c2-not-used' },
    ]
  })

  it('returns 401 when unauthenticated', async () => {
    getSessionUser.mockResolvedValue(null)
    const ctx = del()
    ctx.env.DB = makeDB(courses, games)

    const res = await onRequestDelete(ctx)

    expect(res.status).toBe(401)
  })

  it("returns 404 for another user's course id", async () => {
    getSessionUser.mockResolvedValue({ id: 'u2', email: 'other@example.com' })
    const ctx = del()
    ctx.env.DB = makeDB(courses, games)

    const res = await onRequestDelete(ctx)

    expect(res.status).toBe(404)
    expect(courses.find((c) => c.id === 'c1')).toBeTruthy()
  })

  it('returns 404 for a nonexistent course id', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = del({ id: 'nope' })
    ctx.env.DB = makeDB(courses, games)

    const res = await onRequestDelete(ctx)

    expect(res.status).toBe(404)
  })

  it('cannot delete the system default course (user_id = null)', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = del({ id: 'default1' })
    ctx.env.DB = makeDB(courses, games)

    const res = await onRequestDelete(ctx)

    expect(res.status).toBe(404)
    expect(courses.find((c) => c.id === 'default1')).toBeTruthy()
  })

  it('deletes a course with 0 rounds', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = del({ id: 'c2' })
    ctx.env.DB = makeDB(courses, games)

    const res = await onRequestDelete(ctx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, deleted_rounds: 0 })
    expect(courses.find((c) => c.id === 'c2')).toBeUndefined()
  })

  it('deletes a course with N rounds and cascades the games rows', async () => {
    getSessionUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com' })
    const ctx = del({ id: 'c1' })
    ctx.env.DB = makeDB(courses, games)

    const res = await onRequestDelete(ctx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, deleted_rounds: 2 })
    expect(courses.find((c) => c.id === 'c1')).toBeUndefined()
    // The two games attached to c1 are gone; the unrelated game is untouched.
    expect(games.find((g) => g.course_id === 'c1')).toBeUndefined()
    expect(games).toHaveLength(1)
    expect(games[0].id).toBe('g3')
  })
})
