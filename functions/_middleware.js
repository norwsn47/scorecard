export async function onRequest(context) {
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/json');
  return new Response(response.body, { status: response.status, headers });
}
