export default function App() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-xs w-full">

        {/* Decorative rule */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-accent text-xs tracking-[0.2em] uppercase font-ui">Est. 1456</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Logo / name */}
        <h1 className="font-display text-5xl italic text-text leading-tight mb-1">
          The Golf Tavern
        </h1>
        <p className="font-ui text-xs tracking-[0.25em] uppercase text-muted mt-3">
          Bruntsfield Links · Edinburgh
        </p>

        {/* Accent bar */}
        <div className="w-10 h-0.5 bg-accent mx-auto mt-6 mb-8" />

        <p className="font-ui text-xs tracking-[0.2em] uppercase text-muted">
          Scorecard
        </p>

        {/* Bottom rule */}
        <div className="h-px bg-border mt-8" />
      </div>
    </div>
  )
}
