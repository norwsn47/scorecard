// `backLabel` is the exact text rendered in the back button, arrow prefix
// included when the action steps back through history (e.g. "← Home",
// "← Rounds"), omitted when it doesn't (e.g. "Pause" on the live Scorecard,
// which leaves the round intact rather than navigating back). Callers own
// the full string so the label can always name the real destination or
// action — see DESIGN.md "Navigation". Back/right labels never truncate and
// never wrap — if a destination's real name is too long to fit (e.g.
// "Bruntsfield"), the fix is a shorter accurate word ("Course"), not
// clipped text.
//
// The header is three flex slots on one row — left, centre, right — with no
// absolute positioning. The side slots size to their content and never
// shrink; the centre slot takes whatever width they leave (`flex-1
// min-w-0`) and truncates its <h1> and subtitle into it. Because the centre
// sits between the two side slots rather than on a layer above them, a long
// back label can never fall under a button — instead it eats into the
// centre title's width, so a back label should stay within about 12
// characters including the arrow and its space (DESIGN.md "Back-label
// length budget").
//
// Invisible mirror: when the centre slot has content (a title or a
// subtitle) and exactly one side slot has real content, the empty slot
// renders an aria-hidden, invisible copy of the other side's node. The two
// side slots are then equal width, so the centre text sits centred on the
// header rather than merely in the gap between buttons.
//
// `title` is optional (falsy skips the <h1> entirely, not just leaves it
// empty) so a caller like Summary — whose title is a course name that can
// be missing — doesn't reserve a blank line above its subtitle (#69).
//
// `bare` (Login only) drops the border and the boxed vertical padding and
// renders the back slot alone — the borderless "back link floating above a
// large editorial heading" pattern Home uses.
export default function PageHeader({ title, subtitle, onBack, backLabel = '← Back', right = null, bare = false }) {
  const backButton = onBack ? (
    <button
      onClick={onBack}
      className="py-3 min-h-[44px] flex items-center whitespace-nowrap text-muted font-ui text-sm tracking-[0.08em] uppercase active:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {backLabel}
    </button>
  ) : null

  if (bare) {
    return (
      <header className="flex items-center px-4 pt-3 shrink-0">
        {backButton}
      </header>
    )
  }

  const mirror = node => (
    <div aria-hidden="true" className="invisible pointer-events-none">{node}</div>
  )

  const hasBack   = Boolean(onBack)
  const hasRight  = Boolean(right)
  // Only mirror when the centre slot has something to centre (title or
  // subtitle) and exactly one side carries real content.
  const showMirror = Boolean(title || subtitle) && hasBack !== hasRight

  return (
    <header className="flex items-center gap-3 px-5 pt-10 pb-4 border-b border-border shrink-0">
      <div className="shrink-0 flex justify-start">
        {backButton || (showMirror && !hasBack ? mirror(right) : null)}
      </div>

      <div className="flex-1 min-w-0 text-center">
        {title ? (
          <h1 className="font-display italic text-2xl text-text truncate">{title}</h1>
        ) : null}
        {subtitle && (
          <p className="font-ui text-xs tracking-[0.08em] uppercase text-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      <div className="shrink-0 flex justify-end">
        {right || (showMirror && !hasRight ? mirror(backButton) : null)}
      </div>
    </header>
  )
}
