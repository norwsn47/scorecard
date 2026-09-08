import { describe, it, expect } from 'vitest'
import { onRequestGet } from './me.js'

// Fake D1: answers the single JOIN query me.js makes. `row` is what that query
// returns (null = no valid session). Captures the SQL so the test can assert
// the profile columns were actually selected.
function makeDB(row) {
  const seen = { sql: null, args: null }
  return {
    seen,
    prepare(sql) {
      return {
        args: [],
        bind(...args) { this.args = args; return this },
        async first() {
          seen.sql = sql
          seen.args = this.args
          return row
        },
      }
    },
  }
}

function ctx(db, { cookie } = {}) {
  return {
    env: { DB: db },
    request: new Request('https://app.test/api/auth/me', {
      headers: cookie ? { Cookie: cookie } : {},
    }),
  }
}

describe('GET /api/auth/me', () => {
  it('returns name and pending_email when both are set', async () => {
    const db = makeDB({
      user_id: 'u1',
      email: 'player@example.com',
      name: 'Fiona',
      pending_email: 'new@example.com',
    })
    const res = await onRequestGet(ctx(db, { cookie: 'session=sess-1' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      user: {
        id: 'u1',
        email: 'player@example.com',
        name: 'Fiona',
        pending_email: 'new@example.com',
      },
    })
    // the inline query selects the two new columns (it must not use session.js)
    expect(db.seen.sql).toMatch(/users\.name/)
    expect(db.seen.sql).toMatch(/users\.pending_email/)
  })

  it('returns name: null for a user who has not set one', async () => {
    const db = makeDB({
      user_id: 'u1',
      email: 'player@example.com',
      name: null,
      pending_email: null,
    })
    const res = await onRequestGet(ctx(db, { cookie: 'session=sess-1' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.name).toBeNull()
    expect(body.user.pending_email).toBeNull()
  })

  it('returns pending_email when an email change is awaiting confirmation', async () => {
    const db = makeDB({
      user_id: 'u1',
      email: 'old@example.com',
      name: 'Fiona',
      pending_email: 'pending@example.com',
    })
    const res = await onRequestGet(ctx(db, { cookie: 'session=sess-1' }))

    const body = await res.json()
    expect(body.user.pending_email).toBe('pending@example.com')
    expect(body.user.email).toBe('old@example.com')
  })

  it('returns 401 with no session cookie (unchanged)', async () => {
    const db = makeDB(null)
    const res = await onRequestGet(ctx(db))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ user: null })
  })

  it('returns 401 when the session is invalid or expired (unchanged)', async () => {
    const db = makeDB(null)
    const res = await onRequestGet(ctx(db, { cookie: 'session=stale' }))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ user: null })
  })
})
