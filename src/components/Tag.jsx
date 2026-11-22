// Small status label (Figma Tag, accent type): History's "Not yet saved" and
// "Can't be saved" marker. Real text, so a screen reader reads it with the
// card it sits in. A floating label takes the full radius (design language 5).
//
// Accent text on the 8% accent tint: 8.89:1 over bg, 8.53:1 over bg-card
// (WCAG luminance), so it clears AA. Never put muted text on this fill: muted
// on it is 4.57:1 over bg and 4.39:1 over bg-card.
//
// className is for layout only (mb-2, self-start).
export default function Tag({ className = '', children, ...rest }) {
  const classes = [
    'inline-block rounded-full bg-accent-tint px-3 py-1 type-caption text-accent',
    className,
  ].filter(Boolean).join(' ')
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  )
}
