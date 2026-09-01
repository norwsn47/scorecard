import { getSessionUser } from '../../_lib/session.js'

export async function onRequestDelete(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = context.params
  const game = await DB.prepare('SELECT id FROM games WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!game) return Response.json({ error: 'Not found' }, { status: 404 })

  await DB.prepare('DELETE FROM games WHERE id = ?').bind(id).run()
  return Response.json({ ok: true })
}

export async function onRequestPatch(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = context.params

  // Ownership check first — a user must never be able to PATCH another user's
  // game id, and we don't reveal whether an id exists via a different error.
  const game = await DB.prepare('SELECT id FROM games WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!game) return Response.json({ error: 'Not found' }, { status: 404 })

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { course_id, played_at, holes_played, player_data, notes } = body

  // Build the UPDATE from only the fields actually present in the body.
  // id, user_id, client_round_id and created_at are never touched.
  // game_name is not editable - the UI has no game-naming feature.
  const columns = []
  const values = []

  if ('course_id' in body) {
    // A non-null course must be one of this user's own courses — otherwise a
    // caller could attach an arbitrary (or another user's) course id, which the
    // History LEFT JOIN would then surface as a foreign course name.
    if (course_id) {
      const course = await DB.prepare(
        'SELECT id FROM courses WHERE id = ? AND user_id = ?'
      ).bind(course_id, user.id).first()
      if (!course) return Response.json({ error: 'Invalid course' }, { status: 400 })
    }
    columns.push('course_id = ?')
    values.push(course_id || null)
  }
  if ('played_at' in body) {
    if (!played_at) return Response.json({ error: 'Invalid played_at' }, { status: 400 })
    columns.push('played_at = ?')
    values.push(played_at)
  }
  if ('holes_played' in body) {
    if (!Number.isInteger(holes_played) || holes_played < 1 || holes_played > 36) {
      return Response.json({ error: 'Invalid holes_played' }, { status: 400 })
    }
    columns.push('holes_played = ?')
    values.push(holes_played)
  }
  if ('player_data' in body) {
    let parsed
    try {
      parsed = typeof player_data === 'string' ? JSON.parse(player_data) : player_data
    } catch {
      return Response.json({ error: 'Invalid player_data' }, { status: 400 })
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return Response.json({ error: 'Invalid player_data' }, { status: 400 })
    }
    // Store exactly as onRequestPost does: a string is stored verbatim,
    // an array is JSON-stringified.
    columns.push('player_data = ?')
    values.push(typeof player_data === 'string' ? player_data : JSON.stringify(player_data))
  }
  if ('notes' in body) {
    if (notes != null && String(notes).length > 300) {
      return Response.json({ error: 'Notes too long' }, { status: 400 })
    }
    columns.push('notes = ?')
    values.push(notes || null)
  }

  if (columns.length === 0) {
    return Response.json({ ok: true, id })
  }

  await DB.prepare(
    `UPDATE games SET ${columns.join(', ')} WHERE id = ? AND user_id = ?`
  ).bind(...values, id, user.id).run()

  return Response.json({ ok: true, id })
}
