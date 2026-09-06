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
        chrome:          'var(--color-chrome)',
        'control-warm':  'var(--color-control-warm)',
        'accent-tint':   'var(--color-accent-tint)',
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
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        btn:  'var(--shadow-btn)',
      },
    },
  },
  plugins: [],
}
