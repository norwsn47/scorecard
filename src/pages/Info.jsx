import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Info({ navigate, params }) {
  const { user, logout } = useAuth()
  const fromBruntsfield  = params?.bruntsfield ?? false
  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title="Information"
        onBack={() => navigate(fromBruntsfield ? 'bruntsfield' : 'home')}
      />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 space-y-8 max-w-sm mx-auto w-full">

        {/* Why we made this */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Why we made this</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            We created Scorecard around one idea: the fewest possible taps to log a score, so you can focus on the game and your phone goes back in your pocket.
          </p>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        {/* Bruntsfield-specific sections — only shown when accessed from the Bruntsfield page */}
        {fromBruntsfield && (
          <>
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

            <section className="space-y-3">
              <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Course rules</p>
              <p className="font-ui text-sm text-muted leading-relaxed">
                Please read the rules before playing.
              </p>
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
          </>
        )}

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

        <div className="w-8 h-0.5 bg-border" />

        {/* Account */}
        {user ? (
          <section className="space-y-3">
            <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Account</p>
            <p className="font-ui text-sm text-muted truncate">{user.email}</p>
            <button
              onClick={async () => { await logout(); navigate('home') }}
              className="font-ui text-sm text-accent underline underline-offset-2 active:opacity-70"
            >
              Sign out
            </button>
          </section>
        ) : (
          <section className="space-y-3">
            <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Account</p>
            <p className="font-ui text-sm text-muted leading-relaxed">
              Sign in to save your rounds across devices and keep your history.
            </p>
            <button
              onClick={() => navigate('login')}
              className="font-ui text-sm text-accent underline underline-offset-2 active:opacity-70"
            >
              Sign in or create account
            </button>
          </section>
        )}

        <p className="font-ui text-xs text-muted leading-relaxed">
          Your data is handled under UK GDPR.{' '}
          <button
            onClick={() => navigate('privacy', { from: 'info' })}
            className="text-accent underline underline-offset-2 active:opacity-70"
          >
            Read our privacy policy
          </button>
        </p>

      </main>
    </div>
  )
}
