import { describe, it, expect, vi, afterEach } from 'vitest'
import { onRequestGet } from './verify.js'
import { defaultHoleParsJson } from '../../_lib/hole-pars.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Stateful fake D1 for verify.js. Holds one magic token and evaluates the two
// statements that matter for the single-use guarantee:
//   - the SELECT finds the token only while it is unused and unexpired
//   - the UPDATE flips used 0 -> 1 only when `used = 0 AND expires_at > ?`
//     still holds, and reports meta.changes (1 or 0) like D1 does
// `claimChanges` forces the UPDATE's reported change count, to simulate a
// concurrent click that won the claim after this request's SELECT.
// Every INSERT is recorded as { table, cols, values }; every statement is
// logged in order in `statements`.
function makeDB({
  token,
  existingUser = null,
  tokenRow = { id: 'tok1', email: 'new@example.com', used: 0, expires_at: '2999-01-01T00:00:00.000Z' },
  claimChanges,
  failSessionCleanup = false,
}) {
  const inserts = []
  const statements = []
  const row = { ...tokenRow }
  return {
    inserts,
    statements,
    token: row,
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...args) { this.args = args; return this },
        async first() {
          statements.push({ sql: this.sql, args: this.args })
          if (/FROM magic_tokens/.test(this.sql)) {
            const live = row.used === 0 && row.expires_at > this.args[1]
            return this.args[0] === token && live
              ? { id: row.id, email: row.email }
              : null
          }
          if (/FROM users WHERE email/.test(this.sql)) return existingUser
          return null
        },
        async run() {
          statements.push({ sql: this.sql, args: this.args })

          if (/^UPDATE magic_tokens SET used = 1/.test(this.sql)) {
            const [id, now] = this.args
            const claimable = id === row.id && row.used === 0 && row.expires_at > now
            if (claimable) row.used = 1
            const changes = claimChanges ?? (claimable ? 1 : 0)
            return { success: true, meta: { changes } }
          }

          if (/^DELETE FROM sessions/.test(this.sql)) {
            if (failSessionCleanup) throw new Error('locked')
            return { success: true, meta: { changes: 0 } }
          }

          const m = this.sql.match(/INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/)
          if (m) {
            const cols = m[2].split(',').map(s => s.trim())
            expect(m[3].split(',').length).toBe(cols.length) // placeholder count
            expect(this.args.length).toBe(cols.length)       // bind count
            inserts.push({ table: m[1], cols, values: this.args })
          }
          return { success: true, meta: { changes: 1 } }
        },
      }
    },
  }
}

function makeCtx(db, url = 'https://app.test/api/auth/verify?token=good') {
  const waited = []
  return {
    waited,
    env: { DB: db, APP_URL: 'https://app.test' },
    waitUntil: p => waited.push(p),
    request: new Request(url),
  }
}

const ctx = (db) => makeCtx(db)

