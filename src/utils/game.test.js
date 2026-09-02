import { describe, expect, it } from 'vitest'
import { buildEditGame, calculateResult, canStartGame, computeDisplayedHoles, createGame, deriveResult, findDuplicateIndices, finishGame } from './game.js'

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

  it('creates a null-filled scores array per player with 36 slots', () => {
    const game = createGame(['Alice'])
    expect(game.scores['Alice']).toHaveLength(36)
    expect(game.scores['Alice'].every(s => s === null)).toBe(true)
  })

  it('includes an id and startedAt timestamp', () => {
    const game = createGame(['Alice'])
    expect(game.id).toBeTruthy()
    expect(game.startedAt).toBeTruthy()
  })

  it('stores holes as 36', () => {
    const game = createGame(['Alice'])
    expect(game.holes).toBe(36)
  })

  it('defaults holePars to a length-36 array of par 3', () => {
    const game = createGame(['Alice'])
    expect(game.holePars).toHaveLength(36)
    expect(game.holePars.every(p => p === 3)).toBe(true)
  })

  it('carries a supplied holePars, normalised to 36 entries', () => {
    const pars = Array(36).fill(3)
    pars[0] = 4
    const game = createGame(['Alice'], null, null, null, pars)
    expect(game.holePars[0]).toBe(4)
    expect(game.holePars).toHaveLength(36)
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

  it('keeps later holes visible when a middle hole is reset to empty', () => {
    // Holes 0-2 were all scored, then hole 1 got cleared back to null
    // for both players (e.g. the player tapped "reset" on that hole).
    const scores = { Alice: [3, null, 3], Bob: [4, null, 4] }
    expect(computeDisplayedHoles(['Alice', 'Bob'], scores, 3)).toBe(3)
  })

  it('keeps the last hole visible when only one player has scored it', () => {
    // Alice has entered hole 2's score, Bob hasn't yet — the row must
    // still show, not disappear because Bob is incomplete on it.
    const scores = { Alice: [3, 4, 5], Bob: [3, 4, null] }
    expect(computeDisplayedHoles(['Alice', 'Bob'], scores, 3)).toBe(3)
  })

  it('only counts one player having reset a hole as still incomplete for that hole, but keeps a later fully-scored hole visible', () => {
    // Alice reset hole 1, Bob did not — hole 1 is still incomplete,
    // but hole 2 (fully scored by both) must remain visible.
    const scores = { Alice: [3, null, 3], Bob: [4, 5, 4] }
    expect(computeDisplayedHoles(['Alice', 'Bob'], scores, 3)).toBe(3)
  })
})

// ── calculateResult ───────────────────────────────────────────────────────────

