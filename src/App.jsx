import { useEffect, useState } from 'react'
import History    from './pages/History.jsx'
import Home       from './pages/Home.jsx'
import Podium     from './pages/Podium.jsx'
import Scorecard  from './pages/Scorecard.jsx'
import Setup      from './pages/Setup.jsx'
import Summary    from './pages/Summary.jsx'
import { getActiveGame, isStorageAvailable } from './utils/storage.js'

const PAGES = {
  home:       Home,
  setup:      Setup,
  scorecard:  Scorecard,
  podium:     Podium,
  summary:    Summary,
  history:    History,
}

export default function App() {
  const [page, setPage]           = useState(() => getActiveGame() ? 'scorecard' : 'home')
  const [params, setParams]       = useState({})
  const [storageOk, setStorageOk] = useState(true)

  useEffect(() => {
    setStorageOk(isStorageAvailable())
  }, [])

  function navigate(to, nextParams = {}) {
    setPage(to)
    setParams(nextParams)
  }

  const Page = PAGES[page] ?? Home
  return (
    <>
      <div className="app-shell max-w-[430px] mx-auto h-dvh overflow-hidden bg-bg flex flex-col">
        {!storageOk && (
          <div className="sticky top-0 z-50 bg-accent text-bg text-center font-ui text-xs py-2 px-4 tracking-wide">
            Scores won't be saved — storage is blocked (private browsing?)
          </div>
        )}
        <Page navigate={navigate} params={params} />
      </div>

      <div className="desktop-note" aria-hidden="true">
        this app is optimised for mobile — open it on your phone for the real experience
        <span className="desktop-note-arrow">← this way</span>
      </div>
    </>
  )
}
