import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { BRUNTSFIELD_COURSE_NAME } from '../constants.js'
import { buildEditGame, canStartGame, createGame, findDuplicateIndices } from '../utils/game.js'
import { getPlayers, saveActiveGame, savePlayers } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

const MAX_PLAYERS = 6

export default function Setup({ navigate, params }) {
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

  function suggestionsFor(index) {
    const otherLower = names
      .filter((_, i) => i !== index)
      .map(n => n.trim().toLowerCase())
    return savedNames.filter(n => !otherLower.includes(n.toLowerCase()))
  }

  // Resolves the final course id/name, creating a new course first if the
  // user is mid "+ New course". Returns null on a failed creation (the error
  // banner is already set) so the caller can bail out.
  async function resolveCourse(currentId, currentName) {
    if (!(showCourse && creatingCourse && newCourseName.trim())) {
      return { courseId: currentId, courseName: currentName }
    }
    setCourseError(null)
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newCourseName.trim() }),
      })
      const data = await res.json()
      if (res.ok) return { courseId: data.course.id, courseName: data.course.name }
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
      const working = buildEditGame(editGame, trimmed, resolved.courseId, resolved.courseName, dateIso)
      working.notes = notes.trim() || null
      working._edit = { id: editGame.id, fromDb: isDbEdit }
      saveActiveGame(working)
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
    const game = createGame(trimmed, resolved.courseId, resolved.courseName, dateIso)
    saveActiveGame(game)
    navigate('scorecard', { game, bruntsfield: fromBruntsfield })
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title={editRound ? 'Edit Round' : pastRound ? 'Add Past Round' : 'New Game'}
        onBack={() =>
          editRound
            ? navigate('summary', { game: editGame })
            : pastRound
              ? navigate('history')
              : navigate(fromBruntsfield ? 'bruntsfield' : 'home')
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
                    onClick={() => { setCreatingCourse(false); setNewCourseName(''); setCourseError(null) }}
                    className="px-4 py-3 rounded-sm border border-border text-muted font-ui text-sm active:bg-bg-card"
                  >
                    Cancel
                  </button>
                </div>
                {courseError && (
                  <p className="font-ui text-xs text-accent pl-1">{courseError}</p>
                )}
              </div>
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
                className="inline-block py-2 -my-2 text-accent underline underline-offset-2 active:opacity-70"
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
