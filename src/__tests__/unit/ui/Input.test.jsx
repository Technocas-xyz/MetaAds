import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import Input from '../../../components/ui/Input'

describe('Input', () => {
  it('renders with a label linked to the input', () => {
    render(<Input label="Email" id="email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toBeInTheDocument()
    expect(input.id).toBe('email')
  })

  it('accepts user input', async () => {
    render(<Input label="Name" />)
    const input = screen.getByLabelText('Name')
    await userEvent.type(input, 'Arun')
    expect(input).toHaveValue('Arun')
  })

  it('displays error message with role="alert"', () => {
    render(<Input label="Email" error="Invalid email" />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Invalid email')
  })

  it('sets aria-invalid when error is present', () => {
    render(<Input label="Email" error="Required" />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not show error message when no error', () => {
    render(<Input label="Email" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows helper text when no error', () => {
    render(<Input label="URL" helper="Include https://" />)
    expect(screen.getByText('Include https://')).toBeInTheDocument()
  })

  it('hides helper text when error is present', () => {
    render(<Input label="URL" helper="Include https://" error="Invalid URL" />)
    expect(screen.queryByText('Include https://')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid URL')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Name" disabled />)
    expect(screen.getByLabelText('Name')).toBeDisabled()
  })

  it('renders prefix text', () => {
    render(<Input label="Website" prefix="https://" />)
    expect(screen.getByText('https://')).toBeInTheDocument()
  })

  it('calls onChange handler', async () => {
    const onChange = vi.fn()
    render(<Input label="Search" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Search'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Input label="Test" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no accessibility violations with error', async () => {
    const { container } = render(<Input label="Test" error="Required" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
