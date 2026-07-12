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

  await DB.prepare('UPDATE magic_tokens SET used = 1 WHERE id = ?').bind(row.id).run();

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
      'INSERT INTO courses (id, user_id, name, holes, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), user.id, 'Bruntsfield Links', 36, 1, new Date().toISOString()).run();
  }

  const sessionId = crypto.randomUUID();
  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await DB.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, user.id, new Date().toISOString(), sessionExpiry).run();

  const cookie = `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000; Path=/`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: APP_URL,
      'Set-Cookie': cookie,
    },
  });
}
