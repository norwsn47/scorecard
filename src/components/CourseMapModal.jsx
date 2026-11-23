import { useCallback, useEffect, useRef, useState } from 'react'
import Button from './Button.jsx'
import { BRUNTSFIELD_COURSE_NAME } from '../constants.js'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import RulesContent from './RulesContent.jsx'

export default function CourseMapModal({ onClose }) {
  const [showRules, setShowRules] = useState(false)
  // 'loading' until the map image resolves — an instant placeholder fills the
  // space so the modal doesn't open empty, then swaps for the map on load or
  // an error message if it fails.
  const [mapState, setMapState] = useState('loading')

  // The modal is remounted on every open, so a cached image can finish loading
  // before React attaches onLoad — catch that here (complete + a real
  // naturalWidth means it decoded, not errored) so the placeholder never sticks.
  const imgRef = useCallback(node => {
    if (node && node.complete) {
      setMapState(node.naturalWidth > 0 ? 'loaded' : 'error')
    }
  }, [])

  // Dialog behaviour (#100, DESIGN.md "Dialog semantics"): focus the Close
  // button on open, hand focus back to whatever opened the modal when it
  // unmounts, and let Escape close it. Backdrop click is on the overlay below.
  // `onClose` is a fresh function every parent render, so it is read through a
  // ref: the effect below must run once per open, not once per parent render
  // (which would keep re-grabbing focus).
  const closeButtonRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  useEffect(() => {
    const opener = document.activeElement
    closeButtonRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'var(--overlay-modal)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-map-heading"
        className="bg-bg rounded-sheet w-[360px] overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-border shrink-0">
          <p id="course-map-heading" className="type-title text-text">
            {BRUNTSFIELD_COURSE_NAME}
          </p>
          <p className="type-label-caps text-muted mt-0.5">
            {showRules ? 'Course rules' : 'Winter course map'}
          </p>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="absolute top-1.5 right-2.5 w-11 h-11 flex items-center justify-center text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ✕
          </button>
        </div>

        {/* Map view */}
        {!showRules && mapState === 'error' && (
          <div className="flex items-center justify-center min-h-[240px] px-5 text-center">
            <p className="type-small text-error">
              The course map couldn't load. Check your connection and reopen this.
            </p>
          </div>
        )}

        {!showRules && mapState !== 'error' && (
          // The min-height only holds space for the loading placeholder - once
          // the map has loaded, the box fits the image so a wide map leaves no gap.
          <div className={`relative ${mapState === 'loaded' ? '' : 'min-h-[240px]'}`}>
            {mapState !== 'loaded' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="type-small text-muted">Loading map…</p>
              </div>
            )}
            <TransformWrapper
              minScale={1}
              maxScale={4}
              doubleClick={{ mode: 'reset' }}
            >
              <TransformComponent
                wrapperStyle={{ width: '100%', display: 'block' }}
                contentStyle={{ width: '100%' }}
              >
                <img
                  ref={imgRef}
                  src="/course_map_winter.jpg"
                  alt={`${BRUNTSFIELD_COURSE_NAME} 9-hole winter course map`}
                  className={`w-full block transition-opacity ${mapState === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setMapState('loaded')}
                  onError={() => setMapState('error')}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        )}

        {/* Rules view */}
        {showRules && (
          <div className="overflow-y-auto px-5 py-4 flex-1">
            <RulesContent />
          </div>
        )}

        {/* Footer toggle */}
        <div className="border-t border-border px-5 py-3 shrink-0">
          <Button
            variant="text"
            size="medium"
            className="-ml-4"
            onClick={() => setShowRules(r => !r)}
            leadingIcon={showRules ? (
              // Same chevron as the PageHeader back button (stage 8).
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            ) : null}
          >
            {showRules ? 'Back to map' : 'Course rules'}
          </Button>
        </div>
      </div>
    </div>
  )
}
