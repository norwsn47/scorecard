// The small up-and-right arrow (↗) trailing an outbound or "leaves this screen"
// link (DESIGN.md "Icons": `w-2.5 h-2.5`, stroke 1.5, round caps). One
// definition so every link that carries it draws the identical glyph.
export default function ExternalArrow() {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 relative top-px">
      <path d="M2 8L8 2M8 2H4M8 2V6" />
    </svg>
  )
}
