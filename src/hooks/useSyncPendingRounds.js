import { useEffect } from 'react'
import { useAuth } from './useAuth.jsx'
import { syncPendingRounds } from '../utils/sync.js'

/**
 * Runs the background sync of pending rounds (BACKLOG #95, PRD §11.8) while a
 * signed-in user is present: once when they appear (app open once auth
 * resolves, and signing in again after a 401) and again whenever the device
 * comes back online. With no user it never fetches. Renders nothing and does
 * not block navigation; visibility is History's job.
 *
 * Keyed on the user's id, not the user object: the auth context value is
 * rebuilt on every render and would re-run this constantly. Overlapping runs
 * (StrictMode's double effect, `online` arriving with app open) are absorbed
 * by the guard inside syncPendingRounds.
 */
export function useSyncPendingRounds() {
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (userId === undefined || userId === null) return undefined
    const run = () => { syncPendingRounds(userId) }
    run()
    window.addEventListener('online', run)
    return () => window.removeEventListener('online', run)
  }, [userId])
}
