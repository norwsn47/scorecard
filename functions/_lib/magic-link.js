// Shared magic-link machinery for the two endpoints that email a one-time link:
// sign-in (`POST /api/auth/request-link`, §11.4) and email-change confirmation
// (`PATCH /api/users`, §11.4.1). Both used to carry their own copy of the
// per-address throttle, the token generation + INSERT, and the send wrapper.
//
// What differs between the two (429 message, subject, heading, intro, CTA
// label, link path, plain-text lead-in) stays at the call sites and is passed
// in; everything else lives here so the two can never drift apart.

import { sendEmail, magicLinkEmailHtml } from './email.js'

// BACKLOG #14 - per-address cap on unclaimed links. magic_tokens has no
// created_at column, but every unused row's expires_at is exactly
// issued-time + TOKEN_TTL_MS, so "used = 0 AND expires_at > now" means "an
// unclaimed link issued in the last 15 minutes". Used tokens are excluded so
// signing in on several devices, or resending then clicking, doesn't count.
export const MAX_FRESH_LINKS = 5
export const TOKEN_TTL_MS = 15 * 60 * 1000

/**
 * True when `email` already has MAX_FRESH_LINKS or more unclaimed, unexpired
 * links, i.e. another one must be refused (the caller returns its own 429).
 * `nowMs` is the current time in ms.
 */
export async function isOverLinkLimit(DB, email, nowMs) {
  const { count } = await DB.prepare(
    'SELECT COUNT(*) AS count FROM magic_tokens WHERE email = ? AND used = 0 AND expires_at > ?'
  ).bind(email, new Date(nowMs).toISOString()).first()
  return count >= MAX_FRESH_LINKS
}

/**
 * Generates a fresh token and prepares (does NOT run) the INSERT for it, so a
 * caller can `.run()` it directly or put it in a `DB.batch` alongside other
 * writes. Returns `{ token, statement }`.
 */
export function prepareTokenInsert(DB, email, nowMs) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(nowMs + TOKEN_TTL_MS).toISOString()
  const statement = DB.prepare(
    'INSERT INTO magic_tokens (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)'
  ).bind(crypto.randomUUID(), email, token, expiresAt)
  return { token, statement }
}

/**
 * Sends the magic-link email via Resend. Returns `{ ok, status }` (never
 * throws), exactly like `sendEmail`.
 *
 * `env` supplies `{ RESEND_API_KEY, RESEND_FROM_EMAIL }`. `textLead` is the
 * first line of the plain-text body (e.g. "Sign in to Scorecard by Outbuild:").
 */
export function sendMagicLinkEmail({ env, to, subject, heading, intro, ctaLabel, textLead, link }) {
  return sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html: magicLinkEmailHtml({ heading, intro, ctaLabel, link }),
    text: `${textLead}\n${link}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
  })
}
