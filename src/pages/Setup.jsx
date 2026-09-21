import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ParStepperGrid, { stepPar as stepParArray } from '../components/ParStepperGrid.jsx'
import { BRUNTSFIELD_COURSE_NAME, BRUNTSFIELD_HOLE_COUNT, BRUNTSFIELD_HOLE_PARS, QUICK_PLAY_COURSE_NAME } from '../constants.js'
import { buildEditGame, canStartGame, createGame, findDuplicateIndices } from '../utils/game.js'
import { localDateString } from '../utils/format.js'
import { deriveHolePars } from '../utils/scores.js'
import { clearActiveCell, clearActiveGame, getActiveGame, getPlayers, saveActiveGame, savePlayers } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { holdRound, syncPendingRounds } from '../utils/sync.js'

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
  // Parallel to `names` — for an edit, each entry is the index that name held
  // in the original saved roster (so its scores carry forward on save), or
  // `null` for a player added during this edit (no prior scores to carry
  // forward — §11.13.1's "no backfill" rule). Kept in lock-step with `names`
  // by handleAddPlayer/handleRemovePlayer so a mid-list removal can never
  // misalign a remaining player's scores with the wrong name. Unused outside
  // edit mode (New Game/Add Past Round build fresh score rows regardless).
  const [originalIndices, setOriginalIndices] = useState(() =>
    editGame?.players?.length ? editGame.players.map((_, i) => i) : [null]
  )
  // The player-name input to autofocus, by index — the single field on a
  // fresh New Game/Add Past Round screen, or a field just added via "+ Add
  // player" (in either mode). Null means "don't steal focus", which matters
  // on an edit screen's initial load, where the roster already holds real
  // names being corrected, not fresh entries waiting to be typed.
  const [autoFocusIndex, setAutoFocusIndex] = useState(() => (editRound ? null : names.length - 1))
  const [savedNames]                      = useState(() => getPlayers())
  const [courses, setCourses]             = useState([])
  // 'loading' | 'ready' | 'failed' | 'signedOut'. An empty list only means "no
  // courses yet" once the fetch has actually succeeded - a failed or expired
  // session must not read as an empty account (#99).
  const [coursesStatus, setCoursesStatus] = useState('loading')
  const [coursesReloadKey, setCoursesReloadKey] = useState(0)
  const [selectedCourseId, setSelectedCourseId] = useState(() => editGame?.courseId ?? null)
  const [creatingCourse, setCreatingCourse]     = useState(false)
  const [newCourseName, setNewCourseName]       = useState('')
  const [newCourseHoleCount, setNewCourseHoleCount] = useState(9)
  const [newCoursePars, setNewCoursePars]       = useState(() => Array(9).fill(3))
  const [courseError, setCourseError]           = useState(null)
  const [notes, setNotes]                       = useState(() => editGame?.notes ?? '')
  const [pastDate, setPastDate]                 = useState(() =>
    editGame?.completedAt
      ? localDateString(new Date(editGame.completedAt))
      : localDateString()
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

  // A round's hole count can't change while editing it (#56): switching a
  // 36-hole round onto a 9-hole course would leave a 36-row grid with the
  // extra holes padded to par 3. So an edit only offers courses with the
  // round's own hole count (plus the round's current course, so it always
  // stays selectable), and a course created mid-edit gets that hole count.
  const selectableCourses = editRound
    ? courses.filter(c => c.holes === roundHoleCount || c.id === editGame?.courseId)
    : courses
  const canCreateCourse   = !editRound || NEW_COURSE_HOLE_OPTIONS.includes(roundHoleCount)
  const newCourseDefaultHoles = editRound && canCreateCourse ? roundHoleCount : 9
  const dupeIndices = findDuplicateIndices(names)
  const courseReady = !showCourse || !creatingCourse || newCourseName.trim().length > 0
  // A cleared date field is '' - new Date('T12:00:00') is invalid and
  // toISOString() would throw, so the start button stays off until it is set.
  const dateValid   = !showDate || (pastDate !== '' && !Number.isNaN(new Date(pastDate + 'T12:00:00').getTime()))
  const ready       = canStartGame(names, names.length) && courseReady && dateValid

  // Pre-fill the first player slot with the signed-in user's own name (§4.2,
  // §11.15) — a genuinely new round only, never an edit (renaming an existing
  // player is a different action). `user` resolves asynchronously from
  // /api/auth/me, so this runs once it (and its `name`) is available rather
  // than at the useState initialiser above. Guarded so it never clobbers a
  // name the player has already typed into that slot — a one-time default,
  // not something re-applied on every render, and still freely overwritable
  // afterwards like any other player-name field.
  useEffect(() => {
    if (editRound || !user?.name) return
    setNames(prev => {
      if (!prev.length || prev[0].trim() !== '') return prev
      const next = [...prev]
      next[0] = user.name
      return next
    })
  }, [user, editRound])

  // The latest signed-in id, so the unmount cleanup below is never stale.
  const userIdRef = useRef(null)
  useEffect(() => { userIdRef.current = user?.id ?? null }, [user?.id])

  // While the Edit Round screen is open for a local round, the background sync
  // leaves that round alone (BACKLOG #113, PRD §11.8): the `_edit` working copy
  // does not exist yet, so without a hold an `online` or app-open run could send
  // the old data and strand the edit. Holding a round that is not pending is a
  // no-op for the runner. The hold is released on unmount only: handleStart has
  // already saved `_edit` by then (the slot then protects the round), so there is
  // no window across its awaits. A DB edit has no local record to protect.
  // If the edit was abandoned (no `_edit` for this round in the active slot) the
  // round was the only thing this screen was keeping from syncing, so trigger a
  // run; if the edit was started, Scorecard now owns the round and a run would
  // only skip it. Written for StrictMode's dev-only mount / cleanup / mount: a
  // hold released and retaken is fine (the runner re-checks after its await).
  useEffect(() => {
    if (!editRound || !editGame?.id || isDbEdit) return
    const id = editGame.id
    const release = holdRound(id)
    return () => {
      release()
      if (getActiveGame()?._edit?.id === id) return
      const uid = userIdRef.current
      if (uid !== null && uid !== undefined) syncPendingRounds(uid)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      // That stranded edit was the only thing keeping its round from syncing
      // (#113), so ask for a run now. `user` is already set here when auth has
      // resolved; if it has not, the app-open trigger covers it once it does.
      if (user?.id !== null && user?.id !== undefined) syncPendingRounds(user.id)
      // Forward bruntsfield context so History's back button (#72) doesn't
      // mislabel itself "<- Home" when this recovery redirect was reached via
      // Bruntsfield's "New Game" (BruntsfiledCoursePage.jsx).
      navigate('history', { bruntsfield: fromBruntsfield }, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    setCoursesStatus('loading')
    fetch('/api/courses', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) return { signedOut: true }
        if (!r.ok) throw new Error('courses fetch failed')
        return r.json()
      })
      .then(data => {
        if (data.signedOut) { setCoursesStatus('signedOut'); return }
        // Always set the list — including an empty one, so the selector can
        // correctly render the "no courses yet" empty state (#54/#71); the
        // status says the fetch succeeded, so empty really means empty.
        const list = data.courses ?? []
        setCourses(list)
        setCoursesStatus('ready')
        // When editing, keep the round's own course selection untouched
        // (including "no course") rather than snapping to a default.
        if (!editRound && list.length) {
          const def = list.find(c => c.is_default) ?? list[0]
          setSelectedCourseId(def.id)
        }
      })
      .catch(() => setCoursesStatus('failed'))
  }, [user, editRound, coursesReloadKey])

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
    if (names.length >= MAX_PLAYERS) return
    setAutoFocusIndex(names.length)
    setNames([...names, ''])
    setOriginalIndices([...originalIndices, null])
  }

  function handleRemovePlayer(i) {
    setNames(names.filter((_, idx) => idx !== i))
    setOriginalIndices(originalIndices.filter((_, idx) => idx !== i))
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
      // A DB edit follows the course selector. A local edit has no selector,
      // so the round keeps its own course: a pending round (BACKLOG #95) carries
      // a D1 course id that its later sync needs, and a quick-play round keeps
      // its course label. An edit changes only what the user edited.
      const startId   = isDbEdit ? (selectedCourseId ?? null) : (editGame.courseId ?? null)
      const startName = isDbEdit
        ? (courses.find(c => c.id === startId)?.name ?? editGame.courseName ?? null)
        : (editGame.courseName ?? null)
      const resolved = await resolveCourse(startId, startName)
      if (!resolved) return

      const dateIso = new Date(pastDate + 'T12:00:00').toISOString()
      // Par: whatever the round-par stepper currently holds (§11.13) — seeded
      // from the round's own saved snapshot, refreshed to a newly-selected
      // course's par on a course switch (see the reset effect above), and
      // otherwise freely hand-editable. Independent of the course itself.
      const working = buildEditGame(editGame, trimmed, resolved.courseId, resolved.courseName, dateIso, roundPars, originalIndices)
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
            Rename players, add or remove one, fix the date{showCourse ? ', switch the course' : ''} or add a note here. You'll adjust hole scores on the next screen.
          </p>
        )}

        {/* Course selector — logged-in only; not shown for local-round edits */}
        {showCourse && (
          <div className="pb-1">
            {!creatingCourse ? (
              coursesStatus !== 'ready' ? (
                // Not loaded, or the load failed / the session expired. Never
                // shown as "No courses yet": that would read as an empty
                // account (#99). Starting without a course stays possible so a
                // dead signal on the course doesn't block a round.
                <div className="py-4 px-4 rounded-md border border-dashed border-border bg-bg-card text-center">
                  {coursesStatus === 'loading' ? (
                    <p className="font-ui text-sm text-muted">Loading your courses…</p>
                  ) : (
                    <>
                      <p role="alert" className="font-ui text-sm text-muted mb-3">
                        {coursesStatus === 'signedOut'
                          ? "You've been signed out, so your courses can't be loaded."
                          : "Couldn't load your courses - check your connection."}
                      </p>
                      <button
                        type="button"
                        onClick={() => (coursesStatus === 'signedOut' ? navigate('login') : setCoursesReloadKey(k => k + 1))}
                        className="py-2 px-4 rounded-sm border border-accent text-accent font-ui text-xs tracking-[0.1em] uppercase font-semibold active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        {coursesStatus === 'signedOut' ? 'Sign in' : 'Try again'}
                      </button>
                      <p className="font-ui text-xs text-muted mt-3">
                        {editRound
                          ? 'You can still change the other details.'
                          : 'Or start below without one - Quick Play, 36 holes, all par 3.'}
                      </p>
                    </>
                  )}
                </div>
              ) : selectableCourses.length === 0 ? (
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
                  <p className="font-ui text-sm text-muted mb-3">
                    {editRound && courses.length > 0
                      ? `No courses with ${roundHoleCount} holes - a round's hole count can't change while editing`
                      : 'No courses yet - add one to get started'}
                  </p>
                  {canCreateCourse && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingCourse(true)
                        setSelectedCourseId(null)
                        setNewCourseHoleCount(newCourseDefaultHoles)
                        setNewCoursePars(Array(newCourseDefaultHoles).fill(3))
                      }}
                      className="py-2 px-4 rounded-sm border border-accent text-accent font-ui text-xs tracking-[0.1em] uppercase font-semibold active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      + New course
                    </button>
                  )}
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
                    aria-label="Course"
                    value={selectedCourseId ?? ''}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="flex-1 min-w-0 py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {selectableCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
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
                  {/* "+ New course" used to be a sentinel option inside the
                      select above (value="__new__") — picking it didn't
                      select a course, it flipped the UI into creation mode.
                      That pattern isn't cleanly drivable by userEvent in
                      jsdom and reads oddly as a select option, so it's a
                      separate button beside the select instead — same label
                      and visual treatment as the zero-courses empty state's
                      "+ New course" button below. */}
                  {canCreateCourse && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingCourse(true)
                        setSelectedCourseId(null)
                        setNewCourseHoleCount(newCourseDefaultHoles)
                        setNewCoursePars(Array(newCourseDefaultHoles).fill(3))
                      }}
                      className="shrink-0 py-2 px-4 rounded-sm border border-accent text-accent font-ui text-xs tracking-[0.1em] uppercase font-semibold active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      + New course
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
                      aria-label="Course name"
                      value={newCourseName}
                      onChange={e => { setNewCourseName(e.target.value.slice(0, 60)); setCourseError(null) }}
                      placeholder="Course name"
                      autoFocus
                      className="flex-1 min-w-0 py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <button
                      onClick={() => { setCreatingCourse(false); setNewCourseName(''); setCourseError(null); setNewCourseHoleCount(newCourseDefaultHoles); setNewCoursePars(Array(newCourseDefaultHoles).fill(3)) }}
                      className="px-4 py-3 rounded-sm border border-border text-muted font-ui text-sm active:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      Cancel
                    </button>
                  </div>
                  {courseError && (
                    <p role="alert" className="font-ui text-xs text-accent pl-1">{courseError}</p>
                  )}
                </div>

                {/* Hole count — 9 or 18 only, fixed once the course is
                    created (no course-edit flow yet, #54). Changing it resets
                    the par list to that many par-3 holes. */}
                <div className="mt-4">
                  {editRound ? (
                    <p className="font-ui text-sm text-text pl-1">{roundHoleCount} holes</p>
                  ) : (
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
                  )}
                  <p className="font-ui text-xs text-muted mt-1.5 pl-1">
                    {editRound ? "Holes - matches this round, can't be changed" : "Holes — can't be changed later"}
                  </p>
                </div>

                {/* Per-hole par — course creation only. Every hole starts at
                    par 3; adjust each hole with its own −/+ stepper (band 2–7). */}
                <div className="mt-4">
                  <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted mb-2 pl-1">Par for each hole</p>
                  <ParStepperGrid pars={newCoursePars} onStep={stepCoursePar} />
                </div>
              </>
            )}
            <p className="font-ui text-xs text-muted mt-1.5 pl-1">
              {editRound ? `Course - ${roundHoleCount}-hole courses only, to match this round` : 'Course'}
            </p>
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
              aria-label="Date played"
              value={pastDate}
              max={localDateString()}
              onChange={e => setPastDate(e.target.value)}
              className="w-full py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            {pastDate === '' ? (
              <p role="alert" className="font-ui text-xs text-accent mt-1.5 pl-1">Choose the date the round was played</p>
            ) : (
              <p className="font-ui text-xs text-muted mt-1.5 pl-1">Date played</p>
            )}
          </div>
        )}

        {editRound && names.length > 0 && (
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted pt-2 pl-1">Players</p>
        )}

        {names.map((name, i) => {
          const listId = `player-suggestions-${i}`
          const isDupe = dupeIndices.includes(i)
          const canRemove = names.length > 1
          return (
            <div key={i}>
              <div className="relative">
                <input
                  type="text"
                  aria-label={`Player ${i + 1} name`}
                  value={name}
                  onChange={e => handleNameChange(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  list={listId}
                  maxLength={30}
                  autoComplete="off"
                  autoFocus={i === autoFocusIndex}
                  className={[
                    'w-full py-3 pl-4 rounded-md border font-ui text-base bg-bg-card text-text',
                    'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40',
                    canRemove ? 'pr-12' : 'pr-4',
                    isDupe ? 'border-accent' : 'border-border',
                  ].join(' ')}
                />
                {canRemove && (
                  <button
                    onClick={() => handleRemovePlayer(i)}
                    aria-label={`Remove player ${i + 1}`}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-3.5 text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
            className="w-full py-3 px-4 rounded-md border border-dashed border-border bg-bg-card text-muted font-ui text-sm active:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            + Add player
          </button>
        )}

        {/* Notes — edit mode only */}
        {editRound && (
          <div className="pt-2 pb-1">
            <textarea
              aria-label="Round notes"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 300))}
              placeholder="Add a note about this round..."
              rows={2}
              className="w-full px-4 py-3 rounded-md border border-border bg-bg-card font-ui text-base text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
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
