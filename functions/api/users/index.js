import { getSessionUser } from '../../_lib/session.js'
import { sendEmail, magicLinkEmailHtml, isValidEmail } from '../../_lib/email.js'

// `users.name` shares the 1–60 char band a player name uses in
// `functions/_lib/game-input.js` (§11.3, §11.14).
const NAME_MAX = 60

// §11.4.1 / BACKLOG #14 — the same per-address cap `request-link.js` applies,
// here measured against the NEW address so `PATCH /api/users` can't be used to
// flood an inbox. magic_tokens has no created_at, but every unused row's
// expires_at is issued-time + 15 min, so "used = 0 AND expires_at > now" counts
// unclaimed links from the last 15 minutes.
const MAX_FRESH_LINKS = 5
const TOKEN_TTL_MS = 15 * 60 * 1000

/**
 * PATCH /api/users — updates the current session's user (§11.14). No id in the
 * path; always acts on "me". Body `{ name?, email? }`, both optional.
 *
 * - neither field present → 200 no-op (mirrors PATCH /api/courses/[id])
 * - `name`  → trimmed; 1–60 chars sets it, empty string clears it to null,
 *             over 60 is a 400. Applied immediately.
 * - `email` → validated, then applied asynchronously via the re-verification
 *             flow (§11.4.1): pending_email is staged, a magic_tokens row is
 *             issued for the new address, and a confirmation email is sent to
 *             it. `users.email` does not change until the link is clicked.
 */
