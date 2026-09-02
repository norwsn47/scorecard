import { describe, expect, it } from 'vitest'
import { historyResultLabel, tiedNames } from './result.js'

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

describe('historyResultLabel', () => {
  it('returns null for a solo round', () => {
    expect(historyResultLabel({ players: ['Alice'], winners: [], winningTotal: null })).toBeNull()
  })

  it('returns "No winner" when nobody finished', () => {
    expect(historyResultLabel({
      players: ['Alice', 'Bob'], winners: [], isDraw: false, winningTotal: null,
    })).toBe('No winner')
  })

  it('names the outright winner with the total', () => {
    expect(historyResultLabel({
      players: ['Alice', 'Bob'], winners: ['Alice'], isDraw: false, winningTotal: 42,
    })).toBe('Winner: Alice - 42 strokes')
  })

  it('spells out a two-way tie', () => {
    expect(historyResultLabel({
      players: ['Alice', 'Bob'], winners: ['Alice', 'Bob'], isDraw: true, winningTotal: 40,
    })).toBe('Tied: Alice & Bob - 40 strokes')
  })

  it('spells out a three-way tie', () => {
    expect(historyResultLabel({
      players: ['Alice', 'Bob', 'Carol'], winners: ['Alice', 'Bob', 'Carol'], isDraw: true, winningTotal: 40,
    })).toBe('Tied: Alice, Bob & Carol - 40 strokes')
  })

  it('falls back to a count for four or more level', () => {
    expect(historyResultLabel({
      players: ['A', 'B', 'C', 'D'], winners: ['A', 'B', 'C', 'D'], isDraw: true, winningTotal: 36,
    })).toBe('Tied: 4 players level on 36 strokes')
  })

  it('tolerates a missing/empty argument', () => {
    expect(historyResultLabel()).toBeNull()
  })
})
