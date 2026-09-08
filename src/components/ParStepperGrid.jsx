// Shared two-column −/+ par stepper grid (DESIGN.md "Course-creation controls
// > Par stepper row"). Originally built inline for course creation
// (Setup.jsx "+ New course"); extracted (#54/#71) so course creation, course
// editing (CourseEdit.jsx) and round-level par correction (Setup.jsx
// editRound — PRD §11.13) all render and behave identically and can never
// drift apart. Callers own the heading above the grid — the wording differs
// by context ("Par for each hole" vs "Par for this round").

export const PAR_MIN = 2
export const PAR_MAX = 7

/**
 * Applies a bounded +/-1 step to one hole in a par array, clamped to the
 * 2–7 band (no wraparound). Returns a new array; does nothing at the edge.
 */
export function stepPar(pars, index, delta) {
  return pars.map((p, idx) => {
    if (idx !== index) return p
    const next = p + delta
    return next < PAR_MIN || next > PAR_MAX ? p : next
  })
}

export default function ParStepperGrid({ pars, onStep }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {pars.map((par, i) => {
        const atMin = par <= PAR_MIN
        const atMax = par >= PAR_MAX
        return (
          <div
            key={i}
            role="group"
            aria-label={`Hole ${i + 1}, par ${par}`}
            className="flex items-center justify-between rounded-md border border-border bg-bg-card pl-3 pr-0.5"
          >
            <span className="font-ui text-sm text-text">Hole {i + 1}</span>
            <span className="flex items-center">
              <button
                type="button"
                onClick={() => onStep(i, -1)}
                disabled={atMin}
                aria-label={`Decrease par for hole ${i + 1}`}
                className={[
                  'w-11 h-11 flex items-center justify-center rounded-md font-ui text-lg text-text active:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  atMin ? 'opacity-40' : '',
                ].join(' ')}
              >
                −
              </button>
              <span className="font-ui text-sm text-text w-4 text-center tabular-nums">{par}</span>
              <button
                type="button"
                onClick={() => onStep(i, 1)}
                disabled={atMax}
                aria-label={`Increase par for hole ${i + 1}`}
                className={[
                  'w-11 h-11 flex items-center justify-center rounded-md font-ui text-lg text-text active:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  atMax ? 'opacity-40' : '',
                ].join(' ')}
              >
                +
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
