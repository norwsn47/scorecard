// `backLabel` is the exact text rendered in the back button, arrow prefix
// included when the action steps back through history (e.g. "← Home",
// "← Rounds"), omitted when it doesn't (e.g. "Quit" on the live Scorecard,
// which ends the round rather than navigating back). Callers own the full
// string so the label can always name the real destination or action —
// see DESIGN.md "Navigation".
export default function PageHeader({ title, subtitle, onBack, backLabel = '← Back', right = null }) {
  return (
    <header className="relative flex items-center justify-between px-5 pt-10 pb-4 border-b border-border shrink-0">
      <div className="relative shrink-0 z-10 min-w-0 max-w-[72px]">
        {onBack && (
          <button
            onClick={onBack}
            className="w-full py-3 min-h-[44px] flex items-center text-muted font-ui text-sm tracking-[0.08em] uppercase truncate"
          >
            {backLabel}
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 text-center px-20 pointer-events-none">
        <h1 className="font-display italic text-2xl text-text truncate">{title}</h1>
        {subtitle && (
          <p className="font-ui text-xs tracking-[0.08em] uppercase text-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      <div className="relative shrink-0 z-10 flex justify-end">
        {right}
      </div>
    </header>
  )
}