export async function onRequestPatch(context) {
  const { DB, RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL } = context.env

  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const hasName = 'name' in body
  const hasEmail = 'email' in body

  // A body with neither editable field is a no-op, same as PATCH courses.
  if (!hasName && !hasEmail) {
    return Response.json({ ok: true }, { status: 200 })
  }

  // ---- Validate everything before writing anything ----

  // `nameUpdate`: undefined = not supplied; null = clear to null; string = set.
  let nameUpdate
  if (hasName) {
    // null / '' both clear it; anything else must be a string.
    if (body.name != null && typeof body.name !== 'string') {
      return Response.json({ error: 'name must be text' }, { status: 400 })
    }
    const trimmed = (body.name ?? '').trim()
    if (trimmed.length > NAME_MAX) {
      return Response.json({ error: `name must be ${NAME_MAX} characters or fewer` }, { status: 400 })
    }
    nameUpdate = trimmed.length === 0 ? null : trimmed
  }

  let newEmail = null
  if (hasEmail) {
    if (body.email != null && typeof body.email !== 'string') {
      return Response.json({ error: 'Invalid email address' }, { status: 400 })
    }
    newEmail = (body.email ?? '').trim().toLowerCase()

    if (!isValidEmail(newEmail)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (newEmail === user.email) {
      return Response.json({ error: 'That is already your email address' }, { status: 400 })
    }

    // Reject if the address is another user's confirmed `email` OR already
    // staged as another user's `pending_email` — two accounts staging the same
    // pending address would make confirm-email.js's `WHERE pending_email = ?`
    // lookup ambiguous. Excludes the current user, so re-submitting the same
    // change (supersede) is still allowed.
    const takenByOther = await DB.prepare(
      'SELECT id FROM users WHERE (email = ? OR pending_email = ?) AND id != ?'
    ).bind(newEmail, newEmail, user.id).first()
    if (takenByOther) {
      return Response.json({ error: 'That email address is already in use' }, { status: 409 })
    }

    const { count: freshLinks } = await DB.prepare(
      'SELECT COUNT(*) AS count FROM magic_tokens WHERE email = ? AND used = 0 AND expires_at > ?'
    ).bind(newEmail, new Date().toISOString()).first()
    if (freshLinks >= MAX_FRESH_LINKS) {
      return Response.json(
        { error: 'Too many email-change requests. Check that inbox, or wait a few minutes and try again.' },
        { status: 429 }
      )
    }
  }

  // ---- Name-only path: apply immediately and return ----
  if (!hasEmail) {
    await DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(nameUpdate, user.id).run()
    return Response.json({ ok: true, name: nameUpdate }, { status: 200 })
  }

  // ---- Email change (§11.4.1) ----
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

  // Stage pending_email (and the name, if supplied — it is applied immediately
  // "regardless", §11.14) and issue the token, atomically. A prior outstanding
  // pending_email / link is overwritten; its confirmation link then goes dead
  // because step 5's pending_email match no longer succeeds (§11.4.1).
  const setCols = ['pending_email = ?']
  const setVals = [newEmail]
  if (nameUpdate !== undefined) {
    setCols.push('name = ?')
    setVals.push(nameUpdate)
  }

  await DB.batch([
    DB.prepare(`UPDATE users SET ${setCols.join(', ')} WHERE id = ?`).bind(...setVals, user.id),
    DB.prepare(
      'INSERT INTO magic_tokens (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)'
    ).bind(crypto.randomUUID(), newEmail, token, expiresAt),
  ])

  // Confirmation email to the NEW address. On failure: 500, `users.email`
  // untouched (it always is until the link is clicked), pending_email left set
  // (harmless — nothing acts on it until confirmed) so the user just retries.
  const confirmLink = `${APP_URL}/api/auth/confirm-email?token=${token}`
  const sent = await sendEmail({
    apiKey: RESEND_API_KEY,
    from: RESEND_FROM_EMAIL,
    to: newEmail,
    subject: 'Confirm your email for Scorecard by Outbuild',
    html: magicLinkEmailHtml({
      heading: 'Confirm your email',
      intro: 'Click the button below to confirm this email address for your Scorecard account. This link expires in 15 minutes.',
      ctaLabel: 'Confirm your email',
      link: confirmLink,
    }),
    text: `Confirm your email for Scorecard by Outbuild:\n${confirmLink}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
  })

  if (!sent.ok) {
    return Response.json(
      { error: 'Could not send the confirmation email - please try again' },
      { status: 500 }
    )
  }

  // §11.4.1 step 4 — best-effort security notice to the OLD address. No new
  // address disclosed (avoids leaking a mistyped address), no action link.
  // Never blocks or fails the request.
  context.waitUntil(
    sendEmail({
      apiKey: RESEND_API_KEY,
      from: RESEND_FROM_EMAIL,
      to: user.email,
      subject: 'Email change requested on your Scorecard account',
      html: securityNoticeHtml(),
      text: securityNoticeText(),
    }).catch(err => console.error('email-change security notice failed', err))
  )

  const res = { ok: true, email_confirmation_sent: true, pending_email: newEmail }
  if (nameUpdate !== undefined) res.name = nameUpdate
  return Response.json(res, { status: 200 })
}

/**
 * DELETE /api/users — deletes the current session's user and everything tied to
 * the account, in one atomic DB.batch (§11.14). Irreversible. The session
 * cookie is the only server-side authorisation; the typed-DELETE confirmation
 * is client-side friction only.
 */
export async function onRequestDelete(context) {
  const { DB, RESEND_API_KEY, RESEND_FROM_EMAIL, ADMIN_NOTIFY_EMAIL } = context.env

  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  // magic_tokens has no user_id — it is cleared by email. Grab pending_email so
  // an in-flight email-change token is cleaned up too.
  const row = await DB.prepare('SELECT pending_email FROM users WHERE id = ?').bind(user.id).first()
  const emails = [user.email]
  if (row?.pending_email) emails.push(row.pending_email)
  const emailPlaceholders = emails.map(() => '?').join(', ')

  // One atomic cascade. D1/SQLite doesn't enforce foreign keys, so every
  // dependent row is deleted explicitly, in dependency order, ending with the
  // users row itself (§11.14).
  await DB.batch([
    DB.prepare('DELETE FROM games WHERE user_id = ?').bind(user.id),
    DB.prepare('DELETE FROM courses WHERE user_id = ?').bind(user.id),
    DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    DB.prepare(`DELETE FROM magic_tokens WHERE email IN (${emailPlaceholders})`).bind(...emails),
    DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ])

  // Best-effort admin notification (§11.14). Failure is swallowed — a mail
  // failure never blocks or reverses the deletion. Body is a TIMESTAMP ONLY:
  // no email address, no user id, nothing identifying.
  const adminTo = ADMIN_NOTIFY_EMAIL ?? 'williamadamgriffiths@gmail.com'
  const deletedAt = new Date().toISOString()
  context.waitUntil(
    sendEmail({
      apiKey: RESEND_API_KEY,
      from: RESEND_FROM_EMAIL,
      to: adminTo,
      subject: 'Scorecard account deleted',
      html: `<p>A Scorecard account was deleted at ${deletedAt}.</p>`,
      text: `A Scorecard account was deleted at ${deletedAt}.`,
    }).catch(err => console.error('account-deletion admin notice failed', err))
  )

  // Clear the session cookie — identical header to POST /api/auth/logout.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  })
}

function securityNoticeText() {
  return [
    'A request was made to change the email address on your Scorecard by Outbuild account.',
    '',
    "If this was you, follow the link in the email we've just sent to your new address to confirm the change. Your current address stays active until you do.",
    '',
    "If this wasn't you, contact scorecard@outbuild.uk.",
    '',
    'Built by Outbuild.',
  ].join('\n')
}

function securityNoticeHtml() {
  return `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #F7F4EE; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #F5EFE3; border-radius: 8px; padding: 40px; border: 1px solid #D9D0C4;">
    <p style="font-family: Georgia, serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #6B6560; margin: 0 0 24px;">
      Scorecard <span style="color: #1A4329;">by Outbuild</span>
    </p>
    <h1 style="font-size: 24px; font-weight: normal; color: #1A1A18; margin: 0 0 16px;">Email change requested</h1>
    <p style="font-family: Arial, sans-serif; color: #6B6560; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      A request was made to change the email address on your Scorecard account. Your current address stays active until the new one is confirmed from its own inbox.
    </p>
    <p style="font-family: Arial, sans-serif; color: #6B6560; font-size: 14px; line-height: 1.6; margin: 0;">
      If this wasn't you, contact <a href="mailto:scorecard@outbuild.uk" style="color: #1A4329;">scorecard@outbuild.uk</a>.
    </p>
    <hr style="border: none; border-top: 1px solid #D9D0C4; margin: 32px 0 24px;">
    <p style="font-family: Arial, sans-serif; color: #6B6560; font-size: 12px; margin: 0;">Built by Outbuild.</p>
  </div>
</body>
</html>`
}
