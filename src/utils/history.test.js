import { describe, expect, it } from 'vitest'
import { normalizeDbGame, normalizeLocalGame } from './history.js'

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
