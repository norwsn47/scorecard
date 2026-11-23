import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import History from './History.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// Logged-out History reads from localStorage; the auth check just needs to
// resolve to "no user".
beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
})

function seedLocalGames(games) {
  localStorage.setItem('gt_completed_games', JSON.stringify(games))
}

function renderHistory() {
  render(
    <AuthProvider>
      <History navigate={vi.fn()} goBack={vi.fn()} />
    </AuthProvider>,
  )
}

const round = (id, players, completedAt) => ({
  id,
  completedAt,
  holesPlayed: 2,
  players,
  scores: Object.fromEntries(players.map((p, i) => [p, [3, 3 + i]])),
  holePars: [3, 3],
})

describe('History - cards', () => {
  const dbRow = (id, courseName) => ({
    id,
    played_at: '2026-08-01T10:00:00.000Z',
    holes_played: 2,
    course_id: null,
    course_name: courseName,
    notes: null,
    hole_pars: '[3,3]',
    player_data: JSON.stringify([{ name: 'Ann', scores: [3, 3], total: 6 }]),
  })

  async function renderSignedIn(games) {
    global.fetch = vi.fn(url => {
      if (url.includes('/api/auth/me')) return Promise.resolve({ ok: true, json: async () => ({ user: { id: 'u1', email: 'ann@example.com', name: 'Ann' } }) })
      if (url.includes('/api/games')) return Promise.resolve({ ok: true, json: async () => ({ games }) })
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    renderHistory()
    await screen.findAllByRole('button', { name: /^Open round/ })
  }

  it('has no delete control on a card (deleting lives on the round itself)', async () => {
    seedLocalGames([round('g1', ['Ann'], '2026-08-01T10:00:00.000Z')])
    renderHistory()
    expect(await screen.findByRole('button', { name: /^Open round/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('signed in with one course: the label at the top names it and cards do not repeat it', async () => {
    await renderSignedIn([dbRow('a', 'Bruntsfield'), dbRow('b', 'Bruntsfield')])
    const main = screen.getByRole('main')
    expect(screen.getAllByText('Bruntsfield')).toHaveLength(1)
    expect(within(main).queryByText('Bruntsfield')).not.toBeInTheDocument()
  })

  it('signed in with several courses: each card keeps its course name', async () => {
    await renderSignedIn([dbRow('a', 'Bruntsfield'), dbRow('b', 'Nine A')])
    const main = screen.getByRole('main')
    expect(within(main).getByText('Bruntsfield')).toBeInTheDocument()
    expect(within(main).getByText('Nine A')).toBeInTheDocument()
  })

  it('signed out: a card still shows its course name when it has one', async () => {
    seedLocalGames([{ ...round('g1', ['Ann'], '2026-08-01T10:00:00.000Z'), courseName: 'Bruntsfield' }])
    renderHistory()
    expect(await within(await screen.findByRole('main')).findByText('Bruntsfield')).toBeInTheDocument()
  })

  it('signed in: "+ Add" is reachable by name and opens Setup for a past round', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()
    global.fetch = vi.fn(url => {
      if (url.includes('/api/auth/me')) return Promise.resolve({ ok: true, json: async () => ({ user: { id: 'u1', email: 'a@b.c', name: 'Ann' } }) })
      return Promise.resolve({ ok: true, json: async () => ({ games: [] }) })
    })
    render(<AuthProvider><History navigate={navigate} goBack={vi.fn()} /></AuthProvider>)
    await user.click(await screen.findByRole('button', { name: '+ Add' }))
    expect(navigate).toHaveBeenCalledWith('setup', { pastRound: true })
  })
})

describe('History — Home fallback on depth 0 (#89 fix-forward)', () => {
  it('shows a "Home" link when the app loads straight onto History (depth 0 — e.g. a reload or deep link)', () => {
    window.history.replaceState({ depth: 0 }, '', '/history')
    renderHistory()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })

  it('hides the "Home" link when there is somewhere in-app to go back to (depth > 0)', () => {
    window.history.replaceState({ depth: 1 }, '', '/history')
    renderHistory()
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument()
  })
})

describe('History — player filter (#51 / #61)', () => {
  it('shows no filter button when only one player appears across rounds', () => {
    seedLocalGames([round('g1', ['Ann'], '2026-08-01T10:00:00.000Z')])
    renderHistory()
    expect(screen.queryByRole('button', { name: /^Filter rounds/ })).not.toBeInTheDocument()
  })

  it('shows the filter button once two or more players appear; the Player picker has a row per player and filters the list', async () => {
    const user = userEvent.setup()
    seedLocalGames([
      round('g1', ['Ann', 'Bo'], '2026-08-02T10:00:00.000Z'),
      round('g2', ['Ann', 'Cass'], '2026-08-01T10:00:00.000Z'),
    ])
    renderHistory()

    const list = screen.getByRole('main')

    // Both rounds in the list: Cass's row (g2) is present.
    expect(within(list).getByText('Cass')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filter rounds' }))
    await user.click(screen.getByRole('button', { name: 'Player: All players' }))
    const sheet = screen.getByRole('dialog', { name: 'Player' })
    expect(within(sheet).getByRole('radio', { name: /^All players/ })).toBeInTheDocument()

    // Filter to Bo — only g1 (Ann + Bo) matches, so g2 (Ann + Cass) leaves the list.
    await user.click(within(sheet).getByRole('radio', { name: /^Bo/ }))
    expect(within(list).queryByText('Cass')).not.toBeInTheDocument()
    expect(within(list).getByText('Bo')).toBeInTheDocument()

    // "All players" clears the filter — g2 is back.
    await user.click(screen.getByRole('button', { name: 'Filter rounds, 1 applied' }))
    await user.click(screen.getByRole('button', { name: 'Player: Bo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('radio', { name: /^All players/ }))
    expect(within(list).getByText('Cass')).toBeInTheDocument()
  })
})

describe('History - player-name toggles meet the 44px tap target', () => {
  it('gives each name toggle a 44px tall tap area (py-2.5 -my-2.5) at least 44px wide', () => {
    seedLocalGames([round('g1', ['Ann', 'Bo'], '2026-08-01T10:00:00.000Z')])
    renderHistory()
    for (const toggle of within(screen.getByRole('main')).getAllByRole('button', { pressed: false })) {
      expect(toggle).toHaveClass('py-2.5', '-my-2.5', 'min-w-11')
    }
  })
})

// Signed-in identity star (BACKLOG #91). A signed-in user's History
// reads from D1, so this mocks /api/games as well as /api/auth/me. The star
// shows in the player picker sheet and on their name in each round row.
describe('History - signed-in star (#91)', () => {
  const dbRound = {
    id: 'db1',
    played_at: '2026-08-01T10:00:00.000Z',
    holes_played: 2,
    course_id: null,
    course_name: null,
    notes: null,
    hole_pars: '[3,3]',
    player_data: JSON.stringify([
      { name: 'Ann', scores: [3, 3], total: 6 },
      { name: 'Bo', scores: [4, 4], total: 8 },
    ]),
  }

  async function renderSignedIn(userName) {
    global.fetch = vi.fn(url => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: async () => ({ user: { id: 'u1', email: 'ann@example.com', name: userName } }) })
      }
      if (url.includes('/api/games')) {
        return Promise.resolve({ ok: true, json: async () => ({ games: [dbRound] }) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    renderHistory()
    await screen.findByRole('button', { name: /^Open round/ })
    await act(async () => { await Promise.resolve() })
  }

  it('stars the matching player in the player picker and in the round row, and nobody else', async () => {
    await renderSignedIn('ann')

    const list = screen.getByRole('main')
    expect(within(list).getAllByRole('img', { name: 'You' })).toHaveLength(1)

    // The star shows on the player's row in the picker sheet, and on nobody else's.
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Filter rounds' }))
    await user.click(screen.getByRole('button', { name: 'Player: All players' }))
    const sheet = screen.getByRole('dialog', { name: 'Player' })
    expect(within(sheet).getAllByRole('img', { name: 'You' })).toHaveLength(1)
    expect(within(within(sheet).getByRole('radio', { name: /^Ann/ })).getByRole('img', { name: 'You' })).toBeInTheDocument()
    expect(within(within(sheet).getByRole('radio', { name: /^Bo/ })).queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('shows no star when the signed-in user has no name set', async () => {
    await renderSignedIn(null)

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('shows no star when signed out', async () => {
    seedLocalGames([round('g1', ['Ann', 'Bo'], '2026-08-01T10:00:00.000Z')])
    renderHistory()

    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })
})

describe('History - record cards (redesign)', () => {
  const twoPlayerRound = () => round('g1', ['Ann', 'Bo'], '2026-08-01T10:00:00.000Z')

  it('each round card is a Card: the shared surface with the soft shadow, never the old one', async () => {
    seedLocalGames([twoPlayerRound(), round('g2', ['Cy'], '2026-08-02T10:00:00.000Z')])
    renderHistory()
    const buttons = await screen.findAllByRole('button', { name: /^Open round/ })
    expect(buttons).toHaveLength(2)
    for (const open of buttons) {
      expect(open.parentElement).toHaveClass('shadow-subtle', 'rounded-control', 'bg-bg-card')
      expect(open.parentElement).not.toHaveClass('shadow-card', 'rounded-md')
    }
  })

  it('shows no winner line and no winner highlight; names carry equal weight', async () => {
    seedLocalGames([twoPlayerRound()])
    renderHistory()
    await screen.findByRole('button', { name: /^Open round/ })
    const main = screen.getByRole('main')
    expect(within(main).queryByText(/Winner/)).not.toBeInTheDocument()
    expect(within(main).queryByText(/Tied/)).not.toBeInTheDocument()
    const ann = within(main).getByRole('button', { name: 'Ann' })
    const bo = within(main).getByRole('button', { name: 'Bo' })
    expect(ann.className).toBe(bo.className)
    for (const el of [ann, bo]) {
      expect(el).toHaveClass('type-body', 'text-text')
      expect(el).not.toHaveClass('type-strong')
      expect(el).not.toHaveClass('text-accent')
    }
  })

  it('keeps the total beside the name: name can shrink, total cannot', async () => {
    seedLocalGames([round('g1', ['A very long player name indeed'], '2026-08-01T10:00:00.000Z')])
    renderHistory()
    await screen.findByRole('button', { name: /^Open round/ })
    const name = screen.getByRole('button', { name: 'A very long player name indeed' })
    // min-w-11 (not min-w-0): the name still shrinks and wraps, but never
    // below the 44px tap-target width.
    expect(name).toHaveClass('min-w-11', 'break-words', 'pointer-events-auto')
    expect(name.nextElementSibling).toHaveClass('shrink-0')
    expect(name.nextElementSibling).toHaveTextContent('6 (E)')
  })
})

describe('History - error state on EmptyState', () => {
  it('keeps role="alert" and the Try again action when the load fails', async () => {
    global.fetch = vi.fn(url => {
      if (url.includes('/api/auth/me')) return Promise.resolve({ ok: true, json: async () => ({ user: { id: 'u1', email: 'a@example.com', name: 'Ann' } }) })
      return Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
    })
    renderHistory()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveClass('text-center', 'pt-16')
    expect(alert).toHaveTextContent("Couldn't load your rounds")
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
