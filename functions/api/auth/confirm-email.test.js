import { describe, it, expect, beforeEach } from 'vitest'
import { onRequestGet } from './confirm-email.js'

// Stateful fake D1 for the confirm-email flow.
function makeDB({ users = [], magicTokens = [], commitError = null } = {}) {
  const db = { users, magicTokens, batchCalls: 0 }

  function statement(sql, args) {
    const s = sql.replace(/\s+/g, ' ').trim()
    return {
      async first() {
        if (/^SELECT id, email FROM magic_tokens WHERE token = \? AND used = 0 AND expires_at > \?$/.test(s)) {
          const t = magicTokens.find(x => x.token === args[0] && x.used === 0 && x.expires_at > args[1])
          return t ? { id: t.id, email: t.email } : null
        }
        if (/^SELECT id FROM users WHERE pending_email = \?$/.test(s)) {
          const u = users.find(x => x.pending_email === args[0])
          return u ? { id: u.id } : null
        }
        if (/^SELECT id FROM users WHERE email = \?$/.test(s)) {
          const u = users.find(x => x.email === args[0])
          return u ? { id: u.id } : null
        }
        return null
      },
      async run() {
        if (/^UPDATE users SET email = \?, pending_email = NULL WHERE id = \?$/.test(s)) {
          // Simulate the commit losing the users.email UNIQUE race: the batch is
          // atomic, so throw before mutating anything.
          if (commitError) throw new Error(commitError)
          const u = users.find(x => x.id === args[1])
          if (u) { u.email = args[0]; u.pending_email = null }
          return { success: true }
        }
        if (/^UPDATE magic_tokens SET used = 1 WHERE id = \?$/.test(s)) {
          const t = magicTokens.find(x => x.id === args[0])
          if (t) t.used = 1
          return { success: true }
        }
        return { success: true }
      },
    }
  }

  db.prepare = (sql) => ({ bind: (...args) => statement(sql, args) })
  db.batch = async (stmts) => {
    db.batchCalls += 1
    for (const st of stmts) await st.run()
    return []
  }
  return db
}

const FUTURE = new Date(Date.now() + 10 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 60 * 1000).toISOString()

function ctx(db, token) {
  const qs = token === undefined ? '' : `?token=${token}`
  return {
    env: { DB: db, APP_URL: 'https://app.test' },
    request: new Request(`https://app.test/api/auth/confirm-email${qs}`),
  }
}

let db
beforeEach(() => {
  db = null
})

describe('GET /api/auth/confirm-email', () => {
  it('applies the change atomically and redirects ?email=changed', async () => {
    db = makeDB({
      users: [{ id: 'u1', email: 'old@example.com', pending_email: 'new@example.com' }],
      magicTokens: [{ id: 't1', email: 'new@example.com', token: 'good', expires_at: FUTURE, used: 0 }],
    })
    const res = await onRequestGet(ctx(db, 'good'))

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://app.test/?email=changed')
    expect(db.users[0].email).toBe('new@example.com')
    expect(db.users[0].pending_email).toBeNull()
    expect(db.magicTokens[0].used).toBe(1)
    expect(db.batchCalls).toBe(1)
  })

  it('redirects ?email=expired with no token', async () => {
    db = makeDB()
    const res = await onRequestGet(ctx(db))
    expect(res.headers.get('Location')).toBe('https://app.test/?email=expired')
  })

  it('redirects ?email=expired for an unknown token', async () => {
    db = makeDB({ users: [{ id: 'u1', email: 'old@example.com', pending_email: 'new@example.com' }] })
    const res = await onRequestGet(ctx(db, 'nope'))
    expect(res.headers.get('Location')).toBe('https://app.test/?email=expired')
  })

  it('redirects ?email=expired for an expired token', async () => {
    db = makeDB({
      users: [{ id: 'u1', email: 'old@example.com', pending_email: 'new@example.com' }],
      magicTokens: [{ id: 't1', email: 'new@example.com', token: 'stale', expires_at: PAST, used: 0 }],
    })
    const res = await onRequestGet(ctx(db, 'stale'))
    expect(res.headers.get('Location')).toBe('https://app.test/?email=expired')
    expect(db.users[0].email).toBe('old@example.com')
  })

  it('redirects ?email=expired for an already-used token', async () => {
    db = makeDB({
      users: [{ id: 'u1', email: 'old@example.com', pending_email: 'new@example.com' }],
      magicTokens: [{ id: 't1', email: 'new@example.com', token: 'used', expires_at: FUTURE, used: 1 }],
    })
    const res = await onRequestGet(ctx(db, 'used'))
    expect(res.headers.get('Location')).toBe('https://app.test/?email=expired')
  })

  it('redirects ?email=expired when the request was superseded (no pending_email match)', async () => {
    db = makeDB({
      // pending_email has since been overwritten with a newer address
      users: [{ id: 'u1', email: 'old@example.com', pending_email: 'newer@example.com' }],
      magicTokens: [{ id: 't1', email: 'new@example.com', token: 'good', expires_at: FUTURE, used: 0 }],
    })
    const res = await onRequestGet(ctx(db, 'good'))
    expect(res.headers.get('Location')).toBe('https://app.test/?email=expired')
    expect(db.users[0].email).toBe('old@example.com')
  })

  it('redirects ?email=taken when the address was registered in the meantime (pre-check)', async () => {
    db = makeDB({
      users: [
        { id: 'u1', email: 'old@example.com', pending_email: 'new@example.com' },
        { id: 'u2', email: 'new@example.com', pending_email: null },
      ],
      magicTokens: [{ id: 't1', email: 'new@example.com', token: 'good', expires_at: FUTURE, used: 0 }],
    })
    const res = await onRequestGet(ctx(db, 'good'))
    expect(res.headers.get('Location')).toBe('https://app.test/?email=taken')
    expect(db.users[0].email).toBe('old@example.com')
    expect(db.users[0].pending_email).toBe('new@example.com')
    expect(db.magicTokens[0].used).toBe(0)
  })

  it('redirects ?email=taken when the swap loses the users.email UNIQUE race, with no partial mutation', async () => {
    // Two accounts staged the same pending address (fix 2 makes this hard, not
    // impossible under a race). The first confirmation commits elsewhere; this
    // one clears the pre-check but its DB.batch hits the UNIQUE constraint.
    db = makeDB({
      users: [{ id: 'u2', email: 'old2@example.com', pending_email: 'contested@example.com' }],
      magicTokens: [{ id: 't2', email: 'contested@example.com', token: 'loser', expires_at: FUTURE, used: 0 }],
      commitError: 'D1_ERROR: UNIQUE constraint failed: users.email: SQLITE_CONSTRAINT',
    })
    const res = await onRequestGet(ctx(db, 'loser'))
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://app.test/?email=taken')
    // nothing partially applied
    expect(db.users[0].email).toBe('old2@example.com')
    expect(db.users[0].pending_email).toBe('contested@example.com')
    expect(db.magicTokens[0].used).toBe(0)
  })

  it('rethrows a non-uniqueness batch error (falls through to the platform 500)', async () => {
    db = makeDB({
      users: [{ id: 'u1', email: 'old@example.com', pending_email: 'new@example.com' }],
      magicTokens: [{ id: 't1', email: 'new@example.com', token: 'good', expires_at: FUTURE, used: 0 }],
      commitError: 'D1_ERROR: database is locked',
    })
    await expect(onRequestGet(ctx(db, 'good'))).rejects.toThrow(/database is locked/)
  })
})
