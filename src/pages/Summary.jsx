import { useRef, useState } from 'react'
import { track } from '../utils/analytics.js'
import { formatDate, formatDateOnly } from '../utils/format.js'
import { playerAverage, playerTotal } from '../utils/scores.js'
import { shareScorecard } from '../utils/share.js'
import { getCompletedGames, markCompletedGameSynced } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Summary({ navigate, params }) {
  const { user }          = useAuth()

  // params.game is set on the normal finish-round flow (Scorecard ->
  // navigate('summary', { game })), and also when History links into a past
  // round (History -> navigate('summary', { game }), where `game` is a
  // DB-backed record flagged `_fromDb: true` — see normalizeDbGame in
  // History.jsx). Browser back/forward navigation clears params (see
  // App.jsx's popstate handler), so this screen can also be reached with no
  // params — e.g. the user finishes a round, taps Done, then presses back.
  // In that case we fall back to the most recently completed local game so
  // the screen still renders something sensible, but that fallback game may
  // already have been saved to the server on the first "Done" tap — see the
  // `game.synced` / `game._fromDb` checks in handleGoHome, which stop this
  // screen from silently re-submitting a duplicate round in either case.
  const game = params?.game ?? getCompletedGames()[0] ?? null

  const [sharing, setSharing] = useState(false)
  const [notes, setNotes]     = useState(() => game?.notes ?? '')
  const [saving, setSaving]   = useState(false)
  const savingRef             = useRef(false)

  if (!game) {
    navigate('home')
    return null
  }

  const isDnf    = player => game.dnf?.includes(player)
  const isWinner = player => player === game.winner

  // True once this round can no longer be (re-)saved here: either it's a
  // past round opened from History (_fromDb), or it was already POSTed on
  // this screen (synced). Drives both the save guard below and the notes
  // field going read-only, so the two never disagree with each other.
  const alreadySaved = game._fromDb || game.synced

  async function handleGoHome() {
    // Only ever save on the immediate post-finish flow. A round already
    // persisted in D1 (_fromDb — opened from History) must never be
    // re-POSTed here: "Done" is this screen's only way back, so without this
    // guard, simply viewing a past round and tapping Done would silently
    // create a fresh duplicate row every time (its `game.id` is the DB row's
    // own id, not the original client_round_id, so the server dedup check
    // wouldn't catch it either).
    if (user && game && !alreadySaved) {
      // Synchronous re-entrance guard: protects against a double-tap firing
      // two handler invocations before React has re-rendered the disabled
      // button, which `saving` state alone can't guarantee.
      if (savingRef.current) return
      savingRef.current = true
      setSaving(true)
      try {
        const playerData = game.players.map(p => ({
          name: p,
          scores: (game.scores[p] ?? []).slice(0, game.holesPlayed),
          total: playerTotal(game.scores, p) || 0,
          dnf: game.dnf?.includes(p) ?? false,
        }))
        const res = await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            game_name: null,
            course_id: game.courseId || null,
            played_at: game.completedAt,
            holes_played: game.holesPlayed,
            player_data: playerData,
            notes: notes.trim() || null,
            client_round_id: game.id,
          }),
        })
        if (res.ok) markCompletedGameSynced(game.id)
      } catch {
        // Save failed silently — game is still in localStorage
      } finally {
        setSaving(false)
        savingRef.current = false
      }
    }
    navigate('home')
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      {/* Header */}
      <header className="px-5 pt-10 pb-4 border-b border-border text-center">
        {game.courseName && (
          <h1 className="font-display italic text-2xl text-text mb-1">{game.courseName}</h1>
        )}
        <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted">
          {formatDateOnly(game.completedAt)}
        </p>
      </header>

      {/* Winner — only shown for multi-player rounds */}
      {(game.players?.length ?? 0) > 1 && (
        <div className="px-5 pt-3 pb-1">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            {game.winner ? (
              <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted shrink-0">
                Winner — <span className="font-display italic text-sm text-accent normal-case tracking-normal">{game.winner}</span>
                <span className="ml-2 font-ui text-xs text-muted normal-case tracking-normal">{playerTotal(game.scores, game.winner)} strokes</span>
              </p>
            ) : (
              <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted shrink-0">Nobody finished</p>
            )}
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>
      )}

      {/* Read-only scorecard */}
      <div className="flex-1 overflow-y-auto overflow-x-auto mt-3">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-card">
              <th className="py-2 px-3 text-left font-ui text-xs tracking-[0.12em] uppercase text-muted w-12">
                Hole
              </th>
              {(game.players ?? []).map(player => (
                <th
                  key={player}
                  className={[
                    'py-2 px-3 text-center font-ui text-xs tracking-[0.12em] uppercase max-w-[90px]',
                    isWinner(player) ? 'text-accent font-semibold' : 'text-muted',
                  ].join(' ')}
                >
                  <span className="block truncate">{player}</span>
                  {isDnf(player) && <span className="block text-muted normal-case tracking-normal font-normal">DNF</span>}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: game.holesPlayed ?? game.holes }, (_, holeIndex) => (
              <tr key={holeIndex} className="border-b border-border">
                <td className="py-2 px-3 font-ui text-xs text-muted">{holeIndex + 1}</td>
                {(game.players ?? []).map(player => {
                  const score = game.scores[player]?.[holeIndex]
                  return (
                    <td
                      key={player}
                      className={[
                        'py-2 px-3 text-center font-ui text-sm',
                        isWinner(player) ? 'text-accent font-medium' : 'text-text',
                      ].join(' ')}
                    >
                      {score ?? '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>

          <tfoot className="sticky bottom-0 z-10">
            <tr className="bg-bg-card border-t-2 border-border">
              <td className="py-3 px-3 font-ui text-xs tracking-[0.12em] uppercase text-muted">Total</td>
              {(game.players ?? []).map(player => (
                <td
                  key={player}
                  className={[
                    'py-3 px-3 text-center font-ui text-base font-semibold',
                    isWinner(player) ? 'text-accent' : 'text-text',
                  ].join(' ')}
                >
                  {playerTotal(game.scores, player) || '-'}
                  {playerAverage(game.scores, player) !== null && (
                    <span className="block font-ui text-xs font-normal text-muted">Av. {playerAverage(game.scores, player)}</span>
                  )}
                  {isDnf(player) && <span className="block font-ui text-xs font-normal text-muted">DNF</span>}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      <div className="px-5 py-8 space-y-3 max-w-sm mx-auto w-full">

        {/* Notes — logged-in only. Editable only on the immediate
            post-finish flow, before the round has been saved. Once a round
            is saved (game.synced) or is a past round opened from History
            (game._fromDb), there is no save path for further edits here —
            see the matching guard in handleGoHome — so the field goes
            read-only rather than silently discarding anything typed into
            it. Hidden entirely for an already-saved round with no note — a
            read-only "Add a note..." placeholder would be a dead end. */}
        {user && (!alreadySaved || notes) && (
          <div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 300))}
              placeholder="Add a note about this round..."
              rows={2}
              readOnly={alreadySaved}
              disabled={saving}
              className="w-full px-4 py-3 rounded-md border border-border bg-bg-card font-ui text-base text-text placeholder:text-chrome resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 read-only:opacity-70"
            />
            <p className="font-ui text-xs text-muted mt-1 pl-1">
              {alreadySaved ? 'Round notes' : 'Round notes - optional'}
            </p>
          </div>
        )}

        <button
          onClick={handleGoHome}
          disabled={saving}
          className="w-full py-4 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Done'}
        </button>

        <div className="text-center -mt-2">
          <button
            onClick={async () => {
              setSharing(true)
              try {
                await shareScorecard(game)
                track('Scorecard Shared')
              } catch {
                // share failed silently
              } finally {
                setSharing(false)
              }
            }}
            disabled={sharing}
            className="font-ui text-xs text-muted underline underline-offset-2 active:opacity-70 disabled:opacity-40"
          >
            {sharing ? 'Generating…' : 'Share scorecard'}
          </button>
        </div>

        {!user && (
          <div className="text-center space-y-1 pt-2">
            <p className="font-ui text-xs text-muted leading-relaxed">
              Results saved on this device only — may be lost in private browsing or if you clear your browser data.
            </p>
            <button
              onClick={() => navigate('login')}
              className="font-ui text-xs text-accent active:opacity-70"
            >
              To save your rounds, <span className="underline underline-offset-2">create an account</span>
            </button>
          </div>
        )}

      </div>

    </div>
  )
}
