import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Scorecard from './Scorecard.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Stage 7: the live score table (plan 5f). Dense mode for 5 or 6 players,
// totals layout, active row and active cell, hole column.

function makeGame(players, holes = 3) {
  const scores = {}
  players.forEach((p, i) => { scores[p] = [3 + (i % 3), 4, null].slice(0, holes) })
  return {
    id: 'g1', players, scores, holes,
    holePars: [3, 4, 3].slice(0, holes),
    courseId: null, courseName: 'Bruntsfield',
  }
}

async function renderScorecard(players) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
  const { container } = render(
    <AuthProvider>
      <Scorecard navigate={vi.fn()} params={{ game: makeGame(players) }} />
    </AuthProvider>,
  )
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  return container
}

beforeEach(() => { localStorage.clear() })

describe('Scorecard table - column headers', () => {
  it('uses Label caps for 4 players', async () => {
    await renderScorecard(['Ann', 'Bo', 'Cy', 'Di'])
    const th = screen.getByRole('columnheader', { name: 'Ann' })
    expect(th).toHaveClass('type-label-caps')
    expect(th).not.toHaveClass('type-caption')
    expect(screen.getByRole('columnheader', { name: 'Hole' })).toHaveClass('type-label-caps')
  })

  it.each([5, 6])('uses Caption for %i players, truncated, with the full name still the accessible name', async n => {
    const names = ['Alexandra', 'Bo', 'Cy', 'Di', 'Ed', 'Flo'].slice(0, n)
    await renderScorecard(names)
    const th = screen.getByRole('columnheader', { name: 'Alexandra' })
    expect(th).toHaveClass('type-caption')
    expect(th).not.toHaveClass('type-label-caps')
    expect(within(th).getByText('Alexandra')).toHaveClass('truncate', 'min-w-0')
    expect(screen.getByRole('columnheader', { name: 'Hole' })).toHaveClass('type-caption')
  })
})

describe('Scorecard table - totals', () => {
  it('puts the total and its bracket on one line for 4 players (44px row)', async () => {
    await renderScorecard(['Ann', 'Bo', 'Cy', 'Di'])
    const total = screen.getByText('Total')
    expect(total).toHaveClass('h-11')
    expect(total).toHaveClass('text-text')
    const bracket = screen.getAllByText(/^\(\+\d+\)$/)[0]
    expect(bracket).not.toHaveClass('block')
  })

  it('stacks the bracket below the total for 5 and 6 players (56px row)', async () => {
    await renderScorecard(['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo'])
    const total = screen.getByText('Total')
    expect(total).toHaveClass('h-14')
    const brackets = screen.getAllByText(/^\(\+\d+\)$/)
    expect(brackets.length).toBeGreaterThan(0)
    brackets.forEach(b => expect(b).toHaveClass('block'))
  })

  it('never shrinks the bracket below Caption', async () => {
    await renderScorecard(['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo'])
    screen.getAllByText(/^\(\+\d+\)$/).forEach(b => expect(b).toHaveClass('type-caption'))
  })
})

describe('Scorecard table - active row, active cell and hole column', () => {
  it('marks the active cell solid accent with white text, filling a 48px button, delta inverted', async () => {
    await renderScorecard(['Ann', 'Bo'])
    const active = screen.getAllByRole('button', { name: /^Hole \d+, par \d+, / })
      .find(b => b.getAttribute('aria-current') === 'true')
    const td = active.closest('td')
    expect(td).toHaveClass('bg-accent', 'text-on-accent')
    expect(active).toHaveClass('h-12', 'w-full', 'whitespace-nowrap', 'focus-visible:ring-on-accent')
    expect(active).not.toHaveClass('focus-visible:ring-accent')
    const delta = within(active).queryByText(/^[+-]\d$|^E$/)
    if (delta) {
      expect(delta).not.toHaveClass('text-over-par')
      expect(delta).not.toHaveClass('text-under-par')
    }
  })

  it('gives an inactive cell a solid accent focus ring and keeps the delta on the score line', async () => {
    await renderScorecard(['Ann', 'Bo'])
    const inactive = screen.getByRole('button', { name: 'Hole 1, par 3, Bo: 4' })
    expect(inactive).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-inset', 'focus-visible:ring-accent')
    expect(inactive).toHaveClass('whitespace-nowrap')
  })

  it('tints the active row and lets it show through the hole column in accent', async () => {
    await renderScorecard(['Ann', 'Bo'])
    // Active cell is hole 3 (the first unscored one).
    const activeRow = screen.getByRole('button', { name: 'Hole 3, par 3, Ann: no score yet' }).closest('tr')
    expect(activeRow).toHaveClass('bg-accent-tint')
    const holeTd = activeRow.querySelector('td')
    expect(holeTd).not.toHaveClass('bg-bg-card')
    expect(holeTd).toHaveClass('text-accent', 'pl-3', 'text-left')
    expect(within(holeTd).getByText('3')).not.toHaveClass('text-text')
    expect(within(holeTd).getByText('(3)')).not.toHaveClass('text-muted')
  })

  it('fills inactive hole cells with the card colour, number in text and bracket muted', async () => {
    await renderScorecard(['Ann', 'Bo'])
    const row = screen.getByRole('button', { name: 'Hole 1, par 3, Ann: 3' }).closest('tr')
    const holeTd = row.querySelector('td')
    expect(row).not.toHaveClass('bg-accent-tint')
    expect(holeTd).toHaveClass('bg-bg-card', 'text-left', 'pl-3')
    expect(within(holeTd).getByText('1')).toHaveClass('text-text')
    expect(within(holeTd).getByText('(3)')).toHaveClass('text-muted')
  })

  it('sets the hole column to 56px in a fixed-layout table', async () => {
    const container = await renderScorecard(['Ann', 'Bo'])
    expect(container.querySelector('table')).toHaveClass('table-fixed')
    expect(container.querySelector('col')).toHaveClass('w-14')
  })
})

describe('Scorecard source - focus ring', () => {
  it('no longer uses the 40% ring', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/pages/Scorecard.jsx'), 'utf8')
    expect(src).not.toContain('ring-accent/40')
  })
})
