import PageHeader from '../components/PageHeader.jsx'

export default function Info({ navigate }) {
  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader title="Information" onBack={() => navigate('home')} />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 space-y-8 max-w-sm mx-auto w-full">

        {/* Course */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Course</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            One of the world's oldest golf links, Bruntsfield Short Hole Golf Club has been a fixture in Edinburgh since 1895. The 36-hole course features par-3 holes of 45–90 yards – unique to world golf.
          </p>
          <a
            href="https://www.bruntsfieldshortholegolfclub.co.uk/history/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-ui text-sm text-accent underline underline-offset-2"
          >
            Find out more
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 relative top-px">
              <path d="M2 8L8 2M8 2H4M8 2V6" />
            </svg>
          </a>
          <button
            onClick={() => navigate('rules', { from: 'info' })}
            className="block font-ui text-sm text-accent underline underline-offset-2 active:opacity-70"
          >
            Course rules
          </button>
          <p className="font-ui text-xs text-muted leading-relaxed">
            The course map is reproduced with permission from Bruntsfield Short Hole Golf Club.
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
