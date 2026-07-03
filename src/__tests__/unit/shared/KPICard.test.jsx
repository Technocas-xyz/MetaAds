import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { TrendingUp, Activity } from 'lucide-react'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import KPICard from '../../../components/ui/KPICard'

describe('KPICard', () => {
  const baseProps = {
    title: 'Total Ads',
    value: 142,
    icon: Activity,
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-500',
  }

  it('renders title and value', () => {
    render(<KPICard {...baseProps} />)
    expect(screen.getByText('Total Ads')).toBeInTheDocument()
    expect(screen.getByText('142')).toBeInTheDocument()
  })

  it('formats large numbers with locale separators', () => {
    render(<KPICard {...baseProps} value={1234567} />)
    expect(screen.getByText('1,234,567')).toBeInTheDocument()
  })

  it('shows "—" when value is undefined', () => {
    render(<KPICard {...baseProps} value={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders upward trend with positive styling', () => {
    render(<KPICard {...baseProps} trend={12.5} trendUp />)
    expect(screen.getByText(/12\.5%/)).toBeInTheDocument()
    expect(screen.getByText(/12\.5%/).closest('div')).toHaveClass('text-success-600')
  })

  it('renders downward trend with negative styling', () => {
    render(<KPICard {...baseProps} trend={5.2} trendUp={false} />)
    expect(screen.getByText(/5\.2%/).closest('div')).toHaveClass('text-danger-600')
  })

  it('renders note text when trend is absent', () => {
    render(<KPICard {...baseProps} note="Last 7 days" />)
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
  })

  it('renders as a link when href is provided', () => {
    render(<KPICard {...baseProps} href="/ads" />)
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<KPICard {...baseProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
