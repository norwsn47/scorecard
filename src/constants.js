// Shared constants.

// The single course quick-play is hardcoded to. When the app grows to
// support multiple courses (see BACKLOG.md), quick-play will need a
// selector - this constant is the one place that reference lives.
// Note: this is the course name; the club itself ("Bruntsfield Short
// Hole Golf Club") appears only in prose in the rules and info pages.
export const BRUNTSFIELD_COURSE_NAME = 'Bruntsfield Short Hole Golf Course'

// A generic New Game (not started from the Bruntsfield route) previously got
// no course name at all (null), even though it follows the exact same
// quick-play rules (unlimited holes up to 36, revealed one at a time, par 3
// assumed) — this just gives that path a real name so it shows properly in
// History/Summary instead of a blank course line (#73).
export const QUICK_PLAY_COURSE_NAME = 'Quick Play'

// The most holes a round can have: 36, the Bruntsfield / quick-play length.
// The one place the number lives in the frontend, also the fallback for a
// legacy round saved without a hole count. (The backend keeps its own copy in
// functions/, a separate build context.)
export const MAX_HOLES = 36

// Quick-play (logged-out) assumes par 3 for all 36 holes — the Bruntsfield
// reality and the single source of that value (§5.1). Logged-in rounds carry
// their course's own hole_pars instead.
export const BRUNTSFIELD_HOLE_PARS = Array(MAX_HOLES).fill(3)

// Bruntsfield / quick-play hole count. 36 is reserved for the default course;
// user-created courses are 9 or 18 (§11.7). This is the one place the
// quick-play hole count lives — call sites wire it into createGame.
export const BRUNTSFIELD_HOLE_COUNT = MAX_HOLES

// The par band a single hole may have (§5.1): 2 to 7 inclusive. The par
// stepper stops at these edges and deriveHolePars reads anything outside the
// band as par 3. The backend validator keeps its own copy (functions/_lib/
// hole-pars.js); constants.test.js fails if the two drift apart.
export const PAR_MIN = 2
export const PAR_MAX = 7

// The most strokes a player can be given on one hole with the + button.
export const MAX_STROKES = 14
