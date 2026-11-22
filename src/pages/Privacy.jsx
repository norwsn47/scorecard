import ExternalArrow from '../components/ExternalArrow.jsx'
import PageHeader from '../components/PageHeader.jsx'

const ExternalLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 py-3 -my-3 type-small-strong text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
  >
    {children}
    <ExternalArrow />
  </a>
)

// Maps the screen this page was opened from to the destination name shown in
// the back label — "Info" / "Login" — so the label always names the
// screen goBack() will actually land on, rather than a generic "Back".
const FROM_LABEL = { info: 'Info', login: 'Login' }

export default function Privacy({ goBack, params }) {
  const from = params?.from ?? 'home'

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title="Your data"
        backLabel={FROM_LABEL[from] ?? 'Home'}
        onBack={() => goBack(from)}
      />

      <main className="flex-1 overflow-y-auto px-page pt-6 pb-14 flex flex-col gap-section max-w-sm mx-auto w-full">

        <section className="flex flex-col gap-related">
          <p className="type-label-caps text-accent">What we collect</p>
          <p className="type-body text-text">
            Your email address, used to send you a sign-in link. Once you're signed in, we store your rounds and scores against your account. That's it - no tracking, no analytics, no advertising.
          </p>
        </section>

        <div className="h-px bg-border" />

        <section className="flex flex-col gap-related">
          <p className="type-label-caps text-accent">Why we store it</p>
          <p className="type-body text-text">
            Your email lets you sign in. Your scores are the whole point of the app - we store them so you can see your history across sessions. We don't use your email for anything else. We don't send newsletters or marketing.
          </p>
        </section>

        <div className="h-px bg-border" />

        <section className="flex flex-col gap-related">
          <p className="type-label-caps text-accent">Who else sees it</p>
          <p className="type-body text-text">
            Two companies handle your data as part of running this app:
          </p>
          <ul className="flex flex-col gap-related">
            <li className="type-body text-text">
              <span className="type-strong text-text">Cloudflare</span> - hosts the app and stores the database. Your account and scores live on Cloudflare's infrastructure.{' '}
              <ExternalLink href="https://cloudflare.com">cloudflare.com</ExternalLink>
            </li>
            <li className="type-body text-text">
              <span className="type-strong text-text">Resend</span> - delivers the sign-in email to your inbox. They receive your email address each time you request a link.{' '}
              <ExternalLink href="https://resend.com">resend.com</ExternalLink>
            </li>
          </ul>
          <p className="type-body text-text">
            Neither company uses your data for their own purposes. Both are under contractual obligations to protect it.
          </p>
        </section>

        <div className="h-px bg-border" />

        <section className="flex flex-col gap-related">
          <p className="type-label-caps text-accent">How long we keep it</p>
          <p className="type-body text-text">
            Your account and scores stay on file as long as you use the app. Sign-in sessions expire after 30 days - after that you'll need to sign in again. Records of abandoned sign-in links are cleared within about a day of expiring.
          </p>
          <p className="type-body text-text">
            You can delete your account yourself at any time from Settings. It removes your account and every round and course saved to it straight away, and it can't be undone. Quick-play scores saved locally on your device aren't part of your account and aren't affected. If you can't sign in, email{' '}
            <a href="mailto:scorecard@outbuild.uk" className="text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">scorecard@outbuild.uk</a>{' '}
            and we'll do it for you.
          </p>
        </section>

        <div className="h-px bg-border" />

        <section className="flex flex-col gap-related">
          <p className="type-label-caps text-accent">Your rights</p>
          <p className="type-body text-text">
            Under UK data protection law you have the right to see what data we hold about you, correct anything wrong, and ask us to delete it. You can also ask us to restrict how we use your data or request a copy of it.
          </p>
          <p className="type-body text-text">
            To exercise any of these rights, email{' '}
            <a href="mailto:scorecard@outbuild.uk" className="text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">scorecard@outbuild.uk</a>.
            If you're unhappy with how we handle your data, you can complain to the ICO at{' '}
            <ExternalLink href="https://ico.org.uk">ico.org.uk</ExternalLink>.
          </p>
        </section>

        <div className="h-px bg-border" />

        <section className="flex flex-col gap-related">
          <p className="type-label-caps text-accent">About this notice</p>
          <p className="type-body text-text">
            Scorecard is made by Outbuild, a small design collective based in Edinburgh. This notice covers the Scorecard app. Questions:{' '}
            <a href="mailto:scorecard@outbuild.uk" className="text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">scorecard@outbuild.uk</a>
          </p>
          <ExternalLink href="https://outbuild.uk">outbuild.uk</ExternalLink>
        </section>

      </main>
    </div>
  )
}
