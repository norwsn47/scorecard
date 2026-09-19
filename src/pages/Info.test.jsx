import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Info from './Info.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Covers BACKLOG #12: the Information page carries a contact link to the same
// address the privacy page uses (PRD §4.8).

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

function renderInfo(params = {}) {
  const goBack = vi.fn()
  render(
    <AuthProvider>
      <Info navigate={vi.fn()} goBack={goBack} params={params} />
    </AuthProvider>,
  )
  return { goBack }
}

describe('Info - back button (#83)', () => {
  it('goes back to Home by default', async () => {
    const user = userEvent.setup()
    const { goBack } = renderInfo()
    expect(screen.getByRole('button', { name: '← Home' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '← Home' }))
    expect(goBack).toHaveBeenCalledWith('home')
  })

  it('goes back to Settings when opened from the Settings About row', async () => {
    const user = userEvent.setup()
    const { goBack } = renderInfo({ from: 'settings' })
    await user.click(screen.getByRole('button', { name: '← Settings' }))
    expect(goBack).toHaveBeenCalledWith('settings')
  })
})

describe('Info - contact link (#12)', () => {
  it('shows a mailto link to scorecard@outbuild.uk', () => {
    renderInfo()
    const link = screen.getByRole('link', { name: 'scorecard@outbuild.uk' })
    expect(link).toHaveAttribute('href', 'mailto:scorecard@outbuild.uk')
  })
})
