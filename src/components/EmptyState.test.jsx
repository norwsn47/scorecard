import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EmptyState from './EmptyState.jsx'
import Button from './Button.jsx'

describe('EmptyState', () => {
  it('renders the title and body in the Title and Body styles, centred', () => {
    render(<EmptyState title="No rounds yet" body="Finish a round to see it here." data-testid="e" />)
    expect(screen.getByTestId('e')).toHaveClass('text-center')
    expect(screen.getByText('No rounds yet')).toHaveClass('type-title', 'text-text')
    expect(screen.getByText('Finish a round to see it here.')).toHaveClass('type-body', 'text-muted')
  })

  it('has no role by default and passes role="alert" through', () => {
    const { rerender } = render(<EmptyState title="No rounds yet" />)
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(<EmptyState role="alert" title="Couldn't load your rounds" body="Check your connection and try again." />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load your rounds")
    expect(alert).toHaveTextContent('Check your connection and try again.')
  })

  it('reproduces the signed-out History block', () => {
    render(
      <EmptyState
        role="alert"
        title="You've been signed out"
        body="Sign in again to see your rounds."
        action={<Button size="medium">Sign in</Button>}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent("You've been signed out")
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('renders the action prop or children in the action area, and omits it when absent', () => {
    const { rerender } = render(<EmptyState title="T" action={<Button>Go</Button>} data-testid="e" />)
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
    rerender(<EmptyState title="T" data-testid="e"><Button variant="text">Show all rounds</Button></EmptyState>)
    expect(screen.getByRole('button', { name: 'Show all rounds' })).toBeInTheDocument()
    rerender(<EmptyState title="T" data-testid="e" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByTestId('e').children).toHaveLength(1)
  })

  it('omits the body when not given', () => {
    render(<EmptyState title="Only a title" data-testid="e" />)
    expect(screen.getByTestId('e').querySelectorAll('p')).toHaveLength(1)
  })

  it('uses a paragraph title by default and a heading when asked', () => {
    const { rerender } = render(<EmptyState title="T" />)
    expect(screen.queryByRole('heading')).toBeNull()
    rerender(<EmptyState title="T" titleAs="h2" />)
    expect(screen.getByRole('heading', { level: 2, name: 'T' })).toBeInTheDocument()
  })

  it('merges className for layout', () => {
    render(<EmptyState title="T" className="pt-16" data-testid="e" />)
    expect(screen.getByTestId('e')).toHaveClass('pt-16', 'text-center')
  })
})
