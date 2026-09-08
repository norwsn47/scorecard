import { sendEmail, magicLinkEmailHtml, isValidEmail } from '../../_lib/email.js';

export async function onRequestPost(context) {
  const { DB, RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL } = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const now = Date.now();

  // #14 — per-email throttle. magic_tokens has no created_at column, but every
  // unused row's expires_at is exactly issued-time + 15 min, so "used = 0 AND
  // expires_at > now" means "an unclaimed link issued in the last 15 minutes".
  // Cap those per address so a target inbox can't be flooded with sign-in
  // emails. Used tokens are excluded so signing in on several devices, or
  // resending then clicking, doesn't count against the cap.
  const MAX_FRESH_LINKS = 5;
  const { count: freshLinks } = await DB.prepare(
    'SELECT COUNT(*) AS count FROM magic_tokens WHERE email = ? AND used = 0 AND expires_at > ?'
  ).bind(email, new Date(now).toISOString()).first();
  if (freshLinks >= MAX_FRESH_LINKS) {
    return Response.json(
      { error: 'Too many sign-in requests. Check your inbox, or wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(now + 15 * 60 * 1000).toISOString();

  await DB.prepare(
    'INSERT INTO magic_tokens (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)'
  ).bind(crypto.randomUUID(), email, token, expiresAt).run();

  // #15 — opportunistic cleanup. Every magic token is single-use and expires
  // 15 minutes after it is issued, so anything whose expiry is more than 24h
  // in the past is long dead. This keeps abandoned sign-in attempts from
  // retaining email addresses in the table indefinitely (GDPR data-
  // minimisation, §11.12). Best-effort and off the critical path: run after
  // the response via waitUntil, and swallow failures — a prune that fails
  // (lock contention, a large first-run backlog) must never break sign-in.
  const staleCutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  context.waitUntil(
    DB.prepare('DELETE FROM magic_tokens WHERE expires_at < ?')
      .bind(staleCutoff)
      .run()
      .catch(err => console.error('magic_tokens cleanup failed', err))
  );

  const magicLink = `${APP_URL}/api/auth/verify?token=${token}`;

  const sent = await sendEmail({
    apiKey: RESEND_API_KEY,
    from: RESEND_FROM_EMAIL,
    to: email,
    subject: 'Sign in to Scorecard by Outbuild',
    html: magicLinkEmailHtml({
      heading: 'Sign in to your account',
      intro: 'Click the button below to sign in. This link expires in 15 minutes.',
      ctaLabel: 'Sign in to Scorecard',
      link: magicLink,
    }),
    text: `Sign in to Scorecard by Outbuild:\n${magicLink}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
  });

  if (!sent.ok) {
    return Response.json({ error: 'Failed to send email - please try again' }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
