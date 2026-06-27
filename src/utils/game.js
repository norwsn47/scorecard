/**
 * Returns the indices of duplicate names (case-insensitive).
 * e.g. ['Alice', 'alice'] → [0, 1]
 */
export function findDuplicateIndices(names) {
  const seen = {}
  const dupes = new Set()
  names.forEach((name, i) => {
    const key = name.trim().toLowerCase()
    if (key === '') return
    if (key in seen) {
      dupes.add(seen[key])
      dupes.add(i)
    } else {
      seen[key] = i
    }
  })
  return [...dupes]
}

/**
 * True when all of the first `count` names are non-empty and have no duplicates.
 */
export function canStartGame(names, count, holes) {
  const active = names.slice(0, count)
  const allFilled = active.every(n => n.trim() !== '')
  const noDupes = findDuplicateIndices(active).length === 0
  const holesValid = Number.isInteger(holes) && holes >= 1 && holes <= 24
  return allFilled && noDupes && holesValid
}

/**
 * Builds a fresh active-game object ready for local storage.
 */
export function createGame(playerNames, holes) {
  const scores = {}
  playerNames.forEach(name => {
    scores[name] = Array(holes).fill(null)
  })
  return {
    id: Date.now().toString(),
    startedAt: new Date().toISOString(),
    players: playerNames,
    holes,
    scores,
  }
}
