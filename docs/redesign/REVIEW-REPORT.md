# Scorecard redesign: consistency and clean-up review
Last updated: 23 November 2026

> **Status (23 November 2026):** owner decisions taken and shipped to `main`:
> - Every error is red, and the top banners became a floating toast (Needs my decision 1).
> - Summary has no winner column colour (decision 2).
> - "Edit round" is in sentence case (decision 3).
> - The share image follows the redesign (M3 and decision 4).
> - History filters moved to a floating button (a new request, which reverses decision 6).
>
> The other must-fixes (M1, M2, M4) follow on their own branches.
>
> Report only. No source file was changed. Reviewed on branch `chore/redesign-review` from `main` at `61f8198`.
> Sources:
> - The plan and reference PNGs, read from git history (`baabf1b^`), because `docs/redesign/` was removed on 23 November.
> - `src/styles/tokens.json`, which is the file the brief calls `design-tokens.json`.
> - CHANGELOG owner overrides (22 and 23 November). These win over the plan.
>
> `docs/redesign/PROGRESS.md` never existed in the repo. The baseline used below is the one recorded in CHANGELOG.md (stage 0).
>
> **Method tags:**
> - **Code**: checked by reading or grepping the code.
> - **Run**: checked by running lint, tests or the build.
> - **Render**: rendered in headless Chrome at 390x844, 320x693 and 1280 desktop frame, and compared with the Figma PNGs.
> - **Inferred**: reasoned, not tested.
>
> **Confidence:** High, Medium or Low.

## Summary

1. The redesign is applied almost everywhere. All nine reversals are in place in the app. The tokens in `index.css` and Tailwind match `tokens.json` value for value. The guard tests keep the old patterns out, and none of the old classes survive.
2. Quality gates are green:
   - lint: 0 warnings;
   - tests: 1408 passed in 89 files (baseline 1219 in 75);
   - production build: succeeds.
   There are no TODOs and no console logs.
3. The biggest real problems are layout ones the tests cannot see:
   - Home cannot scroll, so on short screens it clips its footer (and at 320 signed in, the Outbuild lockup).
   - Sheets escape the desktop phone frame.
   - Content pages sit on a 19px margin, not 16px.
   - The History name toggles are 24px tap targets.
4. The share image was never redesigned. It still uses the old superscript delta at 9px and type sizes below the 12px floor, and DESIGN.md wrongly says it follows the Caption delta.
5. Most of the remaining items are duplication or need your decision. Duplication: five copy-pasted confirmation sheets, about 16 inline link styles, and score-table logic written twice. Decisions: green error text, the winner column colour, "Edit Round" capitals, the dashed notice boxes and the Increment glyph colour.

---

## Must fix

| # | Finding | Evidence | Confidence / method |
|---|---|---|---|
| M1 | **Home cannot scroll and clips its content on short screens.** The Home root is `h-full flex flex-col` inside `.app-shell` (`overflow: hidden`). Overflow by screen size:<ul><li>320x693 signed in: 127px, with Resume about 130px, so "Scorecard by Outbuild" is off screen;</li><li>360x640: 72px;</li><li>375x667: about 21-25px (padding only);</li><li>390x844: fine.</li></ul>Probably predates the redesign: the baseline 320 screenshot was signed out and showed the footer. | `src/pages/Home.jsx:63`; `src/styles/index.css` (about line 196); render `scratchpad/review/01-home-320.png` | High / Render |
| M2 | **History player-name toggles are 24px tall** (29-39px wide). They are real buttons inside the round card. DESIGN.md does not list them as an exception to the 44px rule. | `src/pages/History.jsx:403-411` (`CARD_INNER_CONTROL` adds only `pointer-events-auto`, `src/components/Card.jsx:34`) | High / Code + Render (measured) |
| M3 | **The share image still uses the old delta.** It is a 9px raised superscript (`raise: 5`), the pattern reversal 8 removed. Other sizes are below the 12px floor: 9, 10, 11 and 13px (lines 160-271). Column headers use `toUpperCase()` at 11px with no tracking. The hole column is 44px and untinted, and there are no Front 9 or Back 9 rows. DESIGN.md:654 and CHANGELOG.md:43 say share uses the inline Caption, which is untrue. `share.test.js` checks text only, so none of this is guarded. Colours do match the tokens. | `src/utils/share.js:117, 174-271` (delta at 223-228) | High / Code. The image itself was not rendered. |
| M4 | **The Select text runs under its chevron at 320.** "Bruntsfield Short Hole Golf Cou..." overlaps the arrow. `truncate` does not apply to a native `<select>`. It may look different on iOS Safari. | `src/components/Field.jsx:73`; `review/02-setup-320.png`, `12-setup-past-320.png` | Medium / Render |

## Should fix

**Layout and look** (High, Render unless stated):