async function run(db, url) {
  const c = makeCtx(db, url)
  const res = await onRequestGet(c)
  await Promise.all(c.waited)
  return res
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/auth/verify — new-user seed', () => {
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

describe('GET /api/auth/verify — happy path', () => {
  it('claims the token, creates the user and a 30-day session, sets the cookie and redirects home', async () => {
    const db = makeDB({ token: 'good' })
    const before = Date.now()
    const res = await run(db)
    const after = Date.now()

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://app.test')

    expect(db.token.used).toBe(1)
    expect(db.inserts.find(i => i.table === 'users').values[1]).toBe('new@example.com')

    const session = db.inserts.find(i => i.table === 'sessions')
    const [sessionId, userId, , expiresAt] = session.values
    expect(sessionId).toMatch(UUID)
    expect(userId).toBe(db.inserts.find(i => i.table === 'users').values[0])
    const expiry = new Date(expiresAt).getTime()
    expect(expiry).toBeGreaterThanOrEqual(before + 2592000 * 1000)
    expect(expiry).toBeLessThanOrEqual(after + 2592000 * 1000)

    // byte-for-byte cookie, carrying the id of the session that was stored
    expect(res.headers.get('Set-Cookie')).toBe(
      `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000; Path=/`
    )
  })

  it('reuses an existing user instead of creating one', async () => {
    const db = makeDB({ token: 'good', existingUser: { id: 'u1', email: 'new@example.com' } })
    const res = await run(db)
    expect(res.status).toBe(302)
    expect(db.inserts.find(i => i.table === 'users')).toBeUndefined()
    expect(db.inserts.find(i => i.table === 'sessions').values[1]).toBe('u1')
  })

  it('redirects to ?auth=error without touching the DB when there is no token', async () => {
    const db = makeDB({ token: 'good' })
    const res = await run(db, 'https://app.test/api/auth/verify')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://app.test/?auth=error')
    expect(db.statements).toHaveLength(0)
  })

  it('redirects to ?auth=expired for an unknown token, creating nothing', async () => {
    const db = makeDB({ token: 'good' })
    const res = await run(db, 'https://app.test/api/auth/verify?token=wrong')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://app.test/?auth=expired')
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(db.inserts).toHaveLength(0)
  })
})

describe('GET /api/auth/verify — single use (atomic claim)', () => {
  it('claims the token with a conditional UPDATE: used = 0 AND expires_at > now', async () => {
    const db = makeDB({ token: 'good' })
    await run(db)

    const update = db.statements.find(s => /^UPDATE magic_tokens/.test(s.sql))
    expect(update.sql).toBe('UPDATE magic_tokens SET used = 1 WHERE id = ? AND used = 0 AND expires_at > ?')
    expect(update.args[0]).toBe('tok1')
    expect(Math.abs(new Date(update.args[1]).getTime() - Date.now())).toBeLessThan(60 * 1000)
  })

  it('a second use of the same link redirects to ?auth=expired and creates nothing', async () => {
    const db = makeDB({ token: 'good' })
    const first = await run(db)
    expect(first.headers.get('Location')).toBe('https://app.test')
    const insertsAfterFirst = db.inserts.length

    const second = await run(db)
    expect(second.status).toBe(302)
    expect(second.headers.get('Location')).toBe('https://app.test/?auth=expired')
    expect(second.headers.get('Set-Cookie')).toBeNull()
    expect(db.inserts).toHaveLength(insertsAfterFirst) // no extra user / course / session
  })

  it('a concurrent click that wins the claim after our SELECT (UPDATE reports changes: 0) creates no user or session', async () => {
    const db = makeDB({ token: 'good', claimChanges: 0 })
    const res = await run(db)

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://app.test/?auth=expired')
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(db.inserts).toHaveLength(0)
    // no further work after the failed claim: no user lookup, no session cleanup
    const claimIdx = db.statements.findIndex(s => /^UPDATE magic_tokens/.test(s.sql))
    expect(db.statements.slice(claimIdx + 1)).toHaveLength(0)
  })

  it('fails closed when the driver reports no change count at all', async () => {
    const db = makeDB({ token: 'good' })
    const realPrepare = db.prepare.bind(db)
    db.prepare = (sql) => {
      const stmt = realPrepare(sql)
      if (/^UPDATE magic_tokens/.test(sql)) {
        const realRun = stmt.run.bind(stmt)
        stmt.run = async () => { await realRun(); return { success: true } } // no meta
      }
      return stmt
    }
    const res = await run(db)
    expect(res.headers.get('Location')).toBe('https://app.test/?auth=expired')
    expect(db.inserts).toHaveLength(0)
  })

  it('two simultaneous clicks on the same link: exactly one signs in, one session is created', async () => {
    const db = makeDB({ token: 'good' })
    const a = makeCtx(db)
    const b = makeCtx(db)

    const [resA, resB] = await Promise.all([onRequestGet(a), onRequestGet(b)])
    await Promise.all([...a.waited, ...b.waited])

    const results = [resA, resB]
    const signedIn = results.filter(r => r.headers.get('Location') === 'https://app.test')
    const refused = results.filter(r => r.headers.get('Location') === 'https://app.test/?auth=expired')
    expect(signedIn).toHaveLength(1)
    expect(refused).toHaveLength(1)
    expect(refused[0].headers.get('Set-Cookie')).toBeNull()
    expect(db.inserts.filter(i => i.table === 'sessions')).toHaveLength(1)
    expect(db.inserts.filter(i => i.table === 'users')).toHaveLength(1)
  })

  it('an expired token redirects to ?auth=expired and creates nothing', async () => {
    const db = makeDB({
      token: 'good',
      tokenRow: { id: 'tok1', email: 'new@example.com', used: 0, expires_at: '2000-01-01T00:00:00.000Z' },
    })
    const res = await run(db)
    expect(res.headers.get('Location')).toBe('https://app.test/?auth=expired')
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(db.inserts).toHaveLength(0)
    expect(db.token.used).toBe(0)
  })
})

describe('GET /api/auth/verify — expired-session cleanup', () => {
  it('prunes sessions whose expiry has passed, via waitUntil, after the new session is created', async () => {
    const db = makeDB({ token: 'good' })
    const c = makeCtx(db)
    const before = Date.now()
    const res = await onRequestGet(c)
    await Promise.all(c.waited)

    expect(res.status).toBe(302)
    expect(c.waited).toHaveLength(1)

    const del = db.statements.find(s => /^DELETE FROM sessions/.test(s.sql))
    expect(del.sql).toBe('DELETE FROM sessions WHERE expires_at < ?')
    expect(del.args).toHaveLength(1)
    expect(Math.abs(new Date(del.args[0]).getTime() - before)).toBeLessThan(60 * 1000)

    // issued after the login session was inserted, so it can never race it
    const insertIdx = db.statements.findIndex(s => /^INSERT INTO sessions/.test(s.sql))
    const delIdx = db.statements.indexOf(del)
    expect(insertIdx).toBeGreaterThan(-1)
    expect(delIdx).toBeGreaterThan(insertIdx)
  })

  it('a failing cleanup does not break sign-in and is logged', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const db = makeDB({ token: 'good', failSessionCleanup: true })
    const c = makeCtx(db)

    const res = await onRequestGet(c)
    await Promise.all(c.waited) // must not reject

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://app.test')
    expect(res.headers.get('Set-Cookie')).toMatch(/^session=[0-9a-f-]{36}; HttpOnly; Secure;/)
    expect(errSpy).toHaveBeenCalledWith('sessions cleanup failed', expect.any(Error))
  })

  it('does not schedule any cleanup when sign-in is refused', async () => {
    const db = makeDB({ token: 'good', claimChanges: 0 })
    const c = makeCtx(db)
    await onRequestGet(c)
    expect(c.waited).toHaveLength(0)
    expect(db.statements.some(s => /DELETE FROM sessions/.test(s.sql))).toBe(false)
  })
})
