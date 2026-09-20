// Shared email helpers for the magic-link machinery (§11.4, §11.4.1, §11.14).
//
// The Resend send call and the email-address format check are shared by
// `request-link.js` and the profile endpoints; both live here. On a Resend
// failure `sendEmail` logs only the HTTP status and, at most, the string `name`
// of Resend's error body (e.g. "validation_error"), truncated to 64 characters
// - never the response body, the API key, headers, recipient, subject or
// content. A network failure logs only the error's `name`.

// Email address format check. Stricter than the old "anything@anything.tld"
// regex, but still permissive: Resend is the real check on deliverability.
//
//   - total length 1..254 and local part 1..64 characters (RFC 5321 limits)
//   - exactly one "@"
//   - local part: dot-atom - letters, digits, marks and the RFC 5322 atom
//     specials !#$%&'*+/=?^_`{|}~- , with dots only BETWEEN atoms (no leading,
//     trailing or consecutive dots). \p{L}\p{N}\p{M} admit non-ASCII letters
//     so internationalised addresses are not rejected.
//   - domain: at least two dot-separated labels; each label is 1..63 letters,
//     digits or marks, with hyphens only between them (no leading or trailing
//     hyphen).
//
// Whitespace, commas, semicolons, angle brackets, quotes, parentheses, colons
// and a second "@" are outside every character class, so they are rejected.
// Quoted local parts ("a b"@x.com) and IP-literal domains are rejected too.
const ATOM = "[\\p{L}\\p{N}\\p{M}!#$%&'*+/=?^_`{|}~-]"
const LABEL = '(?![^.]{64})[\\p{L}\\p{N}\\p{M}]+(?:-+[\\p{L}\\p{N}\\p{M}]+)*'
export const EMAIL_RE = new RegExp(
  `^(?=.{1,254}$)(?=[^@]{1,64}@)${ATOM}+(?:\\.${ATOM}+)*@${LABEL}(?:\\.${LABEL})+$`,
  'u'
)

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
    // Only the error's name (e.g. "TypeError"): String(err) can carry the
    // request URL or other detail.
    console.error('Resend error', 'network', safeLogText(err?.name))
    return { ok: false, status: 0 }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const errName = safeLogText(body?.name)
    if (errName) {
      console.error('Resend error', res.status, errName)
    } else {
      console.error('Resend error', res.status)
    }
    return { ok: false, status: res.status }
  }

  return { ok: true, status: res.status }
}

const LOG_TEXT_MAX = 64

// A value that is safe to log: only a string, truncated. Anything else (an
// object, a number, undefined) becomes '' so nothing unexpected is ever logged.
function safeLogText(value) {
  return typeof value === 'string' ? value.slice(0, LOG_TEXT_MAX) : ''
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
