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
