import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Privacy from './Privacy.jsx'

// The "Your data" page (PRD 11.12). Content is static copy, so this covers what
// can break: the back label naming the screen goBack() lands on, and the
// contact and external links.

function renderPrivacy(params) {
  const goBack = vi.fn()
  render(<Privacy goBack={goBack} params={params} />)
  return { goBack }
}

describe('Privacy - back button', () => {
  it.each([
    [{ from: 'info' }, '← Info', 'info'],
    [{ from: 'login' }, '← Login', 'login'],
    [{}, '← Home', 'home'],
    [undefined, '← Home', 'home'],
    [{ from: 'somewhere-else' }, '← Home', 'somewhere-else'],
  ])('params %j shows "%s" and goes back to "%s"', async (params, label, target) => {
    const user = userEvent.setup()
    const { goBack } = renderPrivacy(params)

    await user.click(screen.getByRole('button', { name: label }))
    expect(goBack).toHaveBeenCalledWith(target)
  })
})

describe('Privacy - content', () => {
  it('has the page title and the main sections', () => {
    renderPrivacy({})
    expect(screen.getByRole('heading', { name: 'Your data' })).toBeInTheDocument()
    expect(screen.getByText('What we collect')).toBeInTheDocument()
    expect(screen.getByText('Why we store it')).toBeInTheDocument()
    expect(screen.getByText('Who else sees it')).toBeInTheDocument()
  })

  it('links to the contact address with mailto', () => {
    renderPrivacy({})
    const links = screen.getAllByRole('link', { name: 'scorecard@outbuild.uk' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(link).toHaveAttribute('href', 'mailto:scorecard@outbuild.uk')
  })

  it('opens external links in a new tab without leaking the opener', () => {
    renderPrivacy({})
    const external = screen.getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('https://'))
    expect(external.length).toBeGreaterThan(0)
    for (const a of external) {
      expect(a).toHaveAttribute('target', '_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
    }
  })
})
