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
 * Calculates the winner and DNF players at the end of a game.
 * A player "finished" if every hole has a score ≥ 1 (non-null).
 * Winner = lowest total among finishers; null if everyone DNF'd.
 */
export function calculateResult(players, scores, holes) {
  const finishers = []
  const dnf = []

  players.forEach(player => {
    const playerScores = scores[player] ?? []
    const allFilled = playerScores.length === holes &&
      playerScores.every(s => s !== null && s >= 1)
    if (allFilled) {
      finishers.push({
        name: player,
        total: playerScores.reduce((sum, s) => sum + s, 0),
      })
    } else {
      dnf.push(player)
    }
  })

  const winner = finishers.length > 0
    ? finishers.reduce((best, p) => p.total < best.total ? p : best).name
    : null

  return { winner, dnf, finishers }
}

/**
 * Stamps a finished game with completedAt, winner, and dnf fields.
 */
export function finishGame(game) {
  const { winner, dnf } = calculateResult(game.players, game.scores, game.holes)
  return {
    ...game,
    completedAt: new Date().toISOString(),
    winner,
    dnf,
  }
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
