import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearActiveGame,
  getActiveGame,
  getCompletedGames,
  getPendingCompletedGames,
  getPlayers,
  isStorageAvailable,
  markCompletedGamePending,
  markCompletedGameRejected,
  markCompletedGameSynced,
  saveActiveGame,
  saveCompletedGame,
  savePlayers,
  updateCompletedGame,
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

describe('markCompletedGameSynced', () => {
  it('sets synced: true on the matching game only', () => {
    saveCompletedGame(COMPLETED_A)
    saveCompletedGame(COMPLETED_B)
    markCompletedGameSynced(COMPLETED_A.id)
    const games = getCompletedGames()
    expect(games.find(g => g.id === COMPLETED_A.id).synced).toBe(true)
    expect(games.find(g => g.id === COMPLETED_B.id).synced).toBeUndefined()
  })

  it('is a no-op when no game matches the id', () => {
    saveCompletedGame(COMPLETED_A)
    markCompletedGameSynced('does-not-exist')
    expect(getCompletedGames()).toEqual([COMPLETED_A])
  })

  it('returns true on success', () => {
    saveCompletedGame(COMPLETED_A)
    expect(markCompletedGameSynced(COMPLETED_A.id)).toBe(true)
  })

  it('clears the pending and rejected markers on the matching game', () => {
    saveCompletedGame({ ...COMPLETED_A, pendingSyncUserId: 'u1', syncRejected: true })
    markCompletedGameSynced(COMPLETED_A.id)
    const [game] = getCompletedGames()
    expect(game.synced).toBe(true)
    expect('pendingSyncUserId' in game).toBe(false)
    expect('syncRejected' in game).toBe(false)
  })

  it('leaves another game\'s markers alone', () => {
    saveCompletedGame({ ...COMPLETED_A, pendingSyncUserId: 'u1' })
    saveCompletedGame({ ...COMPLETED_B, pendingSyncUserId: 'u2', syncRejected: true })
    markCompletedGameSynced(COMPLETED_A.id)
    const b = getCompletedGames().find(g => g.id === COMPLETED_B.id)
    expect(b.pendingSyncUserId).toBe('u2')
    expect(b.syncRejected).toBe(true)
    expect(b.synced).toBeUndefined()
  })

  it('does not throw on corrupt storage', () => {
    localStorage.setItem('gt_completed_games', '!!bad')
    expect(() => markCompletedGameSynced('done-1')).not.toThrow()
    localStorage.setItem('gt_completed_games', JSON.stringify([null, COMPLETED_A]))
    expect(() => markCompletedGameSynced(COMPLETED_A.id)).not.toThrow()
  })
})

describe('markCompletedGamePending', () => {
  it('tags the matching game with the user id and stores the trimmed notes', () => {
    saveCompletedGame(COMPLETED_A)
    saveCompletedGame(COMPLETED_B)
    expect(markCompletedGamePending(COMPLETED_A.id, 'u1', '  Windy  ')).toBe(true)
    const games = getCompletedGames()
    const a = games.find(g => g.id === COMPLETED_A.id)
    expect(a.pendingSyncUserId).toBe('u1')
    expect(a.notes).toBe('Windy')
    // The other round is untouched.
    expect(games.find(g => g.id === COMPLETED_B.id)).toEqual(COMPLETED_B)
  })

  it('leaves synced alone (never sets it, never clears it)', () => {
    saveCompletedGame(COMPLETED_A)
    markCompletedGamePending(COMPLETED_A.id, 'u1', '')
    expect(getCompletedGames()[0].synced).toBeUndefined()
  })

  it('stores null for blank notes', () => {
    saveCompletedGame({ ...COMPLETED_A, notes: 'old' })
    markCompletedGamePending(COMPLETED_A.id, 'u1', '   ')
    expect(getCompletedGames()[0].notes).toBeNull()
    markCompletedGamePending(COMPLETED_A.id, 'u1', undefined)
    expect(getCompletedGames()[0].notes).toBeNull()
  })

  it('is a no-op that returns false when no game matches the id', () => {
    saveCompletedGame(COMPLETED_A)
    expect(markCompletedGamePending('does-not-exist', 'u1', 'x')).toBe(false)
    expect(getCompletedGames()).toEqual([COMPLETED_A])
  })

  it('refuses to write a marker with no owner', () => {
    saveCompletedGame(COMPLETED_A)
    expect(markCompletedGamePending(COMPLETED_A.id, undefined, '')).toBe(false)
    expect(markCompletedGamePending(COMPLETED_A.id, '', '')).toBe(false)
    expect(getCompletedGames()).toEqual([COMPLETED_A])
  })

  it('does not throw on corrupt storage', () => {
    localStorage.setItem('gt_completed_games', '!!bad')
    expect(markCompletedGamePending('done-1', 'u1', '')).toBe(false)
    localStorage.setItem('gt_completed_games', JSON.stringify([null, COMPLETED_A]))
    expect(() => markCompletedGamePending(COMPLETED_A.id, 'u1', '')).not.toThrow()
  })
})

