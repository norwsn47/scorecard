// Small star badge marking a player's name as the signed-in account holder's
// own name (PRD §11.15) — an identity marker only, never a score or winner
// style. Deliberately colourless: it renders in `currentColor`, so it always
// takes on whatever colour its surrounding context already applies to that
// name (muted column header, accent winner name, text-on-accent filter chip)
// rather than introducing a colour rule of its own. That keeps it inert with
// respect to the §5.3 vs-par colour system and the winner treatment, exactly
// as PRD §11.15 requires.
//
// Sized to match the existing "annotation beside text" icon (the external
// link ↗, `w-2.5 h-2.5`, DESIGN.md "Icons") rather than inventing a new size
// tier — same role, same scale.
export default function PlayerStar({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="You"
      className={['w-2.5 h-2.5 shrink-0 inline-block align-middle', className].join(' ')}
    >
      <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  )
}
