import { useEffect, useRef, useState } from 'react'
import { MAX_HOLES } from '../constants.js'
import { track } from '../utils/analytics.js'
import { formatDateOnly } from '../utils/format.js'
import { deriveResult, isSignedInPlayer } from '../utils/game.js'
import { tiedNames } from '../utils/result.js'
import { deriveHolePars, playerTotal, roundToPar, scoreToPar } from '../utils/scores.js'
import PageHeader from '../components/PageHeader.jsx'
import ParDelta from '../components/ParDelta.jsx'
import PlayerStar from '../components/PlayerStar.jsx'
import { shareScorecard } from '../utils/share.js'
import { getActiveGame, getCompletedGames, markCompletedGamePending, markCompletedGameSynced, updatePendingNotes } from '../utils/storage.js'
import { holdRound, isSyncing, postRound, syncPendingRounds } from '../utils/sync.js'
import { useAuth } from '../hooks/useAuth.jsx'

// What the user reads when a signed-in save does not go through (#95). Calm,
// says what happened and what they can do; never blames them.
const SAVING_MESSAGE = 'Saving this round - try again in a moment.'

const SAVE_ERROR_COPY = {
  failed: "Couldn't save this round. Check your signal and try again, or keep it on this device for now.",
  signedOut: "You've been signed out. Keep this round on this device and it will save when you sign in again.",
  rejected: "Your account couldn't take this round. You can keep it on this device.",
  deviceFull: "This device couldn't store the round either. Stay on this screen and try again once you have signal.",
}

