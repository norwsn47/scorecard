import { useEffect, useState } from 'react'
import CourseMapModal from '../components/CourseMapModal.jsx'
import { track } from '../utils/analytics.js'
import { formatShortDate } from '../utils/format.js'
import { getActiveGame, getCompletedGames } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Home({ navigate }) {
  const { user, logout }           = useAuth()
  const [activeGame, setActiveGame] = useState(null)
  const [lastGame, setLastGame]     = useState(null)
  const [showMap, setShowMap]       = useState(false)

  useEffect(() => {
    setActiveGame(getActiveGame())
    if (!user) {
      const completed = getCompletedGames()
      setLastGame(completed[0] ?? null)
    }
  }, [user])

  async function handleLogout() {
    await logout()
  }

  return (
    <div className="h-full bg-bg flex flex-col relative">

      <button
        onClick={() => navigate('info')}
        aria-label="Information"
        className="absolute top-10 right-4 text-muted active:text-accent p-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M12 12v4" />
        </svg>
      </button>

      {/* ── Signed-in account strip ── */}
      {user && (
        <div className="absolute top-10 left-4 flex items-center gap-2">
          <span className="font-ui text-xs text-muted truncate max-w-[160px]">{user.email}</span>
          <span className="text-chrome font-ui text-xs">·</span>
          <button
            onClick={handleLogout}
            className="font-ui text-xs text-muted underline underline-offset-2 active:text-accent"
          >
            Sign out
          </button>
        </div>
      )}

      {/* ── Branding ── */}
      <header className="flex-1 flex flex-col justify-start px-6 pt-10 pb-8">
        <h1 className="font-display text-5xl italic text-text leading-tight text-left">
          Bruntsfield Links Scorecard
        </h1>

        <p className="font-display italic text-base text-text text-left mt-3">
          Golf played here since 1456
        </p>

        <div className="w-10 h-0.5 bg-accent ml-0 mt-6 mb-6" />

        <div className="space-y-2">
          <p className="font-ui text-sm text-muted flex gap-3"><span className="text-accent font-semibold">1</span>No sign-up, no faff - just golf</p>
          <p className="font-ui text-sm text-muted flex gap-3"><span className="text-accent font-semibold">2</span>Every hole, as you play it</p>
          <p className="font-ui text-sm text-muted flex gap-3"><span className="text-accent font-semibold">3</span>Share your card when you're done</p>
        </div>
      </header>

      {/* ── Actions ── */}
      <main className="flex flex-col gap-4 px-6 pb-8 w-full">

        {activeGame && (
          <button
            onClick={() => navigate('scorecard')}
            className="w-full py-3 px-4 rounded-sm border border-accent text-accent font-ui text-sm tracking-[0.08em] uppercase font-medium flex items-center justify-between"
          >
            <span>Resume Game</span>
            <span className="text-xs text-muted normal-case tracking-normal font-normal truncate max-w-[160px]">
              {activeGame.name || activeGame.players?.join(', ')}
            </span>
          </button>
        )}

        <button
          onClick={() => { track('New Game Started'); navigate('setup') }}
          className="w-full py-4 px-6 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn active:bg-accent-hover"
        >
          New Game
        </button>

        <button
          onClick={() => setShowMap(true)}
          className="w-full py-4 px-6 rounded-sm border border-border text-text font-ui text-sm tracking-[0.1em] uppercase font-medium active:bg-bg-card"
        >
          View Course Map
        </button>

        {user && (
          <button
            onClick={() => navigate('history')}
            className="w-full py-4 px-6 rounded-sm border border-border text-text font-ui text-sm tracking-[0.1em] uppercase font-medium active:bg-bg-card"
          >
            History
          </button>
        )}

        {/* Last completed round — logged-out only */}
        {!user && lastGame && (
          <button
            onClick={() => navigate('podium', { game: lastGame })}
            className="w-full py-3 px-4 rounded-sm border border-border text-text font-ui text-sm tracking-[0.08em] uppercase font-medium flex items-center justify-between active:bg-bg-card"
          >
            <span>Last round</span>
            <span className="text-xs text-muted normal-case tracking-normal font-normal truncate max-w-[180px]">
              {lastGame.name || (lastGame.players ?? []).join(', ')} · {formatShortDate(lastGame.completedAt)}
            </span>
          </button>
        )}

        {/* Sign in nudge — logged-out only */}
        {!user && (
          <div className="pt-1 text-center space-y-1">
            <button
              onClick={() => navigate('login')}
              className="font-ui text-xs text-accent underline underline-offset-2 active:opacity-70"
            >
              Sign in to save your rounds across devices
            </button>
            {lastGame && (
              <p className="font-ui text-xs text-muted">
                Your last round is stored on this device only
              </p>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center pb-14 px-6 space-y-3">
<p className="font-ui text-text leading-tight inline-flex items-baseline gap-1">
          <span className="text-base font-bold">Scorecard</span>
          <span className="text-xs text-muted font-normal"> by </span>
          <a href="https://outbuild.uk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-muted font-normal underline underline-offset-2">
            Outbuild
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 relative top-px">
              <path d="M2 8L8 2M8 2H4M8 2V6" />
            </svg>
          </a>
        </p>
      </footer>

      {showMap && <CourseMapModal onClose={() => setShowMap(false)} />}
    </div>
  )
}
