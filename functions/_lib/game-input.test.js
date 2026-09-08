import { describe, it, expect } from 'vitest'
import { validatePlayedAt, validatePlayerData } from './game-input.js'

describe('validatePlayedAt (#23)', () => {
  it('accepts an ISO date string', () => {
    expect(validatePlayedAt('2026-08-01T10:00:00.000Z')).toEqual({ ok: true })
  })

  it('accepts a plain date string', () => {
    expect(validatePlayedAt('2026-08-01').ok).toBe(true)
  })

  it.each([
    ['', 'empty'],
    ['   ', 'whitespace'],
    [undefined, 'undefined'],
    [null, 'null'],
    [12345, 'a number'],
    ['not a date', 'unparseable'],
    ['2026-13-45', 'an impossible date'],
    ['x'.repeat(60), 'absurdly long'],
  ])('rejects %s (%s)', (value) => {
    const r = validatePlayedAt(value)
    expect(r.ok).toBe(false)
    expect(r.error).toBeTruthy()
  })
})

describe('validatePlayerData (#23)', () => {
  const ok = [{ name: 'Ann', scores: [3, 4], total: 7, dnf: false }]

  it('accepts a well-formed array', () => {
    expect(validatePlayerData(ok)).toEqual({ ok: true })
  })

  it('accepts entries without the optional total / dnf', () => {
    expect(validatePlayerData([{ name: 'Ann', scores: [3] }]).ok).toBe(true)
  })

  it('accepts a JSON string of a well-formed array', () => {
    expect(validatePlayerData(JSON.stringify(ok)).ok).toBe(true)
  })

  it('accepts null holes in a scores array (unplayed)', () => {
    expect(validatePlayerData([{ name: 'Ann', scores: [3, null, 4] }]).ok).toBe(true)
  })

  it.each([
    ['not an array', 'a string that is not JSON'],
    ['[]', 'an empty JSON array'],
    [[], 'an empty array'],
    [[{ scores: [3] }], 'an entry with no name'],
    [[{ name: '', scores: [3] }], 'an entry with a blank name'],
    [[{ name: 'x'.repeat(61), scores: [3] }], 'an over-long name'],
    [[{ name: 'Ann' }], 'an entry with no scores'],
    [[{ name: 'Ann', scores: 'nope' }], 'non-array scores'],
    [[{ name: 'Ann', scores: [3.5] }], 'a fractional score'],
    [[{ name: 'Ann', scores: [-1] }], 'a negative score'],
    [[{ name: 'Ann', scores: Array(37).fill(3) }], 'more than 36 holes'],
    [[{ name: 'Ann', scores: [3], dnf: 'yes' }], 'a non-boolean dnf'],
    [[{ name: 'Ann', scores: [3], total: 'lots' }], 'a non-numeric total'],
    [Array(13).fill({ name: 'Ann', scores: [3] }), 'more than 12 players'],
    [['Ann'], 'a bare string entry'],
  ])('rejects %s (%s)', (value) => {
    const r = validatePlayerData(value)
    expect(r.ok).toBe(false)
    expect(r.error).toBeTruthy()
  })
})
