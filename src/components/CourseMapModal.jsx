export default function CourseMapModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'var(--overlay-modal)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl overflow-hidden w-full max-w-[390px] shadow-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-display italic text-xl text-text leading-tight">Bruntsfield Links</p>
            <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-0.5">Course Map</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close map"
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted font-ui text-base active:bg-bg-card"
          >
            ✕
          </button>
        </div>

        {/* Map image with vignette */}
        <div className="relative overflow-hidden">
          <img
            src="/course-map.jpg"
            alt="Bruntsfield Links course map"
            className="w-full block"
          />
          {/* Vignette — fades edges to cream */}
          <div className="map-vignette absolute inset-0 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
