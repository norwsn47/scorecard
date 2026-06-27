import { useState } from 'react'
import { finishGame } from '../utils/game.js'
import { clearActiveGame, getActiveGame, saveActiveGame, saveCompletedGame } from '../utils/storage.js'

export default function Scorecard({ navigate, params }) {
  const [game, setGame]             = useState(() => params?.game ?? getActiveGame())
  const [showConfirm, setShowConfirm] = useState(false)
  const [saveError, setSaveError]   = useState(false)

  // Guard: if no game in state or storage, return to home
  if (!game) {
    navigate('home')
    return null
  }

  // Guard against malformed scores shape
  const players = Array.isArray(game.players) ? game.players : []

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

  function increment(player, holeIndex) {
    const currentRow = Array.isArray(game.scores?.[player]) ? game.scores[player] : []
    const current = currentRow[holeIndex] ?? null
    updateScores(player, holeIndex, current === null ? 1 : current + 1)
  }

  function decrement(player, holeIndex) {
    const currentRow = Array.isArray(game.scores?.[player]) ? game.scores[player] : []
    const current = currentRow[holeIndex] ?? null
    if (current === null || current <= 1) return
    updateScores(player, holeIndex, current - 1)
  }

  function playerTotal(player) {
    return (game.scores[player] ?? [])
      .filter(s => s !== null)
      .reduce((sum, s) => sum + s, 0)
  }

  function handleConfirmFinish() {
    const completed = finishGame(game)
    saveCompletedGame(completed)
    clearActiveGame()
    navigate('summary', { game: completed })
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Save error banner */}
      {saveError && (
        <div className="bg-accent text-bg text-center font-ui text-xs py-2 px-4 tracking-wide">
          Could not save — storage may be full or blocked
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-10 pb-4 border-b border-border">
        <div>
          <p className="font-display italic text-lg text-text leading-tight">The Golf Tavern</p>
          <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-0.5">
            Bruntsfield Links · {game.holes} holes
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="py-2.5 px-5 rounded-md bg-accent text-bg font-ui text-xs tracking-[0.1em] uppercase font-semibold shadow-btn"
        >
          Finish
        </button>
      </header>

      {/* Scorecard grid */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-card">
              <th className="py-2 px-3 text-left font-ui text-xs tracking-[0.12em] uppercase text-muted w-12">
                Hole
              </th>
              {players.map(player => (
                <th
                  key={player}
                  className="py-2 px-3 text-center font-ui text-xs tracking-[0.12em] uppercase text-muted max-w-[90px]"
                >
                  <span className="block truncate">{player}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: game.holes }, (_, holeIndex) => (
              <tr key={holeIndex} className="border-b border-border">
                <td className="py-2 px-3 font-ui text-xs text-muted text-left">
                  {holeIndex + 1}
                </td>
                {players.map(player => {
                  const score = (game.scores?.[player] ?? [])[holeIndex] ?? null
                  const isNull = score === null
                  const atMin  = score !== null && score <= 1
                  return (
                    <td key={player} className="py-2 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => decrement(player, holeIndex)}
                          disabled={isNull || atMin}
                          aria-label={`Decrease ${player} hole ${holeIndex + 1}`}
                          className="w-11 h-11 rounded-full border border-border font-ui text-base text-text flex items-center justify-center disabled:opacity-30 active:bg-bg-card"
                        >
                          −
                        </button>
                        <span className="font-ui text-base text-text w-6 text-center">
                          {isNull ? '—' : score}
                        </span>
                        <button
                          onClick={() => increment(player, holeIndex)}
                          aria-label={`Increase ${player} hole ${holeIndex + 1}`}
                          className="w-11 h-11 rounded-full border border-border font-ui text-base text-text flex items-center justify-center active:bg-bg-card"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-bg-card border-t-2 border-border">
              <td className="py-3 px-3 font-ui text-xs tracking-[0.12em] uppercase text-muted">
                Total
              </td>
              {players.map(player => (
                <td key={player} className="py-3 px-3 text-center font-ui text-base font-semibold text-text">
                  {playerTotal(player) || '—'}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-text/40 flex items-end justify-center z-50">
          <div className="bg-bg rounded-t-2xl w-full max-w-sm px-6 pt-6 pb-10 shadow-card">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
            <h2 className="font-display italic text-2xl text-text mb-1">Finish Game?</h2>
            <p className="font-ui text-xs text-muted tracking-wide mb-6">
              This cannot be undone
            </p>

            <div className="space-y-2 mb-8">
              {players.map(player => (
                <div key={player} className="flex justify-between font-ui text-sm text-text">
                  <span>{player}</span>
                  <span className="font-semibold">{playerTotal(player) || '—'}</span>
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
