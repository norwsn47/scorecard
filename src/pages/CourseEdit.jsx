import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ParStepperGrid, { stepPar as stepParArray } from '../components/ParStepperGrid.jsx'
import { deriveHolePars } from '../utils/scores.js'

// Editing and deleting a signed-in user's own course (§11.7, #54/#71).
// Reached only from Setup's course selector "Edit" link — GET /api/courses
// has no single-course endpoint, so this mounts by fetching the full list
// and finding the one course by id (the same request Setup itself already
// makes, including `round_count` for the delete-confirmation copy).
export default function CourseEdit({ navigate, params }) {
  const courseId = params?.courseId ?? null

  // Setup's own edit-flow context, forwarded through so the back/save
  // actions can return to exactly the Setup screen the user came from
  // (New Game / Add Past Round / Edit Round) rather than a generic one.
  // Setup's own in-progress form state (player names, notes, date) is not
  // preserved across this detour — the same trade-off already accepted for
  // Setup's "Read the course rules" link.
  const editRound  = params?.editRound ?? false
  const pastRound  = params?.pastRound ?? false
  const setupGame  = params?.game ?? null
  const bruntsfield = params?.bruntsfield ?? false

  const backLabel = editRound ? '← Edit Round' : pastRound ? '← Past round' : '← New Game'
  function backToSetup() {
    navigate('setup', { editRound, pastRound, game: setupGame, bruntsfield })
  }

  const [loading, setLoading]     = useState(true)
  const [course, setCourse]       = useState(null)
  const [notFound, setNotFound]   = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const [name, setName]           = useState('')
  const [pars, setPars]           = useState([])
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!courseId) { setLoading(false); setNotFound(true); return }
    fetch('/api/courses', { credentials: 'include' })
      .then(async r => {
        // A session that expired mid-flow degrades to a generic "can't find
        // that course" without this check — surface it as a sign-in prompt
        // instead (#75).
        if (r.status === 401) return { signedOut: true }
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        if (data.signedOut) { setSignedOut(true); setLoading(false); return }
        const found = (data.courses ?? []).find(c => c.id === courseId)
        if (!found) {
          setNotFound(true)
        } else {
          setCourse(found)
          setName(found.name)
          setPars(deriveHolePars(found.hole_pars, found.holes))
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setNotFound(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [courseId])

  function stepCoursePar(i, delta) {
    setPars(prev => stepParArray(prev, i, delta))
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaveError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: trimmed, hole_pars: pars }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error || 'That did not save - please try again')
        setSaving(false)
        return
      }
      backToSetup()
    } catch {
      setSaveError('That did not save - please try again')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error || 'That did not delete - please try again')
        setDeleting(false)
        return
      }
      // The course (and every round on it) is gone — the safest landing spot
      // is Home, not back into a Setup screen that might still be pointed at
      // the now-deleted course id.
      navigate('home')
    } catch {
      setDeleteError('That did not delete - please try again')
      setDeleting(false)
    }
  }

  const roundCount = course?.round_count ?? 0
  const roundsClause = roundCount > 0
    ? `This will also delete ${roundCount} round${roundCount === 1 ? '' : 's'} recorded on this course. `
    : ''

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title={course?.name}
        subtitle="Edit course"
        backLabel={backLabel}
        onBack={backToSetup}
      />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-10 w-full space-y-3">

        {loading && (
          <div className="text-center pt-16">
            <p className="font-ui text-sm text-muted">Loading…</p>
          </div>
        )}

        {!loading && signedOut && (
          <div className="text-center pt-16">
            <p className="font-display italic text-xl text-text mb-2">Your session has expired</p>
            <p className="font-ui text-sm text-muted mb-6">
              Sign in again to edit this course.
            </p>
            <button
              onClick={() => navigate('login')}
              className="py-4 px-6 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn active:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Sign in
            </button>
          </div>
        )}

        {!loading && notFound && (
          <div className="text-center pt-16">
            <p className="font-display italic text-xl text-text mb-2">We can't find that course</p>
            <p className="font-ui text-sm text-muted mb-6">
              It may already have been deleted.
            </p>
            <button
              onClick={() => navigate('home')}
              className="py-4 px-6 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn active:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Back to Home
            </button>
          </div>
        )}

        {!loading && course && (
          <>
            <div className="pb-1">
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value.slice(0, 60)); setSaveError(null) }}
                placeholder="Course name"
                maxLength={60}
                className="w-full py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <p className="font-ui text-xs text-muted mt-1.5 pl-1">Course name</p>
            </div>

            {/* Per-hole par — reuses the same stepper as course creation and
                round-level par correction (#54/#71). Hole count itself is
                fixed for the life of the course (§11.7) — no control for it
                here, the grid simply renders exactly the course's own length. */}
            <div className="pt-1">
              <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted mb-2 pl-1">Par for each hole</p>
              <ParStepperGrid pars={pars} onStep={stepCoursePar} />
            </div>

            {saveError && (
              <p className="font-ui text-xs text-accent pl-1">{saveError}</p>
            )}

            <div className="pt-3">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className={[
                  'w-full py-4 rounded-sm font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  saving || !name.trim()
                    ? 'bg-accent text-bg opacity-40 cursor-not-allowed'
                    : 'bg-accent text-bg active:bg-accent-hover',
                ].join(' ')}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => { setDeleteError(null); setConfirmDelete(true) }}
                className="inline-block py-2.5 -my-2.5 font-ui text-xs text-muted underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Delete this course
              </button>
              {deleteError && (
                <p className="font-ui text-xs text-accent tracking-wide mt-2">{deleteError}</p>
              )}
            </div>
          </>
        )}

      </main>

      {/* Delete confirmation — mirrors History.jsx's confirmDeleteId sheet
          exactly, but the copy states the round count up front (§11.7) so
          the user knows the cascade before confirming. */}
      {confirmDelete && course && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: 'var(--overlay-backdrop)' }}>
          <div className="bg-bg rounded-t-2xl w-full max-w-[430px] px-6 pt-6 pb-10 shadow-card">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
            <h2 className="font-display italic text-2xl text-text mb-1">Delete {course.name}?</h2>
            <p className="font-ui text-xs text-muted tracking-wide mb-8">{roundsClause}This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-sm border border-border font-ui text-sm tracking-[0.08em] uppercase text-text active:bg-bg-card disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.08em] uppercase font-semibold active:opacity-80 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
