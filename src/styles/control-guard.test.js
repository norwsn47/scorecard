import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

// Control guard (redesign stage 3, piece 5). Controls take their radius, focus
// ring, disabled colours and flat (shadow-free) look from tokens. This fails on
// the old shipped values in src/**/*.jsx so they cannot drift back:
//   rounded-sm, rounded-md   -> rounded-control (or rounded-sheet, rounded-full)
//   shadow-btn               -> none (buttons are flat)
//   ring-accent/40           -> ring-accent (solid 2px focus ring)
//   opacity-40               -> disabled:bg-disabled-surface disabled:text-disabled-text
//   hard-coded #hex / rgba() -> colour tokens
//   px-5, px-6               -> px-page (page horizontal padding, redesign stage 4)
// Same approach as type-guard.test.js: comments are stripped, then whole class
// tokens are matched (variant prefixes and `!` removed). Hex and rgba( are matched
// on the comment-stripped line. Test files are not scanned.

const SRC = resolve(process.cwd(), 'src')

// Narrow allow-list: file plus exact token, with the number of occurrences it
// must have, so a stale or grown entry fails. Each is owned by a later stage,
// which removes the entry when it moves the component onto the tokens.
const ALLOW = [
  // Stage 4: px-5 and px-6 are not page padding in these places. Page edges use px-page.
  { file: 'src/components/Button.jsx', cls: 'px-6', count: 1, reason: 'inner padding of the large button' },
  { file: 'src/components/CourseMapModal.jsx', cls: 'px-5', count: 4, reason: 'map modal inner padding (modal, not a page)' },
  { file: 'src/components/CourseMapModal.lazy.jsx', cls: 'px-5', count: 2, reason: 'map modal inner padding (modal, not a page)' },
  { file: 'src/pages/Setup.jsx', cls: 'px-6', count: 1, reason: 'bottom sheet inner padding' },
  { file: 'src/pages/Summary.jsx', cls: 'px-6', count: 1, reason: 'bottom sheet inner padding' },
  { file: 'src/pages/Settings.jsx', cls: 'px-6', count: 1, reason: 'bottom sheet inner padding' },
  { file: 'src/pages/Scorecard.jsx', cls: 'px-6', count: 1, reason: 'bottom sheet inner padding' },
  { file: 'src/pages/CourseEdit.jsx', cls: 'px-6', count: 1, reason: 'bottom sheet inner padding' },
]
// Note: opacity-25 (circular game controls) is not matched, so needs no entry.

// ---------- scanner ----------

const CLASS_RULES = [
  { name: 'rounded-sm', test: c => c === 'rounded-sm' },
  { name: 'rounded-md', test: c => c === 'rounded-md' },
  { name: 'shadow-btn', test: c => c === 'shadow-btn' },
  { name: 'shadow-card', test: c => c === 'shadow-card' },
  { name: 'ring-accent/40', test: c => c === 'ring-accent/40' },
  { name: 'opacity-40', test: c => c === 'opacity-40' },
  { name: 'px-5', test: c => c === 'px-5' },
  { name: 'px-6', test: c => c === 'px-6' },
]
// #abc, #aabbcc (and the 4 and 8 digit forms), not followed by more word chars.
const HEX = /#[0-9a-fA-F]{3,8}\b/g
const RGBA = /\brgba?\(/g

// Blanks comments but keeps newlines so reported line numbers stay right.
export function stripComments(text) {
  const blank = s => s.replace(/[^\n]/g, ' ')
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)))
}

// Returns [{ line, cls, rule }]. `cls` is the matched token.
export function scan(text) {
  const found = []
  stripComments(text).split('\n').forEach((lineText, i) => {
    for (const raw of lineText.split(/[\s"'`{}(),;]+/)) {
      if (!raw) continue
      const cls = raw.replace(/^(?:[^\s:[\]]+:|\[[^\]]*\]:)*!?/, '')
      for (const rule of CLASS_RULES) {
        if (rule.test(cls)) found.push({ line: i + 1, cls, rule: rule.name })
      }
    }
    for (const m of lineText.matchAll(HEX)) found.push({ line: i + 1, cls: m[0], rule: 'hard-coded hex colour' })
    for (const m of lineText.matchAll(RGBA)) found.push({ line: i + 1, cls: m[0], rule: 'hard-coded rgba colour' })
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

describe('control guard: controls use the redesign tokens', () => {
  it('scans the source files', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it('finds no banned radius, shadow, ring, opacity, page padding or hard-coded colour outside the allow-list', () => {
    const violations = []
    for (const file of files) {
      const text = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const f of scan(text)) {
        if (!allowed(file, f.cls)) violations.push(`${file}:${f.line}  ${f.cls}  (${f.rule})`)
      }
    }
    expect(violations, `Use the control tokens instead:\n${violations.join('\n')}`).toEqual([])
  })

  it('has no stale allow-list entries (each is still present exactly `count` times)', () => {
    for (const a of ALLOW) {
      const text = readFileSync(resolve(process.cwd(), a.file), 'utf8')
      const n = scan(text).filter(f => f.cls === a.cls).length
      expect(n, `${a.file} ${a.cls} (${a.reason})`).toBe(
        ALLOW.filter(b => b.file === a.file && b.cls === a.cls).reduce((s, b) => s + b.count, 0),
      )
    }
  })
})

// ---------- the scanner itself ----------

describe('control guard scanner', () => {
  const tokens = s => scan(s).map(f => f.cls)

  it('detects banned classes, including variant-prefixed ones', () => {
    const src = '<b className="rounded-sm md:rounded-md shadow-btn hover:shadow-btn focus-visible:ring-accent/40 disabled:opacity-40 shadow-card px-5 md:px-6">'
    expect(tokens(src)).toEqual(['rounded-sm', 'rounded-md', 'shadow-btn', 'shadow-btn', 'ring-accent/40', 'opacity-40', 'shadow-card', 'px-5', 'px-6'])
  })

  it('detects hex and rgba colours, including inside arbitrary values', () => {
    expect(tokens('<div className="bg-[#abc] text-[#aabbcc]" style={{ color: "#1A4329", boxShadow: "0 0 1px rgba(0,0,0,.4)" }} />'))
      .toEqual(['#abc', '#aabbcc', '#1A4329', 'rgba('])
  })

  it('does not flag the allowed tokens or look-alikes', () => {
    const src = [
      'rounded-control rounded-sheet rounded-full rounded-lg rounded-t-md shadow-subtle',
      'ring-accent ring-accent/20 px-page px-4 px-50 opacity-25 opacity-400 disabled:bg-disabled-surface',
      'href="#main" id="#nothex" // rounded-sm #fff rgba(0,0,0,1)',
      '/* shadow-btn opacity-40 */ {/* ring-accent/40 */}',
    ].join('\n')
    expect(tokens(src)).toEqual([])
  })

  it('reports the right line number', () => {
    expect(scan('a\nb\n<p className="x rounded-md">')).toEqual([{ line: 3, cls: 'rounded-md', rule: 'rounded-md' }])
  })
})
