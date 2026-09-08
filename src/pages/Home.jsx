import { useEffect, useState } from 'react'
import { BRUNTSFIELD_COURSE_NAME } from '../constants.js'
import { track } from '../utils/analytics.js'
import { formatShortDate } from '../utils/format.js'
import { getActiveGame, getCompletedGames } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ?email=changed|expired|taken redirected back from GET /api/auth/confirm-email
// (§11.4.1) — the address change confirmed, the link was dead, or the address
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
        <div role="status" className="sticky top-0 z-50 bg-accent text-bg text-center font-ui text-xs py-2 px-4 tracking-wide">
          {noticeCopy}
        </div>
      )}

      {/* ── Branding ── */}
      <header className="flex flex-col justify-start px-6 pt-10 pb-2">

        {/* Heading row — h1 + info icon inline, icon aligns to first line */}
        <div className="flex items-start -mr-2">
          <h1 className="font-display text-[42px] italic text-text leading-[1.1] text-left flex-1">
            Golf<br />Scorecard
          </h1>
          <button
            onClick={() => navigate('info')}
            aria-label="Information"
            className="text-muted active:text-accent p-2 flex-shrink-0 mt-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M12 12v4" />
            </svg>
          </button>
        </div>

        <div className="w-10 h-0.5 bg-accent ml-0 mt-4 mb-8" />

        {/* Numbered list — strict two-column grid for reliable numeral alignment */}
        <div className="grid grid-cols-[1.5rem_1fr] gap-x-3 gap-y-2">
          <span className="font-ui text-base text-accent font-semibold text-right">1</span>
          <span className="font-ui text-base text-muted">No sign-up, no faff - just golf</span>
          <span className="font-ui text-base text-accent font-semibold text-right">2</span>
          <span className="font-ui text-base text-muted">Every hole, as you play it</span>
          <span className="font-ui text-base text-accent font-semibold text-right">3</span>
          <span className="font-ui text-base text-muted">Share your card when you're done</span>
        </div>
      </header>

      <div className="flex-1" />

      {/* ── Actions ── */}
      <main className="flex flex-col gap-4 px-6 pt-6 pb-8 w-full">

        <button
          onClick={() => { track('New Game Started'); navigate('setup') }}
          className="w-full py-4 px-6 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn active:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          New Game
        </button>

        {activeGame && (
          <button
            onClick={() => navigate('scorecard')}
            className="w-full py-3 px-4 rounded-sm border border-accent text-accent font-ui text-sm tracking-[0.08em] uppercase font-medium flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span>Resume Game</span>
            <span className="text-xs text-muted normal-case tracking-normal font-normal truncate max-w-[160px]">
              {activeGame.name || activeGame.players?.join(', ')}
            </span>
          </button>
        )}

        {/* Last completed round — logged-out only */}
        {!user && lastGame && (
          <div className="text-center -mt-1">
            <button
              onClick={() => navigate('summary', { game: lastGame })}
              className="font-ui text-xs text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Last round:{' '}
              <span className="underline underline-offset-2">
                {lastGame.name || (lastGame.players ?? []).join(', ')} · {formatShortDate(lastGame.completedAt)}
              </span>
            </button>
          </div>
        )}

        {/* Course-specific scorecards */}
        <div className="space-y-2 pt-1">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted px-1">Course specific scorecards</p>
          <button
            onClick={() => navigate('bruntsfield')}
            className="w-full px-4 py-3 rounded-md bg-bg-card border border-border text-left flex items-center gap-3 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-accent/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-accent">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-xs font-semibold text-text">{BRUNTSFIELD_COURSE_NAME}</p>
              <p className="font-ui text-xs text-muted">Course map, rules &amp; scorecard</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-muted shrink-0">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {user && (
          <button
            onClick={() => navigate('history')}
            className="w-full py-4 px-6 rounded-sm border border-border text-text font-ui text-sm tracking-[0.1em] uppercase font-medium active:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Past Rounds
          </button>
        )}

        {/* Foot of the actions: signed-out sees the sign-in nudge (unchanged,
            §11.10); signed-in sees a plain "you are signed in" line and the
            way into Settings (§4.1, §11.6, §11.14). Same slot, mirrored copy. */}
        {user ? (
          <div className="pt-0 text-center">
            <p className="font-ui text-xs text-muted break-words">
              Signed in as {user.name || user.email}
              <span aria-hidden="true"> · </span>
              <button
                onClick={() => navigate('settings', { from: 'home' })}
                className="inline-block py-2.5 -my-2.5 text-accent underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Settings
              </button>
            </p>
          </div>
        ) : (
          <div className="pt-0 text-center space-y-1">
            <button
              onClick={() => navigate('login')}
              className="font-ui text-xs text-accent active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Want to save your scores? <span className="underline underline-offset-2">Sign in</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center pt-4 pb-10 px-6 space-y-3">
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

    </div>
  )
}
