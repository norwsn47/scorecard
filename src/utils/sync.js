import { deriveResult } from './game.js'
import { playerTotal } from './scores.js'
import {
  getActiveGame,
  getPendingCompletedGames,
  markCompletedGameRejected,
  markCompletedGameSynced,
} from './storage.js'

/**
 * Builds the JSON body for `POST /api/games` from a plain completed-round
 * record (the shape stored in localStorage, or Summary's derived copy of it).
 * The one place this body is assembled, so Summary's Done / Retry and the
 * background sync of pending rounds (BACKLOG #95, PRD §11.8) always send the
 * same thing. No React, no storage, no network: pure and safe to import
 * anywhere.
 *
 * `notes` defaults to the record's own `notes` (what a pending round carries);
 * pass a value explicitly to send text that has not been stored yet (Summary's
 * textarea). It is trimmed, and blank becomes null.
 *
 * `client_round_id` is the record's id: the server's idempotency key
 * (UNIQUE(user_id, client_round_id)), so re-sending the same round can never
 * create a second row.
 *
 * The DNF flag is re-derived from the scores rather than read from the record,
 * because a stored `dnf` is legacy and not authoritative (PRD §4.4). For
 * Summary's already-derived record this gives the identical answer.
 */
export function buildGamePayload(game, notes = game?.notes) {
  const { dnf } = deriveResult(game)
  return {
    course_id: game.courseId || null,
    played_at: game.completedAt,
    holes_played: game.holesPlayed,
    player_data: (game.players ?? []).map(name => ({
      name,
      scores: (game.scores?.[name] ?? []).slice(0, game.holesPlayed),
      total: playerTotal(game.scores, name) || 0,
      dnf: dnf?.includes(name) ?? false,
    })),
    hole_pars: game.holePars ?? null,
    notes: (notes ?? '').trim() || null,
    client_round_id: game.id,
  }
}

// ── One POST, shared ────────────────────────────────────────────────────────

/** How long a save may take before it counts as a network failure. A stalled
 *  connection (common on a course with one bar of signal) would otherwise leave
 *  Summary on "Saving..." and wedge the background runner forever. */
export const POST_TIMEOUT_MS = 15000

/**
 * POSTs one completed round to `/api/games` and reduces the outcome to a small
 * shape both Summary's Done / Retry and the background runner can act on:
 *   { ok: true }                                  any 2xx (including the
 *                                                 server's idempotent 200 for a
 *                                                 round it already holds)
 *   { ok: false, kind: 'unauthorised' }           401 - the session has expired
 *   { ok: false, kind: 'rejected' }               400 - the server will never
 *                                                 take this round as it is (or
 *                                                 the record cannot be turned
 *                                                 into a request body at all)
 *   { ok: false, kind: 'server' }                 5xx or any other non-2xx
 *   { ok: false, kind: 'network' }                fetch failed or timed out
 * Never throws. `notes` is passed straight to buildGamePayload (omit it to send
 * the record's own stored notes).
 */
export async function postRound(record, notes) {
  let body
  try {
    body = JSON.stringify(buildGamePayload(record, notes))
  } catch {
    return { ok: false, kind: 'rejected' }
  }

  const controller = new AbortController()
  let timer
  // Aborting the request alone is not enough to guarantee a settle (a fetch
  // that ignores its signal would hang us), so the timeout also rejects a
  // promise that the request is raced against.
  const timedOut = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error('timeout'))
    }, POST_TIMEOUT_MS)
  })

  try {
    const res = await Promise.race([
      fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body,
        signal: controller.signal,
      }),
      timedOut,
    ])
    if (res.ok) return { ok: true }
    if (res.status === 401) return { ok: false, kind: 'unauthorised' }
    if (res.status === 400) return { ok: false, kind: 'rejected' }
    return { ok: false, kind: 'server' }
  } catch {
    return { ok: false, kind: 'network' }
  } finally {
    clearTimeout(timer)
  }
}

// ── Background sync of pending rounds (BACKLOG #95, PRD §11.8) ─────────────

// Ids of rounds whose POST is in flight right now. History uses isSyncing() to
// block Edit / Delete of a pending round for those moments, so an edit or
// delete can never diverge from what the server received.
const syncingIds = new Set()

