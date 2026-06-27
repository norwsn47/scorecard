import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearActiveGame,
  getActiveGame,
  getCompletedGames,
  getPlayers,
  isStorageAvailable,
  saveActiveGame,
  saveCompletedGame,
  savePlayers,
} from './storage.js'

beforeEach(() => {
  localStorage.clear()
})

// ── isStorageAvailable ────────────────────────────────────────────────────────

describe('isStorageAvailable', () => {
  it('returns true in jsdom (normal environment)', () => {
    expect(isStorageAvailable()).toBe(true)
  })
})

// ── Players ──────────────────────────────────────────────────────────────────

describe('getPlayers', () => {
  it('returns empty array when storage is empty', () => {
    expect(getPlayers()).toEqual([])
  })

  it('returns saved player names', () => {
    savePlayers(['Alice', 'Bob'])
    expect(getPlayers()).toEqual(['Alice', 'Bob'])
  })

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem('gt_players', JSON.stringify({ bad: 'data' }))
    expect(getPlayers()).toEqual([])
  })

  it('returns empty array when stored value is corrupted JSON', () => {
    localStorage.setItem('gt_players', 'not-json{{')
    expect(getPlayers()).toEqual([])
  })
})

describe('savePlayers', () => {
  it('persists an array of names', () => {
    savePlayers(['Alice', 'Bob', 'Carol'])
    expect(getPlayers()).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('overwrites the previous list', () => {
    savePlayers(['Alice'])
    savePlayers(['Dave'])
    expect(getPlayers()).toEqual(['Dave'])
  })

  it('returns true on success', () => {
    expect(savePlayers(['Alice'])).toBe(true)
  })
})

// ── Active game ───────────────────────────────────────────────────────────────

const GAME_A = {
  id: 'game-1',
  startedAt: '2026-06-27T12:00:00.000Z',
  players: ['Alice', 'Bob'],
  holes: 9,
  scores: { Alice: [null, null], Bob: [null, null] },
}

describe('getActiveGame', () => {
  it('returns null when storage is empty', () => {
    expect(getActiveGame()).toBeNull()
  })

  it('returns the saved game object', () => {
    saveActiveGame(GAME_A)
    expect(getActiveGame()).toEqual(GAME_A)
  })

  it('returns null when stored value is corrupted JSON', () => {
    localStorage.setItem('gt_active_game', 'bad{json')
    expect(getActiveGame()).toBeNull()
  })

  it('returns null when stored value is an array (unexpected shape)', () => {
    localStorage.setItem('gt_active_game', JSON.stringify([1, 2, 3]))
    expect(getActiveGame()).toBeNull()
  })
})

describe('saveActiveGame', () => {
  it('persists the game and returns true', () => {
    expect(saveActiveGame(GAME_A)).toBe(true)
    expect(getActiveGame()).toEqual(GAME_A)
  })

  it('overwrites a previous active game', () => {
    saveActiveGame(GAME_A)
    const updated = { ...GAME_A, holes: 18 }
    saveActiveGame(updated)
    expect(getActiveGame().holes).toBe(18)
  })
})

describe('clearActiveGame', () => {
  it('removes the active game and returns true', () => {
    saveActiveGame(GAME_A)
    expect(clearActiveGame()).toBe(true)
    expect(getActiveGame()).toBeNull()
  })

  it('is safe to call when there is no active game', () => {
    expect(clearActiveGame()).toBe(true)
    expect(getActiveGame()).toBeNull()
  })
})

// ── Completed games ───────────────────────────────────────────────────────────

const COMPLETED_A = {
  id: 'done-1',
  completedAt: '2026-06-27T13:00:00.000Z',
  players: ['Alice', 'Bob'],
  holes: 9,
  scores: { Alice: [3, 4, 5], Bob: [4, 4, 4] },
  winner: 'Alice',
  dnf: [],
}

const COMPLETED_B = {
  id: 'done-2',
  completedAt: '2026-06-27T14:00:00.000Z',
  players: ['Carol'],
  holes: 9,
  scores: { Carol: [5, 5, 5] },
  winner: 'Carol',
  dnf: [],
}

describe('getCompletedGames', () => {
  it('returns empty array when storage is empty', () => {
    expect(getCompletedGames()).toEqual([])
  })

  it('returns saved completed games', () => {
    saveCompletedGame(COMPLETED_A)
    expect(getCompletedGames()).toHaveLength(1)
    expect(getCompletedGames()[0]).toEqual(COMPLETED_A)
  })

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem('gt_completed_games', JSON.stringify({ bad: 'data' }))
    expect(getCompletedGames()).toEqual([])
  })

  it('returns empty array when stored value is corrupted JSON', () => {
    localStorage.setItem('gt_completed_games', '!!bad')
    expect(getCompletedGames()).toEqual([])
  })
})

describe('saveCompletedGame', () => {
  it('prepends the new game (most recent first)', () => {
    saveCompletedGame(COMPLETED_A)
    saveCompletedGame(COMPLETED_B)
    const games = getCompletedGames()
    expect(games[0]).toEqual(COMPLETED_B)
    expect(games[1]).toEqual(COMPLETED_A)
  })

  it('accumulates multiple games without overwriting', () => {
    saveCompletedGame(COMPLETED_A)
    saveCompletedGame(COMPLETED_B)
    expect(getCompletedGames()).toHaveLength(2)
  })

  it('returns true on success', () => {
    expect(saveCompletedGame(COMPLETED_A)).toBe(true)
  })
})