describe('markCompletedGameRejected', () => {
  it('sets syncRejected on the matching game and keeps its pending marker', () => {
    saveCompletedGame({ ...COMPLETED_A, pendingSyncUserId: 'u1' })
    saveCompletedGame(COMPLETED_B)
    expect(markCompletedGameRejected(COMPLETED_A.id)).toBe(true)
    const games = getCompletedGames()
    const a = games.find(g => g.id === COMPLETED_A.id)
    expect(a.syncRejected).toBe(true)
    expect(a.pendingSyncUserId).toBe('u1')
    expect(games.find(g => g.id === COMPLETED_B.id)).toEqual(COMPLETED_B)
  })

  it('is a no-op that returns false when no game matches the id', () => {
    saveCompletedGame(COMPLETED_A)
    expect(markCompletedGameRejected('does-not-exist')).toBe(false)
    expect(getCompletedGames()).toEqual([COMPLETED_A])
  })

  it('does not throw on corrupt storage', () => {
    localStorage.setItem('gt_completed_games', '!!bad')
    expect(markCompletedGameRejected('done-1')).toBe(false)
    localStorage.setItem('gt_completed_games', JSON.stringify([null, COMPLETED_A]))
    expect(() => markCompletedGameRejected(COMPLETED_A.id)).not.toThrow()
  })
})

describe('getPendingCompletedGames', () => {
  it('returns only rounds tagged with the given user id', () => {
    saveCompletedGame({ ...COMPLETED_A, pendingSyncUserId: 'u1' })
    saveCompletedGame(COMPLETED_B)
    expect(getPendingCompletedGames('u1').map(g => g.id)).toEqual([COMPLETED_A.id])
  })

  it('never returns a round with no marker, or another user\'s round (shared device)', () => {
    saveCompletedGame(COMPLETED_A) // quick-play, no marker
    saveCompletedGame({ ...COMPLETED_B, pendingSyncUserId: 'u2' })
    expect(getPendingCompletedGames('u1')).toEqual([])
    expect(getPendingCompletedGames('u2').map(g => g.id)).toEqual([COMPLETED_B.id])
  })

  it('a synced round is not pending', () => {
    saveCompletedGame({ ...COMPLETED_A, pendingSyncUserId: 'u1' })
    markCompletedGameSynced(COMPLETED_A.id)
    expect(getPendingCompletedGames('u1')).toEqual([])
  })

  it('includes rejected rounds, so callers can tell them apart', () => {
    saveCompletedGame({ ...COMPLETED_A, pendingSyncUserId: 'u1', syncRejected: true })
    expect(getPendingCompletedGames('u1')).toHaveLength(1)
    expect(getPendingCompletedGames('u1')[0].syncRejected).toBe(true)
  })

  it('returns [] for a missing user id, even when rounds carry markers', () => {
    saveCompletedGame({ ...COMPLETED_A, pendingSyncUserId: 'u1' })
    expect(getPendingCompletedGames(undefined)).toEqual([])
    expect(getPendingCompletedGames(null)).toEqual([])
    expect(getPendingCompletedGames('')).toEqual([])
  })

  it('returns [] on empty or corrupt storage, and skips junk entries', () => {
    expect(getPendingCompletedGames('u1')).toEqual([])
    localStorage.setItem('gt_completed_games', '!!bad')
    expect(getPendingCompletedGames('u1')).toEqual([])
    localStorage.setItem('gt_completed_games', JSON.stringify([null, { ...COMPLETED_A, pendingSyncUserId: 'u1' }]))
    expect(getPendingCompletedGames('u1')).toHaveLength(1)
  })
})

describe('updateCompletedGame', () => {
  it('overwrites the matching record in place', () => {
    saveCompletedGame(COMPLETED_A)
    updateCompletedGame(COMPLETED_A.id, { winner: 'Bob', scores: { Alice: [9, 9, 9], Bob: [1, 1, 1] } })
    const updated = getCompletedGames().find(g => g.id === COMPLETED_A.id)
    expect(updated.winner).toBe('Bob')
    expect(updated.scores.Bob).toEqual([1, 1, 1])
  })

  it('merges — fields not passed are kept', () => {
    saveCompletedGame(COMPLETED_A)
    updateCompletedGame(COMPLETED_A.id, { notes: 'windy day' })
    const updated = getCompletedGames().find(g => g.id === COMPLETED_A.id)
    expect(updated.notes).toBe('windy day')
    expect(updated.players).toEqual(['Alice', 'Bob'])
  })

  it('pins the id even if a different id is passed in the update', () => {
    saveCompletedGame(COMPLETED_A)
    updateCompletedGame(COMPLETED_A.id, { id: 'hacked', winner: 'Bob' })
    const games = getCompletedGames()
    expect(games).toHaveLength(1)
    expect(games[0].id).toBe(COMPLETED_A.id)
  })

  it('preserves list order and leaves other records untouched', () => {
    saveCompletedGame(COMPLETED_A)
    saveCompletedGame(COMPLETED_B) // B is now first
    updateCompletedGame(COMPLETED_A.id, { winner: 'Bob' })
    const games = getCompletedGames()
    expect(games[0].id).toBe(COMPLETED_B.id)
    expect(games[1].id).toBe(COMPLETED_A.id)
    expect(games[0]).toEqual(COMPLETED_B)
  })

  it('returns false and writes nothing when no record matches the id', () => {
    saveCompletedGame(COMPLETED_A)
    expect(updateCompletedGame('does-not-exist', { winner: 'Bob' })).toBe(false)
    expect(getCompletedGames()).toEqual([COMPLETED_A])
  })
})
