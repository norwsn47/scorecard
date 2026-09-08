import { getSessionUser } from '../../_lib/session.js'
import { validateHolePars } from '../../_lib/hole-pars.js'

export async function onRequestPatch(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = context.params

  // Ownership check first — a user must never be able to PATCH another
  // user's course id, and we don't reveal whether an id exists via a
  // different error. Every course row has a real user_id owner (the seeded
  // Bruntsfield copy each user gets on first sign-in included — see
  // auth/verify.js), so a course owned by someone else reads as "not found".
  const course = await DB.prepare('SELECT id, holes FROM courses WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!course) return Response.json({ error: 'Not found' }, { status: 404 })

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Hole count is fixed for the life of the course (§11.7) — reject any
  // attempt to change it, rather than silently ignoring it.
  if ('holes' in body) {
    return Response.json({ error: 'Hole count cannot be changed' }, { status: 400 })
  }

  const { name, hole_pars } = body

  // Build the UPDATE from only the fields actually present in the body.
  // id, user_id, is_default and created_at are never touched.
  const columns = []
  const values = []

  if ('name' in body) {
    const trimmed = (name || '').trim()
    if (!trimmed) return Response.json({ error: 'Course name is required' }, { status: 400 })
    if (trimmed.length > 60) return Response.json({ error: 'Course name must be 60 characters or fewer' }, { status: 400 })
    columns.push('name = ?')
    values.push(trimmed)
  }
  if ('hole_pars' in body) {
    // Length is checked against the course's existing holes, never the
    // request body's — a holes field in the body is already rejected above.
    const v = validateHolePars(hole_pars, course.holes)
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 })
    columns.push('hole_pars = ?')
    values.push(v.json)
  }

  if (columns.length === 0) {
    return Response.json({ ok: true, id })
  }

  await DB.prepare(
    `UPDATE courses SET ${columns.join(', ')} WHERE id = ? AND user_id = ?`
  ).bind(...values, id, user.id).run()

  return Response.json({ ok: true, id })
}

export async function onRequestDelete(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = context.params

  // Ownership check first — a course owned by another user reads as "not
  // found" rather than revealing that the id exists.
  const course = await DB.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!course) return Response.json({ error: 'Not found' }, { status: 404 })

  const { count } = await DB.prepare(
    'SELECT COUNT(*) AS count FROM games WHERE course_id = ? AND user_id = ?'
  ).bind(id, user.id).first()

  // Cascade delete: D1/SQLite doesn't enforce foreign keys, and there is no
  // ON DELETE CASCADE on games.course_id, so every round recorded on this
  // course is deleted explicitly here, atomically with the course itself
  // (§11.3, §11.7). Both statements are scoped by user_id too, as defense in
  // depth alongside the ownership check above.
  await DB.batch([
    DB.prepare('DELETE FROM games WHERE course_id = ? AND user_id = ?').bind(id, user.id),
    DB.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').bind(id, user.id),
  ])

  return Response.json({ ok: true, deleted_rounds: count })
}
