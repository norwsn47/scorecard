import { getCompletedGames } from '../utils/storage.js'

function formatDate(isoString) {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(isoString))
}

function playerTotal(scores, player) {
  return (scores[player] ?? [])
    .filter(s => s !== null)
    .reduce((sum, s) => sum + s, 0)
}

export default function Summary({ navigate, params }) {
  // Prefer freshly-passed game; fall back to most recent completed game
  const game = params?.game ?? getCompletedGames()[0] ?? null

  if (!game) {
    navigate('home')
    return null
  }

  const isDnf   = player => game.dnf?.includes(player)
  const isWinner = player => player === game.winner

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Header */}
      <header className="px-5 pt-12 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="font-ui text-xs tracking-[0.2em] uppercase text-muted">
            {game.holes} holes · {formatDate(game.completedAt)}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-display italic text-3xl text-text text-center">Game Complete</h1>
      </header>

      {/* Winner callout */}
      {game.winner ? (
        <div className="mx-5 mt-5 py-4 px-5 rounded-md bg-bg-card border border-border text-center">
          <p className="font-ui text-xs tracking-[0.2em] uppercase text-muted mb-1">Winner</p>
          <p className="font-display italic text-2xl text-accent">{game.winner}</p>
          <p className="font-ui text-xs text-muted mt-1">
            {playerTotal(game.scores, game.winner)} strokes
          </p>
        </div>
      ) : (
        <div className="mx-5 mt-5 py-4 px-5 rounded-md bg-bg-card border border-border text-center">
          <p className="font-ui text-xs tracking-[0.2em] uppercase text-muted">No winner — all players DNF</p>
        </div>
      )}

      {/* Read-only scorecard */}
      <div className="flex-1 overflow-x-auto mt-6">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-card">
              <th className="py-2 px-3 text-left font-ui text-xs tracking-[0.12em] uppercase text-muted w-12">
                Hole
              </th>
              {game.players.map(player => (
                <th
                  key={player}
                  className={[
                    'py-2 px-3 text-center font-ui text-xs tracking-[0.12em] uppercase max-w-[90px]',
                    isWinner(player) ? 'text-accent font-semibold' : 'text-muted',
                  ].join(' ')}
                >
                  <span className="block truncate">{player}</span>
                  {isDnf(player) && <span className="block text-muted normal-case tracking-normal font-normal">DNF</span>}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: game.holes }, (_, holeIndex) => (
              <tr key={holeIndex} className="border-b border-border">
                <td className="py-2 px-3 font-ui text-xs text-muted">{holeIndex + 1}</td>
                {game.players.map(player => {
                  const score = game.scores[player]?.[holeIndex]
                  return (
                    <td
                      key={player}
                      className={[
                        'py-2 px-3 text-center font-ui text-sm',
                        isWinner(player) ? 'text-accent font-medium' : 'text-text',
                      ].join(' ')}
                    >
                      {score ?? '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-bg-card border-t-2 border-border">
              <td className="py-3 px-3 font-ui text-xs tracking-[0.12em] uppercase text-muted">Total</td>
              {game.players.map(player => (
                <td
                  key={player}
                  className={[
                    'py-3 px-3 text-center font-ui text-base font-semibold',
                    isWinner(player) ? 'text-accent' : 'text-text',
                  ].join(' ')}
                >
                  {playerTotal(game.scores, player) || '—'}
                  {isDnf(player) && <span className="block font-ui text-xs font-normal text-muted">DNF</span>}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Back to home */}
      <div className="px-5 py-8">
        <button
          onClick={() => navigate('home')}
          className="w-full py-4 rounded-md bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn max-w-sm mx-auto block"
        >
          Back to Home
        </button>
      </div>

    </div>
  )
}
