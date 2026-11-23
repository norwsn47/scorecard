import { describe, expect, it } from 'vitest'
import { strokesLabel, tiedNames } from './result.js'

describe('tiedNames', () => {
  it('returns an empty string for no names', () => {
    expect(tiedNames([])).toBe('')
  })

  it('returns the single name unchanged', () => {
    expect(tiedNames(['Alice'])).toBe('Alice')
  })

  it('joins two names with an ampersand', () => {
    expect(tiedNames(['Alice', 'Bob'])).toBe('Alice & Bob')
  })

  it('joins three names with commas and a trailing ampersand', () => {
    expect(tiedNames(['Alice', 'Bob', 'Carol'])).toBe('Alice, Bob & Carol')
  })

  it('joins four names the same way', () => {
    expect(tiedNames(['Alice', 'Bob', 'Carol', 'Dave'])).toBe('Alice, Bob, Carol & Dave')
  })
})

describe('strokesLabel', () => {
  it('is singular for exactly one stroke and plural otherwise', () => {
    expect(strokesLabel(1)).toBe('1 stroke')
    expect(strokesLabel(0)).toBe('0 strokes')
    expect(strokesLabel(2)).toBe('2 strokes')
    expect(strokesLabel(42)).toBe('42 strokes')
  })
})
