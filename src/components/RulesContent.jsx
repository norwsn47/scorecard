export default function RulesContent() {
  return (
    <div className="space-y-4 font-ui text-sm text-muted leading-relaxed">

      <p>
        <span className="text-text font-semibold">1)</span> ALL PLAYERS are liable for their own actions on the
        course, including injury to third parties and all damage to private and public property.
      </p>

      <div>
        <p><span className="text-text font-semibold underline">2) RULES OF PLAY:</span></p>
        <ul className="mt-1.5 space-y-1 pl-4">
          <li>a) Play each hole <span className="font-semibold">only</span> from the designated Teeing areas</li>
          <li>b) <span className="font-semibold">DO NOT</span> hit balls <span className="font-semibold">over</span> footpaths (Out of Bounds)</li>
          <li>c) <span className="font-semibold">DO NOT</span> hit balls off, <span className="font-semibold">from on the greens</span></li>
          <li>d) <span className="font-semibold">REPLACE</span> all divots (displaced turf), <span className="font-semibold">all over the course, particularly on the Teeing areas</span></li>
          <li>e) <span className="font-semibold">REPAIR</span> any golf ball pitch marks on the putting greens</li>
        </ul>
      </div>

      <p>
        <span className="text-text font-semibold underline">3) MAXIMUM GROUP SIZE: - FOUR-BALL</span><br />
        <span className="font-semibold">NO MORE</span> than 4 players allowed per group
      </p>

      <p>
        <span className="text-text font-semibold underline">4) STROKE LIMIT per HOLE:</span><br />
        MAXIMUM of 7 strokes for each player
      </p>

      <div>
        <p><span className="text-text font-semibold underline">5) COURTESY on the Course:</span></p>
        <ul className="mt-1.5 space-y-1 pl-4">
          <li>a) PLAY WITHOUT ANY UNDUE DELAY</li>
          <li>b) ALLOW faster playing groups to play through</li>
          <li>c) KEEP the course clean and tidy – place all your litter in the litter bins provided around the course.</li>
        </ul>
      </div>

      <p className="pt-2 text-text font-medium">
        Many thanks for your <span className="whitespace-nowrap">co-operation</span>
      </p>
      <p className="text-text font-semibold">
        Enjoy your game
      </p>

      <p className="pt-4 font-ui text-xs text-muted leading-relaxed">
        Rules provided by the{' '}
        <a
          href="https://www.bruntsfieldshortholegolfclub.co.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 active:opacity-70"
        >
          Bruntsfield Short Hole Golf Club
        </a>
      </p>

    </div>
  )
}
