import { describe, it, expect } from 'vitest'
import { getSessionUser } from './session.js'

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
