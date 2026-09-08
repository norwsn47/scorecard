// Shared email helpers for the magic-link machinery (§11.4, §11.4.1, §11.14).
//
// The Resend send call and the email-address format regex were duplicated
// across `request-link.js` and the new profile endpoints; both live here now.
// `request-link.js`'s observable behaviour is unchanged — same single POST to
// Resend, same "Resend error <status> <body>" log line on failure, same 500.

// Same regex the sign-in flow has always used: one "@", at least one "." in the
// domain, no whitespace. Deliberately permissive — Resend is the real check.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value)
}

/**
 * Send one transactional email via Resend.
 *
 * Returns `{ ok, status }` — never throws. A non-2xx response or a network
 * error both come back as `{ ok: false }` with the failure logged here, so
 * callers only decide which status code that maps to (500 for the sign-in and
 * confirmation mails; swallowed for the best-effort notices).
 */
export async function sendEmail({ apiKey, from, to, subject, html, text }) {
  let res
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    })
  } catch (err) {
    console.error('Resend error', 'network', String(err))
    return { ok: false, status: 0 }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('Resend error', res.status, JSON.stringify(body))
    return { ok: false, status: res.status }
  }

  return { ok: true, status: res.status }
}

/**
 * The branded magic-link email body — a wordmark, a heading, a one-line intro,
 * a single CTA button, and the plain-text fallback URL. Shared by the sign-in
 * email (§11.4) and the email-change confirmation (§11.4.1); the heading, intro
 * and CTA label are the only things that differ between them.
 */
export function magicLinkEmailHtml({ heading, intro, ctaLabel, link }) {
  return `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #F7F4EE; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #F5EFE3; border-radius: 8px; padding: 40px; border: 1px solid #D9D0C4;">
    <p style="font-family: Georgia, serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #6B6560; margin: 0 0 24px;">
      Scorecard <span style="color: #1A4329;">by Outbuild</span>
    </p>
    <h1 style="font-size: 24px; font-weight: normal; color: #1A1A18; margin: 0 0 16px;">${heading}</h1>
    <p style="font-family: Arial, sans-serif; color: #6B6560; font-size: 14px; line-height: 1.6; margin: 0 0 32px;">
      ${intro}
    </p>
    <a href="${link}"
       style="display: inline-block; background: #1A4329; color: #F7F4EE; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;">
      ${ctaLabel}
    </a>
    <p style="font-family: Arial, sans-serif; color: #6B6560; font-size: 12px; margin: 32px 0 0; line-height: 1.6;">
      Or copy this link into your browser:<br>
      <span style="color: #1A1A18; word-break: break-all;">${link}</span>
    </p>
    <hr style="border: none; border-top: 1px solid #D9D0C4; margin: 32px 0 24px;">
    <p style="font-family: Arial, sans-serif; color: #6B6560; font-size: 12px; margin: 0;">
      Built by Outbuild. If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`
}
