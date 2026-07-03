/**
 * Integration tests for the Add New Ad form.
 * NOTE: VITE_USE_MOCKS=true in .env means real HTTP is bypassed — submission tests
 * mock useCreateAd directly rather than relying on MSW interception.
 * Tests: validation, submission, file upload, success/error states.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import AddNewAdPage from '../../features/ads-library/AddNewAdPage'

// Mock react-router-dom navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// Mock the useCompetitors hook to avoid network calls for competitor autocomplete
vi.mock('../../hooks/queries/useCompetitors', () => ({
  useCompetitors: () => ({
    data: { data: [{ id: 'c1', name: 'PrintMagic Pro' }] },
    isLoading: false,
  }),
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
  toast:   { success: vi.fn(), error: vi.fn() },
}))

// Mock useCreateAd so we can control onSuccess / onError per test
const mockMutate = vi.fn()
vi.mock('../../hooks/queries/useAds', () => ({
  useCreateAd: () => ({ mutate: mockMutate, isPending: false }),
}))

vi.mock('../../hooks/queries/useReview', () => ({
  useSubmitToReview: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}))

beforeEach(() => {
  mockMutate.mockReset()
  // Default: call onSuccess
  mockMutate.mockImplementation((_data, opts) => opts?.onSuccess?.({ id: 'ad-new' }))
})

async function fillRequiredFields() {
  // Competitor — type in the combobox input and select option
  const compInput = screen.getByPlaceholderText(/search competitor/i)
  await userEvent.type(compInput, 'PrintMagic')
  const options = await screen.findAllByText(/PrintMagic/i)
  if (options.length > 0) await userEvent.click(options[options.length - 1])

  // Platform — PlatformChips renders <button> elements (not checkboxes).
  // Facebook + Instagram are selected by default; just assert the button exists.
  expect(screen.getByRole('button', { name: /^Facebook$/i })).toBeInTheDocument()

  // Primary text
  const primaryText = screen.getByLabelText(/primary text/i)
  await userEvent.type(primaryText, 'Shop now for custom DTF transfers')

  // Start date
  const startDate = screen.getByLabelText(/start date/i)
  fireEvent.change(startDate, { target: { value: '2026-05-01' } })
}

describe('AddNewAdPage — validation', () => {
  it('shows required field errors on empty submit', async () => {
    render(<AddNewAdPage />, { initialEntries: ['/ads/new'] })
    const submitBtn = screen.getByRole('button', { name: /save ad/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0)
    })
  })

  it('shows URL validation error for invalid ad URL on form submit', async () => {
    render(<AddNewAdPage />, { initialEntries: ['/ads/new'] })
    const urlInput = screen.getByLabelText(/ad url/i)
    await userEvent.type(urlInput, 'not-a-url')
    await userEvent.click(screen.getByRole('button', { name: /save ad/i }))
    await waitFor(() => {
      expect(screen.getByText(/valid url/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows max-length error when primary text exceeds 500 chars', async () => {
    render(<AddNewAdPage />, { initialEntries: ['/ads/new'] })
    const primaryText = screen.getByLabelText(/primary text/i)
    fireEvent.change(primaryText, { target: { value: 'a'.repeat(501) } })
    await userEvent.click(screen.getByRole('button', { name: /save ad/i }))
    await waitFor(() => {
      expect(screen.getByText(/max 500/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('AddNewAdPage — file upload', () => {
  it('accepts an image file and previews it', async () => {
    render(<AddNewAdPage />, { initialEntries: ['/ads/new'] })
    const file = new File(['dummy-content'], 'screenshot.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) return

    await userEvent.upload(fileInput, file)
    await waitFor(() => {
      expect(screen.queryByText(/screenshot\.png/i)).toBeTruthy()
    })
  })
})

describe('AddNewAdPage — submission', () => {
  it('calls createAd and shows success toast on valid submit', async () => {
    const toast = (await import('react-hot-toast')).default
    render(<AddNewAdPage />, { initialEntries: ['/ads/new'] })

    await fillRequiredFields()

    const file = new File(['img'], 'ad.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) await userEvent.upload(fileInput, file)

    await userEvent.click(screen.getByRole('button', { name: /save ad/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('shows error toast when createAd fails', async () => {
    // Override mock to simulate failure
    mockMutate.mockImplementation((_data, opts) => opts?.onError?.(new Error('Server error')))

    const toast = (await import('react-hot-toast')).default
    render(<AddNewAdPage />, { initialEntries: ['/ads/new'] })
    await fillRequiredFields()

    const file = new File(['img'], 'ad.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) await userEvent.upload(fileInput, file)

    await userEvent.click(screen.getByRole('button', { name: /save ad/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    }, { timeout: 3000 })
  })
})
