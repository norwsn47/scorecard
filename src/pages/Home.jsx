import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import ExternalArrow from '../components/ExternalArrow.jsx'
import { track } from '../utils/analytics.js'
import { formatShortDate } from '../utils/format.js'
import { getActiveGame, getCompletedGames } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ?email=changed|expired|taken redirected back from GET /api/auth/confirm-email
// — the address change confirmed, the link was dead, or the address
// was taken in the meantime. useAuth captures the flag and strips the param;
// Home copies it into local state once and clears the context value straight
// away, so the banner shows for this visit only and never re-appears on a
// later return to Home. The link is opened in the new inbox — often on a
// device with no session — so the `changed` copy adapts to whether the reader
// is actually signed in here.
function emailNoticeCopy(flag, signedIn) {
  switch (flag) {
    case 'changed':
      return signedIn
        ? 'Your email address has been updated.'
        : 'Your email address has been updated. Sign in with your new address.'
    case 'expired':
      return 'That confirmation link has expired or has already been used. Open the app and request the change again.'
    case 'taken':
      return 'That email address is now in use by another account.'
    default:
      return null
  }
}

// The course card's copy. The card's accessible name is these two joined, as it
// was when the whole card was one button.
const COURSE_NAME = 'Bruntsfield Short Hole Course'
const COURSE_BLURB = 'Course map, rules & scorecard'

export default function Home({ navigate }) {
  const { user, emailNotice, setEmailNotice } = useAuth()
  const [activeGame, setActiveGame] = useState(null)
  const [lastGame, setLastGame]     = useState(null)
  const [notice, setNotice]         = useState(null)

  useEffect(() => {
    setActiveGame(getActiveGame())
    if (!user) {
      const completed = getCompletedGames()
      setLastGame(completed[0] ?? null)
    }
  }, [user])

  // Capture the confirm-email flag into local state the moment useAuth exposes
  // it (its effect runs after this child's, so this fires on the next render),
  // then clear the shared value. Local state dies with Home on navigation, so
  // the banner is a one-visit thing and a later return to Home is clean —
  // StrictMode's mount/cleanup/mount double-invoke can't strand it.
  useEffect(() => {
    if (emailNotice) {
      setNotice(emailNotice)
      setEmailNotice(null)
    }
  }, [emailNotice, setEmailNotice])

  const noticeCopy = notice ? emailNoticeCopy(notice, !!user) : null

  return (
    <div className="h-full bg-bg flex flex-col relative">

      {noticeCopy && (
        <div role="status" className="sticky top-0 z-50 bg-accent text-on-accent text-center type-small py-2 px-4">
          {noticeCopy}
        </div>
      )}

      {/* ── Branding ── */}
      <header className="flex flex-col justify-start px-page pt-10 pb-2">

        {/* Heading row — h1 + header icon inline, icon aligns to first line.
            Signed in: a settings gear (the Info page is reached from inside
            Settings, #83). Signed out: the info icon, as before. */}
        <div className="flex items-start -mr-2.5">
          <h1 className="type-display text-text text-left flex-1">
            Golf<br />Scorecard
          </h1>
          <button
            onClick={() => (user ? navigate('settings', { from: 'home' }) : navigate('info'))}
            aria-label={user ? 'Settings' : 'Information'}
            className="text-muted active:text-accent p-2.5 flex-shrink-0 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {user ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01M12 12v4" />
              </svg>
            )}
          </button>
        </div>

        <div className="w-10 h-0.5 bg-accent ml-0 mt-4 mb-8" />

        {/* Numbered list — strict two-column grid for reliable numeral alignment */}
        <div className="grid grid-cols-[1.5rem_1fr] gap-x-3 gap-y-2">
          <span className="type-strong text-accent text-right">1</span>
          <span className="type-body text-muted">No sign-up, no faff - just golf</span>
          <span className="type-strong text-accent text-right">2</span>
          <span className="type-body text-muted">Every hole, as you play it</span>
          <span className="type-strong text-accent text-right">3</span>
          <span className="type-body text-muted">Share your card when you're done</span>
        </div>
      </header>

      <div className="flex-1" />

      {/* ── Actions ── */}
      <main className="flex flex-col gap-group px-page pt-6 pb-8 w-full">

        <Button fullWidth onClick={() => { track('New Game Started'); navigate('setup') }}>
          New game
        </Button>

        {activeGame && (
          <Button variant="secondary" fullWidth onClick={() => navigate('scorecard')}>
            Resume game
            {(activeGame.name || activeGame.players?.join(', ')) ? ` · ${activeGame.name || activeGame.players?.join(', ')}` : ''}
          </Button>
        )}

        {/* Last completed round — logged-out only */}
        {!user && lastGame && (
          <div className="text-center -mt-1">
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

        {/* Course-specific scorecards */}
        <div className="flex flex-col gap-related pt-1">
          <p className="type-label-caps text-muted">Course specific scorecards</p>
          <Card
            onOpen={() => navigate('bruntsfield')}
            openLabel={`${COURSE_NAME} ${COURSE_BLURB}`}
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-accent-tint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-accent">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="type-strong text-text">{COURSE_NAME}</p>
                <p className="type-small text-muted">{COURSE_BLURB}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-muted shrink-0">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Card>
        </div>

        {user && (
          <Button variant="secondary" fullWidth onClick={() => navigate('history')}>
            Past rounds
          </Button>
        )}

        {/* Foot of the actions: signed-out sees the sign-in nudge (unchanged);
            signed-in sees a plain "you are signed in" line. The way into
            Settings is the header gear (#83). */}
        {user ? (
          <div className="pt-0 text-center">
            <p className="type-small text-muted break-words">
              Signed in as {user.name || user.email}
            </p>
          </div>
        ) : (
          <div className="pt-0 text-center space-y-1">
            <button
              onClick={() => navigate('login')}
              className="inline-block py-3 -my-3 type-small-strong text-accent active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Want to save your scores? <span className="underline underline-offset-2">Sign in</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center pt-4 pb-10 px-page space-y-3">
        <p className="font-ui text-text inline-flex items-baseline gap-1">
          <span className="type-strong">Scorecard</span>
          <span className="type-small text-muted"> by </span>
          <a href="https://outbuild.uk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 py-3 -my-3 type-small text-muted underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Outbuild
            <ExternalArrow />
          </a>
        </p>
      </footer>

    </div>
  )
}
