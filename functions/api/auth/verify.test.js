import { describe, it, expect } from 'vitest'
import { onRequestGet } from './verify.js'
import { defaultHoleParsJson } from '../../_lib/hole-pars.js'

// Fake D1: records every INSERT as { table, cols, values } and answers the
// two SELECTs the handler makes.
function makeDB({ token, existingUser = null }) {
  const inserts = []
  return {
    inserts,
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...args) { this.args = args; return this },
        async first() {
          if (/FROM magic_tokens/.test(this.sql)) {
            return this.args[0] === token
              ? { id: 'tok1', email: 'new@example.com' }
              : null
          }
          if (/FROM users WHERE email/.test(this.sql)) return existingUser
          return null
        },
        async run() {
          const m = this.sql.match(/INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/)
          if (m) {
            const cols = m[2].split(',').map(s => s.trim())
            expect(m[3].split(',').length).toBe(cols.length) // placeholder count
            expect(this.args.length).toBe(cols.length)       // bind count
            inserts.push({ table: m[1], cols, values: this.args })
          }
          return { success: true }
        },
      }
    },
  }
}

describe('GET /api/auth/verify — new-user seed', () => {
  const ctx = (db) => ({
    env: { DB: db, APP_URL: 'https://app.test' },
    request: new Request('https://app.test/api/auth/verify?token=good'),
  })

  it('seeds the default Bruntsfield course with all-par-3 hole_pars', async () => {
    const db = makeDB({ token: 'good' })
    const res = await onRequestGet(ctx(db))

    expect(res.status).toBe(302)
    const course = db.inserts.find(i => i.table === 'courses')
    expect(course).toBeTruthy()
    const row = Object.fromEntries(course.cols.map((c, i) => [c, course.values[i]]))
    expect(row.name).toBe('Bruntsfield Short Hole Golf Course')
    expect(row.holes).toBe(36)
    expect(row.is_default).toBe(1)
    expect(row.hole_pars).toBe(defaultHoleParsJson(36))
    expect(JSON.parse(row.hole_pars)).toEqual(Array(36).fill(3))
  })

  it('does not seed a course for an existing user', async () => {
    const db = makeDB({ token: 'good', existingUser: { id: 'u1', email: 'new@example.com' } })
    await onRequestGet(ctx(db))
    expect(db.inserts.find(i => i.table === 'courses')).toBeUndefined()
  })
})
