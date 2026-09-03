import { getSessionUser } from '../../_lib/session.js'
import { defaultHoleParsJson, validateHolePars } from '../../_lib/hole-pars.js'

// User-created courses are 9 or 18 holes only (§11.7). 36 is reserved for
// quick-play Bruntsfield and the seeded default course, which are not created
// through this endpoint.
const ALLOWED_HOLE_COUNTS = [9, 18]

export async function onRequestGet(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  // `hole_pars` is returned as the raw JSON TEXT (or null for a pre-003
  // course); the client parses it, same as `games.player_data`.
  const { results } = await DB.prepare(
    'SELECT id, name, holes, hole_pars, is_default FROM courses WHERE user_id = ? ORDER BY is_default DESC, name ASC'
  ).bind(user.id).all()

  return Response.json({ courses: results })
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

  const name = (body.name || '').trim()
  if (!name) return Response.json({ error: 'Course name is required' }, { status: 400 })
  if (name.length > 60) return Response.json({ error: 'Course name must be 60 characters or fewer' }, { status: 400 })

  // Hole count: must be exactly 9 or 18 (§11.7). A strict identity check also
  // rejects strings ("9"), floats (9.5), null and a missing field.
  const holes = body.holes
  if (!ALLOWED_HOLE_COUNTS.includes(holes)) {
    return Response.json({ error: 'Course must have exactly 9 or 18 holes' }, { status: 400 })
  }

  // Par: a new course always stores an explicit array matching its hole count.
  // Absent from the request → all 3s (§11.7). Only pre-003 rows ever have NULL.
  let holeParsJson = defaultHoleParsJson(holes)
  if (body.hole_pars != null) {
    const v = validateHolePars(body.hole_pars, holes)
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 })
    holeParsJson = v.json
  }

  const id = crypto.randomUUID()
  await DB.prepare(
    'INSERT INTO courses (id, user_id, name, holes, hole_pars, is_default, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
  ).bind(id, user.id, name, holes, holeParsJson, new Date().toISOString()).run()

  return Response.json(
    { course: { id, name, holes, hole_pars: holeParsJson, is_default: 0 } },
    { status: 201 }
  )
}
