export function playerTotal(scores, player) {
  return (scores?.[player] ?? [])
    .filter(s => s !== null)
    .reduce((sum, s) => sum + s, 0)
}

export function playerAverage(scores, player) {
  const scored = (scores?.[player] ?? []).filter(s => s !== null)
  if (scored.length === 0) return null
  return (scored.reduce((sum, s) => sum + s, 0) / scored.length).toFixed(1)
}

// ── Par (§5.1) ─────────────────────────────────────────────────────────────
// Par is display / derived-stats only — it never affects totals, the winner,
// DNF or the draw rule. A missing or malformed par is read as par 3.

const DEFAULT_PAR = 3

/**
 * Signed score-to-par for one hole: `score - par`, or null when the hole is
 * unscored. Callers own the presentation (`E`, `+1`, `-2`, ...). This is the
 * one helper every score-vs-par surface goes through (enables #38 and #39).
 */
export function scoreToPar(score, par) {
  return score == null ? null : score - par
}

/**
 * Shared score-vs-par formatter (§5.3). Turns a signed delta into the one
 * notation every surface uses — the per-hole superscript (#38), the round
 * total-to-par (#52), and later the §5.2 tally (#64):
 *   null / undefined  → ''      (hole not scored — nothing is shown)
 *   0                 → 'E'     (level par — never '+0' / '-0')
 *   > 0               → '+N'    (always a leading '+')
 *   < 0               → '-N'    (the minus is already there)
 * No surface formats its own string, so they cannot drift.
 *
 * @param {number|null|undefined} delta a scoreToPar() result
 * @returns {string}
 */
export function formatToPar(delta) {
  if (delta == null || Number.isNaN(delta)) return ''
  if (delta === 0) return 'E'
  return delta > 0 ? `+${delta}` : `${delta}`
}

/**
 * Round total-to-par (§5.3.2 / #52): the sum of scoreToPar(score, par) over the
 * holes this player has actually scored. Unscored holes (null / NaN) are
 * skipped, so a mid-round or DNF player's figure reflects only what they have
 * played. Returns null when the player has scored nothing — callers omit the
 * bracket entirely in that case. Display only: never touches totals, the
 * winner, DNF or the draw rule.
 *
 * @param {Array<number|null>} playerScores per-hole scores for one player
 * @param {Array<number>} holePars the round's par array, same indexing
 * @returns {number|null}
 */
export function roundToPar(playerScores, holePars) {
  const scores = Array.isArray(playerScores) ? playerScores : []
  const pars = Array.isArray(holePars) ? holePars : []
  let total = 0
  let scored = 0
  for (let i = 0; i < scores.length; i++) {
    const delta = scoreToPar(scores[i], pars[i])
    if (delta == null || Number.isNaN(delta)) continue
    total += delta
    scored++
  }
  return scored === 0 ? null : total
}

/**
 * Normalises a `hole_pars` value into a plain array of exactly `holeCount`
 * integers. Accepts a JSON string, an array, or null/undefined. Anything
 * missing, short or invalid becomes par 3 — correct for Bruntsfield and for
 * any course or round created before migration 003.
 */
export function deriveHolePars(raw, holeCount) {
  let arr = raw
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr)
    } catch {
      arr = null
    }
  }
  if (!Array.isArray(arr)) arr = []
  const out = []
  for (let i = 0; i < holeCount; i++) {
    const v = arr[i]
    // Same 2..7 band the backend validator enforces on write; a corrupted
    // stored value outside it falls back to par 3 rather than rendering junk.
    out.push(Number.isInteger(v) && v >= 2 && v <= 7 ? v : DEFAULT_PAR)
  }
  return out
}
