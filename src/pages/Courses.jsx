import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

// Settings > My courses: the signed-in user's own courses, each a tap-through
// to CourseEdit. New courses are not added here - they are created from
// Setup when starting a game. GET /api/courses returns the list ordered
// default first, then by name. Mounts fresh on every visit (including the
// return from CourseEdit), so edits show without extra wiring.
export default function Courses({ navigate, goBack }) {
  const { user, loading } = useAuth()

  // Signed-out guard - bounce from an effect, never inline during render.
  useEffect(() => {
    if (!loading && !user) navigate('home', {}, { replace: true })
  }, [loading, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const [courses, setCourses] = useState([])
  const [status, setStatus]   = useState('loading') // loading | ready | failed | signedOut
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setStatus('loading')
    fetch('/api/courses', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) return { signedOut: true }
        if (!r.ok) throw new Error('courses fetch failed')
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        if (data.signedOut) { setStatus('signedOut'); return }
        setCourses(data.courses ?? [])
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('failed') })
    return () => { cancelled = true }
  }, [user, reloadKey])

  if (!user) return <div className="h-full bg-bg" />

  const failed = status === 'failed' || status === 'signedOut'

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title="My courses"
        backLabel="← Settings"
        onBack={() => goBack('settings')}
      />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 max-w-sm mx-auto w-full">

        <p className="font-ui text-sm text-muted leading-relaxed mb-4">
          Change a course's name or the par for each hole. New courses are added when you start a game.
        </p>

        {status === 'loading' && (
          <p className="font-ui text-sm text-muted text-center pt-8">Loading your courses…</p>
        )}

        {failed && (
          <div className="py-4 px-4 rounded-md border border-dashed border-border bg-bg-card text-center">
            <p role="alert" className="font-ui text-sm text-muted mb-3">
              {status === 'signedOut'
                ? "You've been signed out, so your courses can't be loaded."
                : "Couldn't load your courses - check your connection."}
            </p>
            <button
              type="button"
              onClick={() => (status === 'signedOut' ? navigate('login') : setReloadKey(k => k + 1))}
              className="min-h-[44px] py-2 px-4 rounded-sm border border-accent text-accent font-ui text-xs tracking-[0.1em] uppercase font-semibold active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {status === 'signedOut' ? 'Sign in' : 'Try again'}
            </button>
          </div>
        )}

        {status === 'ready' && courses.length === 0 && (
          <div className="py-4 px-4 rounded-md border border-dashed border-border bg-bg-card text-center">
            <p className="font-ui text-sm text-muted">
              No courses yet - add one when you start your next game.
            </p>
          </div>
        )}

        {status === 'ready' && courses.length > 0 && (
          <ul>
            {courses.map(c => {
              const n = c.round_count ?? 0
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => navigate('courseEdit', { courseId: c.id })}
                    className="w-full min-h-[56px] py-2 flex items-center justify-between gap-3 border-b border-border text-left active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <span className="min-w-0">
                      <span className="block font-ui text-base text-text break-words">{c.name}</span>
                      <span className="block font-ui text-xs text-muted">
                        {c.holes} holes · {n} {n === 1 ? 'round' : 'rounds'}
                        {c.is_default ? ' · default' : ''}
                      </span>
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-muted" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

      </main>
    </div>
  )
}