- **S1. Sheets and the map modal escape the desktop phone frame.** They are `fixed inset-0`, so the backdrop covers the whole browser and the sheet (430px) is wider than the frame (390px). The Finish sheet uses `absolute` and stays inside the frame.
  - Affected: `Settings.jsx:447`, `Summary.jsx:844`, `Setup.jsx:847`, `CourseEdit.jsx:252`, `FilterSheet.jsx:148`, `CourseMapModal.jsx:47` and `CourseMapModal.lazy.jsx:34`. The `absolute` one is `Scorecard.jsx:548`.
  - Renders: `review/23-settings-delete-1280.png`, `17-history-picker-1280.png`.
- **S2. Content pages have a 19px side margin, not 16.** `max-w-sm` (384px) includes the 16px padding, so at 390 the page loses 3px each side. Hairlines sit at x=19 against the header and Setup at 16. DESIGN.md:190 and :801 promise one shared edge.
  - Affected: `Info.jsx:21`, `Settings.jsx:224`, `Privacy.jsx:33`, `Rules.jsx:19`, `Courses.jsx:56`.
- **S3. The Login "Check your email" screen uses `px-8`, not `px-page`.** The guard does not catch `px-8`. (High / Code.)
  - Location: `Login.jsx:107`.
- **S4. History empty, error and no-match states sit near the top** (title at about y=160). Figma 19 to 21 centre them vertically (about y=415).
  - Location: `History.jsx:306, 333, 350`.
- **S5. Info (signed in):**
  - The account link is centre-aligned when it wraps, because it is a button with the default text alignment. Location: `Info.jsx:119-121`.
  - Info, signed in and signed out: there is no hairline above the "UK GDPR" block, and Figma 24 and 25 both have one. Location: `Info.jsx` about line 163.
- **S6. Home links differ from Figma 11.** "Last round" is muted and underlined (Figma: accent, no underline), and "Sign in" is underlined (Figma: no underline). Location: `Home.jsx:140, 173`.
- **S7. The Increment and Advance glyphs are cream `text-bg` on accent and control grey.** Tokens and CHANGELOG say text on accent is white (`text-on-accent`). Location: `Scorecard.jsx:503, 511`. (High / Code.)
- **S8. The CourseMapModal radius is `rounded-2xl`**, which is not a token and not banned. `rounded-sheet` is the same 16px. Location: `CourseMapModal.jsx:55`, `CourseMapModal.lazy.jsx:42`. (High / Code.)

**Accessibility and behaviour:**

- **S9. Only FilterSheet traps Tab.** The five confirmation sheets and both map modals are `aria-modal="true"` but let Tab reach the page behind. DESIGN.md:568 says "do not trap yet", so this is known, not a regression. Escape, backdrop close and focus return are present on all of them. (High / Code.)
- **S10. The confirmation sheets have no safe-area bottom inset** (`pb-10`); FilterSheet has one. (Medium / Code.)

**Duplication** (High / Code):

- **S11. There is no shared Sheet or `useDialog`.** Five confirmation sheets repeat the overlay, shell, handle, title, button pair and the opener/Escape effect.
  - Locations: `Scorecard.jsx:78-93, 549`; `Settings.jsx:121-135, 445`; `Setup.jsx:219-234, 845`; `Summary.jsx:99-130, 842`; `CourseEdit.jsx:44-59, 250`.
  - Fixing S1, S9 and S10 is one change if this is built first.
- **S12. The inline text-link style is copied about 16 times.** Most copies have no `rounded-control`, so their focus ring is square.
  - Locations: `Info.jsx:64, 119, 136, 156, 171`; `Login.jsx:201`; `Setup.jsx:813`; `Summary.jsx:808, 828`; `Scorecard.jsx:534`; `Settings.jsx:428`; `CourseEdit.jsx:234`; `Home.jsx:136, 190`; `BruntsfieldCoursePage.jsx:107, 119`.
- **S13. The score-table logic is defined twice.** `dense`, `headCls`, `bandRowCls` and `bracketCls` appear in `Scorecard.jsx:105-107` and `Summary.jsx:177-180`. The Front 9 and Back 9 rows are written three times (`Scorecard.jsx:421-436`; `Summary.jsx:611-640`).
- **S14. List rows are near-identical but have different heights:** 56px at `Courses.jsx:100` and `Settings.jsx:372`, 48px at `Settings.jsx:392`.
- **S15. Other copies:**
  - The "couldn't load your courses" box is copied (`Setup.jsx:568` and `Courses.jsx:67`).
  - The Home and course-page header block is copied (`Home.jsx` and `BruntsfieldCoursePage.jsx`).

**Docs** (High / Code):

