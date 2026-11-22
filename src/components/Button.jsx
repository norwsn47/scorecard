import { forwardRef } from 'react'

// The one button. Figma "Button" (c01-button.png): Primary, Secondary and Text
// variants, Large and Medium sizes. Colours, radius and states come from the
// stage 1 tokens; there is no shadow. Labels are sentence case, type-strong.
//
// className is for layout only (flex-1, mt-4, shrink-0 and so on). Never
// restyle colour, radius or type through it.

const BASE =
  'inline-flex items-center justify-center gap-2 border rounded-control ' +
  'type-strong text-center transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
  'disabled:cursor-not-allowed'

// Sizes: tokens.json carries no button dimensions, so heights are an owner call
// (see handoff). Both keep the 44px minimum touch target.
const SIZES = {
  large: 'min-h-12 px-6 py-2',
  medium: 'min-h-11 px-4 py-2',
}

// Enabled and disabled treatments are kept apart: hover and pressed fills use
// the `enabled:` variant (written out in full so Tailwind can see each class)
// so a disabled button never picks one up.
const VARIANTS = {
  primary: {
    on: 'bg-accent border-transparent text-on-accent enabled:hover:bg-accent-hover enabled:active:bg-accent-hover',
    off: 'disabled:bg-disabled-surface disabled:border-transparent disabled:text-disabled-text',
  },
  secondary: {
    on: 'bg-transparent border-accent text-accent enabled:hover:bg-accent-tint enabled:active:bg-accent-tint-hover',
    off: 'disabled:bg-transparent disabled:border-disabled-text disabled:text-disabled-text',
  },
  text: {
    on: 'bg-transparent border-transparent text-accent enabled:hover:bg-accent-tint enabled:active:bg-accent-tint-hover',
    off: 'disabled:bg-transparent disabled:border-transparent disabled:text-disabled-text',
  },
}

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'large',
    type = 'button',
    fullWidth = false,
    leadingIcon = null,
    trailingIcon = null,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.large
  const classes = [BASE, s, v.on, v.off, fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} type={type} className={classes} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  )
})

export default Button
