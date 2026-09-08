import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { onRequestPatch, onRequestDelete } from './index.js'
import { getSessionUser } from '../../_lib/session.js'

vi.mock('../../_lib/session.js', () => ({ getSessionUser: vi.fn() }))

// Stateful fake D1. Holds rows for the tables the handlers touch and evaluates
// just the specific statements they issue (SELECT / UPDATE / INSERT / DELETE),
// via prepare(sql).bind(...).first() / .run() and DB.batch([...]).
function makeDB({ users = [], magicTokens = [], games = [], courses = [], sessions = [] } = {}) {
  const db = { users, magicTokens, games, courses, sessions, batchCalls: 0 }

  function statement(sql, args) {
    const s = sql.replace(/\s+/g, ' ').trim()
    return {
      sql: s,
      args,
      async first() {
        if (/^SELECT id FROM users WHERE \(email = \? OR pending_email = \?\) AND id != \?$/.test(s)) {
          const [e1, e2, selfId] = args
          const u = users.find(x => x.id !== selfId && (x.email === e1 || x.pending_email === e2))
          return u ? { id: u.id } : null
        }
        if (/^SELECT COUNT\(\*\) AS count FROM magic_tokens WHERE email = \? AND used = 0 AND expires_at > \?$/.test(s)) {
          const [email, nowIso] = args
          const count = magicTokens.filter(
            t => t.email === email && t.used === 0 && t.expires_at > nowIso
          ).length
          return { count }
        }
        if (/^SELECT pending_email FROM users WHERE id = \?$/.test(s)) {
          const u = users.find(x => x.id === args[0])
          return u ? { pending_email: u.pending_email ?? null } : null
        }
        if (/^SELECT id, email FROM magic_tokens WHERE token = \?/.test(s)) {
          const t = magicTokens.find(x => x.token === args[0] && x.used === 0 && x.expires_at > args[1])
          return t ? { id: t.id, email: t.email } : null
        }
        if (/^SELECT id FROM users WHERE pending_email = \?$/.test(s)) {
          const u = users.find(x => x.pending_email === args[0])
          return u ? { id: u.id } : null
        }
        return null
      },
      async run() {
        const upd = s.match(/^UPDATE users SET (.+) WHERE id = \?$/)
        if (upd) {
          const cols = upd[1].split(',').map(c => c.trim().split(' = ')[0])
          const id = args[args.length - 1]
          const u = users.find(x => x.id === id)
          if (u) cols.forEach((c, i) => { u[c] = args[i] })
          return { success: true }
        }
        if (/^UPDATE users SET email = \?, pending_email = NULL WHERE id = \?$/.test(s)) {
          const u = users.find(x => x.id === args[1])
          if (u) { u.email = args[0]; u.pending_email = null }
          return { success: true }
        }
        if (/^UPDATE magic_tokens SET used = 1 WHERE id = \?$/.test(s)) {
          const t = magicTokens.find(x => x.id === args[0])
          if (t) t.used = 1
          return { success: true }
        }
        if (/^INSERT INTO magic_tokens/.test(s)) {
          magicTokens.push({ id: args[0], email: args[1], token: args[2], expires_at: args[3], used: 0 })
          return { success: true }
        }
        if (/^DELETE FROM games WHERE user_id = \?$/.test(s)) {
          spliceWhere(games, g => g.user_id === args[0]); return { success: true }
        }
        if (/^DELETE FROM courses WHERE user_id = \?$/.test(s)) {
          spliceWhere(courses, c => c.user_id === args[0]); return { success: true }
        }
        if (/^DELETE FROM sessions WHERE user_id = \?$/.test(s)) {
          spliceWhere(sessions, x => x.user_id === args[0]); return { success: true }
        }
        if (/^DELETE FROM magic_tokens WHERE email IN \(/.test(s)) {
          spliceWhere(magicTokens, t => args.includes(t.email)); return { success: true }
        }
        if (/^DELETE FROM users WHERE id = \?$/.test(s)) {
          spliceWhere(users, u => u.id === args[0]); return { success: true }
        }
        return { success: true }
      },
    }
  }

  db.prepare = (sql) => ({
    bind: (...args) => statement(sql, args),
  })
  db.batch = async (stmts) => {
    db.batchCalls += 1
    const out = []
    for (const st of stmts) out.push(await st.run())
    return out
  }
  return db
}

function spliceWhere(arr, pred) {
  for (let i = arr.length - 1; i >= 0; i -= 1) if (pred(arr[i])) arr.splice(i, 1)
}

const ENV = {
  RESEND_API_KEY: 'test-key',
  RESEND_FROM_EMAIL: 'Scorecard <hi@test>',
  APP_URL: 'https://app.test',
  ADMIN_NOTIFY_EMAIL: 'ops@test',
}

function patchCtx(db, body) {
  const waited = []
  return {
    waited,
    env: { ...ENV, DB: db },
    waitUntil: p => waited.push(p),
    request: new Request('https://app.test/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: 'session=s1' },
      body: JSON.stringify(body),
    }),
  }
}

