export default function RulesContent() {
  return (
    <div className="flex flex-col gap-group type-body text-text">

      <p>
        <span className="type-strong text-text">1)</span> ALL PLAYERS are liable for their own actions on the
        course, including injury to third parties and all damage to private and public property.
      </p>

      <div>
        <p><span className="type-strong text-text underline">2) RULES OF PLAY:</span></p>
        <ul className="mt-related space-y-related pl-4">
          <li>a) Play each hole <span className="type-strong">only</span> from the designated Teeing areas</li>
          <li>b) <span className="type-strong">DO NOT</span> hit balls <span className="type-strong">over</span> footpaths (Out of Bounds)</li>
          <li>c) <span className="type-strong">DO NOT</span> hit balls off, <span className="type-strong">from on the greens</span></li>
          <li>d) <span className="type-strong">REPLACE</span> all divots (displaced turf), <span className="type-strong">all over the course, particularly on the Teeing areas</span></li>
          <li>e) <span className="type-strong">REPAIR</span> any golf ball pitch marks on the putting greens</li>
        </ul>
      </div>

      <p>
        <span className="type-strong text-text underline">3) MAXIMUM GROUP SIZE: - FOUR-BALL</span><br />
        <span className="type-strong">NO MORE</span> than 4 players allowed per group
      </p>

      <p>
        <span className="type-strong text-text underline">4) STROKE LIMIT per HOLE:</span><br />
        MAXIMUM of 7 strokes for each player
      </p>

      <div>
        <p><span className="type-strong text-text underline">5) COURTESY on the Course:</span></p>
        <ul className="mt-related space-y-related pl-4">
          <li>a) PLAY WITHOUT ANY UNDUE DELAY</li>
          <li>b) ALLOW faster playing groups to play through</li>
          <li>c) KEEP the course clean and tidy – place all your litter in the litter bins provided around the course.</li>
        </ul>
      </div>

      <p className="type-strong text-text">
        Many thanks for your <span className="whitespace-nowrap">co-operation</span>
      </p>
      <p className="type-strong text-text">
        Enjoy your game
      </p>

      <p className="mt-related type-small text-muted">
        Rules provided by the{' '}
        <a
          href="https://www.bruntsfieldshortholegolfclub.co.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block py-3 -my-3 underline underline-offset-2 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Bruntsfield Short Hole Golf Club
        </a>
      </p>

    </div>
  )
}