- **S16. DESIGN.md stale sections:**
  - :654, :637, :657: the share delta (see M3).
  - :531-532 and :183: the FilterSheet rows and padding no longer match the code (`-mx-3` list, `after:` hairline, safe-area padding).
  - :497, :510, :515, :517, :521: cite deleted PNGs (`c09-chip.png`, `17-history-picker-open.png` and others).
  - :190 and :801: the one-edge claim (S2, S3).
  - :215-228: the modal radius is not documented (S8).
  - The `active:opacity-70` and `active:opacity-80` press state is used on about 20 controls but is not documented.
- **S17. CHANGELOG.md:**
  - :43 makes the share delta claim (M3).
  - :12 says "stages 1 to 8" while the body says 0 to 8.
  - :40 says "fixed 68px", which :17 supersedes.

## Nice to have

- Off-token spacing values (High / Code):
  - `py-3.5` x7, `mt-1.5` x5, `mb-1.5` x4, `gap-5` (`Settings.jsx:387`), `mb-5` (`Login.jsx:164`);
  - `mt-[9px]` (`BruntsfieldCoursePage.jsx:37`, against `mt-1` on Home, so the gear sits about 5px differently);
  - `max-w-[430px]` x7, `max-w-[260px]` (`Login.jsx:123`).
- `disabled:opacity-25` on the round controls (`Scorecard.jsx:496, 511`). It is the only opacity-based disabled state left. The guard only bans `opacity-40`. (High / Code)
- Hard-coded hex in CSS on the desktop frame. `#E8E2D6` is one digit off warm/300 `#E8E1D6`. The bezel `#1C1B19` is not a token. The guards scan JSX only. (High / Code)
  - Location: `index.css:184`.
- Sticky `thead` on the live grid paints its background on the `tr`. Summary moved it to the cells because of mobile issue #66. The live `th` cells also have no `scope="col"`, which Summary has. (Medium / Code)
  - Location: `Scorecard.jsx:334-339`.
- Truncated six-player names at 320 ("Ale…", "Ma…", "Sa…") are ambiguous when names share a prefix. The full name is in the DOM and in the cell aria-labels, so screen readers are fine. (High / Render)
- Two-line header with a subtitle sits about 4px from the top edge. Ties to BACKLOG #90. (Medium / Render)
  - Evidence: `review/13-summary-justfinished-390.png`.
- The Course edit "PAR FOR EACH HOLE" heading is indented 4px from the field label. (Medium / Render)
- The Field helper text uses `text-disabled-text` (2.52:1) when the field is disabled. It is latent, because no caller passes `helper`. (Medium / Code)
  - Location: `Field.jsx:136`.
- Stale comments:
  - Code changes:
    - `index.css:60-70` and `tailwind.config.js:14-16` still cite `bg-accent/10` and `ring-accent/40`.
    - `Scorecard.jsx:483` says "11px caption".
    - `Summary.jsx:439-445` says "pencil icon".
    - `PlayerStar.jsx:5` says "filter chip".
    - `result.js:23` says "for a History card".
  - PNG references to the deleted pack in comments: `Button.jsx:3`, `Field.jsx:4`, `FilterSheet.jsx:4`, `History.jsx:32`, `BottomActionBar.jsx:1`, `PageHeader.jsx:11, 47`, `Setup.jsx:823`, `Summary.jsx:679`, `ParDelta.jsx:19`, `Scorecard.jsx:102`, `Summary.jsx:174`.
- `historyResultLabel` is now used only by share.js, so the name misleads. (High / Code)
  - Location: `result.js:29`.
- Redundant `font-ui` classes, because `html` already sets the font. (High / Code)
  - Locations: `ParStepperGrid.jsx:26`, `Scorecard.jsx:496, 503`, `Home.jsx:202`.
- There's no unit test for `RulesContent` or `FilterSheet` on their own. FilterSheet is covered through `History.filters.test.jsx:317-340`. (High / Code)
- Decorative SVGs in the Home course card lack `aria-hidden`. (Medium / Code)
  - Location: `Home.jsx:151-175`.

## Safe to delete

| Item | How checked | Confidence |
|---|---|---|
| `public/course_map_v2.png` (454 KB) | `grep -rIl course_map_v2` over the repo (excluding `node_modules`, `.git`, `dist`) found nothing. The live map is `course_map_winter.jpg`. | High / Code |
| Button `trailingIcon` prop (`Button.jsx:49, 66`) | grep: no caller in pages or components | High / Code |
| EmptyState `titleAs` prop and its `children` branch | grep: all three uses (History) pass `action` only | High / Code |
| Card `as` prop | grep: no caller | High / Code |
| `public/fonts/cormorant-garamond-normal.woff2` (38 KB) and its `@font-face` (`index.css:17-23`) | Only `type-display` and `type-title` use the serif, and both are italic. share.js asks for italic too. The browser fetches the file only on demand, so the cost is low. | Medium / Code + Inferred |

