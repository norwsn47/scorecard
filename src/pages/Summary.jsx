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
      <header className="px-5 pt-10 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="font-ui text-xs tracking-[0.2em] uppercase text-muted">
            {game.holesPlayed ?? game.holes} holes · {formatDate(game.completedAt)}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
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
              className="font-ui text-xs text-accent underline underline-offset-2 active:opacity-70"
            >
              Create an account to save your rounds
            </button>
          </div>
        )}

      </div>

    </div>
  )
}
