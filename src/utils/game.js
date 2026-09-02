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
 *
 * Also always displays up to and including the last hole that has a score
 * for any player. This matters when a middle hole gets reset to empty
 * (e.g. a player clears a score partway through a round): without this,
 * the "first incomplete hole" would sit earlier in the sequence than holes
 * that still have real scores recorded after it, and those later rows would
 * disappear from the grid even though the data in `scores` is untouched.
 * The reset hole itself still renders with the existing empty (`–`) treatment.
 */
export function computeDisplayedHoles(players, scores, maxHoles) {
  let firstIncomplete = maxHoles
  for (let h = 0; h < maxHoles; h++) {
    const allScored = players.every(p => (scores[p]?.[h] ?? null) !== null)
    if (!allScored) {
      firstIncomplete = h + 1
      break
    }
  }

  let lastScoredHole = -1
  for (let h = maxHoles - 1; h >= 0; h--) {
    if (players.some(p => (scores[p]?.[h] ?? null) !== null)) {
      lastScoredHole = h
      break
    }
  }

  return Math.min(Math.max(firstIncomplete, lastScoredHole + 1), maxHoles)
}

/**
 * Calculates the result of a game from raw per-hole strokes.
 *
 * Returns:
 *  - `winners`      — names of every finisher level on the lowest total: one
 *                     name for an outright win, two or more for a draw (joint
 *                     first), empty when nobody finished or the round is solo.
 *                     Ordered by the players array.
 *  - `winner`       — `winners[0] ?? null`, a convenience for the common
 *                     single-winner case and for legacy callers.
 *  - `winningTotal` — the lowest finisher total, or null.
 *  - `isDraw`       — true when two or more finishers share the lowest total.
 *  - `dnf`          — players who did not complete every played hole.
 *  - `finishers`    — [{ name, total }] for players who completed every hole.
 *
 * Solo rounds (fewer than two players) have no result concept anywhere
 * (PRD §4.4 / §5): `winners` is empty, `isDraw` is false, `dnf` is empty.
 *
 * Trailing unplayed holes are ignored — a 9-hole round on a 36-slot
 * scorecard is treated as 9 holes, not as everyone DNF.
 */
export function calculateResult(players, scores, holes) {
  const roster = Array.isArray(players) ? players : []

  if (roster.length < 2) {
    return { winners: [], winner: null, winningTotal: null, isDraw: false, dnf: [], finishers: [] }
  }

  let lastScoredHole = -1
  for (let i = holes - 1; i >= 0; i--) {
    if (roster.some(p => (scores[p]?.[i] ?? null) !== null)) {
      lastScoredHole = i
      break
    }
  }

  if (lastScoredHole === -1) {
    return { winners: [], winner: null, winningTotal: null, isDraw: false, dnf: [...roster], finishers: [] }
  }

  const activeHoles = lastScoredHole + 1
  const finishers = []
  const dnf = []

  roster.forEach(player => {
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

  const winningTotal = finishers.length > 0
    ? Math.min(...finishers.map(f => f.total))
    : null
  const winners = finishers.filter(f => f.total === winningTotal).map(f => f.name)

  return {
    winners,
    winner: winners[0] ?? null,
    winningTotal,
    isDraw: winners.length > 1,
    dnf,
    finishers,
  }
}

/**
 * Re-derives the result for a game-shaped object (live or saved) — the single
 * entry point for computing the result on read. The `winner` / `dnf` fields
 * stored on saved rounds (localStorage and D1) are legacy and not
 * authoritative; every read surface recomputes through this helper (PRD §4.4).
 */
export function deriveResult(game) {
  const players = Array.isArray(game?.players) ? game.players : []
  const holes = game?.holesPlayed ?? game?.holes ?? 36
  return calculateResult(players, game?.scores ?? {}, holes)
}

/**
 * Stamps a finished game with completedAt, holesPlayed and the result fields
 * (winner, winners, isDraw, winningTotal, dnf). holesPlayed = holes where at
 * least one player entered a score. The result is recomputed on read anyway
 * (deriveResult) — these stamped values are a convenience, not the source of
 * truth (PRD §4.4).
 */
export function finishGame(game) {
  const { winner, winners, isDraw, winningTotal, dnf } =
    calculateResult(game.players, game.scores, game.holes)

  let holesPlayed = 0
  for (let i = game.holes - 1; i >= 0; i--) {
    if (game.players.some(p => (game.scores[p]?.[i] ?? null) !== null)) {
      holesPlayed = i + 1
      break
    }
  }

  return {
    ...game,
    completedAt: game.pastDate ?? new Date().toISOString(),
    holesPlayed,
    winner,
    winners,
    isDraw,
    winningTotal,
    dnf,
  }
}

/**
 * Builds a fresh active-game object. Always allocates MAX_HOLES slots;
 * the UI shows only as many rows as have been played.
 */
export function createGame(playerNames, courseId = null, courseName = null, pastDate = null) {
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
    courseId,
    courseName,
    ...(pastDate ? { pastDate } : {}),
  }
}

/**
 * Builds a working active-game object for editing an existing completed round
 * (Chunk 40). Unlike createGame, this does NOT zero the scores — it carries
 * the existing per-player score arrays forward so they can be adjusted on the
 * Scorecard screen.
 *
 * `editedNames` is mapped POSITIONALLY onto the existing player rows: renaming
 * "Bob" to "Robert" in slot 1 keeps slot 1's scores, re-keyed under the new
 * name. Adding or removing players is not supported here — `editedNames` is
 * expected to be the same length as `existingGame.players`.
 *
 * Each row is copied into a fresh MAX_HOLES-slot array so the Scorecard grid
 * (which assumes 36 slots) and finishGame both behave exactly as they do for
 * a live round. The original `id` is pinned. `pastDate` is set to `dateIso`
 * so finishGame stamps the chosen date rather than "now". Winner, DNF,
 * holesPlayed and completedAt are all left for finishGame to recompute.
 */
export function buildEditGame(existingGame, editedNames, courseId = null, courseName = null, dateIso = null) {
  const oldNames = existingGame.players ?? []
  const scores = {}
  editedNames.forEach((name, i) => {
    const row = Array(MAX_HOLES).fill(null)
    const oldRow = existingGame.scores?.[oldNames[i]] ?? []
    oldRow.forEach((s, idx) => {
      if (idx < MAX_HOLES) row[idx] = s ?? null
    })
    scores[name] = row
  })

  return {
    ...existingGame,
    id: existingGame.id,
    players: [...editedNames],
    holes: MAX_HOLES,
    scores,
    courseId: courseId ?? null,
    courseName: courseName ?? null,
    ...(dateIso ? { pastDate: dateIso } : {}),
  }
}
