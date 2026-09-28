import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ParStepperGrid, { stepPar as stepParArray } from '../components/ParStepperGrid.jsx'
import { BRUNTSFIELD_COURSE_NAME, BRUNTSFIELD_HOLE_COUNT, BRUNTSFIELD_HOLE_PARS, QUICK_PLAY_COURSE_NAME } from '../constants.js'
import { buildEditGame, canStartGame, createGame, findDuplicateIndices, highestScoredHoleIndex } from '../utils/game.js'
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
  // Whether "Edit game setup" was opened from Scorecard's edit-mode grid,
  // rather than Summary's Edit action — changes the header's back
  // destination below (Change 2b).
  const fromScorecard                      = editRound && (params?.fromScorecard ?? false)
  const { user }                          = useAuth()
  const [names, setNames]                 = useState(() =>
    editGame?.players?.length ? [...editGame.players] : ['']
  )
  // Parallel to `names` — for an edit, each entry is the index that name held
  // in the original saved roster (so its scores carry forward on save), or
  // `null` for a player added during this edit (no prior scores to carry
  // forward — the "no backfill" rule). Kept in lock-step with `names`
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
  const [pastDate, setPastDate]                 = useState(() => {
    const seed = editGame?.pastDate ?? editGame?.completedAt
    return seed ? localDateString(new Date(seed)) : localDateString()
  })

  // Round-level par correction — a separate, distinct capability
  // from the course selector above it. Seeded from the round's own saved
  // par snapshot, at the round's own hole count (never the course's hole
  // count, which can differ). Stays hand-editable once touched.
  // Reactive (not a frozen const) since reversing #56 means the round's hole
  // count now tracks whichever course is actually selected mid-edit — every
  // place that changes the selection (an existing-course pick, "+ New
  // course", or confirming a shrink) resizes this, and `roundPars`, together.
  const [roundHoleCount, setRoundHoleCount] = useState(() => editGame?.holePars?.length ?? editGame?.holes ?? 9)
  const [roundPars, setRoundPars] = useState(() =>
    editGame?.holePars?.length ? [...editGame.holePars] : Array(roundHoleCount).fill(3)
  )
  // Whether the user has actually tapped a +/- stepper on the round-par grid
  // this edit session, as opposed to the value merely being carried forward
  // unchanged or auto-reset by a course switch below. Only stepRoundPar sets
  // this true - it's what tells buildEditGame this round was individually
  // corrected, so a later course-level par cascade must leave it alone.
  const [roundParTouched, setRoundParTouched] = useState(false)
  // A course switch, or a "+ New course" hole-count pick, that would drop
  // real recorded scores (BACKLOG #56 reversal) waits here for the user to
  // confirm before any real state changes — see "shrink confirmation" below.
  // { kind: 'selectCourse', courseId, courseName, holes } |
  // { kind: 'startNewCourse' | 'newCourseHoles', holes }
  const [pendingChange, setPendingChange] = useState(null)
  const cancelPendingRef = useRef(null)
  // Snapshot of course/hole-count/par state taken the moment "+ New course"
  // is actually entered, so its own Cancel button can put everything back
  // exactly as it was — including any par the user had already hand-edited —
  // rather than recomputing a fresh default that would discard it.
  const priorSelectionRef = useRef(null)

  // Course selector is shown for logged-in users, except when editing a
  // local/quick-play round — its course is not editable (confirmed scope).
  const showCourse  = !!user && (!editRound || isDbEdit)
  const showDate    = pastRound || editRound

  // Every course is selectable regardless of hole count while editing
  // (BACKLOG #56 reversed): a round used to be locked to courses matching its
  // own hole count, because switching onto a shorter course silently dropped
  // the extra holes with no warning. That protection now lives in two other
  // places instead — the shrink-confirmation dialog below (gated at the point
  // of selection, before any state actually changes) and buildEditGame's
  // conditional `highestScored` floor (src/utils/game.js) — so the old #56
  // bug can't recur even though the course list is no longer filtered.
  const selectableCourses = courses
  // "+ New course" mid-edit starts at 9, matching New Game's own default —
  // no longer pinned to the round's existing hole count.
  const newCourseDefaultHoles = 9
  const dupeIndices = findDuplicateIndices(names)
  const courseReady = !showCourse || !creatingCourse || newCourseName.trim().length > 0
  // A cleared date field is '' - new Date('T12:00:00') is invalid and
  // toISOString() would throw, so the start button stays off until it is set.
  const dateValid   = !showDate || (pastDate !== '' && !Number.isNaN(new Date(pastDate + 'T12:00:00').getTime()))
  const ready       = canStartGame(names, names.length) && courseReady && dateValid

  // Pre-fill the first player slot with the signed-in user's own name
  // — a genuinely new round only, never an edit (renaming an existing
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
  // leaves that round alone (BACKLOG #113): the `_edit` working copy
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
      // Bruntsfield's "New Game" (BruntsfieldCoursePage.jsx).
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

  // Shrink-confirmation dialog (BACKLOG #56 reversal) — mirrors the shipped
  // bottom-sheet pattern (DESIGN.md "Dialog semantics", History.jsx's
  // delete-round sheet): autofocus the non-destructive "Cancel" on open,
  // return focus to the opener on close, Escape dismisses. There's no async
  // gap here (confirming only updates local state — any course POST happens
  // later, at Start), so no in-flight guard is needed.
  useEffect(() => {
    if (!pendingChange) return
    const opener = document.activeElement
    cancelPendingRef.current?.focus()
    return () => opener?.focus?.()
  }, [pendingChange])
  useEffect(() => {
    if (!pendingChange) return
    function onKey(e) {
      if (e.key === 'Escape') setPendingChange(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pendingChange])

  function closePendingChange() {
    setPendingChange(null)
  }

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

  // True only while editing a DB round: whether switching to `candidateHoles`
  // would drop a real, already-recorded score. Shared by every entry point
  // that can change the round's effective hole count — the course <select>,
  // the "+ New course" button, and its 9/18 radiogroup — so they can never
  // disagree on what counts as unsafe. New Game / Add Past Round have no
  // `editGame` to lose data from, so this is always false there.
  function wouldLoseScores(candidateHoles) {
    if (!(editRound && isDbEdit && editGame)) return false
    return candidateHoles < highestScoredHoleIndex(editGame) + 1
  }

  // Resizes the round-par stepper (and its backing hole count) to whichever
  // course is now actually selected — par 3 throughout for "no course
  // selected" (courseId null). The single place real state changes once a
  // course switch is either safe or has been confirmed.
  function commitCourseSelection(courseId, holes) {
    setSelectedCourseId(courseId)
    setRoundHoleCount(holes)
    const c = courses.find(x => x.id === courseId)
    setRoundPars(c ? deriveHolePars(c.hole_pars, holes) : Array(holes).fill(3))
  }

  // The course <select>'s onChange — gated by wouldLoseScores per the shrink
  // confirmation (BACKLOG #56 reversal): a shrink holds the candidate in
  // `pendingChange` rather than touching `selectedCourseId`, so a cancelled
  // dialog leaves the previous course selected and the round's scores
  // completely untouched, exactly as though nothing had been clicked.
  function selectCourse(courseId) {
    const course = courses.find(c => c.id === courseId)
    const holes = course?.holes ?? roundHoleCount
    if (wouldLoseScores(holes)) {
      setPendingChange({ kind: 'selectCourse', courseId, courseName: course?.name ?? null, holes })
      return
    }
    commitCourseSelection(courseId, holes)
  }

  // Actually enters "+ New course" at `holes` — snapshots the state it's
  // replacing first (course, hole count, and the round-par array exactly as
  // it stands, including any hand-edited values) so cancelNewCourse can put
  // it all back untouched.
  function enterCreatingCourse(holes) {
    priorSelectionRef.current = { courseId: selectedCourseId, holeCount: roundHoleCount, pars: [...roundPars] }
    setCreatingCourse(true)
    setSelectedCourseId(null)
    setNewCourseHoleCount(holes)
    setNewCoursePars(Array(holes).fill(3))
    setRoundHoleCount(holes)
    setRoundPars(Array(holes).fill(3))
  }

  // "+ New course" — gated the same way as selectCourse: its default (9,
  // matching New Game) can itself be unsafe for a round with scores past
  // hole 9, so that default is proposed via pendingChange rather than
  // applied immediately whenever it would lose data.
  function startNewCourse() {
    if (wouldLoseScores(newCourseDefaultHoles)) {
      setPendingChange({ kind: 'startNewCourse', holes: newCourseDefaultHoles })
      return
    }
    enterCreatingCourse(newCourseDefaultHoles)
  }

  // The "+ New course" form's own Cancel — aborts course creation entirely
  // and restores exactly what was selected before (BACKLOG #56 reversal: this
  // now needs to put the round-par stepper back too, since opening the form
  // resizes it to the proposed new course's hole count).
  function cancelNewCourse() {
    setCreatingCourse(false)
    setNewCourseName('')
    setCourseError(null)
    setNewCourseHoleCount(newCourseDefaultHoles)
    setNewCoursePars(Array(newCourseDefaultHoles).fill(3))
    const prior = priorSelectionRef.current
    if (prior) {
      setSelectedCourseId(prior.courseId)
      setRoundHoleCount(prior.holeCount)
      setRoundPars(prior.pars)
      priorSelectionRef.current = null
    }
  }

  // The "+ New course" 9/18 radiogroup, gated like every other hole-count
  // entry point above.
  function handleNewCourseHoleCount(count) {
    if (wouldLoseScores(count)) {
      setPendingChange({ kind: 'newCourseHoles', holes: count })
      return
    }
    applyNewCourseHoleCount(count)
  }

  function applyNewCourseHoleCount(count) {
    setNewCourseHoleCount(count)
    setNewCoursePars(Array(count).fill(3))
    setRoundHoleCount(count)
    setRoundPars(Array(count).fill(3))
  }

  // Confirming the shrink dialog applies whichever candidate was waiting.
  function confirmPendingChange() {
    if (!pendingChange) return
    if (pendingChange.kind === 'selectCourse') {
      commitCourseSelection(pendingChange.courseId, pendingChange.holes)
    } else if (pendingChange.kind === 'startNewCourse') {
      enterCreatingCourse(pendingChange.holes)
    } else if (pendingChange.kind === 'newCourseHoles') {
      applyNewCourseHoleCount(pendingChange.holes)
    }
    setPendingChange(null)
  }

  // The dialog's heading/body/confirm-button copy for whichever candidate is
  // pending, naming the actual holes at risk (one-indexed, matching the
  // Hole N convention used everywhere else in the app).
  function pendingChangeCopy(change) {
    if (!change || !editGame) return null
    const from = change.holes + 1
    const to = highestScoredHoleIndex(editGame) + 1
    const holeRange = from === to ? `hole ${from}` : `holes ${from} to ${to}`
    if (change.kind === 'selectCourse') {
      const name = change.courseName || 'This course'
      return {
        heading: `Switch to ${name}?`,
        body: `${name} only has ${change.holes} holes. The scores already recorded on ${holeRange} will be lost.`,
        confirmLabel: 'Switch course',
      }
    }
    return {
      heading: `Create a ${change.holes}-hole course?`,
      body: `This round already has scores on ${holeRange}. They'll be lost once the course is created.`,
      confirmLabel: 'Create course',
    }
  }

  function stepCoursePar(i, delta) {
    setNewCoursePars(prev => stepParArray(prev, i, delta))
  }

  function stepRoundPar(i, delta) {
    setRoundPars(prev => stepParArray(prev, i, delta))
    setRoundParTouched(true)
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
      // Par: whatever the round-par stepper currently holds — seeded
      // from the round's own saved snapshot, refreshed to a newly-selected
      // course's par on a course switch (see commitCourseSelection /
      // enterCreatingCourse above), and otherwise freely hand-editable.
      // Independent of the course itself.
      // `resolved.holes` carries the resolved course's real hole count
      // through as `targetHoleCount` (BACKLOG #56 reversal) — a shrink only
      // ever reaches here once Setup's own confirmation dialog has already
      // been shown, so bypassing buildEditGame's `highestScored` floor here
      // is exactly what should happen. Null when no real course is resolved,
      // which correctly falls back to that floor.
      const working = buildEditGame(editGame, trimmed, resolved.courseId, resolved.courseName, dateIso, roundPars, originalIndices, roundParTouched, resolved.holes)
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
            ? (fromScorecard ? '← Scorecard' : '← Summary')
            : pastRound
              ? '← History'
              : `← ${fromBruntsfield ? 'Course' : 'Home'}`
        }
        onBack={() =>
          // Cancelling an edit now steps back through real history instead of
          // pushing a fresh Summary entry (#43b fix) — pushing left a stale,
          // param-less Summary underneath that later broke History's own back
          // button. Summary re-resolves the exact round from the `gameId`
          // App.jsx now persists across the bounce (see Summary.jsx). Opened
          // from Scorecard's own "Edit game setup" instead, the real step
          // back lands on Scorecard, so the fallback names that destination.
          editRound
            ? goBack(fromScorecard ? 'scorecard' : 'summary')
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
                    No courses yet - add one to get started
                  </p>
                  <button
                    type="button"
                    onClick={startNewCourse}
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
                    aria-label="Course"
                    value={selectedCourseId ?? ''}
                    onChange={e => selectCourse(e.target.value)}
                    className="flex-1 min-w-0 py-3 pl-4 pr-4 rounded-md border border-field font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
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
                        fromScorecard,
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
                  <button
                    type="button"
                    onClick={startNewCourse}
                    className="shrink-0 py-2 px-4 rounded-sm border border-accent text-accent font-ui text-xs tracking-[0.1em] uppercase font-semibold active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    + New course
                  </button>
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
                      className="flex-1 min-w-0 py-3 pl-4 pr-4 rounded-md border border-field font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <button
                      onClick={cancelNewCourse}
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
                    the par list to that many par-3 holes. Offered the same
                    way in edit mode as New Game / Add Past Round (BACKLOG #56
                    reversed) — handleNewCourseHoleCount gates a shrink that
                    would lose real recorded scores behind the same
                    confirmation dialog as the course <select> above. */}
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

        {/* Round-level par correction — a separate, distinct
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
              Fixes the par recorded on this round only. A later change to the course's own par won't override this once you save.
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
              className="w-full py-3 pl-4 pr-4 rounded-md border border-field font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
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
                    isDupe ? 'border-accent' : 'border-field',
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
              className="w-full px-4 py-3 rounded-md border border-field bg-bg-card font-ui text-base text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
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

      {/* Shrink confirmation — mirrors History.jsx's delete-round sheet:
          role="dialog", aria-modal, aria-labelledby, autofocus on the
          non-destructive "Cancel", Escape and backdrop-click to dismiss
          (DESIGN.md "Dialog semantics"). BACKLOG #56 reversed: a course
          switch (or a new course's hole count) that would drop real recorded
          scores waits here rather than applying immediately - cancelling
          leaves the previous course selected and every score untouched. */}
      {pendingChange && (() => {
        const copy = pendingChangeCopy(pendingChange)
        if (!copy) return null
        return (
          <div
            className="fixed inset-0 flex items-end justify-center z-50"
            style={{ background: 'var(--overlay-backdrop)' }}
            onClick={closePendingChange}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="course-switch-heading"
              onClick={e => e.stopPropagation()}
              className="bg-bg rounded-t-2xl w-full max-w-[430px] px-6 pt-6 pb-10 shadow-card"
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
              <h2 id="course-switch-heading" className="font-display italic text-2xl text-text mb-1">{copy.heading}</h2>
              <p className="font-ui text-xs text-muted tracking-wide mb-8">{copy.body}</p>
              <div className="flex gap-3">
                <button
                  ref={cancelPendingRef}
                  onClick={closePendingChange}
                  className="flex-1 py-3 rounded-sm border border-border font-ui text-sm tracking-[0.08em] uppercase text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPendingChange}
                  className="flex-1 py-3 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.08em] uppercase font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {copy.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
