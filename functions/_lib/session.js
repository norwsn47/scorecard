// Session cookie helpers and the session lookup. The cookie name, its
// attributes and its 30-day lifetime are hardcoded here (not env vars, §11.11)
// so verify, logout, me, the account-delete path and getSessionUser all agree.

export const SESSION_TTL_SECONDS = 2592000 // 30 days

/**
 * Reads the session id out of the request's Cookie header, or null when there
 * is no `session` cookie.
 */
export function getSessionCookie(request) {
  const cookie = request.headers.get('Cookie') || ''
  return cookie.match(/(?:^|;\s*)session=([^;]+)/)?.[1] ?? null
}

/** The Set-Cookie value that establishes a session (sign-in). */
export function buildSessionCookie(sessionId) {
  return `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}; Path=/`
}

/** The Set-Cookie value that clears the session cookie (logout, account delete). */
export const CLEAR_SESSION_COOKIE = 'session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/'

export async function getSessionUser(request, DB) {
  const sessionId = getSessionCookie(request)
  if (!sessionId) return null

  const now = new Date().toISOString()
  const row = await DB.prepare(
    `SELECT sessions.user_id, users.email
     FROM sessions
     JOIN users ON sessions.user_id = users.id
     WHERE sessions.id = ? AND sessions.expires_at > ?`
  ).bind(sessionId, now).first()

  return row ? { id: row.user_id, email: row.email } : null
}
