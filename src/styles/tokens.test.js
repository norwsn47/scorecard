import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindConfig from '../../tailwind.config.js'

// Token contract (redesign stage 1). docs/redesign/reference/tokens.json is read
// from Figma and is the source of truth for the redesign; index.css and
// tailwind.config.js must match it. This also guards the sunlight contrast rules
// in DESIGN.md: raising the accent tint above 8% fails here, because muted text
// on the tint would drop below AA 4.5:1.

const root = p => resolve(process.cwd(), p)
const rawCss = readFileSync(root('src/styles/index.css'), 'utf8')
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '')
const tokens = JSON.parse(readFileSync(root('docs/redesign/reference/tokens.json'), 'utf8'))

const BASE = 16 // 1rem = 16px; the 18px desktop root scales everything from there

// ---------- helpers ----------

function cssVar(name) {
  const m = css.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'))
  if (!m) throw new Error(`CSS variable ${name} not found in index.css`)
  return m[1].trim()
}

const hexToRgb = hex => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
}

// Resolves a CSS colour value to { rgb: [r,g,b], a }. Handles #hex, "R G B"
// channels, rgba(r, g, b, a) and rgb(var(--x) / a).
function parseColour(value) {
  const v = value.trim()
  if (v.startsWith('#')) return { rgb: hexToRgb(v), a: 1 }
  const viaVar = v.match(/^rgba?\(\s*var\((--[\w-]+)\)\s*\/\s*([\d.]+)\s*\)$/)
  if (viaVar) return { rgb: parseColour(cssVar(viaVar[1])).rgb, a: parseFloat(viaVar[2]) }
  const fn = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/)
  if (fn) return { rgb: [+fn[1], +fn[2], +fn[3]], a: fn[4] === undefined ? 1 : parseFloat(fn[4]) }
  const channels = v.match(/^(\d+)\s+(\d+)\s+(\d+)$/)
  if (channels) return { rgb: [+channels[1], +channels[2], +channels[3]], a: 1 }
  throw new Error(`Cannot parse colour: ${value}`)
}

