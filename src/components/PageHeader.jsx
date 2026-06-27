export default function PageHeader({ title, onBack, right = null }) {
  return (
    <header className="relative flex items-center px-5 pt-12 pb-6 border-b border-border shrink-0">
      <div className="flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="py-2 text-muted font-ui text-sm tracking-[0.08em] uppercase"
          >
            ← Back
          </button>
        )}
      </div>

      <h1 className="absolute inset-x-0 text-center font-display italic text-2xl text-text pointer-events-none">
        {title}
      </h1>

      <div className="flex-1 flex justify-end">
        {right}
      </div>
    </header>
  )
}
