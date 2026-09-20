/**
 * Returns false in private browsing or when the user has blocked storage.
 */
export function isStorageAvailable() {
  try {
    const k = '__gt_test__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

const KEYS = {
  PLAYERS:         'gt_players',
  ACTIVE_GAME:     'gt_active_game',
  COMPLETED_GAMES: 'gt_completed_games',
  ACTIVE_CELL:     'gt_active_cell',
}

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Covers quota exceeded and private-browsing restrictions
    return false
  }
}

// ── Players ────────────────────────────────────────────────────────────────

export function getPlayers() {
  const result = safeRead(KEYS.PLAYERS, [])
  return Array.isArray(result) ? result : []
}

export function savePlayers(names) {
  return safeWrite(KEYS.PLAYERS, names)
}

// ── Active game ────────────────────────────────────────────────────────────

export function getActiveGame() {
  const result = safeRead(KEYS.ACTIVE_GAME, null)
  if (result === null) return null
  // Guard against a non-object slipping in
  if (typeof result !== 'object' || Array.isArray(result)) return null
  return result
}

export function saveActiveGame(game) {
  return safeWrite(KEYS.ACTIVE_GAME, game)
}

export function clearActiveGame() {
  try {
    localStorage.removeItem(KEYS.ACTIVE_GAME)
    return true
  } catch {
    return false
  }
}

// ── Active cell ────────────────────────────────────────────────────────────
// Stored shape: { gameId, holeIndex, playerIndex }. The gameId scopes the cell
// to one game (#47b) — Scorecard ignores a persisted cell whose gameId doesn't
// match the game it's mounting, so a cell left over from a previous game can
// never place the focus on a stale hole.

export function getActiveCell() {
  const result = safeRead(KEYS.ACTIVE_CELL, null)
  if (!result || typeof result !== 'object') return null
  return result
}

export function saveActiveCell(cell) {
  return safeWrite(KEYS.ACTIVE_CELL, cell)
}

export function clearActiveCell() {
  try {
    localStorage.removeItem(KEYS.ACTIVE_CELL)
    return true
  } catch {
    return false
  }
}

// ── Completed games ────────────────────────────────────────────────────────

export function getCompletedGames() {
  const result = safeRead(KEYS.COMPLETED_GAMES, [])
  return Array.isArray(result) ? result : []
}

export function saveCompletedGame(game) {
  const games = getCompletedGames()
  games.unshift(game) // most recent first
  return safeWrite(KEYS.COMPLETED_GAMES, games)
}

export function deleteCompletedGame(id) {
  const games = getCompletedGames()
  return safeWrite(KEYS.COMPLETED_GAMES, games.filter(g => g.id !== id))
}

/**
 * Overwrites a single completed game in place, matched by id. Used when a
 * past round is edited (Chunk 40) — the edit replaces the existing record
 * rather than creating a new one, so winner/totals/date all update without
 * a duplicate row appearing in History. List order is preserved and the id
 * is pinned so a stray `id` in `updated` can never repoint the record.
 * Returns false when no record matched the id (nothing was persisted) so the
 * caller can surface a save error rather than a false success, and also false
 * when the underlying write fails.
 */
export function updateCompletedGame(id, updated) {
  const games = getCompletedGames()
  let matched = false
  const next = games.map(g => {
    if (g?.id !== id) return g
    matched = true
    return { ...g, ...updated, id }
  })
  if (!matched) return false
  return safeWrite(KEYS.COMPLETED_GAMES, next)
}

/**
 * Marks a completed game as already synced to the server. Used to stop a
 * revisited Summary screen (e.g. after browser back-navigation) from
 * silently re-submitting a round that was already saved — see
 * markCompletedGameSynced usage in Summary.jsx.
 *
 * Also clears the pending-sync markers (pendingSyncUserId, syncRejected): once
 * the server has the round there is nothing outstanding and nothing rejected.
 */
export function markCompletedGameSynced(id) {
  const games = getCompletedGames()
  const next = games.map(g => {
    if (g?.id !== id) return g
    const updated = { ...g, synced: true }
    delete updated.pendingSyncUserId
    delete updated.syncRejected
    return updated
  })
  return safeWrite(KEYS.COMPLETED_GAMES, next)
}

// ── Pending sync (BACKLOG #95, PRD §11.8) ──────────────────────────────────
// Marker design. A completed round that a signed-in user played but whose save
// to D1 has not (yet) succeeded carries `pendingSyncUserId`: the id of the user
// who played it, as a string. `syncRejected: true` alongside it means the
// server permanently rejected the round (a 400), so it is not retried. The
// existing `synced` flag is deliberately NOT the marker: it is undefined on
// every quick-play round, so it cannot tell a failed signed-in save from a
// round played before signing in. The marker is generic on purpose so a later
// quick-play import (BACKLOG #8) can reuse it.

/**
 * Marks a completed game as played by `userId` with its save to D1
 * outstanding. Stores the trimmed `notes` on the record (null when blank) so a
 * later background sync sends what the player typed. Leaves `synced` alone.
 * Returns false when no record matched the id, when `userId` is missing (a
 * marker with no owner would be meaningless), or when the write fails.
 */
export function markCompletedGamePending(id, userId, notes) {
  if (userId === undefined || userId === null || userId === '') return false
  const games = getCompletedGames()
  let matched = false
  const next = games.map(g => {
    if (g?.id !== id) return g
    matched = true
    return { ...g, pendingSyncUserId: String(userId), notes: (notes ?? '').trim() || null }
  })
  if (!matched) return false
  return safeWrite(KEYS.COMPLETED_GAMES, next)
}

/**
 * Flags a pending round as permanently rejected by the server (a 400). The
 * round stays on the device and keeps its pendingSyncUserId. No-op (false) when
 * no record matched the id.
 */
export function markCompletedGameRejected(id) {
  const games = getCompletedGames()
  let matched = false
  const next = games.map(g => {
    if (g?.id !== id) return g
    matched = true
    return { ...g, syncRejected: true }
  })
  if (!matched) return false
  return safeWrite(KEYS.COMPLETED_GAMES, next)
}

/**
 * Local rounds still waiting to be saved to D1 for this user: records whose
 * pendingSyncUserId equals `userId`. A record with no marker, or another
 * user's marker, is never returned (shared-device rule, PRD §11.8). Includes
 * rejected rounds (syncRejected) - callers that only want the ones worth
 * retrying filter on `!g.syncRejected`. Returns [] for a missing userId.
 */
export function getPendingCompletedGames(userId) {
  if (userId === undefined || userId === null || userId === '') return []
  const uid = String(userId)
  return getCompletedGames().filter(g => g && g.pendingSyncUserId === uid)
}
