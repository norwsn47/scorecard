import PageHeader from '../components/PageHeader.jsx'
import RulesContent from '../components/RulesContent.jsx'

// Maps the screen Rules was opened from to the destination name shown in the
// back label, so it always names the real screen goBack() lands on rather
// than a generic "← Back". 'setup' shows as "New Game" — the only Setup flow
// that links to Rules is the brand-new-game one (see Setup.jsx).
const FROM_LABEL = { info: 'Info', bruntsfield: 'Bruntsfield', setup: 'New Game' }

export default function Rules({ goBack, params }) {
  const from = params?.from ?? 'home'
  return (
    <div className="h-full bg-bg flex flex-col">
      <PageHeader
        title="Course Rules"
        backLabel={`← ${FROM_LABEL[from] ?? 'Home'}`}
        onBack={() => goBack(from)}
      />
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 max-w-sm mx-auto w-full">
        <RulesContent />
      </main>
    </div>
  )
}
