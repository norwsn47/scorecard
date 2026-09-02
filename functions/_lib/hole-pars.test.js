import { describe, it, expect } from 'vitest'
import { DEFAULT_PAR, defaultHoleParsJson, validateHolePars } from './hole-pars.js'

describe('defaultHoleParsJson', () => {
  it('builds a JSON array of the default par at the given length', () => {
    expect(defaultHoleParsJson(36)).toBe(JSON.stringify(Array(36).fill(DEFAULT_PAR)))
    expect(JSON.parse(defaultHoleParsJson(9))).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3])
  })
})

describe('validateHolePars', () => {
  it('accepts an array of the expected length with in-band integers', () => {
    const r = validateHolePars([3, 3, 4, 5, 2], 5)
    expect(r.ok).toBe(true)
    expect(r.json).toBe('[3,3,4,5,2]')
  })

  it('accepts a JSON string of an array', () => {
    const r = validateHolePars('[3,3,3]', 3)
    expect(r.ok).toBe(true)
    expect(r.json).toBe('[3,3,3]')
  })

  it('rejects invalid JSON', () => {
    expect(validateHolePars('[3,3', 2).ok).toBe(false)
  })

  it('rejects a non-array', () => {
    expect(validateHolePars({ 0: 3 }, 1).ok).toBe(false)
    expect(validateHolePars(3, 1).ok).toBe(false)
  })

  it('rejects the wrong length', () => {
    expect(validateHolePars([3, 3, 3], 5).ok).toBe(false)
  })

  it('rejects a non-integer entry', () => {
    expect(validateHolePars([3, 3.5, 3], 3).ok).toBe(false)
  })

  it('rejects an out-of-band entry', () => {
    expect(validateHolePars([3, 1, 3], 3).ok).toBe(false)
    expect(validateHolePars([3, 8, 3], 3).ok).toBe(false)
  })

  it('rejects a non-integer expectedLength', () => {
    expect(validateHolePars([3, 3], 2.5).ok).toBe(false)
  })
})
