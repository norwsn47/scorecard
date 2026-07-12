import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { formatShortDate } from '../utils/format.js'
import { playerAverage, playerTotal } from '../utils/scores.js'
import { deleteCompletedGame, getCompletedGames } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

function normalizeDbGame(row) {
  const playerData = typeof row.player_data === 'string'
    ? JSON.parse(row.player_data)
    : (row.player_data ?? [])

  const players = playerData.map(p => p.name)
  const scores  = {}
  const dnf     = []

  playerData.forEach(p => {
    scores[p.name] = p.scores ?? []
    if (p.dnf) dnf.push(p.name)
  })

  const finishers = playerData.filter(p => !p.dnf && p.total > 0)
  const winner = finishers.length > 0
    ? finishers.reduce((best, p) => p.total < best.total ? p : best).name
    : null

  return {
    id:          row.id,
    name:        row.game_name || '',
    completedAt: row.played_at,
    holesPlayed: row.holes_played,
    courseName:  row.course_name || null,
    notes:       row.notes || null,
    players,
    scores,
    winner,
    dnf,
    _fromDb: true,
  }
}

export default function History({ navigate }) {
  const { user } = useAuth()

  const [games, setGames]     = useState(() => user ? [] : getCompletedGames())
  const [loading, setLoading] = useState(!!user)
  const [filter, setFilter]   = useState(null)

  useEffect(() => {
    if (!user) return
    fetch('/api/games', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setGames((data.games ?? []).map(normalizeDbGame)))
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  }, [user])

  const displayed = filter
    ? games.filter(g => g.players?.includes(filter))
    : games

  function toggleFilter(name) {
    setFilter(prev => (prev === name ? null : name))
  }

  async function handleDelete(e, game) {
    e.stopPropagation()
    if (game._fromDb) {
      await fetch(`/api/games/${game.id}`, { method: 'DELETE', credentials: 'include' })
        .catch(() => {})
    } else {
      deleteCompletedGame(game.id)
    }
    setGames(prev => prev.filter(g => g.id !== game.id))
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader title="History" onBack={() => navigate('home')} />

      {/* Disclaimer — logged-out only */}
      {!user && (
        <div className="px-5 pt-4 pb-1 shrink-0">
          <p className="font-ui text-xs text-muted leading-relaxed">
            Stored on your device. Gone if you clear your browser.
          </p>
        </div>
      )}

      {/* Active player filter chip */}
      {filter && (
        <div className="px-5 pt-3 flex items-center gap-2 shrink-0">
          <span className="font-ui text-xs text-muted">Showing games for</span>
          <button
            onClick={() => setFilter(null)}
            className="flex items-center gap-1 py-1 px-3 rounded-full bg-accent text-bg font-ui text-xs font-medium"
          >
            {filter}
            <span className="ml-1 opacity-70">✕</span>
          </button>
        </div>
      )}

      {/* Game list */}
      <main className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

        {loading && (
          <div className="text-center pt-16">
            <p className="font-ui text-sm text-muted">Loading…</p>
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="text-center pt-16">
            {filter ? (
              <>
                <p className="font-display italic text-xl text-text mb-2">No rounds found</p>
                <p className="font-ui text-sm text-muted">
                  {filter} hasn't played a recorded round.
                </p>
                <button
                  onClick={() => setFilter(null)}
                  className="mt-4 font-ui text-sm text-accent underline"
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
                  className="py-3 px-6 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn"
                >
                  New Game
                </button>
              </>
            )}
          </div>
        )}

        {!loading && displayed.map(game => (
          <div
            key={game.id}
            className="relative bg-bg-card rounded-md border border-border shadow-card"
          >
            <button
              onClick={() => navigate('summary', { game })}
              className="w-full text-left px-4 pt-4 pb-4 pr-10 active:opacity-70"
            >
              {/* Course name */}
              {game.courseName && (
                <p className="font-ui text-xs tracking-[0.08em] uppercase text-accent mb-1">{game.courseName}</p>
              )}

              {/* Game name */}
              {game.name && (
                <p className="font-ui text-sm font-semibold text-text mb-1">{game.name}</p>
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
                  const isWinner = name === game.winner
                  const avg      = playerAverage(game.scores, name)
                  const isDnf    = game.dnf?.includes(name)
                  const total    = playerTotal(game.scores, name)
                  return (
                    <div key={name} className="flex items-center justify-between">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={e => { e.stopPropagation(); toggleFilter(name) }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleFilter(name) } }}
                        className={[
                          'font-ui text-sm',
                          isWinner ? 'text-accent font-semibold' : 'text-text',
                        ].join(' ')}
                      >
                        {name}
                        {isDnf && <span className="text-muted font-normal"> (DNF)</span>}
                      </span>
                      <span className="font-ui text-xs text-muted">
                        {total > 0 ? total : '-'}{avg !== null ? ` (Av. ${avg})` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Notes */}
              {game.notes && (
                <p className="font-ui text-xs text-muted mt-2 italic leading-relaxed line-clamp-2">{game.notes}</p>
              )}
            </button>

            {/* Delete button */}
            <button
              onClick={e => handleDelete(e, game)}
              aria-label="Delete game"
              className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center text-muted active:text-text"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

      </main>
    </div>
  )
}
