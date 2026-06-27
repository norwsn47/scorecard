import { describe, expect, it } from 'vitest'
import { canStartGame, createGame, findDuplicateIndices } from './game.js'

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
  it('returns true when all inputs are valid', () => {
    expect(canStartGame(['Alice', 'Bob'], 2, 9)).toBe(true)
  })

  it('returns false when a required name is empty', () => {
    expect(canStartGame(['Alice', ''], 2, 9)).toBe(false)
  })

  it('returns false when there is a duplicate name', () => {
    expect(canStartGame(['Alice', 'Alice'], 2, 9)).toBe(false)
  })

  it('returns false when holes is 0', () => {
    expect(canStartGame(['Alice'], 1, 0)).toBe(false)
  })

  it('returns false when holes is 25', () => {
    expect(canStartGame(['Alice'], 1, 25)).toBe(false)
  })

  it('returns false when holes is not an integer', () => {
    expect(canStartGame(['Alice'], 1, NaN)).toBe(false)
  })

  it('ignores names beyond the active count', () => {
    // count=2 but names[2] is empty — that slot is not active
    expect(canStartGame(['Alice', 'Bob', ''], 2, 9)).toBe(true)
  })

  it('works for a single player', () => {
    expect(canStartGame(['Alice', '', '', ''], 1, 18)).toBe(true)
  })
})

// ── createGame ────────────────────────────────────────────────────────────────

describe('createGame', () => {
  it('sets players correctly', () => {
    const game = createGame(['Alice', 'Bob'], 9)
    expect(game.players).toEqual(['Alice', 'Bob'])
  })

  it('creates a null-filled scores array per player', () => {
    const game = createGame(['Alice'], 3)
    expect(game.scores['Alice']).toEqual([null, null, null])
  })

  it('scores array length equals hole count', () => {
    const game = createGame(['Alice'], 24)
    expect(game.scores['Alice']).toHaveLength(24)
  })

  it('includes an id and startedAt timestamp', () => {
    const game = createGame(['Alice'], 9)
    expect(game.id).toBeTruthy()
    expect(game.startedAt).toBeTruthy()
  })

  it('stores the hole count', () => {
    const game = createGame(['Alice'], 18)
    expect(game.holes).toBe(18)
  })
})
