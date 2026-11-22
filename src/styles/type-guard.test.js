import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

// Type guard (redesign stage 2). All text styling goes through the eight type-*
// utilities in src/styles/index.css. This fails on any raw font-size class, the
// `uppercase` class (only .type-label-caps is uppercase) and any tracking-* class
// in src/**/*.jsx, so the type scale cannot drift back.
//
// Approach: strip comments (block, JSX and line comments), then split what is left
// into whole class tokens on whitespace, quotes, backticks, braces, brackets
// and commas. Variant prefixes (sm:, hover:, [&>p]:) and the important
// marker (!) are removed before matching, so only whole classes are tested, never
// substrings of other words. Test files (*.test.jsx, *.test.js) are not scanned.

const SRC = resolve(process.cwd(), 'src')

// Genuine non-type uses. Keyed by file plus exact class; `count` is how many times
// it must appear, so a stale or grown entry fails below.
const ALLOW = [
  { file: 'src/pages/Scorecard.jsx', cls: 'text-2xl', count: 2, reason: 'glyph size of the +/- on the 64px round control buttons, not text' },
  { file: 'src/components/ParStepperGrid.jsx', cls: 'text-lg', count: 2, reason: 'glyph size of the +/- stepper symbols, not text' },
]

// ---------- scanner ----------

const SIZE_KEYWORD = /^text-(?:xs|sm|base|lg|xl|[2-9]xl)$/
// Arbitrary size: a bare length, or an explicit length: hint. Colours such as
// text-[#fff], text-[rgb(...)] or text-[color:...] are not sizes.
const SIZE_ARBITRARY = /^text-\[(?:length:[^\]]*|\d*\.?\d+(?:px|rem|em|%|vw|vh|pt|ch))\]$/
const UPPERCASE = /^uppercase$/
const TRACKING = /^tracking-.+$/

const RULES = [
  { name: 'raw font-size class', test: c => SIZE_KEYWORD.test(c) || SIZE_ARBITRARY.test(c) },
  { name: 'uppercase class', test: c => UPPERCASE.test(c) },
  { name: 'tracking class', test: c => TRACKING.test(c) },
]

// Blanks comments but keeps newlines so reported line numbers stay right.
export function stripComments(text) {
  const blank = s => s.replace(/[^\n]/g, ' ')
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank) // block and JSX {/* */} comments
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length))) // line comments, not "https://"
}

// Returns [{ line, cls, rule }]
export function scan(text) {
  const found = []
  stripComments(text).split('\n').forEach((lineText, i) => {
    for (const raw of lineText.split(/[\s"'`{}(),;]+/)) {
      if (!raw) continue
      const cls = raw.replace(/^(?:[^\s:[\]]+:|\[[^\]]*\]:)*!?/, '')
      for (const rule of RULES) {
        if (rule.test(cls)) found.push({ line: i + 1, cls, rule: rule.name })
      }
    }
  })
  return found
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return p.endsWith('.jsx') && !/\.test\.jsx?$/.test(name) ? [p] : []
  })
}

const files = walk(SRC).map(p => relative(process.cwd(), p))
const allowed = (file, cls) => ALLOW.find(a => a.file === file && a.cls === cls)

// ---------- the guard ----------

describe('type guard: only the type-* utilities style text', () => {
  it('scans the source files', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it('finds no raw font-size, uppercase or tracking classes outside the allow-list', () => {
    const violations = []
    for (const file of files) {
      const text = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const f of scan(text)) {
        if (!allowed(file, f.cls)) violations.push(`${file}:${f.line}  ${f.cls}  (${f.rule})`)
      }
    }
    expect(violations, `Use a type-* utility instead:\n${violations.join('\n')}`).toEqual([])
  })

  it('has no stale allow-list entries (each is still present exactly `count` times)', () => {
    for (const a of ALLOW) {
      const text = readFileSync(resolve(process.cwd(), a.file), 'utf8')
      const n = scan(text).filter(f => f.cls === a.cls).length
      expect(n, `${a.file} ${a.cls} (${a.reason})`).toBe(a.count)
    }
  })
})

// ---------- the scanner itself ----------

describe('type guard scanner', () => {
  const classes = s => scan(s).map(f => f.cls)

  it('detects raw sizes, including arbitrary and variant-prefixed ones', () => {
    const src = '<p className="font-ui text-sm sm:text-lg hover:!text-[13px] text-[0.6em] text-2xl text-6xl">'
    expect(classes(src)).toEqual(['text-sm', 'text-lg', 'text-[13px]', 'text-[0.6em]', 'text-2xl', 'text-6xl'])
  })

  it('detects uppercase and tracking classes', () => {
    expect(classes('className={`uppercase tracking-wide tracking-[0.1em] md:tracking-tight`}')).toEqual([
      'uppercase', 'tracking-wide', 'tracking-[0.1em]', 'tracking-tight',
    ])
  })

  it('reports the right line number', () => {
    expect(scan('a\nb\n<p className="x uppercase">')).toEqual([{ line: 3, cls: 'uppercase', rule: 'uppercase class' }])
  })

  it('does not flag colour or alignment text-* classes', () => {
    const src = [
      'text-text text-muted text-accent text-white text-on-accent text-over-par text-under-par',
      'text-left text-center text-right text-ellipsis text-balance text-wrap text-[#fff] text-[rgb(1,2,3)]',
      'text-[color:var(--x)] hover:text-accent',
    ].join(' ')
    expect(classes(src)).toEqual([])
  })

  it('does not flag substrings of other words or the word inside comments', () => {
    const src = [
      '// keep uppercase here, tracking-wide is gone, text-sm too',
      '/* uppercase tracking-[0.1em] text-lg */',
      '{/* uppercase text-xl */}',
      'const x = "nottext-sm" // uppercase',
      'const y = "my-uppercase-thing text-smx"',
      'const u = "https://outbuild.uk" // uppercase',
    ].join('\n')
    expect(classes(src)).toEqual([])
  })

  it('does not treat the type-* utilities as violations', () => {
    expect(classes('type-display type-title type-body type-strong type-small type-small-strong type-caption type-label-caps')).toEqual([])
  })
})
