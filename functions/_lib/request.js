// Shared request-body parsing for the JSON endpoints.
//
// `request.json()` throws on unparseable input and happily returns `null`, an
// array, or a bare primitive for valid-but-wrong JSON. Handlers that then read
// `body.field` would throw a TypeError on `null` (an unhandled 500) or quietly
// treat an array/number as an empty object. This helper turns all of those into
// the one clean 400 the endpoints already used for unparseable JSON.

/**
 * Reads the request body as a JSON object.
 *
 * Returns `{ ok: true, body }` for a plain object, or `{ ok: false, response }`
 * where `response` is a ready-to-return `400 { error: 'Invalid request body' }`.
 * Never throws. Rejected: unparseable/empty body, `null`, arrays, and
 * non-object primitives (strings, numbers, booleans).
 */
export async function readJsonObject(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return { ok: false, response: invalidBody() }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, response: invalidBody() }
  }
  return { ok: true, body }
}

function invalidBody() {
  return Response.json({ error: 'Invalid request body' }, { status: 400 })
}
