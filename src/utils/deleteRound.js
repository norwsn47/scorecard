import { deleteCompletedGame, getPendingCompletedGames } from './storage.js'
import { isSyncing } from './sync.js'

// Shown when a background save of the same round is in flight, so a delete (or
// Summary's Edit) cannot diverge from what the server just received.
export const SAVING_MESSAGE = 'Saving this round - try again in a moment.'

export const DELETE_FAILED_MESSAGE = "Couldn't delete this round - check your connection and try again."

/**
 * Deletes one round and reports what happened. Pure logic: no UI state.
 *
 * `game` is either a History row (`_fromDb`, `_pending`) or a stored record
 * (`pendingSyncUserId`); a round counts as pending if either marker is set.
 * `userId` is the signed-in user's id, or null/undefined when signed out.
 *
 * - Saved round (`_fromDb`): DELETE /api/games/:id. A 404 means it is already
 *   gone, which is the goal. Any other failure leaves everything in place. After
 *   a successful delete, the local copy (matched by `clientRoundId`) is dropped
 *   only when it is still pending FOR THIS USER, so a later background sync
 *   cannot send it back. Another user's or an unmarked copy is never touched.
 * - Local round: no server call. Refused while a save of it is in flight.
 *
 * Returns { ok: true } or { ok: false, error }.
 */
export async function deleteRound(game, { userId } = {}) {
  if (!game) return { ok: false, error: DELETE_FAILED_MESSAGE }

  if (game._fromDb) {
    try {
      const res = await fetch(`/api/games/${game.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok && res.status !== 404) throw new Error('delete failed')
    } catch {
      return { ok: false, error: DELETE_FAILED_MESSAGE }
    }
    if (game.clientRoundId) {
      let isPendingForUser = false
      try {
        isPendingForUser = getPendingCompletedGames(userId).some(p => p.id === game.clientRoundId)
      } catch { /* storage unreadable: leave the local copy alone */ }
      if (isPendingForUser) deleteCompletedGame(game.clientRoundId)
    }
    return { ok: true }
  }

  const isPending = !!(game._pending || game.pendingSyncUserId)
  if (isPending && isSyncing(game.id)) return { ok: false, error: SAVING_MESSAGE }
  deleteCompletedGame(game.id)
  return { ok: true }
}
