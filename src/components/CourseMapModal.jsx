import { useCallback, useState } from 'react'
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'var(--overlay-modal)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl w-[360px] shadow-card overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-border shrink-0">
          <p className="font-display italic text-xl text-text leading-tight">
            {BRUNTSFIELD_COURSE_NAME}
          </p>
          <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-0.5">
            {showRules ? 'Course Rules' : 'Course Map'}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-1.5 right-2.5 w-11 h-11 flex items-center justify-center text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            ✕
          </button>
        </div>

        {/* Map view */}
        {!showRules && mapState === 'error' && (
          <div className="flex items-center justify-center min-h-[240px] px-5 text-center">
            <p className="font-ui text-xs text-accent tracking-wide">
              The course map couldn't load. Check your connection and reopen this.
            </p>
          </div>
        )}

        {!showRules && mapState !== 'error' && (
          <div className="relative min-h-[240px]">
            {mapState !== 'loaded' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="font-ui text-sm text-muted">Loading map…</p>
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
                  src="/course_map_v2.png"
                  alt={`${BRUNTSFIELD_COURSE_NAME} course map`}
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
          <button
            onClick={() => setShowRules(r => !r)}
            className="inline-block py-2.5 -my-2.5 font-ui text-xs text-accent underline underline-offset-2 active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {showRules ? '← Back to map' : 'Course rules'}
          </button>
        </div>
      </div>
    </div>
  )
}
