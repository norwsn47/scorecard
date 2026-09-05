import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { BRUNTSFIELD_COURSE_NAME, BRUNTSFIELD_HOLE_COUNT, BRUNTSFIELD_HOLE_PARS } from '../constants.js'
import { buildEditGame, canStartGame, createGame, findDuplicateIndices } from '../utils/game.js'
import { deriveHolePars } from '../utils/scores.js'
import { clearActiveCell, clearActiveGame, getActiveGame, getPlayers, saveActiveGame, savePlayers } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

const MAX_PLAYERS = 6
const NEW_COURSE_HOLE_OPTIONS = [9, 18]
const PAR_MIN = 2
const PAR_MAX = 7

export default function Setup({ navigate, goBack, params }) {
  const pastRound                          = params?.pastRound ?? false
  const editRound                          = params?.editRound ?? false
  const editGame                           = editRound ? (params?.game ?? null) : null
  const isDbEdit                           = !!editGame?._fromDb
  const fromBruntsfield                   = params?.bruntsfield ?? false
  const { user }                          = useAuth()
  const [names, setNames]                 = useState(() =>
    editGame?.players?.length ? [...editGame.players] : ['']
  )
  const [savedNames]                      = useState(() => getPlayers())
  const [courses, setCourses]             = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(() => editGame?.courseId ?? null)
  const [creatingCourse, setCreatingCourse]     = useState(false)
  const [newCourseName, setNewCourseName]       = useState('')
  const [newCourseHoleCount, setNewCourseHoleCount] = useState(9)
  const [newCoursePars, setNewCoursePars]       = useState(() => Array(9).fill(3))
  const [courseError, setCourseError]           = useState(null)
  const [notes, setNotes]                       = useState(() => editGame?.notes ?? '')
  const [pastDate, setPastDate]                 = useState(() =>
    editGame?.completedAt
      ? String(editGame.completedAt).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  )

  // Course selector is shown for logged-in users, except when editing a
  // local/quick-play round — its course is not editable (confirmed scope).
  const showCourse  = !!user && (!editRound || isDbEdit)
  const showDate    = pastRound || editRound
  const dupeIndices = findDuplicateIndices(names)
  const courseReady = !showCourse || !creatingCourse || newCourseName.trim().length > 0
  const ready       = canStartGame(names, names.length) && courseReady

  // Browser Back out of an in-progress edit lands here with the edit-flow
  // params gone (App.jsx never persists editRound / game in history state), so
  // this screen would otherwise render as a mislabelled "New Game" while the
  // edit working copy sits stranded in the active-game slot. Detect that,
  // discard the abandoned edit, and send the user to their rounds list where
  // the original round is untouched.
  useEffect(() => {
    if (editRound || pastRound) return
    if (getActiveGame()?._edit) {
      clearActiveGame()
      navigate('history')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    fetch('/api/courses', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.courses?.length) {
          setCourses(data.courses)
          // When editing, keep the round's own course selection untouched
          // (including "no course") rather than snapping to a default.
          if (!editRound) {
            const def = data.courses.find(c => c.is_default) ?? data.courses[0]
            setSelectedCourseId(def.id)
          }
        }
      })
      .catch(() => {})
  }, [user, editRound])

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

  function handleNewCourseHoleCount(count) {
    setNewCourseHoleCount(count)
    setNewCoursePars(Array(count).fill(3))
  }

  function stepPar(i, delta) {
    setNewCoursePars(prev => prev.map((p, idx) => {
      if (idx !== i) return p
      const next = p + delta
      return next < PAR_MIN || next > PAR_MAX ? p : next
    }))
  }

  function suggestionsFor(index) {
    const otherLower = names
      .filter((_, i) => i !== index)
      .map(n => n.trim().toLowerCase())
    return savedNames.filter(n => !otherLower.includes(n.toLowerCase()))
  }

  // Resolves the final course id/name, creating a new course first if the
  // user is mid "+ New course". Returns null on a failed creation (the error
  // banner is already set) so the caller can bail out.
  function holeParsForCourse(courseId) {
    const c = courses.find(x => x.id === courseId)
    return c ? deriveHolePars(c.hole_pars, c.holes) : null
  }

  async function resolveCourse(currentId, currentName) {
    if (!(showCourse && creatingCourse && newCourseName.trim())) {
      const c = courses.find(x => x.id === currentId)
      return {
        courseId: currentId,
        courseName: currentName,
        holePars: holeParsForCourse(currentId),
        holes: c?.holes ?? null,
      }
    }
    setCourseError(null)
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newCourseName.trim(), hole_pars: newCoursePars, holes: newCourseHoleCount }),
      })
      const data = await res.json()
      if (res.ok) {
        return {
          courseId: data.course.id,
          courseName: data.course.name,
          holePars: deriveHolePars(data.course.hole_pars, data.course.holes),
          holes: data.course.holes,
        }
      }
      setCourseError(data.error || 'Could not create course')
      return null
    } catch {
      setCourseError('Could not create course - please try again')
      return null
    }
  }

  async function handleStart() {
    if (!ready) return
    const trimmed = names.map(n => n.trim())

    const existing = getPlayers()
    const merged = [...new Set([...trimmed, ...existing])].slice(0, 20)
    savePlayers(merged)

    if (editRound && editGame) {
      const startId   = isDbEdit ? (selectedCourseId ?? null) : null
      const startName = isDbEdit
        ? (courses.find(c => c.id === startId)?.name ?? editGame.courseName ?? null)
        : null
      const resolved = await resolveCourse(startId, startName)
      if (!resolved) return

      const dateIso = new Date(pastDate + 'T12:00:00').toISOString()
      // Par: adopt the new course's par when a D1 edit creates or switches
      // course; otherwise the round keeps its own saved snapshot (§11.7).
      const courseChanged = isDbEdit && (resolved.courseId ?? null) !== (editGame.courseId ?? null)
      const editHolePars = (creatingCourse || courseChanged) ? resolved.holePars : editGame.holePars
      const working = buildEditGame(editGame, trimmed, resolved.courseId, resolved.courseName, dateIso, editHolePars)
      working.notes = notes.trim() || null
      working._edit = { id: editGame.id, fromDb: isDbEdit }
      saveActiveGame(working)
      // A new working game exists — drop any active cell left over from a
      // previous session so Scorecard doesn't restore a stale hole (#47).
      clearActiveCell()
      navigate('scorecard', { game: working, editContext: working._edit })
      return
    }

    const startId   = user ? (selectedCourseId ?? null) : null
    const startName = user
      ? (courses.find(c => c.id === startId)?.name ?? null)
      : (fromBruntsfield ? BRUNTSFIELD_COURSE_NAME : null)
    const resolved = await resolveCourse(startId, startName)
    if (!resolved) return

    const dateIso = pastRound
      ? new Date(pastDate + 'T12:00:00').toISOString()
      : null
    // Quick-play → Bruntsfield par 3s; logged-in → the selected course's par.
    const holePars = resolved.holePars ?? (user ? undefined : BRUNTSFIELD_HOLE_PARS)
    const holeCount = resolved.holes ?? BRUNTSFIELD_HOLE_COUNT
    const game = createGame(trimmed, resolved.courseId, resolved.courseName, dateIso, holePars, holeCount)
    saveActiveGame(game)
    // A new game exists — drop any active cell left over from a previous
    // session so Scorecard starts on hole 1 rather than a stale hole (#47).
    clearActiveCell()
    navigate('scorecard', { game, bruntsfield: fromBruntsfield })
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title={editRound ? 'Edit Round' : pastRound ? 'Add Past Round' : 'New Game'}
        backLabel={
          editRound
            ? '← Summary'
            : pastRound
              ? '← History'
              : `← ${fromBruntsfield ? 'Course' : 'Home'}`
        }
        onBack={() =>
          // Cancelling an edit now steps back through real history instead of
          // pushing a fresh Summary entry (#43b fix) — pushing left a stale,
          // param-less Summary underneath that later broke History's own back
          // button. Summary re-resolves the exact round from the `gameId`
          // App.jsx now persists across the bounce (see Summary.jsx).
          editRound
            ? goBack('summary')
            : pastRound
              ? goBack('history')
              : goBack(fromBruntsfield ? 'bruntsfield' : 'home')
        }
      />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-10 w-full space-y-3">

        {editRound && (
          <p className="font-ui text-xs text-muted leading-relaxed pb-1">
            Rename players, fix the date{showCourse ? ', switch the course' : ''} or add a note here. You'll adjust hole scores on the next screen.
          </p>
        )}

        {/* Course selector — logged-in only; not shown for local-round edits */}
        {showCourse && (
          <div className="pb-1">
            {!creatingCourse ? (
              <select
                value={selectedCourseId ?? ''}
                onChange={e => {
                  if (e.target.value === '__new__') {
                    setCreatingCourse(true)
                    setSelectedCourseId(null)
                    setNewCourseHoleCount(9)
                    setNewCoursePars(Array(9).fill(3))
                  } else {
                    setSelectedCourseId(e.target.value)
                  }
                }}
                className="w-full py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="__new__">+ New course</option>
              </select>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={e => { setNewCourseName(e.target.value.slice(0, 60)); setCourseError(null) }}
                      placeholder="Course name"
                      autoFocus
                      className="flex-1 min-w-0 py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <button
                      onClick={() => { setCreatingCourse(false); setNewCourseName(''); setCourseError(null); setNewCourseHoleCount(9); setNewCoursePars(Array(9).fill(3)) }}
                      className="px-4 py-3 rounded-sm border border-border text-muted font-ui text-sm active:bg-bg-card"
                    >
                      Cancel
                    </button>
                  </div>
                  {courseError && (
                    <p className="font-ui text-xs text-accent pl-1">{courseError}</p>
                  )}
                </div>

                {/* Hole count — 9 or 18 only, fixed once the course is
                    created (no course-edit flow yet, #54). Changing it resets
                    the par list to that many par-3 holes. */}
                <div className="mt-4">
                  <div className="flex gap-2" role="radiogroup" aria-label="Number of holes on this course">
                    {NEW_COURSE_HOLE_OPTIONS.map(n => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={newCourseHoleCount === n}
                        onClick={() => handleNewCourseHoleCount(n)}
                        className={[
                          'flex-1 h-11 rounded-md border font-ui text-sm active:bg-bg-card',
                          newCourseHoleCount === n
                            ? 'border-accent text-accent'
                            : 'border-border text-text',
                        ].join(' ')}
                      >
                        {n} holes
                      </button>
                    ))}
                  </div>
                  <p className="font-ui text-xs text-muted mt-1.5 pl-1">Holes — can't be changed later</p>
                </div>

                {/* Per-hole par — course creation only. Every hole starts at
                    par 3; adjust each hole with its own −/+ stepper (band 2–7). */}
                <div className="mt-4">
                  <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted mb-2 pl-1">Par for each hole</p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {newCoursePars.map((par, i) => {
                      const atMin = par <= PAR_MIN
                      const atMax = par >= PAR_MAX
                      return (
                        <div
                          key={i}
                          role="group"
                          aria-label={`Hole ${i + 1}, par ${par}`}
                          className="flex items-center justify-between rounded-md border border-border bg-bg-card pl-3 pr-0.5"
                        >
                          <span className="font-ui text-sm text-text">Hole {i + 1}</span>
                          <span className="flex items-center">
                            <button
                              type="button"
                              onClick={() => stepPar(i, -1)}
                              disabled={atMin}
                              aria-label={`Decrease par for hole ${i + 1}`}
                              className={[
                                'w-11 h-11 flex items-center justify-center rounded-md font-ui text-lg text-text active:bg-border',
                                atMin ? 'opacity-40' : '',
                              ].join(' ')}
                            >
                              −
                            </button>
                            <span className="font-ui text-sm text-text w-4 text-center tabular-nums">{par}</span>
                            <button
                              type="button"
                              onClick={() => stepPar(i, 1)}
                              disabled={atMax}
                              aria-label={`Increase par for hole ${i + 1}`}
                              className={[
                                'w-11 h-11 flex items-center justify-center rounded-md font-ui text-lg text-text active:bg-border',
                                atMax ? 'opacity-40' : '',
                              ].join(' ')}
                            >
                              +
                            </button>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
            <p className="font-ui text-xs text-muted mt-1.5 pl-1">Course</p>
          </div>
        )}

        {/* Date picker — past rounds and edits */}
        {showDate && (
          <div className="pb-1">
            <input
              type="date"
              value={pastDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setPastDate(e.target.value)}
              className="w-full py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <p className="font-ui text-xs text-muted mt-1.5 pl-1">Date played</p>
          </div>
        )}

        {editRound && names.length > 0 && (
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted pt-2 pl-1">Players</p>
        )}

        {names.map((name, i) => {
          const listId = `player-suggestions-${i}`
          const isDupe = dupeIndices.includes(i)
          const canRemove = names.length > 1 && !editRound
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
                  autoFocus={!editRound && i === names.length - 1}
                  className={[
                    'w-full py-3 pl-4 rounded-md border font-ui text-base bg-bg-card text-text',
                    'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40',
                    canRemove ? 'pr-10' : 'pr-4',
                    isDupe ? 'border-accent' : 'border-border',
                  ].join(' ')}
                />
                {canRemove && (
                  <button
                    onClick={() => handleRemovePlayer(i)}
                    aria-label={`Remove player ${i + 1}`}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted active:text-text"
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

        {!editRound && names.length < MAX_PLAYERS && (
          <button
            onClick={handleAddPlayer}
            className="w-full py-3 px-4 rounded-md border border-dashed border-border bg-bg-card text-muted font-ui text-sm active:bg-border"
          >
            + Add player
          </button>
        )}

        {/* Notes — edit mode only */}
        {editRound && (
          <div className="pt-2 pb-1">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 300))}
              placeholder="Add a note about this round..."
              rows={2}
              className="w-full px-4 py-3 rounded-md border border-border bg-bg-card font-ui text-base text-text placeholder:text-chrome resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <p className="font-ui text-xs text-muted mt-1.5 pl-1">Round notes - optional</p>
          </div>
        )}

        {fromBruntsfield && (
          <div className="pt-4 pb-3 text-center">
            <p className="font-ui text-sm text-muted leading-relaxed">
              New here?{' '}
              <button
                onClick={() => navigate('rules', { from: 'setup', bruntsfield: fromBruntsfield })}
                className="inline-block py-3 -my-3 text-accent underline underline-offset-2 active:opacity-70"
              >
                Read the course rules before you start
              </button>
            </p>
          </div>
        )}

        <div className="pt-3">
          <button
            onClick={handleStart}
            disabled={!ready}
            className={[
              'w-full py-4 rounded-sm font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn transition-opacity',
              ready
                ? 'bg-accent text-bg active:bg-accent-hover'
                : 'bg-accent text-bg opacity-40 cursor-not-allowed',
            ].join(' ')}
          >
            {editRound ? 'Edit hole scores' : pastRound ? 'Enter scores' : 'Start the round'}
          </button>
          {editRound && (
            <p className="font-ui text-xs text-muted text-center mt-2 leading-relaxed">
              Nothing is saved until you confirm on the next screen.
            </p>
          )}
        </div>

      </main>
    </div>
  )
}
