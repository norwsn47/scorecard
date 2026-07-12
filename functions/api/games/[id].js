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
