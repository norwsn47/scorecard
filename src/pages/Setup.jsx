import { useState } from 'react'
import { getPlayers, saveActiveGame, savePlayers } from '../utils/storage.js'
import { canStartGame, createGame, findDuplicateIndices } from '../utils/game.js'

const PLAYER_COUNTS = [1, 2, 3, 4]
const HOLES_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1)

export default function Setup({ navigate }) {
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames]             = useState(['', '', '', ''])
  const [holes, setHoles]             = useState('')

  const savedNames = getPlayers()
  const activeNames = names.slice(0, playerCount)
  const dupeIndices = findDuplicateIndices(activeNames)
  const ready = canStartGame(names, playerCount, Number(holes))

  function handleNameChange(i, value) {
    const next = [...names]
    next[i] = value.slice(0, 30) // max length enforced here
    setNames(next)
  }

  function handleCountChange(count) {
    setPlayerCount(count)
  }

  function suggestionsFor(index) {
    const otherLower = names
      .slice(0, playerCount)
      .filter((_, i) => i !== index)
      .map(n => n.trim().toLowerCase())
    return savedNames.filter(n => !otherLower.includes(n.toLowerCase()))
  }

  function handleStart() {
    if (!ready) return
    const trimmed = names.slice(0, playerCount).map(n => n.trim())

    // Merge new names into saved suggestions (deduped, most recent first, capped at 20)
    const existing = getPlayers()
    const merged = [...new Set([...trimmed, ...existing])].slice(0, 20)
    savePlayers(merged)

    const game = createGame(trimmed, Number(holes))
    saveActiveGame(game)
    navigate('scorecard', { game })
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Header */}
      <header className="flex items-center px-5 pt-12 pb-6">
        <button
          onClick={() => navigate('home')}
          className="text-muted font-ui text-sm tracking-[0.08em] uppercase mr-auto"
        >
          ← Back
        </button>
        <span className="font-display italic text-xl text-text mr-auto">New Game</span>
      </header>

      <main className="flex-1 px-5 pb-10 max-w-sm mx-auto w-full space-y-8">

        {/* Player count */}
        <section>
          <p className="font-ui text-xs tracking-[0.18em] uppercase text-muted mb-3">
            Players
          </p>
          <div className="flex gap-2">
            {PLAYER_COUNTS.map(n => (
              <button
                key={n}
                onClick={() => handleCountChange(n)}
                className={[
                  'flex-1 py-3 rounded-md font-ui text-sm font-medium border transition-colors',
                  playerCount === n
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-transparent text-text border-border',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Name inputs */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.18em] uppercase text-muted">
            Names
          </p>
          {Array.from({ length: playerCount }, (_, i) => {
            const listId = `player-suggestions-${i}`
            const isDupe = dupeIndices.includes(i)
            return (
              <div key={i}>
                <input
                  type="text"
                  value={names[i]}
                  onChange={e => handleNameChange(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  list={listId}
                  maxLength={30}
                  autoComplete="off"
                  className={[
                    'w-full py-3 px-4 rounded-md border font-ui text-sm bg-bg-card text-text',
                    'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40',
                    isDupe ? 'border-accent' : 'border-border',
                  ].join(' ')}
                />
                <datalist id={listId}>
                  {suggestionsFor(i).map(name => (
                    <option key={name} value={name} />
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
        </section>

        {/* Hole count */}
        <section>
          <p className="font-ui text-xs tracking-[0.18em] uppercase text-muted mb-3">
            Holes
          </p>
          <select
            value={holes}
            onChange={e => setHoles(e.target.value)}
            className="w-full py-3 px-4 rounded-md border border-border font-ui text-sm bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none"
          >
            <option value="">Select holes</option>
            {HOLES_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </section>

        {/* Start button */}
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

      </main>
    </div>
  )
}
