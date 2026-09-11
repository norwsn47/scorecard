import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

// Self-serve profile and account controls for a signed-in user (§11.14, #4).
// Reachable only when signed in — from the Home indicator (§4.1) or the Info
// page Account section (§4.8). A signed-out visitor hitting /settings directly
// bounces to Home from an effect, mirroring the Scorecard no-game guard (#17).
// No in-page back button for normal in-app navigation (#89) — the phone's
// own back navigation covers stepping back to wherever this was opened from.
// A reload, deep link, or restored tab resets history depth to 0 though, with
// nothing in-app to step back to — a "Home" fallback covers that case (see
// showHomeLink below).

const EMAIL_ERROR = {
  409: 'That address is already tied to another account.',
  429: 'That is a lot of attempts in a short time - wait a few minutes, then try again.',
  500: 'Something went wrong sending the confirmation email. Please try again in a moment.',
}

export default function Settings({ navigate }) {
  const { user, loading, updateProfile, deleteAccount } = useAuth()

  // Signed-out guard — bounce from an effect, never inline during render
  // (navigate() sets state on the parent). Deleting the account also drops
  // the context user, so this same effect carries the post-delete return Home.
  useEffect(() => {
    if (!loading && !user) navigate('home')
  }, [loading, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // A reload, deep link, or restored tab always resets history state to depth
  // 0 — there's nothing in-app to step back to, and no in-page back button any
  // more (#89) for the case where there is. Read once on mount: this only
  // needs to catch the "landed here with a blank history" case, not react to
  // later in-app navigation (#89 fix-forward).
  const [showHomeLink] = useState(() => (window.history.state?.depth ?? 0) === 0)

  // ── Name ──────────────────────────────────────────────
  const [name, setName]           = useState(user?.name ?? '')
  // In-app the auth check has already resolved before Settings mounts (App
  // gates on `loading`), but sync defensively so the field reflects `name`
  // once it lands, and settles to the saved value after a successful save.
  useEffect(() => { setName(user?.name ?? '') }, [user?.name])
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError]   = useState(null)
  const [nameSaved, setNameSaved]   = useState(false)

  // ── Email ─────────────────────────────────────────────
  // The new-email form is collapsed behind a "Change email address" control
  // (#84) — the section leads with the current address and the pending banner,
  // and only reveals the input on a deliberate tap.
  const [emailFormOpen, setEmailFormOpen] = useState(false)
  const [newEmail, setNewEmail]     = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailError, setEmailError]   = useState(null)
  const [emailSent, setEmailSent]     = useState(false)
  const emailInputRef = useRef(null)

  // Reveal: pull focus onto the new-email input, mirroring the delete sheet.
  useEffect(() => {
    if (emailFormOpen) emailInputRef.current?.focus()
  }, [emailFormOpen])

  // Back out of the revealed state and reset it, so a re-open starts clean.
  function closeEmailForm() {
    setEmailFormOpen(false)
    setNewEmail('')
    setEmailError(null)
    setEmailSent(false)
  }

  // ── Delete ────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteWord, setDeleteWord]       = useState('')
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState(null)
  const deleteInputRef = useRef(null)

  function closeDelete() {
    if (!deleting) setConfirmDelete(false)
  }

  // While the delete sheet is open: pull focus onto the confirmation input and
  // let Escape dismiss it (equivalent to "Keep my account"). Backdrop click is
  // wired on the overlay element itself below.
  useEffect(() => {
    if (!confirmDelete) return
    deleteInputRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape' && !deleting) setConfirmDelete(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirmDelete, deleting])

  if (loading || !user) return null

  const trimmedName = name.trim()
  const nameUnchanged = trimmedName === (user.name ?? '')

  async function handleSaveName() {
    if (savingName || nameUnchanged) return
    setNameError(null)
    setNameSaved(false)
    setSavingName(true)
    try {
      await updateProfile({ name: trimmedName })
      setNameSaved(true)
    } catch (err) {
      setNameError(err.message || 'That did not save - please try again')
    } finally {
      setSavingName(false)
    }
  }

  async function handleSaveEmail(e) {
    e.preventDefault()
    const next = newEmail.trim()
    if (savingEmail || !next) return
    setEmailError(null)
    setEmailSent(false)
    if (!/.+@.+\..+/.test(next)) {
      setEmailError('That does not look like an email address.')
      return
    }
    if (next.toLowerCase() === user.email.toLowerCase()) {
      setEmailError('That is already your email address.')
      return
    }
    setSavingEmail(true)
    try {
      await updateProfile({ email: next })
      setEmailSent(true)
      setNewEmail('')
    } catch (err) {
      setEmailError(EMAIL_ERROR[err.status] || err.message || 'That did not send - please try again')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleDelete() {
    if (deleting || deleteWord !== 'DELETE') return
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteAccount()
      // deleteAccount() clears the context user; the signed-out guard effect
      // above then returns us to Home.
    } catch (err) {
      setDeleteError(err.message || 'That did not delete - please try again')
      setDeleting(false)
    }
  }

  const fieldClass =
    'w-full py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40'

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title="Settings"
        onBack={showHomeLink ? () => navigate('home') : undefined}
        backLabel="Home"
      />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 space-y-8 max-w-sm mx-auto w-full">

        {/* ── Name ── */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Your name</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Just for you for now - it is not shown on any scorecard yet. Leave it blank if you would rather not.
          </p>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value.slice(0, 60)); setNameError(null); setNameSaved(false) }}
            placeholder="Your name"
            maxLength={60}
            aria-label="Your name"
            className={fieldClass}
          />
          {nameError && <p className="font-ui text-xs text-accent pl-1">{nameError}</p>}
          {nameSaved && <p className="font-ui text-xs text-muted pl-1">Saved.</p>}
          <button
            onClick={handleSaveName}
            disabled={savingName || nameUnchanged}
            className={[
              'w-full py-3 px-4 rounded-sm border border-accent text-accent font-ui text-sm tracking-[0.08em] uppercase font-medium',
              'active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              (savingName || nameUnchanged) ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {savingName ? 'Saving…' : 'Save name'}
          </button>
        </section>

        <div className="w-8 h-0.5 bg-border" />

        {/* ── Email ── */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Email address</p>
          <p className="font-ui text-sm text-muted leading-relaxed break-words">
            Signing in uses <span className="text-text">{user.email}</span>.
          </p>

          {user.pending_email && (
            <div className="rounded-md border border-border bg-bg-card px-4 py-3">
              <p className="font-ui text-sm text-text break-words">
                Waiting for confirmation of <span className="font-medium">{user.pending_email}</span>.
              </p>
              <p className="font-ui text-xs text-muted mt-1 leading-relaxed">
                Open the link we sent to that inbox to switch over. Until then you stay signed in with {user.email}.
              </p>
            </div>
          )}

          {!emailFormOpen ? (
            <button
              type="button"
              onClick={() => setEmailFormOpen(true)}
              aria-expanded={false}
              className={[
                'w-full py-3 px-4 rounded-sm border border-accent text-accent font-ui text-sm tracking-[0.08em] uppercase font-medium',
                'active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              ].join(' ')}
            >
              Change email address
            </button>
          ) : (
            <form onSubmit={handleSaveEmail} className="space-y-3">
              <input
                ref={emailInputRef}
                type="email"
                value={newEmail}
                onChange={e => { setNewEmail(e.target.value); setEmailError(null); setEmailSent(false) }}
                placeholder="you@example.com"
                autoComplete="email"
                aria-label="New email address"
                className={fieldClass}
              />
              {emailError && <p className="font-ui text-xs text-accent pl-1">{emailError}</p>}
              {emailSent && (
                <p className="font-ui text-xs text-muted pl-1 leading-relaxed">
                  Check the new inbox for a confirmation link. Your address only changes once you open it.
                </p>
              )}
              <button
                type="submit"
                disabled={savingEmail || !newEmail.trim()}
                className={[
                  'w-full py-3 px-4 rounded-sm border border-accent text-accent font-ui text-sm tracking-[0.08em] uppercase font-medium',
                  'active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  (savingEmail || !newEmail.trim()) ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {savingEmail ? 'Sending…' : 'Send confirmation link'}
              </button>
              <div>
                <button
                  type="button"
                  onClick={closeEmailForm}
                  disabled={savingEmail}
                  className="inline-block py-2.5 -my-2.5 font-ui text-sm text-muted underline underline-offset-2 active:opacity-70 disabled:opacity-40 disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Keep my current email
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="w-8 h-0.5 bg-border" />

        {/* ── Delete account ── */}
        <section className="space-y-3">
          <p className="font-ui text-xs tracking-[0.12em] uppercase text-muted">Delete account</p>
          <p className="font-ui text-sm text-muted leading-relaxed">
            Removes your account and every round and course saved to it, on every device. This cannot be undone. Quick-play scores saved on this device are not part of your account and stay put.
          </p>
          <div>
            <button
              onClick={() => { setDeleteError(null); setDeleteWord(''); setConfirmDelete(true) }}
              className="inline-block py-2.5 -my-2.5 font-ui text-sm text-accent underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Delete my account
            </button>
          </div>
          {deleteError && !confirmDelete && (
            <p className="font-ui text-xs text-accent pl-1">{deleteError}</p>
          )}
        </section>

      </main>

      {/* Delete confirmation — mirrors History.jsx's delete-round sheet, with a
          typed-DELETE gate on the destructive button (§11.14). */}
      {confirmDelete && (
        <div
          className="fixed inset-0 flex items-end justify-center z-50"
          style={{ background: 'var(--overlay-backdrop)' }}
          onClick={closeDelete}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-heading"
            onClick={e => e.stopPropagation()}
            className="bg-bg rounded-t-2xl w-full max-w-[430px] px-6 pt-6 pb-10 shadow-card"
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
            <h2 id="delete-account-heading" className="font-display italic text-2xl text-text mb-1">Delete your account?</h2>
            <p className="font-ui text-xs text-muted tracking-wide mb-6 leading-relaxed">
              All your rounds, all your courses and the account itself are removed for good. Quick-play history on this device is not affected.
            </p>

            <label htmlFor="delete-confirm" className="font-ui text-xs tracking-[0.12em] uppercase text-muted block mb-2">
              Type DELETE to confirm
            </label>
            <input
              id="delete-confirm"
              ref={deleteInputRef}
              type="text"
              value={deleteWord}
              onChange={e => setDeleteWord(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className="w-full py-3 pl-4 pr-4 rounded-md border border-border font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40 mb-3"
            />

            {deleteError && (
              <p className="font-ui text-xs text-accent mb-3">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-sm border border-border font-ui text-sm tracking-[0.08em] uppercase text-text active:bg-bg-card disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Keep my account
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteWord !== 'DELETE'}
                className="flex-1 py-3 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.08em] uppercase font-semibold active:opacity-80 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
