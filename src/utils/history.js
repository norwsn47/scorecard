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
    // The local round's own id when the round was saved from this app (the
    // server's idempotency key). History matches a pending local round to its
    // D1 row through this so the round never shows twice (PRD §11.9).
    clientRoundId: row.client_round_id ?? null,
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

/**
 * A local round still waiting to be saved to D1 (BACKLOG #95, PRD §11.9), as
 * History lists it: the normal local shape, tagged `_pending` and, when the
 * server permanently refused it, `_rejected`. The tags are display hints only;
 * the marker on the stored record (`pendingSyncUserId`) stays the source of truth.
 */
export function normalizePendingGame(record) {
  return { ...normalizeLocalGame(record), _pending: true, _rejected: !!record.syncRejected }
}

function playedTime(g) {
  const t = Date.parse(g?.completedAt)
  return Number.isNaN(t) ? -Infinity : t
}

/**
 * Merges the signed-in user's pending local rounds into their D1 rounds for
 * History (PRD §11.9): newest played date first, ties keeping D1 rows ahead of
 * pending ones and each list's own order. A pending round whose id equals the
 * `clientRoundId` of a D1 row is dropped, because the server already holds it
 * (saved, but the marker is not cleared yet), so a round never appears twice.
 *
 * Pending rounds are added on top of whatever the D1 list holds: this never
 * truncates, so they are never counted toward or evicted by the server's
 * 100-row cap.
 */
export function mergePendingGames(dbGames, pendingGames) {
  const onServer = new Set(dbGames.map(g => g.clientRoundId).filter(Boolean))
  const extra = pendingGames.filter(p => !onServer.has(p.id))
  return [...dbGames, ...extra].sort((a, b) => {
    const ta = playedTime(a)
    const tb = playedTime(b)
    return ta === tb ? 0 : tb > ta ? 1 : -1
  })
}
