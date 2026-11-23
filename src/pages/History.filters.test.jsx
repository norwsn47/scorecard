import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import History from './History.jsx'
import { AuthProvider } from '../hooks/useAuth.jsx'

// History's floating filter button, the "Filter rounds" sheet and the picker
// sheets (CHANGELOG 23 November 2026: the filter pills became a floating
// button). Quick-play History reads localStorage; signed-in History reads the
// mocked /api/games. Course filter: signed in with 2+ courses only. Player
// filter: 2+ players, either way.

const SIGNED_IN = { id: 'u1', email: 'ann@example.com', name: 'Ann', pending_email: null }

function dbRow(id, playedAt, courseName, players) {
  return {
    id,
    played_at: playedAt,
    holes_played: 2,
    course_id: null,
    course_name: courseName,
    notes: null,
    hole_pars: '[3,3]',
    client_round_id: null,
    player_data: JSON.stringify(players.map((name, i) => ({ name, scores: [3 + i, 3 + i], total: 6 + 2 * i }))),
  }
}

// Five rounds, three courses, three players: Ann is the signed-in user.
//   r1 Links:    Ann, Bo       r2 Swanston: Ann, Bo     r3 Swanston: Ann, Cy
//   r4 Galloway: Bo, Cy        r5 Links:    Ann
const ROWS = [
  dbRow('r1', '2026-08-05T10:00:00.000Z', 'Links', ['Ann', 'Bo']),
  dbRow('r2', '2026-08-04T10:00:00.000Z', 'Swanston', ['Ann', 'Bo']),
  dbRow('r3', '2026-08-03T10:00:00.000Z', 'Swanston', ['Ann', 'Cy']),
  dbRow('r4', '2026-08-02T10:00:00.000Z', 'Galloway', ['Bo', 'Cy']),
  dbRow('r5', '2026-08-01T10:00:00.000Z', 'Links', ['Ann']),
]

async function renderSignedIn(rows = ROWS) {
  global.fetch = vi.fn(url => {
    if (url.includes('/api/auth/me')) return Promise.resolve({ ok: true, json: async () => ({ user: SIGNED_IN }) })
    if (url.includes('/api/games')) return Promise.resolve({ ok: true, json: async () => ({ games: rows }) })
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
  render(<AuthProvider><History navigate={vi.fn()} goBack={vi.fn()} /></AuthProvider>)
  if (rows.length > 0) await screen.findAllByRole('button', { name: /^Open round/ })
  else await screen.findByText('No rounds yet')
  await act(async () => { await Promise.resolve() })
  return userEvent.setup()
}

function renderQuickPlay(games) {
  localStorage.setItem('gt_completed_games', JSON.stringify(games))
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) })
  render(<AuthProvider><History navigate={vi.fn()} goBack={vi.fn()} /></AuthProvider>)
  return userEvent.setup()
}

const localRound = (id, players, courseName) => ({
  id,
  completedAt: `2026-08-0${id.slice(1)}T10:00:00.000Z`,
  holesPlayed: 2,
  courseName,
  players,
  scores: Object.fromEntries(players.map((p, i) => [p, [3, 3 + i]])),
  holePars: [3, 3],
})

const openCards = () => screen.queryAllByRole('button', { name: /^Open round/ })
const fab = () => screen.getByRole('button', { name: /^Filter rounds/ })
const queryFab = () => screen.queryByRole('button', { name: /^Filter rounds/ })
const menu = () => screen.getByRole('dialog', { name: 'Filter rounds' })
const menuRows = () => within(menu()).getAllByRole('button', { name: /^(Course|Player):/ })
// Opens the Filter rounds sheet, then the named filter's picker.
async function openPicker(user, label) {
  await user.click(fab())
  await user.click(within(menu()).getByRole('button', { name: new RegExp(`^${label}:`) }))
}
const choose = (user, name) => user.click(within(screen.getByRole('dialog')).getByRole('radio', { name }))

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/history')
})

