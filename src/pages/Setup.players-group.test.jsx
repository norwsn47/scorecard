import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Figma 02-setup: one "Players" heading over the name fields, "+ Add player"
// grouped under them, and the primary action in the bottom action bar.

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401, json: async () => ({}) }))
})

function renderSetup(params = {}) {
  render(
    <AuthProvider>
      <Setup navigate={vi.fn()} goBack={vi.fn()} params={params} />
    </AuthProvider>,
  )
}

describe('Setup - Players group and bottom bar', () => {
  it('shows one Players heading and keeps each input named "Player N name"', async () => {
    renderSetup()
    const group = await screen.findByRole('region', { name: 'Players' })
    expect(screen.getByRole('heading', { name: 'Players' })).toBeInTheDocument()
    expect(within(group).getByLabelText('Player 1 name')).toBeInTheDocument()

    await userEvent.click(within(group).getByRole('button', { name: '+ Add player' }))
    expect(within(group).getByLabelText('Player 2 name')).toBeInTheDocument()
    // The per-field labels are visually hidden, not visible captions.
    expect(screen.getByText('Player 2 name').className).toContain('sr-only')
  })

  it('puts the primary action in the bottom action bar', async () => {
    renderSetup()
    const start = await screen.findByRole('button', { name: 'Start the round' })
    expect(start.closest('[data-bottom-action-bar]')).not.toBeNull()
  })
})
