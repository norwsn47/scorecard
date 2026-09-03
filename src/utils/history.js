import { deriveResult } from './game.js'
import { deriveHolePars } from './scores.js'

/**
 * Maps a D1 `games` row (as returned by `GET /api/games`) into the shape the
 * app's read surfaces expect. The result (winner / Tied / No winner, DNF) and
 * the par array are both re-derived on read — the stored winner/dnf on a saved
 * round are legacy and not authoritative (PRD §4.4), and `hole_pars` arrives
 * as raw JSON TEXT (or null for a pre-003 round).
 */
export function normalizeDbGame(row) {
  const playerData = typeof row.player_data === 'string'
    ? JSON.parse(row.player_data)
    : (row.player_data ?? [])

  const players = playerData.map(p => p.name)
  const scores  = {}
  playerData.forEach(p => { scores[p.name] = p.scores ?? [] })

  const game = {
    id:          row.id,
    completedAt: row.played_at,
    holesPlayed: row.holes_played,
    // Hole count for the edit grid: the round's own course length when the
    // GET join can supply it (`course_holes`), else the holes actually played
    // — so editing a completed 9/18-hole round rebuilds at 9/18 rows, while a
    // partial round on a 36-hole course can still be extended toward 36.
    holes:       row.course_holes ?? row.holes_played,
    courseId:    row.course_id || null,
    courseName:  row.course_name || null,
    notes:       row.notes || null,
    players,
    scores,
    holePars:    deriveHolePars(row.hole_pars, row.holes_played),
    _fromDb:     true,
  }
  return { ...game, ...deriveResult(game) }
}

/** Re-derives the result and normalises the par array for a local record. */
export function normalizeLocalGame(game) {
  const holeCount = game.holesPlayed ?? game.holes ?? 36
  return {
    ...game,
    holePars: deriveHolePars(game.holePars, holeCount),
    ...deriveResult(game),
  }
}
