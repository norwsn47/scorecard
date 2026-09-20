import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { onRequestPost } from './request-link.js'
import { magicLinkEmailHtml } from '../../_lib/email.js'

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

// ── Parity: the exact observable output of the endpoint ─────────────────────
// Pinned before the magic-link helper was extracted (functions/_lib/
// magic-link.js). Every string here is the literal the endpoint has always
// produced, so any drift in the shared helper shows up as a failure.
describe('POST /api/auth/request-link - exact output (parity)', () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

  it('inserts the token row with the exact SQL and bind args (15-minute expiry, used = 0)', async () => {
    const db = makeDB()
    const before = Date.now()
    await run(db, 'Player@Example.com')
    const after = Date.now()

    const insert = db.statements.find(s => /INSERT INTO magic_tokens/.test(s.sql))
    expect(insert.sql).toBe('INSERT INTO magic_tokens (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)')
    expect(insert.args).toHaveLength(4)
    const [id, email, token, expiresAt] = insert.args
    expect(id).toMatch(UUID)
    expect(token).toMatch(UUID)
    expect(id).not.toBe(token)
    expect(email).toBe('player@example.com')
    const expiry = new Date(expiresAt).getTime()
    expect(expiry).toBeGreaterThanOrEqual(before + 15 * 60 * 1000)
    expect(expiry).toBeLessThanOrEqual(after + 15 * 60 * 1000)
    expect(expiresAt).toBe(new Date(expiry).toISOString())
  })

  it('counts fresh links with the exact SQL', async () => {
    const db = makeDB()
    await run(db, 'player@example.com')
    const countStmt = db.statements.find(s => /SELECT COUNT\(\*\)/.test(s.sql))
    expect(countStmt.sql).toBe(
      'SELECT COUNT(*) AS count FROM magic_tokens WHERE email = ? AND used = 0 AND expires_at > ?'
    )
  })

  it('sends the exact Resend payload: subject, html and text', async () => {
    const db = makeDB()
    await run(db, 'Player@Example.com')

    const token = db.statements.find(s => /INSERT INTO magic_tokens/.test(s.sql)).args[2]
    const link = `https://app.test/api/auth/verify?token=${token}`

    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer test-key')
    expect(JSON.parse(init.body)).toEqual({
      from: 'Scorecard <hi@test>',
      to: 'player@example.com',
      subject: 'Sign in to Scorecard by Outbuild',
      html: magicLinkEmailHtml({
        heading: 'Sign in to your account',
        intro: 'Click the button below to sign in. This link expires in 15 minutes.',
        ctaLabel: 'Sign in to Scorecard',
        link,
      }),
      text: `Sign in to Scorecard by Outbuild:\n${link}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    })
  })

  it('429 body and message are exact when the address is at the cap', async () => {
    const db = makeDB({ recentCount: 5 })
    const res = await run(db, 'player@example.com')
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({
      error: 'Too many sign-in requests. Check your inbox, or wait a few minutes and try again.',
    })
  })

  it('429 also applies above the cap (6)', async () => {
    const res = await run(makeDB({ recentCount: 6 }), 'player@example.com')
    expect(res.status).toBe(429)
  })

  it('500 with the exact message when Resend fails, after the token is stored', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({}) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const db = makeDB()
    const res = await run(db, 'player@example.com')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to send email - please try again' })
    expect(db.statements.some(s => /INSERT INTO magic_tokens/.test(s.sql))).toBe(true)
  })

  it('200 body is { ok: true }', async () => {
    const res = await run(makeDB(), 'player@example.com')
    expect(await res.json()).toEqual({ ok: true })
  })

  it('400 Invalid email address for a malformed address', async () => {
    const res = await run(makeDB(), 'nope')
    expect(await res.json()).toEqual({ error: 'Invalid email address' })
  })
})

// ── Bad request bodies -> a clean 400, never a 500 ─────────────────────────
describe('POST /api/auth/request-link - malformed bodies', () => {
  function rawCtx(db, rawBody) {
    return {
      waited: [],
      env: { ...env, DB: db },
      waitUntil() {},
      request: new Request('https://app.test/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
      }),
    }
  }

  it.each([
    ['null', 'null'],
    ['an array', '[]'],
    ['a string', '"str"'],
    ['a number', '42'],
    ['true', 'true'],
    ['unparseable JSON', 'not json'],
    ['an empty body', ''],
  ])('%s -> 400 Invalid request body, DB and Resend untouched', async (_label, raw) => {
    const db = makeDB()
    const res = await onRequestPost(rawCtx(db, raw))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid request body' })
    expect(db.statements).toHaveLength(0)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it.each([
    [123, 'a number'],
    [true, 'true'],
    [false, 'false'],
    [['a@b.co'], 'an array'],
    [{ address: 'a@b.co' }, 'an object'],
  ])('a non-string email (%j, %s) -> 400 Invalid email address, not a 500', async (value) => {
    const db = makeDB()
    const res = await onRequestPost(rawCtx(db, JSON.stringify({ email: value })))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid email address' })
    expect(db.statements).toHaveLength(0)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('a missing or null email -> 400 Invalid email address', async () => {
    for (const body of [{}, { email: null }, { email: '' }, { email: '   ' }]) {
      const res = await onRequestPost(rawCtx(makeDB(), JSON.stringify(body)))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid email address' })
    }
  })

  it('rejects addresses the tightened format check refuses', async () => {
    for (const email of ['a,b@example.com', 'a b@example.com', '<a@example.com>', 'a@@example.com', '.a@example.com']) {
      const res = await onRequestPost(rawCtx(makeDB(), JSON.stringify({ email })))
      expect(res.status).toBe(400)
    }
  })
})
