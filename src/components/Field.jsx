import { forwardRef, useId } from 'react'

// The one form field. Figma "Input", "Select field", "Date field" and
// "Textarea" (c05 to c08): a visible label above, the control, then optional
// helper or error text below. Edge, fill, radius, focus ring and disabled
// treatment all come from tokens.
//
// Exports: Input, Select, DateField, Textarea. All forward their ref to the
// native control, so focus management (autoFocus, ref.current.focus()) works
// as it did on the bare element.
//
// className is for layout of the wrapper only (flex-1, min-w-0, mt-2).
//
// Every field keeps a real accessible name: the label is tied to the control
// with htmlFor/id. Where the visible label is deliberately left out (Setup
// player rows sit under a "Players" heading), pass hideLabel: the label stays
// in the DOM, visually hidden, and still names the control.

const CONTROL_BASE =
  'block w-full min-w-0 py-3 pl-4 rounded-control border type-body ' +
  'bg-bg-card text-text placeholder:text-muted ' +
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent ' +
  'disabled:bg-disabled-surface disabled:border-border disabled:text-disabled-text ' +
  'disabled:placeholder:text-disabled-text disabled:cursor-not-allowed'

const Field = forwardRef(function Field(
  {
    as: Tag = 'input',
    label,
    hideLabel = false,
    optional = false,
    helper,
    error,
    errorRole = 'alert',
    trailing = null,
    className = '',
    id: idProp,
    disabled,
    'aria-describedby': describedByProp,
    children,
    ...rest
  },
  ref,
) {
  const autoId = useId()
  const id = idProp || autoId
  const helperId = `${id}-helper`
  const errorId = `${id}-error`
  const optionalId = `${id}-optional`

  // `error` is a message (string or node) or plain `true` for an edge-only
  // error whose message lives elsewhere.
  const hasError = Boolean(error)
  const errorMessage = error === true ? null : error
  const hasHelper = Boolean(helper) && !errorMessage

  const describedBy =
    [
      describedByProp,
      optional ? optionalId : null,
      hasHelper ? helperId : null,
      errorMessage ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined

  const isSelect = Tag === 'select'
  const controlClasses = [
    CONTROL_BASE,
    // Error takes Figma's error colour; the resting edge is the field-only token.
    hasError ? 'border-error' : 'border-field',
    Tag === 'textarea' ? 'resize-none' : '',
    // One right padding per control. pr-4 used to sit in the base string next
    // to pr-10 / pr-12, and Tailwind emits pr-4 later in the CSS, so it won and
    // a long select value ran under the chevron.
    isSelect ? 'appearance-none pr-10 truncate' : trailing ? 'pr-12' : 'pr-4',
  ]
    .filter(Boolean)
    .join(' ')

  const labelClasses = [
    'type-small-strong',
    disabled ? 'text-muted' : 'text-text',
    hideLabel ? 'sr-only' : 'block',
  ].join(' ')

  return (
    <div className={className || undefined}>
      {label && (
        <div className={hideLabel ? undefined : 'mb-1.5'}>
          <label htmlFor={id} className={labelClasses}>
            {label}
          </label>
          {optional && !hideLabel && (
            <span aria-hidden="true" className="type-small text-muted">
              {' '}- optional
            </span>
          )}
        </div>
      )}
      {optional && (
        <span id={optionalId} className="sr-only">
          Optional
        </span>
      )}

      <div className="relative">
        <Tag
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={controlClasses}
          {...rest}
        >
          {children}
        </Tag>
        {isSelect && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={[
              'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5',
              disabled ? 'text-disabled-text' : 'text-text',
            ].join(' ')}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
        {trailing}
      </div>

      {hasHelper && (
        <p
          id={helperId}
          className={['type-small mt-1.5', disabled ? 'text-disabled-text' : 'text-muted'].join(' ')}
        >
          {helper}
        </p>
      )}
      {errorMessage && (
        <p id={errorId} role={errorRole || undefined} className="type-small text-error mt-1.5">
          {errorMessage}
        </p>
      )}
    </div>
  )
})

export const Input = forwardRef(function Input({ type = 'text', ...props }, ref) {
  return <Field ref={ref} as="input" type={type} {...props} />
})

export const DateField = forwardRef(function DateField(props, ref) {
  return <Field ref={ref} as="input" type="date" {...props} />
})

export const Select = forwardRef(function Select(props, ref) {
  return <Field ref={ref} as="select" {...props} />
})

export const Textarea = forwardRef(function Textarea(props, ref) {
  return <Field ref={ref} as="textarea" {...props} />
})
