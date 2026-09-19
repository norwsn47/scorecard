import { describe, it, expect } from 'vitest'
import { onRequestPost } from './logout.js'

// Fake D1 that records every prepared statement and its bound arguments, so the
// tests can assert whether (and with what) the session row was deleted.
function makeDB() {
  const calls = []
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          return { async run() { calls.push({ sql, args }); return {} } }
        },
      }
    },
  }
}

function ctx(db, cookie) {
  return {
    env: { DB: db },
    request: new Request('https://app.test/api/auth/logout', {
      method: 'POST',
      headers: cookie ? { Cookie: cookie } : {},
    }),
  }
}

describe('POST /api/auth/logout', () => {
  it('deletes the session row named by the cookie', async () => {
    const db = makeDB()
    const res = await onRequestPost(ctx(db, 'session=sess-1'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(db.calls).toHaveLength(1)
    expect(db.calls[0].sql).toMatch(/DELETE FROM sessions WHERE id = \?/)
    expect(db.calls[0].args).toEqual(['sess-1'])
  })

  it('finds the session cookie among several cookies', async () => {
    const db = makeDB()
    await onRequestPost(ctx(db, 'theme=dark; session=sess-2; other=1'))

    expect(db.calls[0].args).toEqual(['sess-2'])
  })

  it('still succeeds, without touching the database, when there is no session cookie', async () => {
    const db = makeDB()
    const res = await onRequestPost(ctx(db))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(db.calls).toHaveLength(0)
  })

  it('always clears the cookie: empty value, Max-Age=0, HttpOnly, Secure, SameSite=Lax, Path=/', async () => {
    const withCookie = await onRequestPost(ctx(makeDB(), 'session=sess-1'))
    const without = await onRequestPost(ctx(makeDB()))

    for (const res of [withCookie, without]) {
      const setCookie = res.headers.get('Set-Cookie')
      expect(setCookie).toMatch(/^session=;/)
      expect(setCookie).toContain('Max-Age=0')
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('Secure')
      expect(setCookie).toContain('SameSite=Lax')
      expect(setCookie).toContain('Path=/')
    }
  })
})
