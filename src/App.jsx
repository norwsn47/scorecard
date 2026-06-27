import { useEffect, useState } from 'react'
import History   from './pages/History.jsx'
import Home      from './pages/Home.jsx'
import Scorecard from './pages/Scorecard.jsx'
import Setup     from './pages/Setup.jsx'
import Summary   from './pages/Summary.jsx'
import { isStorageAvailable } from './utils/storage.js'

const PAGES = {
  home:      Home,
  setup:     Setup,
  scorecard: Scorecard,
  summary:   Summary,
  history:   History,
}

export default function App() {
  const [page, setPage]           = useState('home')
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
      {!storageOk && (
        <div className="fixed top-0 inset-x-0 z-50 bg-accent text-bg text-center font-ui text-xs py-2 px-4 tracking-wide">
          Scores won't be saved — storage is blocked (private browsing?)
        </div>
      )}
      <Page navigate={navigate} params={params} />
    </>
  )
}
