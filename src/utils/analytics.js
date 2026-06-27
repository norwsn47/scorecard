// Safe Plausible wrapper — silently no-ops if Plausible isn't loaded.
// To activate: add your domain to index.html script tag and create
// an account at plausible.io.
export function track(event, props = {}) {
  window.plausible?.(event, { props })
}
