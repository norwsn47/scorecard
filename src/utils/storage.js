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
    if (g.id !== id) return g
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
 */
export function markCompletedGameSynced(id) {
  const games = getCompletedGames()
  const next = games.map(g => (g.id === id ? { ...g, synced: true } : g))
  return safeWrite(KEYS.COMPLETED_GAMES, next)
}
