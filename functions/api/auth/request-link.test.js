import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { onRequestPost } from './request-link.js'

// Fake D1. Records every statement (INSERT / DELETE / SELECT) with its bound
// args and answers the one COUNT the handler makes for the per-email throttle
// (#14). It does not evaluate SQL, so the tests assert the query text and the
// bound args directly where the predicate matters.
function makeDB({ recentCount = 0, failCleanup = false } = {}) {
  const statements = []
  function prepare(sql) {
    return {
      sql,
      args: [],
      bind(...args) { this.args = args; return this },
      async first() {
        statements.push({ sql, args: this.args })
        if (/SELECT COUNT\(\*\)/.test(sql)) return { count: recentCount }
        return null
      },
      async run() {
        statements.push({ sql, args: this.args })
        if (failCleanup && /DELETE FROM magic_tokens/.test(sql)) throw new Error('locked')
        return { success: true }
      },
    }
  }
  return { statements, prepare }
}

const env = {
  RESEND_API_KEY: 'test-key',
  RESEND_FROM_EMAIL: 'Scorecard <hi@test>',
  APP_URL: 'https://app.test',
}

function ctx(db, email) {
  const waited = []
  return {
    waited,
    env: { ...env, DB: db },
    waitUntil: p => waited.push(p),
    request: new Request('https://app.test/api/auth/request-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),
  }
}

// drive the handler and let any waitUntil() work settle
async function run(db, email) {
  const c = ctx(db, email)
  const res = await onRequestPost(c)
  await Promise.all(c.waited)
  return res
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'email-1' }) })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/auth/request-link', () => {
  it('rejects an invalid email without touching the DB', async () => {
    const db = makeDB()
    const res = await run(db, 'not-an-email')
    expect(res.status).toBe(400)
    expect(db.statements).toHaveLength(0)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('issues a token and sends the email on the happy path', async () => {
    const db = makeDB({ recentCount: 0 })
    const res = await run(db, 'Player@Example.com')

    expect(res.status).toBe(200)
    const insert = db.statements.find(s => /INSERT INTO magic_tokens/.test(s.sql))
    expect(insert).toBeTruthy()
    // email is normalised to lowercase before storage
    expect(insert.args[1]).toBe('player@example.com')
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  it('#14 — the throttle counts only unused, still-fresh links for this email', async () => {
    const db = makeDB({ recentCount: 5 })
    const res = await run(db, 'player@example.com')

    expect(res.status).toBe(429)
    const countStmt = db.statements.find(s => /SELECT COUNT\(\*\)/.test(s.sql))
    expect(countStmt.sql).toMatch(/email = \? AND used = 0 AND expires_at > \?/)
    expect(countStmt.args[0]).toBe('player@example.com')
    // second bind arg is "now" — the lower bound for a still-fresh expiry
    expect(Math.abs(new Date(countStmt.args[1]).getTime() - Date.now())).toBeLessThan(60 * 1000)
    // nothing issued, nothing sent
    expect(db.statements.some(s => /INSERT INTO magic_tokens/.test(s.sql))).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('#14 — allows the request when the address is just under the limit', async () => {
    const db = makeDB({ recentCount: 4 })
    const res = await run(db, 'player@example.com')
    expect(res.status).toBe(200)
  })

  it('#15 — prunes tokens whose expiry is >24h old, handed to waitUntil', async () => {
    const db = makeDB()
    const c = ctx(db, 'player@example.com')
    await onRequestPost(c)
    await Promise.all(c.waited)

    // the cleanup is registered with waitUntil (off the critical path), not
    // run inside a DB.batch with the token insert
    expect(c.waited).toHaveLength(1)
    const del = db.statements.find(s => /DELETE FROM magic_tokens WHERE expires_at < \?/.test(s.sql))
    expect(del).toBeTruthy()
    const cutoff = new Date(del.args[0]).getTime()
    expect(Math.abs(cutoff - (Date.now() - 24 * 60 * 60 * 1000))).toBeLessThan(60 * 1000)
  })

  it('#15 — a failed cleanup does not fail the request', async () => {
    const db = makeDB({ failCleanup: true })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const c = ctx(db, 'player@example.com')
    const res = await onRequestPost(c)
    await Promise.all(c.waited)

    expect(res.status).toBe(200)
    expect(errSpy).toHaveBeenCalledWith('magic_tokens cleanup failed', expect.any(Error))
  })
})
