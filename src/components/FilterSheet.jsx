import { useEffect, useId, useRef } from 'react'

// Bottom-sheet picker for one History filter (Figma "History / picker open",
// 17-history-picker-open.png; rows follow the List row, c15). Single choice:
// an "All ..." row first, then one row per option, the chosen row in accent
// text with a check mark and no tint. Choosing a row applies it and closes the
// sheet (the PNG shows no Done button).
//
//   <FilterSheet
//     title="Course"
//     allLabel="All courses"
//     allCount={5}
//     options={[{ value: 'Swanston Full', label: 'Swanston Full', count: 2 }]}
//     selected={null}               // the chosen option's value, or null for "All"
//     onSelect={value => ...}       // value, or null when "All ..." is chosen
//     onClose={() => ...}           // asked to close (Escape, backdrop, after a choice)
//   />
//
// An option may carry `suffix`, a node shown after the label (History passes the
// signed-in star). Mount it to open it, unmount it to close it.
//
// Dialog semantics follow DESIGN.md "Bottom sheet / confirmation modal": role,
// aria-modal, aria-labelledby on the sheet, focus moved in on open (the chosen
// row), Escape and backdrop dismiss, focus handed back to the opener, every
// close path through the one `close` function. On top of that it traps Tab and
// Shift+Tab inside the sheet.
//
// The rows are a radiogroup with a roving tabindex: Tab reaches the chosen row,
// the arrow keys (and Home and End) move focus between rows without choosing,
// and Enter or Space chooses. (Arrow keys do not choose, as they would in a bare
// radiogroup, because choosing closes the sheet.)

const FOCUSABLE = [
  'button:not([disabled])', '[href]', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]',
].map(s => `${s}:not([tabindex="-1"])`).join(', ')

const countLabel = n => `${n} ${n === 1 ? 'round' : 'rounds'}`

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-5 h-5 shrink-0 text-accent"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export default function FilterSheet({ title, allLabel, allCount, options, selected, onSelect, onClose }) {
  const headingId = useId()
  const sheetRef = useRef(null)
  const listRef = useRef(null)
  // Read through a ref so a parent re-render with a new function never
  // re-runs the open effect (which would pull focus back in).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // The one close path: backdrop, Escape and a chosen row all come through here.
  function close() {
    onCloseRef.current()
  }
  const closeRef = useRef(close)
  closeRef.current = close

  function choose(value) {
    onSelect(value)
    closeRef.current()
  }

  // Open effect, keyed on mount (= open) only: remember the opener, move focus
  // to the chosen row, listen for Escape and Tab, then hand focus back.
  useEffect(() => {
    const opener = document.activeElement
    const rows = listRef.current?.querySelectorAll('[role="radio"]')
    const target = listRef.current?.querySelector('[role="radio"][aria-checked="true"]') ?? rows?.[0]
    if (target) target.focus()
    else sheetRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
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
  }, [])

  function onRowKeyDown(e) {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const rows = [...listRef.current.querySelectorAll('[role="radio"]')]
    const i = rows.indexOf(document.activeElement)
    if (i === -1) return
    e.preventDefault()
    let next = i
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % rows.length
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + rows.length) % rows.length
    else if (e.key === 'Home') next = 0
    else next = rows.length - 1
    // Roving tabindex follows focus, so Tab and Shift+Tab always find the row.
    rows.forEach((row, n) => { row.tabIndex = n === next ? 0 : -1 })
    rows[next].focus()
  }

  const rowsData = [
    { value: null, label: allLabel, count: allCount, suffix: null },
    ...options,
  ]
  const isAll = selected === null || selected === undefined

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
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
        className="bg-bg rounded-t-sheet w-full max-w-[430px] max-h-[85vh] flex flex-col px-page pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] focus:outline-none"
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-group shrink-0" />
        <h2 id={headingId} className="type-title text-text mb-related shrink-0">{title}</h2>
        <div
          ref={listRef}
          role="radiogroup"
          aria-labelledby={headingId}
          onKeyDown={onRowKeyDown}
          className="min-h-0 overflow-y-auto -mx-3"
        >
          {rowsData.map((row, i) => {
            const checked = i === 0 ? isAll : selected === row.value
            // One tab stop: the chosen row (the "All" row when nothing is chosen).
            const tabStop = checked
            return (
              <button
                key={i === 0 ? '__all__' : row.value}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={tabStop ? 0 : -1}
                onClick={() => choose(row.value)}
                className={[
                  // px-3 inside a list pulled out by -mx-3: the keyboard focus
                  // ring gets breathing room round the text while the text and
                  // the hairline (drawn inset by the after: rule) stay on the
                  // page edge.
                  'relative w-full min-h-11 py-group px-3 rounded-control flex items-center justify-between gap-group text-left',
                  "after:content-[''] after:absolute after:left-3 after:right-3 after:bottom-0 after:h-px after:bg-border type-body transition-colors",
                  'active:bg-accent-tint',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                  checked ? 'text-accent' : 'text-text',
                ].join(' ')}
              >
                <span className="min-w-0 break-words">
                  {row.label}
                  {row.suffix}
                </span>
                <span className="shrink-0 flex items-center gap-related">
                  <span className="text-muted">{countLabel(row.count)}</span>
                  {checked && <Check />}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
