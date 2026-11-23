import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import Summary from './Summary.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'
import { saveCompletedGame } from '../utils/storage.js'

// Stage 7: the read-only Summary table (plan 5f), same rules as the live grid.

function makeGame(players, holes = 18) {
  const scores = {}
  players.forEach((p, i) => { scores[p] = Array.from({ length: holes }, (_, h) => 3 + ((i + h) % 3)) })
  return {
    id: 'r1', courseId: 'c1', courseName: 'Bruntsfield',
    completedAt: '2026-08-01T12:00:00.000Z',
    holes, holesPlayed: holes, holePars: Array(holes).fill(3),
    players, scores,
  }
}

async function renderSummary(game) {
  saveCompletedGame(game)
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
  const { container } = render(
    <AuthProvider>
      <Summary navigate={vi.fn()} params={{ game, fromHistory: true }} />
    </AuthProvider>,
  )
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  return container
}

beforeEach(() => { localStorage.clear() })

describe('Summary table - layout', () => {
  it('is fixed-layout with a 56px hole column and no sideways scroll', async () => {
    const container = await renderSummary(makeGame(['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo']))
    const table = container.querySelector('table')
    expect(table).toHaveClass('table-fixed', 'w-full')
    expect(table).not.toHaveClass('min-w-max')
    expect(container.querySelector('col')).toHaveClass('w-14')
    expect(container.querySelectorAll('col')).toHaveLength(7)
    expect(table.parentElement).not.toHaveClass('overflow-x-auto')
  })

  it('fills the hole column with the card colour, number in text and bracket muted, 36px rows', async () => {
    await renderSummary(makeGame(['Ann', 'Bo']))
    const td = screen.getAllByText('1')[0].closest('td')
    expect(td).toHaveClass('bg-bg-card', 'text-left', 'pl-3', 'h-9')
    expect(within(td).getByText('1')).toHaveClass('text-text')
    expect(within(td).getByText('(3)')).toHaveClass('text-muted')
  })
})

describe('Summary table - headers', () => {
  it('uses Label caps for 4 players', async () => {
    await renderSummary(makeGame(['Ann', 'Bo', 'Cy', 'Di']))
    const th = screen.getByRole('columnheader', { name: 'Ann' })
    expect(th).toHaveClass('type-label-caps')
    expect(th).not.toHaveClass('type-caption')
  })

  it('uses Caption for 6 players, truncated, full name still the accessible name', async () => {
    await renderSummary(makeGame(['Alexandra', 'Bo', 'Cy', 'Di', 'Ed', 'Flo']))
    const th = screen.getByRole('columnheader', { name: 'Alexandra' })
    expect(th).toHaveClass('type-caption')
    expect(th).not.toHaveClass('type-label-caps')
    expect(within(th).getByText('Alexandra')).toHaveClass('truncate')
    expect(screen.getByRole('columnheader', { name: 'Hole' })).toHaveClass('type-caption')
  })
})

describe('Summary table - band rows', () => {
  it('keeps total and bracket on one line at 44px for 4 players', async () => {
    await renderSummary(makeGame(['Ann', 'Bo', 'Cy', 'Di']))
    const label = screen.getByRole('rowheader', { name: 'Total' })
    expect(label).toHaveClass('h-11', 'text-text', 'type-strong', 'pl-3', 'text-left')
    const row = label.closest('tr')
    within(row).getAllByText(/^\([+-]?\d+\)$|^\(E\)$/).forEach(b => expect(b).not.toHaveClass('block'))
    expect(screen.getByRole('rowheader', { name: 'Front 9' })).toHaveClass('h-11')
    expect(screen.getByRole('rowheader', { name: 'Back 9' })).toHaveClass('h-11')
  })

  it('stacks the bracket below the total at 56px for 6 players, in Front 9, Back 9 and Total', async () => {
    await renderSummary(makeGame(['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo']))
    for (const name of ['Front 9', 'Back 9', 'Total']) {
      const label = screen.getByRole('rowheader', { name })
      expect(label).toHaveClass('h-14')
      within(label.closest('tr')).getAllByText(/^\([+-]?\d+\)$|^\(E\)$/).forEach(b => {
        expect(b).toHaveClass('block', 'type-caption')
      })
    }
  })

  it('keeps the winner column in accent and the DNF sub-label', async () => {
    const g = makeGame(['Ann', 'Bo'], 9)
    g.winners = ['Ann']; g.winner = 'Ann'; g.dnf = ['Bo']
    g.scores.Bo = [4, 4, null, null, null, null, null, null, null]
    await renderSummary(g)
    expect(screen.getByRole('columnheader', { name: /Ann/ })).toHaveClass('text-accent')
    expect(screen.getAllByText('DNF').length).toBeGreaterThan(0)
  })
})
