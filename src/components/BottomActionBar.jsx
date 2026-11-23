// The bottom action bar. Figma "Bottom action bar": a hairline across the
// top, the page background behind, the primary action (or a Cancel and Save
// pair) in the thumb zone, then the home-indicator space. No shadow.
//
// It is the last child of a page's flex column (`h-full flex flex-col`), after
// the scroll area, and never shrinks. Being in the flow, rather than
// position: fixed, means it can never cover the last field, it stays inside the
// desktop phone frame, and when the iOS keyboard opens it simply stays at the
// bottom of the layout (under the keyboard) while the focused field scrolls
// into view in the scroll area above it.
//
// Bottom padding is the bar's own gap plus the iOS safe area, so the button
// clears the home indicator. `env()` is 0 on desktop and in the frame.
//
// className is for layout only. children is whatever the bar holds: a Button,
// a two-column grid of Buttons, and any small text that belongs with them.

export default function BottomActionBar({ className = '', children, ...rest }) {
  return (
    <div
      data-bottom-action-bar=""
      className={[
        'shrink-0 w-full bg-bg border-t border-border px-page pt-group',
        'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
