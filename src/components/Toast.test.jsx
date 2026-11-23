import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Toast from './Toast.jsx'

describe('Toast', () => {
  it('announces an error as an alert on the error fill', () => {
    render(<Toast>Couldn't save</Toast>)
    const msg = screen.getByRole('alert')
    expect(msg).toHaveTextContent("Couldn't save")
    expect(msg.parentElement).toHaveClass('bg-error', 'text-on-accent', 'absolute', 'inset-x-page')
  })

  it('announces a notice as a status on the accent fill', () => {
    render(<Toast tone="notice">Your email address has been updated.</Toast>)
    expect(screen.getByRole('status').parentElement).toHaveClass('bg-accent')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the dismiss button outside the live region and calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(<Toast onDismiss={onDismiss}>Couldn't save</Toast>)
    const button = screen.getByRole('button', { name: 'Dismiss' })
    expect(screen.getByRole('alert')).not.toContainElement(button)
    fireEvent.click(button)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('has no dismiss button when none is asked for', () => {
    render(<Toast>Couldn't save</Toast>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
