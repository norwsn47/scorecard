import { describe, expect, it } from 'vitest'
import { calculateResult, canStartGame, computeDisplayedHoles, createGame, findDuplicateIndices, finishGame } from './game.js'

// ── findDuplicateIndices ──────────────────────────────────────────────────────

describe('findDuplicateIndices', () => {
  it('returns empty array when there are no duplicates', () => {
    expect(findDuplicateIndices(['Alice', 'Bob', 'Carol'])).toEqual([])
  })

  it('detects an exact duplicate', () => {
    expect(findDuplicateIndices(['Alice', 'Alice'])).toEqual([0, 1])
  })

  it('is case-insensitive', () => {
    expect(findDuplicateIndices(['alice', 'Alice'])).toEqual([0, 1])
  })

  it('handles mixed-case triples', () => {
    const result = findDuplicateIndices(['ALICE', 'Alice', 'alice'])
    expect(result).toContain(0)
    expect(result).toContain(1)
    expect(result).toContain(2)
  })

  it('ignores empty strings', () => {
    expect(findDuplicateIndices(['', ''])).toEqual([])
  })

  it('only flags the duplicate pair, not unrelated names', () => {
    const result = findDuplicateIndices(['Alice', 'Bob', 'Alice'])
    expect(result).toContain(0)
    expect(result).toContain(2)
    expect(result).not.toContain(1)
  })
})

// ── canStartGame ─────────────────────────────────────────────────────────────

describe('canStartGame', () => {
  it('returns true when names are valid', () => {
    expect(canStartGame(['Alice', 'Bob'], 2)).toBe(true)
  })

  it('returns false when a required name is empty', () => {
    expect(canStartGame(['Alice', ''], 2)).toBe(false)
  })

  it('returns false when there is a duplicate name', () => {
    expect(canStartGame(['Alice', 'Alice'], 2)).toBe(false)
  })

  it('ignores names beyond the active count', () => {
    expect(canStartGame(['Alice', 'Bob', ''], 2)).toBe(true)
  })

  it('works for a single player', () => {
    expect(canStartGame(['Alice', '', '', ''], 1)).toBe(true)
  })
})

// ── createGame ────────────────────────────────────────────────────────────────

describe('createGame', () => {
  it('sets players correctly', () => {
    const game = createGame(['Alice', 'Bob'])
    expect(game.players).toEqual(['Alice', 'Bob'])
  })

  it('creates a null-filled scores array per player with 24 slots', () => {
    const game = createGame(['Alice'])
    expect(game.scores['Alice']).toHaveLength(24)
    expect(game.scores['Alice'].every(s => s === null)).toBe(true)
  })

  it('includes an id and startedAt timestamp', () => {
    const game = createGame(['Alice'])
    expect(game.id).toBeTruthy()
    expect(game.startedAt).toBeTruthy()
  })

  it('stores holes as 24', () => {
    const game = createGame(['Alice'])
    expect(game.holes).toBe(24)
  })
})

// ── computeDisplayedHoles ─────────────────────────────────────────────────────

describe('computeDisplayedHoles', () => {
  it('returns 1 when no scores have been entered', () => {
    const scores = { Alice: [null, null, null], Bob: [null, null, null] }
    expect(computeDisplayedHoles(['Alice', 'Bob'], scores, 3)).toBe(1)
  })

  it('returns 2 once the first hole is fully scored', () => {
    const scores = { Alice: [3, null, null], Bob: [4, null, null] }
    expect(computeDisplayedHoles(['Alice', 'Bob'], scores, 3)).toBe(2)
  })

  it('does not advance until all players have scored the hole', () => {
    // Only Alice has scored hole 1 — Bob hasn't yet
    const scores = { Alice: [3, null, null], Bob: [null, null, null] }
    expect(computeDisplayedHoles(['Alice', 'Bob'], scores, 3)).toBe(1)
  })

  it('caps at maxHoles when all holes are fully scored', () => {
    const scores = { Alice: [3, 4, 3], Bob: [4, 3, 4] }
    expect(computeDisplayedHoles(['Alice', 'Bob'], scores, 3)).toBe(3)
  })

  it('works for a single player', () => {
    const scores = { Alice: [3, 4, null] }
    expect(computeDisplayedHoles(['Alice'], scores, 3)).toBe(3)
  })
})

// ── calculateResult ───────────────────────────────────────────────────────────

describe('calculateResult', () => {
  it('identifies the player with the lowest total as winner', () => {
    const scores = { Alice: [3, 3, 3], Bob: [4, 4, 4] }
    const { winner } = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(winner).toBe('Alice')
  })

  it('returns null winner when all players DNF', () => {
    const scores = { Alice: [null, 3, 3] }
    const { winner } = calculateResult(['Alice'], scores, 3)
    expect(winner).toBeNull()
  })

  it('marks players with any null score (within active holes) as DNF', () => {
    const scores = { Alice: [3, 3, 3], Bob: [4, null, 4] }
    const { dnf } = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(dnf).toContain('Bob')
    expect(dnf).not.toContain('Alice')
  })

  it('excludes DNF players from winner calculation', () => {
    const scores = { Alice: [5, 5, 5], Bob: [1, null, 1] }
    const { winner } = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(winner).toBe('Alice')
  })

  it('handles a single finisher as winner', () => {
    const scores = { Alice: [4, 4, 4] }
    const { winner } = calculateResult(['Alice'], scores, 3)
    expect(winner).toBe('Alice')
  })

  it('returns a tied winner deterministically', () => {
    const scores = { Alice: [3, 3, 3], Bob: [3, 3, 3] }
    const { winner } = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(['Alice', 'Bob']).toContain(winner)
  })

  it('ignores trailing unplayed holes on a 24-slot scorecard', () => {
    // Only 9 holes played out of 24 — trailing nulls should not cause DNF
    const scores = {
      Alice: [3, 4, 3, 5, 3, 4, 3, 4, 3, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    }
    const { winner, dnf } = calculateResult(['Alice', 'Bob'], scores, 24)
    expect(winner).toBe('Alice')
    expect(dnf).toEqual([])
  })

  it('returns null winner when no holes have been scored', () => {
    const scores = { Alice: Array(24).fill(null) }
    const { winner } = calculateResult(['Alice'], scores, 24)
    expect(winner).toBeNull()
  })
})

// ── finishGame ────────────────────────────────────────────────────────────────

describe('finishGame', () => {
  it('adds completedAt, holesPlayed, winner, and dnf fields', () => {
    const game = createGame(['Alice'])
    game.scores['Alice'][0] = 3
    game.scores['Alice'][1] = 4
    const finished = finishGame(game)
    expect(finished.completedAt).toBeTruthy()
    expect(finished.holesPlayed).toBe(2)
    expect(finished.winner).toBe('Alice')
    expect(finished.dnf).toEqual([])
  })

  it('holesPlayed reflects only holes with at least one score', () => {
    const game = createGame(['Alice', 'Bob'])
    // Play 9 holes, rest are null
    for (let i = 0; i < 9; i++) {
      game.scores['Alice'][i] = 4
      game.scores['Bob'][i] = 5
    }
    const finished = finishGame(game)
    expect(finished.holesPlayed).toBe(9)
  })

  it('preserves original game fields', () => {
    const game = createGame(['Alice'])
    game.scores['Alice'][0] = 3
    const finished = finishGame(game)
    expect(finished.id).toBe(game.id)
    expect(finished.players).toEqual(game.players)
    expect(finished.holes).toBe(24)
  })
})
