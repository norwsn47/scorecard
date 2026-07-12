export default function PageHeader({ title, subtitle, onBack, right = null }) {
  return (
    <header className="flex items-center gap-3 px-5 pt-10 pb-4 border-b border-border shrink-0">
      <div className="shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="py-3 min-h-[44px] flex items-center text-muted font-ui text-sm tracking-[0.08em] uppercase"
          >
            ← Back
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0 text-center">
        <h1 className="font-display italic text-2xl text-text truncate">{title}</h1>
        {subtitle && (
          <p className="font-ui text-xs tracking-[0.08em] uppercase text-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      <div className="shrink-0 flex justify-end">
        {right}
      </div>
    </header>
  )
}
