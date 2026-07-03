import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import Select from '../../../components/ui/Select'

const OPTIONS = [
  { value: 'fb', label: 'Facebook' },
  { value: 'ig', label: 'Instagram' },
  { value: 'tt', label: 'TikTok' },
]

describe('Select', () => {
  it('renders placeholder when no value', () => {
    render(<Select options={OPTIONS} placeholder="Choose platform" />)
    expect(screen.getByText('Choose platform')).toBeInTheDocument()
  })

  it('shows selected label for single-select', () => {
    render(<Select options={OPTIONS} value="fb" onChange={() => {}} />)
    expect(screen.getByText('Facebook')).toBeInTheDocument()
  })

  it('opens dropdown on trigger click', async () => {
    render(<Select options={OPTIONS} placeholder="Choose" />)
    await userEvent.click(screen.getByText('Choose'))
    expect(await screen.findByText('Instagram')).toBeInTheDocument()
  })

  it('calls onChange with value on option select', async () => {
    const onChange = vi.fn()
    render(<Select options={OPTIONS} placeholder="Choose" onChange={onChange} />)
    await userEvent.click(screen.getByText('Choose'))
    await userEvent.click(await screen.findByText('TikTok'))
    expect(onChange).toHaveBeenCalledWith('tt')
  })

  it('supports multi-select — shows chips for selected', () => {
    render(
      <Select multi options={OPTIONS} value={['fb', 'ig']} onChange={() => {}} />
    )
    expect(screen.getByText('Facebook')).toBeInTheDocument()
    expect(screen.getByText('Instagram')).toBeInTheDocument()
  })

  it('filters options when searching', async () => {
    render(<Select options={OPTIONS} placeholder="Choose" searchable />)
    await userEvent.click(screen.getByText('Choose'))
    const search = await screen.findByPlaceholderText(/search/i)
    await userEvent.type(search, 'face')
    expect(screen.getByText('Facebook')).toBeInTheDocument()
    expect(screen.queryByText('TikTok')).not.toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Select options={OPTIONS} label="Platform" />)
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<Select options={OPTIONS} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Select options={OPTIONS} label="Platform" placeholder="Choose" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
