import { useEffect, useRef, useState } from 'react'
import CourseMapModal from '../components/CourseMapModal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ParDelta from '../components/ParDelta.jsx'
import { track } from '../utils/analytics.js'
import { computeDisplayedHoles, finishGame } from '../utils/game.js'
import { deriveHolePars, playerTotal, roundToPar, scoreToPar } from '../utils/scores.js'
import { clearActiveCell, clearActiveGame, getActiveCell, getActiveGame, saveActiveCell, saveActiveGame, saveCompletedGame, updateCompletedGame } from '../utils/storage.js'

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

  const fromBruntsfield               = params?.bruntsfield ?? false
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
    if (!game) navigate('home')
  }, [game]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!game) return null

  const players       = Array.isArray(game.players) ? game.players : []
  const displayedHoles = computeDisplayedHoles(players, game.scores ?? {}, game.holes)
  const holePars      = deriveHolePars(game.holePars, game.holes ?? 36)

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

  const MAX_STROKES = 14

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

  function buildPlayerData(completed) {
    return completed.players.map(p => ({
      name: p,
      scores: (completed.scores[p] ?? []).slice(0, completed.holesPlayed),
      total: playerTotal(completed.scores, p) || 0,
      dnf: completed.dnf?.includes(p) ?? false,
    }))
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
            body: JSON.stringify({
              course_id: completed.courseId || null,
              played_at: completed.completedAt,
              holes_played: completed.holesPlayed,
              player_data: buildPlayerData(completed),
              hole_pars: completed.holePars ?? null,
              notes: (completed.notes ?? '').trim() || null,
            }),
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
      const summaryGame = editContext.fromDb
        ? { ...completed, _fromDb: true }
        : { ...completed, synced: true }
      delete summaryGame._edit
      navigate('summary', { game: summaryGame })
      return
    }

    // ── Normal finish flow ──
    saveCompletedGame(completed)
    clearActiveGame()
    clearActiveCell()
    track('Game Completed', { players: players.length, holes: completed.holesPlayed })
    navigate('summary', { game: completed })
  }

  return (
    <div className="relative h-full bg-bg flex flex-col">

      {saveError && (
        <div className="bg-accent text-bg text-center font-ui text-xs py-2 px-4 tracking-wide">
          {isEdit
            ? "Couldn't save your changes – check your connection and try again"
            : "Couldn't save – storage may be full"}
        </div>
      )}

      <PageHeader
        title={isEdit ? 'Edit Round' : 'Scorecard'}
        subtitle={null}
        // Neither branch steps back through real history — both are explicit
        // navigates with cleanup, so the label says what actually happens
        // rather than pretending to be back navigation (#43b). Edit mode's
        // target (History) is correct, so it gets an honest destination
        // label; the live/new-game mode doesn't clear the active game, so the
        // round survives in storage and reappears as "Resume Game" on Home —
        // "Pause" describes that accurately, "Quit"/"← Back" would not.
        backLabel={isEdit ? '← History' : 'Pause'}
        onBack={() => {
          if (isEdit) {
            clearActiveGame()
            clearActiveCell()
            navigate('history')
          } else {
            navigate('home')
          }
        }}
        right={
          <button
            onClick={() => setShowConfirm(true)}
            className="py-2 px-4 rounded-sm border border-accent text-accent font-ui text-xs tracking-[0.1em] uppercase font-semibold"
          >
            {isEdit ? 'Save' : 'Finish'}
          </button>
        }
      />

      {/* Scrollable scorecard grid — full width, no horizontal scroll */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-14" />
            {players.map((_, i) => <col key={i} />)}
          </colgroup>

          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-bg-card">
              <th className="py-2 px-2 text-center font-ui text-xs tracking-[0.12em] uppercase text-muted">
                Hole
              </th>
              {players.map(player => (
                <th key={player} className="py-2 px-1 text-center font-ui text-xs tracking-[0.12em] uppercase text-muted">
                  <span className="block truncate px-1">{player}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: displayedHoles }, (_, holeIndex) => {
              const isActiveRow = holeIndex === activeCell.holeIndex
              return (
                <tr
                  key={holeIndex}
                  ref={isActiveRow ? activeRowRef : null}
                  className={[
                    'border-b border-border',
                    isActiveRow ? 'bg-accent-tint' : '',
                  ].join(' ')}
                >
                  <td className={[
                    'py-3 px-2 text-center font-ui text-xs whitespace-nowrap',
                    isActiveRow ? 'text-accent font-semibold' : 'text-chrome',
                  ].join(' ')}>
                    <span className="font-semibold">{holeIndex + 1}</span>
                    <span className="font-normal ml-0.5">({holePars[holeIndex]})</span>
                  </td>
                  {players.map((player, playerIndex) => {
                    const score    = (game.scores?.[player] ?? [])[holeIndex] ?? null
                    const isActive = isActiveRow && playerIndex === activeCell.playerIndex
                    return (
                      <td
                        key={player}
                        onClick={() => moveToCell({ holeIndex, playerIndex })}
                        className={[
                          'py-3 px-1 text-center font-ui text-sm cursor-pointer select-none transition-colors',
                          isActive ? 'bg-accent text-white font-semibold' : 'text-text',
                        ].join(' ')}
                      >
                        {score ?? '–'}
                        {score != null && (
                          <ParDelta delta={scoreToPar(score, holePars[holeIndex])} inverted={isActive} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals bar — always visible */}
      <div className="bg-bg-card border-t-2 border-border flex">
        <div className="w-14 py-3 px-2 font-ui text-xs tracking-[0.12em] uppercase text-muted flex items-center justify-center">
          Total
        </div>
        {players.map(player => (
          <div key={player} className="flex-1 py-3 px-1 text-center font-ui text-base font-semibold text-text leading-tight">
            {playerTotal(game.scores, player) || '–'}
            <ParDelta
              delta={roundToPar((game.scores?.[player] ?? []).slice(0, holePars.length), holePars)}
              variant="bracket"
              className="text-sm font-normal"
            />
          </div>
        ))}
      </div>

      {/* Floating control bar */}
      <div className="bg-bg border-t border-border px-5 py-4">
        <div className="flex items-center justify-between">
          {fromBruntsfield ? (
            <button
              onClick={() => setShowMap(true)}
              aria-label="View course map"
              className="w-16 h-16 rounded-full border-2 border-chrome text-chrome flex items-center justify-center active:opacity-70"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0z" />
              </svg>
            </button>
          ) : <div className="w-16" />}
          <button
            onClick={handleDecrement}
            disabled={activeScore === null}
            aria-label="Decrease score"
            className="w-16 h-16 rounded-full border-2 border-chrome font-ui text-2xl text-chrome flex items-center justify-center disabled:opacity-25"
          >
            −
          </button>
          <button
            onClick={handleIncrement}
            aria-label="Increase score"
            className="w-16 h-16 rounded-full bg-accent border-2 border-accent text-bg font-ui text-2xl flex items-center justify-center active:opacity-80"
          >
            +
          </button>
          <button
            onClick={handleAdvance}
            disabled={activeCell.holeIndex === displayedHoles - 1 && activeCell.playerIndex === players.length - 1}
            aria-label="Advance to next player"
            className="w-16 h-16 rounded-full bg-control-warm border-2 border-control-warm text-bg flex items-center justify-center disabled:opacity-25 active:opacity-80"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {fromBruntsfield && showMap && <CourseMapModal onClose={() => setShowMap(false)} />}


      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="absolute inset-0 flex items-end justify-center z-50" style={{ background: 'var(--overlay-backdrop)' }}>
          <div className="bg-bg rounded-t-2xl w-full max-w-[430px] px-6 pt-6 pb-10 shadow-card">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
            <h2 className="font-display italic text-2xl text-text mb-1">
              {isEdit ? 'Save changes?' : 'Finish Game?'}
            </h2>
            <p className="font-ui text-xs text-muted tracking-wide mb-6">
              {isEdit ? 'This replaces the saved round. Winner and totals update.' : 'Scores are final'}
            </p>
            <div className="space-y-2 mb-8">
              {players.map(player => (
                <div key={player} className="flex justify-between font-ui text-sm text-text">
                  <span>{player}</span>
                  <span className="font-semibold">
                    {playerTotal(game.scores, player) || '–'}
                    <ParDelta delta={roundToPar((game.scores?.[player] ?? []).slice(0, holePars.length), holePars)} variant="bracket" />
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={finishing}
                className="flex-1 py-3 rounded-sm border border-border font-ui text-sm tracking-[0.08em] uppercase text-text disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinish}
                disabled={finishing}
                className="flex-1 py-3 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.08em] uppercase font-semibold disabled:opacity-60"
              >
                {isEdit ? (finishing ? 'Saving…' : 'Save changes') : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
