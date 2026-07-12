import { getSessionUser } from '../../_lib/session.js'

export async function onRequestGet(context) {
  const { DB } = context.env
  const user = await getSessionUser(context.request, DB)
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { results } = await DB.prepare(
    'SELECT id, name, holes, is_default FROM courses WHERE user_id = ? ORDER BY is_default DESC, name ASC'
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

  const id = crypto.randomUUID()
  await DB.prepare(
    'INSERT INTO courses (id, user_id, name, holes, is_default, created_at) VALUES (?, ?, ?, ?, 0, ?)'
  ).bind(id, user.id, name, 36, new Date().toISOString()).run()

  return Response.json({ course: { id, name, holes: 36, is_default: 0 } }, { status: 201 })
}