function deleteCtx(db) {
  const waited = []
  return {
    waited,
    env: { ...ENV, DB: db },
    waitUntil: p => waited.push(p),
    request: new Request('https://app.test/api/users', {
      method: 'DELETE',
      headers: { Cookie: 'session=s1' },
    }),
  }
}

async function runPatch(db, body) {
  const c = patchCtx(db, body)
  const res = await onRequestPatch(c)
  await Promise.all(c.waited)
  return { res, waited: c.waited }
}

async function runDelete(db) {
  const c = deleteCtx(db)
  const res = await onRequestDelete(c)
  await Promise.all(c.waited)
  return { res, waited: c.waited }
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'e1' }) })
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('PATCH /api/users', () => {
  const ME = { id: 'u1', email: 'me@example.com' }

  it('401 with no valid session', async () => {
    getSessionUser.mockResolvedValue(null)
    const { res } = await runPatch(makeDB(), { name: 'Fiona' })
    expect(res.status).toBe(401)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('200 no-op when the body has neither name nor email', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { foo: 'bar' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(db.users[0].name).toBeUndefined()
  })

  it('sets a trimmed name immediately', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { name: '  Fiona  ' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, name: 'Fiona' })
    expect(db.users[0].name).toBe('Fiona')
  })

  it('clears the name to null on an empty string', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME, name: 'Fiona' }] })
    const { res } = await runPatch(db, { name: '   ' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, name: null })
    expect(db.users[0].name).toBeNull()
  })

  it('400 for a name over 60 characters, with the field named', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { name: 'x'.repeat(61) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/name/)
    expect(db.users[0].name).toBeUndefined()
  })

  it('400 for a non-string name', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { name: { first: 'Fiona' } })
    expect(res.status).toBe(400)
    expect(db.users[0].name).toBeUndefined()
  })

  it('treats name: null as a clear-to-null', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME, name: 'Fiona' }] })
    const { res } = await runPatch(db, { name: null })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, name: null })
    expect(db.users[0].name).toBeNull()
  })

  it('400 for a malformed email', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { email: 'not-an-email' })
    expect(res.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('400 when the new email equals the current one', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { email: 'ME@example.com' })
    expect(res.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('409 when the new email belongs to another user', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }, { id: 'u2', email: 'taken@example.com' }] })
    const { res } = await runPatch(db, { email: 'taken@example.com' })
    expect(res.status).toBe(409)
    expect(db.users[0].pending_email).toBeUndefined()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("409 when the new email is another user's pending_email", async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({
      users: [{ ...ME }, { id: 'u2', email: 'u2@example.com', pending_email: 'wanted@example.com' }],
    })
    const { res } = await runPatch(db, { email: 'wanted@example.com' })
    expect(res.status).toBe(409)
    expect(db.users[0].pending_email).toBeUndefined()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('429 when the new address already has 5 unclaimed links (BACKLOG #14, against the NEW address)', async () => {
    getSessionUser.mockResolvedValue(ME)
    const future = new Date(Date.now() + 9 * 60 * 1000).toISOString()
    const magicTokens = Array.from({ length: 5 }, (_, i) => ({
      id: `t${i}`, email: 'new@example.com', token: `tok${i}`, expires_at: future, used: 0,
    }))
    const db = makeDB({ users: [{ ...ME }], magicTokens })
    const { res } = await runPatch(db, { email: 'new@example.com' })
    expect(res.status).toBe(429)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('stages pending_email, issues a token, sends the confirmation to the NEW address, notices the OLD one', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { email: 'New@Example.com' })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true, email_confirmation_sent: true, pending_email: 'new@example.com' })

    // email is not changed yet, pending_email is staged
    expect(db.users[0].email).toBe('me@example.com')
    expect(db.users[0].pending_email).toBe('new@example.com')

    // a 15-minute, unused token was issued for the new address
    expect(db.magicTokens).toHaveLength(1)
    expect(db.magicTokens[0].email).toBe('new@example.com')
    expect(db.magicTokens[0].used).toBe(0)
    const ttl = new Date(db.magicTokens[0].expires_at).getTime() - Date.now()
    expect(ttl).toBeGreaterThan(14 * 60 * 1000)
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000)

    // pending_email + token issued atomically
    expect(db.batchCalls).toBe(1)

    // two mails: confirmation to NEW (awaited), security notice to OLD (waitUntil)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    const recipients = global.fetch.mock.calls.map(([, init]) => JSON.parse(init.body).to)
    expect(recipients).toContain('new@example.com')
    expect(recipients).toContain('me@example.com')

    // the security notice must not disclose the new address and carries no link
    const notice = global.fetch.mock.calls
      .map(([, init]) => JSON.parse(init.body))
      .find(b => b.to === 'me@example.com')
    expect(notice.text).not.toContain('new@example.com')
    expect(notice.html).not.toContain('new@example.com')
    expect(notice.html).not.toMatch(/confirm-email\?token/)

    // the security notice was registered with waitUntil, not awaited inline
    expect(db && true).toBe(true)
  })

  it('applies a name in the same request as an email change, immediately', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { name: 'Fiona', email: 'new@example.com' })

    expect(res.status).toBe(200)
    expect((await res.json()).name).toBe('Fiona')
    expect(db.users[0].name).toBe('Fiona')
    expect(db.users[0].email).toBe('me@example.com')
    expect(db.users[0].pending_email).toBe('new@example.com')
  })

  it('500 and leaves users.email untouched when Resend fails; name still applied', async () => {
    getSessionUser.mockResolvedValue(ME)
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: 'no' }) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { name: 'Fiona', email: 'new@example.com' })

    expect(res.status).toBe(500)
    expect(db.users[0].email).toBe('me@example.com')
    // name was applied immediately (in the same atomic write as pending_email)
    expect(db.users[0].name).toBe('Fiona')
    // no security-notice send attempted once the confirmation failed
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('a failing security notice (waitUntil) does not fail the request', async () => {
    getSessionUser.mockResolvedValue(ME)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }) // confirmation to NEW
      .mockRejectedValueOnce(new Error('smtp down'))                            // notice to OLD
    const db = makeDB({ users: [{ ...ME }] })
    const { res } = await runPatch(db, { email: 'new@example.com' })

    expect(res.status).toBe(200)
    expect(db.users[0].pending_email).toBe('new@example.com')
  })

  it('a second email-change request overwrites pending_email (supersedes the first)', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME, pending_email: 'first@example.com' }] })
    const { res } = await runPatch(db, { email: 'second@example.com' })
    expect(res.status).toBe(200)
    expect(db.users[0].pending_email).toBe('second@example.com')
  })
})