describe('calculateResult', () => {
  it('identifies the player with the lowest total as the outright winner', () => {
    const scores = { Alice: [3, 3, 3], Bob: [4, 4, 4] }
    const r = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(r.winner).toBe('Alice')
    expect(r.winners).toEqual(['Alice'])
    expect(r.isDraw).toBe(false)
    expect(r.winningTotal).toBe(9)
  })

  it('returns no winner when every player DNF', () => {
    const scores = { Alice: [null, 3, 3], Bob: [3, null, 3] }
    const r = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(r.winner).toBeNull()
    expect(r.winners).toEqual([])
    expect(r.isDraw).toBe(false)
    expect(r.dnf).toEqual(['Alice', 'Bob'])
  })

  it('marks players with any null score (within active holes) as DNF', () => {
    const scores = { Alice: [3, 3, 3], Bob: [4, null, 4] }
    const { dnf } = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(dnf).toContain('Bob')
    expect(dnf).not.toContain('Alice')
  })

  it('excludes DNF players from the winner calculation', () => {
    const scores = { Alice: [5, 5, 5], Bob: [1, null, 1] }
    const { winner } = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(winner).toBe('Alice')
  })

  it('treats a single finisher among several players as the outright winner', () => {
    const scores = { Alice: [4, 4, 4], Bob: [5, null, 5] }
    const r = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(r.winners).toEqual(['Alice'])
    expect(r.isDraw).toBe(false)
  })

  it('returns joint first (a draw) when two finishers are level on the lowest total', () => {
    const scores = { Alice: [3, 3, 3], Bob: [3, 3, 3], Carol: [4, 4, 4] }
    const r = calculateResult(['Alice', 'Bob', 'Carol'], scores, 3)
    expect(r.winners).toEqual(['Alice', 'Bob'])
    expect(r.winner).toBe('Alice')
    expect(r.isDraw).toBe(true)
    expect(r.winningTotal).toBe(9)
    expect(r.dnf).toEqual([])
  })

  it('handles a three-way draw', () => {
    const scores = { Alice: [3, 3], Bob: [3, 3], Carol: [3, 3] }
    const r = calculateResult(['Alice', 'Bob', 'Carol'], scores, 2)
    expect(r.winners).toEqual(['Alice', 'Bob', 'Carol'])
    expect(r.isDraw).toBe(true)
  })

  it('handles four or more players level on the lowest total', () => {
    const scores = {
      Alice: [2, 2], Bob: [2, 2], Carol: [2, 2], Dave: [2, 2], Erin: [5, 5],
    }
    const r = calculateResult(['Alice', 'Bob', 'Carol', 'Dave', 'Erin'], scores, 2)
    expect(r.winners).toEqual(['Alice', 'Bob', 'Carol', 'Dave'])
    expect(r.isDraw).toBe(true)
  })

  it('keeps winners in players-array order', () => {
    const scores = { Zoe: [3, 3], Amy: [3, 3] }
    const r = calculateResult(['Zoe', 'Amy'], scores, 2)
    expect(r.winners).toEqual(['Zoe', 'Amy'])
  })

  it('marks a player DNF when a middle hole is reset to empty mid-round', () => {
    const scores = { Alice: [3, null, 3], Bob: [4, 4, 4] }
    const r = calculateResult(['Alice', 'Bob'], scores, 3)
    expect(r.dnf).toEqual(['Alice'])
    expect(r.winners).toEqual(['Bob'])
  })

  it('ignores trailing unplayed holes on a 36-slot scorecard', () => {
    // Only 9 holes played out of 36 — trailing nulls should not cause DNF
    const scores = {
      Alice: [3, 4, 3, 5, 3, 4, 3, 4, 3, ...Array(27).fill(null)],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, ...Array(27).fill(null)],
    }
    const { winner, dnf } = calculateResult(['Alice', 'Bob'], scores, 36)
    expect(winner).toBe('Alice')
    expect(dnf).toEqual([])
  })

  it('returns no winner when no holes have been scored', () => {
    const scores = { Alice: Array(36).fill(null), Bob: Array(36).fill(null) }
    const r = calculateResult(['Alice', 'Bob'], scores, 36)
    expect(r.winner).toBeNull()
    expect(r.winners).toEqual([])
    expect(r.dnf).toEqual(['Alice', 'Bob'])
  })

  it('has no result concept for a solo round', () => {
    const scores = { Alice: [3, 3, 3] }
    const r = calculateResult(['Alice'], scores, 3)
    expect(r.winners).toEqual([])
    expect(r.winner).toBeNull()
    expect(r.isDraw).toBe(false)
    expect(r.dnf).toEqual([])
    expect(r.winningTotal).toBeNull()
  })
})

// ── deriveResult ─────────────────────────────────────────────────────────────

describe('deriveResult', () => {
  it('re-derives the result from a saved-game shape, ignoring stored winner/dnf', () => {
    const saved = {
      players: ['Alice', 'Bob'],
      holesPlayed: 3,
      holes: 36,
      scores: { Alice: [3, 3, 3], Bob: [3, 3, 3] },
      winner: 'Alice', // legacy stored value — must not be trusted
      dnf: ['Bob'],
    }
    const r = deriveResult(saved)
    expect(r.winners).toEqual(['Alice', 'Bob'])
    expect(r.isDraw).toBe(true)
    expect(r.dnf).toEqual([])
  })

  it('uses holesPlayed to scope the result', () => {
    const saved = {
      players: ['Alice', 'Bob'],
      holesPlayed: 2,
      scores: { Alice: [3, 3, 9], Bob: [4, 4, 1] },
    }
    // Only the first two holes count: Alice 6, Bob 8
    expect(deriveResult(saved).winner).toBe('Alice')
  })

  it('is idempotent on an already-finished game', () => {
    const game = createGame(['Alice', 'Bob'])
    game.scores.Alice[0] = 3
    game.scores.Bob[0] = 4
    const finished = finishGame(game)
    const r = deriveResult(finished)
    expect(r.winner).toBe('Alice')
    expect(r.winners).toEqual(['Alice'])
  })
})

// ── finishGame ────────────────────────────────────────────────────────────────

describe('finishGame', () => {
  it('adds completedAt, holesPlayed and the result fields', () => {
    const game = createGame(['Alice', 'Bob'])
    game.scores['Alice'][0] = 3
    game.scores['Alice'][1] = 4
    game.scores['Bob'][0] = 5
    game.scores['Bob'][1] = 5
    const finished = finishGame(game)
    expect(finished.completedAt).toBeTruthy()
    expect(finished.holesPlayed).toBe(2)
    expect(finished.winner).toBe('Alice')
    expect(finished.winners).toEqual(['Alice'])
    expect(finished.isDraw).toBe(false)
    expect(finished.winningTotal).toBe(7)
    expect(finished.dnf).toEqual([])
  })

  it('stamps a draw when two finishers are level', () => {
    const game = createGame(['Alice', 'Bob'])
    game.scores['Alice'][0] = 4
    game.scores['Bob'][0] = 4
    const finished = finishGame(game)
    expect(finished.winners).toEqual(['Alice', 'Bob'])
    expect(finished.isDraw).toBe(true)
  })

  it('snapshots holePars sliced to holesPlayed', () => {
    const pars = Array(36).fill(3)
    pars[1] = 5
    const game = createGame(['Alice', 'Bob'], null, null, null, pars)
    game.scores['Alice'][0] = 3
    game.scores['Alice'][1] = 3
    game.scores['Bob'][0] = 4
    game.scores['Bob'][1] = 4
    const finished = finishGame(game)
    expect(finished.holePars).toEqual([3, 5])
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
    expect(finished.holes).toBe(36)
  })
})

