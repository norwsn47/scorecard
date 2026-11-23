import { Fragment, useEffect, useRef, useState } from 'react'
import Button from '../components/Button.jsx'
import ConfirmSheet from '../components/ConfirmSheet.jsx'
import CourseMapModal from '../components/CourseMapModal.lazy.jsx'
import PageHeader, { HeaderAction } from '../components/PageHeader.jsx'
import ParDelta from '../components/ParDelta.jsx'
import PlayerStar from '../components/PlayerStar.jsx'
import Toast from '../components/Toast.jsx'
import { BRUNTSFIELD_COURSE_NAME, MAX_HOLES, MAX_STROKES } from '../constants.js'
import { track } from '../utils/analytics.js'
import { computeDisplayedHoles, finishGame, isSignedInPlayer } from '../utils/game.js'
import { deriveHolePars, playerTotal, roundToPar, scoreToPar, subtotal } from '../utils/scores.js'
import { clearActiveCell, clearActiveGame, getActiveCell, getActiveGame, getCompletedGames, saveActiveCell, saveActiveGame, saveCompletedGame, updateCompletedGame } from '../utils/storage.js'
import { buildGamePatch, syncPendingRounds } from '../utils/sync.js'
import { useAuth } from '../hooks/useAuth.jsx'
import TextLink from '../components/TextLink.jsx'

function initialCellFor(g) {
  if (!g) return { holeIndex: 0, playerIndex: 0 }
  const ps = g.players ?? []
  for (let h = 0; h < g.holes; h++) {
    for (let p = 0; p < ps.length; p++) {
      if ((g.scores?.[ps[p]]?.[h] ?? null) === null) return { holeIndex: h, playerIndex: p }
    }
  }
  return { holeIndex: 0, playerIndex: 0 }
}

