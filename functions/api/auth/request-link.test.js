import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { onRequestPost } from './request-link.js'

// Fake D1. Records every statement (INSERT / DELETE / SELECT) with its bound
// args, answers the one COUNT the handler makes for the per-email throttle
// (#14), and runs statements either directly (.run) or via DB.batch (#15).
function makeDB({ recentCount = 0 } = {}) {
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
        return { success: true }
      },
    }
  }
  return {
    statements,
    prepare,
    async batch(list) {
      for (const s of list) statements.push({ sql: s.sql, args: s.args })
      return list.map(() => ({ success: true }))
    },
  }
}

const env = {
  DB: null,
  RESEND_API_KEY: 'test-key',
  RESEND_FROM_EMAIL: 'Scorecard <hi@test>',
  APP_URL: 'https://app.test',
}

function ctx(db, email) {
  return {
    env: { ...env, DB: db },
    request: new Request('https://app.test/api/auth/request-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),
  }
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
    const res = await onRequestPost(ctx(db, 'not-an-email'))
    expect(res.status).toBe(400)
    expect(db.statements).toHaveLength(0)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('issues a token and sends the email on the happy path', async () => {
    const db = makeDB({ recentCount: 0 })
    const res = await onRequestPost(ctx(db, 'Player@Example.com'))

    expect(res.status).toBe(200)
    const insert = db.statements.find(s => /INSERT INTO magic_tokens/.test(s.sql))
    expect(insert).toBeTruthy()
    // email is normalised to lowercase before storage
    expect(insert.args[1]).toBe('player@example.com')
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  it('#15 — batches a cleanup DELETE for tokens whose expiry is >24h old', async () => {
    const db = makeDB()
    await onRequestPost(ctx(db, 'player@example.com'))

    const del = db.statements.find(s => /DELETE FROM magic_tokens WHERE expires_at </.test(s.sql))
    expect(del).toBeTruthy()
    const cutoff = new Date(del.args[0]).getTime()
    const expected = Date.now() - 24 * 60 * 60 * 1000
    // within a minute of "now minus 24h"
    expect(Math.abs(cutoff - expected)).toBeLessThan(60 * 1000)
  })

  it('#14 — returns 429 and sends nothing when the address already has too many fresh links', async () => {
    const db = makeDB({ recentCount: 5 })
    const res = await onRequestPost(ctx(db, 'player@example.com'))

    expect(res.status).toBe(429)
    expect(db.statements.some(s => /INSERT INTO magic_tokens/.test(s.sql))).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('#14 — allows the request when the address is just under the limit', async () => {
    const db = makeDB({ recentCount: 4 })
    const res = await onRequestPost(ctx(db, 'player@example.com'))
    expect(res.status).toBe(200)
  })
})
