import PageHeader from '../components/PageHeader.jsx'
import RulesContent from '../components/RulesContent.jsx'

export default function Rules({ navigate, params }) {
  const back = params?.from ?? 'home'

  return (
    <div className="h-full bg-bg flex flex-col">
      <PageHeader title="Course Rules" onBack={() => navigate(back)} />
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 max-w-sm mx-auto w-full">
        <RulesContent />
      </main>
    </div>
  )
}
