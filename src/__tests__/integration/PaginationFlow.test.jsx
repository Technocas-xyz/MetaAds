/**
 * Integration tests for Pagination component flow.
 * Verifies page navigation and per-page change interactions.
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import Pagination from '../../components/ui/Pagination'
import { useState } from 'react'

function PaginationHarness({ total = 100 }) {
  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(10)
  return (
    <>
      <div data-testid="current-page">{page}</div>
      <div data-testid="per-page">{perPage}</div>
      <Pagination
        page={page}
        perPage={perPage}
        total={total}
        onPage={setPage}
        onPerPage={setPerPage}
      />
    </>
  )
}

describe('Pagination — full flow', () => {
  it('starts on page 1 and shows correct range', () => {
    render(<PaginationHarness />)
    expect(screen.getByTestId('current-page')).toHaveTextContent('1')
    expect(screen.getByText('1–10 of 100')).toBeInTheDocument()
  })

  it('navigates forward on Next click', async () => {
    render(<PaginationHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByTestId('current-page')).toHaveTextContent('2')
    expect(screen.getByText('11–20 of 100')).toBeInTheDocument()
  })

  it('navigates backwards on Previous click', async () => {
    render(<PaginationHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(screen.getByTestId('current-page')).toHaveTextContent('1')
  })

  it('jumps to a specific page number', async () => {
    render(<PaginationHarness />)
    // Page 2 is always visible on page 1 (within delta range)
    await userEvent.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(screen.getByTestId('current-page')).toHaveTextContent('2')
    expect(screen.getByText('11–20 of 100')).toBeInTheDocument()
  })

  it('changes per-page and resets to page 1', async () => {
    render(<PaginationHarness />)
    // Navigate to page 2 first
    await userEvent.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(screen.getByTestId('current-page')).toHaveTextContent('2')

    // Change per-page
    const select = screen.getByRole('combobox', { name: 'Rows per page' })
    await userEvent.selectOptions(select, '25')

    expect(screen.getByTestId('per-page')).toHaveTextContent('25')
    expect(screen.getByTestId('current-page')).toHaveTextContent('1')
    expect(screen.getByText('1–25 of 100')).toBeInTheDocument()
  })

  it('disables Next on last page', async () => {
    render(<PaginationHarness total={10} />)
    // Only 1 page of 10 items with perPage=10
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('disables Prev on first page', () => {
    render(<PaginationHarness />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('shows ellipsis for large page counts', () => {
    render(<PaginationHarness total={500} />)
    expect(screen.getAllByText('…').length).toBeGreaterThan(0)
  })
})
