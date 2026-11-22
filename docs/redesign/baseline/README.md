# Baseline screenshots (before the redesign)
Last updated: 22 November 2026

Captured on 22 November 2026 from `main` at `546b033`, before any redesign change, so each stage can be compared with how the app looked before it.

- Sizes: `-390x844` (iPhone-size viewport), `-320x693` (narrowest supported), `-desktop` (1280x940, the desktop phone frame). All at 2x.
- Screens: Home, Setup, History, Info, Rules, Privacy, Login and the Bruntsfield course page, each in a fresh signed-out browser with no saved rounds.
- How: headless Chrome against `npm run dev` (no new dependency, decision D6).

**Not captured** (they need a game in progress, saved rounds or a signed-in session, which a fresh headless browser does not have): Scorecard, Summary, History with rounds, Settings, Courses and Course edit. Compare those against the live app on `main` at localhost or on production during each stage.
