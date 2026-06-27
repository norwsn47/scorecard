import { useEffect, useState } from 'react'
import { getActiveGame } from '../utils/storage.js'

export default function Home({ navigate }) {
  const [activeGame, setActiveGame] = useState(null)

  useEffect(() => {
    setActiveGame(getActiveGame())
  }, [])

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* ── Branding ── */}
      <header className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="flex items-center gap-3 mb-8 w-full max-w-xs">
          <div className="flex-1 h-px bg-border" />
          <span className="text-accent text-xs tracking-[0.2em] uppercase font-ui">Est. 1456</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <h1 className="font-display text-5xl italic text-text leading-tight text-center">
          The Golf Tavern
        </h1>

        <p className="font-ui text-xs tracking-[0.25em] uppercase text-muted mt-3 text-center">
          Bruntsfield Links · Edinburgh
        </p>

        <div className="w-10 h-0.5 bg-accent mx-auto mt-6" />
      </header>

      {/* ── Actions ── */}
      <main className="flex flex-col items-center gap-4 px-6 pb-8 max-w-xs mx-auto w-full">

        {/* Resume Game — only shown when a game is in progress */}
        {activeGame && (
          <button
            onClick={() => navigate('scorecard')}
            className="w-full py-3 px-4 rounded-md border border-accent text-accent font-ui text-sm tracking-[0.08em] uppercase font-medium flex items-center justify-between"
          >
            <span>Resume Game</span>
            <span className="text-xs text-muted normal-case tracking-normal font-normal">
              {activeGame.players?.join(', ')}
            </span>
          </button>
        )}

        <button
          onClick={() => navigate('setup')}
          className="w-full py-4 px-6 rounded-md bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn active:bg-accent-hover"
        >
          New Game
        </button>

        <button
          onClick={() => navigate('history')}
          className="w-full py-4 px-6 rounded-md border border-border text-text font-ui text-sm tracking-[0.1em] uppercase font-medium active:bg-bg-card"
        >
          History
        </button>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center pb-8 px-6">
        <p className="font-ui text-xs text-muted tracking-[0.12em] uppercase">
          More courses coming soon
        </p>
      </footer>

    </div>
  )
}