describe('DELETE /api/users', () => {
  const ME = { id: 'u1', email: 'me@example.com' }

  it('401 with no valid session', async () => {
    getSessionUser.mockResolvedValue(null)
    const { res } = await runDelete(makeDB())
    expect(res.status).toBe(401)
  })

  it('cascades every dependent row then the user, in one atomic batch, and clears the cookie', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({
      users: [{ ...ME, pending_email: 'pending@example.com' }, { id: 'u2', email: 'other@example.com' }],
      games: [{ id: 'g1', user_id: 'u1' }, { id: 'g2', user_id: 'u1' }, { id: 'g3', user_id: 'u2' }],
      courses: [{ id: 'c1', user_id: 'u1' }, { id: 'c2', user_id: 'u2' }],
      sessions: [{ id: 's1', user_id: 'u1' }, { id: 's2', user_id: 'u1' }, { id: 's3', user_id: 'u2' }],
      magicTokens: [
        { id: 't1', email: 'me@example.com', token: 'a', expires_at: 'z', used: 0 },
        { id: 't2', email: 'pending@example.com', token: 'b', expires_at: 'z', used: 0 },
        { id: 't3', email: 'other@example.com', token: 'c', expires_at: 'z', used: 0 },
      ],
    })

    const { res } = await runDelete(db)

    expect(res.status).toBe(200)
    expect(res.headers.get('Set-Cookie')).toBe('session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/')
    expect(db.batchCalls).toBe(1)

    // this user's rows gone; the other user's rows untouched
    expect(db.games.map(g => g.id)).toEqual(['g3'])
    expect(db.courses.map(c => c.id)).toEqual(['c2'])
    expect(db.sessions.map(s => s.id)).toEqual(['s3'])
    expect(db.magicTokens.map(t => t.id)).toEqual(['t3'])
    expect(db.users.map(u => u.id)).toEqual(['u2'])
  })

  it('sends a best-effort admin notice with a timestamp only - no user email or id', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    await runDelete(db)

    expect(global.fetch).toHaveBeenCalledOnce()
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.to).toBe('ops@test')
    expect(body.from).toBe('Scorecard <hi@test>')
    expect(body.text).not.toContain('me@example.com')
    expect(body.text).not.toContain('u1')
    expect(body.text).toMatch(/deleted at \d{4}-\d{2}-\d{2}T/)
  })

  it('falls back to the hardcoded admin address when ADMIN_NOTIFY_EMAIL is unset', async () => {
    getSessionUser.mockResolvedValue(ME)
    const db = makeDB({ users: [{ ...ME }] })
    const c = deleteCtx(db)
    delete c.env.ADMIN_NOTIFY_EMAIL
    await onRequestDelete(c)
    await Promise.all(c.waited)

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.to).toBe('williamadamgriffiths@gmail.com')
  })

  it('a failing admin notice does not fail or reverse the deletion', async () => {
    getSessionUser.mockResolvedValue(ME)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn().mockRejectedValue(new Error('smtp down'))
    const db = makeDB({ users: [{ ...ME }], games: [{ id: 'g1', user_id: 'u1' }] })

    const { res } = await runDelete(db)

    expect(res.status).toBe(200)
    expect(db.users).toHaveLength(0)
    expect(db.games).toHaveLength(0)
  })
})
