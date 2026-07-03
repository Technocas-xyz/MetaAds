import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import Card from '../../../components/ui/Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Card title="My Card">Body</Card>)
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<Card title="T" subtitle="Subtitle text">Body</Card>)
    expect(screen.getByText('Subtitle text')).toBeInTheDocument()
  })

  it('renders headerRight slot', () => {
    render(
      <Card title="T" headerRight={<button>Action</button>}>Body</Card>
    )
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })

  it('renders without border when border=false', () => {
    const { container } = render(<Card border={false}>Body</Card>)
    expect(container.firstChild).not.toHaveClass('border')
  })

  it('applies custom className', () => {
    const { container } = render(<Card className="extra-class">Body</Card>)
    expect(container.firstChild).toHaveClass('extra-class')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Card title="Accessible Card">Content</Card>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
