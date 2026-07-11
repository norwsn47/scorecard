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
        accent:      'var(--color-accent)',
        'accent-hover':  'var(--color-accent-hover)',
        border:          'var(--color-border)',
        chrome:          'var(--color-chrome)',
        'control-warm':  'var(--color-control-warm)',
        'accent-tint':   'var(--color-accent-tint)',
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
