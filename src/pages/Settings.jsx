import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import PlayerStar from '../components/PlayerStar.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

// Self-serve profile and account controls for a signed-in user (#4).
// Reachable only when signed in — from the Home header gear (#83) or the
// Info page Account section. A signed-out visitor hitting /settings directly
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
  const { user, loading, updateProfile, deleteAccount, logout } = useAuth()

  // Signed-out guard — bounce from an effect, never inline during render
  // (navigate() sets state on the parent). Deleting the account also drops
  // the context user, so this same effect carries the post-delete return Home.
  useEffect(() => {
    if (!loading && !user) navigate('home', {}, { replace: true })
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
  // The name is set once and rarely changed, so it shows as a value with a
  // small pencil; the field only opens on a deliberate tap. Focus moves into
  // the field on open and back to the pencil on close (mirrors the email form).
  const [nameEditing, setNameEditing] = useState(false)
  const nameInputRef    = useRef(null)
  const nameTriggerRef  = useRef(null)
  const nameWasOpenRef  = useRef(false)
  useEffect(() => {
    if (nameEditing) nameInputRef.current?.focus()
    else if (nameWasOpenRef.current) nameTriggerRef.current?.focus()
    nameWasOpenRef.current = nameEditing
  }, [nameEditing])

  // Back out of editing without saving: restore the saved value.
  function closeNameEdit() {
    setNameEditing(false)
    setName(user?.name ?? '')
    setNameError(null)
  }

  // ── Sign out ──────────────────────────────────────────
  // Same behaviour as the Information page's Sign out (#99): only once the
  // server confirms does the context user drop, and the signed-out guard above
  // then returns Home. A failure keeps the user signed in and says so.
  const [signingOut, setSigningOut]       = useState(false)
  const [signOutError, setSignOutError]   = useState(false)

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
  // Collapse: hand focus back to the "Change email address" trigger, so it does
  // not fall to <body> when the form unmounts (#80).
  const emailTriggerRef = useRef(null)
  const emailWasOpenRef = useRef(false)
  useEffect(() => {
    if (emailFormOpen) emailInputRef.current?.focus()
    else if (emailWasOpenRef.current) emailTriggerRef.current?.focus()
    emailWasOpenRef.current = emailFormOpen
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

  // While the delete sheet is open: pull focus onto the confirmation input once
  // (on open, not again when `deleting` flips), and hand it back to whatever
  // opened the sheet on close (#80).
  useEffect(() => {
    if (!confirmDelete) return
    const opener = document.activeElement
    deleteInputRef.current?.focus()
    return () => opener?.focus?.()
  }, [confirmDelete])
  // Escape dismisses it (equivalent to "Keep my account") unless a delete is in
  // flight. Backdrop click is wired on the overlay element itself below.
  useEffect(() => {
    if (!confirmDelete || deleting) return
    function onKey(e) {
      if (e.key === 'Escape') setConfirmDelete(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirmDelete, deleting])

  if (loading || !user) return null

  const trimmedName = name.trim()
  const nameUnchanged = trimmedName === (user.name ?? '')

  async function handleSignOut() {
    if (signingOut) return
    setSignOutError(false)
    setSigningOut(true)
    try {
      await logout()
    } catch {
      setSignOutError(true)
      setSigningOut(false)
    }
  }

  async function handleSaveName() {
    if (savingName || nameUnchanged) return
    setNameError(null)
    setNameSaved(false)
    setSavingName(true)
    try {
      await updateProfile({ name: trimmedName })
      setNameSaved(true)
      setNameEditing(false)
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
    'w-full py-3 pl-4 pr-4 rounded-md border border-field font-ui text-base bg-bg-card text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40'

  return (
    <div className="h-full bg-bg flex flex-col">

      <PageHeader
        title="Settings"
        onBack={showHomeLink ? () => navigate('home') : undefined}
        backLabel="Home"
      />

      {/* Everything here is set once and rarely changed, so each value reads as
          a quiet row with a small pencil rather than a full-width form; the
          field opens only on a deliberate tap. Sign out and Delete sit at the
          foot as plain links. */}
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-14 max-w-sm mx-auto w-full flex flex-col gap-9">

        {/* ── Account: name and email ── */}
        <section>
          <h2 className="font-ui text-xs tracking-[0.12em] uppercase text-muted mb-1">Account</h2>

          {!nameEditing ? (
            <div className="flex items-center gap-3 py-3.5 border-b border-border">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-ui text-xs text-muted">Name</p>
                <p className="font-ui text-base text-text break-words">
                  {user.name
                    ? <>{user.name}<PlayerStar className="ml-1 text-accent" /></>
                    : <span className="text-muted">Not set</span>}
                </p>
                <p className="font-ui text-xs text-muted leading-relaxed">Fills in new rounds and adds your star.</p>
                {nameSaved && <p role="status" className="font-ui text-xs text-muted">Saved.</p>}
              </div>
              <button
                ref={nameTriggerRef}
                type="button"
                onClick={() => { setNameSaved(false); setNameEditing(true) }}
                aria-label="Edit name"
                aria-expanded={false}
                className="w-11 h-11 -mr-2.5 shrink-0 flex items-center justify-center rounded-md text-accent active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <PencilIcon />
              </button>
            </div>
          ) : (
            <div className="py-3.5 border-b border-border space-y-2.5">
              <label htmlFor="settings-name" className="font-ui text-xs text-muted block">Name</label>
              <input
                id="settings-name"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value.slice(0, 60)); setNameError(null); setNameSaved(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape' && !savingName) closeNameEdit()
                }}
                placeholder="Your name"
                maxLength={60}
                className={fieldClass}
              />
              <p className="font-ui text-xs text-muted leading-relaxed">
                Fills in your name at the start of a new round and marks you with a small star on the scorecard. Leave it blank if you would rather not.
              </p>
              {nameError && <p role="alert" className="font-ui text-xs text-accent pl-1">{nameError}</p>}
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName || nameUnchanged}
                  className="min-h-[44px] py-2.5 px-5 rounded-sm bg-accent text-bg font-ui text-sm tracking-[0.1em] uppercase font-semibold active:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeNameEdit}
                  disabled={savingName}
                  className="inline-block py-3 -my-3 font-ui text-sm text-muted underline underline-offset-2 active:opacity-70 disabled:opacity-40 disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Email - the new-email form stays collapsed behind the pencil (#84)
              and reveals in place on a deliberate tap. */}
          <div className="py-3.5 border-b border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-ui text-xs text-muted">Email</p>
                <p className="font-ui text-base text-text break-all">{user.email}</p>
                <p className="font-ui text-xs text-muted">Used to sign in.</p>
              </div>
              {!emailFormOpen && (
                <button
                  ref={emailTriggerRef}
                  type="button"
                  onClick={() => setEmailFormOpen(true)}
                  aria-label="Change email address"
                  aria-expanded={false}
                  className="w-11 h-11 -mr-2.5 shrink-0 flex items-center justify-center rounded-md text-accent active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <PencilIcon />
                </button>
              )}
            </div>

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

            {emailFormOpen && (
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
                {emailError && <p role="alert" className="font-ui text-xs text-accent pl-1">{emailError}</p>}
                {emailSent && (
                  <p role="status" className="font-ui text-xs text-muted pl-1 leading-relaxed">
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
                    className="inline-block py-3 -my-3 font-ui text-sm text-muted underline underline-offset-2 active:opacity-70 disabled:opacity-40 disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    Keep my current email
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ── About ── */}
        {/* The header gear replaced the info icon for signed-in users (#83), so
            the Information page (rules, privacy, contact) is reached from here. */}
        <section>
          <h2 className="font-ui text-xs tracking-[0.12em] uppercase text-muted mb-1">About</h2>
          <button
            type="button"
            onClick={() => navigate('info', { from: 'settings' })}
            className="w-full min-h-[48px] py-2 flex items-center justify-between gap-3 border-b border-border text-left active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span className="font-ui text-base text-text">Information</span>
            <span className="flex items-center gap-1.5 font-ui text-xs text-muted">
              Rules, privacy, contact
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          </button>
        </section>

        <div className="flex-1" />

        {/* ── Sign out and Delete account ── */}
        <section className="space-y-6">
          <div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-block py-3 -my-3 font-ui text-sm text-accent underline underline-offset-2 active:opacity-70 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
            {signOutError && (
              <p role="alert" className="font-ui text-xs text-accent mt-3">
                Couldn't sign out - check your connection and try again.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => { setDeleteError(null); setDeleteWord(''); setConfirmDelete(true) }}
              className="inline-block py-3 -my-3 font-ui text-sm text-muted underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Delete my account
            </button>
            <p className="font-ui text-xs text-muted leading-relaxed pt-1">
              Removes your account and every round and course saved to it, on every device. This cannot be undone. Quick-play scores saved on this device are not part of your account and stay put.
            </p>
            {deleteError && !confirmDelete && (
              <p role="alert" className="font-ui text-xs text-accent pl-1">{deleteError}</p>
            )}
          </div>
        </section>

      </main>

      {/* Delete confirmation — mirrors History.jsx's delete-round sheet, with a
          typed-DELETE gate on the destructive button. */}
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
              className="w-full py-3 pl-4 pr-4 rounded-md border border-field font-ui text-base bg-bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent/40 mb-3"
            />

            {deleteError && (
              <p role="alert" className="font-ui text-xs text-accent mb-3">{deleteError}</p>
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

// Small pencil used for the "edit this value" affordance on the Name and Email
// rows. Decorative: the button around it carries the accessible name.
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      <path d="M14.5 5.5l3 3" />
    </svg>
  )
}
