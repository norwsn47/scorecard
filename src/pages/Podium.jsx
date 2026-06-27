import { getCompletedGames } from '../utils/storage.js'

function playerTotal(scores, player) {
  return (scores?.[player] ?? [])
    .filter(s => s !== null)
    .reduce((sum, s) => sum + s, 0)
}

function playerAverage(scores, player) {
  const scored = (scores?.[player] ?? []).filter(s => s !== null)
  if (scored.length === 0) return null
  return (scored.reduce((sum, s) => sum + s, 0) / scored.length).toFixed(1)
}

function ordinal(n) {
  const v = n % 100
  const suffix = n % 10 === 1 && v !== 11 ? 'st'
    : n % 10 === 2 && v !== 12 ? 'nd'
    : n % 10 === 3 && v !== 13 ? 'rd'
    : 'th'
  return `${n}${suffix}`
}

export default function Podium({ navigate, params }) {
  const game = params?.game ?? getCompletedGames()[0] ?? null

  if (!game) {
    navigate('home')
    return null
  }

  const dnf = game.dnf ?? []
  const finishers = (game.players ?? [])
    .filter(p => !dnf.includes(p))
    .map(p => ({ name: p, total: playerTotal(game.scores, p), avg: playerAverage(game.scores, p) }))
    .sort((a, b) => a.total - b.total)

  return (
    <div className="h-full bg-bg flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-10 pb-4 border-b border-border">
        <div>
          <p className="font-display italic text-lg text-text leading-tight">The Golf Tavern</p>
          <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-0.5">
            Bruntsfield Links
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">

        <p className="font-ui text-xs tracking-[0.2em] uppercase text-muted mb-2">
          Game Complete
        </p>
        <h1 className="font-display italic text-4xl text-text mb-2">
          Final Scores
        </h1>
        <div className="w-8 h-0.5 bg-accent mx-auto mb-10" />

        {/* Rankings */}
        <div className="w-full max-w-xs space-y-3">
          {finishers.length === 0 && (
            <p className="font-ui text-sm text-muted text-center">All players did not finish.</p>
          )}

          {finishers.map((player, i) => (
            <div
              key={player.name}
              className={[
                'flex items-center justify-between px-5 py-4 rounded-md border',
                i === 0
                  ? 'bg-accent border-accent'
                  : 'bg-bg-card border-border',
              ].join(' ')}
            >
              <div className="flex items-center gap-4">
                <span className={[
                  'font-ui text-xs tracking-widest uppercase w-8',
                  i === 0 ? 'text-bg/70' : 'text-muted',
                ].join(' ')}>
                  {ordinal(i + 1)}
                </span>
                <span className={[
                  'font-display italic text-2xl',
                  i === 0 ? 'text-bg' : 'text-text',
                ].join(' ')}>
                  {player.name}
                </span>
              </div>
              <div className="text-right">
                <span className={[
                  'font-ui text-lg font-semibold',
                  i === 0 ? 'text-white' : 'text-text',
                ].join(' ')}>
                  {player.total}
                </span>
                {player.avg !== null && (
                  <span className={[
                    'block font-ui text-xs font-normal',
                    i === 0 ? 'text-white/60' : 'text-muted',
                  ].join(' ')}>
                    Av. {player.avg}
                  </span>
                )}
              </div>
            </div>
          ))}

          {dnf.map(name => (
            <div
              key={name}
              className="flex items-center justify-between px-5 py-4 rounded-md border border-border bg-bg-card opacity-40"
            >
              <div className="flex items-center gap-4">
                <span className="font-ui text-xs tracking-widest uppercase w-8 text-muted">
                  DNF
                </span>
                <span className="font-display italic text-2xl text-text">{name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10">
        <button
          onClick={() => navigate('summary', { game })}
          className="w-full py-4 rounded-md border border-border text-text font-ui text-sm tracking-[0.1em] uppercase font-medium active:bg-bg-card"
        >
          See Full Scorecard
        </button>
      </div>

    </div>
  )
}
