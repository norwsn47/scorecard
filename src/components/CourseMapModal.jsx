import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

export default function CourseMapModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-5"
      style={{ background: 'var(--overlay-modal)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl overflow-hidden w-[360px] shadow-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <p className="font-display italic text-xl text-text leading-tight">Bruntsfield Links</p>
          <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-0.5">Course Map</p>
        </div>

        {/* Map image — pinch to zoom */}
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
