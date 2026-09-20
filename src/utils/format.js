export function formatDateOnly(isoString) {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(isoString))
}

export function formatShortDate(isoString) {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(isoString))
}

/**
 * A date as YYYY-MM-DD in the device's own timezone. `toISOString().slice(0, 10)`
 * is the UTC date, which is the previous day between 00:00 and 01:00 BST.
 */
export function localDateString(date = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
