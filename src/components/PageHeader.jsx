// `backLabel` is the plain text of the back button: the destination ("Home",
// "History") or, for a non-back action, the action ("Pause" on the live
// Scorecard, which leaves the round intact rather than navigating back). It
// is also the button's accessible name. The chevron is drawn by the header
// (aria-hidden), not typed into the label; pass `backChevron={false}` for an
// action that does not step back through history (Pause). Back/right labels
// never truncate and never wrap — if a destination's real name is too long
// to fit (e.g. "Bruntsfield"), the fix is a shorter accurate word
// ("Course"), not clipped text.
//
// Frame (redesign stage 4, c02-c04): 68px bar (`min-h-[4.25rem]`: a minimum
// so a two-line title plus a subtitle grows it rather than clipping), `px-page`
// (16px), `border-b`, title in `type-title`. The back button is muted
// `type-small-strong` with a chevron. Right-slot actions use the exported
// `HeaderAction`: a text action by default, a filled pill only when the
// action is the expected next step (`filled`).
//
// The header is three flex slots on one row — left, centre, right — with no
// absolute positioning. The side slots size to their content and never
// shrink; the centre slot takes whatever width they leave (`flex-1
// min-w-0`). Its <h1> wraps onto a second line rather than clipping (up to
// two lines, `line-clamp-2` — a long course name reads in full instead of
// ending in an ellipsis, #87); the subtitle stays a single truncated line.
// Because the centre sits between the two side slots rather than on a layer
// above them, a long back label can never fall under a button — instead it
// eats into the centre title's width, so a back label should be
// one plain word, two at most (DESIGN.md "Back-label length").
//
// Invisible mirror: when the centre slot has content (a title or a
// subtitle), each side slot also holds an aria-hidden, invisible copy of the
// other side's node, stacked in the same grid cell. Both side slots are then
// as wide as the wider of the two, so the title sits at the true centre of
// the header on every screen, even when both sides carry different-width
// content (Pause and Finish on Scorecard) or the right action changes width
// (Finish becoming the filled pill).
//
// `title` is optional (falsy skips the <h1> entirely, not just leaves it
// empty) so a caller like Summary — whose title is a course name that can
// be missing — doesn't reserve a blank line above its subtitle (#69).
//
// `bare` (Login only) drops the border and the boxed vertical padding and
// renders the back slot alone — the borderless "back link floating above a
// large editorial heading" pattern Home uses.
const ACTION_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

// Right-slot (or left-slot) action, Figma "App bar action" (c04). Text by
// default: accent label, no border at rest, rounded-control tint on hover and
// press, 44px tap target. `filled` is the pill for the expected next step
// (Finish once every hole is scored). `-mr-3` pulls the label's ink back onto
// the page padding, so the action's tap area (not its text) carries the inset.
export function HeaderAction({ filled = false, className = '', children, type = 'button', ...rest }) {
  const look = filled
    ? 'px-4 rounded-full border-2 border-transparent bg-accent text-on-accent enabled:hover:bg-accent-hover enabled:active:bg-accent-hover ' +
      'disabled:bg-disabled-surface disabled:text-disabled-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
    : '-mr-3 px-3 rounded-control border-2 border-transparent bg-transparent text-accent enabled:hover:bg-accent-tint enabled:active:bg-accent-tint-hover ' +
      'disabled:bg-transparent disabled:text-disabled-text'
  return (
    <button
      type={type}
      className={['min-h-11 inline-flex items-center justify-center whitespace-nowrap type-small-strong transition-colors disabled:cursor-not-allowed', look, ACTION_FOCUS, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}

// Left chevron, house icon style (stroke, round caps). Decorative.
function BackChevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

export default function PageHeader({ title, subtitle, onBack, backLabel = 'Back', backChevron = true, right = null, bare = false }) {
  // Muted at rest; text turns accent in the same states the tint appears, so
  // muted text is never drawn on the 8% tint (fails AA).
  const backButton = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className={[
        'min-h-11 -ml-2 pl-2 pr-3 inline-flex items-center gap-1 whitespace-nowrap rounded-control border-2 border-transparent',
        'text-muted type-small-strong transition-colors',
        'hover:bg-accent-tint hover:text-accent active:bg-accent-tint-hover active:text-accent',
        ACTION_FOCUS,
      ].join(' ')}
    >
      {backChevron ? <BackChevron /> : null}
      {backLabel}
    </button>
  ) : null

  if (bare) {
    return (
      <header className="flex items-center px-page pt-3 shrink-0">
        {backButton}
      </header>
    )
  }

  const mirror = node => (
    <div aria-hidden="true" className="invisible pointer-events-none [grid-area:1/1]">{node}</div>
  )

  // Only mirror when the centre slot has something to centre (title or
  // subtitle). Each side then reserves the other side's width as well.
  const centred = Boolean(title || subtitle)
  const side = (own, other, align) => (
    <div className={`shrink-0 grid ${align}`}>
      {own ? <div className="[grid-area:1/1] flex">{own}</div> : null}
      {centred && other ? mirror(other) : null}
    </div>
  )

  return (
    <header className="flex items-center gap-3 px-page min-h-[4.25rem] border-b border-border shrink-0">
      {side(backButton, right, 'justify-items-start')}

      <div className="flex-1 min-w-0 text-center">
        {title ? (
          <h1 className="type-title text-text line-clamp-2">{title}</h1>
        ) : null}
        {subtitle && (
          <p className="type-caption text-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {side(right, backButton, 'justify-items-end')}
    </header>
  )
}
