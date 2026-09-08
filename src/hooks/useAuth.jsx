import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [authError, setAuthError] = useState(null)
  // ?email=changed|expired|taken redirected from GET /api/auth/confirm-email
  // (§11.4.1). Surfaced as a one-off banner on Home; the param is stripped
  // straight away, exactly like ?auth= above.
  const [emailNotice, setEmailNotice] = useState(null)

  useEffect(() => {
    // Capture the status flags the auth endpoints redirect back with, then
    // strip whichever we recognised so a refresh doesn't replay them.
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('auth')
    const emailParam = params.get('email')
    let consumed = false
    if (errorParam === 'expired' || errorParam === 'error') {
      setAuthError(errorParam)
      consumed = true
    }
    if (emailParam === 'changed' || emailParam === 'expired' || emailParam === 'taken') {
      setEmailNotice(emailParam)
      consumed = true
    }
    if (consumed) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    // /api/auth/me now returns { id, email, name, pending_email } (§11.5) — the
    // spread keeps all four on the context user.
    fetch('/api/auth/me', { credentials: 'include', signal: controller.signal })
      .then(res => res.json())
      .then(data => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => { clearTimeout(timeout); setLoading(false) })
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }, [])

  // PATCH /api/users (§11.14). `name` is applied server-side immediately;
  // `email` starts the re-verification flow (§11.4.1) and comes back as
  // `pending_email` until the link in the new inbox is clicked — `email` itself
  // is unchanged here. Pass only the fields you want to change. Throws an Error
  // (with `.status`) on a non-2xx response.
  const updateProfile = useCallback(async ({ name, email } = {}) => {
    const body = {}
    if (name !== undefined) body.name = name
    if (email !== undefined) body.email = email

    const res = await fetch('/api/users', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const err = new Error(data.error || 'Could not update your profile')
      err.status = res.status
      throw err
    }

    setUser(prev => (prev ? {
      ...prev,
      ...('name' in data ? { name: data.name } : {}),
      ...('pending_email' in data ? { pending_email: data.pending_email } : {}),
    } : prev))

    return data
  }, [])

  // DELETE /api/users (§11.14) — irreversible. Server clears the session cookie;
  // we drop the context user so the app falls back to the signed-out state.
  // Quick-play localStorage history is deliberately left untouched.
  const deleteAccount = useCallback(async () => {
    const res = await fetch('/api/users', { method: 'DELETE', credentials: 'include' })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const err = new Error(data.error || 'Could not delete your account')
      err.status = res.status
      throw err
    }

    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, logout, updateProfile, deleteAccount, authError, setAuthError, emailNotice, setEmailNotice }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
