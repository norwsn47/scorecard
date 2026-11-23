import { useEffect, useRef } from 'react'

// Dialog focus handling for a bottom sheet (DESIGN.md "Bottom sheet /
// confirmation modal"): on open, remember the opener and move focus in (to
// `initialFocus()` if it returns an element, else the sheet itself); Escape
// closes; Tab and Shift+Tab are trapped inside the sheet; on close, focus goes
// back to the opener. Keyed on mount only, so mount the sheet to open it and
// unmount it to close it. `onClose` is read through a ref, so a parent
// re-render with a new function never re-runs the open effect.
//
// Shared by FilterSheet and FilterMenu.

const FOCUSABLE = [
  'button:not([disabled])', '[href]', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]',
].map(s => `${s}:not([tabindex="-1"])`).join(', ')

export default function useSheetFocus(sheetRef, onClose, initialFocus) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const initialRef = useRef(initialFocus)
  initialRef.current = initialFocus

  useEffect(() => {
    const opener = document.activeElement
    const target = initialRef.current?.()
    if (target) target.focus()
    else sheetRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet) return
      const focusable = [...sheet.querySelectorAll(FOCUSABLE)]
      if (focusable.length === 0) {
        e.preventDefault()
        sheet.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!sheet.contains(active)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The one close path for backdrop taps and choices.
  return () => onCloseRef.current()
}
