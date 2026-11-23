import { useId, useRef } from 'react'
import useSheetFocus from '../hooks/useSheetFocus.js'

// The confirmation bottom sheet (DESIGN.md "Bottom sheet / confirmation
// modal"): Finish or Save on the Scorecard, Delete account in Settings, the
// course switch in Setup, Delete round on Summary, Delete course in Course
// edit. One shell for all of them, so they cannot drift apart.
//
//   <ConfirmSheet
//     title="Delete this round?"
//     onClose={() => ...}           // backdrop, Escape (not while `locked`)
//     locked={deleting}             // an action is in flight: no dismissal
//     initialFocusRef={cancelRef}   // focused on open (else the sheet)
//     returnFocusRef={openerRef}    // optional: where focus goes on close
//   >
//     body copy, fields, and the button pair
//   </ConfirmSheet>
//
// Mount it to open it, unmount it to close it. It is `absolute` inside the
// page's `relative` root, so on the desktop phone frame it stays inside the
// frame. Dialog behaviour (focus in, Escape, the Tab trap, focus return) comes
// from useSheetFocus. The bottom padding adds the safe-area inset so the
// buttons clear the iPhone home indicator.
export default function ConfirmSheet({ title, onClose, locked = false, initialFocusRef, returnFocusRef, children }) {
  const headingId = useId()
  const sheetRef = useRef(null)
  const close = useSheetFocus(
    sheetRef,
    () => { if (!locked) onClose() },
    () => initialFocusRef?.current,
    returnFocusRef,
  )

  return (
    <div
      className="absolute inset-0 flex items-end justify-center z-50"
      style={{ background: 'var(--overlay-backdrop)' }}
      onClick={close}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="bg-bg rounded-t-sheet w-full max-w-[430px] px-6 pt-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] focus:outline-none"
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
        <h2 id={headingId} className="type-title text-text mb-1">{title}</h2>
        {children}
      </div>
    </div>
  )
}
