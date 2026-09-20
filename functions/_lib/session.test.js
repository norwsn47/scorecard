import { describe, it, expect } from 'vitest'
import { getSessionUser, getSessionCookie, buildSessionCookie, CLEAR_SESSION_COOKIE } from './session.js'

// Fake D1 for the single session/user JOIN. `row` is what `.first()` returns
// (null = no valid, unexpired session); the SQL and bound args are captured.
function makeDB(row) {
  const seen = { calls: 0, sql: null, args: null }
  return {
    seen,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              seen.calls += 1
              seen.sql = sql
              seen.args = args
              return row
            },
          }
        },
      }
    },
  }
}

function req(cookie) {
  return new Request('https://app.test/api/x', { headers: cookie ? { Cookie: cookie } : {} })
}

describe('getSessionUser', () => {
  it('returns null without querying when there is no session cookie', async () => {
    const db = makeDB({ user_id: 'u1', email: 'a@b.co' })
    expect(await getSessionUser(req(), db)).toBeNull()
    expect(await getSessionUser(req('theme=dark'), db)).toBeNull()
    expect(db.seen.calls).toBe(0)
  })

  it('returns null when the session is unknown or expired (no row)', async () => {
    const db = makeDB(null)
    expect(await getSessionUser(req('session=gone'), db)).toBeNull()
    expect(db.seen.calls).toBe(1)
  })

  it('returns { id, email } for a valid session', async () => {
    const db = makeDB({ user_id: 'u1', email: 'a@b.co' })
    expect(await getSessionUser(req('session=sess-1'), db)).toEqual({ id: 'u1', email: 'a@b.co' })
  })

  it('binds the session id and the current time, and only accepts unexpired sessions', async () => {
    const db = makeDB({ user_id: 'u1', email: 'a@b.co' })
    const before = new Date().toISOString()
    await getSessionUser(req('theme=dark; session=sess-9'), db)
    const after = new Date().toISOString()

    const [sessionId, now] = db.seen.args
    expect(sessionId).toBe('sess-9')
    expect(now >= before && now <= after).toBe(true)
    expect(db.seen.sql).toMatch(/expires_at\s*>\s*\?/)
  })
})

describe('session cookie helpers', () => {
  it('buildSessionCookie is byte-for-byte the sign-in Set-Cookie value (30 days)', () => {
    expect(buildSessionCookie('abc-123')).toBe(
      'session=abc-123; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000; Path=/'
    )
  })

  it('CLEAR_SESSION_COOKIE is byte-for-byte the logout / account-delete Set-Cookie value', () => {
    expect(CLEAR_SESSION_COOKIE).toBe('session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/')
  })

  it('getSessionCookie reads the session id, alone or among other cookies', () => {
    expect(getSessionCookie(req('session=sess-1'))).toBe('sess-1')
    expect(getSessionCookie(req('theme=dark; session=sess-2; other=1'))).toBe('sess-2')
    expect(getSessionCookie(req('session=sess-3; theme=dark'))).toBe('sess-3')
  })

  it('getSessionCookie returns null with no cookie, another cookie, or an empty value', () => {
    expect(getSessionCookie(req())).toBeNull()
    expect(getSessionCookie(req('theme=dark'))).toBeNull()
    expect(getSessionCookie(req('session='))).toBeNull()
  })

  it('getSessionCookie does not match a cookie that merely ends in "session"', () => {
    expect(getSessionCookie(req('mysession=nope'))).toBeNull()
    expect(getSessionCookie(req('x_session=nope; session=yes'))).toBe('yes')
  })
})
