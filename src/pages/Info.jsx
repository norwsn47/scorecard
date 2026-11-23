import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import TextLink from '../components/TextLink.jsx'

export default function Info({ navigate, goBack, params }) {
  const { user, logout } = useAuth()
  const [logoutError, setLogoutError] = useState(false)
  const fromBruntsfield  = params?.bruntsfield ?? false
  // Opened from the Settings "About" row (#83) - step back to Settings.
  const fromSettings     = params?.from === 'settings'
  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title="Information"
        backLabel={fromBruntsfield ? 'Course' : fromSettings ? 'Settings' : 'Home'}
        onBack={() => goBack(fromBruntsfield ? 'bruntsfield' : fromSettings ? 'settings' : 'home')}
      />

      <main className="flex-1 overflow-y-auto px-page pt-6 pb-14 flex flex-col gap-section">

        {/* Why we made this */}
        <section className="flex flex-col gap-related">
          <p className="type-label-caps text-accent">Why we made this</p>
          <p className="type-body text-text">
            We created Scorecard around one idea: the fewest possible taps to log a score, so you can focus on the game and your phone goes back in your pocket.
          </p>
        </section>

        <div className="h-px bg-border" />

        {/* Bruntsfield-specific sections — only shown when accessed from the Bruntsfield page */}
        {fromBruntsfield && (
          <>
            <section className="flex flex-col gap-related">
              <p className="type-label-caps text-accent">Bruntsfield Short Hole Golf Club</p>
              <p className="type-body text-text">
                One of the world's oldest golf links, Bruntsfield Short Hole Golf Club has been a fixture in Edinburgh since 1895. The 36-hole course features par-3 holes of 45–90 yards – unique to world golf.
              </p>
              <div>
                <TextLink external size="body" href="https://www.bruntsfieldshortholegolfclub.co.uk">
                  bruntsfieldshortholegolfclub.co.uk
                </TextLink>
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="flex flex-col gap-related">
              <p className="type-label-caps text-accent">Course rules</p>
              <p className="type-body text-text">
                Please read the rules before playing.
              </p>
              <div>
                <TextLink external size="body" onClick={() => navigate('rules', { from: 'info' })}>
                  View full course rules
                </TextLink>
              </div>
            </section>

            <div className="h-px bg-border" />
          </>
        )}

        {/* About */}
        <section className="flex flex-col gap-related">
          <p className="type-label-caps text-accent">About Outbuild</p>
          <p className="type-body text-text">
            Scorecard is made by Outbuild, a small design collective based in Edinburgh.
          </p>
          <div>
            <TextLink external size="body" href="https://outbuild.uk">
              outbuild.uk
            </TextLink>
          </div>
          <p className="type-body text-text mt-related">
            Questions or feedback? Get in touch.
          </p>
          <div>
            <TextLink size="body" href="mailto:scorecard@outbuild.uk">
              scorecard@outbuild.uk
            </TextLink>
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* Account */}
        {user ? (
          <section className="flex flex-col gap-related">
            <p className="type-label-caps text-accent">Account</p>
            <div className="flex flex-col gap-1">
              {user.name && <p className="type-body text-text">{user.name}</p>}
              <p className="type-body text-muted break-words">{user.email}</p>
            </div>
            <div className="mt-related">
              <TextLink size="body" className="text-left" onClick={() => navigate('settings', { from: 'info' })}>
                Edit your name, change your email or delete your account
              </TextLink>
            </div>
            <div className="mt-related">
              <TextLink
                size="body"
                onClick={async () => {
                  setLogoutError(false)
                  try {
                    await logout()
                    navigate('home')
                  } catch {
                    // The server did not confirm the sign-out, so stay signed in and say so.
                    setLogoutError(true)
                  }
                }}
              >
                Sign out
              </TextLink>
              {logoutError && (
                <p role="alert" className="type-small text-error mt-related">
                  Couldn't sign out - check your connection and try again.
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-related">
            <p className="type-label-caps text-accent">Account</p>
            <p className="type-body text-text">
              Sign in to save your rounds across devices and keep your history.
            </p>
            <div>
              <TextLink size="body" onClick={() => navigate('login')}>
                Sign in or create account
              </TextLink>
            </div>
          </section>
        )}

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-related">
          <p className="type-small text-muted">
            Your data is handled under UK GDPR.
          </p>
          <p>
            <TextLink size="small" pad="lg" onClick={() => navigate('privacy', { from: 'info' })}>
              Read our privacy policy
            </TextLink>
          </p>
        </div>

      </main>
    </div>
  )
}
