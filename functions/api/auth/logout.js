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
      'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
}

function getSessionCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  return cookie.match(/(?:^|;\s*)session=([^;]+)/)?.[1] ?? null;
}
