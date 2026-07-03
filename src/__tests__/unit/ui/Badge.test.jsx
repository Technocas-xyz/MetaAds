import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import Badge from '../../../components/ui/Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies soft variant by default', () => {
    const { container } = render(<Badge color="green">OK</Badge>)
    const span = container.querySelector('span')
    expect(span.className).toMatch(/bg-green/)
  })

  it('applies solid variant classes', () => {
    const { container } = render(<Badge color="red" variant="solid">Error</Badge>)
    const span = container.querySelector('span')
    expect(span.className).toMatch(/bg-red-600/)
    expect(span.className).toMatch(/text-white/)
  })

  it('applies outline variant classes', () => {
    const { container } = render(<Badge color="blue" variant="outline">Info</Badge>)
    const span = container.querySelector('span')
    expect(span.className).toMatch(/border/)
    expect(span.className).toMatch(/border-blue/)
  })

  it('renders xs size', () => {
    const { container } = render(<Badge size="xs">XS</Badge>)
    expect(container.querySelector('span').className).toMatch(/text-\[10px\]/)
  })

  it('renders md size', () => {
    const { container } = render(<Badge size="md">MD</Badge>)
    expect(container.querySelector('span').className).toMatch(/font-semibold/)
  })

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-cls">Test</Badge>)
    expect(container.querySelector('span').className).toMatch(/custom-cls/)
  })

  it('passes through extra props', () => {
    render(<Badge data-testid="badge">Tag</Badge>)
    expect(screen.getByTestId('badge')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Badge color="green">Active</Badge>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
