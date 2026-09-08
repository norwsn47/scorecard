import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ParStepperGrid, { stepPar as stepParArray } from '../components/ParStepperGrid.jsx'
import { BRUNTSFIELD_COURSE_NAME, BRUNTSFIELD_HOLE_COUNT, BRUNTSFIELD_HOLE_PARS, QUICK_PLAY_COURSE_NAME } from '../constants.js'
import { buildEditGame, canStartGame, createGame, findDuplicateIndices } from '../utils/game.js'
import { deriveHolePars } from '../utils/scores.js'
import { clearActiveCell, clearActiveGame, getActiveGame, getPlayers, saveActiveGame, savePlayers } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

const MAX_PLAYERS = 6
const NEW_COURSE_HOLE_OPTIONS = [9, 18]

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

  // Round-level par correction (§11.13) — a separate, distinct capability
  // from the course selector above it. Seeded from the round's own saved
  // par snapshot, at the round's own hole count (never the course's hole
  // count, which can differ). Stays hand-editable once touched.
  const roundHoleCount = editGame?.holePars?.length ?? editGame?.holes ?? 9
  const [roundPars, setRoundPars] = useState(() =>
    editGame?.holePars?.length ? [...editGame.holePars] : Array(roundHoleCount).fill(3)
  )
  // Tracks the course selection this round-par stepper was last reset for,
  // so switching course mid-edit refreshes the stepper to the newly-selected
  // course's own par (PRD §11.13) exactly once per switch — not on the
  // initial mount (which must keep the round's own saved snapshot untouched)
  // and not on every re-render while the user hand-edits the stepper.
  const lastResetCourseId = useRef(selectedCourseId)

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
      // Forward bruntsfield context so History's back button (#72) doesn't
      // mislabel itself "<- Home" when this recovery redirect was reached via
      // Bruntsfield's "New Game" (BruntsfiledCoursePage.jsx).
      navigate('history', { bruntsfield: fromBruntsfield })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    fetch('/api/courses', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        // Always set the list — including an empty one, so the selector can
        // correctly render the "no courses yet" empty state (#54/#71)
        // rather than reading an empty array as "not loaded yet".
        const list = data.courses ?? []
        setCourses(list)
        // When editing, keep the round's own course selection untouched
        // (including "no course") rather than snapping to a default.
        if (!editRound && list.length) {
          const def = list.find(c => c.is_default) ?? list[0]
          setSelectedCourseId(def.id)
        }
      })
      .catch(() => {})
  }, [user, editRound])

  // Reset the round-par stepper to the newly-selected course's own par
  // whenever the course selection actually changes mid-edit (§11.13) — a
  // fresh default (par 3 across the board) when switching to "+ New course",
  // matching that form's own default. Skipped on the initial mount so the
  // round's saved par snapshot isn't clobbered just because `courses` loaded.
  useEffect(() => {
    if (!(editRound && isDbEdit)) return
    if (lastResetCourseId.current === selectedCourseId) return
    lastResetCourseId.current = selectedCourseId
    const c = courses.find(x => x.id === selectedCourseId)
    setRoundPars(c ? deriveHolePars(c.hole_pars, roundHoleCount) : Array(roundHoleCount).fill(3))
  }, [selectedCourseId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function stepCoursePar(i, delta) {
    setNewCoursePars(prev => stepParArray(prev, i, delta))
  }

  function stepRoundPar(i, delta) {
    setRoundPars(prev => stepParArray(prev, i, delta))
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
      // Par: whatever the round-par stepper currently holds (§11.13) — seeded
      // from the round's own saved snapshot, refreshed to a newly-selected
      // course's par on a course switch (see the reset effect above), and
      // otherwise freely hand-editable. Independent of the course itself.
      const working = buildEditGame(editGame, trimmed, resolved.courseId, resolved.courseName, dateIso, roundPars)
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
      : (fromBruntsfield ? BRUNTSFIELD_COURSE_NAME : QUICK_PLAY_COURSE_NAME)
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
              courses.length === 0 ? (
                // Zero courses — e.g. after deleting the only one (#54/#71).
                // A <select> with nothing but "+ New course" in it reads as
                // an accidentally-blank dropdown, so this degrades to an
                // explicit empty state instead. Leaving no course selected is
                // a real, intentional option here (not just a side effect of
                // the empty list) — handleStart already resolves that to a
                // no-course, 36-hole, all-par-3 round (the same shape as
                // logged-out Quick Play), so this state says so explicitly
                // rather than leaving it as an undiscoverable accident (#76).
                <div className="py-4 px-4 rounded-md border border-dashed border-border bg-bg-card text-center">
                  <p className="font-ui text-sm text-muted mb-3">No courses yet - add one to get started</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingCourse(true)
                      setSelectedCourseId(null)
                      setNewCourseHoleCount(9)
                      setNewCoursePars(Array(9).fill(3))
                    }}
                    className="py-2 px-4 rounded-sm border border-accent text-accent font-ui text-xs tracking-[0.1em] uppercase font-semibold active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    + New course
                  </button>
                  {/* Only true for a genuinely new round (New Game / Add Past
                      Round) — an editRound detour through this same empty
                      state (editing an existing no-course D1 round while the
                      user currently has zero courses) submits as "Edit hole
                      scores" and keeps the round's own hole count/par, not a
                      fresh 36-hole all-par-3 round, so the copy would be
                      wrong there (caught by code review). */}
                  {!editRound && (
                    <p className="font-ui text-xs text-muted mt-3">Or start below without one - Quick Play, 36 holes, all par 3.</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
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
                    className="flex-1 min-w-0 py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__new__">+ New course</option>
                  </select>
                  {/* Edit affordance — only for a real, selected course (never
                      shown mid "+ New course") (#54/#71). */}
                  {selectedCourseId && (
                    <button
                      type="button"
                      onClick={() => navigate('courseEdit', {
                        courseId: selectedCourseId,
                        editRound,
                        pastRound,
                        game: editGame,
                        bruntsfield: fromBruntsfield,
                      })}
                      className="shrink-0 inline-block py-3 -my-3 px-1 font-ui text-sm text-accent underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )
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
                      className="px-4 py-3 rounded-sm border border-border text-muted font-ui text-sm active:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
                          'flex-1 h-11 rounded-md border font-ui text-sm active:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
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
                  <ParStepperGrid pars={newCoursePars} onStep={stepCoursePar} />
                </div>
              </>
            )}
            <p className="font-ui text-xs text-muted mt-1.5 pl-1">Course</p>
          </div>
        )}

        {/* Round-level par correction (§11.13) — a separate, distinct
            capability from the course selector above: this fixes the par
            recorded on this one round, not the course's own par definition.
            Kept in its own labelled section, deliberately not merged into or
            visually adjacent-looking to the Course block, so the two can't
            be confused for each other. Applies to both local and D1 rounds. */}
        {editRound && (
          <div className="pt-3 pb-1">
            <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted mb-2 pl-1">Par for this round</p>
            <ParStepperGrid pars={roundPars} onStep={stepRoundPar} />
            <p className="font-ui text-xs text-muted mt-1.5 pl-1">
              Fixes the par recorded on this round only - the course's own par is unaffected.
            </p>
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
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
            className="w-full py-3 px-4 rounded-md border border-dashed border-border bg-bg-card text-muted font-ui text-sm active:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
                className="inline-block py-3 -my-3 text-accent underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
              'w-full py-4 rounded-sm font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
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
