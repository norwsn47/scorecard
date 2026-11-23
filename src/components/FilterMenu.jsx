import { useId, useRef } from 'react'
import Button from './Button.jsx'
import useSheetFocus from '../hooks/useSheetFocus.js'

// "Filter rounds" bottom sheet, opened by History's floating filter button
// (DESIGN.md "History filter button"). One row per filter that has something
// to pick ("Course", "Player"), each showing its current value; a row opens
// that filter's picker (FilterSheet). "Clear filters" appears once anything is
// applied. Same sheet shell and dialog behaviour as FilterSheet.
//
//   <FilterMenu
//     rows={[{ key: 'course', label: 'Course', value: 'All courses', applied: false }]}
//     onPick={key => ...}     // open that filter's picker
//     onClear={() => ...}     // shown when any row is applied
//     onClose={() => ...}
//   />

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="w-4 h-4 shrink-0 text-muted">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export default function FilterMenu({ rows, onPick, onClear, onClose }) {
  const headingId = useId()
  const sheetRef = useRef(null)
  const listRef = useRef(null)
  const close = useSheetFocus(sheetRef, onClose, () => listRef.current?.querySelector('button'))
  const anyApplied = rows.some(r => r.applied)

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
        className="bg-bg rounded-t-sheet w-full max-w-[430px] flex flex-col px-page pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] focus:outline-none"
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-group shrink-0" />
        <h2 id={headingId} className="type-title text-text mb-related">Filter rounds</h2>
        <div ref={listRef} className="-mx-3">
          {rows.map(row => (
            <button
              key={row.key}
              type="button"
              onClick={() => onPick(row.key)}
              aria-label={`${row.label}: ${row.value}`}
              className={[
                'relative w-full min-h-11 py-group px-3 rounded-control flex items-center justify-between gap-group text-left type-body',
                "after:content-[''] after:absolute after:left-3 after:right-3 after:bottom-0 after:h-px after:bg-border",
                'active:bg-accent-tint transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
              ].join(' ')}
            >
              <span className="text-text shrink-0">{row.label}</span>
              <span className="min-w-0 flex items-center gap-related">
                <span className={`truncate ${row.applied ? 'text-accent' : 'text-muted'}`}>{row.value}</span>
                <Chevron />
              </span>
            </button>
          ))}
        </div>
        {anyApplied && (
          <Button variant="text" size="medium" className="self-start -ml-4 mt-related" onClick={() => { onClear(); close() }}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
