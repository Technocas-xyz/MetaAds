import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { render } from '../../../test/utils'
import Modal from '../../../components/ui/Modal'

describe('Modal', () => {
  it('does not render content when closed', () => {
    render(
      <Modal open={false} onOpenChange={() => {}} title="Test Modal">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    )
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders title and body when open', () => {
    render(
      <Modal open={true} onOpenChange={() => {}} title="Test Modal">
        <Modal.Body>Modal body content</Modal.Body>
      </Modal>
    )
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal body content')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <Modal open={true} onOpenChange={() => {}} title="T" description="Helpful hint">
        <div>Body</div>
      </Modal>
    )
    expect(screen.getByText('Helpful hint')).toBeInTheDocument()
  })

  it('renders footer slot', () => {
    render(
      <Modal open={true} onOpenChange={() => {}} title="T" footer={<button>Save</button>}>
        <div>Body</div>
      </Modal>
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Close button clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <Modal open={true} onOpenChange={onOpenChange} title="Closeable">
        <div>Body</div>
      </Modal>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Modal open={true} onOpenChange={() => {}} title="Accessible Modal">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
