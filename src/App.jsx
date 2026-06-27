import { useState } from 'react'
import History   from './pages/History.jsx'
import Home      from './pages/Home.jsx'
import Scorecard from './pages/Scorecard.jsx'
import Setup     from './pages/Setup.jsx'
import Summary   from './pages/Summary.jsx'

const PAGES = {
  home:      Home,
  setup:     Setup,
  scorecard: Scorecard,
  summary:   Summary,
  history:   History,
}

export default function App() {
  const [page, setPage]     = useState('home')
  const [params, setParams] = useState({})

  function navigate(to, nextParams = {}) {
    setPage(to)
    setParams(nextParams)
  }

  const Page = PAGES[page] ?? Home
  return <Page navigate={navigate} params={params} />
}
