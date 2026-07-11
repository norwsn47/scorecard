import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { formatGameNameDate } from '../utils/format.js'
import { canStartGame, createGame, findDuplicateIndices } from '../utils/game.js'
import { getPlayers, saveActiveGame, savePlayers } from '../utils/storage.js'

const MAX_PLAYERS = 6

export default function Setup({ navigate }) {
  const [gameName, setGameName]   = useState(() => formatGameNameDate())
  const [names, setNames]         = useState([''])
  const [savedNames]              = useState(() => getPlayers())
  const dupeIndices = findDuplicateIndices(names)
  const ready       = canStartGame(names, names.length)

  function handleNameChange(i, value) {
    const next = [...names]
    next[i] = value.slice(0, 30)
    setNames(next)
  }

  function handleAddPlayer() {
    if (names.length < MAX_PLAYERS) setNames([...names, ''])
  }

  function handleRemovePlayer(i) {
    setNames(names.filter((_, idx) => idx !== i))
  }

  function suggestionsFor(index) {
    const otherLower = names
      .filter((_, i) => i !== index)
      .map(n => n.trim().toLowerCase())
    return savedNames.filter(n => !otherLower.includes(n.toLowerCase()))
  }

  function handleStart() {
    if (!ready) return
    const trimmed = names.map(n => n.trim())

    const existing = getPlayers()
    const merged = [...new Set([...trimmed, ...existing])].slice(0, 20)
    savePlayers(merged)

    const game = createGame(trimmed, gameName)
    saveActiveGame(game)
    navigate('scorecard', { game })
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader title="New Game" onBack={() => navigate('home')} />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-10 w-full space-y-3">

        {/* Game name */}
        <div className="pb-1">
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value.slice(0, 50))}
            maxLength={50}
            autoComplete="off"
            className="w-full py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[rgba(184,85,48,0.4)]"
          />
          <p className="font-ui text-xs text-muted mt-1.5 pl-1">Game name — optional</p>
        </div>

        {names.map((name, i) => {
          const listId = `player-suggestions-${i}`
          const isDupe = dupeIndices.includes(i)
          return (
            <div key={i}>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  list={listId}
                  maxLength={30}
                  autoComplete="off"
                  autoFocus={i === names.length - 1}
                  className={[
                    'w-full py-3 pl-4 rounded-md border font-ui text-base bg-bg-card text-text',
                    'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[rgba(184,85,48,0.4)]',
                    names.length > 1 ? 'pr-10' : 'pr-4',
                    isDupe ? 'border-accent' : 'border-border',
                  ].join(' ')}
                />
                {names.length > 1 && (
                  <button
                    onClick={() => handleRemovePlayer(i)}
                    aria-label={`Remove player ${i + 1}`}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted active:text-text"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <datalist id={listId}>
                {suggestionsFor(i).map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {isDupe && (
                <p className="text-accent font-ui text-xs mt-1 pl-1">
                  Each player must have a unique name
                </p>
              )}
            </div>
          )
        })}

        {names.length < MAX_PLAYERS && (
          <button
            onClick={handleAddPlayer}
            className="w-full py-3 px-4 rounded-md border border-dashed border-border bg-bg-card text-muted font-ui text-sm active:bg-border"
          >
            + Add player
          </button>
        )}

        <div className="pt-5">
          <button
            onClick={handleStart}
            disabled={!ready}
            className={[
              'w-full py-4 rounded-md font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn transition-opacity',
              ready
                ? 'bg-accent text-bg active:bg-accent-hover'
                : 'bg-accent text-bg opacity-40 cursor-not-allowed',
            ].join(' ')}
          >
            Start
          </button>
        </div>

      </main>
    </div>
  )
}
