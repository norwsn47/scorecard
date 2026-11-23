import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DateField, Input, Select, Textarea } from './Field.jsx'

describe('Field', () => {
  it('ties the visible label to each control', () => {
    render(
      <>
        <Input label="Name" />
        <Select label="Course"><option>A</option></Select>
        <DateField label="Date played" />
        <Textarea label="Notes" />
      </>,
    )
    expect(screen.getByLabelText('Name').tagName).toBe('INPUT')
    expect(screen.getByLabelText('Course').tagName).toBe('SELECT')
    expect(screen.getByLabelText('Date played')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA')
  })

  it('hideLabel keeps the accessible name but hides the label visually', () => {
    render(<Input label="Player 1 name" hideLabel />)
    expect(screen.getByRole('textbox', { name: 'Player 1 name' })).toBeInTheDocument()
    expect(screen.getByText('Player 1 name').className).toContain('sr-only')
  })

  it('uses the shared edge, fill, radius and solid focus ring', () => {
    render(<Input label="Name" />)
    const el = screen.getByLabelText('Name')
    for (const c of ['border-field', 'bg-bg-card', 'rounded-control', 'focus:ring-2', 'focus:ring-accent']) {
      expect(el.className).toContain(c)
    }
    expect(el.className).not.toContain('ring-accent/40')
  })

  it('describes the field with helper text', () => {
    render(<Input label="Name" helper="As it appears on the card" />)
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('As it appears on the card')
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid')
  })

  it('shows an error with the accent edge, aria-invalid and a description', () => {
    render(<Input label="Name" helper="Helper" error="That name is taken" />)
    const el = screen.getByLabelText('Name')
    expect(el).toHaveAttribute('aria-invalid', 'true')
    expect(el.className).toContain('border-error')
    expect(el.className).not.toContain('border-field')
    expect(el).toHaveAccessibleDescription('That name is taken')
    expect(screen.getByRole('alert')).toHaveTextContent('That name is taken')
    expect(screen.queryByText('Helper')).toBeNull()
  })

  it('errorRole={null} renders the message without an alert role', () => {
    render(<Input label="Name" error="Taken" errorRole={null} />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Taken')).toBeInTheDocument()
  })

  it('error={true} marks the edge without rendering a message', () => {
    render(<Input label="Name" error />)
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps a caller aria-describedby alongside its own', () => {
    render(<><p id="x">Extra</p><Input label="Name" helper="Help" aria-describedby="x" /></>)
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Extra Help')
  })

  it('optional keeps the label name clean and adds "Optional" to the description', () => {
    render(<Textarea label="Round notes" optional />)
    const el = screen.getByLabelText('Round notes')
    expect(el).toHaveAccessibleDescription('Optional')
    expect(screen.getByText(/- optional/)).toBeInTheDocument()
  })

  it('forwards the ref to the native control for each kind', () => {
    const refs = [createRef(), createRef(), createRef(), createRef()]
    render(
      <>
        <Input ref={refs[0]} label="A" />
        <Select ref={refs[1]} label="B"><option>x</option></Select>
        <DateField ref={refs[2]} label="C" />
        <Textarea ref={refs[3]} label="D" />
      </>,
    )
    expect(refs.map(r => r.current.tagName)).toEqual(['INPUT', 'SELECT', 'INPUT', 'TEXTAREA'])
    refs[0].current.focus()
    expect(refs[0].current).toHaveFocus()
  })

  it('disabled uses the disabled tokens, not opacity', () => {
    render(<Input label="Name" disabled />)
    const el = screen.getByLabelText('Name')
    expect(el).toBeDisabled()
    expect(el.className).toContain('disabled:bg-disabled-surface')
    expect(el.className).toContain('disabled:text-disabled-text')
    expect(el.className).not.toMatch(/opacity-/)
  })

  it('renders a trailing remove slot and makes room for it', () => {
    render(<Input label="Player 1 name" hideLabel trailing={<button type="button" aria-label="Remove player 1" />} />)
    expect(screen.getByRole('button', { name: 'Remove player 1' })).toBeInTheDocument()
    expect(screen.getByLabelText('Player 1 name').className).toContain('pr-12')
  })

  it('passes native props through (value, placeholder, maxLength)', () => {
    render(<Input label="Name" placeholder="Your name" maxLength={5} defaultValue="Ann" />)
    const el = screen.getByLabelText('Name')
    expect(el).toHaveAttribute('placeholder', 'Your name')
    expect(el).toHaveAttribute('maxlength', '5')
    expect(el).toHaveValue('Ann')
  })
})

describe('Field - one right padding per control', () => {
  // pr-4 used to sit beside pr-10 / pr-12; Tailwind emits pr-4 later in the
  // CSS, so it won and a long select value ran under the chevron.
  it('a select reserves room for its chevron and carries no pr-4', () => {
    render(<Select label="Course"><option>Bruntsfield Short Hole Golf Course</option></Select>)
    const select = screen.getByLabelText('Course')
    expect(select).toHaveClass('pr-10', 'truncate')
    expect(select).not.toHaveClass('pr-4')
  })

  it('an input with a trailing element reserves room for it and carries no pr-4', () => {
    render(<Input label="Email" trailing={<span>x</span>} />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveClass('pr-12')
    expect(input).not.toHaveClass('pr-4')
  })

  it('a plain input and a textarea keep pr-4', () => {
    render(<><Input label="Name" /><Textarea label="Notes" /></>)
    expect(screen.getByLabelText('Name')).toHaveClass('pr-4')
    expect(screen.getByLabelText('Notes')).toHaveClass('pr-4')
  })
})
