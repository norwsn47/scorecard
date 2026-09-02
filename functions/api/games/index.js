import { getSessionUser } from '../../_lib/session.js'
import { validateHolePars } from '../../_lib/hole-pars.js'

export async function onRequestGet(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  // `hole_pars` is returned as the raw JSON TEXT (or null for a pre-003 round);
  // the client parses it, same as `player_data`.
  const { results } = await DB.prepare(
    `SELECT g.id, g.course_id, c.name AS course_name,
            g.played_at, g.holes_played, g.player_data, g.hole_pars, g.notes, g.created_at
     FROM games g
     LEFT JOIN courses c ON g.course_id = c.id
     WHERE g.user_id = ?
     ORDER BY g.played_at DESC
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

  const { course_id, played_at, holes_played, player_data, notes, client_round_id, hole_pars } = body

  if (!played_at || !holes_played || !player_data) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Par snapshot for the round (§5.1). Absent → NULL, read as par 3 per hole.
  let holeParsJson = null
  if (hole_pars != null) {
    const v = validateHolePars(hole_pars, holes_played)
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 })
    holeParsJson = v.json
  }

  // If a course is specified it must be one of this user's own courses —
  // otherwise a caller could attach an arbitrary (or another user's) course id,
  // which the History LEFT JOIN would then surface as a foreign course name.
  if (course_id) {
    const course = await DB.prepare(
      'SELECT id FROM courses WHERE id = ? AND user_id = ?'
    ).bind(course_id, user.id).first()
    if (!course) return Response.json({ error: 'Invalid course' }, { status: 400 })
  }

  // Idempotency: the client sends a stable per-round id (the local game's own
  // id) with every save attempt. If a row for this user + round already
  // exists — e.g. the user tapped "Done" a second time after navigating back
  // to an already-saved Summary screen — return the existing row instead of
  // inserting a duplicate.
  //
  // Requests with no client_round_id (an old cached frontend mid-deploy) skip
  // this check and just insert — a date+hole-count fallback match was tried
  // here previously, but it can false-positive on two different past rounds
  // backfilled for the same day with the same hole count, silently dropping
  // a real round. A rare duplicate during a deploy window is the safer
  // failure mode.
  if (client_round_id) {
    const existing = await DB.prepare(
      `SELECT id FROM games WHERE user_id = ? AND client_round_id = ? LIMIT 1`
    ).bind(user.id, client_round_id).first()
    if (existing) {
      return Response.json({ id: existing.id }, { status: 200 })
    }
  }

  const id = crypto.randomUUID()
  try {
    await DB.prepare(
      `INSERT INTO games (id, user_id, course_id, played_at, holes_played, player_data, hole_pars, notes, client_round_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      user.id,
      course_id || null,
      played_at,
      holes_played,
      typeof player_data === 'string' ? player_data : JSON.stringify(player_data),
      holeParsJson,
      notes || null,
      client_round_id || null,
      new Date().toISOString()
    ).run()
  } catch (err) {
    // Race: two near-simultaneous requests both passed the check above.
    // The UNIQUE(user_id, client_round_id) index rejects the second insert —
    // treat that as success and return the row the first request created.
    if (client_round_id && String(err?.message ?? '').toLowerCase().includes('unique')) {
      const existing = await DB.prepare(
        `SELECT id FROM games WHERE user_id = ? AND client_round_id = ? LIMIT 1`
      ).bind(user.id, client_round_id).first()
      if (existing) return Response.json({ id: existing.id }, { status: 200 })
    }
    throw err
  }

  return Response.json({ id }, { status: 201 })
}
