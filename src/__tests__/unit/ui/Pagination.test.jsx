import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import Pagination from '../../../components/ui/Pagination'

function setup(overrides = {}) {
  const props = {
    page: 1,
    perPage: 25,
    total: 100,
    onPage: vi.fn(),
    onPerPage: vi.fn(),
    ...overrides,
  }
  render(<Pagination {...props} />)
  return props
}

describe('Pagination', () => {
  it('renders page count summary', () => {
    setup()
    expect(screen.getByText('1–25 of 100')).toBeInTheDocument()
  })

  it('renders "No results" when total is 0', () => {
    setup({ total: 0 })
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('disables Previous button on first page', () => {
    setup({ page: 1 })
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('disables Next button on last page', () => {
    setup({ page: 4, total: 100, perPage: 25 })
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('calls onPage with next page on Next click', async () => {
    const { onPage } = setup({ page: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPage).toHaveBeenCalledWith(3)
  })

  it('calls onPage with previous page on Prev click', async () => {
    const { onPage } = setup({ page: 3 })
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it('calls onPage when a numbered page button is clicked', async () => {
    const { onPage } = setup({ page: 1, total: 50, perPage: 10 })
    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(onPage).toHaveBeenCalledWith(3)
  })

  it('calls onPerPage and resets to page 1 when rows-per-page changes', async () => {
    const { onPerPage, onPage } = setup()
    const select = screen.getByRole('combobox', { name: 'Rows per page' })
    await userEvent.selectOptions(select, '50')
    expect(onPerPage).toHaveBeenCalledWith(50)
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it('marks active page with aria-current="page"', () => {
    setup({ page: 2, total: 50, perPage: 10 })
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Pagination page={2} perPage={25} total={100} onPage={() => {}} onPerPage={() => {}} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
