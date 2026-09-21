import { Component, lazy, Suspense, useEffect, useRef } from 'react'
import { BRUNTSFIELD_COURSE_NAME } from '../constants.js'

// The map modal pulls in react-zoom-pan-pinch, which most visits never need, so
// it loads on demand instead of sitting in the main bundle. Nothing is shown
// while the chunk loads (a moment, and only the first time).
//
// The chunk can fail to load: no signal on the course the first time the map is
// opened, or a tab kept open across a deploy that renamed the file. That must
// not replace the live scorecard with the app-level error page, so a local
// boundary shows a small "couldn't load" dialog instead. React caches a
// rejected lazy import, so the lazy component is rebuilt after a failure and
// the next open tries the network again.
const loadModal = () => import('./CourseMapModal.jsx')
let LazyModal = lazy(loadModal)

function LoadFailed({ onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'var(--overlay-modal)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-map-failed-heading"
        className="bg-bg rounded-2xl w-[360px] shadow-card overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative px-5 py-4 border-b border-border">
          <p id="course-map-failed-heading" className="font-display italic text-xl text-text leading-tight">
            {BRUNTSFIELD_COURSE_NAME}
          </p>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="absolute top-1.5 right-2.5 w-11 h-11 flex items-center justify-center text-muted active:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center justify-center min-h-[160px] px-5 text-center">
          <p role="alert" className="font-ui text-xs text-accent tracking-wide">
            The course map couldn't load. Check your connection and reopen this.
          </p>
        </div>
      </div>
    </div>
  )
}

class LoadBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    LazyModal = lazy(loadModal)
  }
  render() {
    if (this.state.failed) return <LoadFailed onClose={this.props.onClose} />
    return this.props.children
  }
}

export default function LazyCourseMapModal(props) {
  return (
    <LoadBoundary onClose={props.onClose}>
      <Suspense fallback={null}>
        <LazyModal {...props} />
      </Suspense>
    </LoadBoundary>
  )
}
