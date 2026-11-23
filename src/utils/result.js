/**
 * Presentation helpers for the round result (item 36).
 *
 * The result itself is computed by calculateResult / deriveResult in game.js;
 * these format its `winners` / `winningTotal` for display. "Tied" is the shared
 * term and " - " (a spaced hyphen) the shared separator across the Summary,
 * History and the share image (Summary and the share image draw the
 * result line from these pieces). Two or three level
 * winners are spelled out; four or more fall back to a count.
 */

/** Joins tied winner names: "A", "A & B", "A, B & C". */
export function tiedNames(names) {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

/** "1 stroke" / "5 strokes". */
export const strokesLabel = n => `${n} ${n === 1 ? 'stroke' : 'strokes'}`