export default function Summary({ navigate, params }) {
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
  // Why Edit did nothing, or null: another round is in progress, or a save of
  // this very round is in flight (PRD §11.8, §11.13).
  const [editNotice, setEditNotice] = useState(null)
  // Why the last save on this screen did not go through, or null. `kind` picks
  // the wording; `n` counts failures so the alert remounts and is announced
  // again when a Retry fails the same way twice (BACKLOG #95).
  const [saveError, setSaveError]   = useState(null)
  const savingRef                   = useRef(false)
  const failuresRef                 = useRef(0)

  // The failed-save bookkeeping (BACKLOG #112, PRD §11.8). The round is marked
  // pending at the first failed save, and held so the background runner leaves
  // it alone while this screen shows the error (Retry is then the only sender).
  // - markedRef: the round already carries this user's pending marker.
  // - holdRef: the release function for the hold this screen took, or null. It
  //   is nulled by whoever releases it, so only one of Keep / the unmount
  //   cleanup acts on it.
  // - mountedRef: false once this screen has gone (a save that lands after that
  //   must not touch state or take a hold). Set in the effect body so React
  //   StrictMode's dev-only unmount/remount restores it.
  // - userIdRef: the latest signed-in id, so the unmount cleanup is never stale.
  const markedRef                   = useRef(false)
  const holdRef                     = useRef(null)
  const mountedRef                  = useRef(false)
  const userIdRef                   = useRef(null)

  useEffect(() => { userIdRef.current = user?.id ?? null }, [user?.id])

  // Leaving by any route other than Keep or a successful save (the back
  // gesture, an unmount for any reason): release the hold and, if this screen
  // still owned a pending round, trigger a sync so it is not left waiting for a
  // distant trigger. With nothing held (StrictMode's first cleanup, or after
  // Keep / a successful save already released it) this does nothing. While a
  // Retry POST is still in flight no sync is started here: the handler's
  // after-unmount branch marks and syncs on failure, and success needs none.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const release = holdRef.current
      holdRef.current = null
      if (!release) return
      release()
      if (savingRef.current) return
      const uid = userIdRef.current
      if (uid !== null && uid !== undefined) syncPendingRounds(uid)
    }
  }, [])

  // A reload, deep link, or restored tab always resets history state to depth
  // 0 — there's nothing in-app to step back to, and no in-page back button any
  // more (#89) for the case where there is. Only relevant to the viewingSaved
  // branch below (a round opened from History, or a synced round with no edit
  // rights) — the post-finish flow always arrives at depth > 0, straight from
  // Scorecard. Read once on mount: this only needs to catch the "landed here
  // with a blank history" case, not react to later in-app navigation (#89
  // fix-forward).
  const [showHomeLink] = useState(() => (window.history.state?.depth ?? 0) === 0)

  // No round to show (e.g. /summary opened directly with nothing in storage).
  // Bounce home from an effect, not an inline navigate() during render -
  // navigate() sets state on the parent, which React rejects mid-render (same
  // pattern as Scorecard). Keyed on a boolean because `game` is rebuilt as a
  // new object every render.
  const missing = !game
  useEffect(() => {
    if (missing) navigate('home', {}, { replace: true })
  }, [missing]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!game) return null

  const isDnf    = player => game.dnf?.includes(player)
  // Every tied winner gets the accent treatment, not just winners[0] (item 36).
  const winners  = game.winners ?? []
  const isWinner = player => winners.includes(player)

  // Per-hole par for the read-only table — small bracketed reference next to
  // each hole number, matching the live Scorecard grid (§5.1, item 37).
  const holePars = deriveHolePars(game.holePars, game.holesPlayed ?? game.holes ?? MAX_HOLES)

  const resultBase = 'font-ui text-xs tracking-[0.12em] uppercase text-muted text-center'
  const resultName = 'mx-1.5 font-display italic text-sm text-accent normal-case tracking-normal'
  const resultStrokes = 'font-ui text-xs text-muted normal-case tracking-normal'

  // True when this round already lives somewhere permanent: a past round
  // opened from History (_fromDb), or one already POSTed to D1 (synced).
  // Feeds viewingSaved below and nothing else - the post-finish branch, where
  // Done / Retry and the notes field live, is by definition the branch where
  // this is false.
  const alreadySaved = game._fromDb || game.synced

  // A round a signed-in user played whose save to D1 is still outstanding
  // (BACKLOG #95, PRD §11.8): it carries pendingSyncUserId. Whoever it belongs
  // to, it is never re-posted from this screen (Done would send it as whoever
  // is signed in now), so it is always shown read-only. `ownsPending` is the
  // signed-in owner, who alone gets the status line and Edit.
  // `&& !saveError`: this screen marks the round pending itself at the first
  // failed save (#112). On the params.game path `game` is the param object and
  // never sees that marker; on the storage paths (params.gameId, or no game
  // param) the next render re-reads the record and would find it. Either way
  // the round is not "arrived pending": Done, Retry, Keep and the notes field
  // must stay, and the "will save automatically" line would be untrue while our
  // hold is on. saveError stays set until the screen is left, so a round that
  // was already pending on arrival (no Done here, so no saveError) is unaffected.
  const isPending    = !!game.pendingSyncUserId && !saveError
  const ownsPending  = isPending && !!user && game.pendingSyncUserId === String(user.id)

  // Two modes share this screen. `viewingSaved` is the "opened from History"
  // mode: a round that already lives somewhere permanent, here to be read
  // (and maybe edited), not finished. `params.fromHistory` is set by the
  // History list and survives a back/forward bounce; `_fromDb` / `synced` are
  // the backstop when the `game` param was dropped on the bounce and we're
  // rendering the storage fallback. When false we're on the immediate
  // post-finish flow, where "Done" owns the save. A round kept on the device
  // after a failed save (pendingSyncUserId, #95) is read-only here too: it is
  // opened from History, reached again after a bounce, or handed back after an
  // edit, and none of those can save it (the background sync does).
  const viewingSaved = params?.fromHistory || alreadySaved || isPending

  // The Edit button is offered on a round that's actually stored somewhere we
  // can write back to: a D1 round opened from History (_fromDb) or the
  // signed-in user's own pending round (a local edit, PRD §11.13) for a
  // logged-in user, or any local completed round for a logged-out user.
  const canEdit = user ? (!!game._fromDb || ownsPending) : true

  function handleEditRound() {
    // A save of this round is in flight: an edit now could diverge from what
    // the server just received (PRD §11.8).
    if (isPending && isSyncing(game.id)) {
      setEditNotice(SAVING_MESSAGE)
      return
    }
    // One round at a time. A game in progress must be finished before a past
    // round can be edited — editing swaps the active-game slot for a working
    // copy, which would strand the in-progress round.
    if (getActiveGame()) {
      setEditNotice('Finish your current round before editing a past one.')
      return
    }
    // This screen can be showing a pending round that has since been saved (a
    // background sync finished while it was open). Its local copy is then no
    // longer the round to edit, so say so rather than edit a copy that would
    // never reach the account.
    if (ownsPending && !getCompletedGames().some(g => g.id === game.id && g.pendingSyncUserId)) {
      setEditNotice('This round has just been saved. Open it from History to edit it.')
      return
    }
    navigate('setup', { editRound: true, game })
  }

  function reportSaveFailure(kind) {
    failuresRef.current += 1
    setSaveError({ kind, n: failuresRef.current })
  }

  // Drops this screen's hold on the round, if it has one. Idempotent, and the
  // one place the hold is released on the way out (Keep, a successful save),
  // so the unmount cleanup and Keep never both act.
  function leave() {
    const release = holdRef.current
    holdRef.current = null
    if (release) release()
  }

  // A Done / Retry save did not go through (BACKLOG #112, PRD §11.8). The round
  // is marked pending for its owner at the FIRST failure, so a back gesture or
  // closing the app on the error screen can never leave an unmarked, unsynced
  // round. The hold is taken before the mark, in the same tick, so the runner
  // can never pick the round up in between. If even the local write fails the
  // round is not marked, the hold is dropped, and the user is told to stay and
  // retry. `ownerId` is the signed-in user's id captured when the save began; a
  // marker or hold is never created without one.
  function handleSaveFailure(kind, ownerId, roundNotes) {
    const hasOwner = ownerId !== undefined && ownerId !== null && ownerId !== ''

    // The screen went away while the save was in flight: no hold, no state.
    // Make sure the round is pending and ask for a sync so it is neither
    // unmarked nor left waiting for a distant trigger.
    if (!mountedRef.current) {
      if (!hasOwner) return
      if (markedRef.current || markCompletedGamePending(game.id, ownerId, roundNotes)) {
        syncPendingRounds(ownerId)
      }
      return
    }

    if (hasOwner && !markedRef.current) {
      const release = holdRound(game.id)
      if (markCompletedGamePending(game.id, ownerId, roundNotes)) {
        holdRef.current = release
        markedRef.current = true
      } else {
        release()
        reportSaveFailure('deviceFull')
        return
      }
    }
    reportSaveFailure(kind)
  }

  // "Done" on the post-finish flow, and "Retry" after a failed save (same
  // handler, same body). Signed in: POST the round; only a 2xx (including the
  // server's idempotent 200 for a round it already holds) marks it synced and
  // goes home. Anything else - a non-OK status or a network error - marks the
  // round pending, holds it, and stays on this screen with the error block, so
  // a round is never silently lost (BACKLOG #95, #112, PRD §11.8). Signed out:
  // nothing to save, just go home (no marker, no hold, no request).
  // This handler is only reachable on the post-finish flow (a saved or
  // History round shows Edit instead of Done), so it never re-POSTs a round
  // that is already in D1.
  async function handleGoHome() {
    if (!user) {
      navigate('home')
      return
    }
    // Synchronous re-entrance guard: protects against a double-tap firing
    // two handler invocations before React has re-rendered the disabled
    // button, which `saving` state alone can't guarantee.
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const ownerId = user.id
    let saved = false
    try {
      // postRound never throws and gives up after its own timeout, so a
      // stalled connection ends in the error block instead of "Saving..."
      // forever.
      const result = await postRound(game, notes)
      if (result.ok) {
        markCompletedGameSynced(game.id)
        // Nothing is pending any more: drop the hold and the marker flag. No
        // sync is triggered for this round.
        leave()
        markedRef.current = false
        saved = true
      } else {
        handleSaveFailure(result.kind === 'unauthorised' ? 'signedOut' : result.kind === 'rejected' ? 'rejected' : 'failed', ownerId, notes)
      }
    } catch {
      handleSaveFailure('failed', ownerId, notes)
    } finally {
      setSaving(false)
      savingRef.current = false
    }
    if (saved) navigate('home')
  }

  // "Keep on this device and go home". The round is already pending (marked at
  // the first failed save), so this only leaves: release the hold, ask for a
  // sync (fire and forget; the runner's guard makes a duplicate harmless) and
  // go home. Defensive only: if the round somehow is not marked, mark it now,
  // and if even that write fails stay put rather than navigate away from the
  // only copy.
  function handleKeepOnDevice() {
    if (savingRef.current || !user) return
    if (!markedRef.current) {
      if (!markCompletedGamePending(game.id, user.id, notes)) {
        reportSaveFailure('deviceFull')
        return
      }
      markedRef.current = true
    }
    leave()
    syncPendingRounds(user.id)
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

      {/* Post-finish: "Done" top-right (saves + goes home), no back slot — this
          flow always arrives straight from Scorecard (depth > 0), where native
          back genuinely works. A round opened from History (viewingSaved):
          "Edit" top-right; no in-page back button either (#89, the phone's own
          back navigation covers stepping back to the list) except when this
          screen was reached with nothing in-app to step back to (a reload, a
          deep link, or a restored tab all reset history depth to 0) — then a
          "Home" fallback appears on the left so there's still a way out.
          Composes the shared PageHeader rather than hand-rolling its own copy
          (#69) — this used to duplicate PageHeader's markup exactly, back when
          the header centred its title on an absolute layer above the side
          slots; #85 replaced that with the three-slot flex layout, so
          there's nothing left to drift out of sync. */}
      <PageHeader
        title={game.courseName || undefined}
        subtitle={formatDateOnly(game.completedAt)}
        onBack={viewingSaved && showHomeLink ? () => navigate('home') : undefined}
        backLabel="Home"
        right={
          viewingSaved ? (
            canEdit && (
              <button
                onClick={handleEditRound}
                disabled={saving}
                className="py-3 min-h-[44px] flex items-center text-accent font-ui text-sm tracking-[0.08em] uppercase disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Edit
              </button>
            )
          ) : (
            <button
              onClick={handleGoHome}
              disabled={saving}
              className="py-3 min-h-[44px] flex items-center text-accent font-ui text-sm tracking-[0.08em] uppercase font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {saving ? 'Saving…' : 'Done'}
            </button>
          )
        }
      />

      {/* A round still waiting to be saved to the account, or one the server
          refused. Static text; sits above the scrolling table so it never
          crowds the pinned totals row. */}
      {ownsPending && (
        <p className={[
          'font-ui text-xs tracking-wide mt-2 px-5 text-center leading-relaxed shrink-0',
          game.syncRejected ? 'text-accent' : 'text-muted',
        ].join(' ')}>
          {game.syncRejected
            ? "This round can't be saved to your account. It is kept on this device only."
            : 'Not yet saved to your account. It will save automatically when you have signal.'}
        </p>
      )}

      {viewingSaved && editNotice && (
        <p role="alert" className="font-ui text-xs text-accent tracking-wide mt-2 px-5 text-center leading-relaxed shrink-0">
          {editNotice}
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

      <main className="flex-1 flex flex-col min-h-0">
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
                    <span className="flex items-center justify-center gap-0.5">
                      <span className="truncate min-w-0">{player}</span>
                      {isSignedInPlayer(player, user?.name) && <PlayerStar />}
                    </span>
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
                stays in view on a long round. bg-bg-card is set on each cell
                (not the row) because a <tr> background doesn't reliably paint
                over scrolled content behind it in some mobile browsers (#66). */}
            <tfoot className="sticky bottom-0 z-10">
              <tr className="border-t-2 border-border">
                <th scope="row" className="py-3 px-3 text-left font-ui text-xs font-normal tracking-[0.12em] uppercase text-muted bg-bg-card">Total</th>
                {(game.players ?? []).map(player => (
                  <td
                    key={player}
                    className={[
                      'py-3 px-3 text-center font-ui text-base font-semibold bg-bg-card',
                      isWinner(player) ? 'text-accent' : 'text-text',
                    ].join(' ')}
                  >
                    {playerTotal(game.scores, player) || '-'}
                    <ParDelta
                      delta={roundToPar((game.scores?.[player] ?? []).slice(0, holePars.length), holePars)}
                      variant="bracket"
                    />
                    {/* The "Av. X" sub-line was dropped (#70, flagged as not interesting) —
                        the bracketed total-to-par above already carries that information. */}
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
              {/* Notes - signed in only. Editable until Done saves the round; a
                  saved round is never in this branch (it shows read-only notes
                  above instead). Locked while a save is in flight. */}
              {user && (
                <div>
                  <textarea
                    aria-label="Round notes"
                    value={notes}
                    onChange={e => {
                      const value = e.target.value.slice(0, 300)
                      setNotes(value)
                      // Once the round is pending, keep its stored notes in step
                      // with the field, so a later background sync sends them.
                      if (markedRef.current) updatePendingNotes(game.id, user.id, value)
                    }}
                    placeholder="Add a note about this round..."
                    rows={2}
                    disabled={saving}
                    className="w-full px-4 py-3 rounded-md border border-field bg-bg-card font-ui text-base text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <p className="font-ui text-xs text-muted mt-1 pl-1">
                    Round notes - optional
                  </p>
                </div>
              )}

              {/* A save that did not go through (#95). The message is the live
                  region; the buttons sit outside it so a screen reader reads
                  the problem, not the controls. The round is safe in this
                  browser either way. Keep is not offered when the device
                  itself could not hold the round. */}
              {user && saveError && (
                <div className="rounded-md border border-accent px-4 py-4 space-y-3">
                  <p key={saveError.n} role="alert" className="font-ui text-sm text-text leading-relaxed">
                    {SAVE_ERROR_COPY[saveError.kind]}
                  </p>
                  <button
                    onClick={handleGoHome}
                    disabled={saving}
                    className="w-full py-3 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.08em] uppercase font-semibold active:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    {saving ? 'Retrying…' : 'Retry'}
                  </button>
                  {saveError.kind !== 'deviceFull' && (
                    <div className="text-center">
                      <button
                        onClick={handleKeepOnDevice}
                        disabled={saving}
                        className="inline-block py-3 -my-3 font-ui text-sm text-text underline underline-offset-2 active:opacity-70 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        Keep on this device and go home
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Edit round / Share scorecard — each gets its own line so full
              tap-target padding can be applied without the two links
              overlapping (#34). "Done" for a post-finish round lives in the
              header (top-right). Edit is dropped in the read-only History view
              (it lives in the header there). */}
          <div className="text-center space-y-3">
            {!viewingSaved && canEdit && (
              <div>
                <button
                  onClick={handleEditRound}
                  disabled={saving}
                  className="inline-block py-3.5 -my-3.5 font-ui text-xs text-muted underline underline-offset-2 active:opacity-70 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Edit round
                </button>
              </div>
            )}
            <div>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="inline-block py-3.5 -my-3.5 font-ui text-xs text-muted underline underline-offset-2 active:opacity-70 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {sharing ? 'Generating…' : 'Share scorecard'}
              </button>
            </div>
            {!viewingSaved && canEdit && editNotice && (
              <p role="alert" className="font-ui text-xs text-accent tracking-wide leading-relaxed">
                {editNotice}
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
                  className="inline-block py-3.5 -my-3.5 font-ui text-xs text-accent active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  To save your rounds, <span className="underline underline-offset-2">create an account</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  )
}
