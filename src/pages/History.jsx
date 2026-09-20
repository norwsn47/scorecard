import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ParDelta from '../components/ParDelta.jsx'
import PlayerStar from '../components/PlayerStar.jsx'
import { formatShortDate } from '../utils/format.js'
import { isSignedInPlayer } from '../utils/game.js'
import { playerTotal, roundToPar } from '../utils/scores.js'
import { deleteCompletedGame, getCompletedGames, getPendingCompletedGames } from '../utils/storage.js'
import { mergePendingGames, normalizeDbGame, normalizeLocalGame, normalizePendingGame } from '../utils/history.js'
import { historyResultLabel } from '../utils/result.js'
import { isSyncing, subscribeToSync } from '../utils/sync.js'
import { useAuth } from '../hooks/useAuth.jsx'

// Shown in the delete sheet (and by Summary's Edit) when a background save of
// the same round is in flight, so a delete or edit cannot diverge from what the
// server just received (PRD §11.8).
const SAVING_MESSAGE = 'Saving this round - try again in a moment.'

// The signed-in user's rounds that are still waiting to be saved to D1
// (marker-gated, PRD §11.9): only records tagged with this user's id, never an
// unmarked quick-play round and never another user's. A record that cannot be
// read is skipped rather than blanking the list.
function readPending(userId) {
  const list = []
  try {
    for (const record of getPendingCompletedGames(userId)) {
      try { list.push(normalizePendingGame(record)) } catch { /* skip one bad round */ }
    }
  } catch { /* storage unreadable: show nothing pending */ }
  return list
}

