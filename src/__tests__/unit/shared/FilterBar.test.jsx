import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import FilterBar from '../../../components/shared/FilterBar'

describe('FilterBar', () => {
  it('renders children', () => {
    render(
      <FilterBar>
        <input placeholder="Search" />
      </FilterBar>
    )
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })

  it('shows "Clear filters" button when hasFilters=true', () => {
    const onClear = vi.fn()
    render(
      <FilterBar hasFilters onClear={onClear}>
        <input />
      </FilterBar>
    )
    expect(screen.getByText(/clear filters/i)).toBeInTheDocument()
  })

  it('hides "Clear filters" when hasFilters=false', () => {
    render(
      <FilterBar hasFilters={false} onClear={() => {}}>
        <input />
      </FilterBar>
    )
    expect(screen.queryByText(/clear filters/i)).not.toBeInTheDocument()
  })

  it('calls onClear when Clear button is clicked', async () => {
    const onClear = vi.fn()
    render(
      <FilterBar hasFilters onClear={onClear}>
        <input />
      </FilterBar>
    )
    await userEvent.click(screen.getByText(/clear filters/i))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('infers active filters from filters object', () => {
    render(
      <FilterBar filters={{ status: 'active', search: '' }} onClear={() => {}}>
        <input />
      </FilterBar>
    )
    expect(screen.getByText(/clear filters/i)).toBeInTheDocument()
  })

  it('does not show clear button when all filter values are empty', () => {
    render(
      <FilterBar filters={{ status: '', platform: '' }} onClear={() => {}}>
        <input />
      </FilterBar>
    )
    expect(screen.queryByText(/clear filters/i)).not.toBeInTheDocument()
  })

  it('renders label icon when label=true', () => {
    render(<FilterBar label><input /></FilterBar>)
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('renders "More filters" toggle when primaryCount < total children', () => {
    render(
      <FilterBar primaryCount={1}>
        <input placeholder="Search" />
        <input placeholder="Role" />
        <input placeholder="Status" />
      </FilterBar>
    )
    expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument()
  })

  it('expands secondary filters when "More filters" is toggled', async () => {
    render(
      <FilterBar primaryCount={1}>
        <input placeholder="Search" />
        <input placeholder="Role filter" />
      </FilterBar>
    )
    const btn = screen.getByRole('button', { name: /more filters/i })
    await userEvent.click(btn)
    // The secondary panel now has aria-controls set and is visible
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    // At least one instance of "Role filter" should be in the expanded panel
    const inputs = screen.getAllByPlaceholderText('Role filter')
    const visibleInput = inputs.find(el => !el.closest('[class*="hidden md:flex"]'))
    expect(visibleInput).toBeTruthy()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <FilterBar>
        <input placeholder="Search" />
      </FilterBar>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
