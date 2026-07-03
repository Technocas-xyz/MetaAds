import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import Button from '../../../components/ui/Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled and shows aria-busy when loading', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders each variant without crashing', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger']
    variants.forEach((v) => {
      const { unmount } = render(<Button variant={v}>{v}</Button>)
      expect(screen.getByRole('button', { name: v })).toBeInTheDocument()
      unmount()
    })
  })

  it('renders as a link when href is provided', () => {
    render(<Button href="https://example.com">External</Button>)
    const link = screen.getByRole('link', { name: 'External' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('renders fullWidth class when fullWidth is true', () => {
    render(<Button fullWidth>Wide</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('renders with icon', () => {
    const Icon = () => <svg data-testid="icon" />
    render(<Button icon={Icon}>With Icon</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Accessible</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
