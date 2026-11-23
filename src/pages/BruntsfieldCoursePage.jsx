import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import CourseMapModal from '../components/CourseMapModal.lazy.jsx'
import { track } from '../utils/analytics.js'
import { formatShortDate } from '../utils/format.js'
import { getActiveGame, getCompletedGames } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function BruntsfieldCoursePage({ navigate }) {
  const { user }                    = useAuth()
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

  return (
    <div className="h-full bg-bg flex flex-col relative">

      {/* ── Branding ── */}
      <header className="flex-1 flex flex-col justify-start px-page pt-10 pb-2">

        {/* Heading row — h1 + info icon inline, icon aligns to first line */}
        <div className="flex items-start -mr-2.5">
          <h1 className="type-display text-text text-left flex-1">
            <span className="whitespace-nowrap">Bruntsfield Short</span><br />Hole Scorecard
          </h1>
          <button
            onClick={() => navigate('info', { bruntsfield: true })}
            aria-label="Information"
            className="text-muted active:text-accent p-2.5 flex-shrink-0 mt-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M12 12v4" />
            </svg>
          </button>
        </div>

        <p className="type-body text-text text-left mt-2">
          Golf played here since 1456
        </p>

        <div className="w-10 h-0.5 bg-accent ml-0 mt-4 mb-8" />

        {/* Numbered list */}
        <div className="grid grid-cols-[1.5rem_1fr] gap-x-3 gap-y-2">
          <span className="type-strong text-accent text-right">1</span>
          <span className="type-body text-muted">No sign-up, no faff - just golf</span>
          <span className="type-strong text-accent text-right">2</span>
          <span className="type-body text-muted">Every hole, as you play it</span>
          <span className="type-strong text-accent text-right">3</span>
          <span className="type-body text-muted">Share your card when you're done</span>
        </div>
      </header>

      {/* ── Actions ── */}
      <main className="flex flex-col gap-4 px-page pt-6 pb-8 w-full">

        {activeGame && (
          <Button variant="secondary" fullWidth onClick={() => navigate('scorecard')}>
            Resume game
            {(activeGame.name || activeGame.players?.join(', ')) ? ` · ${activeGame.name || activeGame.players?.join(', ')}` : ''}
          </Button>
        )}

        <Button fullWidth onClick={() => { track('New Game Started'); navigate('setup', { bruntsfield: true }) }}>
          New game
        </Button>

        <Button variant="secondary" fullWidth onClick={() => setShowMap(true)}>
          View course map
        </Button>

        <Button variant="secondary" fullWidth onClick={() => navigate('rules', { from: 'bruntsfield' })}>
          Course rules
        </Button>

        {user && (
          <Button variant="secondary" fullWidth onClick={() => navigate('history', { bruntsfield: true })}>
            Past rounds
          </Button>
        )}

        {!user && lastGame && (
          <div className="text-center">
            <button
              onClick={() => navigate('summary', { game: lastGame })}
              className="inline-block py-3 -my-3 type-small-strong text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Last round:{' '}
              <span className="underline underline-offset-2">
                {lastGame.name || (lastGame.players ?? []).join(', ')} · {formatShortDate(lastGame.completedAt)}
              </span>
            </button>
          </div>
        )}

        {!user && (
          <div className="pt-4 text-center">
            <button
              onClick={() => navigate('login')}
              className="inline-block py-3 -my-3 type-small-strong text-accent active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Want to save your scores? <span className="underline underline-offset-2">Sign in</span>
            </button>
          </div>
        )}

        {/* Discreet way off the course page to the generic scorecard home —
            Bruntsfield otherwise relies on the phone browser's back nav. */}
        <div className="pt-4 text-center">
          <button
            onClick={() => { track('Bruntsfield Home Link Clicked'); navigate('home') }}
            className="inline-flex items-center gap-1 py-3 -my-3 type-small-strong text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {/* Same chevron as the PageHeader back button (stage 8). */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Golf Scorecard home
          </button>
        </div>
      </main>

      {showMap && <CourseMapModal onClose={() => setShowMap(false)} />}
    </div>
  )
}
