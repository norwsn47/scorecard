import PageHeader from '../components/PageHeader.jsx'

export default function Info({ navigate }) {
  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader title="Information" onBack={() => navigate('home')} />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 space-y-8 max-w-sm mx-auto w-full">

        {/* Data */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Your data</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Your scores, player names, and game dates are saved to your device's browser storage - nothing is sent to a server.
          </p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Clearing your browser data or using private browsing will erase your history.
          </p>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        {/* About */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">About</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Scorecard is made by Outbuild, a small design collective based in Edinburgh.
          </p>
          <a
            href="mailto:williamadamgriffiths@gmail.com"
            className="inline-flex items-center gap-1 font-ui text-sm text-accent underline underline-offset-2"
          >
            Get in touch
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 relative top-px">
              <path d="M2 8L8 2M8 2H4M8 2V6" />
            </svg>
          </a>
        </section>

      </main>
    </div>
  )
}
