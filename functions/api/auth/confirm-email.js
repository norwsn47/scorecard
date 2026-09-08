// GET /api/auth/confirm-email?token=<token> — completes an email change begun
// by PATCH /api/users (§11.4.1). This is a NEW endpoint, deliberately not an
// extension of /api/auth/verify: verify finds-or-creates a user and opens a
// session, and running that here would create a second account for the pending
// address. This endpoint only swaps the address on the existing user.
//
// Redirects to APP_URL with a status flag for the frontend to surface:
//   ?email=changed  — the address was updated
//   ?email=expired  — token missing / used / expired, or the pending change was
//                     superseded or already applied (no pending_email match)
//   ?email=taken    — the address was registered by someone else in the meantime

export async function onRequestGet(context) {
  const { DB, APP_URL } = context.env
  const url = new URL(context.request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return Response.redirect(`${APP_URL}/?email=expired`, 302)
  }

  const now = new Date().toISOString()

  const tokenRow = await DB.prepare(
    'SELECT id, email FROM magic_tokens WHERE token = ? AND used = 0 AND expires_at > ?'
  ).bind(token, now).first()

  if (!tokenRow) {
    return Response.redirect(`${APP_URL}/?email=expired`, 302)
  }

  // The user whose pending change this token is for. A superseded request
  // (pending_email overwritten by a later change) or an already-applied one
  // leaves no match — the link is dead (§11.4.1).
  const owner = await DB.prepare(
    'SELECT id FROM users WHERE pending_email = ?'
  ).bind(tokenRow.email).first()

  if (!owner) {
    return Response.redirect(`${APP_URL}/?email=expired`, 302)
  }

  // Re-check the address is still free — someone else may have registered it
  // between the request and the click.
  const takenByOther = await DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(tokenRow.email).first()

  if (takenByOther) {
    return Response.redirect(`${APP_URL}/?email=taken`, 302)
  }

  // Atomic: swap the address, clear the pending flag, burn the token. Sessions
  // key on the session id, not the email, so every device stays signed in
  // (§11.4.1 "No re-login").
  //
  // The `takenByOther` check above narrows the race window; the real backstop
  // is the `users.email` UNIQUE constraint. If another confirmation for the
  // same address commits in the gap, this batch throws a uniqueness violation
  // — treat that exactly like the pre-check failing (redirect ?email=taken).
  // The batch is atomic, so nothing is partially applied. Any other error
  // falls through to the platform's 500.
  try {
    await DB.batch([
      DB.prepare('UPDATE users SET email = ?, pending_email = NULL WHERE id = ?').bind(tokenRow.email, owner.id),
      DB.prepare('UPDATE magic_tokens SET used = 1 WHERE id = ?').bind(tokenRow.id),
    ])
  } catch (err) {
    if (/UNIQUE/i.test(String(err?.message ?? err))) {
      return Response.redirect(`${APP_URL}/?email=taken`, 302)
    }
    throw err
  }

  return Response.redirect(`${APP_URL}/?email=changed`, 302)
}
