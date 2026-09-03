import { describe, expect, it } from 'vitest'
import { deriveHolePars, formatToPar, parTally, playerAverage, playerTotal, roundToPar, scoreToPar } from './scores.js'

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

describe('formatToPar', () => {
  it('is an empty string for a null / undefined / NaN delta', () => {
    expect(formatToPar(null)).toBe('')
    expect(formatToPar(undefined)).toBe('')
    expect(formatToPar(NaN)).toBe('')
  })

  it('is E for level par — never +0 or -0', () => {
    expect(formatToPar(0)).toBe('E')
  })

  it('prefixes a leading + for over par', () => {
    expect(formatToPar(1)).toBe('+1')
    expect(formatToPar(5)).toBe('+5')
  })

  it('keeps the existing minus for under par', () => {
    expect(formatToPar(-1)).toBe('-1')
    expect(formatToPar(-3)).toBe('-3')
  })
})

describe('roundToPar', () => {
  it('sums scoreToPar over a mixed round', () => {
    // deltas on par 3: -2, -1, 0, +1, +2  → +0
    expect(roundToPar([1, 2, 3, 4, 5], [3, 3, 3, 3, 3])).toBe(0)
    // deltas: +1, +2, -1 → +2
    expect(roundToPar([4, 5, 2], [3, 3, 3])).toBe(2)
  })

  it('is 0 for an all-pars round', () => {
    expect(roundToPar([3, 3, 3, 3], [3, 3, 3, 3])).toBe(0)
  })

  it('is null when the player has scored nothing', () => {
    expect(roundToPar([null, null], [3, 3])).toBeNull()
    expect(roundToPar([], [])).toBeNull()
    expect(roundToPar(undefined, undefined)).toBeNull()
  })

  it('counts only scored holes for a DNF / partial round', () => {
    // scored: 2 (-1), 4 (+1); trailing nulls skipped → 0
    expect(roundToPar([2, 4, null, null], [3, 3, 3, 3])).toBe(0)
  })

  it('skips holes with no matching par entry', () => {
    // holes 0-1 scored against par 3 (+1, +1); holes 2-3 have no par → skipped
    expect(roundToPar([4, 4, 4, 4], [3, 3])).toBe(2)
  })
})

describe('parTally', () => {
  const par3 = [3, 3, 3, 3, 3]

  it('buckets a mixed round, excluding double bogey and worse', () => {
    // deltas: -2, -1, 0, +1, +2  → the +2 lands in no bucket
    expect(parTally([1, 2, 3, 4, 5], par3)).toEqual({ eagle: 1, birdie: 1, par: 1, bogey: 1 })
  })

  it('counts every hole for an all-pars round', () => {
    expect(parTally([3, 3, 3], [3, 3, 3])).toEqual({ eagle: 0, birdie: 0, par: 3, bogey: 0 })
  })

  it('does not count a triple bogey', () => {
    expect(parTally([6], [3])).toEqual({ eagle: 0, birdie: 0, par: 0, bogey: 0 })
  })

  it('ignores unscored trailing holes', () => {
    expect(parTally([3, 2, null, null], [3, 3, 3, 3])).toEqual({ eagle: 0, birdie: 1, par: 1, bogey: 0 })
  })

  it('treats delta -3 on a par 5 as an eagle', () => {
    expect(parTally([2], [5])).toEqual({ eagle: 1, birdie: 0, par: 0, bogey: 0 })
  })

  it('returns all zeros for empty or missing inputs', () => {
    expect(parTally([], [])).toEqual({ eagle: 0, birdie: 0, par: 0, bogey: 0 })
    expect(parTally(undefined, undefined)).toEqual({ eagle: 0, birdie: 0, par: 0, bogey: 0 })
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

  it('clamps out-of-band entries (1 or >7) to par 3', () => {
    expect(deriveHolePars([1, 7, 8, 42, 2, 5], 6)).toEqual([3, 7, 3, 3, 2, 5])
  })
})
