import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import useUIStore from '../../store/useUIStore'
import useAuthStore from '../../store/useAuthStore'
import client from '../../api/client'

const MOCK_NOTIFICATIONS = 3

function Avatar({ name }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white select-none">
      {initials}
    </span>
  )
}

function NotificationBell({ count }) {
  return (
    <button
      aria-label={`${count} notification${count !== 1 ? 's' : ''}`}
      className={cn(
        'relative rounded-lg p-2 text-text-secondary outline-none',
        'transition-colors hover:bg-bg-app hover:text-text-primary',
        'focus-visible:ring-2 focus-visible:ring-primary-500'
      )}
    >
      <Bell size={20} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute right-1.5 top-1.5 flex size-[18px] items-center justify-center rounded-full bg-danger-500 text-[9px] font-bold leading-none text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

const ITEM_CLS = cn(
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] outline-none select-none',
  'text-text-primary transition-colors hover:bg-bg-app focus:bg-bg-app'
)

function UserDropdown({ user, logout }) {
  const navigate = useNavigate()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none',
          'transition-colors hover:bg-bg-app',
          'focus-visible:ring-2 focus-visible:ring-primary-500'
        )}
        aria-label="User menu"
      >
        <Avatar name={user?.name} />
        <div className="hidden text-left sm:block">
          <p className="text-[13px] font-semibold leading-tight text-text-primary">
            {user?.name ?? 'User'}
          </p>
          <p className="text-[11px] leading-tight text-text-secondary">
            {user?.role ?? 'Admin'}
          </p>
        </div>
        <ChevronDown size={14} className="hidden text-text-secondary sm:block" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className={cn(
            'z-50 min-w-[210px] overflow-hidden rounded-xl bg-bg-card p-1',
            'border border-border-default shadow-card-hover',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2'
          )}
        >
          <div className="border-b border-border-default px-3 py-2.5 mb-1">
            <p className="text-[13px] font-semibold text-text-primary">{user?.name ?? 'User'}</p>
            <p className="text-[11px] text-text-secondary truncate">{user?.email ?? 'admin@decoinks.com'}</p>
          </div>

          <DropdownMenu.Item onSelect={() => navigate('/settings?tab=profile')} className={ITEM_CLS}>
            <User size={14} className="shrink-0 text-text-secondary" aria-hidden="true" />
            Profile
          </DropdownMenu.Item>

          <DropdownMenu.Item onSelect={() => navigate('/settings')} className={ITEM_CLS}>
            <Settings size={14} className="shrink-0 text-text-secondary" aria-hidden="true" />
            Settings
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={() => window.open('https://docs.decoinks.com', '_blank', 'noopener')}
            className={ITEM_CLS}
          >
            <HelpCircle size={14} className="shrink-0 text-text-secondary" aria-hidden="true" />
            Help &amp; Docs
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border-default" />

          <DropdownMenu.Item
            onSelect={logout}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] outline-none select-none',
              'text-danger-500 transition-colors hover:bg-danger-50 focus:bg-danger-50'
            )}
          >
            <LogOut size={14} className="shrink-0" aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default function Topbar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const searchRef = useRef(null)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const containerRef = useRef(null)

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null)
      setShowResults(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await client.get('/search', { params: { q: query } })
        setResults(res.data)
        setShowResults(true)
      } catch {
        setResults(null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleNavigate = (path) => {
    setShowResults(false)
    setQuery('')
    navigate(path)
  }

  const totalResults = results
    ? (results.competitors?.length || 0) + (results.ads?.length || 0) + (results.hooks?.length || 0) + (results.angles?.length || 0) + (results.offers?.length || 0)
    : 0

  return (
    <header
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault()
          searchRef.current?.focus()
        }
      }}
      className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border-default bg-bg-card px-4 sm:px-6"
    >
      {/* Hamburger — mobile/tablet only */}
      <button
        onClick={toggleSidebar}
        aria-label="Open navigation"
        className={cn(
          'shrink-0 rounded-lg p-2 text-text-secondary outline-none lg:hidden',
          'transition-colors hover:bg-bg-app hover:text-text-primary',
          'focus-visible:ring-2 focus-visible:ring-primary-500'
        )}
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {/* Global search */}
      <div ref={containerRef} role="search" className="relative mx-auto w-full max-w-2xl">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search ads, hooks, angles, offers, competitors…"
          aria-label="Global search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results && query.length >= 2) setShowResults(true) }}
          className={cn(
            'h-9 w-full rounded-lg border border-border-default bg-bg-app',
            'pl-9 pr-20 text-sm text-text-primary placeholder:text-text-tertiary',
            'outline-none transition-all',
            'hover:border-slate-300',
            'focus:border-primary-500 focus:bg-bg-card focus:ring-2 focus:ring-primary-500/20'
          )}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
        >
          <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border-default bg-bg-card px-1 text-[10px] font-medium text-text-tertiary shadow-sm">
            ⌘
          </kbd>
          <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border-default bg-bg-card px-1 text-[10px] font-medium text-text-tertiary shadow-sm">
            K
          </kbd>
        </div>

        {/* Search results dropdown */}
        {showResults && results && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-[400px] overflow-y-auto rounded-xl border border-border-default bg-white shadow-lg z-50">
            {totalResults === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-text-secondary">
                No results for "{query}"
              </div>
            ) : (
              <div className="py-2">
                {/* Competitors */}
                {results.competitors?.length > 0 && (
                  <div>
                    <p className="px-4 py-1 text-[10px] font-semibold text-text-tertiary uppercase">Competitors</p>
                    {results.competitors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleNavigate(`/competitors/${c.id}`)}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-text-tertiary">{c.domain}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Ads */}
                {results.ads?.length > 0 && (
                  <div>
                    <p className="px-4 py-1 text-[10px] font-semibold text-text-tertiary uppercase">Ads</p>
                    {results.ads.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleNavigate(`/ads/${a.id}`)}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50 truncate"
                      >
                        {a.headline || 'Untitled Ad'}
                      </button>
                    ))}
                  </div>
                )}
                {/* Hooks */}
                {results.hooks?.length > 0 && (
                  <div>
                    <p className="px-4 py-1 text-[10px] font-semibold text-text-tertiary uppercase">Hooks</p>
                    {results.hooks.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => handleNavigate('/hooks')}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50 truncate"
                      >
                        <span className="text-xs text-primary-600 mr-1">[{h.type}]</span> {h.text}
                      </button>
                    ))}
                  </div>
                )}
                {/* Angles */}
                {results.angles?.length > 0 && (
                  <div>
                    <p className="px-4 py-1 text-[10px] font-semibold text-text-tertiary uppercase">Angles</p>
                    {results.angles.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => handleNavigate('/angles')}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}
                {/* Offers */}
                {results.offers?.length > 0 && (
                  <div>
                    <p className="px-4 py-1 text-[10px] font-semibold text-text-tertiary uppercase">Offers</p>
                    {results.offers.map((o, i) => (
                      <button
                        key={i}
                        onClick={() => handleNavigate('/offers')}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
                      >
                        {o.type}{o.value && o.value !== 'None' ? ` — ${o.value}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1">
        <NotificationBell count={MOCK_NOTIFICATIONS} />
        <UserDropdown user={user} logout={logout} />
      </div>
    </header>
  )
}
