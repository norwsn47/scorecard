import { useState, useEffect } from 'react'
import Button from '../components/Button.jsx'
import { Input } from '../components/Field.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

// Login keeps the editorial, borderless "back link floating above a big
// heading" pattern Home uses rather than the boxed header bar every utility
// screen has (a deliberate difference, not an oversight). It gets there by
// rendering the shared PageHeader in its `bare` variant — back slot only,
// no border, no boxed padding — on both screens (the form, and the "check
// your email" confirmation), so the one back button can't drift apart
// between them. #85 removed Login's local hand-rolled copy, the last one in
// the app.

const RESEND_COOLDOWN_SECONDS = 30

// The one request behind both the first "Send me a link" submit and the
// confirmation screen's resend. Each caller reads the response its own way.
function requestLink(email) {
  return fetch('/api/auth/request-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export default function Login({ navigate, goBack }) {
  const { authError, setAuthError } = useAuth()
  const [email, setEmail]           = useState('')
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [error, setError]           = useState(null)

  // #9 — resend link on the confirmation screen. Local,
  // unpersisted state: a 30s cooldown after each resend tap, separate from
  // (and shorter than) the server's own 5-per-15-minutes throttle.
  const [resending, setResending]     = useState(false)
  const [resendError, setResendError] = useState(null)
  const [cooldown, setCooldown]       = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Capture the auth-error flag into local state the moment useAuth exposes
  // it (its effect runs after this child's, so this fires on the next render),
  // then clear the shared value. Local state dies with Login on navigation, so
  // the banner is a one-visit thing and a later return to Login is clean -
  // StrictMode's mount/cleanup/mount double-invoke can't strand it.
  useEffect(() => {
    if (authError) {
      setError(authError)
      setAuthError(null)
    }
  }, [authError, setAuthError])

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await requestLink(email)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSending(false)
    }
  }

  // Re-calls the same endpoint the initial submit used. Cooldown starts the
  // moment the tap registers (not after the response), so a slow network
  // can't be beaten with a second tap while the first request is in flight.
  async function handleResend() {
    if (cooldown > 0 || resending) return
    setResending(true)
    setResendError(null)
    setCooldown(RESEND_COOLDOWN_SECONDS)
    try {
      const res = await requestLink(email)
      if (!res.ok) {
        setResendError(
          res.status === 429
            ? "You've requested a few links already - check your inbox (including spam), or try again in a few minutes."
            : 'Something went wrong. Try again.'
        )
      }
    } catch {
      setResendError('Something went wrong. Try again.')
    } finally {
      setResending(false)
    }
  }

  if (sent) {
    return (
      <div className="h-full bg-bg flex flex-col">
        <PageHeader bare backLabel="Home" onBack={() => goBack('home')} />
        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6 pb-16">
          <div className="w-12 h-12 rounded-full bg-bg-card border border-border flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-accent">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 8l10 7 10-7" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="type-title text-text">Check your email</h1>
            <p className="type-small text-muted">We've sent a sign-in link to</p>
            <p className="type-small-strong text-text">{email}</p>
          </div>
          <p className="type-small text-muted">
            Tap the link in your email to sign in.<br />It expires in 15 minutes.
          </p>

          <div className="w-full max-w-[260px] flex flex-col items-stretch gap-3">
            {resendError && (
              <div role="alert" className="px-4 py-3 rounded-control bg-bg-card border border-border">
                <p className="type-small text-error">{resendError}</p>
              </div>
            )}
            <Button
              variant="secondary"
              size="medium"
              fullWidth
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
            >
              {resending
                ? 'Sending…'
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend link'}
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg flex flex-col">
      <PageHeader bare backLabel="Home" onBack={() => goBack('home')} />

      <main className="flex-1 flex flex-col px-page pt-3 pb-8">
        <div className="mb-2">
          <h1 className="type-title text-text">
            Sign in to Scorecard
          </h1>
        </div>

        <p className="type-body text-muted mb-5">
          Keep a proper record of your rounds and courses, across devices.
        </p>

        {error && (
          <div role="alert" className="mb-5 px-4 py-3 rounded-control bg-bg-card border border-border">
            <p className="type-small text-error">
              {error === 'expired'
                ? 'Your link has expired. Request a new one.'
                : error === 'error'
                ? 'Something went wrong. Try again.'
                : error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Input
              label="Email address"
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          <Button type="submit" fullWidth disabled={sending}>
            {sending ? 'Sending…' : 'Send sign-in link'}
          </Button>
        </form>

        <p className="type-small text-muted mt-6 text-center">
          No password. We'll send a link to your inbox.
        </p>
        <p className="type-small text-muted mt-3 text-center">
          <button
            type="button"
            onClick={() => navigate('privacy', { from: 'login' })}
            className="inline-block py-3.5 -my-3.5 text-accent underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            How we handle your data
          </button>
        </p>
      </main>
    </div>
  )
}