export default function Scorecard({ navigate, params }) {
  const { user } = useAuth()
  const [[initialGame, initialCell]]  = useState(() => {
    const g = params?.game ?? getActiveGame()
    // Only restore a persisted cell on a paramless mount (app reopen / Resume
    // Game). A game passed in params is freshly started or an edit copy — it
    // must never inherit a stale active cell (#47). The persisted cell is also
    // scoped to a game id, so a cell from a previous game is ignored even here
    // (#47b).
    const stored = params?.game ? null : getActiveCell()
    const saved = stored && stored.gameId === g?.id
      ? { holeIndex: stored.holeIndex, playerIndex: stored.playerIndex }
      : null
    // When editing an existing round, land on hole 1 — the likely target is
    // an existing score to correct, not the next empty hole.
    const fallback = (params?.editContext || g?._edit)
      ? { holeIndex: 0, playerIndex: 0 }
      : initialCellFor(g)
    return [g, saved ?? fallback]
  })
  const [game, setGame]               = useState(initialGame)
  const [showConfirm, setShowConfirm] = useState(false)

  const [showMap, setShowMap]         = useState(false)
  const [saveError, setSaveError]     = useState(false)
  const [finishing, setFinishing]     = useState(false)
  const finishingRef                  = useRef(false)
  const [activeCell, setActiveCell]   = useState(initialCell)
  const activeRowRef = useRef(null)

  // Edit context: set when this Scorecard is editing an existing completed
  // round rather than playing a new one. Read from the router param AND from
  // a marker stamped on the game object — App.jsx drops `game` / `editContext`
  // from history state on a browser back/forward bounce (popstate), so after a
  // bounce the `_edit` marker on the game object (recovered from storage) is
  // the reliable read. Same failure class as the 24 Aug duplicate-save hotfix.
  const editContext = params?.editContext ?? initialGame?._edit ?? null
  const isEdit      = !!editContext

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeCell.holeIndex])

  // No active game (e.g. /scorecard opened directly with nothing in storage).
  // Bounce home from an effect, not an inline navigate() during render -
  // navigate() sets state on the parent, which React rejects mid-render.
  useEffect(() => {
    if (!game) navigate('home', {}, { replace: true })
  }, [game]) // eslint-disable-line react-hooks/exhaustive-deps

  // The finish/save sheet (ConfirmSheet): focus on the non-destructive
  // "Cancel", back to the opener on close, Escape and backdrop dismiss -
  // except mid-save, when it must not (#100, DESIGN.md "Dialog semantics").
  const cancelFinishRef = useRef(null)

  if (!game) return null

  const players       = Array.isArray(game.players) ? game.players : []
  const displayedHoles = computeDisplayedHoles(players, game.scores ?? {}, game.holes)
  const holePars      = deriveHolePars(game.holePars, game.holes ?? MAX_HOLES)

  // Dense mode (5 or 6 players, plan 5f): at 390px six columns are about 56px
  // wide, so column headers drop from Label caps to Caption and a total stacks
  // above its bracket instead of sitting beside it. Scores never shrink.
  const dense         = players.length >= 5
  const headCls       = dense ? 'type-caption' : 'type-label-caps'
  const bandRowCls    = dense ? 'h-14' : 'h-11'

  // Whether the active game's course is actually Bruntsfield — matched by
  // the game itself, not by which route it was started from (#1, reverses
  // the earlier route-only gate). Gated on sign-in state first, because a
  // missing courseId means two different things depending on who's playing:
  // logged-out quick-play never has a course row at all (no course selector
  // exists for it) so it's always Bruntsfield, regardless of its display
  // name — a generic New Game labels it "Quick Play" (#73) rather than the
  // course's real name, but it's the same course. A signed-in game
  // references a real course row (or genuinely none, by design — Setup
  // supports starting/editing a round with no course selected), so a missing
  // courseId there must NOT default to Bruntsfield — it's matched by name
  // against the one canonical Bruntsfield name constant instead (used only
  // as a value here; CourseMapModal/Home render that same constant purely as
  // a label and don't do a comparison of their own).
  // Fragile by design: a plain name match, not a stable id, so renaming this
  // course (or naming another one identically) changes the match retroactively.
  // Low severity (worst case: wrong/no map shown), not a real identity check.
  const isBruntsfieldCourse = !user ? true : game.courseName === BRUNTSFIELD_COURSE_NAME

  // Front 9 subtotal row gate — 18-hole rounds only, and only
  // once every *current* player has a stroke count for hole 9 (index 8).
  // Recomputed on every render, not sticky state: a player added mid-edit
  // after hole 9 is complete for everyone else can make this go false again
  // for a render or two, until the new player's own hole 9 is scored. That is
  // Accepted, narrow edge case — not solved here.
  const frontNineComplete = game.holes === 18 && players.length > 0
    && players.every(p => (game.scores?.[p]?.[8] ?? null) != null)

  // Every hole scored for every player: Finish becomes the expected next step.
  const allHolesScored = players.length > 0 && Array.from({ length: game.holes ?? 0 }).every((_, h) =>
    players.every(p => (game.scores?.[p]?.[h] ?? null) !== null))

  // Active cell values
  const activePlayer = players[activeCell.playerIndex] ?? null
  const activeScore  = activePlayer
    ? ((game.scores?.[activePlayer] ?? [])[activeCell.holeIndex] ?? null)
    : null

  function updateScores(player, holeIndex, next) {
    const currentRow = Array.isArray(game.scores?.[player]) ? game.scores[player] : []
    const newGame = {
      ...game,
      scores: {
        ...game.scores,
        [player]: currentRow.map((s, i) => (i === holeIndex ? next : s)),
      },
    }
    setGame(newGame)
    const saved = saveActiveGame(newGame)
    setSaveError(!saved)
  }

  function handleIncrement() {
    if (!activePlayer) return
    if (activeScore !== null && activeScore >= MAX_STROKES) return
    updateScores(activePlayer, activeCell.holeIndex, activeScore === null ? 1 : activeScore + 1)
  }

  function handleDecrement() {
    if (!activePlayer || activeScore === null) return
    updateScores(activePlayer, activeCell.holeIndex, activeScore <= 1 ? null : activeScore - 1)
  }

  function moveToCell(cell) {
    setActiveCell(cell)
    saveActiveCell({ gameId: game.id, holeIndex: cell.holeIndex, playerIndex: cell.playerIndex })
  }

  function handleAdvance() {
    const nextPlayer = activeCell.playerIndex + 1
    if (nextPlayer < players.length) {
      moveToCell({ holeIndex: activeCell.holeIndex, playerIndex: nextPlayer })
    } else {
      const nextHole = activeCell.holeIndex + 1
      if (nextHole < game.holes) {
        moveToCell({ holeIndex: nextHole, playerIndex: 0 })
      }
    }
  }

  async function handleConfirmFinish() {
    if (finishingRef.current) return
    const completed = finishGame(game)

    // ── Editing an existing round: overwrite in place, never create a new row ──
    if (isEdit) {
      finishingRef.current = true
      setFinishing(true)
      setSaveError(false)
      try {
        if (editContext.fromDb) {
          const res = await fetch('/api/games/' + editContext.id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(buildGamePatch(completed)),
          })
          if (!res.ok) throw new Error('patch failed')
        } else {
          const ok = updateCompletedGame(editContext.id, {
            players: completed.players,
            scores: completed.scores,
            courseId: completed.courseId ?? null,
            courseName: completed.courseName ?? null,
            completedAt: completed.completedAt,
            holesPlayed: completed.holesPlayed,
            holePars: completed.holePars,
            // Result fields are re-derived on read, but persist the full shape
            // finishGame stamps so the stored record stays self-consistent.
            winner: completed.winner,
            winners: completed.winners,
            isDraw: completed.isDraw,
            winningTotal: completed.winningTotal,
            dnf: completed.dnf,
            notes: (completed.notes ?? '').trim() || null,
          })
          if (!ok) throw new Error('storage write failed')
        }
      } catch {
        setSaveError(true)
        setFinishing(false)
        finishingRef.current = false
        setShowConfirm(false)
        return
      }

      clearActiveGame()
      clearActiveCell()
      track('Game Edited', { players: completed.players.length, holes: completed.holesPlayed })
      // Hand a read-only round to Summary. The _fromDb / synced flags stop
      // that screen re-saving it (see the alreadySaved guard in Summary).
      // A pending round (its save to the account is still outstanding)
      // is different: it was edited locally only and stays pending, so
      // Summary gets the stored record itself, marker included, and never
      // `synced: true`, which would claim the server has this edit.
      const stored = editContext.fromDb ? null : getCompletedGames().find(g => g.id === editContext.id)
      const summaryGame = editContext.fromDb
        ? { ...completed, _fromDb: true }
        : stored?.pendingSyncUserId
          ? { ...stored }
          : { ...completed, synced: true }
      delete summaryGame._edit
      navigate('summary', { game: summaryGame })
      // A pending round's edit is saved: the edit slot no longer protects it, so
      // ask for a sync run now and the edited data goes out (#113). After the
      // navigate, and not awaited, so it never delays it. A DB edit was PATCHed
      // and needs none.
      if (user?.id && stored?.pendingSyncUserId) syncPendingRounds(user.id)
      return
    }

    // ── Normal finish flow ──
    const saved = saveCompletedGame(completed)
    if (!saved && !user) {
      // A signed-out round lives only in this browser's storage. If that write
      // failed, keep the active game (it is still autosaved) and say so, rather
      // than clearing it and losing the round (#99). Signed in, the round still
      // reaches D1 from Summary, so carry on.
      setSaveError(true)
      setFinishing(false)
      finishingRef.current = false
      setShowConfirm(false)
      return
    }
    clearActiveGame()
    clearActiveCell()
    track('Game Completed', { players: players.length, holes: completed.holesPlayed })
    navigate('summary', { game: completed })
  }

  return (
    <div className="relative h-full bg-bg flex flex-col">

      <PageHeader
        title={isEdit ? 'Edit round' : 'Scorecard'}
        subtitle={null}
        // Neither branch steps back through real history — both are explicit
        // navigates with cleanup, so the label says what actually happens
        // rather than pretending to be back navigation (#43b). Edit mode's
        // target (History) is correct, so it gets an honest destination
        // label; the live/new-game mode doesn't clear the active game, so the
        // round survives in storage and reappears as "Resume Game" on Home —
        // "Pause" describes that accurately, "Quit"/"Back" would not. Pause is
        // an action, not a step back, so it gets no chevron.
        backLabel={isEdit ? 'History' : 'Pause'}
        backChevron={isEdit}
        onBack={() => {
          if (isEdit) {
            clearActiveGame()
            clearActiveCell()
            navigate('history')
            // The abandoned edit was all that kept a pending round from syncing
            // (#113); History reloads if the run changes anything.
            if (user?.id && !editContext.fromDb) syncPendingRounds(user.id)
          } else {
            navigate('home')
          }
        }}
        right={
          // A text action, except Finish once every hole is scored for every
          // player: then it is the expected next step, so it takes the pill.
          <HeaderAction filled={!isEdit && allHolesScored} onClick={() => setShowConfirm(true)}>
            {isEdit ? 'Save' : 'Finish'}
          </HeaderAction>
        }
      />

      <main className="flex-1 flex flex-col min-h-0">
        {/* Scrollable scorecard grid — full width, no horizontal scroll */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-14" />
              {players.map((_, i) => <col key={i} />)}
            </colgroup>

            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-bg-card">
                <th className={`h-9 py-2 pl-3 pr-1 text-left text-muted ${headCls}`}>
                  Hole
                </th>
                {players.map(player => (
                  <th key={player} className={`h-9 py-2 px-1 text-center text-muted ${headCls}`}>
                    <span className="flex items-center justify-center gap-0.5 min-w-0">
                      <span className="truncate min-w-0">{player}</span>
                      {isSignedInPlayer(player, user?.name) && <PlayerStar />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: displayedHoles }, (_, holeIndex) => {
                const isActiveRow = holeIndex === activeCell.holeIndex
                return (
                  <Fragment key={holeIndex}>
                    <tr
                      ref={isActiveRow ? activeRowRef : null}
                      className={[
                        'border-b border-border',
                        isActiveRow ? 'bg-accent-tint' : '',
                      ].join(' ')}
                    >
                      {/* Hole column: the deeper cream fill, left-aligned, no
                          hairline against the scores. In the active row the cell
                          paints no fill of its own, so the row's 8% tint shows
                          uniformly across the whole row (as in the Figma frames).
                          Hole number and bracket are accent there (muted on the
                          tint is only 4.39:1 over the card, below AA); in the
                          other rows the number is text and the bracket muted. */}
                      <td className={[
                        'h-12 pl-3 pr-1 text-left whitespace-nowrap',
                        isActiveRow ? 'text-accent' : 'bg-bg-card',
                      ].join(' ')}>
                        <span className={['type-strong', isActiveRow ? '' : 'text-text'].join(' ')}>{holeIndex + 1}</span>
                        <span className={['type-caption ml-0.5', isActiveRow ? '' : 'text-muted'].join(' ')}>({holePars[holeIndex]})</span>
                      </td>
                      {players.map((player, playerIndex) => {
                        const score    = (game.scores?.[player] ?? [])[holeIndex] ?? null
                        const isActive = isActiveRow && playerIndex === activeCell.playerIndex
                        return (
                          <td
                            key={player}
                            className={[
                              'p-0 text-center type-strong select-none transition-colors',
                              isActive ? 'bg-accent text-on-accent' : 'text-text',
                            ].join(' ')}
                          >
                            {/* A real button filling the cell (the whole 48px cell is
                                the tap target), so a keyboard, switch or screen-reader
                                user can jump to any hole to correct a score, not just
                                step forward with Advance (#96). whitespace-nowrap keeps
                                the score and its delta on one line. */}
                            <button
                              type="button"
                              onClick={() => moveToCell({ holeIndex, playerIndex })}
                              aria-label={`Hole ${holeIndex + 1}, par ${holePars[holeIndex]}, ${player}: ${score ?? 'no score yet'}`}
                              aria-current={isActive ? 'true' : undefined}
                              className={[
                                'flex items-center justify-center w-full h-12 px-0.5 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
                                isActive ? 'focus-visible:ring-on-accent' : 'focus-visible:ring-accent',
                              ].join(' ')}
                            >
                              {score ?? '–'}
                              {score != null && (
                                <ParDelta delta={scoreToPar(score, holePars[holeIndex])} inverted={isActive} />
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Front 9 subtotal row — 18-hole rounds
                        only, appears once hole 9 is fully scored and stays
                        visible for the rest of the round. Heavier borders and
                        the card surface mark it as a break, not another hole
                        row, matching how the totals bar below is
                        differentiated from the hole grid. No per-hole par
                        bracket here — it isn't a specific hole. */}
                    {holeIndex === 8 && frontNineComplete && (
                      <tr className="border-t-2 border-b border-border bg-bg-card">
                        {/* Caption with whitespace-nowrap (owner call, 23
                            November 2026): at Caption size "Front 9" fits the
                            fixed w-14 hole column on one line, where the
                            Strong size wrapped onto two. */}
                        <td className={`${bandRowCls} pl-3 pr-0 text-left type-caption text-text whitespace-nowrap`}>
                          Front 9
                        </td>
                        {players.map(player => {
                          const { total, toPar } = subtotal(game.scores?.[player] ?? [], holePars, 0, 9)
                          return (
                            <td key={player} className={`${bandRowCls} px-0.5 text-center type-strong text-text whitespace-nowrap`}>
                              {total ?? '–'}
                              <ParDelta delta={toPar} variant="bracket" className={dense ? 'block' : ''} />
                            </td>
                          )
                        })}
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals bar — always visible. A flex row outside the table, kept in
            step with its columns: a w-14 label, then one equal flex-1 share per
            player (min-w-0 so a wide total never widens its column). One line
            (`55 (+22)`, 44px) for 1 to 4 players; total with its bracket
            below (56px) for 5 or 6. */}
        <div className="bg-bg-card border-t-2 border-border flex">
          <div className={`w-14 shrink-0 pl-3 pr-1 type-strong text-text flex items-center ${bandRowCls}`}>
            Total
          </div>
          {players.map(player => (
            <div
              key={player}
              className={`flex-1 min-w-0 px-0.5 flex justify-center items-center text-center type-strong text-text whitespace-nowrap ${bandRowCls}`}
            >
              {/* One child, so the flex row centres it as a unit and the
                  space before the bracket survives (flex items drop it). */}
              <div>
                {playerTotal(game.scores, player) || '–'}
                <ParDelta
                  delta={roundToPar((game.scores?.[player] ?? []).slice(0, holePars.length), holePars)}
                  variant="bracket"
                  className={dense ? 'block' : ''}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Floating control bar. Relative so the save-failure toast can float
            just above it. The next failed save shows the toast again. */}
        <div className="relative bg-bg border-t border-border px-page py-4">
          {saveError && (
            <Toast onDismiss={() => setSaveError(false)} className="bottom-full mb-related">
              {isEdit
                ? "Couldn't save your changes – check your connection and try again"
                : "Couldn't save – storage may be full"}
            </Toast>
          )}
          <div className="flex items-center justify-between">
            {isBruntsfieldCourse ? (
              <button
                onClick={() => setShowMap(true)}
                aria-label="View course map"
                // No ring: the map is glanced at now and then, so it steps back
                // from the three per-shot scoring controls beside it. Same 64px
                // tap area; a small "Map" caption replaces the circle as the cue.
                // Muted (not control-warm) so the 11px caption clears 4.5:1.
                className="w-16 h-16 rounded-control text-muted flex flex-col items-center justify-center gap-1 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0z" />
                </svg>
                <span aria-hidden="true" className="type-caption">Map</span>
              </button>
            ) : <div className="w-16" />}
            <button
              onClick={handleDecrement}
              disabled={activeScore === null}
              aria-label="Decrease score"
              className="w-16 h-16 rounded-full border-2 border-control-warm font-ui text-2xl text-control-warm flex items-center justify-center disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              −
            </button>
            <button
              onClick={handleIncrement}
              aria-label="Increase score"
              className="w-16 h-16 rounded-full bg-accent border-2 border-accent text-on-accent font-ui text-2xl flex items-center justify-center active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              +
            </button>
            <button
              onClick={handleAdvance}
              disabled={activeCell.holeIndex === displayedHoles - 1 && activeCell.playerIndex === players.length - 1}
              aria-label="Advance to next player"
              className="w-16 h-16 rounded-full bg-control-warm border-2 border-control-warm text-on-accent flex items-center justify-center disabled:opacity-25 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* "Edit game setup" — edit mode only. Setup's default landing point
            moved to Summary's Edit tap going straight here (players/course/
            par/notes/date are unchanged, just reached differently); this is
            the explicit way back to that unchanged Setup screen for anyone
            who does want to change those things. No free slot in the header
            (left = back, right = Save), so it sits in its own row below the
            game controls rather than competing with Save for attention — same
            weight as Summary's "Edit round" link. Passes the live `game`
            state (not the initial copy) so Setup picks up whatever's already
            been scored. */}
        {isEdit && (
          <div className="bg-bg px-page pb-4 text-center shrink-0">
            <TextLink size="small-strong" tone="muted" pad="lg" onClick={() => navigate('setup', { editRound: true, game, fromScorecard: true })}>
              Edit game setup
            </TextLink>
          </div>
        )}
      </main>

      {isBruntsfieldCourse && showMap && <CourseMapModal onClose={() => setShowMap(false)} />}


      {/* Confirmation dialog */}
      {showConfirm && (
        <ConfirmSheet
          title={isEdit ? 'Save changes?' : 'Finish game?'}
          onClose={() => setShowConfirm(false)}
          locked={finishing}
          initialFocusRef={cancelFinishRef}
        >
            <p className="type-small text-muted mb-6">
              {isEdit ? 'This replaces the saved round. Winner and totals update.' : 'Scores are final'}
            </p>
            <div className="space-y-2 mb-8">
              {players.map(player => (
                <div key={player} className="flex justify-between type-body text-text">
                  <span>
                    {player}
                    {isSignedInPlayer(player, user?.name) && <PlayerStar className="ml-0.5" />}
                  </span>
                  <span className="type-strong">
                    {playerTotal(game.scores, player) || '–'}
                    <ParDelta delta={roundToPar((game.scores?.[player] ?? []).slice(0, holePars.length), holePars)} variant="bracket" />
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                ref={cancelFinishRef}
                variant="secondary"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
                disabled={finishing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmFinish}
                disabled={finishing}
              >
                {isEdit ? (finishing ? 'Saving…' : 'Save changes') : 'Confirm'}
              </Button>
            </div>
        </ConfirmSheet>
      )}
    </div>
  )
}
