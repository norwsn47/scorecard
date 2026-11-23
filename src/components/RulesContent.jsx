import ExternalArrow from './ExternalArrow.jsx'

// The Bruntsfield Short Hole Golf Club's course rules, laid out on the
// content-page ladder Information uses (DESIGN.md): one section per rule with
// a Label caps heading, hairlines between sections, body in the text colour.
// Wording is the Club's; only capitalisation follows the app's sentence case
// (the Club's shouted capitals become type-strong emphasis). Rule 1 has no
// heading in the Club's text, so it opens the page as a plain paragraph.
// Also rendered inside the course map modal.

function Section({ label, children }) {
  return (
    <section className="flex flex-col gap-related">
      <h2 className="type-label-caps text-accent">{label}</h2>
      {children}
    </section>
  )
}

function Rule() {
  return <div className="h-px bg-border" />
}

const LIST = 'flex flex-col gap-related list-disc pl-5 marker:text-muted'

export default function RulesContent() {
  return (
    <div className="flex flex-col gap-section type-body text-text">

      <p>
        <span className="type-strong">All players</span> are liable for their own actions on the
        course, including injury to third parties and all damage to private and public property.
      </p>

      <Rule />

      <Section label="Rules of play">
        <ul className={LIST}>
          <li>Play each hole <span className="type-strong">only</span> from the designated teeing areas</li>
          <li><span className="type-strong">Do not</span> hit balls <span className="type-strong">over</span> footpaths (out of bounds)</li>
          <li><span className="type-strong">Do not</span> hit balls off, <span className="type-strong">from on the greens</span></li>
          <li><span className="type-strong">Replace</span> all divots (displaced turf), <span className="type-strong">all over the course, particularly on the teeing areas</span></li>
          <li><span className="type-strong">Repair</span> any golf ball pitch marks on the putting greens</li>
        </ul>
      </Section>

      <Rule />

      <Section label="Maximum group size: four-ball">
        <p><span className="type-strong">No more</span> than 4 players allowed per group</p>
      </Section>

      <Rule />

      <Section label="Stroke limit per hole">
        <p>Maximum of 7 strokes for each player</p>
      </Section>

      <Rule />

      <Section label="Courtesy on the course">
        <ul className={LIST}>
          <li>Play without any undue delay</li>
          <li><span className="type-strong">Allow</span> faster playing groups to play through</li>
          <li><span className="type-strong">Keep</span> the course clean and tidy – place all your litter in the litter bins provided around the course</li>
        </ul>
      </Section>

      <Rule />

      <section className="flex flex-col gap-related">
        <p>Many thanks for your <span className="whitespace-nowrap">co-operation</span>. Enjoy your game.</p>
        <p className="type-small text-muted">
          Rules provided by the{' '}
          <a
            href="https://www.bruntsfieldshortholegolfclub.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 py-3 -my-3 text-accent underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Bruntsfield Short Hole Golf Club
            <ExternalArrow />
          </a>
        </p>
      </section>

    </div>
  )
}
