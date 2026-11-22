import { useEffect, useRef, useState } from 'react'
import Button from '../components/Button.jsx'
import Card, { CARD_INNER_CONTROL } from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import Tag from '../components/Tag.jsx'
import PageHeader, { HeaderAction } from '../components/PageHeader.jsx'
import ParDelta from '../components/ParDelta.jsx'
import PlayerStar from '../components/PlayerStar.jsx'
import { formatShortDate } from '../utils/format.js'
import { isSignedInPlayer } from '../utils/game.js'
import { playerTotal, roundToPar } from '../utils/scores.js'
import { getCompletedGames, getPendingCompletedGames } from '../utils/storage.js'
import { mergePendingGames, normalizeDbGame, normalizeLocalGame, normalizePendingGame } from '../utils/history.js'
import { subscribeToSync } from '../utils/sync.js'
import { useAuth } from '../hooks/useAuth.jsx'

// The signed-in user's rounds that are still waiting to be saved to D1
// (marker-gated): only records tagged with this user's id, never an
// unmarked quick-play round and never another user's. A record that cannot be
// read is skipped rather than blanking the list.
function readPending(userId) {
  const list = []
  try {
    for (const record of getPendingCompletedGames(userId)) {
      try { list.push(normalizePendingGame(record)) } catch { /* skip one bad round */ }
    }
  } catch { /* storage unreadable: show nothing pending */ }
  return list
}

// One filter pill (Figma Chip, c09-chip.png): "Course" or "Player" with a small
// caret at rest, the chosen value with a clear cross once applied. The main
// button always opens the picker sheet (aria-haspopup, aria-expanded); the cross
// is its own button so clearing never needs the sheet. 44px tall, truncates a
// long value (the full value is in the accessible name).
const PILL_BASE =
  'inline-flex max-w-full items-stretch rounded-full border min-h-11 transition-colors ' +
  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ' +
  'has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg'
const PILL_DEFAULT = 'border-field text-text hover:bg-accent-tint'
const PILL_OPEN = 'border-field bg-accent-tint text-text'
const PILL_APPLIED = 'border-accent bg-accent text-on-accent hover:bg-accent-hover'

