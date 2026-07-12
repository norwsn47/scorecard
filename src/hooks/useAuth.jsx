import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    // Capture ?auth=expired|error redirected from the verify endpoint
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('auth')
    if (errorParam === 'expired' || errorParam === 'error') {
      setAuthError(errorParam)
      window.history.replaceState({}, '', window.location.pathname)
    }

    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, logout, authError, setAuthError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
