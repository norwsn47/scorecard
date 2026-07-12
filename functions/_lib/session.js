export async function getSessionUser(request, DB) {
  const cookie = request.headers.get('Cookie') || ''
  const sessionId = cookie.match(/(?:^|;\s*)session=([^;]+)/)?.[1]
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
