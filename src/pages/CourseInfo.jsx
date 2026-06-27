const FACTS = [
  { label: 'Location', value: 'Bruntsfield, Edinburgh, Scotland' },
  { label: 'Type', value: 'Public short hole course — free to play' },
  { label: 'Holes', value: 'Up to 36 short holes' },
  { label: 'History', value: 'Golf has been played on Bruntsfield Links since at least the 16th century — one of the oldest public golfing grounds in the world' },
  { label: 'The Tavern', value: 'The Golf Tavern has overlooked the Links since 1456' },
]

export default function CourseInfo({ navigate }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Header */}
      <header className="flex items-center px-5 pt-12 pb-6 border-b border-border">
        <button
          onClick={() => navigate('home')}
          className="py-2 text-muted font-ui text-sm tracking-[0.08em] uppercase mr-auto"
        >
          ← Back
        </button>
      </header>

      {/* Hero */}
      <div className="px-6 pt-10 pb-8 text-center border-b border-border">
        <p className="font-ui text-xs tracking-[0.2em] uppercase text-muted mb-2">Course Map</p>
        <h1 className="font-display italic text-4xl text-text leading-tight">
          Bruntsfield Links
        </h1>
        <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mt-2">
          Edinburgh
        </p>
        <div className="w-8 h-0.5 bg-accent mx-auto mt-6" />
      </div>

      {/* Map image */}
      <div className="relative overflow-hidden mx-0">
        <img
          src="/course-map.jpg"
          alt="Bruntsfield Links course map"
          className="w-full block"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 45%, rgba(250,247,240,0.55) 68%, rgba(250,247,240,0.92) 85%, rgba(250,247,240,1) 100%)',
          }}
        />
      </div>

      {/* Facts */}
      <div className="flex-1 px-6 py-6 space-y-4 max-w-sm mx-auto w-full">
        {FACTS.map(({ label, value }) => (
          <div key={label} className="bg-bg-card rounded-md border border-border px-5 py-4">
            <p className="font-ui text-xs tracking-[0.15em] uppercase text-muted mb-1">{label}</p>
            <p className="font-ui text-sm text-text leading-relaxed">{value}</p>
          </div>
        ))}
      </div>


    </div>
  )
}
