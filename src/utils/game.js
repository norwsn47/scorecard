import { deriveHolePars } from './scores.js'

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
  const holes = game?.holesPlayed ?? game?.holes ?? MAX_HOLES
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
    // Snapshot the round's par at completion, sliced to the holes actually
    // played (§5.1) — later course edits never rewrite a saved round.
    holePars: deriveHolePars(game.holePars, holesPlayed),
    winner,
    winners,
    isDraw,
    winningTotal,
    dnf,
  }
}

/**
 * Builds a fresh active-game object.
 *
 * `holeCount` is the number of holes on the course being played — 36 for
 * quick-play and the legacy Bruntsfield flow (the default), 9 or 18 for a
 * user-created course. Each score row is allocated to exactly that length
 * and `holes` carries the real count; the UI shows only as many rows as
 * have been played. A non-positive-integer `holeCount` falls back to 36
 * (defensive — the course picker constrains it to 9/18).
 */
export function createGame(playerNames, courseId = null, courseName = null, pastDate = null, holePars = null, holeCount = MAX_HOLES) {
  const count = Number.isInteger(holeCount) && holeCount > 0 ? holeCount : MAX_HOLES
  const scores = {}
  playerNames.forEach(name => {
    scores[name] = Array(count).fill(null)
  })
  return {
    id: Date.now().toString(),
    startedAt: new Date().toISOString(),
    players: playerNames,
    holes: count,
    scores,
    courseId,
    courseName,
    // Length always matches `holes`; null (quick-play, no course passed) → all 3s.
    holePars: deriveHolePars(holePars, count),
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
 * Each row is copied into a fresh array sized to the round's own hole count
 * (`existingGame.holes`, or 36 for a legacy round saved without it) so the
 * Scorecard grid and finishGame behave exactly as they do for a live round —
 * a completed 9-hole round edits as 9 rows, not 36 with a trailing empty one.
 * If `scores` somehow hold data past that count (shouldn't happen) the array
 * grows to cover it rather than dropping strokes. The original `id` is pinned.
 * `pastDate` is set to `dateIso` so finishGame stamps the chosen date rather
 * than "now". Winner, DNF, holesPlayed and completedAt are all left for
 * finishGame to recompute.
 */
export function buildEditGame(existingGame, editedNames, courseId = null, courseName = null, dateIso = null, holePars = null) {
  const oldNames = existingGame.players ?? []

  // The round's real hole count. Legacy rounds saved without `holes` → 36.
  const declared = existingGame.holes ?? MAX_HOLES
  // Never lose real strokes: if any row has a score past `declared`, grow to
  // cover the highest scored hole.
  let highestScored = -1
  oldNames.forEach(n => {
    const row = existingGame.scores?.[n] ?? []
    for (let i = row.length - 1; i >= 0; i--) {
      if ((row[i] ?? null) !== null) {
        if (i > highestScored) highestScored = i
        break
      }
    }
  })
  const holeCount = Math.max(declared, highestScored + 1)

  const scores = {}
  editedNames.forEach((name, i) => {
    const row = Array(holeCount).fill(null)
    const oldRow = existingGame.scores?.[oldNames[i]] ?? []
    oldRow.forEach((s, idx) => {
      if (idx < holeCount) row[idx] = s ?? null
    })
    scores[name] = row
  })

  return {
    ...existingGame,
    id: existingGame.id,
    players: [...editedNames],
    holes: holeCount,
    scores,
    courseId: courseId ?? null,
    courseName: courseName ?? null,
    // `holePars` passed in when a D1 edit switches course; otherwise the
    // round keeps its own saved snapshot (§11.7).
    holePars: deriveHolePars(holePars ?? existingGame.holePars, holeCount),
    ...(dateIso ? { pastDate: dateIso } : {}),
  }
}
