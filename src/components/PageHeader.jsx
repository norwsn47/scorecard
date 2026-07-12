export default function PageHeader({ title, subtitle, onBack, right = null }) {
  return (
    <header className="relative flex items-center px-5 pt-page pb-6 border-b border-border shrink-0">
      <div className="flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="py-3 min-h-[44px] flex items-center text-muted font-ui text-sm tracking-[0.08em] uppercase"
          >
            ← Back
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 px-20 text-center pointer-events-none">
        <h1 className="font-display italic text-2xl text-text truncate">{title}</h1>
        {subtitle && (
          <p className="font-ui text-xs tracking-[0.08em] uppercase text-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex-1 flex justify-end">
        {right}
      </div>
    </header>
  )
}