// Figma values are "#RRGGBB" or "#RRGGBB @8%".
function parseFigma(value) {
  const m = value.match(/^(#[0-9A-Fa-f]{6})(?:\s*@\s*(\d+(?:\.\d+)?)%)?$/)
  if (!m) throw new Error(`Cannot parse Figma value: ${value}`)
  return { rgb: hexToRgb(m[1]), a: m[2] === undefined ? 1 : parseFloat(m[2]) / 100 }
}

const figmaColour = name => parseFigma(tokens.collections.Color.variables[name].value)

// A colour with alpha composited over an opaque background.
function over(fg, bg) {
  return { rgb: fg.rgb.map((c, i) => c * fg.a + bg.rgb[i] * (1 - fg.a)), a: 1 }
}

const lin = c => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = ({ rgb }) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const remToPx = s => {
  const m = String(s).trim().match(/^(-?[\d.]+)rem$/)
  if (!m) throw new Error(`Expected a rem value, got "${s}"`)
  return parseFloat(m[1]) * BASE
}

// ---------- colour tokens against tokens.json ----------

// Code variable -> the Figma colour variables it must equal.
const colourMap = {
  '--color-bg': ['color/surface/page', 'color/surface/default'],
  '--color-bg-card': ['color/surface/card', 'color/surface/subtle', 'color/surface/field'],
  '--color-text': ['color/text/primary'],
  '--color-text-muted': ['color/text/secondary'],
  '--color-border': ['color/border/default'],
  '--color-accent': ['color/accent/default', 'color/border/focus', 'color/text/link'],
  '--color-accent-hover': ['color/accent/hover', 'color/accent/pressed'],
  '--color-border-field': ['color/border/strong'],
  '--color-control-warm': ['color/control/warm'],
  '--color-under-par': ['color/status/success/text'],
  '--color-over-par': ['color/status/error/text'],
  '--color-accent-tint': ['color/accent/subtle'],
  '--color-accent-tint-hover': ['color/accent/subtle-hover'],
  '--color-on-accent': ['color/accent/on-accent', 'color/text/inverse'],
  '--color-surface-disabled': ['color/surface/disabled'],
  '--color-error': ['color/status/error/text', 'color/status/error/fill'],
}

// Deliberate owner overrides of a Figma value (22 November 2026). Each is
// pinned here so a change is a conscious decision, not drift.
const ownerOverrides = {
  // Figma #D9D0C4 is 1.17:1 on the disabled fill: unreadable outdoors.
  '--color-text-disabled': { figma: 'color/text/disabled', value: '#A39A90' },
}

describe('owner overrides of Figma values', () => {
  for (const [cssName, { figma, value }] of Object.entries(ownerOverrides)) {
    it(`${cssName} is the agreed override of ${figma}`, () => {
      const code = parseColour(cssVar(cssName))
      expect(code.rgb.map(Math.round)).toEqual(parseColour(value).rgb.map(Math.round))
      expect(code.rgb.map(Math.round)).not.toEqual(figmaColour(figma).rgb)
    })
  }
})

describe('colour tokens match tokens.json', () => {
  for (const [cssName, figmaNames] of Object.entries(colourMap)) {
    for (const figmaName of figmaNames) {
      it(`${cssName} = ${figmaName}`, () => {
        const code = parseColour(cssVar(cssName))
        const fig = figmaColour(figmaName)
        expect(code.rgb.map(Math.round)).toEqual(fig.rgb)
        expect(code.a).toBeCloseTo(fig.a, 5)
      })
    }
  }

  it('every codeMatches entry in tokens.json is covered by the mapping above', () => {
    for (const [figmaKey, cssName] of Object.entries(tokens.codeMatches)) {
      const [first, ...rest] = figmaKey.split(' and ')
      const prefix = first.slice(0, first.lastIndexOf('/') + 1)
      const names = [first, ...rest.map(r => prefix + r)]
      for (const n of names) {
        expect(colourMap[cssName], `${cssName} should map to ${n}`).toContain(n)
      }
    }
  })

  it('src/utils/share.js mirrors only values that still match tokens.json', () => {
    const share = readFileSync(root('src/utils/share.js'), 'utf8')
    const hexes = {
      bg: '--color-bg', card: '--color-bg-card', text: '--color-text', muted: '--color-text-muted',
      accent: '--color-accent', border: '--color-border', underPar: '--color-under-par', overPar: '--color-over-par',
    }
    for (const [key, cssName] of Object.entries(hexes)) {
      const m = share.match(new RegExp(`\\b${key}:\\s*'(#[0-9A-Fa-f]{6})'`))
      expect(m, `share.js should define ${key}`).toBeTruthy()
      expect(hexToRgb(m[1])).toEqual(parseColour(cssVar(cssName)).rgb)
    }
  })
})

describe('accent tint', () => {
  const tint = parseColour(cssVar('--color-accent-tint'))

  it('is the accent colour at exactly 8%', () => {
    expect(tint.rgb).toEqual(parseColour(cssVar('--color-accent')).rgb)
    expect(tint.a).toBe(0.08)
  })

  it('never goes above 8% (muted text on it must stay at 4.5:1 or better)', () => {
    expect(tint.a).toBeLessThanOrEqual(0.08)
  })

  it('subtle-hover is the accent at 15%', () => {
    expect(parseColour(cssVar('--color-accent-tint-hover')).a).toBe(0.15)
  })
})

// ---------- contrast (plan 5a, DESIGN.md "Sunlight contrast") ----------

const C = {
  bg: parseColour(cssVar('--color-bg')),
  card: parseColour(cssVar('--color-bg-card')),
  text: parseColour(cssVar('--color-text')),
  muted: parseColour(cssVar('--color-text-muted')),
  accent: parseColour(cssVar('--color-accent')),
  field: parseColour(cssVar('--color-border-field')),
  control: parseColour(cssVar('--color-control-warm')),
  under: parseColour(cssVar('--color-under-par')),
  over: parseColour(cssVar('--color-over-par')),
  border: parseColour(cssVar('--color-border')),
  onAccent: parseColour(cssVar('--color-on-accent')),
  disabledSurface: parseColour(cssVar('--color-surface-disabled')),
  disabledText: parseColour(cssVar('--color-text-disabled')),
}
const tintRaw = parseColour(cssVar('--color-accent-tint'))
const tintOnBg = over(tintRaw, C.bg)
const tintOnCard = over(tintRaw, C.card)

// [label, foreground, background, minimum ratio, note]
const pairs = [
  ['text on bg', C.text, C.bg, 4.5],
  ['text on card', C.text, C.card, 4.5],
  ['text on tint (over bg)', C.text, tintOnBg, 4.5],
  ['muted on bg', C.muted, C.bg, 4.5],
  ['muted on card', C.muted, C.card, 4.5],
  ['muted on tint (over bg)', C.muted, tintOnBg, 4.5],
  ['accent on bg', C.accent, C.bg, 4.5],
  ['accent on card', C.accent, C.card, 4.5],
  ['accent on tint (over bg)', C.accent, tintOnBg, 4.5],
  ['under-par on bg', C.under, C.bg, 4.5],
  ['under-par on card', C.under, C.card, 4.5],
  ['under-par on tint (over bg)', C.under, tintOnBg, 4.5],
  ['over-par on bg', C.over, C.bg, 4.5],
  ['over-par on card', C.over, C.card, 4.5],
  ['over-par on tint (over bg)', C.over, tintOnBg, 4.5],
  ['on-accent (white) on accent', C.onAccent, C.accent, 4.5],
  ['field edge on bg (non-text)', C.field, C.bg, 3],
  ['field edge on card (non-text)', C.field, C.card, 3],
  ['control-warm on bg (non-text)', C.control, C.bg, 3],
  ['control-warm on card (non-text)', C.control, C.card, 3],
]

// Reported, not asserted: exempt by rule (disabled states, decorative
// hairlines) or outside the plan's 5a pairs.
const informational = [
  ['disabled text on disabled surface (exempt: disabled)', C.disabledText, C.disabledSurface],
  ['disabled text on bg (exempt: disabled)', C.disabledText, C.bg],
  ['border hairline on bg (exempt: decorative)', C.border, C.bg],
  // 4.39:1, below AA. Plan 5a's 4.57:1 is the tint over bg. Do not put muted text on a tint that sits on bg-card.
  ['muted on tint (over card) - not in plan 5a', C.muted, tintOnCard],
]

const report = []

describe('WCAG contrast of the token pairs', () => {
  for (const [label, fg, bg, min] of pairs) {
    it(`${label} is at least ${min}:1`, () => {
      const ratio = contrast(fg, bg)
      report.push([label, ratio.toFixed(2), `>= ${min}`, ratio >= min ? 'pass' : 'FAIL'])
      expect(ratio).toBeGreaterThanOrEqual(min)
    })
  }

  it('reports the exempt and informational pairs', () => {
    for (const [label, fg, bg] of informational) {
      report.push([label, contrast(fg, bg).toFixed(2), 'n/a', 'info'])
    }
    expect(informational.length).toBeGreaterThan(0)
  })

  afterAll(() => {
    console.info('\nContrast table (computed)\n' + report.map(r => r.join(' | ')).join('\n'))
  })
})

// ---------- shape, shadow, spacing ----------

describe('radius, shadow and spacing', () => {
  it('--radius-control and --radius-sheet are in rem and match Shape', () => {
    expect(remToPx(cssVar('--radius-control'))).toBe(tokens.collections.Shape.variables['radius/control'].value)
    expect(remToPx(cssVar('--radius-sheet'))).toBe(tokens.collections.Shape.variables['radius/sheet'].value)
  })

  it('tailwind exposes rounded-control and rounded-sheet', () => {
    const r = tailwindConfig.theme.extend.borderRadius
    expect(r.control).toBe('var(--radius-control)')
    expect(r.sheet).toBe('var(--radius-sheet)')
  })

  it('--shadow-subtle matches the Figma Shadow/Subtle effect', () => {
    const fx = tokens.effectStyles.find(e => e.name === 'Shadow/Subtle').effects[0]
    const m = cssVar('--shadow-subtle').match(/^(\S+)\s+(\S+)\s+(\S+)\s+(?:(\S+)\s+)?rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/)
    expect(m, 'shadow value should be "x y blur rgba(...)"').toBeTruthy()
    const px = s => (s === '0' ? 0 : remToPx(s))
    expect(px(m[1])).toBe(fx.offset.x)
    expect(px(m[2])).toBe(fx.offset.y)
    expect(px(m[3])).toBe(fx.radius)
    const fig = parseFigma(fx.color)
    expect([+m[5], +m[6], +m[7]]).toEqual(fig.rgb)
    expect(parseFloat(m[8])).toBeCloseTo(fig.a, 5)
  })

  it('keeps the existing shadow-card and shadow-btn untouched', () => {
    expect(cssVar('--shadow-card')).toBe('0 1px 3px rgba(26, 26, 24, 0.08), 0 1px 2px rgba(26, 26, 24, 0.04)')
    expect(cssVar('--shadow-btn')).toBe('0 1px 2px rgba(26, 26, 24, 0.12)')
  })

  const aliasToFigma = {
    related: 'layout/gap/related',
    field: 'layout/gap/field',
    group: 'layout/gap/group',
    section: 'layout/gap/section',
    page: 'layout/padding/page',
    card: 'layout/padding/card',
  }
  for (const [alias, figmaName] of Object.entries(aliasToFigma)) {
    it(`spacing alias "${alias}" is rem and equals ${figmaName}`, () => {
      const value = tailwindConfig.theme.extend.spacing[alias]
      expect(value).toMatch(/rem$/)
      expect(remToPx(value)).toBe(tokens.collections.Layout.variables[figmaName].value)
    })
  }
})

// ---------- type utilities ----------

function typeBlock(cls) {
  const m = css.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`))
  if (!m) throw new Error(`.${cls} not found in index.css`)
  return Object.fromEntries(
    m[1].split(';').map(d => d.trim()).filter(Boolean).map(d => {
      const i = d.indexOf(':')
      return [d.slice(0, i).trim(), d.slice(i + 1).trim()]
    }),
  )
}

const weightFor = style => (/Semi Bold/i.test(style) ? 600 : /Medium/i.test(style) ? 500 : 400)

describe('type utilities match tokens.json textStyles', () => {
  for (const style of tokens.textStyles) {
    const cls = 'type-' + style.name.toLowerCase().replace(/\s+/g, '-')
    it(`.${cls}`, () => {
      const b = typeBlock(cls)
      expect(remToPx(b['font-size'])).toBe(style.fontSize)
      expect(remToPx(b['line-height'])).toBe(parseFloat(style.lineHeight))
      expect(Number(b['font-weight'])).toBe(weightFor(style.fontStyle))
      const ls = parseFloat(style.letterSpacing)
      if (ls === 0) expect(parseFloat(b['letter-spacing'])).toBe(0)
      else expect(remToPx(b['letter-spacing'])).toBeCloseTo(ls, 5)
      expect(b['font-style'] === 'italic').toBe(/Italic/i.test(style.fontStyle))
      expect(b['text-transform'] === 'uppercase').toBe(style.textCase === 'UPPER')
      expect(b['font-family']).toBe(/Cormorant/.test(style.fontFamily) ? 'var(--font-display)' : 'var(--font-ui)')
      for (const [prop, val] of Object.entries(b)) {
        expect(val, `${cls} ${prop} must not use px`).not.toMatch(/\d\s*px\b/)
      }
    })
  }
})
