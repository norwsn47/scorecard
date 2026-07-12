import { useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import RulesContent from './RulesContent.jsx'

export default function CourseMapModal({ onClose }) {
  const [showRules, setShowRules] = useState(false)

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
            {showRules ? 'Course Rules' : 'Bruntsfield Links'}
          </p>
          <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-0.5">
            {showRules ? 'Bruntsfield Links' : 'Course Map'}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center text-muted active:text-text"
          >
            ✕
          </button>
        </div>

        {/* Map view */}
        {!showRules && (
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
                src="/course_map_v2.png"
                alt="Bruntsfield Links course map"
                className="w-full block"
              />
            </TransformComponent>
          </TransformWrapper>
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
            className="font-ui text-xs text-accent underline underline-offset-2 active:text-text"
          >
            {showRules ? '← Back to map' : 'Course rules'}
          </button>
        </div>
      </div>
    </div>
  )
}
