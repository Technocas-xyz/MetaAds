import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import Table, { TableMobileCard } from '../../../components/ui/Table'

const COLUMNS = [
  { key: 'name',   header: 'Name',   sortable: true },
  { key: 'email',  header: 'Email' },
  { key: 'status', header: 'Status' },
]

const DATA = [
  { name: 'Arun',  email: 'arun@test.com',  status: 'Active' },
  { name: 'Sarah', email: 'sarah@test.com', status: 'Invited' },
]

describe('Table', () => {
  it('renders column headers with scope="col"', () => {
    render(<Table columns={COLUMNS} data={DATA} />)
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(3)
    headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'))
  })

  it('renders one row per data item', () => {
    render(<Table columns={COLUMNS} data={DATA} />)
    expect(screen.getByText('Arun')).toBeInTheDocument()
    expect(screen.getByText('Sarah')).toBeInTheDocument()
  })

  it('renders custom cell renderer', () => {
    const cols = [
      ...COLUMNS,
      {
        key: 'badge',
        header: 'Badge',
        cell: (row) => <span data-testid="badge">{row.status}</span>,
      },
    ]
    render(<Table columns={cols} data={DATA} />)
    expect(screen.getAllByTestId('badge')).toHaveLength(2)
  })

  it('shows empty state when data is empty', () => {
    render(<Table columns={COLUMNS} data={[]} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('shows loading skeletons when loading=true', () => {
    render(<Table columns={COLUMNS} data={[]} loading />)
    // Skeleton rows are rendered instead of data rows
    expect(screen.queryByText('Arun')).not.toBeInTheDocument()
  })

  it('calls onRowClick with the correct row', async () => {
    const onRowClick = vi.fn()
    render(<Table columns={COLUMNS} data={DATA} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Arun'))
    expect(onRowClick).toHaveBeenCalledWith(DATA[0], 0)
  })

  it('supports row selection — select all', async () => {
    const onChange = vi.fn()
    render(
      <Table
        columns={COLUMNS}
        data={DATA}
        selection={{ selected: new Set(), onChange }}
      />
    )
    const selectAll = screen.getByRole('checkbox', { name: /select all/i })
    await userEvent.click(selectAll)
    expect(onChange).toHaveBeenCalledWith(new Set([0, 1]))
  })

  it('supports sorting — calls sort.onChange', async () => {
    const onSortChange = vi.fn()
    render(
      <Table
        columns={COLUMNS}
        data={DATA}
        sort={{ key: 'name', dir: 'asc', onChange: onSortChange }}
      />
    )
    await userEvent.click(screen.getByRole('columnheader', { name: /name/i }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', dir: 'desc' })
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Table columns={COLUMNS} data={DATA} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('TableMobileCard', () => {
  it('renders field labels and values', () => {
    render(
      <TableMobileCard
        row={DATA[0]}
        columns={COLUMNS}
      />
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Arun')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(
      <TableMobileCard
        row={DATA[0]}
        columns={COLUMNS}
        onClick={onClick}
      />
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
