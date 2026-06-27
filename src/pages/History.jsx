import { useState } from 'react'
import { deleteCompletedGame, getCompletedGames } from '../utils/storage.js'

function formatShortDate(isoString) {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(isoString))
}

function playerAverage(scores, player) {
  const scored = (scores?.[player] ?? []).filter(s => s !== null)
  if (scored.length === 0) return null
  return (scored.reduce((sum, s) => sum + s, 0) / scored.length).toFixed(1)
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-accent inline-block mr-1 relative -top-px">
      <path fillRule="evenodd" d="M10 1a.75.75 0 0 1 .75.75v.5h3.5a.75.75 0 0 1 0 1.5h-.5v.75a4.25 4.25 0 0 1-3 4.065V9.5h1.25a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1 0-1.5h1.25V8.565a4.25 4.25 0 0 1-3-4.065V3.75h-.5a.75.75 0 0 1 0-1.5h3.5v-.5A.75.75 0 0 1 10 1ZM6.25 3.75v.75a2.75 2.75 0 0 0 5.5 0v-.75h-5.5ZM7 12.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm-1 3a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
  )
}

export default function History({ navigate }) {
  const [games, setGames] = useState(() => getCompletedGames())
  const [filter, setFilter] = useState(null)

  const displayed = filter
    ? games.filter(g => g.players?.includes(filter))
    : games

  function toggleFilter(name) {
    setFilter(prev => (prev === name ? null : name))
  }

  function handleDelete(e, id) {
    e.stopPropagation()
    deleteCompletedGame(id)
    setGames(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      {/* Header */}
      <header className="flex items-center px-5 pt-12 pb-5 border-b border-border shrink-0">
        <button
          onClick={() => navigate('home')}
          className="py-2 text-muted font-ui text-sm tracking-[0.08em] uppercase mr-4"
        >
          ← Back
        </button>
        <h1 className="font-display italic text-2xl text-text">History</h1>
      </header>

      {/* Disclaimer */}
      <div className="px-5 pt-4 pb-1 shrink-0">
        <p className="font-ui text-xs text-muted leading-relaxed">
          History is saved to your device's browser storage. Clearing your browser data or using private browsing will erase it.
        </p>
      </div>

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
          <div
            key={game.id}
            className="relative bg-bg-card rounded-md border border-border shadow-card"
          >
            {/* Tappable main area */}
            <button
              onClick={() => navigate('summary', { game })}
              className="w-full text-left px-4 pt-4 pb-4 pr-10 active:opacity-70"
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

              {/* Players with averages */}
              <div className="space-y-1">
                {(game.players ?? []).map(name => {
                  const isWinner = name === game.winner
                  const avg = playerAverage(game.scores, name)
                  const isDnf = game.dnf?.includes(name)
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        {isWinner && <TrophyIcon />}
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
                      </div>
                      {avg !== null && (
                        <span className="font-ui text-xs text-muted">Av. {avg}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </button>

            {/* Delete button */}
            <button
              onClick={e => handleDelete(e, game.id)}
              aria-label="Delete game"
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-muted active:text-text"
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