describe('History - the filter button appears only when there is something to pick', () => {
  it('signed in with 2+ courses and 2+ players: the button, and its sheet lists Course then Player', async () => {
    const user = await renderSignedIn()
    expect(fab()).toHaveAttribute('aria-haspopup', 'dialog')
    expect(fab()).toHaveAttribute('aria-expanded', 'false')
    // No pills at the top any more.
    expect(screen.queryByRole('button', { name: /^(Course|Player)/ })).not.toBeInTheDocument()

    await user.click(fab())
    expect(fab()).toHaveAttribute('aria-expanded', 'true')
    expect(menu()).toHaveAttribute('aria-modal', 'true')
    expect(menuRows().map(r => r.getAttribute('aria-label'))).toEqual(['Course: All courses', 'Player: All players'])
    expect(menuRows()[0]).toHaveFocus()
    expect(within(menu()).queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('signed in with one course: the course label, and only a Player row', async () => {
    const user = await renderSignedIn([ROWS[0], ROWS[4]])
    expect(screen.getAllByText('Links').length).toBeGreaterThan(0)
    await user.click(fab())
    expect(menuRows().map(r => r.getAttribute('aria-label'))).toEqual(['Player: All players'])
  })

  it('signed out: never a Course row (even with several courses), a Player row with 2+ players', async () => {
    const user = renderQuickPlay([localRound('r1', ['Ann', 'Bo'], 'Links'), localRound('r2', ['Ann'], 'Swanston')])
    await user.click(fab())
    expect(menuRows().map(r => r.getAttribute('aria-label'))).toEqual(['Player: All players'])
  })

  it('signed out with one player: no filter button', () => {
    renderQuickPlay([localRound('r1', ['Ann'], 'Links'), localRound('r2', ['Ann'], 'Swanston')])
    expect(queryFab()).not.toBeInTheDocument()
  })

  it('no filter button and no status while the signed-in rounds are still loading', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    render(<AuthProvider><History navigate={vi.fn()} goBack={vi.fn()} /></AuthProvider>)
    expect(queryFab()).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('no filter button when there are no rounds', async () => {
    await renderSignedIn([])
    expect(queryFab()).not.toBeInTheDocument()
  })

  it('the button counts the filters applied', async () => {
    const user = await renderSignedIn()
    expect(fab()).toHaveAccessibleName('Filter rounds')
    await openPicker(user, 'Course')
    await choose(user, /^Swanston/)
    expect(fab()).toHaveAccessibleName('Filter rounds, 1 applied')
    expect(fab()).toHaveTextContent('1')
    await openPicker(user, 'Player')
    await choose(user, /^Cy/)
    expect(fab()).toHaveAccessibleName('Filter rounds, 2 applied')
  })
})

describe('History - the picker sheet', () => {
  it('is a labelled modal dialog: a radiogroup with "All courses" first and the chosen row checked', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Course')
    const dialog = screen.getByRole('dialog', { name: 'Course' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.queryByRole('dialog', { name: 'Filter rounds' })).not.toBeInTheDocument()
    const group = within(dialog).getByRole('radiogroup', { name: 'Course' })
    const rows = within(group).getAllByRole('radio')
    expect(rows.map(r => r.textContent)).toEqual([
      'All courses5 rounds',
      'Links2 rounds',
      'Swanston2 rounds',
      'Galloway1 round',
    ])
    expect(rows[0]).toHaveAttribute('aria-checked', 'true')
    expect(rows.slice(1).every(r => r.getAttribute('aria-checked') === 'false')).toBe(true)
    // Focus lands on the chosen row; it is the only tab stop.
    expect(rows[0]).toHaveFocus()
    expect(rows.map(r => r.tabIndex)).toEqual([0, -1, -1, -1])
  })

  it('choosing a row applies the filter, closes the sheet, returns focus to the button, and the menu shows the value', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Course')
    await choose(user, /^Swanston/)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openCards()).toHaveLength(2)
    expect(fab()).toHaveFocus()

    // Reopen: the menu row shows the value; the picker has it checked and focused.
    await user.click(fab())
    expect(within(menu()).getByRole('button', { name: 'Course: Swanston' })).toBeInTheDocument()
    await user.click(within(menu()).getByRole('button', { name: 'Course: Swanston' }))
    expect(screen.getByRole('radio', { name: /^Swanston/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /^Swanston/ })).toHaveFocus()
    expect(screen.getByRole('radio', { name: /^All courses/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('"All courses" clears the course filter', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Course')
    await choose(user, /^Links/)
    expect(openCards()).toHaveLength(2)

    await openPicker(user, 'Course')
    await choose(user, /^All courses/)
    expect(openCards()).toHaveLength(5)
    expect(fab()).toHaveAccessibleName('Filter rounds')
  })

  it('arrow keys move focus between rows without choosing, Enter chooses', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Player')
    const dialog = screen.getByRole('dialog', { name: 'Player' })
    const rows = within(dialog).getAllByRole('radio')
    expect(rows[0]).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(rows[1]).toHaveFocus()
    expect(rows[0]).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(rows[rows.length - 1]).toHaveFocus() // wraps
    await user.keyboard('{Home}')
    expect(rows[0]).toHaveFocus()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openCards().length).toBeLessThan(5)
  })

  it('player rows are sorted by round count and the signed-in player keeps the star', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Player')
    const rows = within(screen.getByRole('dialog')).getAllByRole('radio')
    expect(rows.map(r => r.textContent.replace('You', ''))).toEqual([
      'All players5 rounds', 'Ann4 rounds', 'Bo3 rounds', 'Cy2 rounds',
    ])
    expect(within(rows[1]).getByRole('img', { name: 'You' })).toBeInTheDocument()
    expect(within(rows[2]).queryByRole('img', { name: 'You' })).not.toBeInTheDocument()
  })

  it('counts reflect the other active filter', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Player')
    await choose(user, /^Cy/) // Cy: r3 (Swanston), r4 (Galloway)

    await openPicker(user, 'Course')
    const rows = within(screen.getByRole('dialog')).getAllByRole('radio')
    expect(rows.map(r => r.textContent)).toEqual([
      'All courses2 rounds',
      'Links0 rounds',
      'Swanston1 round',
      'Galloway1 round',
    ])
  })
})

describe('History - the inline name toggles and the player filter are one selection', () => {
  it('tapping a name on a card shows in the menu and in the picker', async () => {
    const user = await renderSignedIn()
    const card = openCards()[3].parentElement // r4 Galloway: Bo, Cy
    await user.click(within(card).getByRole('button', { name: 'Cy' }))

    await user.click(fab())
    expect(within(menu()).getByRole('button', { name: 'Player: Cy' })).toBeInTheDocument()
    await user.click(within(menu()).getByRole('button', { name: 'Player: Cy' }))
    expect(screen.getByRole('radio', { name: /^Cy/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('choosing in the picker turns the matching name toggles on, and tapping the name again clears it', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Player')
    await choose(user, /^Bo/)

    const main = screen.getByRole('main')
    for (const toggle of within(main).getAllByRole('button', { name: 'Bo' })) {
      expect(toggle).toHaveAttribute('aria-pressed', 'true')
    }
    await user.click(within(main).getAllByRole('button', { name: 'Bo' })[0])
    expect(fab()).toHaveAccessibleName('Filter rounds')
    expect(openCards()).toHaveLength(5)
  })
})

describe('History - applied filters: status line and Clear filters', () => {
  it('shows nothing until a filter is applied', async () => {
    await renderSignedIn()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('says how many rounds are showing, updates as filters combine, and Clear filters resets both', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Course')
    await choose(user, /^Swanston/)
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 5 rounds')

    await openPicker(user, 'Player')
    await choose(user, /^Cy/) // Swanston AND Cy: r3 only
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 5 rounds')
    expect(openCards()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(openCards()).toHaveLength(5)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(fab()).toHaveAccessibleName('Filter rounds')
    expect(fab()).toHaveFocus()
  })

  it('Clear filters in the Filter rounds sheet resets both and closes it', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Course')
    await choose(user, /^Swanston/)
    await user.click(fab())
    await user.click(within(menu()).getByRole('button', { name: 'Clear filters' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openCards()).toHaveLength(5)
    expect(fab()).toHaveFocus()
  })

  it('works signed out too: a player filter gives the status line and Clear filters', async () => {
    const user = renderQuickPlay([localRound('r1', ['Ann', 'Bo']), localRound('r2', ['Ann', 'Cy']), localRound('r3', ['Bo'])])
    await openPicker(user, 'Player')
    await choose(user, /^Bo/)
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 3 rounds')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(openCards()).toHaveLength(3)
  })
})

describe('History - no-match state', () => {
  it('a course and player with no round together: no-match wording, Clear filters resets', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Course')
    await choose(user, /^Links/) // Ann, Bo only: Cy never played it
    await openPicker(user, 'Player')
    await choose(user, /^Cy/)

    expect(openCards()).toHaveLength(0)
    expect(screen.getByText('No rounds found')).toBeInTheDocument()
    expect(screen.getByText("Cy hasn't played a recorded round at Links.")).toBeInTheDocument()
    expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument()
    expect(screen.queryByText('No rounds yet')).not.toBeInTheDocument()
    // The button stays, so the filters can still be changed.
    expect(fab()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(openCards()).toHaveLength(5)
    expect(screen.queryByText('No rounds found')).not.toBeInTheDocument()
  })

  it('no filters and no rounds is still "No rounds yet"', async () => {
    await renderSignedIn([])
    expect(screen.getByText('No rounds yet')).toBeInTheDocument()
    expect(screen.queryByText('No rounds found')).not.toBeInTheDocument()
  })
})

describe('History - sheet dismissal and focus', () => {
  it('Escape closes either sheet and returns focus to the filter button', async () => {
    const user = await renderSignedIn()
    await user.click(fab())
    expect(menu()).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fab()).toHaveFocus()
    expect(fab()).toHaveAttribute('aria-expanded', 'false')

    await openPicker(user, 'Player')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fab()).toHaveFocus()
    expect(openCards()).toHaveLength(5) // nothing chosen
  })

  it('a tap on the backdrop closes it; a tap inside the sheet does not', async () => {
    const user = await renderSignedIn()
    await openPicker(user, 'Course')
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('heading', { name: 'Course' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(dialog.parentElement)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fab()).toHaveFocus()
  })

  it('Tab and Shift+Tab stay inside both sheets', async () => {
    const user = await renderSignedIn()
    await user.click(fab())
    for (const dialogName of ['Filter rounds', 'Course']) {
      if (dialogName === 'Course') await user.click(within(menu()).getByRole('button', { name: /^Course:/ }))
      const dialog = screen.getByRole('dialog', { name: dialogName })
      for (let i = 0; i < 4; i += 1) {
        await user.tab()
        expect(dialog).toContainElement(document.activeElement)
      }
      for (let i = 0; i < 4; i += 1) {
        await user.tab({ shift: true })
        expect(dialog).toContainElement(document.activeElement)
      }
    }
    expect(document.activeElement).not.toBe(document.body)
  })
})
