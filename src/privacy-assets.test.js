import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// The app promises no third-party requests for fonts (Privacy page, PRD §4.8):
// fonts are self-hosted and the CSP only allows the app's own origin for them.

// Vitest runs from the project root.
const read = p => readFileSync(resolve(process.cwd(), p), 'utf8')

describe('self-hosted fonts', () => {
  it('index.html makes no request to Google Fonts', () => {
    const html = read('index.html')
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/)
  })

  it('every font file the stylesheet points at exists in public/fonts', () => {
    const css = read('src/styles/index.css')
    const urls = [...css.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map(m => m[1])
    expect(urls.length).toBeGreaterThanOrEqual(4)
    for (const u of urls) expect(existsSync(resolve(process.cwd(), `public${u}`))).toBe(true)
  })

  it('declares the three families the design uses', () => {
    const css = read('src/styles/index.css')
    for (const family of ['Caveat', 'Cormorant Garamond', 'Inter']) {
      expect(css).toContain(`font-family: '${family}'`)
    }
  })
})

describe('public/_headers', () => {
  const headers = read('public/_headers')

  it('sets a CSP that only allows same-origin fonts, scripts and connections', () => {
    expect(headers).toMatch(/Content-Security-Policy(-Report-Only)?: /)
    for (const directive of ["default-src 'self'", "script-src 'self'", "font-src 'self'", "connect-src 'self'", "frame-ancestors 'none'"]) {
      expect(headers).toContain(directive)
    }
    expect(headers).not.toMatch(/googleapis|gstatic/)
  })

  it('sets the plain hardening headers', () => {
    expect(headers).toContain('X-Content-Type-Options: nosniff')
    expect(headers).toContain('X-Frame-Options: DENY')
    expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin')
  })
})
