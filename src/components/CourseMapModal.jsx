import { useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import RulesContent from './RulesContent.jsx'

export default function CourseMapModal({ onClose }) {
  const [showRules, setShowRules] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-5"
      style={{ background: 'var(--overlay-modal)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl w-[360px] shadow-card overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border shrink-0">
          <p className="font-display italic text-xl text-text leading-tight">Bruntsfield Links</p>
          <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-0.5">Course Map</p>
        </div>

        {/* Map — always visible */}
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

        {/* Rules toggle */}
        {showRules && (
          <div className="overflow-y-auto px-5 py-4 border-t border-border">
            <RulesContent />
          </div>
        )}

        {/* Rules link */}
        <div className="border-t border-border px-5 py-3 shrink-0">
          <button
            onClick={() => setShowRules(r => !r)}
            className="font-ui text-xs text-muted underline underline-offset-2 active:text-text"
          >
            {showRules ? 'Hide rules' : 'Course rules'}
          </button>
        </div>
      </div>

      {/* Close — floats below the modal */}
      <button
        onClick={onClose}
        aria-label="Close map"
        className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-500 text-white text-sm font-semibold active:bg-neutral-600"
      >
        ✕
      </button>
    </div>
  )
}
