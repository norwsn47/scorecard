// Shared validation for client-supplied game fields on POST /api/games and
// PATCH /api/games/[id] (#23). Both endpoints previously accepted any
// non-empty string for `played_at` (no date check) and, on POST, any truthy
// value for `player_data` (element shape unchecked). Storage is unchanged —
// these functions only gate the request; the handlers still store a string
// verbatim and stringify an array, exactly as before.

const MAX_PLAYERS = 12
const MAX_HOLES = 36
const MAX_NAME_LEN = 60

/**
 * `played_at` must be a string that parses to a real date. The client always
 * sends an ISO string (`game.completedAt`). Returns `{ ok: true }` or
 * `{ ok: false, error }` with a message suitable for a 400.
 */
export function validatePlayedAt(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, error: 'played_at is required' }
  }
  if (value.length > 40 || Number.isNaN(Date.parse(value))) {
    return { ok: false, error: 'played_at must be a valid date' }
  }
  return { ok: true }
}

/**
 * `player_data` — an array (or a JSON string of one) of
 * `{ name, scores[, total, dnf] }` entries. `total` and `dnf` are optional
 * (older/partial payloads omit them; History re-derives the result from
 * `scores` anyway) but must be the right type when present.
 */
export function validatePlayerData(value) {
  let arr = value
  if (typeof value === 'string') {
    try {
      arr = JSON.parse(value)
    } catch {
      return { ok: false, error: 'player_data is not valid JSON' }
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return { ok: false, error: 'player_data must be a non-empty array' }
  }
  if (arr.length > MAX_PLAYERS) {
    return { ok: false, error: `player_data has more than ${MAX_PLAYERS} players` }
  }
  for (const p of arr) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) {
      return { ok: false, error: 'each player_data entry must be an object' }
    }
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > MAX_NAME_LEN) {
      return { ok: false, error: 'each player needs a name of 1 to 60 characters' }
    }
    if (!Array.isArray(p.scores) || p.scores.length > MAX_HOLES) {
      return { ok: false, error: `each player's scores must be an array of at most ${MAX_HOLES} entries` }
    }
    if (!p.scores.every(s => s === null || (Number.isInteger(s) && s >= 0 && s <= 99))) {
      return { ok: false, error: 'each score must be a whole number (0 to 99) or null' }
    }
    if (p.total != null && !Number.isFinite(p.total)) {
      return { ok: false, error: 'player total must be a number' }
    }
    if (p.dnf != null && typeof p.dnf !== 'boolean') {
      return { ok: false, error: 'player dnf must be true or false' }
    }
  }
  return { ok: true }
}
