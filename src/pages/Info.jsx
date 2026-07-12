import PageHeader from '../components/PageHeader.jsx'

export default function Info({ navigate }) {
  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader title="Information" onBack={() => navigate('home')} />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 space-y-8 max-w-sm mx-auto w-full">

        {/* Course */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Bruntsfield Short Hole Golf Club</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            One of the world's oldest golf links, Bruntsfield Short Hole Golf Club has been a fixture in Edinburgh since 1895. The 36-hole course features par-3 holes of 45–90 yards – unique to world golf.
          </p>
          <a
            href="https://www.bruntsfieldshortholegolfclub.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-ui text-sm text-accent underline underline-offset-2"
          >
            bruntsfieldshortholegolfclub.co.uk
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 relative top-px">
              <path d="M2 8L8 2M8 2H4M8 2V6" />
            </svg>
          </a>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        {/* Course rules */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Course rules</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Bruntsfield Links is a public course - please respect the rules so everyone can enjoy it.
          </p>
          <ul className="space-y-2">
            <li className="font-ui text-sm text-muted flex gap-2">
              <span className="text-accent mt-0.5">–</span>
              <span>Maximum 4 players per group</span>
            </li>
            <li className="font-ui text-sm text-muted flex gap-2">
              <span className="text-accent mt-0.5">–</span>
              <span>Maximum 7 strokes per hole - pick up and move on to keep the course flowing</span>
            </li>
            <li className="font-ui text-sm text-muted flex gap-2">
              <span className="text-accent mt-0.5">–</span>
              <span>Let faster groups play through</span>
            </li>
          </ul>
          <button
            onClick={() => navigate('rules', { from: 'info' })}
            className="inline-flex items-center gap-1 font-ui text-sm text-accent underline underline-offset-2 active:opacity-70"
          >
            View full course rules
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 relative top-px">
              <path d="M2 8L8 2M8 2H4M8 2V6" />
            </svg>
          </button>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        {/* About */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">About Outbuild</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Scorecard is made by Outbuild, a small design collective based in Edinburgh.
          </p>
          <a
            href="https://outbuild.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-ui text-sm text-accent underline underline-offset-2"
          >
            outbuild.uk
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 relative top-px">
              <path d="M2 8L8 2M8 2H4M8 2V6" />
            </svg>
          </a>
        </section>

      </main>
    </div>
  )
}
