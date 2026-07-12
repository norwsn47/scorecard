import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Login({ navigate }) {
  const { authError, setAuthError } = useAuth()
  const [email, setEmail]           = useState('')
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [error, setError]           = useState(() => {
    if (authError) { setAuthError(null); return authError }
    return null
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong - please try again.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong - please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="h-full bg-bg flex flex-col">
        <button
          onClick={() => navigate('home')}
          className="p-4 font-ui text-sm tracking-[0.08em] uppercase text-muted active:text-accent text-left"
        >
          ← Back
        </button>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6 pb-16">
          <div className="w-12 h-12 rounded-full bg-bg-card border border-border flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-accent">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 8l10 7 10-7" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl italic text-text">Check your email</h1>
            <p className="font-ui text-sm text-muted">We sent a sign-in link to</p>
            <p className="font-ui text-sm text-text font-medium">{email}</p>
          </div>
          <p className="font-ui text-xs text-muted leading-relaxed">
            Tap the link in your email to sign in.<br />It expires in 15 minutes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg flex flex-col">
      <button
        onClick={() => navigate('home')}
        className="p-4 font-ui text-sm tracking-[0.08em] uppercase text-muted active:text-accent text-left"
      >
        ← Back
      </button>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl italic text-text leading-tight">
            Scorecard <span className="text-accent">Club</span><span className="relative -top-3 ml-2.5 font-ui not-italic text-[10px] tracking-[0.06em] uppercase text-accent border border-accent rounded px-1 py-0.5">Beta</span>
          </h1>
        </div>

        <div className="mb-8 space-y-3">
          <p className="font-ui text-sm text-muted leading-relaxed">
            Golf scoring shouldn't be complicated. But sometimes it's nice to see how you're getting on.
          </p>
          <div className="space-y-2 pt-1">
            <p className="font-ui text-sm text-muted flex gap-3"><span className="text-accent font-semibold">1</span>Add your own courses</p>
            <p className="font-ui text-sm text-muted flex gap-3"><span className="text-accent font-semibold">2</span>Track your scores across sessions</p>
            <p className="font-ui text-sm text-muted flex gap-3"><span className="text-accent font-semibold">3</span>See basic stats on your rounds</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-md bg-bg-card border border-border">
            <p className="font-ui text-xs text-accent">
              {error === 'expired'
                ? 'Your sign-in link has expired - please request a new one.'
                : error === 'error'
                ? 'Something went wrong. Please try again.'
                : error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-ui text-xs tracking-[0.12em] uppercase text-muted block mb-2">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
              className="w-full px-4 py-3 rounded-md bg-bg-card border border-border font-ui text-base text-text placeholder:text-chrome focus:outline-none focus:ring-2 focus:ring-[rgba(184,85,48,0.4)]"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full py-4 px-6 rounded-md bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn active:bg-accent-hover disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>

        <p className="font-ui text-xs text-muted mt-6 text-center">
          No password needed - we'll email you a sign-in link.
        </p>
      </div>
    </div>
  )
}
