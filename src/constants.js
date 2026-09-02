// Shared constants.

// The single course quick-play is hardcoded to. When the app grows to
// support multiple courses (see BACKLOG.md), quick-play will need a
// selector - this constant is the one place that reference lives.
// Note: this is the course name; the club itself ("Bruntsfield Short
// Hole Golf Club") appears only in prose in the rules and info pages.
export const BRUNTSFIELD_COURSE_NAME = 'Bruntsfield Short Hole Golf Course'

// Quick-play (logged-out) assumes par 3 for all 36 holes — the Bruntsfield
// reality and the single source of that value (§5.1). Logged-in rounds carry
// their course's own hole_pars instead.
export const BRUNTSFIELD_HOLE_PARS = Array(36).fill(3)
