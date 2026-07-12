import PageHeader from '../components/PageHeader.jsx'

const ExternalLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 font-ui text-sm text-accent underline underline-offset-2"
  >
    {children}
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 relative top-px">
      <path d="M2 8L8 2M8 2H4M8 2V6" />
    </svg>
  </a>
)

export default function Privacy({ navigate, params }) {
  const from = params?.from ?? 'home'

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader title="Your data" onBack={() => navigate(from)} />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 space-y-8 max-w-sm mx-auto w-full">

        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">What we collect</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Your email address, used to send you a sign-in link. Once you're signed in, we store your rounds and scores against your account. That's it - no tracking, no analytics, no advertising.
          </p>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Why we store it</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Your email lets you sign in. Your scores are the whole point of the app - we store them so you can see your history across sessions. We don't use your email for anything else. We don't send newsletters or marketing.
          </p>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Who else sees it</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Two companies handle your data as part of running this app:
          </p>
          <ul className="space-y-3">
            <li className="font-ui text-sm text-muted leading-relaxed">
              <span className="font-medium text-text">Cloudflare</span> - hosts the app and stores the database. Your account and scores live on Cloudflare's infrastructure.{' '}
              <ExternalLink href="https://cloudflare.com">cloudflare.com</ExternalLink>
            </li>
            <li className="font-ui text-sm text-muted leading-relaxed">
              <span className="font-medium text-text">Resend</span> - delivers the sign-in email to your inbox. They receive your email address each time you request a link.{' '}
              <ExternalLink href="https://resend.com">resend.com</ExternalLink>
            </li>
          </ul>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Neither company uses your data for their own purposes. Both are under contractual obligations to protect it.
          </p>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">How long we keep it</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Your account and scores stay on file as long as you use the app. Sign-in sessions expire after 30 days - after that you'll need to sign in again. If you want us to delete your account and all associated data, email us and we'll do it within 30 days.
          </p>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Your rights</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Under UK data protection law you have the right to see what data we hold about you, correct anything wrong, and ask us to delete it. You can also ask us to restrict how we use your data or request a copy of it.
          </p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            To exercise any of these rights, email{' '}
            <a href="mailto:scorecard@outbuild.uk" className="text-accent underline underline-offset-2">scorecard@outbuild.uk</a>.
            If you're unhappy with how we handle your data, you can complain to the ICO at{' '}
            <ExternalLink href="https://ico.org.uk">ico.org.uk</ExternalLink>.
          </p>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">About this notice</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Scorecard is made by Outbuild, a small design collective based in Edinburgh. This notice covers the Scorecard Club app. Questions:{' '}
            <a href="mailto:scorecard@outbuild.uk" className="text-accent underline underline-offset-2">scorecard@outbuild.uk</a>
          </p>
          <ExternalLink href="https://outbuild.uk">outbuild.uk</ExternalLink>
        </section>

      </main>
    </div>
  )
}
