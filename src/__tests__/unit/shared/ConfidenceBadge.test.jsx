import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import ConfidenceBadge from '../../../components/shared/ConfidenceBadge'

describe('ConfidenceBadge', () => {
  it('shows "High" for score >= 70', () => {
    render(<ConfidenceBadge score={87} />)
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('shows "Medium" for score 40–69', () => {
    render(<ConfidenceBadge score={55} />)
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('shows "Low" for score < 40', () => {
    render(<ConfidenceBadge score={30} />)
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('shows score percentage when showScore=true (default)', () => {
    render(<ConfidenceBadge score={87} />)
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('hides score when showScore=false', () => {
    render(<ConfidenceBadge score={87} showScore={false} />)
    expect(screen.queryByText('87%')).not.toBeInTheDocument()
  })

  it('accepts level prop directly', () => {
    render(<ConfidenceBadge level="Low" />)
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('has role="status" for screen-reader announcement', () => {
    render(<ConfidenceBadge score={80} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('aria-label includes level and score', () => {
    render(<ConfidenceBadge score={80} />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Confidence: High (80%)'
    )
  })

  it('applies emerald colour for High', () => {
    const { container } = render(<ConfidenceBadge score={80} />)
    expect(container.querySelector('span').className).toMatch(/emerald/)
  })

  it('applies amber colour for Medium', () => {
    const { container } = render(<ConfidenceBadge score={60} />)
    expect(container.querySelector('span').className).toMatch(/amber/)
  })

  it('applies red colour for Low', () => {
    const { container } = render(<ConfidenceBadge score={20} />)
    expect(container.querySelector('span').className).toMatch(/red/)
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<ConfidenceBadge score={80} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
