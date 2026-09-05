import { useRef, useState } from 'react'
import { track } from '../utils/analytics.js'
import { formatDateOnly } from '../utils/format.js'
import { deriveResult } from '../utils/game.js'
import { tiedNames } from '../utils/result.js'
import { deriveHolePars, playerAverage, playerTotal, roundToPar, scoreToPar } from '../utils/scores.js'
import ParDelta from '../components/ParDelta.jsx'
import { shareScorecard } from '../utils/share.js'
import { getActiveGame, getCompletedGames, markCompletedGameSynced } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Summary({ navigate, goBack, params }) {
  const { user }          = useAuth()

  // params.game is set on the normal finish-round flow (Scorecard ->
  // navigate('summary', { game })), and also when History links into a past
  // round (History -> navigate('summary', { game }), where `game` is a
  // DB-backed record flagged `_fromDb: true` — see normalizeDbGame in
  // History.jsx). App.jsx drops the mutable `game` param on a browser
  // back/forward bounce (its history-state snapshot could go stale), so this
  // screen can be reached with no `game` — e.g. the user finishes a round,
  // taps Done, then presses back, or cancels an in-progress edit and pops
  // back here (Setup's edit-cancel goBack, #43b). App.jsx does persist the
  // round's own id (`params.gameId`, never the full object) across that
  // bounce, so we first try to re-resolve the exact round from localStorage
  // by id before falling back to the most recently completed local game.
  // That fallback still only covers local/quick-play rounds and rounds not
  // yet synced to D1 — a bounce back onto a signed-in D1-only round (opened
  // from History, never saved locally) can't be re-resolved this way and
  // falls through to the same "most recent local game" guess as before
  // (known gap, tracked in BACKLOG #43b). Context flags like `fromHistory`
  // do survive the bounce.
  // The result (winner / Tied / No winner, DNF) is always re-derived from the
  // per-hole scores on read — the stored winner/dnf on a saved round are
  // legacy and not authoritative (PRD §4.4). deriveResult is idempotent, so
  // this is a no-op for a round that finishGame or History already stamped.
  const rawGame = params?.game
    ?? (params?.gameId ? getCompletedGames().find(g => g.id === params.gameId) : null)
    ?? getCompletedGames()[0]
    ?? null
  const game = rawGame ? { ...rawGame, ...deriveResult(rawGame) } : null

  const [sharing, setSharing]       = useState(false)
  const [notes, setNotes]           = useState(() => game?.notes ?? '')
  const [saving, setSaving]         = useState(false)
  const [editBlocked, setEditBlocked] = useState(false)
  const savingRef                   = useRef(false)

  if (!game) {
    navigate('home')
    return null
  }

  const isDnf    = player => game.dnf?.includes(player)
  // Every tied winner gets the accent treatment, not just winners[0] (item 36).
  const winners  = game.winners ?? []
  const isWinner = player => winners.includes(player)

  // Per-hole par for the read-only table — small bracketed reference next to
  // each hole number, matching the live Scorecard grid (§5.1, item 37).
  const holePars = deriveHolePars(game.holePars, game.holesPlayed ?? game.holes ?? 36)

  const resultBase = 'font-ui text-xs tracking-[0.12em] uppercase text-muted text-center'
  const resultName = 'mx-1.5 font-display italic text-sm text-accent normal-case tracking-normal'
  const resultStrokes = 'font-ui text-xs text-muted normal-case tracking-normal'

  // True once this round can no longer be (re-)saved here: either it's a
  // past round opened from History (_fromDb), or it was already POSTed on
  // this screen (synced). Drives both the save guard below and the notes
  // field going read-only, so the two never disagree with each other.
  const alreadySaved = game._fromDb || game.synced

  // Two modes share this screen. `viewingSaved` is the "opened from History"
  // mode: a round that already lives somewhere permanent, here to be read
  // (and maybe edited), not finished. `params.fromHistory` is set by the
  // History list and survives a back/forward bounce; `_fromDb` / `synced` are
  // the backstop when the `game` param was dropped on the bounce and we're
  // rendering the storage fallback. When false we're on the immediate
  // post-finish flow, where "Done" still owns the save.
  const viewingSaved = params?.fromHistory || alreadySaved

  // The Edit button is offered on a round that's actually stored somewhere we
  // can write back to: a D1 round opened from History (_fromDb) for a
  // logged-in user, or any local completed round for a logged-out user.
  const canEdit = user ? !!game._fromDb : true

  function handleEditRound() {
    // One round at a time. A game in progress must be finished before a past
    // round can be edited — editing swaps the active-game slot for a working
    // copy, which would strand the in-progress round.
    if (getActiveGame()) {
      setEditBlocked(true)
      return
    }
    navigate('setup', { editRound: true, game })
  }

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
            course_id: game.courseId || null,
            played_at: game.completedAt,
            holes_played: game.holesPlayed,
            player_data: playerData,
            hole_pars: game.holePars ?? null,
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

  async function handleShare() {
    setSharing(true)
    try {
      await shareScorecard(game)
      track('Scorecard Shared')
    } catch {
      // share failed silently
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      {/* Header — navigation chrome at text scale so the scorecard below keeps
          its room. Post-finish: "Done" top-right (saves + goes home). A round
          opened from History: "← Rounds" left, "Edit" right. */}
      <header className="relative flex items-center justify-between px-5 pt-10 pb-4 border-b border-border shrink-0">
        <div className="relative shrink-0 z-10">
          {viewingSaved ? (
            <button
              onClick={() => goBack('history')}
              className="py-3 min-h-[44px] flex items-center text-muted font-ui text-sm tracking-[0.08em] uppercase"
            >
              ← Rounds
            </button>
          ) : (
            <span className="block w-14" aria-hidden="true" />
          )}
        </div>

        <div className="absolute inset-x-0 text-center px-20 pointer-events-none">
          {game.courseName && (
            <h1 className="font-display italic text-2xl text-text truncate">{game.courseName}</h1>
          )}
          <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted truncate">
            {formatDateOnly(game.completedAt)}
          </p>
        </div>

        <div className="relative shrink-0 z-10 flex justify-end">
          {viewingSaved ? (
            canEdit && (
              <button
                onClick={handleEditRound}
                disabled={saving}
                className="py-3 min-h-[44px] flex items-center text-accent font-ui text-sm tracking-[0.08em] uppercase disabled:opacity-40"
              >
                Edit
              </button>
            )
          ) : (
            <button
              onClick={handleGoHome}
              disabled={saving}
              className="py-3 min-h-[44px] flex items-center text-accent font-ui text-sm tracking-[0.08em] uppercase font-semibold disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Done'}
            </button>
          )}
        </div>
      </header>

      {viewingSaved && editBlocked && (
        <p className="font-ui text-xs text-accent tracking-wide mt-2 px-5 text-center leading-relaxed shrink-0">
          Finish your current round before editing a past one.
        </p>
      )}

      {/* Result — only shown for multi-player rounds (item 36). Re-derived on
          read; "Tied" for a draw, all winners named up to three, a count for
          four or more. " - " is the shared separator across every surface. */}
      {(game.players?.length ?? 0) > 1 && (
        <div className="px-5 pt-3 pb-1">
          {winners.length >= 4 ? (
            <p className={`${resultBase} block text-center leading-relaxed`}>
              Tied <span className={resultStrokes}>- {winners.length} players level on {game.winningTotal} strokes</span>
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              {winners.length === 0 ? (
                <p className={resultBase}>No winner</p>
              ) : winners.length === 1 ? (
                <p className={`${resultBase} min-w-0 leading-relaxed`}>
                  <span>Winner -</span>
                  <span className={resultName}>{winners[0]}</span>
                  <span className={resultStrokes}>- {game.winningTotal} strokes</span>
                </p>
              ) : (
                <p className={`${resultBase} min-w-0 leading-relaxed`}>
                  <span>Tied -</span>
                  <span className={resultName}>{tiedNames(winners)}</span>
                  <span className={resultStrokes}>- {game.winningTotal} strokes</span>
                </p>
              )}
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
        </div>
      )}

      {/* Read-only scorecard. The vs-par tally (§5.2) lives in the same table
          as extra rows below the totals so its columns stay locked to the
          player columns above, even when the grid scrolls sideways. */}
      <div className="flex-1 overflow-y-auto overflow-x-auto mt-3 pb-2">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-card">
              <th scope="col" className="py-2 px-3 text-left font-ui text-xs tracking-[0.12em] uppercase text-muted w-16">
                Hole
              </th>
              {(game.players ?? []).map(player => (
                <th
                  key={player}
                  scope="col"
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
                <td className="py-2 px-3 font-ui text-xs text-muted whitespace-nowrap">
                  <span className="font-semibold">{holeIndex + 1}</span>
                  <span className="font-normal ml-0.5">({holePars[holeIndex]})</span>
                </td>
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
                      {score != null && (
                        <ParDelta delta={scoreToPar(score, holePars[holeIndex])} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>

          {/* Totals row pinned to the bottom of the scroll area (#63) so it
              stays in view on a long round. bg-bg-card so scrolled hole rows
              don't show through when pinned. */}
          <tfoot className="sticky bottom-0 z-10">
            <tr className="bg-bg-card border-t-2 border-border">
              <th scope="row" className="py-3 px-3 text-left font-ui text-xs font-normal tracking-[0.12em] uppercase text-muted">Total</th>
              {(game.players ?? []).map(player => (
                <td
                  key={player}
                  className={[
                    'py-3 px-3 text-center font-ui text-base font-semibold',
                    isWinner(player) ? 'text-accent' : 'text-text',
                  ].join(' ')}
                >
                  {playerTotal(game.scores, player) || '-'}
                  <ParDelta
                    delta={roundToPar((game.scores?.[player] ?? []).slice(0, holePars.length), holePars)}
                    variant="bracket"
                  />
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
      <div className="px-5 pt-4 pb-6 space-y-3 max-w-sm mx-auto w-full">

        {viewingSaved ? (
          /* A past round is read-only here — editing happens via the header
             Edit button, which routes back through Setup. Any saved note is
             shown as quiet static text; nothing to edit, nothing to submit. */
          game.notes ? (
            <div>
              <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted mb-1.5">Notes</p>
              <p className="font-ui text-sm text-muted leading-relaxed whitespace-pre-wrap">
                {game.notes}
              </p>
            </div>
          ) : null
        ) : (
          <>
            {/* Notes — logged-in only. Editable only on the immediate
                post-finish flow, before the round has been saved. Once a round
                is saved (game.synced) there is no save path for further edits
                here — see the matching guard in handleGoHome — so the field
                goes read-only rather than silently discarding anything typed
                into it. Hidden entirely for an already-saved round with no
                note — a read-only "Add a note..." placeholder would be a dead
                end. */}
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
          </>
        )}

        {/* Edit round • Share scorecard — inline text links. "Done" for a
            post-finish round lives in the header (top-right). Edit is dropped
            in the read-only History view (it lives in the header there). */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 font-ui text-xs text-muted">
            {!viewingSaved && canEdit && (
              <>
                <button
                  onClick={handleEditRound}
                  disabled={saving}
                  className="py-2.5 -my-2.5 underline underline-offset-2 active:opacity-70 disabled:opacity-40"
                >
                  Edit round
                </button>
                <span aria-hidden="true">•</span>
              </>
            )}
            <button
              onClick={handleShare}
              disabled={sharing}
              className="py-2.5 -my-2.5 underline underline-offset-2 active:opacity-70 disabled:opacity-40"
            >
              {sharing ? 'Generating…' : 'Share scorecard'}
            </button>
          </div>
          {!viewingSaved && canEdit && editBlocked && (
            <p className="font-ui text-xs text-accent tracking-wide mt-3 leading-relaxed">
              Finish your current round before editing a past one.
            </p>
          )}
        </div>

        {!user && (
          <div className="text-center space-y-1 pt-2">
            <p className="font-ui text-xs text-muted leading-relaxed">
              Saved in this browser only.
            </p>
            <div>
              <button
                onClick={() => navigate('login')}
                className="inline-block py-3.5 -my-3.5 font-ui text-xs text-accent active:opacity-70"
              >
                To save your rounds, <span className="underline underline-offset-2">create an account</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
