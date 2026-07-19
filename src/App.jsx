import { Component, useEffect, useState } from 'react'
import History              from './pages/History.jsx'
import Info                 from './pages/Info.jsx'
import Login                from './pages/Login.jsx'
import Privacy              from './pages/Privacy.jsx'
import Rules                from './pages/Rules.jsx'
import Home                 from './pages/Home.jsx'
import Podium               from './pages/Podium.jsx'
import Scorecard            from './pages/Scorecard.jsx'
import Setup                from './pages/Setup.jsx'
import Summary              from './pages/Summary.jsx'
import BruntsfiledCoursePage from './pages/BruntsfiledCoursePage.jsx'
import { getActiveGame, isStorageAvailable } from './utils/storage.js'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="h-full bg-bg flex flex-col items-center justify-center px-8 text-center gap-4">
          <p className="font-display italic text-2xl text-text">Something went wrong</p>
          <p className="font-ui text-sm text-muted">Try refreshing the page. Your scores are saved.</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            className="py-3 px-6 rounded-md bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold shadow-btn"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const PAGES = {
  home:        Home,
  login:       Login,
  privacy:     Privacy,
  info:        Info,
  rules:       Rules,
  setup:       Setup,
  scorecard:   Scorecard,
  podium:      Podium,
  summary:     Summary,
  history:     History,
  bruntsfield: BruntsfiledCoursePage,
}

// Pages whose URL slug differs from their key
const PAGE_PATHS = {
  home:        '/',
  bruntsfield: '/bruntsfield-short-course',
}

function pathForPage(key) {
  return PAGE_PATHS[key] ?? `/${key}`
}

function pageFromPath() {
  const path = window.location.pathname
  if (path === '/bruntsfield-short-course') return 'bruntsfield'
  const key = path.replace(/^\//, '') || 'home'
  return key in PAGES ? key : 'home'
}

function AppContent() {
  const { loading } = useAuth()

  const [page, setPage] = useState(() => {
    // Active game always takes priority
    if (getActiveGame()) return 'scorecard'
    return pageFromPath()
  })
  const [params, setParams]       = useState({})
  const [storageOk, setStorageOk] = useState(true)

  useEffect(() => {
    setStorageOk(isStorageAvailable())
    // Stamp the initial history entry so the first back press has state
    window.history.replaceState({ page }, '', window.location.pathname)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handlePopState(e) {
      const to = e.state?.page ?? pageFromPath()
      setPage(to in PAGES ? to : 'home')
      setParams({})
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(to, nextParams = {}) {
    setPage(to)
    setParams(nextParams)
    window.history.pushState({ page: to }, '', pathForPage(to))
  }

  // Blank screen while auth check is in flight — prevents flash of wrong state
  if (loading) return <div className="app-shell max-w-[430px] mx-auto h-dvh bg-bg" />

  const Page = PAGES[page] ?? Home
  return (
    <>
      <div className="app-shell max-w-[430px] mx-auto h-dvh overflow-hidden bg-bg flex flex-col">
        {!storageOk && (
          <div className="sticky top-0 z-50 bg-accent text-bg text-center font-ui text-xs py-2 px-4 tracking-wide">
            Scores won't save – storage is blocked. Using private browsing?
          </div>
        )}
        <ErrorBoundary key={page}>
          <Page navigate={navigate} params={params} />
        </ErrorBoundary>
      </div>

      <div className="desktop-note" aria-hidden="true">
        this app is optimised for mobile – open it on your phone for the real experience
        <span className="desktop-note-arrow">← this way</span>
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
