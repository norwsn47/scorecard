// `backLabel` is the exact text rendered in the back button, arrow prefix
// included when the action steps back through history (e.g. "← Home",
// "← Rounds"), omitted when it doesn't (e.g. "Pause" on the live Scorecard,
// which leaves the round intact rather than navigating back). Callers own
// the full string so the label can always name the real destination or
// action — see DESIGN.md "Navigation". Back/right labels never truncate —
// if a destination's real name is too long to fit (e.g. "Bruntsfield"),
// the fix is a shorter accurate word ("Course"), not clipped text — so
// `title`'s px-24 clearance is sized to comfortably fit the longest label
// in the app today ("← History" / "← Summary") in full.
export default function PageHeader({ title, subtitle, onBack, backLabel = '← Back', right = null }) {
  return (
    <header className="relative flex items-center justify-between px-5 pt-10 pb-4 border-b border-border shrink-0">
      <div className="relative shrink-0 z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="py-3 min-h-[44px] flex items-center whitespace-nowrap text-muted font-ui text-sm tracking-[0.08em] uppercase"
          >
            {backLabel}
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 text-center px-24 pointer-events-none">
        <h1 className="font-display italic text-2xl text-text truncate">{title}</h1>
        {subtitle && (
          <p className="font-ui text-xs tracking-[0.08em] uppercase text-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      <div className="relative shrink-0 z-10 flex justify-end whitespace-nowrap">
        {right}
      </div>
    </header>
  )
}