/** True while the background runner is POSTing the round with this id. */
export function isSyncing(id) {
  return syncingIds.has(id)
}

const listeners = new Set()

/**
 * Registers `callback` to be called after a sync run that actually changed
 * something (at least one round synced or newly flagged rejected), so a screen
 * that is open at the time (History) can reload. Returns an unsubscribe
 * function. Framework-free; a throwing callback cannot break the runner.
 */
export function subscribeToSync(callback) {
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}

function notifyListeners() {
  for (const cb of [...listeners]) {
    try { cb() } catch { /* one bad subscriber must not stop the others */ }
  }
}

/** True while the active-game slot holds an edit working copy of this round. */
function isBeingEdited(id) {
  return getActiveGame()?._edit?.id === id
}

function completedTime(g) {
  const t = Date.parse(g.completedAt)
  return Number.isNaN(t) ? Infinity : t
}

// Double-fire guard. App open, the `online` event, React StrictMode's double
// effect and a second trigger can all land at once; while a run is going a
// further call gets that same promise, so no round is ever sent twice. Cleared
// in `finally` so a failure or timeout can never leave it wedged.
// Two browser tabs can each run their own copy of this. That is deliberately
// not locked against: the server is idempotent on client_round_id
// (UNIQUE(user_id, client_round_id)), so the worst case is a redundant request.
let running = null
let runningUserId = null

/**
 * Sends every round `userId` is still owed a save for, oldest first, one at a
 * time. Only rounds carrying that user's pendingSyncUserId are touched (never
 * an unmarked quick-play round, never another user's: shared-device rule), and
 * rounds already flagged rejected are skipped (they are not retried). A round
 * that is being edited right now (the active-game slot holds an `_edit` working
 * copy for its id) is skipped too, so a background save can never succeed with
 * the old data mid-edit and strand the edit; it stays pending, counts in
 * `remaining`, and goes out on a later trigger once the edit is saved or
 * abandoned.
 *
 * Per round: 2xx clears the marker and marks it synced; a 400 flags it
 * rejected and carries on to the next; a 401, a network error / timeout or a
 * 5xx leaves it pending and stops the batch (the rest would fail the same way;
 * the next trigger tries again). A local round is never deleted, whatever the
 * outcome. Never throws.
 *
 * Resolves to { synced, rejected, remaining } (remaining = rounds still
 * pending and not rejected afterwards). A call made while a run for the same
 * user is going returns that run's promise; a call for a different user waits
 * for the current run, then runs.
 */
export function syncPendingRounds(userId) {
  if (running) {
    if (String(runningUserId) === String(userId)) return running
    return running.then(() => syncPendingRounds(userId))
  }
  runningUserId = userId
  const run = runBatch(userId).finally(() => {
    running = null
    runningUserId = null
  })
  running = run
  return run
}

async function runBatch(userId) {
  const summary = { synced: 0, rejected: 0, remaining: 0 }
  try {
    const waiting = () => getPendingCompletedGames(userId).filter(g => !g.syncRejected)
    const order = waiting().sort((a, b) => completedTime(a) - completedTime(b) || 0).map(g => g.id)

    for (const id of order) {
      // Re-read each round just before sending: it may have been edited,
      // deleted or synced since the batch began, and the freshest copy is the
      // one to send.
      const record = waiting().find(g => g.id === id)
      if (!record) continue
      if (isBeingEdited(id)) continue

      syncingIds.add(id)
      let result
      try {
        result = await postRound(record)
      } finally {
        syncingIds.delete(id)
      }

      if (result.ok) {
        // A no-op if the round was deleted while the POST was in flight.
        markCompletedGameSynced(id)
        summary.synced += 1
      } else if (result.kind === 'rejected') {
        markCompletedGameRejected(id)
        summary.rejected += 1
      } else {
        // unauthorised / network / server: stays pending, stop the batch.
        break
      }
    }
  } catch {
    // Never throw to the caller; whatever was done is already in storage.
  }
  try {
    summary.remaining = getPendingCompletedGames(userId).filter(g => !g.syncRejected).length
  } catch {
    // leave remaining as 0
  }
  if (summary.synced > 0 || summary.rejected > 0) notifyListeners()
  return summary
}
