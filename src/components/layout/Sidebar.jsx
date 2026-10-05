import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users2,
  BookImage,
  Brain,
  Anchor,
  Compass,
  Gift,
  Sparkles,
  Lightbulb,
  ClipboardCheck,
  TrendingUp,
  FileText,
  Megaphone,
  RefreshCcw,
  ScrollText,
  Target,
  Inbox,
  AlertTriangle,
  Settings,
  Users,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  X,
  Radar,
  Trash2,
  Database,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import useUIStore from '../../store/useUIStore'

// ── Design tokens (sidebar-specific) ────────────────────────────────────────
const SIDEBAR_W  = 'w-56'       // 224px at 16px root
const SIDEBAR_W_C = 'w-14'      // 56px collapsed

// ── Nav data ─────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { label: 'Competitors',   to: '/competitors',          icon: Users2 },
      { label: 'Ad Scraper',    to: '/scraper/competitors',  icon: Radar },
      { label: 'My Ads',        to: '/my-ads',               icon: Zap },
      { label: 'Removed Ads',   to: '/removed-ads',          icon: Trash2 },
      { label: 'AI Recommendation', to: '/ai-recommendation', icon: Sparkles },
      { label: 'FB API Explorer', to: '/facebook/explorer', icon: Database },
      { label: 'Own Ads Performance', to: '/facebook/performance', icon: TrendingUp },
      { label: 'Ads Library',   to: '/ads',                  icon: BookImage },
      { label: 'AI Analysis',   to: '/ai-analysis',          icon: Brain },
      { label: 'Hook Library',  to: '/hooks',                icon: Anchor },
      { label: 'Angle Library', to: '/angles',               icon: Compass },
      { label: 'Offer Library', to: '/offers',               icon: Gift },
    ],
  },
  {
    id: 'workflows',
    label: 'Workflows',
    items: [
      { label: 'Creative Recommendations', to: '/recommendations', icon: Lightbulb },
      { label: 'Creative Review & QA',        to: '/creative-review', icon: ClipboardCheck },
      { label: 'Performance Intelligence',    to: '/performance',     icon: TrendingUp },
      { label: 'Creative Briefs',             to: '/briefs',          icon: FileText },
      { label: 'Campaigns',                   to: '/campaigns',                   icon: Megaphone },
    ],
  },
  {
    id: 'learning',
    label: 'Learning',
    items: [
      { label: 'Learning Loop',       to: '/learning-loop',       icon: RefreshCcw },
      { label: 'Insight Log',         to: '/insight-log',         icon: ScrollText },
      { label: 'Prediction Accuracy', to: '/prediction-accuracy', icon: Target },
    ],
  },
  {
    id: 'review',
    label: 'Review',
    items: [
      { label: 'Review Queue',   to: '/review',         icon: Inbox },
      { label: 'Low Confidence', to: '/low-confidence', icon: AlertTriangle },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { label: 'Settings',      to: '/settings',      icon: Settings },
      { label: 'Users',         to: '/users',         icon: Users },
      { label: 'Activity Logs', to: '/activity-logs', icon: Activity },
    ],
  },
]

// ── Logo ─────────────────────────────────────────────────────────────────────
function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="droplet-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="droplet-inner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* Outer droplet */}
      <path
        d="M18 3C18 3 7 13.8 7 21C7 27.627 11.925 32 18 32C24.075 32 29 27.627 29 21C29 13.8 18 3 18 3Z"
        fill="url(#droplet-gradient)"
      />
      {/* Inner highlight */}
      <path
        d="M18 24C16.343 24 15 22.657 15 21C15 19.2 16.8 17 18 15C19.2 17 21 19.2 21 21C21 22.657 19.657 24 18 24Z"
        fill="url(#droplet-inner)"
      />
    </svg>
  )
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ item, collapsed, onNavigate }) {
  const { label, to, icon: Icon } = item

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      aria-label={label}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-md text-[13px] font-medium outline-none',
          'transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-sidebar',
          collapsed ? 'mx-1 justify-center py-2' : 'gap-2.5 px-2.5 py-[7px]',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active marker */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-400',
              'origin-center transition-transform duration-200',
              isActive ? 'scale-y-100' : 'scale-y-0'
            )}
          />
          <Icon
            size={16}
            className={cn('shrink-0 transition-colors', isActive ? 'text-primary-300' : 'text-slate-500 group-hover:text-slate-300')}
            aria-hidden="true"
          />

          {!collapsed && <span className="min-w-0 flex-1 truncate leading-tight" title={label}>{label}</span>}

          {/* Hover tooltip (collapsed only) */}
          {collapsed && (
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md',
                'bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl',
                'translate-x-[-4px] opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100'
              )}
            >
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

// ── NavGroup ──────────────────────────────────────────────────────────────────
function NavGroup({ group, collapsed, closed, onToggle, onNavigate }) {
  const { pathname } = useLocation()
  const hasActive = group.items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
  // Never hide the section the user is currently in.
  const folded = !collapsed && closed && !hasActive

  return (
    <div>
      {collapsed ? (
        <div className="mx-3 my-2 border-t border-white/10" />
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!folded}
          className="mb-0.5 mt-3 flex w-full items-center justify-between rounded px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 outline-none transition-colors hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {group.label}
          <ChevronDown
            size={12}
            aria-hidden="true"
            className={cn('transition-transform duration-200', folded && '-rotate-90')}
          />
        </button>
      )}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          folded ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        )}
      >
        <div className={cn("min-w-0 space-y-px", folded ? "overflow-hidden" : "overflow-visible")}>
          {group.items.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ mobile = false, onClose }) {
  const { sidebarCollapsed, toggleCollapse, navGroupsClosed, toggleNavGroup } = useUIStore()
  const collapsed = mobile ? false : sidebarCollapsed

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-bg-sidebar transition-[width] duration-200',
        !mobile && 'fixed inset-y-0 left-0 z-30',
        !mobile && (collapsed ? SIDEBAR_W_C : SIDEBAR_W)
      )}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-white/10',
          collapsed && !mobile ? 'justify-center px-0' : 'gap-2.5 px-4'
        )}
      >
        <LogoMark size={28} />
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-white">Decoinks</p>
            <p className="truncate text-[11px] leading-tight text-slate-400">AI Ads Supervisor</p>
          </div>
        )}

        {/* Close button on mobile */}
        {mobile && onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 outline-none hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Scrollable nav ── */}
      <nav
        aria-label="Main navigation"
        className={cn('flex-1 overflow-y-auto px-2 pb-3', collapsed ? 'scrollbar-hide' : 'scrollbar-dark')}
      >
        {NAV_GROUPS.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            collapsed={collapsed}
            closed={!!navGroupsClosed?.[group.id]}
            onToggle={() => toggleNavGroup(group.id)}
            onNavigate={mobile ? onClose : undefined}
          />
        ))}
      </nav>

      {/* ── Collapse toggle (desktop only) ── */}
      {!mobile && (
        <div className={cn('shrink-0 border-t border-white/10 p-2', collapsed && 'flex justify-center')}>
          <button
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center gap-2 rounded-md py-1.5 text-slate-400 outline-none',
              'transition-colors hover:bg-white/5 hover:text-white',
              'focus-visible:ring-2 focus-visible:ring-primary-500',
              collapsed ? 'justify-center px-2' : 'w-full px-2.5'
            )}
          >
            {collapsed ? (
              <ChevronRight size={16} aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft size={16} aria-hidden="true" />
                <span className="text-xs font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  )
}
