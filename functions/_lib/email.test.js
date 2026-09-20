import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isValidEmail, sendEmail, magicLinkEmailHtml, EMAIL_RE } from './email.js'

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('player@example.com')).toBe(true)
  })

  it('rejects non-strings', () => {
    for (const v of [null, undefined, 42, {}, [], true, ['a@b.co']]) {
      expect(isValidEmail(v)).toBe(false)
    }
  })

  // [address, why it must be accepted]
  const accepted = [
    ['player@example.com', 'a plain address'],
    ['a@b.co', 'the shortest realistic address'],
    ['first.last@example.com', 'a dotted local part'],
    ['first+tag@example.com', 'plus addressing'],
    ['user@mail.example.co.uk', 'nested subdomains'],
    ['user@my-domain.com', 'a hyphen inside a label'],
    ['my-name@example.com', 'a hyphen in the local part'],
    ["o'brien@x.co", 'an apostrophe in the local part'],
    ['a_b@example.com', 'an underscore'],
    ['user123@example123.com', 'digits'],
    ['{user}@example.com', 'RFC 5322 atom specials'],
    ['a!#$%&*/=?^`|~@example.com', 'the full atom special set'],
    ['jos\u00e9@example.com', 'a non-ASCII letter in the local part'],
    ['user@caf\u00e9.es', 'an internationalised domain'],
    ['\u7528\u6237@\u4f8b\u3048.jp', 'CJK local part and domain'],
    ['x@xn--nxasmq6b.com', 'a punycode label with a double hyphen'],
    ['a@b.c', 'a one-letter TLD (the old regex allowed it)'],
    [`${'a'.repeat(64)}@example.com`, 'a 64-character local part (the limit)'],
    [`a@${'b'.repeat(63)}.com`, 'a 63-character label (the limit)'],
    [`${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`.slice(0, 254), 'an address at the 254 limit'],
  ]
  it.each(accepted)('accepts %s (%s)', (address) => {
    expect(isValidEmail(address)).toBe(true)
  })

  const rejected = [
    ['', 'empty'],
    ['not-an-email', 'no @'],
    ['a@b', 'a single-label domain'],
    ['@example.com', 'an empty local part'],
    ['user@', 'an empty domain'],
    ['a@@example.com', 'a doubled @'],
    ['a@b@example.com', 'a second @'],
    ['a b@example.com', 'a space in the local part'],
    ['a@exa mple.com', 'a space in the domain'],
    [' a@example.com', 'leading whitespace'],
    ['a@example.com ', 'trailing whitespace'],
    ['a@example.com\n', 'a trailing newline'],
    ['a\t@example.com', 'a tab'],
    ['a\u00a0b@example.com', 'a non-breaking space'],
    ['a,b@example.com', 'a comma in the local part'],
    ['a@example.com,b@example.com', 'two addresses joined by a comma'],
    ['a;b@example.com', 'a semicolon'],
    ['a@example.com;b@example.com', 'two addresses joined by a semicolon'],
    ['<a@example.com>', 'angle brackets around the address'],
    ['Name <a@example.com>', 'a display name with angle brackets'],
    ['"a"@example.com', 'a quoted local part'],
    ['"a b"@example.com', 'a quoted local part with a space'],
    ['(comment)a@example.com', 'a parenthesised comment'],
    ['a(b)@example.com', 'parentheses in the local part'],
    ['a:b@example.com', 'a colon in the local part'],
    ['a[b]@example.com', 'square brackets in the local part'],
    ['a\\b@example.com', 'a backslash'],
    ['.a@example.com', 'a leading dot in the local part'],
    ['a.@example.com', 'a trailing dot in the local part'],
    ['a..b@example.com', 'consecutive dots in the local part'],
    ['a@.example.com', 'a leading dot in the domain'],
    ['a@example.com.', 'a trailing dot in the domain'],
    ['a@example..com', 'consecutive dots in the domain'],
    ['a@-example.com', 'a label with a leading hyphen'],
    ['a@example-.com', 'a label with a trailing hyphen'],
    ['a@example.-com', 'a TLD with a leading hyphen'],
    ['a@example.com-', 'a TLD with a trailing hyphen'],
    ['a@exa_mple.com', 'an underscore in the domain'],
    ['a@exa+mple.com', 'a plus in the domain'],
    ['a@[127.0.0.1]', 'an IP-literal domain'],
    ['a@ex\u200bample.com', 'a zero-width space in the domain'],
    [`${'a'.repeat(65)}@example.com`, 'a 65-character local part'],
    [`a@${'b'.repeat(64)}.com`, 'a 64-character label'],
    [`${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`, 'an address over 254 characters'],
  ]
  it.each(rejected)('rejects %j (%s)', (address) => {
    expect(isValidEmail(address)).toBe(false)
  })

  it('EMAIL_RE and isValidEmail agree', () => {
    expect(EMAIL_RE.test('player@example.com')).toBe(true)
    expect(EMAIL_RE.test('a@@b.co')).toBe(false)
  })

  it('does not backtrack catastrophically on a long hostile input', () => {
    const start = Date.now()
    isValidEmail(`${'a.'.repeat(60)}@${'b-'.repeat(60)}`)
    isValidEmail(`${'a'.repeat(200)}!`)
    expect(Date.now() - start).toBeLessThan(500)
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

  it('returns { ok: false } and logs only the status and error name on a non-2xx response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ name: 'validation_error', message: 'bad', statusCode: 422 }),
    })

    const out = await sendEmail({ apiKey: 'k', from: 'f', to: 't', subject: 's', html: 'h', text: 't' })

    expect(out).toEqual({ ok: false, status: 422 })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith('Resend error', 422, 'validation_error')
  })

  it('logs the status alone when the error body has no string name', async () => {
    for (const body of [{ message: 'bad' }, { name: { nested: 'x' } }, { name: 42 }, null, 'text']) {
      console.error.mockClear()
      global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => body })
      await sendEmail({ apiKey: 'k', from: 'f', to: 't', subject: 's', html: 'h', text: 't' })
      expect(console.error).toHaveBeenCalledWith('Resend error', 500)
    }
  })

  it('logs the status alone when the error body is not JSON', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new SyntaxError('bad json') } })
    const out = await sendEmail({ apiKey: 'k', from: 'f', to: 't', subject: 's', html: 'h', text: 't' })
    expect(out).toEqual({ ok: false, status: 502 })
    expect(console.error).toHaveBeenCalledWith('Resend error', 502)
  })

  it('truncates the logged error name to 64 characters', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ name: 'x'.repeat(500) }) })
    await sendEmail({ apiKey: 'k', from: 'f', to: 't', subject: 's', html: 'h', text: 't' })
    expect(console.error).toHaveBeenCalledWith('Resend error', 400, 'x'.repeat(64))
  })

  it('never logs the response body, recipient, subject, content or API key', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        name: 'validation_error',
        message: 'The `to` field must be a valid email: player@example.com',
        detail: 'secret-body-detail',
      }),
    })

    await sendEmail({
      apiKey: 'sk-very-secret-key',
      from: 'Scorecard <hi@test>',
      to: 'player@example.com',
      subject: 'Sign in to Scorecard by Outbuild',
      html: '<p>https://app.test/api/auth/verify?token=abc</p>',
      text: 'https://app.test/api/auth/verify?token=abc',
    })

    const logged = JSON.stringify(console.error.mock.calls)
    for (const forbidden of [
      'player@example.com', 'Sign in to Scorecard', 'sk-very-secret-key', 'token=abc',
      'secret-body-detail', 'must be a valid email', 'Authorization', 'Bearer',
    ]) {
      expect(logged).not.toContain(forbidden)
    }
    expect(logged).toContain('validation_error')
  })

  it('returns { ok: false } and logs only the error name on a network error, never throws', async () => {
    global.fetch.mockRejectedValue(new Error('offline'))

    const out = await sendEmail({ apiKey: 'k', from: 'f', to: 't', subject: 's', html: 'h', text: 't' })

    expect(out).toEqual({ ok: false, status: 0 })
    expect(console.error).toHaveBeenCalledWith('Resend error', 'network', 'Error')
  })

  it('a network error message carrying the recipient or key is not logged', async () => {
    global.fetch.mockRejectedValue(
      new TypeError('fetch failed for player@example.com with Bearer sk-very-secret-key')
    )

    await sendEmail({
      apiKey: 'sk-very-secret-key', from: 'f', to: 'player@example.com', subject: 's', html: 'h', text: 't',
    })

    const logged = JSON.stringify(console.error.mock.calls)
    expect(logged).not.toContain('player@example.com')
    expect(logged).not.toContain('sk-very-secret-key')
    expect(console.error).toHaveBeenCalledWith('Resend error', 'network', 'TypeError')
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
