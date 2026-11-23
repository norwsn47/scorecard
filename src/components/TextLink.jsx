import { forwardRef } from 'react'
import ExternalArrow from './ExternalArrow.jsx'

// The app's text link (DESIGN.md "Text links"): underlined, accent or muted,
// pressed at 70% opacity, a solid accent focus ring with the control radius.
// One component so the ~15 links across the app cannot drift apart.
//
//   <TextLink onClick={...}>Edit game setup</TextLink>          a <button>
//   <TextLink href="mailto:...">scorecard@outbuild.uk</TextLink> an <a>
//   <TextLink href="https://..." external>outbuild.uk</TextLink> new tab, ↗
//
// size:  'body' | 'small' | 'small-strong' | undefined (inherit the text around it)
// tone:  'accent' (default) | 'muted'
// pad:   'md'   py-3 -my-3, a ~44px tap area with no visible spacing (default)
//        'lg'   py-3.5 -my-3.5, for a small link on a line of its own
//        'none' a link inside a sentence (inline, no extra tap area)
// external: adds the ↗ arrow; on an href it also opens a new tab (target, rel).
// The ref goes to the rendered element (Summary hands focus back to its link).
const SIZE = { body: 'type-body', small: 'type-small', 'small-strong': 'type-small-strong' }
const TONE = { accent: 'text-accent', muted: 'text-muted' }
const PAD = { md: 'py-3 -my-3', lg: 'py-3.5 -my-3.5', none: '' }

const TextLink = forwardRef(function TextLink({ href, external = false, size, tone = 'accent', pad = 'md', className = '', children, ...rest }, ref) {
  const layout = external ? 'inline-flex items-center gap-1' : pad === 'none' ? 'inline' : 'inline-block'
  const cls = [
    layout, PAD[pad], size ? SIZE[size] : '', TONE[tone],
    'underline underline-offset-2 rounded-control active:opacity-70',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    className,
  ].filter(Boolean).join(' ')

  if (href) {
    const ext = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
    return (
      <a ref={ref} href={href} {...ext} className={cls} {...rest}>
        {children}
        {external && <ExternalArrow />}
      </a>
    )
  }
  return (
    <button ref={ref} type="button" className={cls} {...rest}>
      {children}
      {external && <ExternalArrow />}
    </button>
  )
})

export default TextLink
