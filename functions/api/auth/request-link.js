import { isValidEmail } from '../../_lib/email.js';
import { readJsonObject } from '../../_lib/request.js';
import { isOverLinkLimit, prepareTokenInsert, sendMagicLinkEmail } from '../../_lib/magic-link.js';

export async function onRequestPost(context) {
  const { DB, RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL } = context.env;

  const parsed = await readJsonObject(context.request);
  if (!parsed.ok) return parsed.response;
  const { body } = parsed;

  // A non-string email (e.g. 123) is a 400, not a TypeError on .trim().
  if (body.email != null && typeof body.email !== 'string') {
    return Response.json({ error: 'Invalid email address' }, { status: 400 });
  }
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const now = Date.now();

  // #14 - per-email throttle (see functions/_lib/magic-link.js): cap the
  // unclaimed links per address so a target inbox can't be flooded with
  // sign-in emails.
  if (await isOverLinkLimit(DB, email, now)) {
    return Response.json(
      { error: 'Too many sign-in requests. Check your inbox, or wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const { token, statement } = prepareTokenInsert(DB, email, now);
  await statement.run();

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

  const sent = await sendMagicLinkEmail({
    env: { RESEND_API_KEY, RESEND_FROM_EMAIL },
    to: email,
    subject: 'Sign in to Scorecard by Outbuild',
    heading: 'Sign in to your account',
    intro: 'Click the button below to sign in. This link expires in 15 minutes.',
    ctaLabel: 'Sign in to Scorecard',
    textLead: 'Sign in to Scorecard by Outbuild:',
    link: magicLink,
  });

  if (!sent.ok) {
    return Response.json({ error: 'Failed to send email - please try again' }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
