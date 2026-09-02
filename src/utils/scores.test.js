import { describe, expect, it } from 'vitest'
import { deriveHolePars, playerAverage, playerTotal, scoreToPar } from './scores.js'

describe('playerTotal', () => {
  it('sums the scored holes, ignoring nulls', () => {
    expect(playerTotal({ Ann: [3, null, 4, 5] }, 'Ann')).toBe(12)
  })

  it('is 0 for an unknown or empty player', () => {
    expect(playerTotal({}, 'Ann')).toBe(0)
  })
})

describe('playerAverage', () => {
  it('averages the scored holes to one decimal place', () => {
    expect(playerAverage({ Ann: [3, 4, null] }, 'Ann')).toBe('3.5')
  })

  it('is null when nothing is scored', () => {
    expect(playerAverage({ Ann: [null, null] }, 'Ann')).toBeNull()
  })
})

describe('scoreToPar', () => {
  it('returns null for an unscored hole', () => {
    expect(scoreToPar(null, 3)).toBeNull()
    expect(scoreToPar(undefined, 3)).toBeNull()
  })

  it('returns the signed difference for a scored hole', () => {
    expect(scoreToPar(3, 3)).toBe(0)
    expect(scoreToPar(5, 3)).toBe(2)
    expect(scoreToPar(2, 4)).toBe(-2)
  })

  it('treats a score of 0 as a real score, not unscored', () => {
    expect(scoreToPar(0, 3)).toBe(-3)
  })
})

describe('deriveHolePars', () => {
  it('normalises an array to exactly holeCount entries', () => {
    expect(deriveHolePars([3, 4, 5], 3)).toEqual([3, 4, 5])
  })

  it('parses a JSON string', () => {
    expect(deriveHolePars('[3,4,3]', 3)).toEqual([3, 4, 3])
  })

  it('fills a short array with par 3', () => {
    expect(deriveHolePars([4, 4], 5)).toEqual([4, 4, 3, 3, 3])
  })

  it('trims a long array to holeCount', () => {
    expect(deriveHolePars([3, 3, 3, 3, 3], 3)).toEqual([3, 3, 3])
  })

  it('returns all par 3 for null / undefined', () => {
    expect(deriveHolePars(null, 4)).toEqual([3, 3, 3, 3])
    expect(deriveHolePars(undefined, 2)).toEqual([3, 3])
  })

  it('returns all par 3 for an unparseable string', () => {
    expect(deriveHolePars('{oops', 3)).toEqual([3, 3, 3])
  })

  it('replaces non-integer or nonsensical entries with par 3', () => {
    expect(deriveHolePars([3, 'x', 4.5, 0, -2, null], 6)).toEqual([3, 3, 3, 3, 3, 3])
  })
})