**Not deletable:**
- `sync.js` exports `buildGamePayload`, `POST_TIMEOUT_MS`, `isHeld` and `ME_TIMEOUT_MS`. They are only used by sync.js itself and its tests, but tests need them.
- Every file in `components/` and `hooks/`, every CSS variable and every Tailwind colour, spacing, radius and shadow key has at least one use (grep).

## Needs my decision

1. **Error colour outside fields.** Only Field errors and `Setup.jsx:664` use `text-error`. About 15 other error messages and the save-failed banners are accent green, so an error reads like a link.
   - Locations: `Summary.jsx:487, 815, 859`; `Settings.jsx:271, 338, 418, 436, 476`; `CourseEdit.jsx:222, 239`; `Info.jsx:141`; `Login.jsx:125, 164`; `CourseMapModal.jsx:87`; `CourseMapModal.lazy.jsx:59`; `Scorecard.jsx:283`; `App.jsx:180`.
   - Option (a): move them all to `error`. Option (b): keep green and document that only field validation is red.
2. **Summary winner column.**
   - The code colours the winner's whole column, its header and its E in accent green (`Summary.jsx:166-183, 583, 660`). DESIGN.md:69 and :669 document this.
   - Plan 5f says E is in the text colour. Figma 04, 09 and 13 show no column highlight and a muted winner line.
3. **"Edit Round" in Title Case.** It sits beside "New game" and "Add past round" (`Scorecard.jsx:291`, `Setup.jsx:521`). Sentence-case it, or add a title rule to DESIGN.md.
4. **The share image (M3).** Bring it up to the new type and table rules, or keep the compact image and correct DESIGN.md and CHANGELOG.
5. **Dashed notice boxes.** Four survive: `Setup.jsx:568, 603`, `Courses.jsx:67, 84`. They are documented as "compact inline notices", not the removed ghost button. Keep them, or move them to a solid Notice style (see S15).
6. **Header clamp with real course names.** "Bruntsfield Short Hole Golf Course" plus the date clips at 320 ("22 November 2…") and in the desktop frame (`review/09-summary-6p-320.png`, `04-summary-1280.png`). You accepted a two-line clamp on 23 November. Real data now hits it.
7. **Round entry layout against Figma 03, 08, 14 and 15.** The code reveals rows as you play (`game.js:61`) and pins Total above the controls, which leaves a gap. Figma lists every hole with dashes and puts Total directly under the table. This is existing product behaviour.
8. **Add past round notes.** Figma 12 shows "Round notes - optional". The code shows notes only when editing (`Setup.jsx:793-806`).
9. **Just-finished Summary.** Figma 13 has no back button (Done is the exit). The code keeps "Home" back plus Done.
10. **Smaller visual differences from Figma, each documented in DESIGN.md, so not bugs:**
    - The Summary date is mixed-case caption; Figma has bold caps.
    - The player star is stroked at 10px; Figma has filled at about 13px.
    - The Home and Settings icons are muted or accent; Figma has them near-black.
    - The Setup text buttons are Large (48px) plus 8px; Figma is about 44px with no gap.
    - The date field is pre-filled with the native icon; Figma shows a "Choose a date" placeholder.
    - Info (signed in) shows "Why we made this"; Figma 24 omits it.
11. **Field `helper` prop.** It is unused in pages and tested only in `Field.test.jsx`. Keep it as design-system API or delete it.

---

### Quality gates (Run, High)

| Gate | Now | Baseline (CHANGELOG, `546b033`) |
|---|---|---|
| `npm run lint` | exit 0, 0 warnings | clean, 0 warnings |
| `npm test` | 1408 passed, 89 files, 0 failed | 1219 passed, 75 files |
| Production build (`vite build`, output to scratchpad) | succeeds, no warnings; JS 271.8 KB (79.4 KB gzip), CSS 25.9 KB (6.1 KB gzip) | not recorded |

### What was not checked
- **Couldn't render:**
  - the History "Not yet saved" tag (the fixture's pending round was synced away by the mock);
  - Summary for a 9-of-18 round;
  - the Settings pending-email panel;
  - real iOS Safari and on-screen keyboard states.
  These stay with BACKLOG #124.
- **Share image:** it was read in the code, not rendered.
- **Tests:** they were not audited one by one for "asserts nothing real". The grep found no test that positively asserts an old class or old text; the old class names appear only in `not.` guards.

### Contrast (Code, computed from tokens.json, High)
Every pair the code uses passes AA, except the disabled pairs, which are exempt (2.1 to 2.5:1):
- muted on the 8% tint over bg: 4.57;
- error on bg: 6.33;
- under par on tint: 5.10;
- over par on tint: 5.52;
- white on accent: 11.18.

Muted on the tint over bg-card (4.39) fails, and no code uses it.
