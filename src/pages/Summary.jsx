import { useState } from 'react'
import { track } from '../utils/analytics.js'
import { formatDate } from '../utils/format.js'
import { playerAverage, playerTotal } from '../utils/scores.js'
import { shareScorecard } from '../utils/share.js'
import { getCompletedGames } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Summary({ navigate, params }) {
  const { user }          = useAuth()
  const [sharing, setSharing] = useState(false)
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)

  const game = params?.game ?? getCompletedGames()[0] ?? null

  if (!game) {
    navigate('home')
    return null
  }

  const isDnf    = player => game.dnf?.includes(player)
  const isWinner = player => player === game.winner

  async function handleGoHome() {
    if (user) {
      setSaving(true)
      try {
        const playerData = game.players.map(p => ({
          name: p,
          scores: (game.scores[p] ?? []).slice(0, game.holesPlayed),
          total: playerTotal(game.scores, p) || 0,
          dnf: game.dnf?.includes(p) ?? false,
        }))
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            game_name: game.name || null,
            course_id: game.courseId || null,
            played_at: game.completedAt,
            holes_played: game.holesPlayed,
            player_data: playerData,
            notes: notes.trim() || null,
          }),
        })
      } catch {
        // Save failed silently — game is still in localStorage
      } finally {
        setSaving(false)
      }
    }
    navigate('home')
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      {/* Header */}
      <header className="px-5 pt-12 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="font-ui text-xs tracking-[0.2em] uppercase text-muted">
            {game.holesPlayed ?? game.holes} holes · {formatDate(game.completedAt)}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-display italic text-3xl text-text text-center">Game Complete</h1>
      </header>

      {/* Winner callout */}
      {game.winner ? (
        <div className="mx-5 mt-5 py-4 px-5 rounded-md bg-bg-card border border-border text-center">
          <p className="font-ui text-xs tracking-[0.2em] uppercase text-muted mb-1">Winner</p>
          <p className="font-display italic text-2xl text-accent">{game.winner}</p>
          <p className="font-ui text-xs text-muted mt-1">
            {playerTotal(game.scores, game.winner)} strokes
          </p>
        </div>
      ) : (
        <div className="mx-5 mt-5 py-4 px-5 rounded-md bg-bg-card border border-border text-center">
          <p className="font-ui text-xs tracking-[0.2em] uppercase text-muted">No winner - all players DNF</p>
        </div>
      )}

      {/* Read-only scorecard */}
      <div className="flex-1 overflow-y-auto overflow-x-auto mt-6">
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

          <tfoot>
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

        {/* Notes — logged-in only */}
        {user && (
          <div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 300))}
              placeholder="Add a note about this round..."
              rows={2}
              className="w-full px-4 py-3 rounded-md border border-border bg-bg-card font-ui text-sm text-text placeholder:text-chrome resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <p className="font-ui text-xs text-muted mt-1 pl-1">Round notes - optional</p>
          </div>
        )}

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
          className="w-full py-4 rounded-md border border-border text-text font-ui text-sm tracking-[0.1em] uppercase font-medium active:bg-bg-card disabled:opacity-40"
        >
          {sharing ? 'Generating…' : 'Share Scorecard'}
        </button>

        <button
          onClick={handleGoHome}
          disabled={saving}
          className="w-full py-4 rounded-md bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Back to Home'}
        </button>

      </div>

    </div>
  )
}
