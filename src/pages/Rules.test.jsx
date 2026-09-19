import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Rules from './Rules.jsx'

// The course rules page (PRD 4.9). The rules text itself is verbatim from the
// club (RulesContent) so it is only smoke-checked; this covers the back label
// naming the screen goBack() lands on.

function renderRules(params) {
  const goBack = vi.fn()
  render(<Rules goBack={goBack} params={params} />)
  return { goBack }
}

describe('Rules - back button', () => {
  it.each([
    [{ from: 'info' }, '← Info', 'info'],
    [{ from: 'bruntsfield' }, '← Course', 'bruntsfield'],
    [{ from: 'setup' }, '← New Game', 'setup'],
    [{}, '← Home', 'home'],
    [undefined, '← Home', 'home'],
  ])('params %j shows "%s" and goes back to "%s"', async (params, label, target) => {
    const user = userEvent.setup()
    const { goBack } = renderRules(params)

    await user.click(screen.getByRole('button', { name: label }))
    expect(goBack).toHaveBeenCalledWith(target)
  })
})

describe('Rules - content', () => {
  it('shows the page title and the rules text', () => {
    renderRules({})
    expect(screen.getByRole('heading', { name: 'Course Rules' })).toBeInTheDocument()
    expect(screen.getByText(/2\) RULES OF PLAY/)).toBeInTheDocument()
    expect(screen.getByText(/MAXIMUM GROUP SIZE/)).toBeInTheDocument()
  })
})