export default function History({ navigate }) {
  const { user } = useAuth()

  // Signed in: the D1 rounds (at most 100, per GET /api/games). Signed out: every
  // local round. A signed-in user's pending local rounds live in `pending` and are
  // merged in below, in addition to whatever `games` holds.
  const [games, setGames]             = useState(() => user ? [] : getCompletedGames().map(normalizeLocalGame))
  const [pending, setPending]         = useState(() => user ? readPending(user.id) : [])
  const [loading, setLoading]         = useState(!!user)
  const [filter, setFilter]           = useState(null)
  const [courseFilter, setCourseFilter] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const cancelButtonRef = useRef(null)
  // Load state for the signed-in list: null | 'failed' | 'signedOut'. A failed
  // load must not read as "No rounds yet" (#99). `skipped` counts stored rounds
  // that couldn't be read, so one bad row no longer blanks the whole list.
  const [loadError, setLoadError]     = useState(null)
  const [skipped, setSkipped]         = useState(0)
  const [reloadKey, setReloadKey]     = useState(0)
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // A reload, deep link, or restored tab always resets history state to depth
  // 0 — there's nothing in-app to step back to, and no in-page back button any
  // more (#89) for the case where there is. Read once on mount: this only
  // needs to catch the "landed here with a blank history" case, not react to
  // later in-app navigation (#89 fix-forward).
  const [showHomeLink] = useState(() => (window.history.state?.depth ?? 0) === 0)

  function closeDeleteConfirm() {
    if (deleting) return
    setDeleteError(null)
    setConfirmDeleteId(null)
  }

  // While the delete sheet is open: pull focus onto the non-destructive
  // "Cancel" action, hand focus back to the delete control that opened it on
  // close, and let Escape dismiss it, matching Settings.jsx's delete-account
  // sheet (#80). Backdrop click is wired on the overlay element itself below.
  useEffect(() => {
    if (!confirmDeleteId) return
    const opener = document.activeElement
    cancelButtonRef.current?.focus()
    return () => opener?.focus?.()
  }, [confirmDeleteId])
  useEffect(() => {
    if (!confirmDeleteId || deleting) return
    function onKey(e) {
      if (e.key === 'Escape') {
        setDeleteError(null)
        setConfirmDeleteId(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirmDeleteId, deleting])

  // A background sync that saved (or newly rejected) a round while this screen
  // is open: reload, so a just-saved round shows as its D1 row rather than as a
  // pending one. Unsubscribes on unmount.
  useEffect(() => {
    if (!user) return undefined
    return subscribeToSync(() => setReloadKey(k => k + 1))
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    // A stale response (a newer reload started, or the screen closed) must not
    // overwrite the newer one.
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    // Pending rounds are local, so they show whether or not the D1 load works.
    setPending(readPending(user.id))
    fetch('/api/games', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) { if (!cancelled) setLoadError('signedOut'); return null }
        if (!r.ok) throw new Error('games fetch failed')
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        if (!data) { setGames([]); return }
        // Normalise row by row so one unreadable round is skipped, not fatal.
        const list = []
        let bad = 0
        for (const row of data.games ?? []) {
          try { list.push(normalizeDbGame(row)) } catch { bad += 1 }
        }
        setGames(list)
        setSkipped(bad)
      })
      .catch(() => { if (!cancelled) { setGames([]); setLoadError('failed') } })
      .finally(() => {
        if (cancelled) return
        // Re-read once the list is in, in case a sync finished in the meantime.
        setPending(readPending(user.id))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, reloadKey])

  // Signed in: the D1 rounds plus this user's pending local rounds (PRD §11.9),
  // newest first, with a pending round the server already holds dropped. Signed
  // out: every local round, exactly as before.
  const allGames = user ? mergePendingGames(games, pending) : games

  const courses = user
    ? [...new Set(allGames.map(g => g.courseName).filter(Boolean))]
    : []

  const playerRoundCounts = allGames.reduce((counts, g) => {
    for (const p of g.players ?? []) counts[p] = (counts[p] ?? 0) + 1
    return counts
  }, {})

  const players = [...new Set(allGames.flatMap(g => g.players ?? []))]
    .sort((a, b) => playerRoundCounts[b] - playerRoundCounts[a] || a.localeCompare(b))

  const displayed = allGames
    .filter(g => !courseFilter || g.courseName === courseFilter)
    .filter(g => !filter || g.players?.includes(filter))

  function toggleFilter(name) {
    setFilter(prev => (prev === name ? null : name))
  }

  async function executeDelete(id) {
    const game = allGames.find(g => g.id === id)
    if (!game) return
    if (game._fromDb) {
      setDeleting(true)
      setDeleteError(null)
      try {
        const res = await fetch(`/api/games/${game.id}`, { method: 'DELETE', credentials: 'include' })
        // 404: already gone (deleted on another device) - the round is not there, which is the goal.
        if (!res.ok && res.status !== 404) throw new Error('delete failed')
      } catch {
        // Keep the round in the list: it is still saved, so do not pretend otherwise.
        setDeleteError("Couldn't delete this round - check your connection and try again.")
        setDeleting(false)
        return
      }
      setDeleting(false)
      // The server saved this round but the local copy is still marked pending
      // (the marker was not cleared yet). Drop that copy too, or the next
      // background sync would send the round back to the account.
      if (game.clientRoundId && pending.some(p => p.id === game.clientRoundId)) {
        deleteCompletedGame(game.clientRoundId)
      }
    } else {
      // A pending round is local only: no server call, no waiting. The one
      // exception is a save of this very round in flight right now.
      if (game._pending && isSyncing(game.id)) {
        setDeleteError(SAVING_MESSAGE)
        return
      }
      deleteCompletedGame(game.id)
    }
    setGames(prev => prev.filter(g => g.id !== id))
    if (user) setPending(readPending(user.id))
    setDeleteError(null)
    setConfirmDeleteId(null)
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title="History"
        onBack={showHomeLink ? () => navigate('home') : undefined}
        backLabel="Home"
        right={user ? (
          <button
            onClick={() => navigate('setup', { pastRound: true })}
            className="font-ui text-xs tracking-[0.1em] uppercase font-semibold text-accent py-2 px-4 rounded-sm border border-accent active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            + Add
          </button>
        ) : null}
      />

      {/* Course label (1 course) or course filter chips (2+ courses) — logged-in only */}
      {user && !loading && courses.length === 1 && (
        <div className="px-5 pt-4 pb-1 shrink-0">
          <p className="font-ui text-xs tracking-[0.08em] uppercase text-accent">{courses[0]}</p>
        </div>
      )}
      {user && !loading && courses.length > 1 && (
        <div role="group" aria-label="Filter by course" className="px-5 pt-3 pb-1 shrink-0 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCourseFilter(null)}
            className={[
              'shrink-0 inline-flex items-center py-1.5 px-3 rounded-full border font-ui text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              !courseFilter
                ? 'bg-accent border-accent text-bg'
                : 'border-border text-muted',
            ].join(' ')}
          >
            All
          </button>
          {courses.map(course => (
            <button
              key={course}
              onClick={() => setCourseFilter(prev => prev === course ? null : course)}
              className={[
                'shrink-0 inline-flex items-center py-1.5 px-3 rounded-full border font-ui text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                courseFilter === course
                  ? 'bg-accent border-accent text-bg'
                  : 'border-border text-muted',
              ].join(' ')}
            >
              {course}
            </button>
          ))}
        </div>
      )}

      {/* Disclaimer — logged-out only */}
      {!user && (
        <div className="px-5 pt-4 pb-1 shrink-0">
          <p className="font-ui text-xs text-muted leading-relaxed">
            Stored on your device. Gone if you clear your browser.
          </p>
        </div>
      )}

      {/* Player filter chips — mirrors the course row above; shown whenever
          two or more distinct players appear across the saved rounds. */}
      {!loading && players.length > 1 && (
        <div role="group" aria-label="Filter by player" className="px-5 pt-3 pb-1 shrink-0 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter(null)}
            className={[
              'shrink-0 inline-flex items-center py-1.5 px-3 rounded-full border font-ui text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              !filter
                ? 'bg-accent border-accent text-bg'
                : 'border-border text-muted',
            ].join(' ')}
          >
            All players
          </button>
          {players.map(name => (
            <button
              key={name}
              onClick={() => toggleFilter(name)}
              className={[
                'shrink-0 inline-flex items-center gap-1 py-1.5 px-3 rounded-full border font-ui text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                filter === name
                  ? 'bg-accent border-accent text-bg'
                  : 'border-border text-muted',
              ].join(' ')}
            >
              {name}
              {isSignedInPlayer(name, user?.name) && <PlayerStar />}
            </button>
          ))}
        </div>
      )}

      {/* Game list */}
      <main className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

        {loading && (
          <div className="text-center pt-16">
            <p className="font-ui text-sm text-muted">Loading…</p>
          </div>
        )}

        {!loading && loadError && (
          <div role="alert" className={['text-center', allGames.length > 0 ? 'pt-4 pb-2' : 'pt-16'].join(' ')}>
            <p className="font-display italic text-xl text-text mb-2">
              {loadError === 'signedOut' ? "You've been signed out" : "Couldn't load your rounds"}
            </p>
            <p className="font-ui text-sm text-muted mb-6">
              {loadError === 'signedOut'
                ? 'Sign in again to see your rounds.'
                : 'Check your connection and try again.'}
            </p>
            <button
              onClick={() => (loadError === 'signedOut' ? navigate('login') : setReloadKey(k => k + 1))}
              className="py-3 px-6 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {loadError === 'signedOut' ? 'Sign in' : 'Try again'}
            </button>
          </div>
        )}

        {!loading && !loadError && skipped > 0 && (
          <p role="status" className="font-ui text-xs text-muted text-center">
            {skipped === 1 ? "1 round couldn't be shown." : `${skipped} rounds couldn't be shown.`}
          </p>
        )}

        {!loading && !loadError && displayed.length === 0 && (
          <div className="text-center pt-16">
            {filter ? (
              <>
                <p className="font-display italic text-xl text-text mb-2">No rounds found</p>
                <p className="font-ui text-sm text-muted">
                  {filter} hasn't played a recorded round.
                </p>
                <button
                  onClick={() => setFilter(null)}
                  className="mt-4 font-ui text-sm text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Show all rounds
                </button>
              </>
            ) : (
              <>
                <p className="font-display italic text-xl text-text mb-2">No rounds yet</p>
                <p className="font-ui text-sm text-muted mb-6">
                  Finish a round to see it here.
                </p>
                <button
                  onClick={() => navigate('setup')}
                  className="py-3 px-6 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  New Game
                </button>
              </>
            )}
          </div>
        )}

        {!loading && displayed.map(game => {
          const resultLabel = historyResultLabel(game)
          const winners     = game.winners ?? []
          return (
          <div
            key={game.id}
            className="relative bg-bg-card rounded-md border border-border shadow-card"
          >
            {/* Opens the round. A real button behind the card content (rather
                the card being one big button) so the player names inside can be
                real buttons of their own without nesting one button in another. */}
            <button
              type="button"
              onClick={() => navigate('summary', { game, fromHistory: true })}
              aria-label={`Open round: ${formatShortDate(game.completedAt)}, ${(game.players ?? []).join(', ')}${game._rejected ? ", can't be saved, kept on this device only" : game._pending ? ', not yet saved' : ''}`}
              className="absolute inset-0 w-full h-full rounded-md active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />

            {/* Card content sits above the open button; clicks pass through to it
                except on the player-name buttons. */}
            <div className="relative pointer-events-none text-left px-4 pt-4 pb-4 pr-12">
              {/* A round whose save to the account is still outstanding. Quiet
                  accent pill (the app's "attention" treatment, no new colour);
                  real text, so a screen reader reads it with the card. A round
                  the server refused says so, and where it is kept. */}
              {game._pending && (
                <div className="mb-2">
                  <span className="inline-block rounded-full border border-accent py-0.5 px-2 font-ui text-xs font-medium text-accent">
                    {game._rejected ? "Can't be saved" : 'Not yet saved'}
                  </span>
                  {game._rejected && (
                    <p className="font-ui text-xs text-muted mt-1">Kept on this device only.</p>
                  )}
                </div>
              )}

              {/* Course name */}
              {game.courseName && (
                <p className="font-ui text-xs tracking-[0.08em] uppercase text-accent mb-1">{game.courseName}</p>
              )}

              {/* Date + holes */}
              <div className="flex justify-between items-start mb-2">
                <span className="font-ui text-xs text-muted">
                  {formatShortDate(game.completedAt)}
                </span>
                <span className="font-ui text-xs text-muted">
                  {game.holesPlayed ?? game.holes} holes
                </span>
              </div>

              {/* Players */}
              <div className="space-y-1">
                {(game.players ?? []).map(name => {
                  const isWinner  = winners.includes(name)
                  const isDnf     = game.dnf?.includes(name)
                  const total     = playerTotal(game.scores, name)
                  const toPar     = roundToPar((game.scores?.[name] ?? []).slice(0, game.holePars.length), game.holePars)
                  return (
                    <div key={name} className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleFilter(name)}
                        aria-pressed={filter === name}
                        className={[
                          'pointer-events-auto text-left font-ui text-sm rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                          isWinner ? 'text-accent font-semibold' : 'text-text',
                        ].join(' ')}
                      >
                        {name}
                        {isSignedInPlayer(name, user?.name) && <PlayerStar className="ml-0.5" />}
                        {isDnf && <span className="text-muted font-normal"> (DNF)</span>}
                      </button>
                      {/* Total-to-par, matching Summary's totals row (#70) — was
                          "(Av. X)", the two screens now show the same stat. */}
                      <span className="font-ui text-xs text-muted">
                        {total > 0 ? total : '-'}
                        <ParDelta delta={toPar} variant="bracket" />
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Result label — re-derived on read; hidden for solo rounds */}
              {resultLabel && (
                <p className="font-ui text-xs text-muted mt-2 tracking-wide">{resultLabel}</p>
              )}

              {/* Notes */}
              {game.notes && (
                <p className="font-ui text-xs text-muted mt-2 italic leading-relaxed line-clamp-2">{game.notes}</p>
              )}
            </div>

            {/* Delete button */}
            <button
              onClick={e => { e.stopPropagation(); setConfirmDeleteId(game.id) }}
              aria-label="Delete round"
              className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          )
        })}

      </main>

      {/* Delete confirmation — mirrors Settings.jsx's delete-account sheet:
          role="dialog", aria-modal, aria-labelledby, autofocus, Escape and
          backdrop-click to dismiss (#80). */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 flex items-end justify-center z-50"
          style={{ background: 'var(--overlay-backdrop)' }}
          onClick={closeDeleteConfirm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-round-heading"
            onClick={e => e.stopPropagation()}
            className="bg-bg rounded-t-2xl w-full max-w-[430px] px-6 pt-6 pb-10 shadow-card"
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
            <h2 id="delete-round-heading" className="font-display italic text-2xl text-text mb-1">Delete this round?</h2>
            <p className="font-ui text-xs text-muted tracking-wide mb-8">This cannot be undone.</p>
            {deleteError && (
              <p role="alert" className="font-ui text-xs text-accent mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                ref={cancelButtonRef}
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-3 rounded-sm border border-border font-ui text-sm tracking-[0.08em] uppercase text-text active:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Cancel
              </button>
              <button
                onClick={() => executeDelete(confirmDeleteId)}
                disabled={deleting}
                className="flex-1 py-3 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.08em] uppercase font-semibold active:opacity-80 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
