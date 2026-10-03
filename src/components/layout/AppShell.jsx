import { Outlet, useLocation } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import Sidebar from './Sidebar'
import Topbar from './TopBar'
import { cn } from '../../lib/utils'
import useUIStore from '../../store/useUIStore'

// Width constants — keep in sync with Sidebar.jsx
const W_EXPANDED  = 'lg:pl-56'
const W_COLLAPSED = 'lg:pl-14'

export default function AppShell({ children }) {
  const { sidebarOpen, sidebarCollapsed, closeSidebar } = useUIStore()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-bg-app">

      {/* ── Skip-to-content link ── */}
      <a
        href="#main-content"
        className={cn(
          'sr-only focus:not-sr-only',
          'fixed left-4 top-4 z-[100] rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600'
        )}
      >
        Skip to content
      </a>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* ── Mobile sidebar — Radix Dialog slide-over ── */}
      <Dialog.Root open={sidebarOpen} onOpenChange={(open) => !open && closeSidebar()}>
        <Dialog.Portal>
          {/* Backdrop */}
          <Dialog.Overlay
            className={cn(
              'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
            )}
          />

          {/* Slide-over panel */}
          <Dialog.Content
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-64 lg:hidden',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
              'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
              'duration-200'
            )}
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
            <Sidebar mobile onClose={closeSidebar} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Content column — shifts with sidebar state ── */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          sidebarCollapsed ? W_COLLAPSED : W_EXPANDED
        )}
      >
        <Topbar />
        <main id="main-content" className="min-w-0 flex-1 overflow-x-clip px-4 py-5 outline-none sm:px-6" tabIndex={-1}>
          {/* Keyed on the route so each page fades in; capped width keeps
              lines readable on very wide monitors. */}
          <div key={pathname} className="mx-auto w-full max-w-[1600px] animate-page-in">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

    </div>
  )
}
