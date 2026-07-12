import { getSessionUser } from '../../_lib/session.js'

export async function onRequestGet(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { results } = await DB.prepare(
    `SELECT id, game_name, course_id, played_at, holes_played, player_data, notes, created_at
     FROM games
     WHERE user_id = ?
     ORDER BY played_at DESC
     LIMIT 100`
  ).bind(user.id).all()

  return Response.json({ games: results })
}

export async function onRequestPost(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { game_name, course_id, played_at, holes_played, player_data, notes } = body

  if (!played_at || !holes_played || !player_data) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  await DB.prepare(
    `INSERT INTO games (id, user_id, course_id, game_name, played_at, holes_played, player_data, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    user.id,
    course_id || null,
    game_name || null,
    played_at,
    holes_played,
    typeof player_data === 'string' ? player_data : JSON.stringify(player_data),
    notes || null,
    new Date().toISOString()
  ).run()

  return Response.json({ id }, { status: 201 })
}
