import { describe, expect, it } from 'vitest'
import { mergePendingGames, normalizeDbGame, normalizeLocalGame, normalizePendingGame } from './history.js'

describe('normalizeDbGame', () => {
  const row = {
    id: 'row-1',
    played_at: '2026-08-01T10:00:00.000Z',
    holes_played: 3,
    course_id: 'c1',
    course_name: 'Bruntsfield Short Hole Golf Course',
    notes: 'windy',
    player_data: JSON.stringify([
      { name: 'Ann', scores: [3, 3, 3], total: 9, dnf: false },
      { name: 'Bo', scores: [4, 4, 4], total: 12, dnf: false },
    ]),
    hole_pars: JSON.stringify([3, 4, 3]),
  }

  it('maps the row and re-derives the result from the scores', () => {
    const g = normalizeDbGame(row)
    expect(g.players).toEqual(['Ann', 'Bo'])
    expect(g.scores.Ann).toEqual([3, 3, 3])
    expect(g.winner).toBe('Ann')
    expect(g.winners).toEqual(['Ann'])
    expect(g.completedAt).toBe('2026-08-01T10:00:00.000Z')
    expect(g.courseName).toBe('Bruntsfield Short Hole Golf Course')
    expect(g._fromDb).toBe(true)
  })

  it('parses hole_pars to an array of holes_played length', () => {
    expect(normalizeDbGame(row).holePars).toEqual([3, 4, 3])
  })

  it('uses course_holes for the edit-grid hole count when the join supplies it', () => {
    expect(normalizeDbGame({ ...row, course_holes: 9 }).holes).toBe(9)
  })

  it('falls back to holes_played for the hole count when course_holes is absent', () => {
    expect(normalizeDbGame(row).holes).toBe(3)
  })

  it('carries client_round_id through as clientRoundId, or null when the row has none', () => {
    expect(normalizeDbGame({ ...row, client_round_id: 'local-1' }).clientRoundId).toBe('local-1')
    expect(normalizeDbGame(row).clientRoundId).toBeNull()
    expect(normalizeDbGame({ ...row, client_round_id: null }).clientRoundId).toBeNull()
  })

  it('reads a null hole_pars (pre-003 round) as par 3 per hole', () => {
    const g = normalizeDbGame({ ...row, hole_pars: null })
    expect(g.holePars).toEqual([3, 3, 3])
  })

  it('re-derives the result rather than trusting stored dnf flags', () => {
    const tied = {
      ...row,
      player_data: JSON.stringify([
        { name: 'Ann', scores: [3, 3, 3], total: 9, dnf: true },
        { name: 'Bo', scores: [3, 3, 3], total: 9, dnf: false },
      ]),
    }
    const g = normalizeDbGame(tied)
    expect(g.winners).toEqual(['Ann', 'Bo'])
    expect(g.isDraw).toBe(true)
    expect(g.dnf).toEqual([])
  })
})

describe('normalizeLocalGame', () => {
  it('re-derives the result and normalises holePars', () => {
    const local = {
      id: 'local-1',
      players: ['Ann', 'Bo'],
      holesPlayed: 3,
      holes: 36,
      scores: { Ann: [3, 3, 3], Bo: [4, 4, 4] },
      winner: 'Bo', // stale stored value
      holePars: [3, 4, 3],
    }
    const g = normalizeLocalGame(local)
    expect(g.winner).toBe('Ann')
    expect(g.holePars).toEqual([3, 4, 3])
    expect(g.id).toBe('local-1')
  })

  it('fills a missing holePars with par 3', () => {
    const local = {
      id: 'local-2',
      players: ['Ann', 'Bo'],
      holesPlayed: 2,
      scores: { Ann: [3, 3], Bo: [4, 4] },
    }
    expect(normalizeLocalGame(local).holePars).toEqual([3, 3])
  })
})

describe('normalizePendingGame', () => {
  const local = {
    id: 'p1',
    players: ['Ann'],
    holesPlayed: 2,
    scores: { Ann: [3, 3] },
    pendingSyncUserId: 'u1',
  }

  it('tags a pending round _pending and keeps the local shape (no _fromDb)', () => {
    const g = normalizePendingGame(local)
    expect(g).toMatchObject({ id: 'p1', _pending: true, _rejected: false, pendingSyncUserId: 'u1' })
    expect(g._fromDb).toBeUndefined()
    expect(g.holePars).toEqual([3, 3])
  })

  it('tags a permanently refused round _rejected', () => {
    expect(normalizePendingGame({ ...local, syncRejected: true })).toMatchObject({ _pending: true, _rejected: true })
  })
})

describe('mergePendingGames', () => {
  const db = (id, completedAt, clientRoundId = null) => ({ id, completedAt, clientRoundId, _fromDb: true })
  const pend = (id, completedAt) => ({ id, completedAt, _pending: true })

  it('orders the two lists together by played date, newest first', () => {
    const merged = mergePendingGames(
      [db('d1', '2026-08-03T10:00:00Z'), db('d2', '2026-08-01T10:00:00Z')],
      [pend('p1', '2026-08-02T10:00:00Z'), pend('p2', '2026-08-04T10:00:00Z')],
    )
    expect(merged.map(g => g.id)).toEqual(['p2', 'd1', 'p1', 'd2'])
  })

  it('drops a pending round whose id is a D1 row\'s clientRoundId, keeping the D1 row', () => {
    const merged = mergePendingGames(
      [db('d1', '2026-08-03T10:00:00Z', 'p1')],
      [pend('p1', '2026-08-03T10:00:00Z'), pend('p2', '2026-08-02T10:00:00Z')],
    )
    expect(merged.map(g => g.id)).toEqual(['d1', 'p2'])
  })

  it('keeps every pending round alongside a full 100-row D1 list, however old', () => {
    const rows = Array.from({ length: 100 }, (_, i) => db(`d${i}`, new Date(Date.UTC(2026, 7, 20, 10, 0, 0) - i * 3600000).toISOString()))
    const merged = mergePendingGames(rows, [pend('p1', '2025-01-01T10:00:00Z'), pend('p2', '2025-01-02T10:00:00Z')])
    expect(merged).toHaveLength(102)
    expect(merged.slice(-2).map(g => g.id)).toEqual(['p2', 'p1'])
  })

  it('is stable: equal dates keep D1 rows first, then pending, each in their own order', () => {
    const t = '2026-08-01T10:00:00Z'
    const merged = mergePendingGames([db('d1', t), db('d2', t)], [pend('p1', t), pend('p2', t)])
    expect(merged.map(g => g.id)).toEqual(['d1', 'd2', 'p1', 'p2'])
  })

  it('sinks a round with an unreadable date to the bottom instead of throwing', () => {
    const merged = mergePendingGames([db('d1', '2026-08-01T10:00:00Z')], [pend('p1', 'not a date'), pend('p2', undefined)])
    expect(merged.map(g => g.id)).toEqual(['d1', 'p1', 'p2'])
  })

  it('does not mutate its inputs', () => {
    const rows = [db('d1', '2026-08-01T10:00:00Z')]
    const pending = [pend('p1', '2026-08-02T10:00:00Z')]
    mergePendingGames(rows, pending)
    expect(rows.map(g => g.id)).toEqual(['d1'])
    expect(pending.map(g => g.id)).toEqual(['p1'])
  })
})
