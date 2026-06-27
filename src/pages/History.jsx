import { useState } from 'react'
import { getCompletedGames } from '../utils/storage.js'

function formatShortDate(isoString) {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(isoString))
}

export default function History({ navigate }) {
  const games          = getCompletedGames()
  const [filter, setFilter] = useState(null) // player name or null

  const displayed = filter
    ? games.filter(g => g.players?.includes(filter))
    : games

  function toggleFilter(name) {
    setFilter(prev => (prev === name ? null : name))
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Header */}
      <header className="flex items-center px-5 pt-12 pb-5 border-b border-border">
        <button
          onClick={() => navigate('home')}
          className="py-2 text-muted font-ui text-sm tracking-[0.08em] uppercase mr-4"
        >
          ← Back
        </button>
        <h1 className="font-display italic text-2xl text-text">History</h1>
      </header>

      {/* Active player filter chip */}
      {filter && (
        <div className="px-5 pt-4 flex items-center gap-2">
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
      <main className="flex-1 px-5 py-4 space-y-3 max-w-sm mx-auto w-full">

        {displayed.length === 0 && (
          <div className="text-center pt-16">
            {filter ? (
              <>
                <p className="font-display italic text-xl text-text mb-2">No games found</p>
                <p className="font-ui text-sm text-muted">
                  {filter} hasn't played any recorded games.
                </p>
                <button
                  onClick={() => setFilter(null)}
                  className="mt-4 font-ui text-sm text-accent underline"
                >
                  Show all games
                </button>
              </>
            ) : (
              <>
                <p className="font-display italic text-xl text-text mb-2">No games yet</p>
                <p className="font-ui text-sm text-muted mb-6">
                  Finish a round to see it here.
                </p>
                <button
                  onClick={() => navigate('setup')}
                  className="py-3 px-6 rounded-md bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn"
                >
                  New Game
                </button>
              </>
            )}
          </div>
        )}

        {displayed.map(game => (
          <button
            key={game.id}
            onClick={() => navigate('summary', { game })}
            className="w-full text-left bg-bg-card rounded-md border border-border px-4 py-4 shadow-card active:opacity-80"
          >
            {/* Date + holes */}
            <div className="flex justify-between items-start mb-2">
              <span className="font-ui text-xs text-muted">
                {formatShortDate(game.completedAt)}
              </span>
              <span className="font-ui text-xs text-muted">
                {game.holesPlayed ?? game.holes} holes
              </span>
            </div>

            {/* Winner */}
            {game.winner && (
              <p className="font-display italic text-lg text-accent leading-tight mb-2">
                {game.winner}
              </p>
            )}

            {/* Players (tappable for filter) */}
            <div className="flex flex-wrap gap-2 mt-1">
              {(game.players ?? []).map(name => (
                <span
                  key={name}
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation()
                    toggleFilter(name)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      toggleFilter(name)
                    }
                  }}
                  className={[
                    'font-ui text-xs py-0.5 px-2 rounded-full border',
                    filter === name
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-muted',
                  ].join(' ')}
                >
                  {name}
                  {game.dnf?.includes(name) && ' (DNF)'}
                </span>
              ))}
            </div>
          </button>
        ))}

      </main>
    </div>
  )
}
