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
