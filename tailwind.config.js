/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:          'var(--color-bg)',
        'bg-card':   'var(--color-bg-card)',
        text:        'var(--color-text)',
        muted:       'var(--color-text-muted)',
        // rgb(var(...) / <alpha-value>) form (not a plain var()) so opacity
        // modifiers like bg-accent/10 or ring-accent/40 actually compile —
        // requires --color-accent to hold RGB channels, not a hex string.
        accent:      'rgb(var(--color-accent) / <alpha-value>)',
        'accent-hover':  'var(--color-accent-hover)',
        border:          'var(--color-border)',
        // Form-field boundary only (text input, textarea, select). Used as
        // `border-field` (keyed `field`, not `border-field`, to avoid the
        // stuttering `border-border-field` class). Never for hairlines.
        field:           'var(--color-border-field)',
        'control-warm':  'var(--color-control-warm)',
        'accent-tint':   'var(--color-accent-tint)',
        // Redesign tokens, defined and not yet applied (stage 1).
        'accent-tint-hover': 'var(--color-accent-tint-hover)',
        'on-accent':         'var(--color-on-accent)',
        'disabled-surface':  'var(--color-surface-disabled)',
        'disabled-text':     'var(--color-text-disabled)',
        // Field error edge and message (Figma color/status/error/text).
        error:               'var(--color-error)',
        'under-par':      'var(--color-under-par)',
        'over-par':       'var(--color-over-par)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        ui:      'var(--font-ui)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        control: 'var(--radius-control)',
        sheet:   'var(--radius-sheet)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        btn:  'var(--shadow-btn)',
        subtle: 'var(--shadow-subtle)',
      },
      // Figma layout tokens (plan 5c), in rem. Gives gap-related, px-page,
      // p-card, space-y-section and so on. Not yet used by components.
      spacing: {
        related: '0.5rem',   // layout/gap/related 8
        field:   '0.75rem',  // layout/gap/field 12
        group:   '1rem',     // layout/gap/group 16
        section: '1.5rem',   // layout/gap/section 24
        page:    '1rem',     // layout/padding/page 16
        card:    '1rem',     // layout/padding/card 16
      },
    },
  },
  plugins: [],
}
