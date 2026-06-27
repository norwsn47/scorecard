import { useEffect, useRef, useState } from 'react'
import CourseMapModal from '../components/CourseMapModal.jsx'
import { track } from '../utils/analytics.js'
import { computeDisplayedHoles, finishGame } from '../utils/game.js'
import { playerTotal } from '../utils/scores.js'
import { clearActiveGame, getActiveGame, saveActiveGame, saveCompletedGame } from '../utils/storage.js'

export default function Scorecard({ navigate, params }) {
  const [game, setGame]               = useState(() => params?.game ?? getActiveGame())
  const [showConfirm, setShowConfirm] = useState(false)

  const [showMap, setShowMap]         = useState(false)
  const [saveError, setSaveError]     = useState(false)
  const [activeCell, setActiveCell]   = useState({ holeIndex: 0, playerIndex: 0 })
  const activeRowRef = useRef(null)

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeCell.holeIndex])

  if (!game) {
    navigate('home')
    return null
  }

  const players       = Array.isArray(game.players) ? game.players : []
  const displayedHoles = computeDisplayedHoles(players, game.scores ?? {}, game.holes)

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
    updateScores(activePlayer, activeCell.holeIndex, activeScore === null ? 1 : activeScore + 1)
  }

  function handleDecrement() {
    if (!activePlayer || activeScore === null) return
    updateScores(activePlayer, activeCell.holeIndex, activeScore <= 1 ? null : activeScore - 1)
  }

  function handleAdvance() {
    const nextPlayer = activeCell.playerIndex + 1
    if (nextPlayer < players.length) {
      setActiveCell({ holeIndex: activeCell.holeIndex, playerIndex: nextPlayer })
    } else {
      const nextHole = activeCell.holeIndex + 1
      if (nextHole < game.holes) {
        setActiveCell({ holeIndex: nextHole, playerIndex: 0 })
      }
    }
  }

  function handleConfirmFinish() {
    const completed = finishGame(game)
    saveCompletedGame(completed)
    clearActiveGame()
    track('Game Completed', { players: players.length, holes: completed.holesPlayed })
    navigate('podium', { game: completed })
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      {saveError && (
        <div className="bg-accent text-bg text-center font-ui text-xs py-2 px-4 tracking-wide">
          Could not save — storage may be full or blocked
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-10 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('home')}
            aria-label="Back to home"
            className="text-chrome active:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="font-display italic text-lg text-text leading-tight">The Golf Tavern</p>
            <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-0.5">
              Bruntsfield Links
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMap(true)}
            aria-label="View course map"
            className="w-10 h-10 flex items-center justify-center rounded-md border border-border text-muted active:bg-bg-card"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="py-2.5 px-5 rounded-md bg-accent text-bg font-ui text-xs tracking-[0.1em] uppercase font-semibold shadow-btn"
          >
            Finish
          </button>
        </div>
      </header>

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
                    isActiveRow ? 'bg-[rgba(184,85,48,0.05)]' : '',
                  ].join(' ')}
                >
                  <td className={[
                    'py-3 px-2 font-ui text-xs text-center',
                    isActiveRow ? 'text-accent font-semibold' : 'text-chrome',
                  ].join(' ')}>
                    {holeIndex + 1}
                  </td>
                  {players.map((player, playerIndex) => {
                    const score    = (game.scores?.[player] ?? [])[holeIndex] ?? null
                    const isActive = isActiveRow && playerIndex === activeCell.playerIndex
                    return (
                      <td
                        key={player}
                        onClick={() => setActiveCell({ holeIndex, playerIndex })}
                        className={[
                          'py-3 px-1 text-center font-ui text-sm cursor-pointer select-none transition-colors',
                          isActive ? 'bg-accent text-white font-semibold' : 'text-text',
                        ].join(' ')}
                      >
                        {score ?? '—'}
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
          <div key={player} className="flex-1 py-3 px-1 text-center font-ui text-base font-semibold text-text">
            {playerTotal(game.scores, player) || '—'}
          </div>
        ))}
      </div>

      {/* Floating control bar */}
      <div className="bg-bg border-t border-border px-5 py-4">
        <div className="flex items-center justify-end gap-3">
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
            className="w-16 h-16 rounded-full bg-control-warm text-bg flex items-center justify-center disabled:opacity-25 active:opacity-80"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {showMap && <CourseMapModal onClose={() => setShowMap(false)} />}


      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: 'var(--overlay-backdrop)' }}>
          <div className="bg-bg rounded-t-2xl w-full max-w-[430px] px-6 pt-6 pb-10 shadow-card">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
            <h2 className="font-display italic text-2xl text-text mb-1">Finish Game?</h2>
            <p className="font-ui text-xs text-muted tracking-wide mb-6">
              This cannot be undone
            </p>
            <div className="space-y-2 mb-8">
              {players.map(player => (
                <div key={player} className="flex justify-between font-ui text-sm text-text">
                  <span>{player}</span>
                  <span className="font-semibold">{playerTotal(game.scores, player) || '—'}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-md border border-border font-ui text-sm tracking-[0.08em] uppercase text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinish}
                className="flex-1 py-3 rounded-md bg-accent text-bg font-ui text-sm tracking-[0.08em] uppercase font-semibold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
