import { getSessionCookie, CLEAR_SESSION_COOKIE } from '../../_lib/session.js';

export async function onRequestPost(context) {
  const { DB } = context.env;

  const sessionId = getSessionCookie(context.request);
  if (sessionId) {
    await DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': CLEAR_SESSION_COOKIE,
    },
  });
}