function FilterPill({ label, value, star, open, onOpen, onClear, pillRef }) {
  const applied = value !== null
  const state = applied ? PILL_APPLIED : open ? PILL_OPEN : PILL_DEFAULT
  return (
    <span className={`${PILL_BASE} ${state}`}>
      <button
        ref={pillRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={applied ? `${label}: ${value}` : undefined}
        // Focus first, so the sheet can hand focus back here even where a tap
        // does not focus a button (Safari).
        onClick={e => { e.currentTarget.focus(); onOpen() }}
        className={[
          'inline-flex min-w-0 items-center gap-related min-h-11 rounded-full type-strong focus:outline-none',
          applied ? 'pl-4 pr-2' : 'px-4',
        ].join(' ')}
      >
        <span className="truncate">{applied ? value : label}</span>
        {applied && star}
        {!applied && (
          <svg viewBox="0 0 10 10" aria-hidden="true" className="w-2.5 h-2.5 shrink-0" fill="currentColor">
            <path d="M1.5 3h7L5 7.5z" />
          </svg>
        )}
      </button>
      {applied && (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()} filter`}
          onClick={onClear}
          className="inline-flex w-11 -ml-2 shrink-0 items-center justify-center rounded-full focus:outline-none"
        >
          <svg viewBox="0 0 10 10" aria-hidden="true" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l6 6M8 2L2 8" />
          </svg>
        </button>
      )}
    </span>
  )
}

const roundsWord = n => (n === 1 ? 'round' : 'rounds')

export default function History({ navigate }) {
  const { user } = useAuth()

  // Signed in: the D1 rounds (at most 100, per GET /api/games). Signed out: every
  // local round. A signed-in user's pending local rounds live in `pending` and are
  // merged in below, in addition to whatever `games` holds.
  const [games, setGames]             = useState(() => user ? [] : getCompletedGames().map(normalizeLocalGame))
  const [pending, setPending]         = useState(() => user ? readPending(user.id) : [])
  const [loading, setLoading]         = useState(!!user)
  const [filter, setFilter]           = useState(null)
  const [courseFilter, setCourseFilter] = useState(null)
  // Which picker sheet is open: null | 'course' | 'player'.
  const [sheet, setSheet]           = useState(null)
  const coursePillRef = useRef(null)
  const playerPillRef = useRef(null)
  const pillsRef = useRef(null)
  const refocusPills = useRef(false)
  // Load state for the signed-in list: null | 'failed' | 'signedOut'. A failed
  // load must not read as "No rounds yet" (#99). `skipped` counts stored rounds
  // that couldn't be read, so one bad row no longer blanks the whole list.
  const [loadError, setLoadError]     = useState(null)
  const [skipped, setSkipped]         = useState(0)
  const [reloadKey, setReloadKey]     = useState(0)

  // A reload, deep link, or restored tab always resets history state to depth
  // 0 — there's nothing in-app to step back to, and no in-page back button any
  // more (#89) for the case where there is. Read once on mount: this only
  // needs to catch the "landed here with a blank history" case, not react to
  // later in-app navigation (#89 fix-forward).
  const [showHomeLink] = useState(() => (window.history.state?.depth ?? 0) === 0)

  // A background sync that saved (or newly rejected) a round while this screen
  // is open: reload, so a just-saved round shows as its D1 row rather than as a
  // pending one. Unsubscribes on unmount.
  useEffect(() => {
    if (!user) return undefined
    return subscribeToSync(() => setReloadKey(k => k + 1))
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    // A stale response (a newer reload started, or the screen closed) must not
    // overwrite the newer one.
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    // Pending rounds are local, so they show whether or not the D1 load works.
    setPending(readPending(user.id))
    fetch('/api/games', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) { if (!cancelled) setLoadError('signedOut'); return null }
        if (!r.ok) throw new Error('games fetch failed')
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        if (!data) { setGames([]); return }
        // Normalise row by row so one unreadable round is skipped, not fatal.
        const list = []
        let bad = 0
        for (const row of data.games ?? []) {
          try { list.push(normalizeDbGame(row)) } catch { bad += 1 }
        }
        setGames(list)
        setSkipped(bad)
      })
      .catch(() => { if (!cancelled) { setGames([]); setLoadError('failed') } })
      .finally(() => {
        if (cancelled) return
        // Re-read once the list is in, in case a sync finished in the meantime.
        setPending(readPending(user.id))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, reloadKey])

  // Signed in: the D1 rounds plus this user's pending local rounds,
  // newest first, with a pending round the server already holds dropped. Signed
  // out: every local round, exactly as before.
  const allGames = user ? mergePendingGames(games, pending) : games

  const courses = user
    ? [...new Set(allGames.map(g => g.courseName).filter(Boolean))]
    : []

  const playerRoundCounts = allGames.reduce((counts, g) => {
    for (const p of g.players ?? []) counts[p] = (counts[p] ?? 0) + 1
    return counts
  }, {})

  const players = [...new Set(allGames.flatMap(g => g.players ?? []))]
    .sort((a, b) => playerRoundCounts[b] - playerRoundCounts[a] || a.localeCompare(b))

  const matchesCourse = g => !courseFilter || g.courseName === courseFilter
  const matchesPlayer = g => !filter || g.players?.includes(filter)
  const displayed = allGames.filter(matchesCourse).filter(matchesPlayer)
  const anyFilter = Boolean(filter || courseFilter)
  // The status line is for a filtered list that still has rounds in it; an empty
  // result gets the no-match block instead.
  const showStatus = anyFilter && displayed.length > 0

  // Picker counts show what choosing a row would leave on screen, so each count
  // reflects the other filter (the course counts respect the player filter and
  // the player counts respect the course filter).
  const courseOptions = courses.map(name => ({
    value: name,
    label: name,
    count: allGames.filter(g => g.courseName === name && matchesPlayer(g)).length,
  }))
  const playerOptions = players.map(name => ({
    value: name,
    label: name,
    count: allGames.filter(g => g.players?.includes(name) && matchesCourse(g)).length,
    suffix: isSignedInPlayer(name, user?.name) ? <PlayerStar className="ml-1" /> : null,
  }))

  function clearFilters() {
    refocusPills.current = true
    setFilter(null)
    setCourseFilter(null)
  }

  // Clearing from the status line or the no-match block removes the button that
  // had focus, so hand focus to the first pill (if there is one) rather than lose it.
  useEffect(() => {
    if (!refocusPills.current) return
    refocusPills.current = false
    pillsRef.current?.querySelector('button')?.focus()
  }, [filter, courseFilter])

  function toggleFilter(name) {
    setFilter(prev => (prev === name ? null : name))
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title="History"
        onBack={showHomeLink ? () => navigate('home') : undefined}
        backLabel="Home"
        right={user ? (
          <HeaderAction onClick={() => navigate('setup', { pastRound: true })}>
            + Add
          </HeaderAction>
        ) : null}
      />

      {/* Course label - one course, logged-in only. With 2+ courses the course pill below takes over. */}
      {user && !loading && courses.length === 1 && (
        <div className="px-page pt-4 pb-1 shrink-0">
          <p className="type-label-caps text-accent">{courses[0]}</p>
        </div>
      )}

      {/* Disclaimer - logged-out only */}
      {!user && (
        <div className="px-page pt-4 pb-1 shrink-0">
          <p className="type-small text-muted">
            Stored on your device. Gone if you clear your browser.
          </p>
        </div>
      )}

      {/* Filter pills: the course pill needs a signed-in user with 2+ courses, the
          player pill needs 2+ players. Each opens a picker sheet; the inline
          player names on the cards drive the same `filter` state. */}
      {!loading && ((user && courses.length > 1) || players.length > 1) && (
        <div ref={pillsRef} className="px-page pt-3 pb-1 shrink-0 flex flex-wrap gap-related">
          {user && courses.length > 1 && (
            <FilterPill
              label="Course"
              value={courseFilter}
              open={sheet === 'course'}
              pillRef={coursePillRef}
              onOpen={() => setSheet('course')}
              onClear={() => { coursePillRef.current?.focus(); setCourseFilter(null) }}
            />
          )}
          {players.length > 1 && (
            <FilterPill
              label="Player"
              value={filter}
              star={isSignedInPlayer(filter, user?.name) ? <PlayerStar /> : null}
              open={sheet === 'player'}
              pillRef={playerPillRef}
              onOpen={() => setSheet('player')}
              onClear={() => { playerPillRef.current?.focus(); setFilter(null) }}
            />
          )}
        </div>
      )}

      {/* Applied filters: how many rounds are showing, and one way to clear them
          all. A polite status, so a change to the count is announced. */}
      {!loading && showStatus && (
        <div className="px-page pt-related shrink-0 flex items-center justify-between gap-group">
          <p role="status" className="type-small text-muted">
            Showing {displayed.length} of {allGames.length} {roundsWord(allGames.length)}
          </p>
          <Button variant="text" size="medium" className="shrink-0" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Game list */}
      <main className="flex-1 overflow-y-auto px-page py-4 space-y-3">

        {loading && (
          <div className="text-center pt-16">
            <p className="type-small text-muted">Loading…</p>
          </div>
        )}

        {!loading && loadError && (
          <EmptyState
            role="alert"
            className={allGames.length > 0 ? 'pt-4 pb-2' : 'pt-16'}
            title={loadError === 'signedOut' ? "You've been signed out" : "Couldn't load your rounds"}
            body={loadError === 'signedOut'
              ? 'Sign in again to see your rounds.'
              : 'Check your connection and try again.'}
            action={
              <Button
                size="medium"
                onClick={() => (loadError === 'signedOut' ? navigate('login') : setReloadKey(k => k + 1))}
              >
                {loadError === 'signedOut' ? 'Sign in' : 'Try again'}
              </Button>
            }
          />
        )}

        {!loading && !loadError && skipped > 0 && (
          <p role="status" className="type-small text-muted text-center">
            {skipped === 1 ? "1 round couldn't be shown." : `${skipped} rounds couldn't be shown.`}
          </p>
        )}

        {!loading && !loadError && displayed.length === 0 && (
          <div className="text-center pt-16">
            {anyFilter ? (
              <EmptyState
                role="status"
                title="No rounds found"
                body={
                  filter && courseFilter
                    ? `${filter} hasn't played a recorded round at ${courseFilter}.`
                    : filter
                      ? `${filter} hasn't played a recorded round.`
                      : `${courseFilter} has no recorded rounds.`
                }
                action={
                  <Button variant="text" size="medium" onClick={clearFilters}>
                    {filter && courseFilter ? 'Clear filters' : 'Show all rounds'}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No rounds yet"
                body="Finish a round to see it here."
                action={<Button size="medium" onClick={() => navigate('setup')}>New game</Button>}
              />
            )}
          </div>
        )}

        {!loading && displayed.map(game => (
          <Card
            key={game.id}
            onOpen={() => navigate('summary', { game, fromHistory: true })}
            openLabel={`Open round: ${formatShortDate(game.completedAt)}, ${(game.players ?? []).join(', ')}${game._rejected ? ", can't be saved, kept on this device only" : game._pending ? ', not yet saved' : ''}`}
          >
            {/* Top row: the course name leads (hidden when the page already
                names the one course); a round whose save is outstanding carries
                its Tag at the right. A round the server refused says so, and
                where it is kept. */}
            {((game.courseName && !(user && courses.length === 1)) || game._pending) && (
              <div className="flex items-start justify-between gap-3 mb-1">
                {game.courseName && !(user && courses.length === 1) && (
                  <p className="type-label-caps text-accent min-w-0 break-words">{game.courseName}</p>
                )}
                {game._pending && (
                  <Tag className="shrink-0 ml-auto">
                    {game._rejected ? "Can't be saved" : 'Not yet saved'}
                  </Tag>
                )}
              </div>
            )}
            {game._pending && game._rejected && (
              <p className="type-small text-muted mb-1">Kept on this device only.</p>
            )}

            {/* Date + holes */}
            <div className="flex justify-between items-start gap-3 mb-2">
              <span className="type-body text-muted">
                {formatShortDate(game.completedAt)}
              </span>
              <span className="type-body text-muted shrink-0">
                {game.holesPlayed ?? game.holes} holes
              </span>
            </div>

            {/* Players: equal weight, no winner highlight (redesign decision 9) */}
            <div className="space-y-1">
              {(game.players ?? []).map(name => {
                const isDnf = game.dnf?.includes(name)
                const total = playerTotal(game.scores, name)
                const toPar = roundToPar((game.scores?.[name] ?? []).slice(0, game.holePars.length), game.holePars)
                return (
                  <div key={name} className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleFilter(name)}
                      aria-pressed={filter === name}
                      className={`${CARD_INNER_CONTROL} min-w-0 break-words text-left rounded-control type-body text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                    >
                      {name}
                      {isSignedInPlayer(name, user?.name) && <PlayerStar className="ml-0.5" />}
                      {isDnf && <span className="type-body text-muted"> (DNF)</span>}
                    </button>
                    {/* Total-to-par, matching Summary's totals row (#70). The
                        bracket is top-aligned beside the total, as in the
                        Figma History card; still a 12px Caption, not a superscript. */}
                    <span className="type-body text-muted shrink-0 flex items-start">
                      <span>{total > 0 ? total : '-'}</span>
                      <ParDelta delta={toPar} variant="bracket" className="ml-1" />
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Notes */}
            {game.notes && (
              <p className="type-small text-muted mt-2 line-clamp-2">{game.notes}</p>
            )}
          </Card>
        ))}

      </main>

      {sheet === 'course' && (
        <FilterSheet
          title="Course"
          allLabel="All courses"
          allCount={allGames.filter(matchesPlayer).length}
          options={courseOptions}
          selected={courseFilter}
          onSelect={setCourseFilter}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'player' && (
        <FilterSheet
          title="Player"
          allLabel="All players"
          allCount={allGames.filter(matchesCourse).length}
          options={playerOptions}
          selected={filter}
          onSelect={setFilter}
          onClose={() => setSheet(null)}
        />
      )}

    </div>
  )
}
