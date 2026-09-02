/**
 * Presentation helpers for the round result (item 36).
 *
 * The result itself is computed by calculateResult / deriveResult in game.js;
 * these format its `winners` / `winningTotal` for display. "Tied" is the shared
 * term and " - " (a spaced hyphen) the shared separator across the Summary,
 * History and the share image (PRD §4.4 / §4.5 / §4.7). Two or three level
 * winners are spelled out; four or more fall back to a count.
 */

/** Joins tied winner names: "A", "A & B", "A, B & C". */
export function tiedNames(names) {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

/**
 * One-line result label for a History card. Returns null for a solo round
 * (fewer than two players) — a solo round carries no result.
 *
 * Expects a game object already carrying a deriveResult() output
 * (`winners`, `isDraw`, `winningTotal`).
 */
export function historyResultLabel({ players = [], winners = [], isDraw = false, winningTotal = null } = {}) {
  if (players.length < 2) return null
  if (winners.length === 0) return 'No winner'
  if (!isDraw) return `Winner: ${winners[0]} - ${winningTotal} strokes`
  if (winners.length <= 3) return `Tied: ${tiedNames(winners)} - ${winningTotal} strokes`
  return `Tied: ${winners.length} players level on ${winningTotal} strokes`
}
