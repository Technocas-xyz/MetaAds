import { render } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  })
}

function AllProviders({ children, initialEntries = ['/'] }) {
  const qc = makeQueryClient()
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

export function renderWithProviders(ui, options = {}) {
  const { initialEntries, ...rest } = options
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
    ),
    ...rest,
  })
}

// Re-export everything from testing-library for convenience
export * from '@testing-library/react'
export { renderWithProviders as render }
