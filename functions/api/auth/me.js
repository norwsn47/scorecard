export async function onRequestGet(context) {
  const { DB } = context.env;

  const sessionId = getSessionCookie(context.request);
  if (!sessionId) {
    return Response.json({ user: null }, { status: 401 });
  }

  const now = new Date().toISOString();
  const session = await DB.prepare(
    `SELECT sessions.user_id, users.email
     FROM sessions
     JOIN users ON sessions.user_id = users.id
     WHERE sessions.id = ? AND sessions.expires_at > ?`
  ).bind(sessionId, now).first();

  if (!session) {
    return Response.json({ user: null }, { status: 401 });
  }

  return Response.json({ user: { id: session.user_id, email: session.email } }, { status: 200 });
}

function getSessionCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  return cookie.match(/(?:^|;\s*)session=([^;]+)/)?.[1] ?? null;
}
