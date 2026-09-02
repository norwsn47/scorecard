// Per-hole par (§5.1). Par is a display / derived-stats attribute only — it
// never affects totals, the winner, DNF or the draw rule. Stored as a JSON
// array of integers in a TEXT column, consistent with `games.player_data`.
//
// A missing or NULL `hole_pars` (any row created before migration 003) is read
// everywhere as par 3 for every hole — correct for Bruntsfield, the only real
// course to date. New rows always carry an explicit array (courses) or an
// explicit array / NULL (games).

export const PAR_MIN = 2
export const PAR_MAX = 7
export const DEFAULT_PAR = 3

/** Canonical JSON string for a length-`holes` array of the default par. */
export function defaultHoleParsJson(holes) {
  return JSON.stringify(Array(holes).fill(DEFAULT_PAR))
}

/**
 * Validates a client-supplied `hole_pars` value. Accepts an array of integers
 * or a JSON string of one. `expectedLength` is the course's hole count
 * (courses) or the round's `holes_played` (games).
 *
 * Returns `{ ok: true, json }` — the canonical JSON string to store — or
 * `{ ok: false, error }` with a message suitable for a 400 response.
 */
export function validateHolePars(value, expectedLength) {
  let arr = value
  if (typeof value === 'string') {
    try {
      arr = JSON.parse(value)
    } catch {
      return { ok: false, error: 'hole_pars is not valid JSON' }
    }
  }
  if (!Array.isArray(arr)) {
    return { ok: false, error: 'hole_pars must be an array' }
  }
  if (!Number.isInteger(expectedLength) || arr.length !== expectedLength) {
    return { ok: false, error: `hole_pars must have exactly ${expectedLength} entries` }
  }
  if (!arr.every(n => Number.isInteger(n) && n >= PAR_MIN && n <= PAR_MAX)) {
    return { ok: false, error: `hole_pars entries must be whole numbers between ${PAR_MIN} and ${PAR_MAX}` }
  }
  return { ok: true, json: JSON.stringify(arr) }
}
