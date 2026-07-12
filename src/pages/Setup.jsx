import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { formatGameNameDate } from '../utils/format.js'
import { canStartGame, createGame, findDuplicateIndices } from '../utils/game.js'
import { getPlayers, saveActiveGame, savePlayers } from '../utils/storage.js'
import { useAuth } from '../hooks/useAuth.jsx'

const MAX_PLAYERS = 6

export default function Setup({ navigate, params }) {
  const pastRound                          = params?.pastRound ?? false
  const { user }                          = useAuth()
  const [gameName, setGameName]           = useState(() => formatGameNameDate())
  const [names, setNames]                 = useState([''])
  const [savedNames]                      = useState(() => getPlayers())
  const [courses, setCourses]             = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [creatingCourse, setCreatingCourse]     = useState(false)
  const [newCourseName, setNewCourseName]       = useState('')
  const [courseError, setCourseError]           = useState(null)
  const [pastDate, setPastDate]                 = useState(() => new Date().toISOString().slice(0, 10))

  const dupeIndices = findDuplicateIndices(names)
  const courseReady = !user || !creatingCourse || newCourseName.trim().length > 0
  const ready       = canStartGame(names, names.length) && courseReady

  useEffect(() => {
    if (!user) return
    fetch('/api/courses', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.courses?.length) {
          setCourses(data.courses)
          const def = data.courses.find(c => c.is_default) ?? data.courses[0]
          setSelectedCourseId(def.id)
        }
      })
      .catch(() => {})
  }, [user])

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

  async function handleStart() {
    if (!ready) return
    const trimmed = names.map(n => n.trim())

    const existing = getPlayers()
    const merged = [...new Set([...trimmed, ...existing])].slice(0, 20)
    savePlayers(merged)

    let courseId = user ? (selectedCourseId ?? null) : null

    if (user && creatingCourse && newCourseName.trim()) {
      setCourseError(null)
      try {
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: newCourseName.trim() }),
        })
        const data = await res.json()
        if (res.ok) {
          courseId = data.course.id
        } else {
          setCourseError(data.error || 'Could not create course')
          return
        }
      } catch {
        setCourseError('Could not create course - please try again')
        return
      }
    }

    const dateIso = pastRound
      ? new Date(pastDate + 'T12:00:00').toISOString()
      : null
    const game = createGame(trimmed, gameName, courseId, dateIso)
    saveActiveGame(game)
    navigate('scorecard', { game })
  }

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader title={pastRound ? 'Add Past Round' : 'New Game'} onBack={() => pastRound ? navigate('history') : navigate('home')} />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-10 w-full space-y-3">

        {/* Course selector — logged-in only */}
        {user && (
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
                    className="flex-1 py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
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

        {/* Game name */}
        <div className="pb-1">
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value.slice(0, 50))}
            maxLength={50}
            autoComplete="off"
            className="w-full py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <p className="font-ui text-xs text-muted mt-1.5 pl-1">Round name - optional</p>
        </div>

        {/* Date picker — past rounds only */}
        {pastRound && (
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

        {names.map((name, i) => {
          const listId = `player-suggestions-${i}`
          const isDupe = dupeIndices.includes(i)
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
                  autoFocus={i === names.length - 1}
                  className={[
                    'w-full py-3 pl-4 rounded-md border font-ui text-base bg-bg-card text-text',
                    'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40',
                    names.length > 1 ? 'pr-10' : 'pr-4',
                    isDupe ? 'border-accent' : 'border-border',
                  ].join(' ')}
                />
                {names.length > 1 && (
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

        {names.length < MAX_PLAYERS && (
          <button
            onClick={handleAddPlayer}
            className="w-full py-3 px-4 rounded-md border border-dashed border-border bg-bg-card text-muted font-ui text-sm active:bg-border"
          >
            + Add player
          </button>
        )}

        <div className="pt-2 pb-1 text-center">
          <button
            onClick={() => navigate('rules', { from: 'setup' })}
            className="py-2 font-ui text-xs text-accent underline underline-offset-2 active:text-text"
          >
            Course rules
          </button>
        </div>

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
            {pastRound ? 'Enter scores' : 'Start the round'}
          </button>
        </div>

      </main>
    </div>
  )
}
