import { describe, expect, it } from 'vitest'
import {
  BRUNTSFIELD_HOLE_COUNT,
  BRUNTSFIELD_HOLE_PARS,
  MAX_HOLES,
  MAX_STROKES,
  PAR_MAX,
  PAR_MIN,
} from './constants.js'
import { PAR_MAX as API_PAR_MAX, PAR_MIN as API_PAR_MIN } from '../functions/_lib/hole-pars.js'
import { deriveHolePars } from './utils/scores.js'
import { stepPar } from './components/ParStepperGrid.jsx'
import { createGame } from './utils/game.js'

describe('shared constants', () => {
  it('holds the agreed values', () => {
    expect(MAX_HOLES).toBe(36)
    expect(BRUNTSFIELD_HOLE_COUNT).toBe(36)
    expect(BRUNTSFIELD_HOLE_PARS).toEqual(Array(36).fill(3))
    expect(PAR_MIN).toBe(2)
    expect(PAR_MAX).toBe(7)
    expect(MAX_STROKES).toBe(14)
  })

  it('keeps the par band in step with the backend validator', () => {
    expect(PAR_MIN).toBe(API_PAR_MIN)
    expect(PAR_MAX).toBe(API_PAR_MAX)
  })

  it('drives every place that uses the par band', () => {
    // deriveHolePars accepts the edges and rejects one step outside them.
    expect(deriveHolePars([PAR_MIN, PAR_MAX, PAR_MIN - 1, PAR_MAX + 1], 4)).toEqual([PAR_MIN, PAR_MAX, 3, 3])
    // The stepper stops at the same edges.
    expect(stepPar([PAR_MIN], 0, -1)).toEqual([PAR_MIN])
    expect(stepPar([PAR_MAX], 0, 1)).toEqual([PAR_MAX])
    expect(stepPar([PAR_MIN], 0, 1)).toEqual([PAR_MIN + 1])
  })

  it('makes MAX_HOLES the default length of a new round', () => {
    expect(createGame(['Ann']).holes).toBe(MAX_HOLES)
  })
})
