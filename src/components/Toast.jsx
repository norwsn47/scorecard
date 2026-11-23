// Floating message pill (DESIGN.md "Toast"). Replaces the full-width banners
// that used to sit at the top of the screen. It floats over the page, inset by
// the page margin, near the bottom of the screen where the eye already is.
//
//   <Toast tone="error" onDismiss={() => ...} className="bottom-6">
//     Couldn't save - storage may be full
//   </Toast>
//
// The parent must be positioned (relative or absolute) and gives the bottom
// offset through `className`, because each screen has a different bottom
// zone to clear (the Scorecard's round controls, Home's footer).
//
// tone: 'error' (error red, role="alert") for failures, 'notice' (accent
// green, role="status") for good or neutral news. Both carry white text
// (6.9:1 on error, 11.2:1 on accent). The message is the live region; the
// dismiss button sits outside it so a screen reader reads the message, not
// the control. Nothing auto-dismisses: an error must not vanish before it is
// read.

export default function Toast({ tone = 'error', onDismiss, className = '', children }) {
  const fill = tone === 'error' ? 'bg-error' : 'bg-accent'
  return (
    <div
      className={`absolute inset-x-page z-40 flex items-center gap-related rounded-control ${fill} text-on-accent pl-4 ${onDismiss ? 'pr-0' : 'pr-4'} ${className}`}
    >
      <p role={tone === 'error' ? 'alert' : 'status'} className="flex-1 min-w-0 py-3 type-small">
        {children}
      </p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-accent"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="w-4 h-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  )
}