// ── buildEditGame ─────────────────────────────────────────────────────────────

describe('buildEditGame', () => {
  const existing = {
    id: 'row-abc',
    _fromDb: true,
    completedAt: '2026-01-01T12:00:00.000Z',
    holesPlayed: 3,
    winner: 'Bob',
    dnf: [],
    courseId: 'course-1',
    courseName: 'Old Course',
    players: ['Alice', 'Bob'],
    scores: { Alice: [5, 5, 5], Bob: [3, 3, 3] },
  }

  it('remaps scores positionally when a player is renamed', () => {
    const game = buildEditGame(existing, ['Alice', 'Robert'], 'course-1', 'Old Course', '2026-01-01T12:00:00.000Z')
    expect(game.players).toEqual(['Alice', 'Robert'])
    expect(game.scores.Robert.slice(0, 3)).toEqual([3, 3, 3])
    expect(game.scores.Alice.slice(0, 3)).toEqual([5, 5, 5])
    expect(game.scores.Bob).toBeUndefined()
  })

  it('pads each score row to 36 slots', () => {
    const game = buildEditGame(existing, ['Alice', 'Bob'])
    expect(game.scores.Alice).toHaveLength(36)
    expect(game.scores.Alice.slice(3).every(s => s === null)).toBe(true)
    expect(game.holes).toBe(36)
  })

  it('pins the original id', () => {
    const game = buildEditGame(existing, ['Alice', 'Bob'])
    expect(game.id).toBe('row-abc')
  })

  it("keeps the round's own holePars snapshot by default, padded to 36", () => {
    const game = buildEditGame({ ...existing, holePars: [3, 4, 5] }, ['Alice', 'Bob'])
    expect(game.holePars.slice(0, 3)).toEqual([3, 4, 5])
    expect(game.holePars).toHaveLength(36)
    expect(game.holePars.slice(3).every(p => p === 3)).toBe(true)
  })

  it('adopts a supplied holePars when a D1 edit switches course', () => {
    const game = buildEditGame({ ...existing, holePars: [3, 3, 3] }, ['Alice', 'Bob'], 'course-9', 'New Links', null, [4, 4, 4])
    expect(game.holePars.slice(0, 3)).toEqual([4, 4, 4])
  })

  it('defaults holePars to par 3 when the round has none', () => {
    const game = buildEditGame(existing, ['Alice', 'Bob'])
    expect(game.holePars).toHaveLength(36)
    expect(game.holePars.every(p => p === 3)).toBe(true)
  })

  it('sets pastDate so finishGame stamps the chosen date', () => {
    const game = buildEditGame(existing, ['Alice', 'Bob'], null, null, '2025-07-04T12:00:00.000Z')
    expect(game.pastDate).toBe('2025-07-04T12:00:00.000Z')
    const finished = finishGame(game)
    expect(finished.completedAt).toBe('2025-07-04T12:00:00.000Z')
  })

  it('updates course id and name', () => {
    const game = buildEditGame(existing, ['Alice', 'Bob'], 'course-9', 'New Links')
    expect(game.courseId).toBe('course-9')
    expect(game.courseName).toBe('New Links')
  })

  it('recalculates winner and totals via finishGame after a score edit', () => {
    const game = buildEditGame(existing, ['Alice', 'Bob'], 'course-1', 'Old Course', existing.completedAt)
    // Alice birdies every hole in the edit — she should now win
    game.scores.Alice[0] = 1
    game.scores.Alice[1] = 1
    game.scores.Alice[2] = 1
    const finished = finishGame(game)
    expect(finished.winner).toBe('Alice')
    expect(finished.holesPlayed).toBe(3)
    expect(finished.dnf).toEqual([])
  })

  it('carries an edited player to DNF when a score is cleared', () => {
    const game = buildEditGame(existing, ['Alice', 'Bob'], 'course-1', 'Old Course', existing.completedAt)
    game.scores.Bob[1] = null
    const finished = finishGame(game)
    expect(finished.dnf).toContain('Bob')
    expect(finished.winner).toBe('Alice')
  })
})
