import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Info from './Info.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Covers BACKLOG #12: the Information page carries a contact link to the same
// address the privacy page uses (PRD §4.8).

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

function renderInfo() {
  render(
    <AuthProvider>
      <Info navigate={vi.fn()} goBack={vi.fn()} params={{}} />
    </AuthProvider>,
  )
}

describe('Info - contact link (#12)', () => {
  it('shows a mailto link to scorecard@outbuild.uk', () => {
    renderInfo()
    const link = screen.getByRole('link', { name: 'scorecard@outbuild.uk' })
    expect(link).toHaveAttribute('href', 'mailto:scorecard@outbuild.uk')
  })
})
