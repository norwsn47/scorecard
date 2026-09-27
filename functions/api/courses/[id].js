import { getSessionUser } from '../../_lib/session.js'
import { validateHolePars } from '../../_lib/hole-pars.js'
import { readJsonObject } from '../../_lib/request.js'

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

  const parsed = await readJsonObject(context.request)
  if (!parsed.ok) return parsed.response
  const { body } = parsed

  // Hole count is fixed for the life of the course — reject any
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
    // A non-string name (e.g. 123) is a 400, not a TypeError on .trim().
    if (name != null && typeof name !== 'string') {
      return Response.json({ error: 'Course name is required' }, { status: 400 })
    }
    const trimmed = (name || '').trim()
    if (!trimmed) return Response.json({ error: 'Course name is required' }, { status: 400 })
    if (trimmed.length > 60) return Response.json({ error: 'Course name must be 60 characters or fewer' }, { status: 400 })
    columns.push('name = ?')
    values.push(trimmed)
  }
  // Set only when `hole_pars` is actually part of this PATCH — the games
  // cascade must never run as a no-op alongside an unrelated field (e.g. a
  // name-only edit).
  let cascadeHoleParsJson = null

  if ('hole_pars' in body) {
    // Length is checked against the course's existing holes, never the
    // request body's — a holes field in the body is already rejected above.
    const v = validateHolePars(hole_pars, course.holes)
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 })
    columns.push('hole_pars = ?')
    values.push(v.json)
    cascadeHoleParsJson = v.json
  }

  if (columns.length === 0) {
    return Response.json({ ok: true, id })
  }

  const updateCourse = DB.prepare(
    `UPDATE courses SET ${columns.join(', ')} WHERE id = ? AND user_id = ?`
  ).bind(...values, id, user.id)

  if (cascadeHoleParsJson !== null) {
    // Retroactive cascade (BACKLOG #123): a course-par edit now rewrites the
    // hole_pars of every past round recorded on this course, EXCEPT one whose
    // par was individually corrected via the per-round "Par for this round"
    // control (hole_pars_manually_set = 1) — a course-level edit must never
    // overwrite a round the user explicitly fixed.
    //
    // Deliberately uncapped and not length-matched against each round's own
    // holes_played: the read path (deriveHolePars) already only reads as many
    // entries as a round actually played, so writing the full course-length
    // array to every matching row is safe even for a shorter round. This also
    // means a pre-003 row with hole_pars = NULL gets backfilled to an
    // explicit array as a side effect, which is intended, not excluded.
    //
    // Runs atomically with the course's own row update via DB.batch, the same
    // pattern onRequestDelete below uses for its cascade delete.
    await DB.batch([
      updateCourse,
      DB.prepare(
        'UPDATE games SET hole_pars = ? WHERE course_id = ? AND user_id = ? AND hole_pars_manually_set = 0'
      ).bind(cascadeHoleParsJson, id, user.id),
    ])
  } else {
    await updateCourse.run()
  }

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
  // course is deleted explicitly here, atomically with the course itself.
  // Both statements are scoped by user_id too, as defense in
  // depth alongside the ownership check above.
  await DB.batch([
    DB.prepare('DELETE FROM games WHERE course_id = ? AND user_id = ?').bind(id, user.id),
    DB.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').bind(id, user.id),
  ])

  return Response.json({ ok: true, deleted_rounds: count })
}
