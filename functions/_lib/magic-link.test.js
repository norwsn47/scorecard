import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  MAX_FRESH_LINKS,
  TOKEN_TTL_MS,
  isOverLinkLimit,
  prepareTokenInsert,
  sendMagicLinkEmail,
} from './magic-link.js'
import { magicLinkEmailHtml } from './email.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Fake D1 recording every prepared statement and its bound args.
function makeDB({ count = 0 } = {}) {
  const log = []
  return {
    log,
    prepare(sql) {
      return {
        bind(...args) {
          log.push({ sql, args })
          return {
            sql,
            args,
            async first() { return { count } },
            async run() { return { success: true } },
          }
        },
      }
    },
  }
}

describe('constants', () => {
  it('cap sign-in links at 5 fresh links, valid for 15 minutes', () => {
    expect(MAX_FRESH_LINKS).toBe(5)
    expect(TOKEN_TTL_MS).toBe(15 * 60 * 1000)
  })
})

describe('isOverLinkLimit', () => {
  it('issues the exact count query for the address with the current time as the lower bound', async () => {
    const db = makeDB()
    const now = Date.UTC(2026, 8, 20, 12, 0, 0)
    await isOverLinkLimit(db, 'a@b.co', now)
    expect(db.log).toEqual([{
      sql: 'SELECT COUNT(*) AS count FROM magic_tokens WHERE email = ? AND used = 0 AND expires_at > ?',
      args: ['a@b.co', '2026-09-20T12:00:00.000Z'],
    }])
  })

  it.each([
    [0, false],
    [4, false],
    [5, true],
    [6, true],
    [100, true],
  ])('with %i unclaimed links returns %s', async (count, expected) => {
    expect(await isOverLinkLimit(makeDB({ count }), 'a@b.co', Date.now())).toBe(expected)
  })
})

describe('prepareTokenInsert', () => {
  it('returns a UUID token and a prepared (not yet run) INSERT with the exact SQL and args', () => {
    const db = makeDB()
    const now = Date.UTC(2026, 8, 20, 12, 0, 0)
    const { token, statement } = prepareTokenInsert(db, 'a@b.co', now)

    expect(token).toMatch(UUID)
    expect(statement.sql).toBe('INSERT INTO magic_tokens (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)')
    const [id, email, boundToken, expiresAt] = statement.args
    expect(id).toMatch(UUID)
    expect(id).not.toBe(token)
    expect(email).toBe('a@b.co')
    expect(boundToken).toBe(token)
    expect(expiresAt).toBe('2026-09-20T12:15:00.000Z') // exactly now + 15 minutes
  })

  it('returns a statement that can be run directly or handed to DB.batch', async () => {
    const { statement } = prepareTokenInsert(makeDB(), 'a@b.co', Date.now())
    expect(typeof statement.run).toBe('function')
    expect(await statement.run()).toEqual({ success: true })
  })

  it('generates a different token each time', () => {
    const db = makeDB()
    const a = prepareTokenInsert(db, 'a@b.co', Date.now()).token
    const b = prepareTokenInsert(db, 'a@b.co', Date.now()).token
    expect(a).not.toBe(b)
  })
})

describe('sendMagicLinkEmail', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const args = {
    env: { RESEND_API_KEY: 'key-1', RESEND_FROM_EMAIL: 'Scorecard <hi@test>' },
    to: 'a@b.co',
    subject: 'Subject line',
    heading: 'The heading',
    intro: 'The intro.',
    ctaLabel: 'Go',
    textLead: 'Lead-in line:',
    link: 'https://app.test/api/auth/verify?token=abc',
  }

  it('sends one Resend request built from env and the per-call parts', async () => {
    const out = await sendMagicLinkEmail(args)

    expect(out).toEqual({ ok: true, status: 200 })
    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer key-1')
    expect(JSON.parse(init.body)).toEqual({
      from: 'Scorecard <hi@test>',
      to: 'a@b.co',
      subject: 'Subject line',
      html: magicLinkEmailHtml({
        heading: 'The heading', intro: 'The intro.', ctaLabel: 'Go', link: args.link,
      }),
      text: 'Lead-in line:\nhttps://app.test/api/auth/verify?token=abc\n\nThis link expires in 15 minutes.\n\nIf you didn\'t request this, you can safely ignore this email.',
    })
  })

  it('reports a Resend failure as { ok: false } without throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    expect(await sendMagicLinkEmail(args)).toEqual({ ok: false, status: 500 })
  })
})
