import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isValidEmail, sendEmail, magicLinkEmailHtml, EMAIL_RE } from './email.js'

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('player@example.com')).toBe(true)
  })

  it('rejects malformed input, non-strings and whitespace', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('a @b.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
    expect(isValidEmail(undefined)).toBe(false)
    expect(isValidEmail(42)).toBe(false)
  })

  it('is the same regex the sign-in flow shipped with', () => {
    expect(EMAIL_RE.source).toBe('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')
  })
})

describe('sendEmail', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs once to Resend with the bearer key and payload, returns { ok: true }', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'e1' }) })

    const out = await sendEmail({
      apiKey: 'key-123',
      from: 'Scorecard <hi@test>',
      to: 'player@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    })

    expect(out).toEqual({ ok: true, status: 200 })
    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer key-123')
    expect(JSON.parse(init.body)).toEqual({
      from: 'Scorecard <hi@test>',
      to: 'player@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    })
  })

  it('returns { ok: false } and logs on a non-2xx response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: 'bad' }) })

    const out = await sendEmail({ apiKey: 'k', from: 'f', to: 't', subject: 's', html: 'h', text: 't' })

    expect(out).toEqual({ ok: false, status: 422 })
    expect(console.error).toHaveBeenCalledWith('Resend error', 422, JSON.stringify({ message: 'bad' }))
  })

  it('returns { ok: false } and logs on a network error, never throws', async () => {
    global.fetch.mockRejectedValue(new Error('offline'))

    const out = await sendEmail({ apiKey: 'k', from: 'f', to: 't', subject: 's', html: 'h', text: 't' })

    expect(out).toEqual({ ok: false, status: 0 })
    expect(console.error).toHaveBeenCalledWith('Resend error', 'network', 'Error: offline')
  })
})

describe('magicLinkEmailHtml', () => {
  it('interpolates the heading, intro, CTA label and link (twice)', () => {
    const html = magicLinkEmailHtml({
      heading: 'Confirm your email',
      intro: 'Click below.',
      ctaLabel: 'Confirm your email',
      link: 'https://app.test/api/auth/confirm-email?token=abc',
    })

    expect(html).toContain('<h1 style="font-size: 24px; font-weight: normal; color: #1A1A18; margin: 0 0 16px;">Confirm your email</h1>')
    expect(html).toContain('Click below.')
    expect(html).toContain('href="https://app.test/api/auth/confirm-email?token=abc"')
    // link also appears as the copy-paste fallback
    expect(html.match(/https:\/\/app\.test\/api\/auth\/confirm-email\?token=abc/g)).toHaveLength(2)
    expect(html).toContain('Built by Outbuild.')
  })
})
