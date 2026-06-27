import { useState } from 'react'
import Home from './pages/Home.jsx'

const PAGES = {
  home:     Home,
  // Populated chunk by chunk:
  // setup, scorecard, summary, history
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
