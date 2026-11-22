// Centred empty, error or no-match block (Figma Empty state): a Title, one
// plain sentence, and an optional action. Generic on purpose: the caller owns
// the wording and the action (usually a Button).
//
//   <EmptyState title="No rounds yet" body="Finish a round to see it here."
//               action={<Button size="medium">New game</Button>} />
//
// `role` is passed through, so an error state can announce itself with
// role="alert". `titleAs` picks the title element (a paragraph by default, as
// the shipped History blocks are; pass 'h2' where the page wants a heading).
// `action` and `children` both render in the action area. className is for
// layout only (pt-16 and so on).
export default function EmptyState({
  title,
  body,
  action,
  children,
  role,
  titleAs: TitleTag = 'p',
  className = '',
  ...rest
}) {
  const hasAction = Boolean(action || children)
  const classes = ['text-center', className].filter(Boolean).join(' ')
  return (
    <div role={role} className={classes} {...rest}>
      <TitleTag className="type-title text-text">{title}</TitleTag>
      {body ? <p className="type-body text-muted mt-related">{body}</p> : null}
      {hasAction ? (
        <div className="mt-section">
          {action}
          {children}
        </div>
      ) : null}
    </div>
  )
}
