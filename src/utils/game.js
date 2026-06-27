const MAX_HOLES = 36

/**
 * Returns the indices of duplicate names (case-insensitive).
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
export function canStartGame(names, count) {
  const active = names.slice(0, count)
  const allFilled = active.every(n => n.trim() !== '')
  const noDupes = findDuplicateIndices(active).length === 0
  return allFilled && noDupes
}

/**
 * How many hole rows to show in the live scorecard.
 * Displays up to and including the first hole where not all players have
 * scored — so a new row appears automatically once the previous hole is full.
 */
export function computeDisplayedHoles(players, scores, maxHoles) {
  for (let h = 0; h < maxHoles; h++) {
    const allScored = players.every(p => (scores[p]?.[h] ?? null) !== null)
    if (!allScored) return Math.min(h + 1, maxHoles)
  }
  return maxHoles
}

/**
 * Calculates the winner and DNF players at the end of a game.
 * Trailing unplayed holes are ignored — a 9-hole round on a 24-slot
 * scorecard is treated as 9 holes, not as everyone DNF.
 */
export function calculateResult(players, scores, holes) {
  let lastScoredHole = -1
  for (let i = holes - 1; i >= 0; i--) {
    if (players.some(p => (scores[p]?.[i] ?? null) !== null)) {
      lastScoredHole = i
      break
    }
  }

  if (lastScoredHole === -1) {
    return { winner: null, dnf: [...players], finishers: [] }
  }

  const activeHoles = lastScoredHole + 1
  const finishers = []
  const dnf = []

  players.forEach(player => {
    const playerScores = (scores[player] ?? []).slice(0, activeHoles)
    const allFilled = playerScores.length === activeHoles &&
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
 * Stamps a finished game with completedAt, holesPlayed, winner, and dnf.
 * holesPlayed = holes where at least one player entered a score.
 */
export function finishGame(game) {
  const { winner, dnf } = calculateResult(game.players, game.scores, game.holes)

  let holesPlayed = 0
  for (let i = game.holes - 1; i >= 0; i--) {
    if (game.players.some(p => (game.scores[p]?.[i] ?? null) !== null)) {
      holesPlayed = i + 1
      break
    }
  }

  return {
    ...game,
    completedAt: new Date().toISOString(),
    holesPlayed,
    winner,
    dnf,
  }
}

/**
 * Builds a fresh active-game object. Always allocates MAX_HOLES slots;
 * the UI shows only as many rows as have been played.
 */
export function createGame(playerNames) {
  const scores = {}
  playerNames.forEach(name => {
    scores[name] = Array(MAX_HOLES).fill(null)
  })
  return {
    id: Date.now().toString(),
    startedAt: new Date().toISOString(),
    players: playerNames,
    holes: MAX_HOLES,
    scores,
  }
}
