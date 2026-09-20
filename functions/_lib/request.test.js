import { describe, it, expect } from 'vitest'
import { readJsonObject } from './request.js'

function req(rawBody) {
  return new Request('https://app.test/api/x', { method: 'POST', body: rawBody })
}

describe('readJsonObject', () => {
  it('returns { ok: true, body } for a JSON object', async () => {
    const out = await readJsonObject(req(JSON.stringify({ a: 1, b: 'two' })))
    expect(out).toEqual({ ok: true, body: { a: 1, b: 'two' } })
  })

  it('accepts an empty object', async () => {
    expect(await readJsonObject(req('{}'))).toEqual({ ok: true, body: {} })
  })

  it.each([
    ['null', 'null'],
    ['an array', '[]'],
    ['a non-empty array', '[{"a":1}]'],
    ['a string', '"str"'],
    ['a number', '42'],
    ['zero', '0'],
    ['true', 'true'],
    ['false', 'false'],
    ['unparseable text', 'not json'],
    ['a truncated object', '{"a":'],
    ['an empty body', ''],
  ])('rejects %s with a clean 400 { error: "Invalid request body" }', async (_label, raw) => {
    const out = await readJsonObject(req(raw))
    expect(out.ok).toBe(false)
    expect(out.response.status).toBe(400)
    expect(await out.response.json()).toEqual({ error: 'Invalid request body' })
  })

  it('never throws, even with no body at all', async () => {
    const out = await readJsonObject(new Request('https://app.test/api/x', { method: 'POST' }))
    expect(out.ok).toBe(false)
    expect(out.response.status).toBe(400)
  })
})
