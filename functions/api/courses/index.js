export async function onRequestGet(context) {
  return Response.json({ ok: true, message: 'stub' }, { status: 200 });
}

export async function onRequestPost(context) {
  return Response.json({ ok: true, message: 'stub' }, { status: 200 });
}
