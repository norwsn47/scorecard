import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Scorecard from './Scorecard.jsx'
import { saveActiveGame } from '../utils/storage.js'

// #17 — opening /scorecard with no active game (a direct URL hit, or a
// browser bounce onto a stale entry). The guard must send the user home
// from an *effect*, never an inline navigate() during render — an inline
// call sets state on the parent mid-render, which React rejects with a
// console error. This pins that it stays an effect.

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Scorecard — no active game (#17)', () => {
  it('bounces home from an effect, renders nothing, and logs no React error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const navigate = vi.fn()

    const { container } = render(<Scorecard navigate={navigate} params={{}} />)

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('home'))
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(container).toBeEmptyDOMElement()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('renders the grid and does not bounce when an active game is in storage', async () => {
    saveActiveGame({
      id: 'g1',
      players: ['Ann', 'Ben'],
      scores: { Ann: [null, null], Ben: [null, null] },
      holes: 2,
      holePars: [3, 3],
    })
    const navigate = vi.fn()

    render(<Scorecard navigate={navigate} params={{}} />)

    expect(await screen.findByText('Ann')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
