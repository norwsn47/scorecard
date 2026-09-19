import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ParStepperGrid, { stepPar } from './ParStepperGrid.jsx'

// The shared par stepper used by course creation, course editing and the
// round-level par correction (PRD 11.13). Par is clamped to 2-7, no wrap.

describe('stepPar', () => {
  it('steps one hole up or down by one and leaves the others alone', () => {
    expect(stepPar([3, 3, 3], 1, 1)).toEqual([3, 4, 3])
    expect(stepPar([3, 3, 3], 2, -1)).toEqual([3, 3, 2])
  })

  it('returns a new array rather than mutating the input', () => {
    const pars = [3, 3]
    const next = stepPar(pars, 0, 1)
    expect(next).not.toBe(pars)
    expect(pars).toEqual([3, 3])
  })

  it('will not go below 2 or above 7 (no wraparound)', () => {
    expect(stepPar([2, 7], 0, -1)).toEqual([2, 7])
    expect(stepPar([2, 7], 1, 1)).toEqual([2, 7])
  })

  it('reaches the bounds exactly, from one step inside them', () => {
    expect(stepPar([3, 6], 0, -1)).toEqual([2, 6])
    expect(stepPar([3, 6], 1, 1)).toEqual([3, 7])
  })
})

describe('ParStepperGrid', () => {
  it('renders a labelled group per hole showing its par', () => {
    render(<ParStepperGrid pars={[3, 4, 5]} onStep={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Hole 1, par 3' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Hole 2, par 4' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Hole 3, par 5' })).toBeInTheDocument()
  })

  it('renders nothing but an empty grid for no holes', () => {
    render(<ParStepperGrid pars={[]} onStep={vi.fn()} />)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('calls onStep with the hole index and +1 / -1 from the matching button', async () => {
    const user = userEvent.setup()
    const onStep = vi.fn()
    render(<ParStepperGrid pars={[3, 3, 3]} onStep={onStep} />)

    await user.click(screen.getByRole('button', { name: 'Increase par for hole 2' }))
    expect(onStep).toHaveBeenLastCalledWith(1, 1)

    await user.click(screen.getByRole('button', { name: 'Decrease par for hole 3' }))
    expect(onStep).toHaveBeenLastCalledWith(2, -1)
    expect(onStep).toHaveBeenCalledTimes(2)
  })

  it('disables Decrease at par 2 and Increase at par 7, and only those', () => {
    render(<ParStepperGrid pars={[2, 3, 7]} onStep={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Decrease par for hole 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase par for hole 1' })).toBeEnabled()

    expect(screen.getByRole('button', { name: 'Decrease par for hole 2' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Increase par for hole 2' })).toBeEnabled()

    expect(screen.getByRole('button', { name: 'Decrease par for hole 3' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Increase par for hole 3' })).toBeDisabled()
  })

  it('does not call onStep from a disabled edge button', async () => {
    const user = userEvent.setup()
    const onStep = vi.fn()
    render(<ParStepperGrid pars={[2, 7]} onStep={onStep} />)

    await user.click(screen.getByRole('button', { name: 'Decrease par for hole 1' }))
    await user.click(screen.getByRole('button', { name: 'Increase par for hole 2' }))

    expect(onStep).not.toHaveBeenCalled()
  })

  it('steps a hole to its bound through stepPar, then locks that button', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [pars, setPars] = useState([3])
      return <ParStepperGrid pars={pars} onStep={(i, d) => setPars(p => stepPar(p, i, d))} />
    }
    render(<Harness />)

    const inc = screen.getByRole('button', { name: 'Increase par for hole 1' })
    for (let i = 0; i < 4; i++) await user.click(inc)

    expect(screen.getByRole('group', { name: 'Hole 1, par 7' })).toBeInTheDocument()
    expect(inc).toBeDisabled()

    const dec = screen.getByRole('button', { name: 'Decrease par for hole 1' })
    for (let i = 0; i < 5; i++) await user.click(dec)

    expect(screen.getByRole('group', { name: 'Hole 1, par 2' })).toBeInTheDocument()
    expect(dec).toBeDisabled()
  })
})
