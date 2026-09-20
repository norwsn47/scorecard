import { defaultHoleParsJson } from '../../_lib/hole-pars.js';
import { buildSessionCookie } from '../../_lib/session.js';

export async function onRequestGet(context) {
  const { DB, APP_URL } = context.env;
  const url = new URL(context.request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.redirect(`${APP_URL}/?auth=error`, 302);
  }

  const now = new Date().toISOString();

  const row = await DB.prepare(
    'SELECT * FROM magic_tokens WHERE token = ? AND used = 0 AND expires_at > ?'
  ).bind(token, now).first();

  if (!row) {
    return Response.redirect(`${APP_URL}/?auth=expired`, 302);
  }

  // Atomic claim: the UPDATE is the gate, not the SELECT above. Two concurrent
  // clicks can both pass the SELECT, but only one UPDATE can flip used 0 -> 1;
  // the other reports changes = 0 and is treated exactly like an already-used
  // link. Fail closed: if the driver reports no change count, nothing is
  // created. expires_at is re-checked so a token that lapses between the two
  // statements is also refused.
  const claim = await DB.prepare(
    'UPDATE magic_tokens SET used = 1 WHERE id = ? AND used = 0 AND expires_at > ?'
  ).bind(row.id, now).run();

  if ((claim?.meta?.changes ?? 0) === 0) {
    return Response.redirect(`${APP_URL}/?auth=expired`, 302);
  }

  let user = await DB.prepare('SELECT * FROM users WHERE email = ?').bind(row.email).first();
  const isNewUser = !user;

  if (!user) {
    const userId = crypto.randomUUID();
    await DB.prepare(
      'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)'
    ).bind(userId, row.email, new Date().toISOString()).run();
    user = { id: userId, email: row.email };
  }

  if (isNewUser) {
    await DB.prepare(
      'INSERT INTO courses (id, user_id, name, holes, hole_pars, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      user.id,
      'Bruntsfield Short Hole Golf Course',
      36,
      defaultHoleParsJson(36),
      1,
      new Date().toISOString()
    ).run();
  }

  const sessionId = crypto.randomUUID();
  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await DB.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, user.id, new Date().toISOString(), sessionExpiry).run();

  // Opportunistic cleanup of dead sessions, mirroring the magic_tokens prune in
  // request-link.js. Every session is created with a 30-day expiry, so any row
  // whose expires_at has passed can never authenticate again (getSessionUser
  // and me.js already ignore it) - deleting it just keeps the table from
  // growing forever. Best-effort and off the critical path: runs after the
  // response via waitUntil and swallows failures, so it can never break sign-in.
  context.waitUntil(
    DB.prepare('DELETE FROM sessions WHERE expires_at < ?')
      .bind(new Date().toISOString())
      .run()
      .catch(err => console.error('sessions cleanup failed', err))
  );

  const cookie = buildSessionCookie(sessionId);

  return new Response(null, {
    status: 302,
    headers: {
      Location: APP_URL,
      'Set-Cookie': cookie,
    },
  });
}
